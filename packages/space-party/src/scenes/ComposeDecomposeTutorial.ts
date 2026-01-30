import { BaseScene, ButtonHelper, ButtonOverlay, i18n, TextOverlay, announceToScreenReader, focusToGameContainer, VolumeSlider } from "@k8-games/sdk";import { ASSETS_PATHS, BUTTONS } from "../config/common";
import { ComposeDecompose } from "../mechanics/ComposeDecompose";

export class ComposeDecomposeTutorial extends BaseScene {
    private composeDecomposeMechanic!: ComposeDecompose;
    private resetData: { reset?: boolean; fromGameScene?: boolean; showPlayButton?: boolean; mechanicType?: "compose" | "decompose" } = {};
    private skipBtn!: Phaser.GameObjects.Container;
    private muteBtn!: Phaser.GameObjects.Container;
    private volumeSlider!: VolumeSlider;
    private playButton!: Phaser.GameObjects.Container;
    private isSkipped: boolean = false;
    private lang: string;
    private delayedCalls: Phaser.Time.TimerEvent[] = [];
    private hand!: Phaser.GameObjects.Image;
    private handTween!: Phaser.Tweens.TweenChain | Phaser.Tweens.Tween;
    private mechanicType: "compose" | "decompose" = "decompose";
    // Announcement queue system
    private announcementQueue: string[] = [];
    private isAnnouncing: boolean = false;

    constructor() {
        super("ComposeDecomposeTutorial");
        this.composeDecomposeMechanic = new ComposeDecompose(this);
        this.lang = i18n.getLanguage() || "en";
    }

    static _preload(scene: BaseScene) {
        const lang = i18n.getLanguage() || "en";

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/common`);
        scene.load.image("btn_skip", "btn_skip.png");
        scene.load.image("btn_skip_hover", "btn_skip_hover.png");
        scene.load.image("btn_skip_pressed", "btn_skip_pressed.png");

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/info_screen`);
        scene.load.image("hand", "hand.png");
        scene.load.image("hand_click", "hand_click.png");

        // load audio
        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/info_screen/compose_decompose`);
        scene.load.audio(`ready_to_play_${lang}`, `ready_to_play_${lang}.mp3`);
        scene.load.audio(`decompose_step_1_${lang}`, `decompose_step_1_${lang}.mp3`);
        scene.load.audio(`decompose_step_2_${lang}`, `decompose_step_2_${lang}.mp3`);
        scene.load.audio(`decompose_step_3_${lang}`, `decompose_step_3_${lang}.mp3`);
        scene.load.audio(`decompose_step_4_${lang}`, `decompose_step_4_${lang}.mp3`);
        scene.load.audio(`decompose_step_5_${lang}`, `decompose_step_5_${lang}.mp3`);
        scene.load.audio(`compose_step_1_${lang}`, `compose_step_1_${lang}.mp3`);
        scene.load.audio(`compose_step_2_${lang}`, `compose_step_2_${lang}.mp3`);
        scene.load.audio(`compose_step_3_${lang}`, `compose_step_3_${lang}.mp3`);
        scene.load.audio(`compose_step_4_${lang}`, `compose_step_4_${lang}.mp3`);
        scene.load.audio(`compose_step_5_${lang}`, `compose_step_5_${lang}.mp3`);
        scene.load.audio(`compose_step_6_${lang}`, `compose_step_6_${lang}.mp3`);

        // Preload volume slider assets
        VolumeSlider.preload(scene, "blue");

        ComposeDecompose._preload(scene);
    }

    init(data?: { reset?: boolean; fromGameScene?: boolean; showPlayButton?: boolean; mechanicType?: "compose" | "decompose" }) {
        // Initialize AudioManager
        this.audioManager.initialize(this);

        // Store reset data
        if (data) {
            this.resetData = data;
        }

        this.isSkipped = false;
        this.mechanicType = data?.mechanicType || "decompose";
        this.destroyTimers();

        ComposeDecompose.init(this);

        if (data?.fromGameScene) {
            focusToGameContainer();
            this.time.delayedCall(1000, () => {
                this.queueAnnouncement(i18n.t('info.helpPage'));
            });
        }
    }

    create() {
        // Add how to play text
        const howToPlayText = this.addText(this.display.width / 2, 61, i18n.t("info.howToPlay"), {
            font: "700 30px Exo",
            color: "#ffffff",
        }).setOrigin(0.5).setDepth(1);
        new TextOverlay(this, howToPlayText, {
            label: i18n.t("info.howToPlay"),
            tag: 'h1',
            role: 'heading'
        });

        this.createSkipButton();
        this.createMuteButton();

        this.composeDecomposeMechanic.create(
            "tutorial",
            this.resetData.reset,
            this.resetData.mechanicType,
            this.resetData.fromGameScene ? "GameScene" : "SplashScene"
        );

        this.composeDecomposeMechanic.setPlateOverlaysEnabled([]);

        // Start tutorial after a delay
        this.time.delayedCall(2000, () => {
            this.startTutorial();
        });
    }

    private createSkipButton() {
        this.skipBtn = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: "btn_skip",
                hover: "btn_skip_hover",
                pressed: "btn_skip_pressed",
            },
            text: i18n.t("common.skip"),
            label: i18n.t("common.skip"),
            textStyle: {
                font: "700 32px Exo",
                color: "#FFFFFF",
            },
            x: this.display.width - 80,
            y: 54,
            raisedOffset: 3.5,
            onClick: () => {
                // stop audio manager
                this.isSkipped = true;
                if (this.resetData.fromGameScene) {
                    // clear all sound effects
                    this.audioManager.stopAllSoundEffects();
                    // start playing bg-music
                    this.audioManager.playBackgroundMusic("bg-music");

                    this.scene.stop("ComposeDecomposeTutorial");
                    this.scene.resume("GameScene");
                } else {
                    this.audioManager.stopAll();
                    this.composeDecomposeMechanic.closeDoors();
                    this.time.delayedCall(1000, () => {
                        this.scene.stop("ComposeDecomposeTutorial");
                        this.scene.start("GameScene");
                        this.isSkipped = false;
                    });
                }
            },
        });
        this.skipBtn.setDepth(1);
    }

    private createMuteButton() {
        // Mute button
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
            x: this.display.width - 60,
            y: 158,
            raisedOffset: 3.5,
            onClick: () => {
                this.audioManager.setMute(!this.audioManager.getIsAllMuted());
            },
        });
        this.muteBtn.setDepth(1);

        // Volume slider
        this.volumeSlider = new VolumeSlider(this);
        this.volumeSlider.create(
            this.display.width - 220,
            254,
            "blue",
            i18n.t("common.volume")
        );

        const volumeBtn = ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.SETTINGS_ICON.KEY,
            label: i18n.t("common.volume"),
            x: this.display.width - 60,
            y: 248,
            raisedOffset: 3.5,
            onClick: () => {
                this.volumeSlider.toggleControl();
            },
        });
        volumeBtn.setDepth(1);
    }

    private startTutorial() {
        if (this.mechanicType === "decompose") {
            this.playDecomposeStep1();
        } else {
            this.playComposeStep1();
        }
    }

    // Decompose Tutorial Steps
    private playDecomposeStep1() {
        if (this.isSkipped) return;

        this.queueAnnouncement(i18n.t("info.decompose_step1"));

        const step1 = this.audioManager.playSoundEffect(`decompose_step_1_${this.lang}`);
        step1?.on("complete", () => {
            const timer = this.time.delayedCall(1000, () => {
                this.playDecomposeStep2();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playDecomposeStep2() {
        if (this.isSkipped) return;

        this.queueAnnouncement(i18n.t("info.decompose_step2"));

        // Find the fixed plate (the one with items already)
        const fixedPlate = this.composeDecomposeMechanic.optionContainers.find(container => {
            const plate = container.list.find(child =>
                child instanceof Phaser.GameObjects.Image && child.texture.key === "plate_fixed"
            ) as Phaser.GameObjects.Image;
            return plate !== undefined;
        });

        if (fixedPlate) {
            // Scale animation on the fixed plate
            this.tweens.add({
                targets: fixedPlate,
                scale: 1.1,
                duration: 500,
                yoyo: true,
                repeat: 1,
                ease: "Sine.easeInOut"
            });
        }

        const step2 = this.audioManager.playSoundEffect(`decompose_step_2_${this.lang}`);
        step2?.on("complete", () => {
            const timer = this.time.delayedCall(1000, () => {
                this.playDecomposeStep3();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playDecomposeStep3() {
        if (this.isSkipped) return;

        this.queueAnnouncement(i18n.t("info.decompose_step3"));

        // Find the correct plate to drag (the one that makes the correct answer)
        const targetPlate = this.findCorrectPlateForDecompose();
        if (targetPlate) {
            this.createHandDragAnimation(targetPlate);
        }

        const step3 = this.audioManager.playSoundEffect(`decompose_step_3_${this.lang}`);
        step3?.on("complete", () => {
            if (targetPlate) {
                 // Restrict overlays to only the correct plate
                this.composeDecomposeMechanic.setPlateOverlaysEnabled([targetPlate]);

                // Disable drag in all other plates
                this.composeDecomposeMechanic.optionContainers.forEach(container => {
                    if (container !== targetPlate) {
                        container.disableInteractive(true);
                    }
                });
            }
            // Enable drag for plates
            this.composeDecomposeMechanic.setupDragAndDropEvents();

            // Listen for plate dropped in zone
            this.events.on("platedrop", () => {
                // Destroy timers
                this.destroyTimers();

                // Delay play step 4
                const timer = this.time.delayedCall(1000, () => {
                    this.playDecomposeStep4();
                });
                this.delayedCalls.push(timer);
            });

            const timer = this.time.delayedCall(5000, () => {
                this.playDecomposeStep3();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playDecomposeStep4() {
        if (this.isSkipped) return;

        this.queueAnnouncement(i18n.t("info.decompose_step4"));

        // Clear previous timers
        this.destroyTimers();

        // Create hand animation on feed button
        const feedButton = this.children.getByName("checkButton") as Phaser.GameObjects.Container;
        if (feedButton) {
            this.createHandClickAnimation(feedButton);
        }

        const step4 = this.audioManager.playSoundEffect(`decompose_step_4_${this.lang}`);
        step4?.on("complete", () => {
            // Listen for check answer
            this.events.removeAllListeners("checkanswer");
            this.events.once("checkanswer", () => {
                // Destroy timers
                this.destroyTimers();

                // Delay play step 5
                const timer = this.time.delayedCall(1000, () => {
                    this.playDecomposeStep5();
                });
                this.delayedCalls.push(timer);
            });

            const timer = this.time.delayedCall(5000, () => {
                this.playDecomposeStep4();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playDecomposeStep5() {
        if (this.isSkipped) return;

        this.queueAnnouncement(i18n.t("info.decompose_step5"));

        this.destroyTimers();

        // Clear all plates
        this.composeDecomposeMechanic.optionContainers.forEach(container => {
            container.setVisible(false);
        });

        // Cleare Reset and Submit buttons
        const resetButton = this.children.getByName("resetButton") as Phaser.GameObjects.Container;
        const submitButton = this.children.getByName("checkButton") as Phaser.GameObjects.Container;
        resetButton.setVisible(false);
        submitButton.setVisible(false);
        resetButton.destroy();
        submitButton.destroy();

        // Show equation
        this.composeDecomposeMechanic.showEquation();

        // Animate equation container
        const equationContainer = this.children.getByName("equationContainer") as Phaser.GameObjects.Container;
        this.tweens.add({
            targets: equationContainer,
            scale: 1.1,
            duration: 500,
            yoyo: true,
            repeat: 1,
        });

        // Start eating
        const itemName = this.composeDecomposeMechanic.currentQuestion?.operand1;
        this.composeDecomposeMechanic.startEating(itemName || "mooncake");

        const step5 = this.audioManager.playSoundEffect(`decompose_step_5_${this.lang}`);
        step5?.on("complete", () => {
            this.time.delayedCall(1000, () => {
                // Play ready to play audio
                if (!this.resetData.fromGameScene) {
                    this.audioManager.playSoundEffect(`ready_to_play_${this.lang}`);
                }
                this.createPlayButton();
            });
        });
    }

    // Compose Tutorial Steps
    private playComposeStep1() {
        if (this.isSkipped) return;

        this.queueAnnouncement(i18n.t("info.compose_step1"));

        const step1 = this.audioManager.playSoundEffect(`compose_step_1_${this.lang}`);
        step1?.on("complete", () => {
            const timer = this.time.delayedCall(1000, () => {
                this.playComposeStep2();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playComposeStep2() {
        if (this.isSkipped) return;

        this.queueAnnouncement(i18n.t("info.compose_step2"));

        const step2 = this.audioManager.playSoundEffect(`compose_step_2_${this.lang}`);
        step2?.on("complete", () => {
            const timer = this.time.delayedCall(1000, () => {
                this.playComposeStep3();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playComposeStep3() {
        if (this.isSkipped) return;

        this.queueAnnouncement(i18n.t("info.compose_step3"));

        // Find the first plate to drag (larger number)
        const firstPlate = this.findCorrectPlate(10);
        if (firstPlate) {
            this.createHandDragAnimation(firstPlate);
        }

        const step3 = this.audioManager.playSoundEffect(`compose_step_3_${this.lang}`);
        step3?.on("complete", () => {
            // Restrict overlays to only the correct plate
            this.composeDecomposeMechanic.setPlateOverlaysEnabled(firstPlate ? [firstPlate] : []);

            // Disable drag in all other plates
            this.composeDecomposeMechanic.optionContainers.forEach(container => {
                if (container !== firstPlate) {
                    container.disableInteractive(true);
                }
            });

            // Enable drag for this specific plate
            this.composeDecomposeMechanic.setupDragAndDropEvents();

            // Listen for first plate dropped
            this.events.removeAllListeners("platedrop");
            this.events.once("platedrop", () => {
                // Clear timers
                this.destroyTimers();

                // Delay play step 4
                const timer = this.time.delayedCall(1000, () => {
                    this.playComposeStep4();
                });
                this.delayedCalls.push(timer);
            });

            const timer = this.time.delayedCall(5000, () => {
                this.playComposeStep3();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playComposeStep4() {
        if (this.isSkipped) return;

        this.queueAnnouncement(i18n.t("info.compose_step4"));

        this.destroyTimers();

        // Find the second plate to drag (smaller number)
        const secondPlate = this.findCorrectPlate(1);
        if (secondPlate) {
            this.createHandDragAnimation(secondPlate);
        }

        const step4 = this.audioManager.playSoundEffect(`compose_step_4_${this.lang}`);
        step4?.on("complete", () => {
            // Restrict overlays to only the correct plate
            this.composeDecomposeMechanic.setPlateOverlaysEnabled(secondPlate ? [secondPlate] : []);

            // Disable drag in all other plates
            this.composeDecomposeMechanic.optionContainers.forEach(container => {
                if (container !== secondPlate) {
                    container.disableInteractive(true);
                } else {
                    container.setInteractive(
                        {
                            hitArea: new Phaser.Geom.Rectangle(-container.displayWidth / 2, -container.displayHeight / 2, container.displayWidth, container.displayHeight),
                            hitAreaCallback: Phaser.Geom.Rectangle.Contains,
                            useHandCursor: true,
                            draggable: true,
                        }
                    );
                }
            });

            // Listen for second plate dropped
            this.events.removeAllListeners("platedrop");
            this.events.once("platedrop", () => {
                // Clear timers
                this.destroyTimers();

                // Delay play step 5
                const timer = this.time.delayedCall(1000, () => {
                    this.playComposeStep5();
                });
                this.delayedCalls.push(timer);
            });

            const timer = this.time.delayedCall(5000, () => {
                this.playComposeStep4();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playComposeStep5() {
        if (this.isSkipped) return;

        this.queueAnnouncement(i18n.t("info.compose_step5"));

        this.destroyTimers();

        // Create hand animation on feed button
        const feedButton = this.children.getByName("checkButton") as Phaser.GameObjects.Container;
        if (feedButton) {
            this.createHandClickAnimation(feedButton);
        }

        const step5 = this.audioManager.playSoundEffect(`compose_step_5_${this.lang}`);
        step5?.on("complete", () => {
            // Listen for check answer
            this.events.removeAllListeners("checkanswer");
            this.events.once("checkanswer", () => {
                // Destroy timers
                this.destroyTimers();

                // Delay play step 6
                const timer = this.time.delayedCall(1000, () => {
                    this.playComposeStep6();
                });
                this.delayedCalls.push(timer);
            });

            const timer = this.time.delayedCall(5000, () => {
                this.playComposeStep5();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playComposeStep6() {
        if (this.isSkipped) return;

        this.queueAnnouncement(i18n.t("info.compose_step6"));

        this.destroyTimers();

        // Clear all plates
        this.composeDecomposeMechanic.optionContainers.forEach(container => {
            container.setVisible(false);
        });

        // Cleare Reset and Submit buttons
        const resetButton = this.children.getByName("resetButton") as Phaser.GameObjects.Container;
        const submitButton = this.children.getByName("checkButton") as Phaser.GameObjects.Container;
        resetButton.setVisible(false);
        submitButton.setVisible(false);
        resetButton.destroy();
        submitButton.destroy();

        // Show equation
        this.composeDecomposeMechanic.showEquation();

        // Animate equation container
        const equationContainer = this.children.getByName("equationContainer") as Phaser.GameObjects.Container;
        this.tweens.add({
            targets: equationContainer,
            scale: 1.1,
            duration: 500,
            yoyo: true,
            repeat: 1,
        });

        // Start eating
        const itemName = this.composeDecomposeMechanic.currentQuestion?.operand1;
        this.composeDecomposeMechanic.startEating(itemName || "mooncake");

        const step6 = this.audioManager.playSoundEffect(`compose_step_6_${this.lang}`);
        step6?.on("complete", () => {
            this.time.delayedCall(1000, () => {
                // Play ready to play audio
                if (!this.resetData.fromGameScene) {
                    this.audioManager.playSoundEffect(`ready_to_play_${this.lang}`);
                }
                this.createPlayButton();
            });
        });
    }

    // Helper Methods
    private findCorrectPlateForDecompose(): Phaser.GameObjects.Container | null {
        // Find the plate that when combined with the fixed plate makes the correct answer
        const correctAnswer = parseInt(this.composeDecomposeMechanic.currentQuestion?.answer || "0");
        const fixedPlateValue = parseInt(this.composeDecomposeMechanic.currentQuestion?.selectedOption || "0");
        const targetValue = correctAnswer - fixedPlateValue;

        return this.composeDecomposeMechanic.optionContainers.find(container =>
            container.getData("itemCount") === targetValue
        ) || null;
    }

    private findCorrectPlate(value: number): Phaser.GameObjects.Container | null {
        // Find the plate with the larger value for the first drag
        for (const container of this.composeDecomposeMechanic.optionContainers) {
            if (container.getData("itemCount") === value) {
                return container;
            }
        }
        return null;
    }

    private createHandDragAnimation(targetPlate: Phaser.GameObjects.Container) {
        const startX = targetPlate.x / this.display.scale;
        const startY = targetPlate.y / this.display.scale;

        // Get the drop zone container and its center bounds
        const dropZone = this.children.getByName('dropZone') as Phaser.GameObjects.Container;
        const dropZoneBounds = dropZone.getBounds();
        const endX = dropZoneBounds.centerX;
        const endY = dropZoneBounds.centerY;

        // clear previous tween
        if (this.handTween) {
            this.handTween.destroy();
        }

        this.hand?.destroy();
        this.hand = this.addImage(startX + 50, startY - 20, 'hand');
        this.hand.setOrigin(0.5);
        this.hand.setDepth(10);
        this.hand.setScale(0.13);


        this.handTween = this.tweens.chain({
            targets: this.hand,
            tweens: [
                {
                    x: this.getScaledValue(startX + 15),
                    y: this.getScaledValue(startY + 10),
                    duration: 500,
                    ease: "Sine.easeInOut",
                    onComplete: () => {
                        this.hand.setTexture("hand_click");
                    }
                },
                {
                    x: endX,
                    y: endY,
                    duration: 1000,
                    ease: "Sine.easeInOut",
                },
                {
                    alpha: 1,
                    duration: 300,
                    onComplete: () => {
                        this.hand.setTexture("hand");
                    }
                },
                {
                    alpha: 1,
                    duration: 500,
                    onComplete: () => {
                        this.hand?.destroy();
                    }
                }
            ]
        });
    }

    private createHandClickAnimation(target: Phaser.GameObjects.Container) {
        const handX = target.x / this.display.scale;
        const handY = target.y / this.display.scale;

        // clear previous tween
        if (this.handTween) {
            this.handTween.destroy();
        }

        this.hand?.destroy();
        this.hand = this.addImage(handX + 50, handY - 20, 'hand');
        this.hand.setOrigin(0.5);
        this.hand.setDepth(10);
        this.hand.setScale(0.13);


        this.handTween = this.tweens.chain({
            targets: this.hand,
            tweens: [
                {
                    x: this.getScaledValue(handX + 15),
                    y: this.getScaledValue(handY + 10),
                    duration: 1000,
                    ease: "Sine.easeInOut",
                    onComplete: () => {
                        this.hand.setTexture("hand_click");
                    }
                },
                {
                    alpha: 1,
                    duration: 500,
                    onComplete: () => {
                        this.hand.setTexture("hand");
                    }
                },
                {
                    alpha: 1,
                    duration: 500,
                    onComplete: () => {
                        this.hand?.destroy();
                    }
                }
            ]
        });
    }

    private createPlayButton(): void {
        if (this.playButton) {
            this.playButton.destroy();
        }

        const playLabel = this.resetData.fromGameScene ? i18n.t("common.back") : i18n.t("common.play");

        this.playButton = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY,
            },
            text: playLabel,
            label: playLabel,
            textStyle: {
                font: "700 32px Exo",
                color: "#ffffff",
            },
            imageScale: 0.8,
            raisedOffset: 3.5,
            x: this.display.width / 2,
            y: this.display.height - 200,
            onClick: () => {
                this.destroyTimers();
                this.audioManager.stopAllSoundEffects();
                if (this.resetData.fromGameScene) {
                    this.audioManager.playBackgroundMusic("bg-music");
                    this.scene.stop("ComposeDecomposeTutorial");
                    this.scene.resume("GameScene");
                } else {
                    this.composeDecomposeMechanic.closeDoors();
                    this.time.delayedCall(1000, () => {
                        this.scene.start("GameScene");
                    });
                }
            },
        });
        this.playButton.setDepth(20);

        ButtonHelper.startBreathingAnimation(this.playButton, {
            scale: 1.1,
            duration: 1000,
            ease: "Sine.easeInOut",
        });
    }

    private destroyTimers() {
        this.delayedCalls.forEach(timer => timer.destroy());
        this.delayedCalls = [];
    }

    private queueAnnouncement(message: string) {
        this.announcementQueue.push(message);
        this.processAnnouncementQueue();
    }
    
    private processAnnouncementQueue() {
        if (this.isAnnouncing || this.announcementQueue.length === 0) {
            return;
        }
    
        this.isAnnouncing = true;
        const message = this.announcementQueue.shift()!;
    
        announceToScreenReader(message);
    
        const words = message.split(' ').length;
        const estimatedDuration = (words / 2.5) * 1000;
        const delay = Math.max(estimatedDuration + 500, 2000);
    
        this.time.delayedCall(delay, () => {
            this.isAnnouncing = false;
            this.processAnnouncementQueue();
        });
    }

    shutdown() {
        this.audioManager.stopAll();
        this.destroyTimers();
        if (this.hand) {
            this.hand.destroy();
        }
        if (this.handTween) {
            this.handTween.destroy();
        }
    }

    override update(): void {
        // Update mute button icon
        const muteBtnItem = this.muteBtn.getAt(1) as Phaser.GameObjects.Sprite;
        if (muteBtnItem) {
            if (this.audioManager.getIsAllMuted()) {
                muteBtnItem.setTexture(BUTTONS.MUTE_ICON.KEY);
            } else {
                muteBtnItem.setTexture(BUTTONS.UNMUTE_ICON.KEY);
            }
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
