import { BaseScene, ButtonHelper, ButtonOverlay, i18n, TextOverlay, focusToGameContainer, announceToScreenReader, VolumeSlider } from "@k8-games/sdk";
import { ASSETS_PATHS, BUTTONS } from "../config/common";
import { SliceItems } from "../mechanics/SliceItems";

export class SliceItemsTutorial extends BaseScene {
    private sliceMechanic!: SliceItems;
    private resetData: { reset?: boolean; fromGameScene?: boolean; showPlayButton?: boolean } = {};
    private skipBtn!: Phaser.GameObjects.Container;
    private muteBtn!: Phaser.GameObjects.Container;
    private volumeSlider!: VolumeSlider;
    private isSkipped: boolean = false;
    private lang: string;
    private delayedCalls: Phaser.Time.TimerEvent[] = [];
    
    // Announcement queue system
    private announcementQueue: string[] = [];
    private isAnnouncing: boolean = false;

    // mechanic buttons
    private increaseBtn!: Phaser.GameObjects.Container;
    private decreaseBtn!: Phaser.GameObjects.Container;
    private checkBtn!: Phaser.GameObjects.Container;

    constructor() {
        super("SliceItemsTutorial");
        this.sliceMechanic = new SliceItems(this);
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
        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/info_screen/slice_items`);
        scene.load.audio(`step_1_${lang}`, `step_1_${lang}.mp3`);
        scene.load.audio(`step_2_${lang}`, `step_2_${lang}.mp3`);
        scene.load.audio(`step_3_${lang}`, `step_3_${lang}.mp3`);
        scene.load.audio(`step_4_${lang}`, `step_4_${lang}.mp3`);
        scene.load.audio(`step_5_${lang}`, `step_5_${lang}.mp3`);

        // Preload volume slider assets
        VolumeSlider.preload(scene, "blue");

        SliceItems._preload(scene);
    }

    init(data?: { reset?: boolean; fromGameScene?: boolean, showPlayButton?: boolean }) {
        // Initialize AudioManager
        this.audioManager.initialize(this);

        // Store reset data
        if (data) {
            this.resetData = data;
        }

        this.isSkipped = false;

        SliceItems.init(this);
    }

    create() {
        // Add how to play text second for focus order
        const howToPlayText = this.addText(this.display.width / 2, 61, i18n.t("info.howToPlay"), {
            font: "700 30px Exo",
            color: "#ffffff",
        }).setOrigin(0.5).setDepth(2);
        new TextOverlay(this, howToPlayText, {
            label: i18n.t("info.howToPlay"),
            tag: 'h1',
            role: 'heading'
        });

        
        // Create skip button first for focus order
        this.createSkipButton();
        // Create mute button
        this.createMuteButton();
        
        // Create mechanic after UI elements for proper focus order
        this.sliceMechanic.create(
            "tutorial",
            this.resetData.reset,
            this.resetData.fromGameScene ? "GameScene" : "SplashScene"
        );
        
        if (this.resetData.fromGameScene) {
            focusToGameContainer();
            this.time.delayedCall(1000, () => {
                this.queueAnnouncement(i18n.t('info.helpPage'));
            });
        }

        // Disable slicer buttons
        this.increaseBtn = this.sliceMechanic.slicer.getByName("increaseBtn") as Phaser.GameObjects.Container;
        this.decreaseBtn = this.sliceMechanic.slicer.getByName("decreaseBtn") as Phaser.GameObjects.Container;
        this.checkBtn = this.sliceMechanic.controls.getByName("checkBtn") as Phaser.GameObjects.Container;
        if (this.increaseBtn) {
            ButtonHelper.disableButton(this.increaseBtn);
        }
        if (this.decreaseBtn) {
            ButtonHelper.disableButton(this.decreaseBtn);
        }

        this.time.delayedCall(1000, () => {
            this.playStep1();
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

                    this.scene.stop("SliceItemsTutorial");
                    this.scene.resume("GameScene");
                } else {
                    this.audioManager.stopAll();
                    this.sliceMechanic.closeDoors();
                    this.time.delayedCall(1000, () => {
                        this.scene.stop("SliceItemsTutorial");
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
            y: 184,
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
            280,
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
            y: 274,
            raisedOffset: 3.5,
            onClick: () => {
                this.volumeSlider.toggleControl();
            },
        });
        volumeBtn.setDepth(1);
    }

    private createPlayButton(): void {
        const playLabel = this.resetData.fromGameScene ? i18n.t("common.back") : i18n.t("common.play");

        const playButton = ButtonHelper.createButton({
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
            y: this.display.height - 100,
            onClick: () => {
                // clear all sound effects
                this.audioManager.stopAllSoundEffects();
                if (this.resetData.fromGameScene) {
                    // start playing bg-music
                    this.audioManager.playBackgroundMusic("bg-music");

                    this.scene.stop("SliceItemsTutorial");
                    this.scene.resume("GameScene");
                } else {
                    this.sliceMechanic.closeDoors();
                    this.time.delayedCall(1000, () => {
                        this.scene.start("GameScene");
                    });
                }
            },
        });
        playButton.setDepth(20);

        ButtonHelper.startBreathingAnimation(playButton, {
            scale: 1.1,
            duration: 1000,
            ease: "Sine.easeInOut",
        });
    }

    private createHandClickAnimation(target: Phaser.GameObjects.Container) {
        // Create hand image for single click animation\
        const handX = target.x / this.display.scale + this.getScaledValue(50);
        const handY = target.y / this.display.scale - this.getScaledValue(20);
        const hand = this.addImage(handX, handY, 'hand');
        hand.setOrigin(0.5);
        hand.setDepth(10);
        hand.setScale(0.13);

        // Add single click animation using both textures
        this.tweens.chain({
            targets: hand,
            tweens: [
                {
                    x: target.x + this.getScaledValue(15),
                    y: target.y + this.getScaledValue(10),
                    duration: 1000,
                    ease: "Sine.easeInOut",
                    onComplete: () => {
                        hand.setTexture("hand_click");
                    }
                },
                {
                    alpha: 1,
                    duration: 500,
                    onComplete: () => {
                        hand.setTexture("hand");
                    }
                },
                {
                    alpha: 1,
                    duration: 500,
                    onComplete: () => {
                        hand.destroy();
                    }
                },
            ],
        });
    }

    private playStep1() {
        if (this.isSkipped) {
            return;
        }
        
        // Queue announcement for screen readers
        const step1Text = i18n.t("info.slice_step1");
        if (step1Text && step1Text !== "info.slice_step1") {
            this.queueAnnouncement(step1Text);
        }
        
        const step1 = this.audioManager.playSoundEffect(`step_1_${this.lang}`);
        step1?.on("complete", () => {
            const timer = this.time.delayedCall(1000, () => {
                this.playStep2();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playStep2() {
        if (this.isSkipped) {
            return;
        }
        
        // Queue announcement for screen readers
        const step2Text = i18n.t("info.slice_step2");
        if (step2Text && step2Text !== "info.slice_step2") {
            this.queueAnnouncement(step2Text);
        }
        
        const step2 = this.audioManager.playSoundEffect(`step_2_${this.lang}`);
        
        // Create hand click animation
        this.createHandClickAnimation(this.increaseBtn);
        
        step2?.on("complete", () => {
            // Enable slicer buttons
            if (this.increaseBtn) {
                ButtonHelper.enableButton(this.increaseBtn);
            }
            if (this.decreaseBtn) {
                ButtonHelper.enableButton(this.decreaseBtn);
            }

            // Listen for slicer display text updated event
            this.events.removeAllListeners("slicerdisplaytextupdated");
            this.events.once("slicerdisplaytextupdated", (data: { text: string }) => {
                if (data.text === "2") {

                    // Disable slicer buttons
                    if (this.increaseBtn) {
                        ButtonHelper.disableButton(this.increaseBtn);
                    }
                    if (this.decreaseBtn) {
                        ButtonHelper.disableButton(this.decreaseBtn);
                    }

                    // Destroy all timers
                    this.destroyTimers();

                    const timer = this.time.delayedCall(1000, () => {
                        // Clear all sound effects
                        this.audioManager.stopAllSoundEffects();

                        this.playStep3();
                    });
                    this.delayedCalls.push(timer);
                }
            });

            const timer = this.time.delayedCall(3000, () => {
                this.playStep2();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playStep3() {
        if (this.isSkipped) {
            return;
        }
        
        // Queue announcement for screen readers
        const step3Text = i18n.t("info.slice_step3");
        if (step3Text && step3Text !== "info.slice_step3") {
            this.queueAnnouncement(step3Text);
        }
        
        const step3 = this.audioManager.playSoundEffect(`step_3_${this.lang}`);
        
        // Create hand click and drag animation
        const firstItem = this.sliceMechanic.items[0];
        let firstPlate!: Phaser.GameObjects.Image;
        for (let i = 0; i < this.sliceMechanic.plates.length; i++) {
            if (!this.sliceMechanic.itemsInPlates.get(i)) {
                firstPlate = this.sliceMechanic.plates[i];
                break;
            }
        }
        const handStartX = firstItem.x / this.display.scale + 15;
        const handStartY = firstItem.y / this.display.scale + 10;
        const handEndX = firstPlate.x + this.getScaledValue(15);
        const handEndY = firstPlate.y + this.getScaledValue(10);
        const hand = this.addImage(handStartX, handStartY, 'hand');
        hand.setOrigin(0.5);
        hand.setDepth(10);
        hand.setScale(0.13);
    
        this.tweens.chain({
            targets: hand,
            tweens: [
                {
                    alpha: 1,
                    duration: 500,
                    ease: "Sine.easeInOut",
                    onComplete: () => {
                        hand.setTexture("hand_click");
                    }
                },
                {
                    x: handEndX,
                    y: handEndY,
                    duration: 1000,
                    ease: "Sine.easeInOut",
                },
                {
                    alpha: 1,
                    duration: 500,
                    ease: "Sine.easeInOut",
                    onComplete: () => {
                        hand.setTexture("hand");
                    }
                },
                {
                    alpha: 1,
                    duration: 500,
                    ease: "Sine.easeInOut",
                    onComplete: () => {
                        hand.destroy();
                    }
                }
            ]
        });

        step3?.on("complete", () => {
            // Enable drag for all items
            this.sliceMechanic.setupItemDragEvents();

            // Listen for item dropped event
            this.events.removeAllListeners("itemdropped");
            this.events.on("itemdropped", () => {
                // Each plate should have 1 item
                let isCorrect = true;
                for (let i = 0; i < this.sliceMechanic.plates.length; i++) {
                    if (this.sliceMechanic.itemsInPlates.get(i)?.length !== 1) {
                        isCorrect = false;
                        break;
                    }
                }

                if (isCorrect) {

                    // Destroy all timers
                    this.destroyTimers();

                    const timer = this.time.delayedCall(1000, () => {
                        // Clear all sound effects
                        this.audioManager.stopAllSoundEffects();

                        this.playStep4();
                    });
                    this.delayedCalls.push(timer);
                }
            });


            const timer = this.time.delayedCall(5000, () => {
                this.playStep3();
            });
            this.delayedCalls.push(timer);

            // this.playStep4();
        });
    }

    private playStep4() {
        if (this.isSkipped) {
            return;
        }
        
        // Queue announcement for screen readers
        const step4Text = i18n.t("info.slice_step4");
        if (step4Text && step4Text !== "info.slice_step4") {
            this.queueAnnouncement(step4Text);
        }
        
        const step4 = this.audioManager.playSoundEffect(`step_4_${this.lang}`);

        // Hand click animation on check button
        this.createHandClickAnimation(this.checkBtn);

        step4?.on("complete", () => {

            // Listen for check answer event
            this.events.removeAllListeners("checkanswer");
            this.events.on("checkanswer", (data: { isCorrect: boolean }) => {
                if (data.isCorrect) {
                    // Destroy all timers
                    this.destroyTimers();

                    const timer = this.time.delayedCall(1000, () => {
                        // Clear all sound effects
                        this.audioManager.stopAllSoundEffects();

                        this.playStep5();
                    });
                    this.delayedCalls.push(timer);
                }
            });

            const timer = this.time.delayedCall(5000, () => {
                this.playStep4();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playStep5() {
        if (this.isSkipped) {
            return;
        }
        
        // Queue announcement for screen readers
        if (!this.resetData.fromGameScene) {
            const step5Text = i18n.t("info.slice_step5");
            if (step5Text && step5Text !== "info.slice_step5") {
                this.queueAnnouncement(step5Text);
            }
            this.audioManager.playSoundEffect(`step_5_${this.lang}`);
        }

        // Destroy slicer, itemcontainer and controls
        this.sliceMechanic.slicer.destroy();
        this.sliceMechanic.itemContainer.destroy();
        this.sliceMechanic.controls.destroy();

        this.time.delayedCall(1000, () => {
            this.createPlayButton();
        });
    }

    private destroyTimers() {
        this.delayedCalls.forEach(timer => timer.destroy());
        this.delayedCalls = [];
    }

    shutdown() {
        this.audioManager.stopAll();
        this.destroyTimers();
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

        // Estimate the duration of the announcement and wait before processing next
        const words = message.split(' ').length;
        const estimatedDuration = (words / 2.5) * 1000; // 2.5 words per second
        const delay = Math.max(estimatedDuration + 500, 2000); // Minimum 2 seconds

        this.time.delayedCall(delay, () => {
            this.isAnnouncing = false;
            this.processAnnouncementQueue();
        });
    }
}
