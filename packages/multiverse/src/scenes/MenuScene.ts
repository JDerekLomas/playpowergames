import { AnalyticsHelper, BaseScene, ButtonHelper, ButtonOverlay, GameConfigManager, i18n, TextOverlay } from '@k8-games/sdk';
import { ASSETS_PATHS, BUTTONS } from '../config/common';
import { PortalStateManager } from '../utils/PortalStateManager';
import { GameCompletionManager } from '../utils/GameCompletionManager';

export class MenuScene extends BaseScene {
    private readonly circleRadius: number = 500;
    private readonly startingAngle = -135;
    private readonly centerAngle = -90;
    private circleCenterX: number = 0;
    private circleCenterY: number = 0;
    private bgImage!: Phaser.GameObjects.Image;
    private titleImage!: Phaser.GameObjects.Image;
    private circleContainer?: Phaser.GameObjects.Container;
    private circle?: Phaser.GameObjects.Arc;
    private rotatorWheel?: Phaser.GameObjects.Arc;
    private starsImage!: Phaser.GameObjects.Image;
    private playButton?: Phaser.GameObjects.Container;
    private calibrateAgainContainer?: Phaser.GameObjects.Container;
    private retakeChallengeTween?: Phaser.Tweens.Tween;
    private muteBtn!: Phaser.GameObjects.Container;
    private topic: string = 'grade3_topic2';

    // Hand guide animation state
    private hand?: Phaser.GameObjects.Image;
    private handArrow?: Phaser.GameObjects.Image;
    private handTween?: Phaser.Tweens.Tween;
    private handTimer?: Phaser.Time.TimerEvent;

    // Index calculation variables.
    private lastStepIndex = 0; // 0..7, snapped index from previous drag
    private totalSteps = 0; // cumulative signed steps (45° per step)
    private dragStartRot = 0;
    private dragAccum = 0;
    private lastPointerAngle = 0;

    private games: { img: Phaser.GameObjects.Image, lock?: Phaser.GameObjects.Image, badge?: Phaser.GameObjects.Image }[] = [];

    private readonly stepRad = Phaser.Math.DegToRad(45);
    private readonly NUM_POSITIONS = 8;
    private readonly slotMap: { [key: number]: number[] } = {
        3: [0, 1, 2, 0, 1, 2, 0, 1],
        4: [0, 1, 2, 3, 0, 1, 2, 3],
        5: [0, 1, 2, 3, 4, 0, 1, 2],
        6: [0, 1, 2, 3, 4, 5, 0, 1],
        7: [0, 1, 2, 3, 4, 5, 6, 0],
        8: [0, 1, 2, 3, 4, 5, 6, 7],
    };
    // Game list will be initialized based on topic from gameConfigManager
    private gameList: Array<{ id: number; name: string; isActive: boolean, title: string }> = [];
    private isSnapping = false;

    private portalManager: PortalStateManager = PortalStateManager.getInstance();
    private completionManager: GameCompletionManager = GameCompletionManager.getInstance();

    constructor() {
        super('MenuScene');
        this.initializeGameList();
        this.portalManager.init(this.gameList.map((game) => ({ id: game.id, isInitial: game.isActive })));
        this.completionManager.init(this.gameList.map((game) => game.title));

        const gameConfigManager = GameConfigManager.getInstance();
        this.topic = gameConfigManager.get('topic') || 'grade3_topic2';
    }

    private initializeGameList(): void {
        const gameConfigManager = GameConfigManager.getInstance();
        const topic = gameConfigManager.get('topic') || 'grade3_topic2';

        const mulMultiverse: Array<{ id: number; name: string; isActive: boolean, title: string }> = [
            { id: 1, name: 'array-architects', isActive: false, title: 'array_architects' },
            { id: 2, name: 'digit-dash', isActive: true, title: 'digit_dash' },
            { id: 3, name: 'alien-shooter', isActive: false, title: 'alien_shooter' },
            { id: 4, name: 'emoji-battle', isActive: false, title: 'emoji_battle' },
        ]

        const addMultiverse: Array<{ id: number; name: string; isActive: boolean, title: string }> = [
            { id: 1, name: 'fact-racer', isActive: false, title: 'fact_racer' },
            { id: 2, name: 'alien-shooter', isActive: true, title: 'alien_shooter' },
            { id: 3, name: 'make-ten', isActive: false, title: 'make_ten' },
            { id: 4, name: 'make-ten', isActive: false, title: 'make_20' },
            { id: 5, name: 'slingshot', isActive: false, title: 'slingshot' },
            { id: 6, name: 'bunny-rescue', isActive: false, title: 'bunny_rescue' },
            { id: 7, name: 'emoji-battle', isActive: false, title: 'emoji_battle' },
        ]

        const subMultiverse: Array<{ id: number; name: string; isActive: boolean, title: string }> = [
            { id: 1, name: 'fact-racer', isActive: false, title: 'fact_racer' },
            { id: 2, name: 'alien-shooter', isActive: true, title: 'alien_shooter' },
            { id: 3, name: 'slingshot', isActive: false, title: 'slingshot' },
            { id: 4, name: 'bunny-rescue', isActive: false, title: 'bunny_rescue' },
            { id: 5, name: 'emoji-battle', isActive: false, title: 'emoji_battle' },
        ]

        const addSubMultiverse: Array<{ id: number; name: string; isActive: boolean, title: string }> = [
            { id: 1, name: 'fact-racer', isActive: false, title: 'fact_racer' },
            { id: 2, name: 'alien-shooter', isActive: true, title: 'alien_shooter' },
            { id: 3, name: 'slingshot', isActive: false, title: 'slingshot' },
            { id: 4, name: 'emoji-battle', isActive: false, title: 'emoji_battle' },
        ]

        const multiDigitMultiplication: Array<{ id: number; name: string; isActive: boolean, title: string }> = [
            { id: 1, name: 'fact-racer', isActive: false, title: 'fact_racer' },
            { id: 2, name: 'alien-shooter', isActive: true, title: 'alien_shooter' },
            { id: 3, name: 'slingshot', isActive: false, title: 'slingshot' },
            { id: 4, name: 'emoji-battle', isActive: false, title: 'emoji_battle' },
        ]

        const multiplicationToDivision: Array<{ id: number; name: string; isActive: boolean, title: string }> = [
            { id: 1, name: 'fact-racer', isActive: false, title: 'fact_racer' },
            { id: 2, name: 'alien-shooter', isActive: true, title: 'alien_shooter' },
            { id: 3, name: 'slingshot', isActive: false, title: 'slingshot' },
            { id: 4, name: 'emoji-battle', isActive: false, title: 'emoji_battle' },
        ]
        
        const decimalMultiverse: Array<{ id: number; name: string; isActive: boolean, title: string }> = [
            { id: 1, name: 'fact-racer', isActive: false, title: 'fact_racer' },
            { id: 2, name: 'alien-shooter', isActive: true, title: 'alien_shooter' },
            { id: 3, name: 'emoji-battle', isActive: false, title: 'emoji_battle' },
        ]

        const bonusMultiverse: Array<{ id: number; name: string; isActive: boolean, title: string }> = [
            { id: 1, name: 'fact-racer', isActive: false, title: 'fact_racer' },
            { id: 2, name: 'alien-shooter', isActive: true, title: 'alien_shooter' },
            { id: 3, name: 'slingshot', isActive: false, title: 'slingshot' },
            { id: 4, name: 'emoji-battle', isActive: false, title: 'emoji_battle' },
        ]

        // Define games based on topic
        const topicGameMapping: Record<string, Array<{ id: number; name: string; isActive: boolean, title: string }>> = {
            'grade3_topic2': mulMultiverse, // replaced with standalone game - alien shooter
            'grade3_topic3': mulMultiverse,
            'grade3_topic4': multiplicationToDivision,
            'grade2_topic1': addMultiverse.filter(game => game.id !== 4),
            'grade2_topic3': addMultiverse, // replaced with standalone game - emoji battle
            'grade2_topic4': subMultiverse, // replaced with standalone game - fact racer
            'grade4_topic2': addSubMultiverse,
            'grade5_topic3': multiDigitMultiplication,
            'grade6_topic1': decimalMultiverse,
            'g5_g6': bonusMultiverse,
            'g7_g8': bonusMultiverse,
        };
        
        this.gameList = topicGameMapping[topic] || topicGameMapping['grade3_topic2'];
    }

    init() {
        this.resetData();

        const lastUnlockedPortalId = this.portalManager.getLastUnlockedPortalId();
        if (lastUnlockedPortalId) {
            for (const game of this.gameList) {
                if (game.id === lastUnlockedPortalId) {
                    game.isActive = true;
                } else {
                    game.isActive = false;
                }
            }
        }
    }

    create(): void {
        this.audioManager.playSoundEffect('multiverse_entry');
        const initialGame = this.gameList.find((game) => game.isActive)?.title || 'alien_shooter';
        this.bgImage = this.addImage(this.display.width / 2, this.display.height / 2, `${initialGame}_bg`).setOrigin(0.5);
        this.starsImage = this.addImage(this.display.width / 2, this.display.height / 2, 'stars')
            .setOrigin(0.5)
            .setScale(0.7);

        this.titleImage = this.addImage(this.display.width / 2, this.display.height - 260, `${initialGame}_title`)
            .setOrigin(0.5)
            .setDepth(10);

        this.createButtons();
        this.createCalibrateAgainContainer();

        this.circleCenterX = this.display.width / 2;
        this.circleCenterY = this.display.height + 200;

        this.createGameWheel(this.circleCenterX, this.circleCenterY, this.circleRadius);

        this.centerActiveGame();

        this.handTimer = this.time.delayedCall(6000, () => {
            this.createHandAnimation();
        });

        this.setupKeyboardEvents();
        this.setupMessageListener();

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
        this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
    }

    private resetData(): void {
        this.lastStepIndex = 0;
        this.totalSteps = 0;
        this.dragStartRot = 0;
        this.dragAccum = 0;
        this.lastPointerAngle = 0;
        this.calibrateAgainContainer?.destroy();
        this.calibrateAgainContainer = undefined;
        this.retakeChallengeTween?.destroy();
        this.retakeChallengeTween = undefined;
        this.gameList.forEach(game => game.isActive = false);
        this.gameList[1].isActive = true; // Reactivate the initial game
        if(this.bgImage) this.bgImage.setTexture(this.gameList[1].title + '_bg');
        if(this.titleImage) this.titleImage.setTexture(this.gameList[1].title + '_title');
    }

    private createHandAnimation(): void {
        const startX = this.display.width / 2 - 180;
        const startY = this.display.height / 2 + 20;
        const endX = startX - 100;
        const endY = startY + 50;

        this.hand?.destroy();
        this.hand = this.addImage(startX, startY, 'hand').setOrigin(0.5);
        this.hand.setRotation(Phaser.Math.DegToRad(35));

        this.handArrow?.destroy();
        this.handArrow = this.addImage(startX - 100, startY - 50, 'hand_arrow').setOrigin(0.5);

        const curvature = 0.25;
        const clockwise = true;
        const dx = endX - startX;
        const dy = endY - startY;
        const length = Math.hypot(dx, dy) || 1;

        // midpoint of the segment
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;

        // unit perpendicular vector
        const perpX = (clockwise ? -dy : dy) / length;
        const perpY = (clockwise ? dx : -dx) / length;

        // offset scaled by segment length and curvature
        const offset = length * curvature;

        const cpX = midX + perpX * offset;
        const cpY = midY + perpY * offset;

        const curve = new Phaser.Curves.QuadraticBezier(
            new Phaser.Math.Vector2(startX, startY),
            new Phaser.Math.Vector2(cpX, cpY),
            new Phaser.Math.Vector2(endX, endY),
        );

        const startRot = Phaser.Math.DegToRad(35);
        const endRot = Phaser.Math.DegToRad(-85);

        this.handTween = this.tweens.addCounter({
            from: 0,
            to: 1,
            duration: 2000,
            repeat: 1,
            repeatDelay: 1000,
            ease: 'Sine.easeInOut',
            onUpdate: (tw) => {
                const t = tw.getValue();
                const p = curve.getPoint(t);
                this.hand?.setPosition(this.getScaledValue(p.x), this.getScaledValue(p.y));
                this.hand?.setRotation(Phaser.Math.Linear(startRot, endRot, t));
            },
            onComplete: () => {
                this.hand?.destroy();
                this.hand = undefined;
                this.handArrow?.destroy();
                this.handArrow = undefined;
                if (this.handTween) {
                    this.tweens.remove(this.handTween);
                    this.handTween = undefined;
                }
            },
        });
    }

    private stopHandGuide(): void {
        if (this.handTimer) {
            this.handTimer.destroy();
            this.handTimer = undefined;
        }
        if (this.handTween) {
            this.tweens.remove(this.handTween);
            this.handTween = undefined;
        }
        if (this.hand) {
            this.hand.destroy();
            this.hand = undefined;
        }
        if (this.handArrow) {
            this.handArrow.destroy();
            this.handArrow = undefined;
        }
    }

    private createGameWheel(cx: number, cy: number, radius: number) {
        const scaledCx = this.getScaledValue(cx);
        const scaledCy = this.getScaledValue(cy);
        const scaledRadius = this.getScaledValue(radius);

        this.circleContainer = this.add.container(scaledCx, scaledCy);

        // Add circle (background arc)
        this.circle = this.addCircle(0, 0, radius, 0x000000, 1).setDepth(2);
        this.rotatorWheel = this.addCircle(0, 0, radius + 200, 0x000000, 0);
        this.circleContainer.add(this.circle);
        this.circleContainer.add(this.rotatorWheel);
        this.createGameImages(scaledRadius);

        this.rotatorWheel.setInteractive({ cursor: 'pointer' });
        this.input.setDraggable(this.rotatorWheel);
        this.lastStepIndex = this.rotToIndex(this.circleContainer!.rotation);

        this.setupDragEvents();
    }

    private createGameImages(scaledRadius: number): void {
        // Fill all 8 positions, cycling through gameList
        this.games = [];
        for (let i = 0; i < this.NUM_POSITIONS; i++) {
            const game = this.gameList[i % this.gameList.length];
            const img = this.addImage(0, 0, `${game.title}_title_bg`)
                .setOrigin(0.5, 1)
                .setAlpha(1)
                .setScale(game.isActive ? 1 : 0.7)
                .setDepth(2);

            this.positionGameImage(img, i, scaledRadius);
            this.circleContainer?.add(img);

            let portalLock: Phaser.GameObjects.Image | undefined;
            if (!this.portalManager.isUnlocked(game.id)) {
                portalLock = this.addImage(0, 0, 'portal_lock').setOrigin(0.5, 1).setScale(0.64).setDepth(3);
                this.positionPortalLock(portalLock, i, scaledRadius);
                this.circleContainer?.add(portalLock);
            }

            let completedBadge: Phaser.GameObjects.Image | undefined;
            if (this.completionManager.isGameComplete(game.title)) {
                const initialScale = game.isActive ? 1 : 0.64;
                completedBadge = this.addImage(0, 0, 'completed_badge').setOrigin(0.5, 1).setScale(initialScale).setDepth(3);
                this.positionCompletedBadge(completedBadge, i, scaledRadius, game.isActive);
                this.circleContainer?.add(completedBadge);
            }

            this.games.push({ img, lock: portalLock, badge: completedBadge });
            img.setInteractive({ cursor: 'pointer' });
            img.on('pointerdown', () => {
                this.stopHandGuide();
                if (!game.isActive) {
                    this.toggleCalibrateAgainText(false);
                    this.removePlayButton();
                }
                const { actualIdx } = this.stepsToGameIndex(this.totalSteps);

                // distance from clicked index to center, clockwise
                const clockwiseDist = (i - actualIdx + this.NUM_POSITIONS) % this.NUM_POSITIONS;
                // distance counter-clockwise
                const counterClockwiseDist = (actualIdx - i + this.NUM_POSITIONS) % this.NUM_POSITIONS;

                if (clockwiseDist === 1 || counterClockwiseDist === this.NUM_POSITIONS - 1) {
                    // clicked on the immediate right
                    this.rotateBySide('right');
                } else if (counterClockwiseDist === 1 || clockwiseDist === this.NUM_POSITIONS - 1) {
                    // clicked on the immediate left
                    this.rotateBySide('left');
                }
            });
        }
    }

    private setupDragEvents(): void {
        this.input.on('dragstart', (pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
            if (obj === this.rotatorWheel) {
                this.removePlayButton();
                this.toggleCalibrateAgainText(false);
                this.stopHandGuide();
                this.dragStartRot = this.circleContainer!.rotation;
                this.dragAccum = 0;
                this.lastPointerAngle = Phaser.Math.Angle.Between(
                    this.circleContainer!.x || 0,
                    this.circleContainer!.y || 0,
                    pointer.x,
                    pointer.y,
                );

                this.tweens.add({
                    targets: [this.bgImage, this.titleImage],
                    alpha: 0,
                    duration: 1000,
                    ease: 'Cubic.Out',
                });

                const scaledRadius = this.getScaledValue(this.circleRadius);
                this.games.forEach(({ img, lock, badge }, i) => {
                    img.setScale(0.7);
                    lock?.setScale(0.64);
                    if (badge) {
                        badge.setScale(0.64);
                        this.positionCompletedBadge(badge, i, scaledRadius, false);
                    }
                });
            }
        });

        this.input.on('drag', (pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
            if (obj === this.rotatorWheel) {
                const a = Phaser.Math.Angle.Between(
                    this.circleContainer!.x || 0,
                    this.circleContainer!.y || 0,
                    pointer.x,
                    pointer.y,
                );
                // Accumulate *wrapped* deltas so there’s no boundary flip
                const delta = Phaser.Math.Angle.Wrap(a - this.lastPointerAngle);
                this.dragAccum += delta;
                this.lastPointerAngle = a;

                const rot = this.dragStartRot + this.dragAccum;
                this.circleContainer!.rotation = rot;
                this.starsImage.rotation = rot;
            }
        });

        this.input.on('dragend', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
            if (obj === this.rotatorWheel) {
                const current = this.circleContainer!.rotation;

                // Snap index (0..7) and its base angle
                const newIndex = this.rotToIndex(current);
                const baseTarget = newIndex * this.stepRad + this.pivotOffset();

                // Nearest equivalent angle to avoid long-way spins
                const targetRotation = current + Phaser.Math.Angle.Wrap(baseTarget - current);

                // Step diff wrapped to shortest path (-4..+4)
                let diff = newIndex - this.lastStepIndex;
                diff = this.mod(diff + 4, 8) - 4;

                const stepsThisDrag = -diff; // + = CW, - = CCW
                this.totalSteps += stepsThisDrag;

                this.tweens.add({
                    targets: this.circleContainer,
                    rotation: targetRotation,
                    duration: 500,
                    ease: 'Cubic.Out',
                    onUpdate: () => {
                        this.starsImage.rotation = this.circleContainer!.rotation;
                    },
                    onComplete: () => {
                        this.lastStepIndex = newIndex;
                        this.updateImagesOnDrag();
                    },
                });
            }
        });
    }

    private centerActiveGame(): void {
        const activeGameIndex = this.gameList.findIndex((game) => game.isActive);
        if (activeGameIndex === -1) return;
        if (activeGameIndex === 0) {
            this.rotateBySide('left', false);
        } else {
            const steps = activeGameIndex - 1;
            for (let i = 0; i < steps; i++) {
                this.rotateBySide('right', false);
            }
        }

        this.updateImagesOnDrag();

        const lastUnlockedId = this.portalManager.getLastUnlockedPortalId();
        if (lastUnlockedId) {
            const { gameIdx, actualIdx } = this.stepsToGameIndex(this.totalSteps);
            const centeredGame = this.gameList[gameIdx];
            if (centeredGame && centeredGame.id === lastUnlockedId) {
                const scaledRadius = this.getScaledValue(this.circleRadius);

                // Cancel any default fades kicked off by updateImagesOnDrag for title/bg
                this.tweens.killTweensOf([this.titleImage, this.bgImage]);
                this.titleImage.setAlpha(0);
                this.bgImage.setAlpha(1);
                this.playButton?.setVisible(false);
                this.toggleCalibrateAgainText(false);

                const tempLock = this.addImage(0, 0, 'portal_lock').setOrigin(0.5, 1).setScale(1).setDepth(4);
                this.positionPortalLock(tempLock, actualIdx, scaledRadius);
                this.circleContainer?.add(tempLock);

                this.tweens.add({
                    targets: tempLock,
                    alpha: 0,
                    duration: 500,
                    delay: 700,
                    ease: 'Cubic.Out',
                    onComplete: () => {
                        tempLock.destroy();
                        this.tweens.add({
                            targets: this.titleImage,
                            alpha: 1,
                            duration: 500,
                            ease: 'Cubic.Out',
                            onComplete: () => {
                                this.playButton?.setVisible(true);
                            }
                        });
                    }
                });
            }
        }
    }

    private rotateBySide(side: 'left' | 'right', animate: boolean = true): void {
        if (!this.circleContainer || this.isSnapping) return;
        const scaledRadius = this.getScaledValue(this.circleRadius);
        this.games.forEach(({ img, lock, badge }, i) => {
            img.setScale(0.7);
            lock?.setScale(0.64);
            if (badge) {
                badge.setScale(0.64);
                this.positionCompletedBadge(badge, i, scaledRadius, false);
            }
        });

        // +1 step for LEFT (CCW), -1 step for RIGHT (CW)
        const deltaSteps = side === 'left' ? +1 : -1;

        // decide the slot we want to land on (0..7)
        const targetStepIndex = this.mod(this.lastStepIndex + deltaSteps, this.NUM_POSITIONS);

        const currentRot = this.circleContainer.rotation;

        // compute tween target exactly like your dragend
        const baseTarget = targetStepIndex * this.stepRad + this.pivotOffset();
        const targetRotation = currentRot + Phaser.Math.Angle.Wrap(baseTarget - currentRot);

        // keep totalSteps in sync with your convention (stepsThis = -diffWrapped)
        let diff = targetStepIndex - this.lastStepIndex; // raw difference
        diff = this.mod(diff + 4, 8) - 4; // wrap to -4..+4
        const stepsThisClick = -diff; // + = CW, - = CCW
        this.totalSteps += stepsThisClick;

        this.isSnapping = true;
        if (animate) {
            this.tweens.add({
                targets: this.circleContainer,
                rotation: targetRotation,
                duration: 500,
                ease: 'Cubic.Out',
                onUpdate: () => {
                    this.starsImage.rotation = this.circleContainer!.rotation;
                },
                onComplete: () => {
                    this.isSnapping = false;

                    this.lastStepIndex = targetStepIndex;
                    this.updateImagesOnDrag();
                },
            });
        } else {
            this.circleContainer.rotation = targetRotation;
            this.starsImage.rotation = targetRotation;
            this.lastStepIndex = targetStepIndex;
            this.isSnapping = false;
            this.lastStepIndex = targetStepIndex;
            this.updateImagesOnDrag();
        }
    }

    private positionGameImage(img: Phaser.GameObjects.Image, index: number, scaledRadius: number): void {
        const angleRad = Phaser.Math.DegToRad(this.startingAngle + index * 45);
        const xv = (scaledRadius - this.getScaledValue(60)) * Math.cos(angleRad);
        const yv = (scaledRadius - this.getScaledValue(60)) * Math.sin(angleRad);
        const rotation = angleRad + Math.PI / 2;
        img.setPosition(xv, yv);
        img.setRotation(rotation);
    }

    private positionPortalLock(img: Phaser.GameObjects.Image, index: number, scaledRadius: number): void {
        const angleRad = Phaser.Math.DegToRad(this.startingAngle + index * 45);
        const xv = (scaledRadius - this.getScaledValue(25)) * Math.cos(angleRad);
        const yv = (scaledRadius - this.getScaledValue(25)) * Math.sin(angleRad);
        const rotation = angleRad + Math.PI / 2;
        img.setPosition(xv, yv);
        img.setRotation(rotation);
    }

    private positionCompletedBadge(img: Phaser.GameObjects.Image, index: number, scaledRadius: number, isCentered: boolean = false): void {
        const angleRad = Phaser.Math.DegToRad(this.startingAngle + index * 45);
        const radiusOffset = isCentered ? this.getScaledValue(230) : this.getScaledValue(150);
        const xv = (scaledRadius + radiusOffset) * Math.cos(angleRad);
        const yv = (scaledRadius + radiusOffset) * Math.sin(angleRad);
        const rotation = angleRad + Math.PI / 2;
        img.setPosition(xv, yv);
        img.setRotation(rotation);
    }

    private createButtons(): void {
        // ButtonHelper.createIconButton({
        //     scene: this,
        //     imageKeys: {
        //         default: BUTTONS.ICON_BTN.KEY,
        //         hover: BUTTONS.ICON_BTN_HOVER.KEY,
        //         pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
        //     },
        //     icon: BUTTONS.HAMBURGER_ICON.KEY,
        //     label: i18n.t('menu.menu'),
        //     x: this.display.width - 54,
        //     y: 66,
        //     raisedOffset: 3.5,
        //     onClick: () => {
        //         console.log('Hamburger menu clicked');
        //     },
        // });

        ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: `${BUTTONS.BUTTON.KEY}_blue`,
                hover: `${BUTTONS.BUTTON_HOVER.KEY}_blue`,
                pressed: `${BUTTONS.BUTTON_PRESSED.KEY}_blue`,
            },
            text: i18n.t('menu.retakeChallenge'),
            label: i18n.t('menu.retakeChallenge'),
            textStyle: {
                font: '700 26px Exo',
                color: '#fff',
            },
            imageScale: 1, // adjust if needed
            x: 175,
            y: 75,
            onClick: () => {
                this.audioManager.stopBackgroundMusic();

                const analyticsHelper = AnalyticsHelper.getInstance();
                if (analyticsHelper) {
                    analyticsHelper.endLevelSession(true);
                }

                if (this.topic === 'g5_g6' || this.topic === 'g7_g8') {
                    this.scene.start('SelectScene', { reset: true, parentScene: 'MenuScreen' });
                } else {
                    this.scene.start('GameScene', { reset: true, parentScene: 'MenuScreen' });
                }
            },
            icon: {
                key: 'calibrate_icon',
                gap: 12,
                position: 'left',
            }
        }).setName('retakeChallengeButton');

        this.muteBtn = ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.UNMUTE_ICON.KEY,
            label: i18n.t('common.mute'),
            ariaLive: 'off',
            x: this.display.width - 63,
            y: 75,
            raisedOffset: 3.5,
            onClick: () => {
                this.audioManager.setMute(!this.audioManager.getIsAllMuted());
            },
        });

        this.addPlayButton();
    }

    private addPlayButton(): void {
        if (this.playButton) {
            this.playButton.destroy();
            this.playButton = undefined;
        }

        this.playButton = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: `${BUTTONS.BUTTON.KEY}_purple`,
                hover: `${BUTTONS.BUTTON_HOVER.KEY}_purple`,
                pressed: `${BUTTONS.BUTTON_PRESSED.KEY}_purple`,
            },
            text: i18n.t('menu.play'),
            label: i18n.t('menu.play'),
            textStyle: {
                font: '700 28px Exo',
                color: '#fff',
            },
            imageScale: 0.9,
            x: this.display.width / 2,
            y: this.display.height - 80,
            onClick: () => {
                this.audioManager.stopBackgroundMusic();
                const activeGame = this.gameList.find((game) => game.isActive) || this.gameList[0];
                console.log('activeGame', activeGame);

                const analyticsHelper = AnalyticsHelper.getInstance();
                if (analyticsHelper) {
                    analyticsHelper.endLevelSession();
                }

                const gamePackage = this.gameList.find((game) => game.isActive)?.name || 'alien-shooter';
                let mode = undefined;
                if (activeGame.name === 'make-ten') {
                    if (activeGame.title === 'make_20') {
                        mode = 'make_20';
                    } else {
                        mode = 'make_ten';
                    }
                } else if (this.topic === 'g5_g6' || this.topic === 'g7_g8') {
                    mode = this.registry.get('topic') || 'add';
                }
                window.parent.postMessage({ type: 'START_GAME', package: gamePackage, mode: mode }, '*');
            },
        });
        this.playButton.setVisible(true);
        ButtonHelper.startBreathingAnimation(this.playButton, {
            scale: 1.2,
            duration: 1000,
            ease: 'Sine.easeInOut',
        });
        this.playButton.setDepth(10);
    }

    private removePlayButton(): void {
        if (!this.playButton) return;
        this.playButton.destroy();
        this.playButton = undefined;
    }

    private createCalibrateAgainContainer(): void {
        if (this.calibrateAgainContainer) return;
        this.calibrateAgainContainer = this.add.container(
            this.getScaledValue(this.display.width / 2),
            this.getScaledValue(632),
        ).setDepth(10);

        const gap = 10;
        const icon = this.addImage(0, 0, 'calibrate_icon').setOrigin(0);

        const text = this.addText(icon.width + gap, 0, i18n.t('additionAdventure.instructions.calibrateAgain'), {
            font: '700 30px Exo',
            color: '#fff',
            align: 'center',
            wordWrap: {
                width: 352,
            },
        }).setOrigin(0).setName('calibrateAgainText');

        const overlay = new TextOverlay(this, text, { label: i18n.t('additionAdventure.instructions.calibrateAgain') });
        text.setData('overlay', overlay);

        const totalWidth = this.getScaledValue(icon.width + text.width + gap);

        this.calibrateAgainContainer.setSize(totalWidth, this.getScaledValue(text.height));
        this.calibrateAgainContainer.setX(this.getScaledValue(this.display.width / 2) - totalWidth / 2);

        this.calibrateAgainContainer.add(icon);
        this.calibrateAgainContainer.add(text);

        this.toggleCalibrateAgainText(false);
    }

    private toggleCalibrateAgainText(show: boolean): void {
        if (!this.calibrateAgainContainer) return;
        
        const textElement = this.calibrateAgainContainer.getByName('calibrateAgainText') as Phaser.GameObjects.Text;
        const overlay = textElement.getData('overlay') as TextOverlay;

        const retakeChallengeButton = this.children.getByName('retakeChallengeButton') as Phaser.GameObjects.Container;

        if (show) {
            this.calibrateAgainContainer.setVisible(true);
            overlay.setAriaHidden(false);
            if (!this.retakeChallengeTween) {
                this.retakeChallengeTween = ButtonHelper.startBreathingAnimation(retakeChallengeButton, {
                    scale: 1.1,
                    moveUpAmount: 10,
                    duration: 1000,
                    ease: 'Sine.easeInOut',
                });
            }
        } else {
            this.calibrateAgainContainer.setVisible(false);
            overlay.setAriaHidden(true);
            if (this.retakeChallengeTween) {
                retakeChallengeButton.setPosition(this.getScaledValue(175), this.getScaledValue(75));
                ButtonHelper.stopBreathingAnimation(this.retakeChallengeTween, retakeChallengeButton);
                this.retakeChallengeTween = undefined;
            }
        }
    }

    private setupMessageListener(): void {
        const handleMessage = (event: MessageEvent) => {
            const data = event.data;
            if (data && typeof data === 'object' && data.type === 'GAME_COMPLETED') {
                const gameName = data.gameName;
                if (gameName) {
                    if (this.completionManager.isGameComplete(gameName)) return;
                    this.completionManager.markGameComplete(gameName);
                    this.addCompletedBadgeWithAnimation(gameName);
                }
            }
        };

        window.addEventListener('message', handleMessage);
        
        // Store the handler so we can remove it later
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            window.removeEventListener('message', handleMessage);
        });
    }

    private addCompletedBadgeWithAnimation(gameName: string): void {
        // Determine which position is currently at the center
        const { actualIdx } = this.stepsToGameIndex(this.totalSteps);
        
        // Find the game position in the wheel
        for (let i = 0; i < this.NUM_POSITIONS; i++) {
            const gameIndex = i % this.gameList.length;
            const game = this.gameList[gameIndex];
            
            if (game.title === gameName) {
                const gameEntry = this.games[i];
                
                // Only add badge if it doesn't exist yet
                if (!gameEntry.badge) {
                    const scaledRadius = this.getScaledValue(this.circleRadius);
                    const isCentered = i === actualIdx;
                    const completedBadge = this.addImage(0, 0, 'completed_badge')
                        .setOrigin(0.5, 1)
                        .setScale(0)
                        .setDepth(3);
                    
                    // Position based on whether this specific instance is at the center
                    this.positionCompletedBadge(completedBadge, i, scaledRadius, isCentered);
                    this.circleContainer?.add(completedBadge);
                    
                    // Store the badge in the games array
                    gameEntry.badge = completedBadge;
                    
                    // Pop animation
                    this.tweens.add({
                        targets: completedBadge,
                        scale: isCentered ? 1 : 0.64,
                        duration: 500,
                        ease: 'Back.easeOut',
                    });
                }
            }
        }
    }

    private cleanup(): void {
        // Remove input listeners
        this.input.off('dragstart');
        this.input.off('drag');
        this.input.off('dragend');
        this.stopHandGuide();
        this.tweens.killAll();
        this.clearKeyboardEvents();
        // Destroy images
        if (this.bgImage) {
            this.bgImage.destroy();
            this.bgImage = undefined as any;
        }
        if (this.titleImage) {
            this.titleImage.destroy();
            this.titleImage = undefined as any;
        }
        if (this.games && this.games.length) {
            this.games.forEach(({ img, lock, badge }) => {
                img && img.destroy();
                lock && lock.destroy();
                badge && badge.destroy();
            });
            this.games = [];
        }
        if (this.circleContainer) {
            this.circleContainer.destroy(true);
            this.circleContainer = undefined;
        }
        if (this.circle) {
            this.circle.destroy();
            this.circle = undefined;
        }
    }

    private setupKeyboardEvents(): void {
        this.clearKeyboardEvents();
        this.input.keyboard?.on('keydown', this.handleKeyDown, this);
    }

    private clearKeyboardEvents(): void {
        this.input.keyboard?.off('keydown', this.handleKeyDown, this);
    }

    private handleKeyDown(e: KeyboardEvent): void {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            for (const game of this.gameList) {
                if (!game.isActive) {
                    this.toggleCalibrateAgainText(false);
                    this.removePlayButton();
                }
            }

            if(e.key === 'ArrowLeft') {
                this.rotateBySide('right');
            } else if(e.key === 'ArrowRight') {
                this.rotateBySide('left');
            }
        }
    }

    /* Helper Methods */

    private updateImagesOnDrag(): void {
        const { gameIdx, actualIdx } = this.stepsToGameIndex(this.totalSteps);
        const scaledRadius = this.getScaledValue(this.circleRadius);

        let lockImg: Phaser.GameObjects.Image | undefined;
        this.games.forEach(({ img, lock, badge }, i) => {
            if (actualIdx === i) {
                img.setScale(1);
                if (lock) {
                    lockImg = lock;
                    lock.setScale(1);
                }
                if (badge) {
                    badge.setScale(1);
                    this.positionCompletedBadge(badge, i, scaledRadius, true);
                }
            }
        });

        const newGame = this.gameList[gameIdx];
        const newBgKey = `${newGame.title}_bg`;
        const newTitleKey = `${newGame.title}_title`;
        this.bgImage.setTexture(newBgKey).setAlpha(0);
        this.titleImage.setTexture(newTitleKey).setAlpha(0);
        let targets = [this.bgImage]
        if (lockImg) {
            targets.push(lockImg);
            this.toggleCalibrateAgainText(true);
        } else {
            targets.push(this.titleImage);
            this.addPlayButton();
            this.toggleCalibrateAgainText(false);
        }
        this.tweens.add({
            targets: targets,
            alpha: 1,
            duration: 500,
            ease: 'Cubic.Out',
        });
        this.gameList.forEach((game) => (game.isActive = false));
        this.gameList[gameIdx].isActive = true;
    }

    private pivotOffset(): number {
        return Phaser.Math.DegToRad(this.startingAngle - this.centerAngle);
    }

    // Always 0..7
    private rotToIndex(rot: number): number {
        const rel = Phaser.Math.Angle.Wrap(rot - this.pivotOffset()); // [-π, π)
        const rel0 = rel < 0 ? rel + Math.PI * 2 : rel; // [0, 2π)
        return Math.round(rel0 / this.stepRad) % 8;
    }

    private mod(n: number, m: number): number {
        return ((n % m) + m) % m;
    }

    private stepsToGameIndex(totalSteps: number, initialGameIndex = 1): { gameIdx: number; actualIdx: number } {
        const len = this.gameList.length;
        const slotMap = this.slotMap[len];
        if (!len) return { gameIdx: -1, actualIdx: -1 };
        const pos = this.mod(totalSteps, this.NUM_POSITIONS);
        const gameIndex = (initialGameIndex + (pos % this.NUM_POSITIONS)) % this.NUM_POSITIONS;
        return { gameIdx: slotMap[gameIndex], actualIdx: this.mod(totalSteps + 1, this.NUM_POSITIONS) };
    }

    static _preload(scene: BaseScene) {
        const lang = i18n.getLanguage();

        scene.load.setPath('assets/images/menu_screen');
        scene.load.image('title', `title_${lang}.png`);
        scene.load.image('stars', 'bg_stars.png');
        scene.load.image('hand', 'hand.png');
        scene.load.image('hand_arrow', 'hand_arrow.png');
        scene.load.image('portal_lock', 'portal_lock.png');
        scene.load.image('completed_badge', 'completed_badge.png');

        const games = ['array_architects', 'digit_dash', 'alien_shooter', 'make_ten', 'make_20', 'fact_racer', 'slingshot', 'bunny_rescue', 'emoji_battle'];
        for (const game of games) {
            scene.load.setPath(`assets/images/menu_screen/${game}`);
            scene.load.image(`${game}_title_bg`, 'title_bg.png');
            scene.load.image(`${game}_bg`, 'game_bg.png');
            scene.load.image(`${game}_title`, `title_${lang}.png`);
        }

        scene.load.setPath(`assets/images/common`);
        scene.load.image(BUTTONS.HAMBURGER_ICON.KEY, BUTTONS.HAMBURGER_ICON.PATH);

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}`);
        scene.load.audio('multiverse_entry', 'multiverse_entry.mp3');
    }

    update(): void {
        // Update mute button icon
        const muteBtnItem = this.muteBtn.getAt(1) as Phaser.GameObjects.Sprite;
        if (this.audioManager.getIsAllMuted()) {
            muteBtnItem.setTexture(BUTTONS.MUTE_ICON.KEY);
        } else {
            muteBtnItem.setTexture(BUTTONS.UNMUTE_ICON.KEY);
        }

        // Update mute button state
        const label = this.audioManager.getIsAllMuted() ? i18n.t('common.unmute') : i18n.t('common.mute');
        const overlay = (this.muteBtn as any).buttonOverlay as ButtonOverlay;
        const muteBtnState = this.muteBtn.getData('state');
        if(muteBtnState != label) {
            this.muteBtn.setData('state', label);
            overlay.setLabel(label);
        }
    }
}
