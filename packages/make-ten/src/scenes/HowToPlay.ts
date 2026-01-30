
import { GameLogic } from "../GameLogic";
import { NumberPad } from "../components/NumberPad";
import { CirclesDisplay } from "../components/CirclesDisplay";
import { MuteButton } from "../components/MuteButton";
import { HowToPlaySceneConfig as Config } from "../config/HowToPlaySceneConfig";
import { AssetsConfig } from "../config/AssetsConfig";
import { announceToScreenReader, BaseScene, ButtonHelper, focusToGameContainer, GameConfigManager, setSceneBackground, TextOverlay, VolumeSlider } from "@k8-games/sdk";
import { i18n } from "@k8-games/sdk";
import { DoorUtils } from "../utils/DoorUtils";

export class HowToPlay extends BaseScene {
    private title: Phaser.GameObjects.Text;
    private subtitle: Phaser.GameObjects.Text;
    private example: Phaser.GameObjects.Text;
    private muteButton: MuteButton;
    private gameLogic: GameLogic;
    private numberPad: NumberPad;
    private circlesDisplay: CirclesDisplay;
    private parentScene: string;
    private volumeSlider: VolumeSlider;
    private hand!: Phaser.GameObjects.Image;
    private handTween!: Phaser.Tweens.Tween;
    private greenText!: Phaser.GameObjects.Text;
    private equationContainer!: Phaser.GameObjects.Container;
    private inputBox!: Phaser.GameObjects.Rectangle;
    private playBtn!: Phaser.GameObjects.Container | undefined;
    private delayedCalls: Phaser.Time.TimerEvent[] = [];
    private mode: string;
    private question: {
        operand1: number;
        operand2: number
        answer: number;
    }
    private inputBuffer: string = "";
    private clickedNumber: string = "";
    private isSkipped: boolean = false;

    constructor() {
        super("HowToPlay");
        const gameConfigManager = GameConfigManager.getInstance();
        this.mode = gameConfigManager.get('mode') || 'make_ten';

        if (this.mode === 'make_20') {
            this.question = {
                operand1: 10,
                operand2: 10,
                answer: 20,
            };
        } else {
            this.question = {
                operand1: 6,
                operand2: 4,
                answer: 10,
            };
        }

        this.gameLogic = new GameLogic(this.question.operand1, 1);
    }

    init(data: { parentScene: string }) {
        this.parentScene = data.parentScene || "";

        // Reset game state when coming from GameScene
        if (this.parentScene === 'GameScene') {
            this.gameLogic = new GameLogic(this.question.operand1, 1);
            if (this.circlesDisplay) {
                this.circlesDisplay.clear();
            }
        }
        this.isSkipped = false;
        this.inputBuffer = "";
        this.clickedNumber = "";
    }

    create() {
        if (this.parentScene === 'GameScene') {
            focusToGameContainer();
            this.time.delayedCall(1000, () => {
                announceToScreenReader(i18n.t('howToPlay.helpPage'));
            })
        }

        this.setupBackground();
        this.createTitleAndSubtitle();
        this.createExample();
        this.createCirclesDisplay();
        this.createEquation();
        this.createSkipButton();
        this.createMuteButton();
        this.createVolumeSliderButton();
        this.createNumberPad();
        // Update mute button icon to reflect current state
        this.updateMuteButton();

        this.numberPad.disableButtons();

        if (this.parentScene === 'StartScene') {
            this.audioManager.initialize(this);
        } else {
            this.audioManager.setMusicMute(true);
        }

        const timer = this.time.delayedCall(1000, () => {
            this.playStep1();
        });
        this.delayedCalls.push(timer);

        // Add focus to mute button for accessibility
        const buttonContainer = this.muteButton.getButtonContainer();
        const buttonOverlay = (buttonContainer as any).buttonOverlay;
        if (buttonOverlay && buttonOverlay.element) {
            buttonOverlay.element.focus();
        }
    }

    private setupBackground() {
        setSceneBackground('assets/images/game-scene-background.png');
        this.addImage(
            Config.GAME_SCENE_BACKGROUND.POSITION.X,
            Config.GAME_SCENE_BACKGROUND.POSITION.Y,
            AssetsConfig.KEYS.IMAGES.GAME_SCENE_BACKGROUND
        )
            .setScale(Config.GAME_SCENE_BACKGROUND.SCALE)
            .setOrigin(0.5);

        this.addImage(
            Config.HOW_TO_PLAY_RECTANGLE.POSITION.X,
            Config.HOW_TO_PLAY_RECTANGLE.POSITION.Y,
            AssetsConfig.KEYS.IMAGES.HOW_TO_PLAY_RECTANGLE
        )
            .setTint(Config.HOW_TO_PLAY_RECTANGLE.TINT)
            .setOrigin(0.5);

        this.addRectangle(
            Config.RECTANGLE.POSITION.X,
            Config.RECTANGLE.POSITION.Y,
            Config.RECTANGLE.SIZE.WIDTH,
            Config.RECTANGLE.SIZE.HEIGHT,
            undefined,
            0
        )
            .setOrigin(0.5);

        this.cameras.main.setBackgroundColor(Config.CAMERA.BACKGROUND_COLOR);
    }

    private createTitleAndSubtitle() {
        this.title = this.addText(
            Config.TITLE.POSITION.X,
            Config.TITLE.POSITION.Y,
            i18n.t("howToPlay.title"),
            {
                fontFamily: Config.TITLE.STYLE.FONT_FAMILY,
                fontSize: Config.TITLE.STYLE.FONT_SIZE,
                color: Config.TITLE.STYLE.COLOR,
                align: Config.TITLE.STYLE.ALIGN,
                fontStyle: "bold"
            }
        ).setOrigin(0.5);

        new TextOverlay(this, this.title, { label: i18n.t("howToPlay.title"), tag: "h1", role: "heading" });

        const targetText = this.mode === 'make_ten' ? '10' : '20';
        this.subtitle = this.addText(
            Config.SUBTITLE.POSITION.X,
            Config.SUBTITLE.POSITION.Y,
            i18n.t("howToPlay.subtitle", { target: targetText }),
            {
                fontFamily: Config.SUBTITLE.STYLE.FONT_FAMILY,
                fontSize: Config.SUBTITLE.STYLE.FONT_SIZE,
                color: Config.SUBTITLE.STYLE.COLOR,
                align: Config.SUBTITLE.STYLE.ALIGN,
            }
        ).setOrigin(0.5);

        new TextOverlay(this, this.subtitle, { label: i18n.t("howToPlay.subtitle", { target: targetText }), tag: "h2", role: "heading" });
    }

    private createExample() {
        this.example = this.addText(
            this.mode === 'make_20' ? 176 : Config.EXAMPLE.POSITION.X,
            Config.EXAMPLE.POSITION.Y,
            i18n.t("common.example"),
            {
                fontFamily: Config.EXAMPLE.STYLE.FONT_FAMILY,
                fontSize: Config.EXAMPLE.STYLE.FONT_SIZE,
                color: Config.EXAMPLE.STYLE.COLOR,
            }
        );

        new TextOverlay(this, this.example, { label: i18n.t("common.example") });
    }

    private createMuteButton() {
        this.muteButton = new MuteButton(
            this,
            Config.MUTE_BUTTON.POSITION.X,
            Config.MUTE_BUTTON.POSITION.Y
        );
    }

    private createVolumeSliderButton() {
        this.volumeSlider = new VolumeSlider(this);
        this.volumeSlider.create(this.display.width - 220, 266, 'purple', i18n.t('common.volume'));
        ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: AssetsConfig.KEYS.BUTTONS.ICON_BTN,
                hover: AssetsConfig.KEYS.BUTTONS.ICON_BTN_HOVER,
                pressed: AssetsConfig.KEYS.BUTTONS.ICON_BTN_PRESSED,
            },
            icon: AssetsConfig.KEYS.BUTTONS.VOLUME_CONTROL_ICON,
            label: i18n.t("common.volume"),
            x: this.display.width - 54,
            y: 246,
            onClick: () => {
                this.volumeSlider.toggleControl();
            },
            raisedOffset: 3.5,
        });
    }

    private createCirclesDisplay() {
        this.circlesDisplay = new CirclesDisplay(this, this.gameLogic);
        this.circlesDisplay.create({
            x: this.mode === 'make_20' ? 379 : Config.CIRCLES_DISPLAY.POSITION.X,
            y: Config.CIRCLES_DISPLAY.POSITION.Y,
            totalCircles: this.mode === 'make_20' ? 20 : 10,
            maxCirclesPerRow: this.mode === 'make_20' ? 10 : 5,
        });
    }

    private createEquation() {
        this.equationContainer = this.add.container(
            this.getScaledValue(this.display.width / 2),
            this.getScaledValue(Config.EQUATION.POSITION.Y)
        );

        const gap = 7;

        const equation = this.addText(
            0,
            0,
            `${this.gameLogic.getFirstNumber().toString()} + `,
            {
                fontFamily: Config.EQUATION.STYLE.FONT_FAMILY,
                fontSize: Config.EQUATION.STYLE.FONT_SIZE,
                color: Config.EQUATION.STYLE.COLOR,
                align: Config.EQUATION.STYLE.ALIGN,
                fontStyle: Config.EQUATION.STYLE.FONT_STYLE,
            }
        ).setOrigin(0, 0.5);

        // box for the green text
        this.inputBox = this.addRectangle(
            0,
            -2,
            50,
            50,
        )
            .setOrigin(0, 0.5)
            .setStrokeStyle(this.getScaledValue(2), 0xffffff);

        this.inputBox.setX(equation.getBounds().right + this.getScaledValue(gap));

        this.greenText = this.addText(
            0,
            0,
            '',
            {
                fontFamily: Config.EQUATION.STYLE.FONT_FAMILY,
                fontSize: Config.EQUATION.STYLE.FONT_SIZE,
                color: "#00FF77",
                align: Config.EQUATION.STYLE.ALIGN,
                fontStyle: Config.EQUATION.STYLE.FONT_STYLE,
            }
        ).setOrigin(0.5);

        this.greenText.setX(this.inputBox.getBounds().centerX);

        const normalText = this.addText(
            0,
            0,
            ` = ${i18n.formatNumber(this.question.answer)}`,
            {
                fontFamily: Config.NORMAL_TEXT.STYLE.FONT_FAMILY,
                fontSize: Config.NORMAL_TEXT.STYLE.FONT_SIZE,
                color: Config.NORMAL_TEXT.STYLE.COLOR,
                align: Config.NORMAL_TEXT.STYLE.ALIGN,
                fontStyle: Config.NORMAL_TEXT.STYLE.FONT_STYLE,
            }
        ).setOrigin(0, 0.5);

        normalText.setX(this.inputBox.getBounds().right + this.getScaledValue(gap));

        this.equationContainer.add([equation, this.inputBox, this.greenText, normalText]);

        this.equationContainer.setSize(
            normalText.getBounds().right - equation.getBounds().left,
            normalText.getBounds().height
        );

        this.equationContainer.setPosition(
            this.getScaledValue(this.display.width / 2) - this.equationContainer.width / 2,
            this.getScaledValue(Config.EQUATION.POSITION.Y)
        );
        
        new TextOverlay(this, equation, { label: i18n.t("common.question", { number: i18n.formatNumberForScreenReader(this.question.operand1), target: this.mode === 'make_20' ? "20" : "10" }) });
    }

    private resetTutorial() {
        this.gameLogic = new GameLogic(this.question.operand1, 1);
        this.circlesDisplay.clear();
        this.createCirclesDisplay();
        this.greenText.setText('');
        this.clickedNumber = "";
        this.resetHandAnimation();
    }

    private createNumberPad() {
        this.numberPad = new NumberPad(this, (number: number) => {
            this.inputBuffer += number.toString();
            this.greenText.setText(this.inputBuffer);
            this.clickedNumber = number.toString();

            if (this.inputBuffer.length !== this.question.operand2.toString().length) {
                return;
            }

            this.gameLogic.setSecondNumber(parseInt(this.inputBuffer, 10));
            this.circlesDisplay.update();
            if (this.gameLogic.isCorrect()) {
                this.playStep4OnComplete();
                this.numberPad.disableButtons();
                this.createPlayButton();
                this.inputBuffer = "";
            } else {
                this.time.delayedCall(1000, () => {
                    this.resetTutorial();
                    this.inputBuffer = "";
                });
            }
        }, this.mode === 'make_20' ? () => this.handleBackspace() : undefined);
        this.numberPad.create({
            x: Config.NUMBER_PAD.POSITION.X,
            y: Config.NUMBER_PAD.POSITION.Y,
            padding: Config.NUMBER_PAD.PADDING,
            buttonBottomPadding: Config.NUMBER_PAD.BUTTON_BOTTOM_PADDING,
        });
    }

    private handleBackspace() {
        if (this.question.operand2.toString().length > 1) {
            this.inputBuffer = this.inputBuffer.slice(0, -1);
        }
        this.resetTutorial();
        this.greenText.setText(this.inputBuffer);
    }

    private createPlayButton() {
        this.playBtn = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: AssetsConfig.KEYS.BUTTONS.DEFAULT,
                hover: AssetsConfig.KEYS.BUTTONS.HOVER,
                pressed: AssetsConfig.KEYS.BUTTONS.PRESSED,
            },
            text: i18n.t(`common.${this.parentScene === 'StartScene' ? 'play' : 'back'}`),
            label: i18n.t(`common.${this.parentScene === 'StartScene' ? 'play' : 'back'}`),
            textStyle: {
                font: Config.PLAY_TEXT.STYLE.FONT,
                color: Config.PLAY_TEXT.STYLE.COLOR,
            },
            x: Config.PLAY_BUTTON.POSITION.X,
            y: Config.PLAY_BUTTON.POSITION.Y,
            onClick: () => {
                this.moveToGameScene();
            },
            imageScale: 0.8,
            raisedOffset: 3.5,
        });
    }

    private moveToGameScene() {
        if (this.isSkipped) return;
        this.isSkipped = true;

        if (this.playBtn) {
            this.playBtn?.removeInteractive();
            const overlay = (this.playBtn as any).buttonOverlay;
            overlay.cleanup();
        }
        this.audioManager.stopAllSoundEffects();
        this.destroyTimers();
        if (this.parentScene === 'StartScene') {
            const doorUtils = new DoorUtils(this);
            doorUtils.closeDoors(() => {
                this.startGame();
            });
        } else {
            this.startGame();
        }
    }

    private startGame() {
        this.destroyTweens();

        if (this.parentScene === "GameScene") {
            this.scene.resume("GameScene");
            this.scene.stop();
            this.audioManager.setMusicMute(false);
        } else {
            this.scene.start("GameScene");
            this.scene.stop();
            this.audioManager.playBackgroundMusic(AssetsConfig.KEYS.AUDIO.MUSIC_LOOP);
        }
    }

    private playStep1() {
        if (this.isSkipped) return;

        this.numberPad.disableButtons();
        this.gameLogic = new GameLogic(this.question.operand1, 1);
        this.circlesDisplay.clear();
        this.createCirclesDisplay();
        this.greenText.setText('');
        this.clickedNumber = "";

        const step1 = this.audioManager.playSoundEffect('step_1');

        step1?.on('complete', () => {
            const timer = this.time.delayedCall(1000, () => {
                this.animateYellowCounters();
            });
            this.delayedCalls.push(timer);
        })
    }

    private animateYellowCounters() {
        let currentCount = 0;
        const totalCounts = this.question.operand1;
        const interval = 800;

        const playNextCount = () => {
            if (currentCount < totalCounts) {
                this.audioManager.playSoundEffect(`count${currentCount + 1}`);

                this.circlesDisplay.popCircle(currentCount);

                currentCount++;

                const timer = this.time.delayedCall(interval, playNextCount);
                this.delayedCalls.push(timer);
            } else {
                const timer = this.time.delayedCall(1000, () => {
                    this.playStep2();
                });
                this.delayedCalls.push(timer);
            }
        }

        playNextCount();
    }

    private playStep2() {
        if (this.isSkipped) return;

        const step2 = this.audioManager.playSoundEffect('step_2');

        step2?.on('complete', () => {
            for (let i = this.question.operand1; i < this.question.answer; i++) {
                this.circlesDisplay.pulseCircle(i);
                // this.circlesDisplay.glowCircle(i);
            }
            const timer = this.time.delayedCall(2000, () => {
                this.playStep3();
            });
            this.delayedCalls.push(timer);
        })
    }

    private playStep3() {
        if (this.isSkipped) return;

        const step3 = this.audioManager.playSoundEffect('step_3');
        this.animateEquation();

        step3?.on('complete', () => {
            const timer = this.time.delayedCall(1000, () => {
                this.playStep4();
            });
            this.delayedCalls.push(timer);
        })
    }

    private animateEquation() {
        this.tweens.add({
            targets: this.equationContainer,
            alpha: { from: 0, to: 1 },
            duration: 1500,
            ease: 'Linear',
            onComplete: () => {
                this.tweens.add({
                    targets: this.inputBox,
                    alpha: { from: 1, to: 0 },
                    duration: 500,
                    yoyo: true,
                })
            }
        })
    }

    private playStep4() {
        if (this.isSkipped) return;

        this.numberPad.enableButtons();
        this.audioManager.playSoundEffect('step_4');
        
        // Add hand animation
        this.clickedNumber = "";
        this.resetHandAnimation();
    }

    private resetHandAnimation() {
        if (this.hand) {
            this.hand.destroy();
        }
        if (this.handTween) {
            this.handTween.stop();
            this.handTween.destroy();
        }

        for (let i=0; i<=9; i++) {
            this.numberPad.resetButtonHighlight(i);
        }

        if (this.question.operand2.toString().length === 1) {
            this.playHandAnimationOnNumber(this.question.operand2);
        } else {
            this.playHandAnimationOnNumber(Number(this.question.operand2.toString()[0]), () => {
                this.playHandAnimationOnNumber(Number(this.question.operand2.toString()[1]));
            });
        }
    }

    private playHandAnimationOnNumber(number: number, onCorrect?: () => void) {
        const buttonContainer = this.numberPad.getButtonContainer(number);
        let handX = 565;
        let handY = 448;
        if (buttonContainer) {
            handX = buttonContainer.x / this.display.scale - 10;
            handY = buttonContainer.y / this.display.scale - 10;
        }
        this.hand = this.addImage(handX, handY, 'hand').setOrigin(0).setScale(0.13);
        this.hand.x = this.hand.x + this.getScaledValue(200);
        this.hand.setDepth(5);

        this.handTween = this.tweens.add({
            targets: this.hand,
            x: this.hand.x - this.getScaledValue(200),
            y: this.hand.y,
            duration: 1000,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                // Highlight button 4
                this.numberPad.highlightButton(number);

                // Chain a scale animation after the movement completes
                this.handTween = this.tweens.add({
                    targets: { progress: 0 },
                    progress: 1,
                    duration: 800,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut',
                    onUpdate: () => {
                        const target = this.handTween.targets[0] as { progress: number };
                        if (target.progress < 0.5) {
                            this.hand.setTexture('hand_click');
                        } else {
                            this.hand.setTexture('hand');
                        }

                        if (this.clickedNumber === number.toString()) {
                            this.hand.setTexture('hand');
                            this.hand.setVisible(false);
                            this.handTween.stop();
                            this.handTween.destroy();
                            this.numberPad.resetButtonHighlight(number);
                            this.clickedNumber = "";
                            onCorrect?.();
                        }
                    }
                });
            },
        });
    }

    private playStep4OnComplete() {
        if (this.isSkipped) return;

        // Reset button 4 highlight
        if (this.parentScene === 'StartScene') {
            const timer = this.time.delayedCall(1000, () => {
                this.playStep5();
            });
            this.delayedCalls.push(timer);
        } else {
            const timer = this.time.delayedCall(5000, () => {
                this.playStep1();
            });
            this.delayedCalls.push(timer);
        }
    }

    private playStep5() {
        this.audioManager.stopSoundEffect('step_4');
        const step5 = this.audioManager.playSoundEffect('step_5');

        let playButtonTween: Phaser.Tweens.Tween;
        if (this.parentScene === 'StartScene' && this.playBtn) {
            playButtonTween = ButtonHelper.startBreathingAnimation(this.playBtn, {
                scale: 1.1,
                duration: 1000,
                ease: 'Sine.easeInOut'
            });
        }

        step5?.on('complete', () => {
            const timer = this.time.delayedCall(5000, () => {
                if (this.parentScene === 'StartScene' && this.playBtn) {
                    ButtonHelper.stopBreathingAnimation(playButtonTween, this.playBtn);
                }
                this.playStep1();
            });
            this.delayedCalls.push(timer);
        });
    }

    private createSkipButton() {
        ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: 'half_button_default',
                hover: 'half_button_hover',
                pressed: 'half_button_pressed',
            },
            text: i18n.t('common.skip'),
            label: i18n.t('common.skip'),
            textStyle: {
                font: "700 32px Exo",
                color: '#FFFFFF',
            },
            x: this.display.width - 54,
            y: 80,
            onClick: () => {
                this.moveToGameScene();
            }
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

        if (this.playBtn) {
            this.playBtn.destroy();
            this.playBtn = undefined;
        }
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

    /**
     * Update the mute button icon to reflect the current mute state
     */
    private updateMuteButton() {
        if (this.muteButton) {
            this.muteButton.updateIcon(this);
        }
    }

    shutdown() {
        this.audioManager.stopAllSoundEffects();
        this.destroyTimers();
    }
}
