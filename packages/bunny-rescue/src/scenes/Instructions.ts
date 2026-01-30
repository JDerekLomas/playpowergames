import { announceToScreenReader, BaseScene, ButtonHelper, ButtonOverlay, focusToGameContainer, i18n, TextOverlay, VolumeSlider } from "@k8-games/sdk";
import { ASSETS_PATHS, BUTTONS } from "../config/common";
import { BunnyRescue } from "../mechanics/BunnyRescue";

export class InstructionsScene extends BaseScene {
    private bunnyRescueMechanic: BunnyRescue;
    private resetData: { reset?: boolean; parentScene?: string, isStepTen?: boolean } = {};
    private skipBtn!: Phaser.GameObjects.Container;
    private muteBtn!: Phaser.GameObjects.Container;
    private playButton!: Phaser.GameObjects.Container;
    private isSkipped: boolean = false;
    // private lang: string;
    private delayedCalls: Phaser.Time.TimerEvent[] = [];
    private hand!: Phaser.GameObjects.Image;
    private questionContainer!: Phaser.GameObjects.Container;
    // Announcement queue system
    private announcementQueue: string[] = [];
    private isAnnouncing: boolean = false;

    constructor() {
        super("InstructionsScene");
        // this.lang = i18n.getLanguage() || "en";
        this.bunnyRescueMechanic = new BunnyRescue(this, true);
    }

    static _preload(scene: BaseScene) {
        BunnyRescue._preload(scene);

        const lang = i18n.getLanguage() || "en";

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/common`);
        scene.load.image("half_button_default", "half_button_default.png");
        scene.load.image("half_button_hover", "half_button_hover.png");
        scene.load.image("half_button_pressed", "half_button_pressed.png");
        scene.load.image("half_button_disabled", "half_button_disabled.png");

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/info_screen`);
        scene.load.image("hand", "hand.png");
        scene.load.image("hand_click", "hand_click.png");

        // Load tutorial audio files
        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/info_screen`);
        scene.load.audio("hit_play", `hit_play_${lang}.mp3`);
        for (let step = 1; step <= 6; step++) {
            scene.load.audio(`step_${step}`, `step_${step}_${lang}.mp3`);
        }
    }

    init(data?: { reset?: boolean, parentScene: string, isStepTen?: boolean }) {
        if (data) {
            this.resetData = data;
        }
        this.isSkipped = false;
        this.isAnnouncing = false;
        this.announcementQueue = [];
        this.bunnyRescueMechanic.init(data);
        this.audioManager.initialize(this);
    }

    create() {
        // Iframe label announcement support
        const inIframe = this.isInsideIframe();
        if (this.resetData.parentScene === 'GameScene') {
            if (inIframe) {
                window.parent.postMessage({
                    type: 'UPDATE_IFRAME_LABEL',
                    label: i18n.t('info.helpPage')
                }, '*');
            }
            focusToGameContainer();
            this.time.delayedCall(1000, () => {
                this.queueAnnouncement(i18n.t('info.helpPage'));
            });
        }

        // Add how to play text
        const howToPlayText = this.addText(this.display.width / 2, 55, i18n.t("info.howToPlay"), {
            font: "700 30px Exo",
            color: "#000000",
        }).setOrigin(0.5).setDepth(1);
        new TextOverlay(this, howToPlayText, {
            label: i18n.t("info.howToPlay"),
            tag: 'h1',
            role: 'header'
        });
        this.createSkipButton();
        this.createMuteButton();
        this.createVolumeSlider();
        this.bunnyRescueMechanic.create();

        const questionBoard = this.children.getByName('question_board') as Phaser.GameObjects.Container;
        this.questionContainer = questionBoard.getByName('question_container') as Phaser.GameObjects.Container;

        const currentQuestion = this.bunnyRescueMechanic.currentQuestion;
        this.time.delayedCall(1000, () => {
            this.queueAnnouncement(
                `${currentQuestion.operand1} ${currentQuestion.operator.replace("-", "\u2212")} ${currentQuestion.operand2} = ?`
            );
        });

        this.playStartAnimation();
    }

    private playStartAnimation() {

        // Play giggle sound
        this.audioManager.playSoundEffect('giggle_sound');

        this.bunnyRescueMechanic.playStartAnimation();

        const timer = this.time.delayedCall(3000, () => {
            this.playStep1();
        });
        this.delayedCalls.push(timer);
    }

    private playStep1() {
        this.queueAnnouncement(i18n.t('info.step1'));
        if (this.isSkipped) return;
        const step1 = this.audioManager.playSoundEffect(`step_1`);
        this.bunnyRescueMechanic.fadeQuestionContainer("in");
        step1?.on('complete', () => {
            const timer = this.time.delayedCall(1000, () => {
                this.playStep2();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playStep2() {
        this.queueAnnouncement(i18n.t('info.step2'));
        if (this.isSkipped) return;
        const step2 = this.audioManager.playSoundEffect(`step_2`);

        // Scale up down question container
        this.tweens.add({
            targets: this.questionContainer,
            scale: 1.2,
            duration: 500,
            repeat: 1,
            yoyo: true,
        });

        step2?.on('complete', () => {
            const timer = this.time.delayedCall(1000, () => {
                this.playStep3();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playStep3() {
        this.queueAnnouncement(i18n.t('info.step3'));
        if (this.isSkipped) return;
        const step3 = this.audioManager.playSoundEffect(`step_3`);

        this.bunnyRescueMechanic.changeNumpadBtnsState("disable");

        const answer = this.bunnyRescueMechanic.currentQuestion.answer;
        const targetButton = this.bunnyRescueMechanic.numpadBtns.find(btn => btn.name === `number_pad_btn_${answer}`); // TODO: Please update this for multiple digits
        targetButton?.setAlpha(1);

        this.createHandClickAnimation(targetButton!);

        step3?.on('complete', () => {
            // Enable target button
            ButtonHelper.enableButton(targetButton!);
            this.bunnyRescueMechanic.setupKeyboardListener();

            this.events.once('enteranswer', async () => {
                this.destroyTimers();
                this.audioManager.stopAllSoundEffects();
                this.hand?.setAlpha(0);
                const timer = this.time.delayedCall(1000, () => {
                    this.destroyTimers();
                    this.playStep4();
                });
                this.delayedCalls.push(timer);
            });

            const timer = this.time.delayedCall(5000, () => {
                this.playStep3();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playStep4() {
        this.queueAnnouncement(i18n.t('info.step4'));
        if (this.isSkipped) return;
        const step4 = this.audioManager.playSoundEffect(`step_4`);

        // Disable all numpad buttons
        this.bunnyRescueMechanic.changeNumpadBtnsState("disable");
        const enterButton = this.bunnyRescueMechanic.numpadBtns.find(btn => btn.name === 'enter_button');
        enterButton?.setAlpha(1);

        this.createHandClickAnimation(enterButton!);

        step4?.on('complete', () => {
            // Enable enter button
            ButtonHelper.enableButton(enterButton!);
            this.bunnyRescueMechanic.setupKeyboardListener();

            this.events.once('correctanswer', async () => {
                this.destroyTimers();
                this.audioManager.stopAllSoundEffects();
                this.hand?.setAlpha(0);
                // Play positive sound effect
                this.audioManager.playSoundEffect('positive_feedback');
                await this.bunnyRescueMechanic.showQuestionFeedback("success");
                const timer = this.time.delayedCall(1000, () => {
                    this.destroyTimers();
                    this.playStep5();
                });
                this.delayedCalls.push(timer);
            });

            const timer = this.time.delayedCall(5000, () => {
                this.playStep4();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playStep5() {
        this.queueAnnouncement(i18n.t('info.step5'));
        if (this.isSkipped) return;
        const step5 = this.audioManager.playSoundEffect(`step_5`);

        // Disable all numpad buttons
        this.bunnyRescueMechanic.changeNumpadBtnsState("disable");
        const targetButton = this.bunnyRescueMechanic.numpadBtns.find(btn => btn.name === 'backspace_button');
        // Enable the target button
        targetButton?.setAlpha(1);
        ButtonHelper.enableButton(targetButton!);

        // Scale up down target button
        this.tweens.add({
            targets: targetButton,
            scale: 1.1,
            duration: 700,
            repeat: 1,
            yoyo: true,
        });

        step5?.on('complete', () => {
            // Destroy all buttons
            this.bunnyRescueMechanic.numpadBtns.forEach(btn => {
                btn.destroy();
            });
            const timer = this.time.delayedCall(1000, () => {
                this.playStep6();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playStep6() {
        this.queueAnnouncement(i18n.t('info.step6'));
        if (this.isSkipped) return;
        const step6 = this.audioManager.playSoundEffect(`step_6`);
        step6?.on('complete', () => {
            if (!(this.resetData.parentScene === 'GameScene')) {
                this.audioManager.playSoundEffect(`hit_play`);
            }
            this.createPlayButton();
        });
    }

    private createHandClickAnimation(targetButton: Phaser.GameObjects.Container) {
        // Create hand image for single click animation
        const handX = targetButton.x / this.display.scale + this.getScaledValue(50);
        const handY = targetButton.y / this.display.scale - this.getScaledValue(20);
        this.hand = this.addImage(handX, handY, 'hand');
        this.hand.setOrigin(0.5);
        this.hand.setDepth(10);
        this.hand.setScale(0.13);

        // Add single click animation using both textures
        this.tweens.chain({
            targets: this.hand,
            tweens: [
                {
                    x: targetButton.x + this.getScaledValue(15),
                    y: targetButton.y + this.getScaledValue(10),
                    duration: 1000,
                    ease: "Sine.easeInOut",
                    onComplete: () => {
                        this.hand?.setTexture("hand_click");
                    }
                },
                {
                    alpha: 1,
                    duration: 500,
                    onComplete: () => {
                        this.hand?.setTexture("hand");
                    }
                },
                {
                    alpha: 1,
                    duration: 500,
                    onComplete: () => {
                        this.hand?.destroy();
                    }
                },
            ],
        });
    }

    private createSkipButton() {
        this.skipBtn = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: "half_button_default",
                hover: "half_button_hover",
                pressed: "half_button_pressed",
                disabled: "half_button_disabled",
            },
            text: i18n.t("common.skip"),
            label: i18n.t("common.skip"),
            textStyle: {
                font: "700 32px Exo",
                color: "#FFFFFF",
            },
            x: this.display.width - 80,
            y: 75,
            raisedOffset: 3.5,
            onClick: () => {
                this.isSkipped = true;
                this.startGameScene();
                this.isSkipped = false;
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
            x: this.display.width - 54,
            y: 170,
            raisedOffset: 3.5,
            onClick: () => {
                this.audioManager.setMute(!this.audioManager.getIsAllMuted());
            },
        });
        this.muteBtn.setDepth(1);
    }

    private createVolumeSlider() {
        // Resources are preloaded in game scene
        // Volume slider
        const volumeSlider = new VolumeSlider(this);
        volumeSlider.create(
            this.display.width - 190,
            270,
            'blue',
            i18n.t('common.volume')
        );
        const volumeBtn = ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.SETTINGS_ICON.KEY,
            label: i18n.t('common.volume'),
            x: this.display.width - 54,
            y: 250,
            raisedOffset: 3.5,
            onClick: () => {
                volumeSlider.toggleControl();
            },
        });
        volumeBtn.setDepth(1);
    }

    private createPlayButton(): void {
        if (this.playButton) {
            this.playButton.destroy();
        }

        const playLabel = this.resetData.parentScene === 'GameScene' ? i18n.t("common.back") : i18n.t("common.play");

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
                this.startGameScene();
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
        this.delayedCalls.forEach(call => call.destroy());
        this.delayedCalls = [];
    }

    public startGameScene() {
        // Iframe label reset support
        const inIframe = this.isInsideIframe();
        if (inIframe && this.resetData.parentScene === 'GameScene') {
            window.parent.postMessage({
                type: 'UPDATE_IFRAME_LABEL',
                label: 'Game'
            }, '*');
        }
        this.audioManager.stopAllSoundEffects();
        this.scene.stop('InstructionsScene');
        if (!(this.resetData.parentScene === 'GameScene')) {
            this.scene.start('GameScene', { data: this.resetData });
        } else {
            this.scene.resume('GameScene', { data: this.resetData });
            this.audioManager.resumeAll();
        }
    }
    // Helper to check if inside an iframe
    private isInsideIframe() {
        try {
            return window.self !== window.top;
        } catch (e) {
            // Cross-origin error means we're in an iframe
            return true;
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