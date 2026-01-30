import { announceToScreenReader, BaseScene, ButtonHelper, ButtonOverlay, focusToGameContainer, i18n, TextOverlay, VolumeSlider } from "@k8-games/sdk";
import { GameMechanic } from "../GameMechanic";
import { ASSETS_PATHS, BUTTONS } from "../config/common";

export class InstructionsScene extends BaseScene {
    private gameMechanic!: GameMechanic;
    private parentScene: string = 'ChoiceScene';
    private skipBtn!: Phaser.GameObjects.Container;
    private muteBtn!: Phaser.GameObjects.Container;
    private instructionText!: Phaser.GameObjects.Text;
    private instructionTextOverlay!: TextOverlay;
    private delayedCalls: Phaser.Time.TimerEvent[] = [];
    private isSkipped: boolean = false;
    private hand!: Phaser.GameObjects.Image;
    private instructionListeners: { event: string; handler: (...args: any[]) => void }[] = [];
    private currentDigitIndex: number = 0;

    constructor() {
        super("InstructionsScene");
    }

    static _preload(scene: BaseScene) {
        const lang = i18n.getLanguage() || 'en';
        GameMechanic._preload(scene);

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/info_screen`);
        for (let step = 1; step <= 6; step++) {
            scene.load.audio(`step_${step}`, `step_${step}_${lang}.mp3`);
        }

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/info_screen`);
        scene.load.image('hand', 'hand.png');
        scene.load.image('hand_click', 'hand_click.png');
    }

    init(data: { parentScene: string }) {
        this.gameMechanic = new GameMechanic(this, true);
        this.gameMechanic.init();
        this.isSkipped = false;
        this.parentScene = data.parentScene;
    }

    create() {
        const inIframe = this.isInsideIframe();
        if (this.parentScene === 'GameScene') {
            if (inIframe) {
                // Update parent iframe label first
                window.parent.postMessage({ 
                    type: 'UPDATE_IFRAME_LABEL', 
                    label: i18n.t('info.helpPage') 
                }, '*');
            }
            focusToGameContainer();
            this.time.delayedCall(1000, () => {
                announceToScreenReader(i18n.t('info.helpPage'));
            });
        }
        
        this.addRectangle(0, 0, this.display.width, 144, 0x000000, 0.6).setOrigin(0).setDepth(5);

        const howToPlayText = this.addText(this.display.width / 2, 50, i18n.t('info.howToPlay'), {
            font: "700 30px Exo"
        }).setOrigin(0.5).setDepth(5);

        new TextOverlay(this, howToPlayText, { label: i18n.t('info.howToPlay'), tag: 'h1', role: 'heading' });

        this.instructionText = this.addText(this.display.width / 2, 105, '', {
            font: "400 24px Exo",
            align: 'center',
            wordWrap: {
                width: 870,  
            }
        }).setOrigin(0.5).setDepth(5);

        this.instructionTextOverlay = new TextOverlay(this, this.instructionText, { label: '' });

        this.createSkipButton();
        this.createMuteButton();
        this.createVolumeSlider();

        this.gameMechanic.create();

        this.gameMechanic.setNumberpadEnabled(false);

        const timer = this.time.delayedCall(1000, () => {
            this.playStep1();
        });
        this.delayedCalls.push(timer);
    }

    private updateInstructionText(text: string) {
        if (!this.instructionText) return;
        this.instructionText.setText(text);
        this.instructionTextOverlay.updateContent(text);
    }

    private playStep1() {
        if (this.isSkipped) return;

        const step1 = this.audioManager.playSoundEffect('step_1');

        this.updateInstructionText(i18n.t('info.step1'));

        const questionContainer = this.gameMechanic.questionContainer;
        this.tweens.add({
            targets: questionContainer,
            scale: 1.1,
            duration: 700,
            repeat: 1,
            yoyo: true,
            ease: 'Sine.easeInOut',
        })

        step1?.on('complete', () => {
            const timer = this.time.delayedCall(1000, () => {
                this.playStep2();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playStep2() {
        if (this.isSkipped) return;

        const step2 = this.audioManager.playSoundEffect('step_2');

        this.updateInstructionText(i18n.t('info.step2'));

        // Prepare gating for per-digit input
        const q = this.gameMechanic.getCurrentQuestion();
        const answer = q?.answer || '';
        this.currentDigitIndex = 0;

        // Enable only the first required digit
        const enableNextDigit = () => {
            if (this.currentDigitIndex >= answer.length) {
                // All digits entered, move to next step
                this.clearInstructionListeners();
                this.destroyHand();
                this.gameMechanic.setNumberpadEnabled(false);
                const timer = this.time.delayedCall(1000, () => this.playStep3());
                this.delayedCalls.push(timer);
                return;
            }
            const expectedDigit = answer[this.currentDigitIndex];
            this.gameMechanic.setAllowedKeys(new Set([expectedDigit]));
            this.enableOnlyButtons([`number_pad_btn_${expectedDigit}`]);
            const btn = this.gameMechanic.getNumpadButtonByName(`number_pad_btn_${expectedDigit}`);
            if (btn) {
                this.createHandClickAnimation(btn);
            }
        };

        this.onInstruction('instruction:digit', (digit: string) => {
            const expectedDigit = answer[this.currentDigitIndex];
            if (digit === expectedDigit) {
                this.destroyHand();
                this.currentDigitIndex += 1;
                enableNextDigit();
            }
        });

        step2?.on('complete', () => {
            enableNextDigit();
        });
    }

    private playStep3() {
        if (this.isSkipped) return;

        const step3 = this.audioManager.playSoundEffect('step_3');

        this.updateInstructionText(i18n.t('info.step3'));

        step3?.on('complete', () => {
            this.gameMechanic.setNumberpadEnabled(true);
            this.gameMechanic.setAllowedKeys(new Set(['Enter']));
            this.enableOnlyButtons(['check_button']);
            const checkBtn = this.gameMechanic.getNumpadButtonByName('check_button');
            if (checkBtn) this.createHandClickAnimation(checkBtn);

            this.onInstruction('instruction:enter', () => {
                this.destroyHand();
            });
    
            this.onInstruction('instruction:afterSubmit', () => {
                this.clearInstructionListeners();
                this.destroyHand();
                const timer = this.time.delayedCall(1000, () => {
                    this.playStep4();
                })
                this.delayedCalls.push(timer);
            });
        })
    }

    private playStep4() {
        if (this.isSkipped) return;

        const step4 = this.audioManager.playSoundEffect('step_4');

        this.updateInstructionText(i18n.t('info.step4'));

        this.gameMechanic.setNumberpadEnabled(false);

        // Animate backspace button
        const backspaceBtn = this.gameMechanic.getNumpadButtonByName('backspace_button');
        backspaceBtn?.setAlpha(1);
        this.tweens.add({
            targets: backspaceBtn,
            scale: 1.1,
            duration: 700,
            repeat: 1,
            yoyo: true,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                backspaceBtn?.setAlpha(0.5);
            }
        })

        step4?.on('complete', () => {
            this.clearInstructionListeners();
            this.destroyHand();
            const timer = this.time.delayedCall(1000, () => {
                this.playStep5();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playStep5() {
        if (this.isSkipped) return;

        const step5 = this.audioManager.playSoundEffect('step_5');

        this.updateInstructionText(i18n.t('info.step5'));

        step5?.on('complete', () => {
            const timer = this.time.delayedCall(1000, () => {
                this.playStep6();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playStep6() {
        if (this.isSkipped) return;

        this.gameMechanic.destroyNumberpad();

        if (this.parentScene === 'ChoiceScene') {
            this.audioManager.playSoundEffect('step_6');
        }

        this.createPlayButton();
    }

    private createPlayButton() {
        const playButton = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY,
            },
            text: this.parentScene === 'ChoiceScene' ? i18n.t("common.play") : i18n.t("common.back"),
            label: this.parentScene === 'ChoiceScene' ? i18n.t("common.play") : i18n.t("common.back"),
            textStyle: {
                font: "700 32px Exo",
                color: "#ffffff",
            },
            imageScale: 0.8,
            raisedOffset: 3.5,
            x: this.display.width / 2,
            y: this.display.height - 115,
            onClick: () => {
                if (this.isSkipped) return;
                this.destroyTimers();
                this.audioManager.stopAllSoundEffects();
                this.isSkipped = true;
                this.startGameScene();
            },
        });
        playButton.setDepth(20);

        ButtonHelper.startBreathingAnimation(playButton, {
            scale: 1.1,
            duration: 1000,
            ease: "Sine.easeInOut",
        });
    }

    private startGameScene() {
        if (this.parentScene === 'ChoiceScene') {
            this.audioManager.stopAllSoundEffects();
            this.scene.stop('InstructionsScene');
            this.scene.start('GameScene');
        } else {
            const inIframe = this.isInsideIframe();
            if (inIframe) {
                // Reset iframe label back to "Game" when returning to GameScene
                window.parent.postMessage({ 
                    type: 'UPDATE_IFRAME_LABEL', 
                    label: 'GameScene' 
                }, '*');
            }
            this.scene.stop('InstructionsScene');
            this.scene.resume('GameScene');
            this.audioManager.resumeAll();
        }
    }

    private isInsideIframe() {
        try {
            return window.self !== window.top;
        } catch (e) {
            console.log('Iframe error', e);
            return true;
        }
    }

    private createSkipButton() {
        this.skipBtn = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.HALF_BUTTON.KEY,
                hover: BUTTONS.HALF_BUTTON_HOVER.KEY,
                pressed: BUTTONS.HALF_BUTTON_PRESSED.KEY,
            },
            text: i18n.t("common.skip"),
            label: i18n.t("common.skip"),
            textStyle: {
                font: "700 32px Exo",
                color: "#FFFFFF",
            },
            x: this.display.width - 80,
            y: 73,
            raisedOffset: 3.5,
            onClick: () => {
                if (this.isSkipped) return;
                this.destroyTimers();
                this.audioManager.stopAllSoundEffects();
                this.isSkipped = true;
                this.startGameScene();
            },
        });
        this.skipBtn.setDepth(100);
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
            x: this.display.width - 83,
            y: 172,
            raisedOffset: 3.5,
            onClick: () => {
                this.audioManager.setMute(!this.audioManager.getIsAllMuted());
            },
        });
        this.muteBtn.setDepth(200);
    }

    private createVolumeSlider() {
        const volumeSlider = new VolumeSlider(this);
        volumeSlider.create(this.display.width - 243, 260, 'purple', i18n.t('common.volume'));
        ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.SETTINGS_ICON.KEY,
            label: i18n.t('common.volume'),
            x: this.display.width - 83,
            y: 258,
            raisedOffset: 3.5,
            onClick: () => {
                volumeSlider.toggleControl();
            },
        }).setDepth(200);
    }

    private destroyTimers() {
        this.delayedCalls.forEach(call => call.destroy());
        this.delayedCalls = [];
        this.clearInstructionListeners();
        this.destroyHand();
        this.gameMechanic.setAllowedKeys(null);
    }

    update() {
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

    // Helpers for instruction gating and animations
    private enableOnlyButtons(names: string[]) {
        const all = this.gameMechanic.getAllNumpadButtons();
        const allow = new Set(names);
        all.forEach(btn => {
            if (allow.has(btn.name)) {
                ButtonHelper.enableButton(btn);
                btn.setAlpha(1);
            } else {
                ButtonHelper.disableButton(btn);
                btn.setAlpha(0.5);
            }
        });
    }

    private createHandClickAnimation(targetButton: Phaser.GameObjects.Container) {
        this.destroyHand();
        
        // Create hand image for single click animation
        const handX = targetButton.x / this.display.scale + this.getScaledValue(50);
        const handY = targetButton.y / this.display.scale - this.getScaledValue(20);
        const hand = this.addImage(handX, handY, 'hand');
        hand.setOrigin(0.5);
        hand.setDepth(10);
        hand.setScale(0.13);
        this.hand = hand;

        // Add single click animation using both textures
        this.tweens.chain({
            targets: hand,
            repeat: -1,
            repeatDelay: 3000,
            tweens: [
                {
                    x: targetButton.x + this.getScaledValue(15),
                    y: targetButton.y + this.getScaledValue(10),
                    duration: 1000,
                    ease: "Sine.easeInOut",
                    onStart: () => {
                        if (hand && hand.active) {
                            hand.setVisible(true);
                        }
                    },
                    onComplete: () => {
                        if (hand && hand.active) {
                            hand.setTexture("hand_click");
                        }
                    }
                },
                {
                    alpha: 1,
                    duration: 500,
                    onComplete: () => {
                        if (hand && hand.active) {
                            hand.setTexture("hand");
                        }
                    }
                },
                {
                    alpha: 1,
                    duration: 500,
                    onComplete: () => {
                        if (hand && hand.active) {
                            hand.setVisible(false);
                            hand.setPosition(this.getScaledValue(handX), this.getScaledValue(handY));
                        }
                    }
                },
            ],
        });
    }

    private destroyHand() {
        if (this.hand) {
            this.hand.destroy();
            this.hand = undefined as any;
        }
    }

    private onInstruction(event: string, handler: (...args: any[]) => void) {
        this.events.on(event, handler);
        this.instructionListeners.push({ event, handler });
    }

    private clearInstructionListeners() {
        this.instructionListeners.forEach(({ event, handler }) => this.events.off(event, handler));
        this.instructionListeners = [];
    }
}
