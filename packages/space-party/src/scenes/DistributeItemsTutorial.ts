import { announceToScreenReader, BaseScene, ButtonHelper, ButtonOverlay, i18n, TextOverlay, VolumeSlider } from "@k8-games/sdk";
import { ASSETS_PATHS, BUTTONS } from "../config/common";
import { DistributeItems } from "../mechanics/DistributeItems";

export class DistributeItemsTutorial extends BaseScene {
    private distributeMechanic!: DistributeItems;
    private resetData: { reset?: boolean; fromGameScene?: boolean; showPlayButton?: boolean } = {};
    private instructionText!: Phaser.GameObjects.Text;
    private instructionTextTween!: Phaser.Tweens.Tween;
    private instructionTextOverlay!: TextOverlay;
    private hand!: Phaser.GameObjects.Image;
    private handTween!: Phaser.Tweens.Tween;
    private submitBtn!: Phaser.GameObjects.Container | null;
    private resetBtn!: Phaser.GameObjects.Container | null;
    private playButton!: Phaser.GameObjects.Container;
    private volumeSlider!: VolumeSlider;
    private skipBtn!: Phaser.GameObjects.Container;
    private muteBtn!: Phaser.GameObjects.Container;
    private isSkipped: boolean = false;
    private lang: string;
    private index = 0;

    private isCheckButtonClicked: boolean = false;

    // Announcement queue system
    private announcementQueue: string[] = [];
    private isAnnouncing: boolean = false;

    constructor() {
        super("DistributeItemsTutorial");
        this.distributeMechanic = new DistributeItems(this);
        this.lang = i18n.getLanguage() || "en";
    }

    static _preload(scene: BaseScene) {
        const lang = i18n.getLanguage() || "en";

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/info_screen`);
        scene.load.image("hand", "hand.png");
        scene.load.image("hand_click", "hand_click.png");

        // load audio
        scene.load.setPath(
            `${ASSETS_PATHS.AUDIOS}/info_screen/distribute_items`
        );
        scene.load.audio(`step1_${lang}`, `step1_${lang}.mp3`);
        scene.load.audio(`step2_${lang}`, `step2_${lang}.mp3`);
        scene.load.audio(`step3_${lang}`, `step3_${lang}.mp3`);
        scene.load.audio(`step4_${lang}`, `step4_${lang}.mp3`);
        
        // Preload volume slider assets
        VolumeSlider.preload(scene, "blue");
        
        DistributeItems._preload(scene);
    }

    init(data?: { reset?: boolean; fromGameScene?: boolean, showPlayButton?: boolean }) {
        // Initialize AudioManager
        this.audioManager.initialize(this);

        // Store reset data
        if (data) {
            this.resetData = data;
        }

        this.isCheckButtonClicked = false;
        this.isSkipped = false;
        this.distroyTweens();

        DistributeItems.init(this);
        this.announcementQueue = [];
        this.isAnnouncing = false;
    }

    create() {
        this.addImage(
            this.display.width / 2,
            this.display.height / 2,
            "game_bg"
        ).setOrigin(0.5);
        this.instructionText = this.addText(this.display.width / 2, 715, "", {
            font: "400 30px Exo",
            color: "#FFFFFF",
        })
            .setOrigin(0.5)
            .setDepth(10);

        // Add how to play text
        const howToPlayText = this.addText(
                this.display.width / 2,
                61,
                i18n.t("info.howToPlay"),
                {
                    font: "700 30px Exo",
                    color: "#ffffff",
                }
            )
            .setOrigin(0.5).setDepth(10);

        new TextOverlay(this, howToPlayText, {
            label: i18n.t("info.howToPlay"),
            tag: 'h1',
            role: 'heading'
        });

        this.createSkipButton();
        this.createMuteButton();

        this.distributeMechanic.create(
            "tutorial",
            this.resetData.reset,
            this.resetData.fromGameScene ? "GameScene" : "SplashScene"
        );

        this.time.delayedCall(3000, () => {
            this.queueAnnouncement(`${this.distributeMechanic.currentQuestion[`question_${this.lang}`]} ${this.distributeMechanic.currentQuestion.equation} = ?`);
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

                    this.scene.stop("DistributeItemsTutorial");
                    this.scene.resume("GameScene");
                } else {
                    this.audioManager.stopAll();
                    this.distributeMechanic.closeDoors();
                    this.time.delayedCall(1000, () => {
                        this.scene.stop("DistributeItemsTutorial");
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

    private createSubmitButton() {
        this.submitBtn = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: "btn_purple",
                hover: "btn_purple_hover",
                pressed: "btn_purple_pressed",
            },
            text: i18n.t("game.check"),
            label: i18n.t("game.check"),
            textStyle: {
                font: "700 36px Exo",
                color: "#FFFFFF",
            },
            x: this.display.width / 2 + 120,
            y: 715,
            onClick: () => {
                this.isCheckButtonClicked = true;
                // destroy buttons
                this.submitBtn?.destroy();
                this.resetBtn?.destroy();
                this.time.delayedCall(500, () => {
                    this.playStep4();
                });
            },
        });
    }

    private createResetButton() {
        this.resetBtn = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: "btn_alter",
                hover: "btn_alter_hover",
                pressed: "btn_alter_pressed",
                disabled: "btn_alter_inactive",
            },
            text: i18n.t("game.reset"),
            label: i18n.t("game.reset"),
            textStyle: {
                font: "700 36px Exo",
                color: "#FFFFFF",
            },
            x: this.display.width / 2 - 120,
            y: 715,
            isDisabled: true,
        });
    }

    private createPlayButton(): void {
        if (this.playButton) {
            this.playButton.destroy();
        }

        const showPlayButton = this.resetData.showPlayButton;
        const playLabel = showPlayButton ? i18n.t("common.play") : i18n.t("common.back");

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
            y: this.display.height - 50,
            onClick: () => {
                this.distroyTweens();
                // clear all sound effects
                this.audioManager.stopAllSoundEffects();
                if (this.resetData.fromGameScene) {
                    // start playing bg-music
                    this.audioManager.playBackgroundMusic("bg-music");

                    this.scene.stop("DistributeItemsTutorial");
                    this.scene.resume("GameScene");
                } else {
                    this.distributeMechanic.closeDoors();
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

    private setTextWithFade(text: string, duration: number = 500) {
        // Fade out current text
        this.instructionTextTween = this.tweens.add({
            targets: this.instructionText,
            alpha: 0,
            duration: duration / 2,
            ease: "Sine.easeInOut",
            onComplete: () => {
                // Set new text
                this.instructionText.setText(text);
                // Fade in new text
                this.instructionTextTween = this.tweens.add({
                    targets: this.instructionText,
                    alpha: 1,
                    duration: duration / 2,
                    ease: "Sine.easeInOut",
                });
            },
        });
        if (this.instructionTextOverlay) {
            this.instructionTextOverlay.destroy();
        }
        this.instructionTextOverlay = new TextOverlay(this, this.instructionText, {
            label: text,
        });
    }

    private playStep1(isRepeat: boolean = false) {
        if (this.isSkipped) {
            return;
        }
        const text = i18n.t("info.step1");
        if (this.instructionText.text !== text) {
            this.setTextWithFade(text);
        }
        // get first item from the distributeMechanic
        const items = this.distributeMechanic.items;
        const firstItemX = items[0].getData("originalX");
        const firstItemY = items[0].getData("originalY");
        const secondItemX = items[1].getData("originalX");
        const secondItemY = items[1].getData("originalY");

        // create a hand image
        this.hand?.destroy();
        this.hand = this.addImage(firstItemX, firstItemY, "hand");
        this.hand.x += this.getScaledValue(100);
        this.hand.y += this.getScaledValue(70);
        this.hand.setOrigin(0.5);
        this.hand.setDepth(10);
        this.hand.setScale(0.13);

        // Add single click animation using both textures
        this.handTween = this.tweens.add({
            targets: this.hand,
            x: this.getScaledValue(firstItemX + 15),
            y: this.getScaledValue(firstItemY + 10),
            duration: 1000,
            ease: "Sine.easeInOut",
            onComplete: () => {
                this.hand.setTexture("hand_click");
                this.time.delayedCall(500, () => {
                    this.hand.setTexture("hand");
                    this.handTween = this.tweens.add({
                        targets: this.hand,
                        x: this.getScaledValue(secondItemX + 15),
                        y: this.getScaledValue(secondItemY + 10),
                        duration: 1000,
                        ease: "Sine.easeInOut",
                        onComplete: () => {
                            this.hand.setTexture("hand_click");
                            // setup item selection events
                            this.distributeMechanic.setupItemSelectionEvents();
                            this.time.delayedCall(500, () => {
                                this.hand.destroy();
                                this.handTween.destroy();
                            });
                        },
                    });
                });
            },
        });

        if (!isRepeat) {
            this.queueAnnouncement(i18n.t("info.step1"));
        }

        const step1 = this.audioManager.playSoundEffect(`step1_${this.lang}`);
        step1?.on("complete", () => {
            this.time.delayedCall(5000, () => {
                // check if item is selected by the player
                const selectedItems = this.distributeMechanic.selectedItems;
                if (selectedItems.length === 2) {
                    // disable item selection
                    this.distributeMechanic.clearItemSelectionEvents();
                    this.playStep2(this.index);
                } else {
                    this.playStep1(true);
                }
            });
        });
    }

    private playStep2(index: number = 0, isRepeat: boolean = false) {
        if (this.isSkipped) {
            return;
        }
        const text = i18n.t("info.step2");
        if (this.instructionText.text !== text) {
            this.setTextWithFade(text);
        }
        // show hand move animation from selected to plate
        const selectedItems = this.distributeMechanic.selectedItems;
        const firstItemX = selectedItems[0].getData("originalX");
        const firstItemY = selectedItems[0].getData("originalY");
        this.hand = this.addImage(firstItemX + 15, firstItemY + 10, "hand");
        this.hand.setOrigin(0.5);
        this.hand.setDepth(10);
        this.hand.setScale(0.13);

        // get first item in plates
        const plates = this.distributeMechanic.plates;
        const firstPlate = plates[index];
        const firstPlateX = firstPlate.getData("plateX");
        const firstPlateY = firstPlate.getData("plateY");
        firstPlate.setData("isDropAllowed", true);

        // add hand move animation from selected to plate
        // Start with normal hand, then click on item
        this.hand.setTexture("hand");
        this.time.delayedCall(500, () => {
            this.hand.setTexture("hand_click");

            // Then move to target plate while maintaining click state
            this.handTween = this.tweens.add({
                targets: this.hand,
                x: this.getScaledValue(firstPlateX),
                y: this.getScaledValue(firstPlateY),
                duration: 1000,
                ease: "Sine.easeInOut",
                onComplete: () => {
                    // Return to normal hand state at target
                    this.hand.setTexture("hand");
                    // setup item drag events
                    this.distributeMechanic.setupItemDragEvents();
                    this.time.delayedCall(500, () => {
                        this.hand.destroy();
                        this.handTween.destroy();
                    });
                },
            });
        });

        if (!isRepeat) {
            this.queueAnnouncement(i18n.t("info.step2"));
        }

        const step2 = this.audioManager.playSoundEffect(`step2_${this.lang}`);
        step2?.on("complete", () => {
            this.time.delayedCall(5000, () => {
                // onComplete
                // check if item is dropped on the plate
                const itemsInPlates = this.distributeMechanic.itemsInPlates;
                // get middle plate items
                const firstPlateItems = itemsInPlates.get(index);
                if (firstPlateItems && firstPlateItems.length === 2) {
                    // disable plate selection
                    this.distributeMechanic.clearItemDragEvents();

                    if(this.index === 0) {
                        this.index += 1;
                        this.playStep1();
                    } else {
                        this.playStep3();
                    }
                } else {
                    this.playStep2(this.index, true);
                }
            });
        });
    }

    private playStep3() {
        if (this.isSkipped) {
            return;
        }
        this.setTextWithFade("");
        if (!this.resetBtn) {
            this.time.delayedCall(200, () => {
                this.createResetButton();
                this.resetBtn?.setDepth(4);
            });
        }
        if (!this.submitBtn) {
            this.time.delayedCall(200, () => {
                this.createSubmitButton();
                this.submitBtn?.setDepth(4);
            });
        }

        this.time.delayedCall(200, () => {
            this.hand = this.addImage(
                this.display.width / 2 + 300,
                715,
                "hand"
            );
            this.hand.setOrigin(0.5);
            this.hand.setDepth(10);
            this.hand.setScale(0.13);

            this.handTween = this.tweens.add({
                targets: this.hand,
                x: this.getScaledValue(this.display.width / 2 + 150),
                y: this.getScaledValue(715),
                duration: 1000,
                ease: "Sine.easeInOut",
                onComplete: () => {
                    this.hand.setTexture("hand_click");
                    this.time.delayedCall(500, () => {
                        this.hand.setTexture("hand");
                        this.time.delayedCall(500, () => {
                            this.hand.destroy();
                            this.handTween.destroy();
                        });
                    });
                },
            });
        });

        const step3 = this.audioManager.playSoundEffect(`step3_${this.lang}`);
        step3?.on("complete", () => {
            this.time.delayedCall(5000, () => {
                if (!this.isCheckButtonClicked) {
                    this.playStep3();
                }
            });
        });
    }
    private playStep4() {
        if (this.isSkipped) {
            return;
        }
        this.setTextWithFade("");
        this.time.delayedCall(500, () => {
            this.createPlayButton();
        });
        if (!this.resetData.fromGameScene) {
            this.audioManager.playSoundEffect(
                `step4_${this.lang}`
            );
        }
        this.index = 0;
    }

    distroyTweens() {
        if (this.instructionTextTween) {
            this.instructionTextTween.stop();
            this.instructionTextTween.destroy();
        }
        if (this.handTween) {
            this.handTween.stop();
            this.handTween.destroy();
        }

        // reset all game objects to their initial state
        if (this.instructionText) {
            this.instructionText.destroy();
        }
        if (this.instructionTextOverlay) {
            this.instructionTextOverlay.destroy();
        }
        if (this.hand) {
            this.hand.destroy();
        }
        if (this.muteBtn) {
            this.muteBtn.destroy();
        }
        if (this.skipBtn) {
            this.skipBtn.destroy();
        }
        if (this.playButton) {
            this.playButton.destroy();
        }
        if (this.submitBtn) {
            this.submitBtn.destroy();
            this.submitBtn = null;
        }
        if (this.resetBtn) {
            this.resetBtn.destroy();
            this.resetBtn = null;
        }
        if (this.instructionTextOverlay) {
            this.instructionTextOverlay.destroy();
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
        this.distroyTweens();
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
