import { announceToScreenReader, BaseScene, ButtonHelper, ButtonOverlay, focusToGameContainer, i18n, TextOverlay, VolumeSlider } from "@k8-games/sdk";
import { ASSETS_PATHS, BUTTONS } from "../config/common";
import { DistributeItems } from "../mechanics/DistributeItems";
import { BackgroundHelper } from "../utils/BackgroundHelper";

export class NumpadTutorial extends BaseScene {
    private controlsBg: Phaser.GameObjects.Image | null = null;
    private distributeMechanic!: DistributeItems;
    private resetData: { reset?: boolean; fromGameScene?: boolean } = {};
    private instructionText!: Phaser.GameObjects.Text;
    private instructionTextTween!: Phaser.Tweens.Tween;
    private instructionTextOverlay!: TextOverlay;
    private hand!: Phaser.GameObjects.Image;
    private handTween!: Phaser.Tweens.Tween;
    private submitBtn!: Phaser.GameObjects.Container | null;
    private playButton!: Phaser.GameObjects.Container;
    private skipBtn!: Phaser.GameObjects.Container;
    private muteBtn!: Phaser.GameObjects.Container;
    private volumeSlider!: VolumeSlider;
    private isSkipped: boolean = false;
    private lang: string;
    private isCheckButtonClicked: boolean = false;
    private step: number = 1;
    private fadeGroup: Phaser.GameObjects.Group | null = null;
    private questionBar!: Phaser.GameObjects.Container;

    // Announcement queue system
    private announcementQueue: string[] = [];
    private isAnnouncing: boolean = false;

    constructor() {
        super("NumpadTutorial");
        this.distributeMechanic = new DistributeItems(this);
        this.lang = i18n.getLanguage() || "en";
    }

    static _preload(scene: BaseScene) {
        const lang = i18n.getLanguage() || "en";
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/info_screen`);
        scene.load.image("hand", "hand.png");
        scene.load.image("hand_click", "hand_click.png");
        // load audio
        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/info_screen/distribute_items`);
        scene.load.audio(`step1_numpad_${lang}`, `step1_numpad_${lang}.mp3`);
        scene.load.audio(`step2_numpad_${lang}`, `step2_numpad_${lang}.mp3`);
        scene.load.audio(`step3_numpad_${lang}`, `step3_numpad_${lang}.mp3`);
        
        // Preload volume slider assets
        VolumeSlider.preload(scene, "blue");
        
        DistributeItems._preload(scene);
    }

    init(data?: { reset?: boolean; fromGameScene?: boolean }) {
        this.audioManager.initialize(this);
        if (data) {
            this.resetData = data;
        }
        this.isCheckButtonClicked = false;
        this.isSkipped = false;
        this.step = 1;
        this.distributeMechanic.userAnswer = "";
        this.destroyTweens();
        DistributeItems.init(this);
        this.announcementQueue = [];
        this.isAnnouncing = false;
    }

    create() {
        // Show background
        BackgroundHelper.createBackground(this);

        if (this.resetData.fromGameScene) {
            focusToGameContainer();
            this.time.delayedCall(1000, () => {
                this.queueAnnouncement(i18n.t("info.helpPage"));
            })
        }

        this.addImage(this.display.width / 2, 85, "title_bg").setOrigin(0.5);

        // Add how to play text
        const howToPlayText = this.addText(
            this.display.width / 2,
            61,
            i18n.t("info.howToPlay"),
            {
                font: "700 30px Exo",
                color: "#ffffff",
            }
        ).setOrigin(0.5);
        new TextOverlay(this, howToPlayText, {
            label: i18n.t("info.howToPlay"),
            tag: "h1",
            role: "heading"
        });

        this.createSkipButton();
        this.createMuteButton();

        // Show question bar
        this.createQuestionBar();

        // Create doors (open for tutorial)
        this.distributeMechanic.createDoors && this.distributeMechanic.createDoors("open");
        // Table, plates, aliens, items
        this.addImage(this.display.width / 2, 480, "table_small")
            .setOrigin(0.5)
            .setDepth(2)
            .setName("gameTable");
        this.distributeMechanic.plates = [];
        this.distributeMechanic.aliens = [];
        this.distributeMechanic.items = [];
        this.distributeMechanic.itemsInPlates.clear();
        this.distributeMechanic.createCharactersWithPlates(2, "small");
        this.distributeMechanic.createPreDistributedItems(4, "mooncake", 2);

        if (this.controlsBg) {
            this.controlsBg.destroy();
        }
        this.controlsBg = this.addImage(this.display.width / 2, 633, "numberpad_bg")
            .setOrigin(0.5)
            .setDepth(2)
            .setName("controlsBg");

        this.instructionText = this.addText(this.display.width / 2, 625, "", {
            font: "400 30px Exo",
            color: "#FFFFFF",
        })
            .setOrigin(0.5)
            .setDepth(10);

        this.step = 1;
        this.showStep1();
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
                this.isSkipped = true;
                this.clearHand();
                this.audioManager.stopAllSoundEffects();
                // Skip directly closes doors and goes back based on parent scene
                if (this.resetData.fromGameScene) {
                    this.audioManager.playBackgroundMusic("bg-music");
                    this.scene.stop("NumpadTutorial");
                    this.scene.resume("GameScene");
                } else {
                    this.distributeMechanic.closeDoors();
                    this.time.delayedCall(1000, () => {
                        this.scene.start("GameScene");
                    });
                }
            },
        });
        this.skipBtn.setDepth(1);
    }

    private createMuteButton() {
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

    private createSubmitButton(enabled: boolean = true) {
        // Remove existing checkButton if present
        const existing = this.children.getByName("checkButton");
        if (existing) existing.destroy();
        const isSpanish = this.lang === "es";
        const checkButtonX = isSpanish ? this.display.width / 2 + 410 : this.display.width / 2 + 335;
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
            x: checkButtonX,
            y: 680,
            onClick: enabled ? () => {
                if (this.step === 3 && !this.isCheckButtonClicked) {
                    this.isCheckButtonClicked = true;
                    this.clearHand();
                    this.showStep4();
                }
            } : undefined,
        });
        this.submitBtn.setName("checkButton");
        this.submitBtn.setDepth(3);
        this.submitBtn.setAlpha(enabled ? 1 : 0.5);
        if (!enabled) {
            this.submitBtn.disableInteractive && this.submitBtn.disableInteractive();
        } else {
            this.submitBtn.setInteractive && this.submitBtn.setInteractive();
        }
    }

    private createResetButton() {
        const existing = this.children.getByName("resetButton");
        if (existing) existing.destroy();
        const isSpanish = this.lang === "es";
        const resetButtonX = isSpanish ? this.display.width / 2 + 200 : this.display.width / 2 + 165;
        const resetBtn = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: "btn_alter",
                hover: "btn_alter_hover",
                pressed: "btn_alter_pressed",
            },
            text: i18n.t("game.reset"),
            label: i18n.t("game.reset"),
            textStyle: {
                font: "700 36px Exo",
                color: "#FFFFFF",
            },
            x: resetButtonX,
            y: 680,
            onClick: () => {
                if (this.step === 3) {
                    return;
                }
                
                if (this.distributeMechanic) {
                    this.distributeMechanic.userAnswer = "";
                    if (this.distributeMechanic.answerDisplay) {
                        this.distributeMechanic.answerDisplay.setText("");
                    }
                }
            },
        });
        resetBtn.setName("resetButton");
        resetBtn.setDepth(3);
    }

    private createQuestionBar() {
        if (this.questionBar) this.questionBar.destroy();
        this.questionBar = this.add.container(
            this.getScaledValue(this.display.width / 2),
            this.getScaledValue(184)
        );
        this.questionBar.add(
            this.addImage(0, 0, "question_bg").setOrigin(0.5)
        );
        const questionText = this.addText(
            0,
            -25,
            i18n.t("game.numpadTutorialQuestion"),
            {
                font: "700 30px Exo",
                color: "#FFEA00",
            }
        ).setOrigin(0.5);
        this.questionBar.add(questionText);

        new TextOverlay(this, questionText, {
            label: i18n.t("game.numpadTutorialQuestion"),
        });

        const equationText = this.addText(
            0,
            25,
            "2 × 2 = ?",
            {
                font: "700 40px Exo",
                color: "#FFFFFF",
            }
        ).setOrigin(0.5);
        this.questionBar.add(equationText);

        new TextOverlay(this, equationText, {
            label: "2 × 2 = ?",
        });
    }

    private setTextWithFade(text: string, duration: number = 500) {
        this.instructionTextTween = this.tweens.add({
            targets: this.instructionText,
            alpha: 0,
            duration: duration / 2,
            ease: "Sine.easeInOut",
            onComplete: () => {
                this.instructionText.setText(text);
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

    destroyTweens() {
        if (this.instructionTextTween) {
            this.instructionTextTween.stop();
            this.instructionTextTween.destroy();
        }
        if (this.handTween) {
            this.handTween.stop();
            this.handTween.destroy();
        }
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
        if (this.instructionTextOverlay) {
            this.instructionTextOverlay.destroy();
        }
    }

    shutdown() {
        this.audioManager.stopAll();
        this.destroyTweens();
    }

    override update(): void {
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

        // Auto-advance to step 3 when userAnswer is set to '4' in step 2
        if (this.step === 2 && this.distributeMechanic.userAnswer === "4") {
            this.clearHand();
            this.showStep3();
        }
    }

    // STEP 1: Show info.step1 text
    private showStep1() {
        this.step = 1;
        this.fadeInElements({ showNumpad: false });
        this.setTextWithFade(i18n.t("info.numpadStep1"));

        this.time.delayedCall(2000, () => {
            const question = `${i18n.t("game.numpadTutorialQuestion")} 2 × 2 = ?`;
            this.queueAnnouncement(i18n.t("info.numpadStep1"));
            this.queueAnnouncement(question);
        });
        
        // Play step1 audio
        this.audioManager.playSoundEffect(`step1_numpad_${this.lang}`);
        
        this.time.delayedCall(3500, () => {
            if (!this.isSkipped) {
                this.showStep2();
            }
        });
    }

    // STEP 2: 'Click on 4' animation, won't proceed until user does
    private showStep2() {
        this.step = 2;
        this.fadeInElements({ showNumpad: true });
        this.setTextWithFade("");
        this.createResetButton();
        this.createSubmitButton(false);
        this.time.delayedCall(600, () => {
            if (!this.isSkipped) {
                this.audioManager.playSoundEffect(`step2_numpad_${this.lang}`);
                this.showHandOnNumpad();
                // Numpad logic handled by DistributeItems
            }
            this.distributeMechanic.numberPad?.enableButtons();
        });
    }

    // STEP 3: Animation on check button, user clicks that
    private showStep3() {
        this.audioManager.stopSoundEffect(`step2_numpad_${this.lang}`);
        this.step = 3;
        this.setTextWithFade("");
        this.createResetButton();
        this.createSubmitButton(true);
        this.distributeMechanic.numberPad?.disableButtons();
        this.time.delayedCall(400, () => {
            if (!this.isSkipped) {
                this.audioManager.playSoundEffect(`step3_numpad_${this.lang}`);
                this.showHandOnCheckButton();
            }
        });
    }

    // STEP 4: Show final step, close doors and go back to GameScene
    private showStep4() {
        this.step = 4;
        this.clearHand();
        this.audioManager.stopAllSoundEffects();
        // Skip directly closes doors and goes back based on parent scene
        if (this.resetData.fromGameScene) {
            this.audioManager.playBackgroundMusic("bg-music");
            this.scene.stop("NumpadTutorial");
            this.scene.resume("GameScene");
        } else {
            this.distributeMechanic.closeDoors();
            this.time.delayedCall(1000, () => {
                this.scene.start("GameScene");
            });
        }
        this.fadeOutElements(() => {
            this.setTextWithFade("");
        });
    }


    private hideAllElements() {
        if (this.fadeGroup) {
            this.fadeGroup.clear(true, true);
            this.fadeGroup = null;
        }
        // Remove numpad, answer display, input_bg 
        this.children.list.forEach(child => {
            if (child.name === "gameTable" || child.name === "input_bg") {
                child.destroy();
            }
        });
        if (this.questionBar) {
            this.questionBar.destroy();
            this.questionBar = null as any;
        }
        if (this.distributeMechanic.numberPad) {
            this.distributeMechanic.numberPad.destroy();
            this.distributeMechanic.numberPad = null;
        }
        if (this.distributeMechanic.answerDisplay) {
            this.distributeMechanic.answerDisplay.destroy();
            this.distributeMechanic.answerDisplay = null;
        }
    }

    private fadeInElements(opts?: { showNumpad?: boolean }) {
        // Remove previous fadeGroup if any
        if (this.fadeGroup && typeof this.fadeGroup.clear === "function") {
            try {
                this.fadeGroup.clear(true, true);
            } catch (e) {
            }
            this.fadeGroup = null;
        }

        const fadeGroup = this.add.group();
        let fadeObjects: Phaser.GameObjects.GameObject[] = [];

        if (opts?.showNumpad) {
            // Only fade in numpad and answer display for tutorial steps
            // Always destroy previous numpad and answer display before creating new ones
            if (this.distributeMechanic.numberPad) {
                this.distributeMechanic.numberPad.destroy();
                this.distributeMechanic.numberPad = null;
            }
            if (this.distributeMechanic.answerDisplay) {
                this.distributeMechanic.answerDisplay.destroy();
                this.distributeMechanic.answerDisplay = null;
            }

            this.distributeMechanic.currentQuestion = {
                operand1: "2",
                operand2: "2",
                answer: "4",
                item: "mooncake",
                itemPerPlate: "2",
                equation: "2 × 2",
                question_en: i18n.t("game.numpadTutorialQuestion"),
                question_es: i18n.t("game.numpadTutorialQuestion"),
            };

            // Numpad and answer display
            this.distributeMechanic.createNumberPad();
            this.distributeMechanic.createAnswerDisplay();

            const numberPad = this.distributeMechanic.numberPad as { getButtonContainers?: () => Phaser.GameObjects.GameObject[] } | null;
            if (numberPad && typeof numberPad.getButtonContainers === "function") {
                fadeObjects.push(...numberPad.getButtonContainers());
            }
            if (this.distributeMechanic.answerDisplay) {
                fadeObjects.push(this.distributeMechanic.answerDisplay);
            }
        }

        fadeGroup.addMultiple(fadeObjects);
        fadeGroup.setAlpha(0);
        this.tweens.add({
            targets: fadeGroup.getChildren(),
            alpha: 1,
            duration: 600,
            ease: "Sine.easeInOut"
        });
        this.fadeGroup = fadeGroup;
    }

    private fadeOutElements(cb: () => void) {
        if (this.fadeGroup) {
            this.tweens.add({
                targets: this.fadeGroup.getChildren(),
                alpha: 0,
                duration: 500,
                ease: "Sine.easeInOut",
                onComplete: () => {
                    this.hideAllElements();
                    cb();
                }
            });
        } else {
            cb();
        }
        // Hide question bar
        if (this.questionBar) {
            this.questionBar.destroy();
            this.questionBar = null as any;
        }
    }

    private showHandOnNumpad() {
        this.clearHand();
        const numpadButtons = this.distributeMechanic.numberPad?.getButtonContainers();
        if (numpadButtons && numpadButtons.length > 0) {
            const answerButton = numpadButtons.find(btn => btn.getData('number') === 4) || numpadButtons[3];
            if (answerButton) {
                this.hand = this.addImage(590, 600, "hand")
                    .setOrigin(0.5)
                    .setDepth(10)
                    .setScale(0.13);
                this.handTween = this.tweens.addCounter({
                    from: 0,
                    to: 1,
                    duration: 500,
                    repeat: -1,
                    yoyo: true,
                    onYoyo: () => this.hand.setTexture("hand_click"),
                    onRepeat: () => this.hand.setTexture("hand")
                });
            }
        }
    }

    private showHandOnCheckButton() {
        this.clearHand();
        if (this.submitBtn) {
            this.hand = this.addImage(1050, 700, "hand")
            .setOrigin(0.5)
            .setDepth(10)
            .setScale(0.13);
            this.handTween = this.tweens.addCounter({
            from: 0,
            to: 1,
            duration: 500,
            repeat: -1,
            yoyo: true,
            onYoyo: () => this.hand.setTexture("hand_click"),
            onRepeat: () => this.hand.setTexture("hand")
            });
        }
    }

    private clearHand() {
        if (this.handTween) {
            this.handTween.stop();
            this.handTween.remove();
            this.handTween = null as any;
        }
        if (this.hand) {
            this.hand.destroy();
            this.hand = null as any;
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
}