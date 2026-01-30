import { announceToScreenReader, BaseScene, ButtonHelper, ButtonOverlay, focusToGameContainer, i18n, TextOverlay, VolumeSlider } from "@k8-games/sdk";
import { ASSETS_PATHS, BUTTONS } from "../config/common";
import { Counting } from "../mechanics/counting";

export class InstructionsScene extends BaseScene {
    private countingMechanic: Counting;
    private resetData: { reset?: boolean; parentScene?: string, isStepTen?: boolean } = {};
    private skipBtn!: Phaser.GameObjects.Container;
    private muteBtn!: Phaser.GameObjects.Container;
    private playButton!: Phaser.GameObjects.Container;
    private volumeSlider!: VolumeSlider;
    private isSkipped: boolean = false;
    private lang: string;
    private delayedCalls: Phaser.Time.TimerEvent[] = [];
    private hand!: Phaser.GameObjects.Image;
    private handTween!: Phaser.Tweens.TweenChain | Phaser.Tweens.Tween;

    constructor() {
        super("InstructionsScene");
        this.lang = i18n.getLanguage() || "en";
        this.countingMechanic = new Counting(this, true);
    }

    static _preload(scene: BaseScene) {
        Counting._preload(scene);

        const lang = i18n.getLanguage() || "en";

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/common`);
        scene.load.image("half_button_default", "half_button_default.png");
        scene.load.image("half_button_hover", "half_button_hover.png");
        scene.load.image("half_button_pressed", "half_button_pressed.png");
        scene.load.image("half_button_disabled", "half_button_disabled.png");

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/info_screen`);
        scene.load.image("hand", "hand.png");
        scene.load.image("hand_click", "hand_click.png");

        VolumeSlider.preload(scene, 'blue');

        // Load audio
        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/info_screen`);
        for (let step = 1; step <= 6; step++) {
            scene.load.audio(`step_${step}_${lang}`, `step_${step}_${lang}.mp3`);
            if ([2, 3, 5, 6].includes(step)) {
                scene.load.audio(`step_${step}_10_${lang}`, `step_${step}_10_${lang}.mp3`);
            }
        }
        scene.load.audio(`hit_play_${lang}`, `hit_play_${lang}.mp3`);
    }

    init(data?: { reset?: boolean, parentScene: string, isStepTen?: boolean }) {
        if (data) {
            this.resetData = data;
        }
        this.isSkipped = false;
        this.countingMechanic.init(data);
        this.audioManager.initialize(this);
    }

    create() {
        if (this.resetData.parentScene === 'GameScene') {
            focusToGameContainer();
            this.time.delayedCall(1000, () => {
                announceToScreenReader(i18n.t('info.helpPage'));
            })
        }

        // Add how to play text
        const howToPlayText = this.addText(this.display.width / 2, 61, i18n.t("info.howToPlay"), {
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
        this.createVolumeControls();

        this.countingMechanic.create();

        const timer = this.time.delayedCall(500, () => {
            this.playStep1();
        });
        this.delayedCalls.push(timer);
    }

    private playStep1() {
        if (this.isSkipped) return;

        const step1 = this.audioManager.playSoundEffect(this.getAudioKey(1));
        step1?.on('complete', () => {
            const timer = this.time.delayedCall(1000, () => {
                this.playStep2();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playStep2() {
        if (this.isSkipped) return;

        const step2 = this.audioManager.playSoundEffect(this.getAudioKey(2));

        // Create drop zone next to second placed number
        this.countingMechanic.createDropZone();

        step2?.on('complete', () => {
            const timer = this.time.delayedCall(1000, () => {
                this.playStep3();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playStep3() {
        if (this.isSkipped) return;

        const step3 = this.audioManager.playSoundEffect(this.getAudioKey(3));

        // Highlight the target number
        const targetNumber = this.resetData.isStepTen ? 30 : 3;
        const targetCharacter = this.countingMechanic.characterOptions.find(option => option.getData('value') === targetNumber);
        if (targetCharacter) {
            this.tweens.add({
                targets: targetCharacter,
                scale: 1.2,
                duration: 800,
                ease: "Sine.easeInOut",
                yoyo: true,
                repeat: 1,
            });
        }

        step3?.on('complete', () => {
            const timer = this.time.delayedCall(1000, () => {
                this.playStep4();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playStep4() {
        if (this.isSkipped) return;
        const step4 = this.audioManager.playSoundEffect(this.getAudioKey(4));


        const targetNumber = this.resetData.isStepTen ? 30 : 3;
        const targetCharacter = this.countingMechanic.characterOptions.find(option => option.getData('value') === targetNumber);
        if (targetCharacter) {
            this.createHandDragAnimation(targetCharacter);
        }

        step4?.on('complete', () => {
            // Setup drag and drop
            this.countingMechanic.setupDragAndDrop();
            // Listen for first plate dropped
            this.events.removeAllListeners("dropbear");
            this.events.once("dropbear", () => {
                // clear timers
                this.destroyTimers();

                // Clear drag and drop
                this.countingMechanic.clearDragAndDrop();

                // Delay play step 4
                const timer = this.time.delayedCall(3000, () => {
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
        if (this.isSkipped) return;
        const step5 = this.audioManager.playSoundEffect(this.getAudioKey(5));

        // Clear timers
        this.destroyTimers();

        // Clear drag and drop
        this.countingMechanic.clearDragAndDrop();

        const targetNumber = this.resetData.isStepTen ? 40 : 4;
        const targetCharacter = this.countingMechanic.characterOptions.find(option => option.getData('value') === targetNumber);
        if (targetCharacter) {
            const timer = this.time.delayedCall(3000, () => {
                this.createHandDragAnimation(targetCharacter);
            });
            this.delayedCalls.push(timer);
        }

        step5?.on('complete', () => {
            // Setup drag and drop
            this.countingMechanic.setupDragAndDrop();
            // Listen for first plate dropped
            this.events.removeAllListeners("dropbear");
            this.events.once("dropbear", () => {
                // Clear timers
                this.destroyTimers();

                // Clear drag and drop
                this.countingMechanic.clearDragAndDrop();

                const timer = this.time.delayedCall(1000, () => {
                    this.playStep6();
                });
                this.delayedCalls.push(timer);
            });
        });
    }

    private playStep6() {
        if (this.isSkipped) return;
        const step6 = this.audioManager.playSoundEffect(this.getAudioKey(6));

        // Auto place the number 5 in the drop zone
        const targetNumber = this.resetData.isStepTen ? 50 : 5;
        const targetCharacter = this.countingMechanic.characterOptions.find(option => option.getData('value') === targetNumber);
        if (targetCharacter) {
            const timer = this.time.delayedCall(3000, () => {
                this.countingMechanic.handleCorrectDrop(targetCharacter);
            });
            this.delayedCalls.push(timer);
        }

        step6?.on('complete', () => {
            // Hide question board
            const questionBoard = this.children.getByName('question_board') as Phaser.GameObjects.Container;
            this.tweens.add({
                targets: questionBoard,
                alpha: 0,
                duration: 500,
                ease: "Power2",
            });

            if (!(this.resetData.parentScene === 'GameScene')) {
                this.audioManager.playSoundEffect(`hit_play_${this.lang}`);
            }
            this.createPlayButton();
        });
    }

    private getAudioKey(step: number) {
        const isStepTen = this.resetData.isStepTen;
        switch (step) {
            case 1:
                return `step_1_${this.lang}`;
            case 2:
                return isStepTen ? `step_2_10_${this.lang}` : `step_2_${this.lang}`;
            case 3:
                return isStepTen ? `step_3_10_${this.lang}` : `step_3_${this.lang}`;
            case 4:
                return `step_4_${this.lang}`;
            case 5:
                return isStepTen ? `step_5_10_${this.lang}` : `step_5_${this.lang}`;
            case 6:
                return isStepTen ? `step_6_10_${this.lang}` : `step_6_${this.lang}`;
            default:
                return `hit_play_${this.lang}`;
        }
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
                // stop audio manager
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
            y: this.display.height - 70,
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

    private createHandDragAnimation(targetObject: Phaser.GameObjects.Container) {
        const startX = targetObject.x / this.display.scale;
        const startY = targetObject.y / this.display.scale;

        // Get the drop zone container and its center bounds
        const dropZone = this.countingMechanic.dropZone;
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

    private destroyTimers() {
        this.delayedCalls.forEach(call => call.destroy());
        this.delayedCalls = [];
    }

    public startGameScene() {
        this.audioManager.stopAllSoundEffects();
        this.scene.stop('InstructionsScene');
        if (!(this.resetData.parentScene === 'GameScene')) {
            this.scene.start('GameScene', { data: this.resetData });
        } else {
            this.scene.resume('GameScene', { data: this.resetData });
            this.audioManager.resumeAll();
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

    private createVolumeControls(): void {
        this.volumeSlider = new VolumeSlider(this);
        this.volumeSlider.create(this.display.width - 215, 254, 'blue', i18n.t('common.volume'));
        
        ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.SETTINGS_ICON.KEY,
            label: i18n.t('common.volume'),
            x: this.display.width - 54,
            y: 254,
            onClick: () => {
                this.volumeSlider.toggleControl();
            },
        }).setDepth(1);
    }
}
