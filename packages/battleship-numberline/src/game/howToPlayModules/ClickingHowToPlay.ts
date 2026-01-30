import { BaseScene } from '../scenes/BaseScene';
import { UIUtils } from '../utils/UIUtils';
import { GameScreenConfig as GameConfig } from '../config/GameScreenConfig';
import { CommonConfig } from '../config/CommonConfig';
import { HowToPlaySceneConfig as Config } from '../config/HowToPlaySceneConfig';
import { ButtonHelper, ExpressionUtils, i18n, TextOverlay, TweenAnimations } from '@k8-games/sdk';
import { QuestionData } from '../interfaces/gameplay';
import { GameplayManager } from '../managers/GameplayManager';
import { AnimationPlayer } from '../managers/AnimationPlayer';
import { AnimationManager } from '../managers/AnimationManager';
import { parseFractionString } from '../utils/parseFractionString';
import { formatMathExpression } from '../utils/parseExpression';

const {
    ASSETS: {
        KEYS: { FONT: fontKeys },
    },
} = CommonConfig;

export interface ClickingHowToPlayData {
    scene: BaseScene;
    question: QuestionData;
    gameplayManager: GameplayManager;
    parentScene: string;
    onComplete: () => void;
    playButton?: Phaser.GameObjects.Container;
}

export class ClickingHowToPlay {
    private scene: BaseScene;
    private question: QuestionData;
    private gameplayManager: GameplayManager;
    private parentScene: string;
    private playButton?: Phaser.GameObjects.Container;
    
    private yOffset: number = -20;
    private targetPointContainer!: Phaser.GameObjects.Container;
    private hand!: Phaser.GameObjects.Image;
    private handTween!: Phaser.Tweens.Tween;
    private upperContainer!: Phaser.GameObjects.Container;
    private lowerContainer!: Phaser.GameObjects.Container;
    private targetText!: ExpressionUtils;
    private greenText!: ExpressionUtils;
    private step1Overlay!: TextOverlay;
    private step2Overlay!: TextOverlay;
    private mathTextOverlay!: TextOverlay;
    private targetPointX!: number;
    private delayedCalls: Phaser.Time.TimerEvent[] = [];
    private topWoodImage!: Phaser.GameObjects.Image;
    private animationPlayer?: AnimationPlayer;
    private animationManager?: AnimationManager;

    constructor(data: ClickingHowToPlayData) {
        this.scene = data.scene;
        this.question = data.question;
        this.gameplayManager = data.gameplayManager;
        this.parentScene = data.parentScene;
        this.playButton = data.playButton;
    }

    create(): void {
        this.animationManager = new AnimationManager(this.scene);
        this.animationManager.createAnimations();

        // Set background color
        this.scene.cameras.main.setBackgroundColor('#140E31');

        // Add top wood for animations
        this.topWoodImage = this.scene.addImage(this.scene.display.width / 2, 25, GameConfig.ASSETS.KEYS.IMAGE.CLICK_MECHANICS.TOP_WOOD)
            .setOrigin(GameConfig.UI.WOOD.ORIGIN.TOP.X, GameConfig.UI.WOOD.ORIGIN.TOP.Y)
            .setVisible(false)
            .setScale(GameConfig.UI.WOOD.SCALE);

        this.animationPlayer = new AnimationPlayer(this.scene, this.topWoodImage);
        this.createUI();

        const timer = this.scene.time.delayedCall(1000, () => {
            this.playStep1();
        });
        this.delayedCalls.push(timer);
    }

    private createUI(): void {
        // Add title
        const titleText = this.scene.addText(this.scene.display.width / 2, Config.TITLE.POSITION.Y, i18n.t('howToPlay.title'), {
            font: Config.TITLE.FONT,
        }).setOrigin(0.5);

        new TextOverlay(this.scene, titleText, { label: i18n.t('howToPlay.title'), tag: 'h1', role: 'heading' });

        // Create main container
        const container = this.scene.add.container(
            this.scene.getScaledValue(this.scene.display.width / 2),
            this.scene.getScaledValue(this.scene.display.height / 2 + this.yOffset),
        );

        // Create background image with rounded corners
        const backgroundImage = this.scene.addImage(0, 0, GameConfig.ASSETS.KEYS.IMAGE.BACKGROUND.BG_01)
            .setOrigin(0.5, 0.49)
            .setScale(0.85);

        // Add background image and border to container
        container.add([backgroundImage]);

        const horizontalMargin = 220;

        // Create number line with appropriate margins
        UIUtils.createVerticalLinesWithNumbers(this.scene, {
            ...GameConfig.MARKER_LINES,
            fontSize: 28,
            fontFamily: fontKeys.EUROSTILE,
            startPoint: this.question.startPoint,
            endPoint: this.question.endPoint,
            horizontalMargin: horizontalMargin,
            markersList: this.question.markersList,
            numberLinePadding: 132,
            showIntermediateNumbers: this.gameplayManager.getShowIntermediateNumbers(),
            yOffset: this.yOffset,
            animate: false,
        });

        const answer = this.question.shipLocation;
        const numberlineWidth = this.scene.display.width - horizontalMargin * 2;
        const start = parseFractionString(this.question.startPoint) ?? 0;
        const end = parseFractionString(this.question.endPoint) ?? 1;
        const widthRatio = (answer - start) / (end - start);
        this.targetPointX = horizontalMargin + widthRatio * numberlineWidth;

        // Add target point
        this.targetPointContainer = this.scene.add.container(
            this.scene.getScaledValue(this.targetPointX),
            this.scene.getScaledValue(this.scene.display.height / 2 + this.yOffset),
        );

        const targetPoint = this.scene.addImage(0, 0, Config.ASSETS.KEYS.TARGET_POINT).setOrigin(0.5);

        this.hand = this.scene.addImage(-20, -20, Config.ASSETS.KEYS.HAND).setOrigin(0).setScale(0.13);

        this.targetPointContainer.add([targetPoint, this.hand]).setVisible(false);

        const scaleDown = 0.8;
        // Add bottom wood
        const bottomWood = this.scene.addImage(
            0,
            536 / 2,
            GameConfig.ASSETS.KEYS.IMAGE.CLICK_MECHANICS.BOTTOM_WOOD,
        ).setOrigin(GameConfig.UI.WOOD.ORIGIN.BOTTOM.X, GameConfig.UI.WOOD.ORIGIN.BOTTOM.Y);

        const scale = 1017 / bottomWood.width;
        bottomWood.setScale(scale, scale * scaleDown);

        container.add(bottomWood);

        // Add screen clicking image
        const screenClickingContainer = this.scene.add.container(0, this.scene.getScaledValue(536 / 2));

        const screenClicking = this.scene.addImage(
            0,
            0,
            GameConfig.ASSETS.KEYS.IMAGE.CLICK_MECHANICS.SCREEN_CLICKING,
        ).setOrigin(GameConfig.UI.SCREEN_CLICKING.ORIGIN.X, GameConfig.UI.SCREEN_CLICKING.ORIGIN.Y);

        screenClicking.setScale(scale * scaleDown);

        const centerY = 65 * scaleDown;

        this.targetText = new ExpressionUtils(this.scene, 0, -centerY, formatMathExpression(this.question.questionPrompt), {
            fontSize: Config.TARGET_TEXT.FONT_SIZE,
            fontFamily: fontKeys.EUROSTILE,
            fontColor: Config.TARGET_TEXT.COLOR,
            spacing: Config.TARGET_TEXT.SPACING,
            fractionLinePadding: Config.TARGET_TEXT.FRACTION_LINE_PADDING,
        });
        
        screenClickingContainer.add([screenClicking, this.targetText.getContainer()]);

        container.add(screenClickingContainer);
        
        new TextOverlay(this.scene, this.targetText.getContainer().getAt(0) as Phaser.GameObjects.Text, { label: i18n.t('common.targetText', { number: this.question.questionPrompt }) });
        
        this.createInstructions(container);

        const maskGraphics = this.scene.make.graphics({}, false);
        maskGraphics.fillStyle(0xffffff);
        maskGraphics.fillRoundedRect(
            this.scene.getScaledValue((this.scene.display.width - 1017) / 2),
            this.scene.getScaledValue((this.scene.display.height - 536) / 2 + this.yOffset),
            this.scene.getScaledValue(1017),
            this.scene.getScaledValue(536),
            this.scene.getScaledValue(32),
        );

        // Apply the mask to the container
        const mask = maskGraphics.createGeometryMask();
        container.setMask(mask).setDepth(-1);
    }

    private createInstructions(container: Phaser.GameObjects.Container) {
        // Create upper container with text
        this.upperContainer = this.scene.add.container(0, this.scene.getScaledValue(Config.UPPER_CONTAINER.POSITION.Y_OFFSET));
        const upperRect = this.scene.addRectangle(
            0,
            0,
            Config.UPPER_CONTAINER.RECTANGLE.WIDTH,
            Config.UPPER_CONTAINER.RECTANGLE.HEIGHT,
            Config.UPPER_CONTAINER.RECTANGLE.COLOR,
            Config.UPPER_CONTAINER.RECTANGLE.ALPHA,
        );

        // Add the upper text
        const upperText = this.scene.addText(0, Config.UPPER_CONTAINER.TEXT.INSTRUCTION.Y_OFFSET, i18n.t('howToPlay.step1'), {
            fontSize: Config.UPPER_CONTAINER.TEXT.INSTRUCTION.FONT_SIZE,
            fontFamily: fontKeys.EUROSTILE,
            color: Config.UPPER_CONTAINER.TEXT.INSTRUCTION.COLOR,
            align: 'center',
        }).setOrigin(0.5);

        const mathText = new ExpressionUtils(
            this.scene,
            0,
            Config.UPPER_CONTAINER.TEXT.MATH.Y_OFFSET,
            this.question.questionPrompt,
            {
                fontSize: Config.UPPER_CONTAINER.TEXT.MATH.FONT_SIZE,
                fontFamily: fontKeys.EXO,
                fontColor: Config.UPPER_CONTAINER.TEXT.MATH.COLOR,
                spacing: Config.UPPER_CONTAINER.TEXT.SPACING,
                fractionLinePadding: Config.UPPER_CONTAINER.TEXT.FRACTION_LINE_PADDING,
            },
        ).setVisible(false);

        this.greenText = new ExpressionUtils(
            this.scene,
            0,
            Config.UPPER_CONTAINER.TEXT.MATH.Y_OFFSET,
            ` = ${this.question.shipLocation.toString()}`,
            {
                fontSize: Config.UPPER_CONTAINER.TEXT.ANSWER.FONT_SIZE,
                fontFamily: fontKeys.EUROSTILE,
                fontColor: Config.UPPER_CONTAINER.TEXT.ANSWER.COLOR,
                spacing: Config.UPPER_CONTAINER.TEXT.SPACING,
                fractionLinePadding: Config.UPPER_CONTAINER.TEXT.FRACTION_LINE_PADDING,
            },
        ).setVisible(false);

        // Calculate total width of both texts
        const mathTextWidth = mathText.getContainer().getBounds().width;
        const greenTextWidth = this.greenText.getContainer().getBounds().width;
        const totalWidth = mathTextWidth + greenTextWidth;

        // Position math text to the left of center
        mathText.getContainer().x = -totalWidth / 2 + mathTextWidth / 2;
        // Position green text to the right of math text
        this.greenText.getContainer().x = mathText.getContainer().x + mathTextWidth / 2 + greenTextWidth / 2;

        this.upperContainer.add([upperRect, upperText, mathText.getContainer(), this.greenText.getContainer()]);
        TweenAnimations.fadeIn(this.scene, this.upperContainer, 500);

        // Create lower container with text
        this.lowerContainer = this.scene.add.container(0, this.scene.getScaledValue(Config.LOWER_CONTAINER.POSITION.Y_OFFSET));
        const lowerRect = this.scene.addRectangle(
            0,
            0,
            Config.LOWER_CONTAINER.RECTANGLE.WIDTH,
            Config.LOWER_CONTAINER.RECTANGLE.HEIGHT,
            Config.LOWER_CONTAINER.RECTANGLE.COLOR,
            Config.LOWER_CONTAINER.RECTANGLE.ALPHA,
        );
        const lowerText = this.scene.addText(0, 0, i18n.t('howToPlay.step2'), {
            fontSize: Config.LOWER_CONTAINER.TEXT.FONT_SIZE,
            fontFamily: fontKeys.EUROSTILE,
            color: Config.LOWER_CONTAINER.TEXT.COLOR,
            align: 'center',
        }).setOrigin(0.5);
        this.lowerContainer.add([lowerRect, lowerText]);
        this.lowerContainer.setVisible(false);

        // Add containers to main container
        container.add([this.upperContainer, this.lowerContainer]);

        this.step1Overlay = new TextOverlay(this.scene, upperText, { label: i18n.t('howToPlay.step1') });

        this.mathTextOverlay = new TextOverlay(this.scene, mathText.getContainer().getAt(0) as Phaser.GameObjects.Text, { label: this.question.questionPrompt + ' = ' + this.question.shipLocation.toString() });
        this.mathTextOverlay.setAriaHidden(true);
        
        this.step2Overlay = new TextOverlay(this.scene, lowerText, { label: i18n.t('howToPlay.step2') });
        this.step2Overlay.setAriaHidden(true);
    }

    private createPointingHandAnimation(x: number, y: number): Phaser.GameObjects.Image {
        // Add pointing hand animation
        const pointingHandX = x; 
        const pointingHandY = y;
        const pointingHand = this.scene.addImage(
            pointingHandX,
            pointingHandY,
            'pointing_hand'
        ).setOrigin(0.5, 0).setRotation(1.5708).setScale(0.8);

        this.scene.tweens.add({
            targets: pointingHand,
            x: "-=" + this.scene.getScaledValue(10),
            duration: 500,
            yoyo: true,
            repeat: 3,
            ease: 'Sine.easeInOut',
        });

        return pointingHand;
    }

    private async playTargetClick(cb?: () => void) {
        this.targetPointContainer.setVisible(true);
        this.hand.x = -this.scene.getScaledValue(20);
        this.hand.y = -this.scene.getScaledValue(20);
        // Add hand animation
        this.hand.x = this.hand.x + this.scene.getScaledValue(200);

        this.handTween = this.scene.tweens.add({
            targets: this.hand,
            x: this.hand.x - this.scene.getScaledValue(200),
            y: this.hand.y,
            duration: 1000,
            ease: 'Sine.easeInOut',
            onComplete: async () => {
                // Play hit animation first
                const targetX = this.targetPointContainer.x;

                // Chain a scale animation after the hit animation
                this.handTween = this.scene.tweens.add({
                    targets: { progress: 0 },
                    progress: 1,
                    duration: 800,
                    ease: 'Sine.easeInOut',
                    onUpdate: () => {
                        const target = this.handTween.targets[0] as { progress: number };
                        if (target.progress < 0.5) {
                            this.hand.setTexture(Config.ASSETS.KEYS.HAND_CLICK);
                        } else {
                            this.hand.setTexture(Config.ASSETS.KEYS.HAND);
                        }
                    },
                    onComplete: () => {
                        this.handTween.stop();
                        this.handTween.destroy();
                        this.targetPointContainer.setVisible(false);
                    }
                });

                const timer = this.scene.time.delayedCall(400, async () => {
                    await this.animationPlayer?.playResultAnimations('hit', targetX, targetX);

                    cb?.();
                });
                this.delayedCalls.push(timer);
            },
        });
    }

    private playStep1() {
        const step1 = this.scene.audioManager.playSoundEffect('step_1');
        const pointingHand = this.createPointingHandAnimation(
            this.targetText.getContainer().getBounds().left / this.scene.display.scale - 20,
            this.targetText.getContainer().getBounds().centerY / this.scene.display.scale
        );
        TweenAnimations.pulse(this.scene, this.targetText.getContainer(), 1.1, 1000, 3);

        const question = this.upperContainer.getAt(2) as Phaser.GameObjects.Container;
        question.setVisible(true);
        TweenAnimations.fadeIn(this.scene, question, 1500);
        const answer = this.upperContainer.getAt(3) as Phaser.GameObjects.Container;
        answer.setVisible(true);
        TweenAnimations.fadeIn(this.scene, answer, 1500, 2000);

        this.step1Overlay.setAriaHidden(false);
        this.mathTextOverlay.setAriaHidden(false);

        step1?.on('complete', () => {
            pointingHand.destroy();
            const timer = this.scene.time.delayedCall(1000, () => {
                this.playStep2();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playStep2() {
        const step2 = this.scene.audioManager.playSoundEffect('step_2');
        this.lowerContainer.setVisible(true);
        this.step2Overlay.setAriaHidden(false);

        TweenAnimations.fadeIn(this.scene, this.lowerContainer, 500);

        step2?.on('complete', () => {
            this.upperContainer.setVisible(false);
            this.lowerContainer.setVisible(false);
            this.step1Overlay.setAriaHidden(true);
            this.mathTextOverlay.setAriaHidden(true);
            this.step2Overlay.setAriaHidden(true);
            this.playTargetClick(() => {
                if (this.parentScene !== 'GameScreen') {
                    const timer2 = this.scene.time.delayedCall(1000, () => {
                        this.playStep3();
                    });
                    this.delayedCalls.push(timer2);
                } else {
                    const timer2 = this.scene.time.delayedCall(4000, () => {
                        TweenAnimations.fadeOut(this.scene, this.lowerContainer, 500);
                        TweenAnimations.fadeOut(this.scene, this.upperContainer, 500, 0, () => {
                            this.upperContainer.setVisible(true);
                            const question = this.upperContainer.getAt(2) as Phaser.GameObjects.Container;
                            question.setVisible(false);
                            const answer = this.upperContainer.getAt(3) as Phaser.GameObjects.Container;
                            answer.setVisible(false);
                            TweenAnimations.fadeIn(this.scene, this.upperContainer, 500);
                        });
                    });
                    this.delayedCalls.push(timer2);

                    const timer3 = this.scene.time.delayedCall(5000, () => {
                        this.playStep1();
                    });
                    this.delayedCalls.push(timer3);
                }
            });
        });
    }

    private playStep3() {
        const step3 = this.scene.audioManager.playSoundEffect('step_last');

        let playButtonTween: Phaser.Tweens.Tween | null = null;

        if (this.playButton) {
            console.log(this.playButton);
            playButtonTween = ButtonHelper.startBreathingAnimation(this.playButton, {
                scale: 1.1,
                duration: 1000,
                ease: 'Sine.easeInOut'
            });
        }

        step3?.on('complete', () => {
            const timer = this.scene.time.delayedCall(4000, () => {
                TweenAnimations.fadeOut(this.scene, this.lowerContainer, 500);
                TweenAnimations.fadeOut(this.scene, this.upperContainer, 500, 0, () => {
                    this.upperContainer.setVisible(true);
                    const question = this.upperContainer.getAt(2) as Phaser.GameObjects.Container;
                    question.setVisible(false);
                    const answer = this.upperContainer.getAt(3) as Phaser.GameObjects.Container;
                    answer.setVisible(false);
                    TweenAnimations.fadeIn(this.scene, this.upperContainer, 500);

                    this.step1Overlay.setAriaHidden(true);
                    this.mathTextOverlay.setAriaHidden(true);
                    this.step2Overlay.setAriaHidden(true);
                });
            });
            this.delayedCalls.push(timer);

            const timer2 = this.scene.time.delayedCall(5000, () => {
                if (this.playButton && playButtonTween) {
                    ButtonHelper.stopBreathingAnimation(playButtonTween, this.playButton);
                }
                this.playStep1();
            });
            this.delayedCalls.push(timer2);
        });
    }

    private destroyTweens() {
        // Stop and destroy any active tween
        if (this.handTween) {
            this.handTween.stop();
            this.handTween.destroy();
        }

        // Reset all game objects to their initial state
        if (this.hand) {
            this.hand.destroy();
        }

        // Stop any playing audio
        this.scene.audioManager.stopAllSoundEffects();
    }

    private destroyTimers() {
        // Destroy all delayed calls
        this.delayedCalls.forEach(timer => {
            if (timer) {
                timer.destroy();
            }
        });
        this.delayedCalls = [];
    }

    destroy(): void {
        this.destroyTweens();
        this.destroyTimers();
    }
}