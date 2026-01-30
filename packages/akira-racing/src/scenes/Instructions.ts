import { announceToScreenReader, BaseScene, ButtonHelper, ButtonOverlay, focusToGameContainer, i18n, TextOverlay, VolumeSlider } from "@k8-games/sdk";
import { GameMechanic } from "../GameMechanic";
import { ASSETS_PATHS, BUTTONS } from "../config/common";

export class InstructionsScene extends BaseScene {
    private gameMechanic!: GameMechanic;
    private isMovementPaused: boolean = false;
    private resetData: { parentScene: string } = { parentScene: '' };
    private instructionText!: Phaser.GameObjects.Text;
    private instructionTextOverlay!: TextOverlay;
    private instructionTextContainer!: Phaser.GameObjects.Rectangle;
    private delayedCalls: Phaser.Time.TimerEvent[] = [];
    private skipBtn!: Phaser.GameObjects.Container;
    private muteBtn!: Phaser.GameObjects.Container;
    private volumeSlider!: VolumeSlider;
    private playButton!: Phaser.GameObjects.Container;
    private isSkipped: boolean = false;

    private car!: Phaser.GameObjects.Container;
    private leftBoard!: Phaser.GameObjects.Container;
    private rightBoard!: Phaser.GameObjects.Container;
    private speedometer!: Phaser.GameObjects.Container;


    constructor() {
        super("InstructionsScene");
    }

    static _preload(scene: BaseScene) {
        const lang = i18n.getLanguage() || 'en';

        GameMechanic._preload(scene);

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/common`);
        scene.load.image("btn_skip", "btn_skip.png");
        scene.load.image("btn_skip_hover", "btn_skip_hover.png");
        scene.load.image("btn_skip_pressed", "btn_skip_pressed.png");

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/info_screen`);
        scene.load.audio('step_1', `step_1_${lang}.mp3`);
        scene.load.audio('step_2a', `step_2a_${lang}.mp3`);
        scene.load.audio('step_2b', `step_2b_${lang}.mp3`);
        scene.load.audio('step_2c', `step_2c_${lang}.mp3`);
        scene.load.audio('step_3', `step_3_${lang}.mp3`);
        scene.load.audio('step_3a', `step_3a_${lang}.mp3`);
        scene.load.audio('step_3b', `step_3b_${lang}.mp3`);
        scene.load.audio('step_3c', `step_3c_${lang}.mp3`);
        scene.load.audio('step_4', `step_4_${lang}.mp3`);
        scene.load.audio('step_5', `step_5_${lang}.mp3`);
        scene.load.audio('step_6', `step_6_${lang}.mp3`);
        scene.load.audio('hit_play', `hit_play_${lang}.mp3`);
        
        // Preload volume slider assets
        VolumeSlider.preload(scene, 'blue');
    }

    init(data: { parentScene: string }) {
        this.resetData = data;
        this.gameMechanic = new GameMechanic(this, true);
        this.gameMechanic.init();
        this.isSkipped = false;
        this.isMovementPaused = false;
    }

    create() {
        if (this.resetData.parentScene === 'GameScene') {
            focusToGameContainer();
            this.time.delayedCall(1000, () => {
                announceToScreenReader(i18n.t('info.helpPage'));
            })
        }

        const howToPlayText = this.addText(this.display.width / 2, 65, i18n.t('info.howToPlay'), {
            font: "700 30px Exo"
        }).setOrigin(0.5).setDepth(1);

        new TextOverlay(this, howToPlayText, { label: i18n.t('info.howToPlay'), tag: 'h1', role: 'heading' });

        this.createSkipButton();
        this.createMuteButton();

        this.createInstructionText();
        this.instructionTextContainer.setVisible(false);

        this.gameMechanic.create();

        this.car = this.gameMechanic.car!;
        this.leftBoard = this.gameMechanic.movingBoards[0].container;
        this.rightBoard = this.gameMechanic.movingBoards[1].container;
        this.speedometer = this.children.getByName('speedometer') as Phaser.GameObjects.Container;

        const timer = this.time.delayedCall(1000, () => {
            this.instructionTextContainer.setVisible(true);
            this.playStep1();
        });
        this.delayedCalls.push(timer);

    }

    private createInstructionText() {
        this.instructionTextContainer = this.addRectangle(this.display.width / 2, this.display.height / 2 + 100, 800, 70, 0x000000, 0.8).setDepth(10);
        this.instructionText = this.addText(this.display.width / 2, this.display.height / 2 + 100, '', {
            font: "400 24px Exo",
            align: 'center',
            wordWrap: {
                width: 800
            }
        }).setOrigin(0.5).setDepth(10);
        this.instructionTextOverlay = new TextOverlay(this, this.instructionText, { label: '' });
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
                this.startGameScene();
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
            x: this.display.width - 60,
            y: 248,
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

    private animateTextWithAudio(texts: Phaser.GameObjects.Text[], duration: number = 800, audio_key: string): Promise<boolean> {
        return new Promise((resolve) => {
            texts = texts.filter(text => text !== undefined && text !== null);

            const audio = this.audioManager.playSoundEffect(audio_key);

            this.tweens.add({
                targets: texts,
                scale: this.getScaledValue(1.3),
                duration: duration,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: 1,
            })

            audio?.on('complete', () => {
                resolve(true);
            });
        });
    }

    private async playStep1() {
        if (this.isSkipped) return;

        this.instructionText.setText(i18n.t('info.step1'));
        this.instructionTextOverlay.updateContent(i18n.t('info.step1'));

        const carText = this.car?.getByName('car_answer_text') as Phaser.GameObjects.Text;

        await this.animateTextWithAudio([carText], 800, 'step_1');

        const timer = this.time.delayedCall(1000, () => {
            this.playStep2();
        });
        this.delayedCalls.push(timer);
    }


    private async playStep2() {
        if (this.isSkipped) return;

        // Stop moving boards
        this.isMovementPaused = true;

        const carText = this.car?.getByName('car_answer_text') as Phaser.GameObjects.Text;
        const leftText = this.leftBoard?.getByName('board_text') as Phaser.GameObjects.Text;
        const rightText = this.rightBoard?.getByName('board_text') as Phaser.GameObjects.Text;

        this.instructionText.setText(i18n.t('info.step2a'));
        this.instructionTextOverlay.updateContent(i18n.t('info.step2a'));
        await this.animateTextWithAudio([leftText], 800, 'step_2a');
        await this.sleep(1000);

        this.instructionText.setText(i18n.t('info.step2b'));
        this.instructionTextOverlay.updateContent(i18n.t('info.step2b'));
        await this.animateTextWithAudio([rightText], 800, 'step_2b');
        await this.sleep(1000);

        this.instructionText.setText(i18n.t('info.step2c'));
        this.instructionTextOverlay.updateContent(i18n.t('info.step2c'));
        await this.animateTextWithAudio([carText, leftText, rightText], 800, 'step_2c');

        const timer = this.time.delayedCall(1000, () => {
            this.playStep3();
        });
        this.delayedCalls.push(timer);
    }

    private playStep3() {
        if (this.isSkipped) return;

        const step3 = this.audioManager.playSoundEffect('step_3');

        this.instructionText.setText(i18n.t('info.step3'));
        this.instructionTextOverlay.updateContent(i18n.t('info.step3'));

        step3?.on('complete', async () => {
            const carText = this.car?.getByName('car_answer_text') as Phaser.GameObjects.Text;
            const leftText = this.leftBoard?.getByName('board_text') as Phaser.GameObjects.Text;
            const rightText = this.rightBoard?.getByName('board_text') as Phaser.GameObjects.Text;

            await this.sleep(1000);

            this.instructionText.setText(i18n.t('info.step3a'));
            this.instructionTextOverlay.updateContent(i18n.t('info.step3a'));
            await this.animateTextWithAudio([leftText], 800, 'step_3a');
            await this.sleep(1000);

            this.instructionText.setText(i18n.t('info.step3b'));
            this.instructionTextOverlay.updateContent(i18n.t('info.step3b'));
            await this.animateTextWithAudio([rightText], 800, 'step_3b');
            await this.sleep(1000);

            this.instructionText.setText(i18n.t('info.step3c'));
            this.instructionTextOverlay.updateContent(i18n.t('info.step3c'));
            await this.animateTextWithAudio([carText], 800, 'step_3c');

            const timer = this.time.delayedCall(1000, () => {
                this.playStep4();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playStep4() {
        if (this.isSkipped) return;

        const step4 = this.audioManager.playSoundEffect('step_4');

        this.instructionText.setText(i18n.t('info.step4'));
        this.instructionTextOverlay.updateContent(i18n.t('info.step4'));
        const currentQuestion = this.gameMechanic.currentQuestion;

        step4?.on('complete', () => {
            this.gameMechanic.controlsEnabled = true;

            this.events.on('car_moved', () => {
                this.isMovementPaused = false;
            });

            // Listen for correctanswer event
            this.events.on('correctanswer', () => {
                this.playStep5();
            });

            if (currentQuestion) {
                if (currentQuestion.allowedDirection === 1) {
                    const { container, tween } = this.createGhostCar(1);
                    this.input.keyboard?.on('keydown-RIGHT', () => {
                        tween?.stop();
                        container?.destroy();
                        this.isMovementPaused = false;
                        this.gameMechanic.moveCar(1);
                    });
                } else if (currentQuestion.allowedDirection === -1) {
                    const { container, tween } = this.createGhostCar(-1);
                    this.input.keyboard?.on('keydown-LEFT', () => {
                        tween?.stop();
                        container?.destroy();
                        this.isMovementPaused = false;
                        this.gameMechanic.moveCar(-1);
                    });
                } else {
                    this.isMovementPaused = false;
                }

                // Pointer / touch
                this.gameMechanic.initializePointerControls();
            }
        });
    }

    private playStep5() {
        if (this.isSkipped) return;

        // Announce step 5 for screen readers
        announceToScreenReader(i18n.t('info.step5'));

        const step5 = this.audioManager.playSoundEffect('step_5');

        this.instructionText.setText(i18n.t('info.step5'));
        this.instructionTextOverlay.updateContent(i18n.t('info.step5'));
        this.isMovementPaused = true;
        this.car?.setVisible(false);
        this.leftBoard?.setVisible(false);
        this.rightBoard?.setVisible(false);
        this.speedometer?.setVisible(false);

        step5?.on('complete', () => {
            this.time.delayedCall(1000, () => {
                this.playStep6();
            });
        });
    }

    private playStep6() {
        if (this.isSkipped) return;

        // Announce step 6 for screen readers
        announceToScreenReader(i18n.t('info.step6'));

        const step6 = this.audioManager.playSoundEffect('step_6');
        this.instructionText.setText(i18n.t('info.step6'));

        step6?.on('complete', () => {
            this.time.delayedCall(1000, () => {
                this.instructionText.setText('');
                this.instructionTextContainer.setVisible(false);

                if (this.resetData.parentScene !== 'GameScene') {
                    this.audioManager.playSoundEffect('hit_play');
                }

                this.createPlayButton();
            });
        });
    }

    private createGhostCar(direction: number) {
        const container = this.add.container(
            this.getScaledValue(this.display.width / 2 + 50),
            this.getScaledValue(this.display.height - 230)
        ).setDepth(1).setAlpha(0.4);

        const carKey = this.registry.get('selected_car') || 'red';
        const carImage = this.addImage(0, 0, `${carKey}_car_right`).setOrigin(0.5, 0);
        container.add([carImage]);

        const carBoard = this.addImage(0, 130, 'car_board').setOrigin(0.5);
        container.add([carBoard]);

        const carAnswerText = this.addText(0, 132, this.gameMechanic.currentQuestion?.answer || '', {
            font: '700 42px Exo',
            color: '#FFFFFF'
        }).setOrigin(0.5);
        container.add([carAnswerText]);

        const targetX = this.display.width / 2 + direction * this.gameMechanic.LANE_OFFSET;

        let rotation = 0;
        if (direction === -1) rotation = Phaser.Math.DegToRad(-15);
        else if (direction === 1) rotation = Phaser.Math.DegToRad(15);
        carImage.setRotation(rotation);

        const tween = this.tweens.add({
            targets: container,
            x: this.getScaledValue(targetX),
            duration: 1500,
            ease: 'Sine.easeInOut',
            repeat: -1
        });

        return {
            container,
            tween
        };
    }

    public startGameScene() {
        // stop audio manager
        this.isSkipped = true;
        this.destroyTimers();
        this.audioManager.stopAllSoundEffects();
        if (this.resetData.parentScene === 'GameScene') {
            // start playing bg-music
            this.audioManager.playBackgroundMusic("bg_music");
            this.scene.stop("InstructionsScene");
            this.scene.resume("GameScene");
        } else {
            this.scene.stop("InstructionsScene");
            this.scene.start("GameScene");
        }
        this.isSkipped = false;
    }

    private destroyTimers() {
        this.delayedCalls.forEach(timer => timer.destroy());
        this.delayedCalls = [];
    }

    private sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    update(_time: number, delta: number) {
        // update container size based on text length
        const textBounds = this.instructionText.getBounds();
        this.instructionTextContainer.setSize(textBounds.width + this.getScaledValue(100), textBounds.height + this.getScaledValue(40));

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

        if (this.isMovementPaused) return;

        this.gameMechanic.update(delta);
    }
}
