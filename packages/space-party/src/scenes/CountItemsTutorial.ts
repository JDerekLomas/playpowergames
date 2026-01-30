import { BaseScene, ButtonHelper, ButtonOverlay, i18n, TextOverlay, VolumeSlider } from "@k8-games/sdk";
import { ASSETS_PATHS, BUTTONS } from "../config/common";
import { CountItems } from "../mechanics/CountItems";

export class CountItemsTutorial extends BaseScene {
    private countMechanic!: CountItems;
    private resetData: { reset?: boolean; fromGameScene?: boolean, mechanicType?: "feed" | "count" } = {};
    private instructionText!: Phaser.GameObjects.Text;
    private instructionTextTween!: Phaser.Tweens.Tween;
    private hand!: Phaser.GameObjects.Image;
    private volumeSlider!: VolumeSlider;
    private handTween!: Phaser.Tweens.Tween;
    private playButton!: Phaser.GameObjects.Container;
    private skipBtn!: Phaser.GameObjects.Container;
    private muteBtn!: Phaser.GameObjects.Container;
    private isSkipped: boolean = false;
    private lang: string;

    constructor() {
        super("CountItemsTutorial");
        this.countMechanic = new CountItems(this);
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
        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/info_screen/count_items`);
        scene.load.audio(`feed_step1_${lang}`, `feed_step1_${lang}.mp3`);
        scene.load.audio(`count_step1_${lang}`, `count_step1_${lang}.mp3`);
        scene.load.audio(`step2_${lang}`, `step2_${lang}.mp3`);
        
        // Preload volume slider assets
        VolumeSlider.preload(scene, "blue");
        
        CountItems._preload(scene);
    }

    init(data?: { reset?: boolean; fromGameScene?: boolean, mechanicType?: "feed" | "count" }) {
        // Initialize AudioManager
        this.audioManager.initialize(this);

        // Store reset data
        if (data) {
            this.resetData = data;
        }

        this.isSkipped = false;
        this.distroyTweens();

        CountItems.init(this);
    }

    create() {
        this.addImage(
            this.display.width / 2,
            this.display.height / 2,
            "game_bg"
        ).setOrigin(0.5);

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
        new TextOverlay(this, howToPlayText, { label: i18n.t("info.howToPlay"), tag: 'h1', role: 'heading' });

        this.createSkipButton();
        this.createMuteButton();

        this.countMechanic.create("tutorial", this.resetData.reset, this.resetData.mechanicType, this.resetData.fromGameScene ? "GameScene" : "SplashScene");

        this.time.delayedCall(3000, () => {
            this.instructionText = this.addText(this.display.width / 2, 715, "", {
                font: "400 30px Exo",
                color: "#FFFFFF",
            }).setOrigin(0.5).setDepth(10);
            const overlay = new TextOverlay(this, this.instructionText, { label: '' });
            this.instructionText.setData('overlay', overlay);
            
            if (this.resetData.mechanicType === "feed") {
                this.playFeedStep1();
            } else {
                this.playCountStep1();
            }
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

                    this.scene.stop("CountItemsTutorial");
                    this.scene.resume("GameScene");
                } else {
                    this.audioManager.stopAll();
                    this.countMechanic.closeDoors();
                    this.time.delayedCall(1000, () => {
                        this.scene.stop("CountItemsTutorial");
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
            y: 168,
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
            264,
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
            y: 258,
            raisedOffset: 3.5,
            onClick: () => {
                this.volumeSlider.toggleControl();
            },
        });
        volumeBtn.setDepth(1);
    }

    private createPlayButton(): void {
        if (this.playButton) {
            this.playButton.destroy();
        }
        this.playButton = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY,
            },
            text: this.resetData.fromGameScene
                ? i18n.t("common.back")
                : i18n.t("common.play"),
            label: this.resetData.fromGameScene
                ? i18n.t("common.back")
                : i18n.t("common.play"),
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

                    this.scene.stop("CountItemsTutorial");
                    this.scene.resume("GameScene");
                } else {
                    this.countMechanic.closeDoors();
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

        // Update overlay text
        const overlay = this.instructionText.getData('overlay') as TextOverlay;
        if (overlay) {
            overlay.updateContent(text);
        }
    }

    private playFeedStep1() {
        if (this.isSkipped) {
            return;
        }
        const text = i18n.t("info.feed_step1");
        if (this.instructionText.text !== text) {
            this.setTextWithFade(text);
        }

        // get first item from the distributeMechanic
        const items = this.countMechanic.feedItems;
        const firstItemX = items[0].getData("originalX");
        const firstItemY = items[0].getData("originalY");

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
                    this.time.delayedCall(500, () => {
                        // setup item click events
                        this.countMechanic.setupFeedItemsEvents();
                        this.hand.destroy();
                        this.handTween.destroy();
                    });
                });
            },
        });

        const step1 = this.audioManager.playSoundEffect(`feed_step1_${this.lang}`);
        step1?.on("complete", () => {
            this.time.delayedCall(5000, () => {
                // check if item is selected by the player
                const feedItems = this.countMechanic.feedItems;
                if (feedItems.length === 0) {
                    // disable item selection
                    this.playStep2();
                } else {
                    this.playFeedStep1();
                }
            });
        });
    }

    private playCountStep1() {
        if (this.isSkipped) {
            return;
        }

        const numPadBtn = this.countMechanic.numPadBtns[4];
        const numPadBtnX = 530;
        const numPadBtnY = 686;
        // create a hand image
        this.hand?.destroy();
        this.hand = this.addImage(numPadBtnX, numPadBtnY, "hand");
        this.hand.x += this.getScaledValue(100);
        this.hand.y -= this.getScaledValue(70);
        this.hand.setOrigin(0.5);
        this.hand.setDepth(10);
        this.hand.setScale(0.13);

        // highlight button
        const btnBg = numPadBtn.getAt(0) as Phaser.GameObjects.Image;
        btnBg?.setTint(0xFF89F9);

        // Add single click animation using both textures
        this.handTween = this.tweens.add({
            targets: this.hand,
            x: this.getScaledValue(numPadBtnX + 15),
            y: this.getScaledValue(numPadBtnY + 10),
            duration: 1000,
            ease: "Sine.easeInOut",
            onComplete: () => {
                this.hand.setTexture("hand_click");
                this.time.delayedCall(500, () => {
                    this.hand.setTexture("hand");
                    this.time.delayedCall(700, () => {
                        this.hand.destroy();
                        this.handTween.destroy();
                        // reset button highlight
                        btnBg?.clearTint();
                    });
                });
            },
        });

        const step1 = this.audioManager.playSoundEffect(`count_step1_${this.lang}`);
        step1?.on("complete", () => {
            const timer = this.time.delayedCall(5000, () => {
                this.playCountStep1();
            });
            const handleNumPadBtnClicked = (data: { index: number }) => {
                if (data.index === 4) {
                    this.audioManager.stopAllSoundEffects();
                    this.countMechanic.clearNumberPad();
                    this.playStep2();
                    // clear event listener
                    this.events.off("numpadbtnclicked", handleNumPadBtnClicked);
                    timer.destroy();
                }
            }
            // add event listener
            this.events.on("numpadbtnclicked", handleNumPadBtnClicked);
        });
    }

    private playStep2() {
        if (this.isSkipped) {
            return;
        }
        this.setTextWithFade("");
        this.time.delayedCall(500, () => {
            this.createPlayButton();
        });
        if (!this.resetData.fromGameScene) {
            this.audioManager.playSoundEffect(
                `step2_${this.lang}`
            );
        }
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
        if (muteBtnState != label) {
            this.muteBtn.setData('state', label);
            overlay.setLabel(label);
        }
    }
}
