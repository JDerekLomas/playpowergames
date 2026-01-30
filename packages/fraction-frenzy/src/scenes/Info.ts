import { BaseScene, focusToGameContainer, announceToScreenReader, ButtonHelper, ButtonOverlay, GameConfigManager, i18n, ImageOverlay, MathExpressionHelper, setSceneBackground, TextOverlay, VolumeSlider } from "@k8-games/sdk";
import { ASSETS_PATHS, BUTTONS, COMMON_ASSETS, getTopicConfig } from "../config/common";
import { FractionVisualHelper } from "../utils/FractionVisualHelper";
import { VisualType } from "../utils/CardHelper";

export class InfoScene extends BaseScene {
    private parentScene?: string;
    private volumeSlider!: VolumeSlider;
    private muteBtn!: Phaser.GameObjects.Container;
    private instructionLoopTimer?: Phaser.Time.TimerEvent;
    private hand!: Phaser.GameObjects.Image;
    private handTween!: Phaser.Tweens.Tween;
    private infoCardGlow!: Phaser.GameObjects.Image;
    private step1Rect!: Phaser.GameObjects.Graphics;
    private step2Rect!: Phaser.GameObjects.Graphics;
    private equalBtn2!: Phaser.GameObjects.Container;
    private card1Left!: Phaser.GameObjects.Image;
    private card2Left!: Phaser.GameObjects.Image;
    private card1Right!: Phaser.GameObjects.Image;
    private card2Right!: Phaser.GameObjects.Image;
    private playButton!: Phaser.GameObjects.Container;
    private readonly RECT_COLOR = 0xFBC374;
    private readonly GREY_COLOR = 0xCCCCCC;
    private isClosing: boolean = false;
    private delayedCalls: Phaser.Time.TimerEvent[] = [];
    private topic: string = 'compare_percents';
    private gameConfigManager!: GameConfigManager;

    constructor() {
        super('InfoScene')
        this.gameConfigManager = GameConfigManager.getInstance();
    }

    init(data: { parentScene: string }) {
        this.parentScene = data.parentScene;
        this.topic = this.gameConfigManager.get('topic') || 'compare_percents';
    }

    static _preload(scene: BaseScene) {
        const language = i18n.getLanguage() || "en";
        const gameConfigManager = GameConfigManager.getInstance();
        const topic = gameConfigManager.get('topic') || 'compare_percents';
        const topicConfig = getTopicConfig(topic);

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}${COMMON_ASSETS.PATH}`);
        scene.load.image(COMMON_ASSETS.EQUAL_BUTTON.KEY, COMMON_ASSETS.EQUAL_BUTTON.PATH);
        scene.load.image(COMMON_ASSETS.BACKGROUND.KEY, COMMON_ASSETS.BACKGROUND.PATH);
        scene.load.image('card_glow_error', 'card_glow_error.png');
        scene.load.image('card_glow_success', 'card_glow_success.png');
        scene.load.image('door', 'door.png');

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/info_screen`);
        scene.load.image('hand', 'hand.png');
        scene.load.image('hand_click', 'hand_click.png');

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/info_screen`);
        scene.load.audio('step_1', `step_1_${language}_${topicConfig.TYPE}.mp3`);
        scene.load.audio('step_2_1', `step_2_1_${language}_${topicConfig.TYPE}.mp3`);
        scene.load.audio('step_2_2', `step_2_2_${language}.mp3`);
        scene.load.audio('step_3', `step_3_${language}.mp3`);

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}`);
        scene.load.audio('door_close', `door_close.wav`);
    }

    private greyOutRectangle(rect: Phaser.GameObjects.Graphics) {
        const x = rect === this.step1Rect ? 42 : 669;
        rect.setDepth(1);
        rect.clear();
        rect.fillStyle(this.GREY_COLOR);
        rect.fillRoundedRect(
            this.getScaledValue(x),
            this.getScaledValue(100),
            this.getScaledValue(569),
            this.getScaledValue(529),
            this.getScaledValue(20)
        );
    }

    private highlightRectangle(rect: Phaser.GameObjects.Graphics) {
        const x = rect === this.step1Rect ? 42 : 669;
        rect.setDepth(-1);
        rect.clear();
        rect.fillStyle(this.RECT_COLOR);
        rect.fillRoundedRect(
            this.getScaledValue(x),
            this.getScaledValue(100),
            this.getScaledValue(569),
            this.getScaledValue(529),
            this.getScaledValue(20)
        );
    }

    private highlightCard(card: Phaser.GameObjects.Image) {
        const border = this.add.graphics();
        const bounds = card.getBounds();
        border.lineStyle(4, 0x2A4F4F);
        border.strokeRoundedRect(bounds.x + this.getScaledValue(2), bounds.y + this.getScaledValue(2), bounds.width - this.getScaledValue(4), bounds.height - this.getScaledValue(8), this.getScaledValue(20));

        this.tweens.add({
            targets: border,
            alpha: { from: 1, to: 0.2 },
            duration: 500,
            yoyo: true,
            repeat: 2,
            onComplete: () => {
                border.destroy();
            }
        });
    }

    createRoundedRectangle(x: number, y: number, width: number, height: number, radius: number) {
        const graphics = this.add.graphics();

        graphics.fillStyle(this.RECT_COLOR);
        graphics.fillRoundedRect(this.getScaledValue(x), this.getScaledValue(y), this.getScaledValue(width), this.getScaledValue(height), this.getScaledValue(radius));
        graphics.setAlpha(0.5);

        return graphics;
    }

    async createQuestions() {
        const topicConfig = getTopicConfig(this.topic);
        const question1 = topicConfig.INFO.QUESTION_1;
        const question2 = topicConfig.INFO.QUESTION_2;

        this.step1Rect = this.createRoundedRectangle(42, 100, 569, 529, 20);
        this.greyOutRectangle(this.step1Rect);
        this.step2Rect = this.createRoundedRectangle(669, 100, 569, 529, 20);
        this.greyOutRectangle(this.step2Rect);

        this.card1Left = this.addImage(62, 209, 'card_front').setOrigin(0).setScale(0.7);
        this.card2Left = this.addImage(349, 209, 'card_front').setOrigin(0).setScale(0.7);

        this.infoCardGlow = this.addImage(670, 185, 'card_glow_success').setOrigin(0).setScale(0.7).setAlpha(0);
        this.card1Right = this.addImage(689, 209, 'card_front').setOrigin(0).setScale(0.7);
        this.card2Right = this.addImage(976, 209, 'card_front').setOrigin(0).setScale(0.7);

        const num1 = question1.NUMERATOR;
        const den1 = question1.DENOMINATOR;
        const label1 = question1.LABEL;
        const vis1 = question1.VISUAL as VisualType;
        const num2 = question2.NUMERATOR;
        const den2 = question2.DENOMINATOR;
        const label2 = question2.LABEL;
        const vis2 = question2.VISUAL as VisualType;
        
        // first step
        const step1Text = this.addText(121, 138, i18n.t(`info.${topicConfig.TYPE}Step1`), {
            font: "500 24px Exo",
            color: '#000000',
        });
        new TextOverlay(this, step1Text, { label: i18n.t(`info.${topicConfig.TYPE}Step1`) });

        FractionVisualHelper.createVisual(this, { numerator: num1, denominator: den1 }, vis1, 184, 335, 'leftCard').setScale(0.7);
        await this.createMathExpr(this, 184, 460, 'mathjax-expression-1', label1);
        new ImageOverlay(this, this.card1Left, { label: this.getCardOverlayLabel(topicConfig.INFO.QUESTION_1.LABEL) });

        FractionVisualHelper.createVisual(this, { numerator: num2, denominator: den2 }, vis2, 470, 335, 'leftCard').setScale(0.7);
        await this.createMathExpr(this, 470, 460, 'mathjax-expression-3', label2);
        new ImageOverlay(this, this.card2Left, { label: this.getCardOverlayLabel(topicConfig.INFO.QUESTION_2.LABEL) });

        const equalBtn = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY,
            },
            text: i18n.t('game.equal'),
            textStyle: {
                font: "700 24px Exo",
                color: '#ffffff',
            },
            x: 327,
            y: 558,
            imageScale: 0.7,
            isDisabled: true,
            onClick: () => {
            }
        });

        new ImageOverlay(this, equalBtn.getAt(0) as Phaser.GameObjects.Image, { label: i18n.t('game.equal') });

        // second step
        const step2Text = this.addText(726, 125, i18n.t(`info.${topicConfig.TYPE}Step2`), {
            font: "500 24px Exo",
            color: '#000000',
            align: 'center',
            wordWrap: { width: 470 }
        });
        new TextOverlay(this, step2Text, { label: i18n.t(`info.${topicConfig.TYPE}Step2`) });

        FractionVisualHelper.createVisual(this, { numerator: num1, denominator: den1 }, vis1, 811, 335, 'rightCard').setScale(0.7);
        await this.createMathExpr(this, 811, 460, 'mathjax-expression-2', label1);
        new ImageOverlay(this, this.card1Right, { label: this.getCardOverlayLabel(topicConfig.INFO.QUESTION_1.LABEL) });

        FractionVisualHelper.createVisual(this, { numerator: num2, denominator: den2 }, vis2, 1097, 335, 'rightCard').setScale(0.7);
        await this.createMathExpr(this, 1097, 460, 'mathjax-expression-4', label2);
        new ImageOverlay(this, this.card2Right, { label: this.getCardOverlayLabel(topicConfig.INFO.QUESTION_2.LABEL) });

        this.equalBtn2 = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY,
            },
            text: i18n.t('game.equal'),
            textStyle: {
                font: "700 24px Exo",
                color: '#ffffff',
            },
            x: 954,
            y: 558,
            imageScale: 0.7,
            isDisabled: true,
            onClick: () => {
            }
        });

        new ImageOverlay(this, this.equalBtn2.getAt(0) as Phaser.GameObjects.Image, { label: i18n.t('game.equal') });
    }

    private createMathExpr(scene: BaseScene, x:number, y:number, textureKey: string, label: string ) {
        return new Promise((resolve) => {
        MathExpressionHelper.createMathExpression(scene, label, textureKey, {
                width: 150,
                height: 30,
                fontSize: 14,
            }, 
            (image) => {
                image.x = this.getScaledValue(x);
                image.y = this.getScaledValue(y);
                new ImageOverlay(this, image, { label: label });
                return resolve(void 0);
            });
        })
    }

    private getCardOverlayLabel(question: string) {
        if (question.includes('/')) {
            const [numerator, denominator] = question.split('/');
            return i18n.t('common.visualCard', { firstNumber: numerator, secondNumber: denominator });
        } else {
            return i18n.t('common.valueCard', { value: question });
        }
    }

    async create() {
        setSceneBackground('assets/images/common/bg.png');
        if (this.parentScene === 'GameScene') {
            focusToGameContainer();
            this.time.delayedCall(1000, () => {
                announceToScreenReader(i18n.t('info.helpPage'));
            })
        }
        this.addImage(this.display.width / 2, this.display.height / 2, COMMON_ASSETS.BACKGROUND.KEY).setOrigin(0.5).setDepth(-2);
        const howToPlayText = this.addText(this.display.width / 2, 55, i18n.t('info.howToPlay'), {
            font: "700 36px Exo",
            color: '#000000',
        }).setOrigin(0.5);
        new TextOverlay(this, howToPlayText, { label: i18n.t('info.howToPlay'), tag: 'h1', role: 'heading' });

        this.createMuteButton();
        this.createVolumeSlider();

        await this.createQuestions();

        this.playButton = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY,
            },
            text: i18n.t(`common.${this.parentScene === 'SplashScene' ? 'play' : 'back'}`),
            label: i18n.t(`common.${this.parentScene === 'SplashScene' ? 'play' : 'back'}`),
            textStyle: {
                font: "700 32px Exo",
                color: '#ffffff',
            },
            x: this.display.width / 2,
            y: 698,
            imageScale: 0.8,
            raisedOffset: 3.5,
            onClick: () => {
                if (this.isClosing) return;

                this.audioManager.stopAllSoundEffects();
                this.destroyTweens();
                this.destroyTimers();

                if (this.parentScene === 'SplashScene') {
                    this.isClosing = true;
                    this.closeDoors(() => {
                        this.isClosing = false;
                        this.scene.stop('InfoScene');
                        this.scene.start('GameScene');
                    });
                } else {
                    this.scene.resume('GameScene');
                    this.audioManager.setMusicMute(false);
                    this.scene.stop('InfoScene');
                }
            }
        });

        if (this.parentScene === 'SplashScene') {
            this.audioManager.initialize(this);
        } else {
            this.audioManager.setMusicMute(true);
        }

        const timer = this.time.delayedCall(1000, () => {
            this.playStep1();
        });
        this.delayedCalls.push(timer);
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

    private playStep1() {
        const step1 = this.audioManager.playSoundEffect('step_1');
        this.highlightRectangle(this.step1Rect);
        this.greyOutRectangle(this.step2Rect);
        this.highlightCard(this.card1Left);
        this.highlightCard(this.card2Left);

        step1?.on('complete', () => {
            const timer = this.time.delayedCall(1000, () => {
                this.playStep2();
            });
            this.delayedCalls.push(timer);
        })
    }

    private playStep2() {
        // Add hand animation
        const handX = ((this.card1Right.x / this.display.scale) + this.card1Right.width / 2);
        const handY = (this.card1Right.y / this.display.scale) + (this.card1Right.displayHeight / this.display.scale) - 60;
        this.hand = this.addImage(handX, handY, 'hand').setOrigin(0).setScale(0.13).setDepth(5);
        this.hand.x = this.hand.x + this.getScaledValue(200);
        this.highlightRectangle(this.step2Rect);
        this.greyOutRectangle(this.step1Rect);

        this.handTween = this.tweens.add({
            targets: this.hand,
            x: this.card1Right.x + this.card1Right.width / 2,
            y: this.hand.y,
            duration: 1000,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                this.tweens.add({
                    targets: this.infoCardGlow,
                    alpha: 1,
                    duration: 500,
                    ease: 'Back.easeIn',
                });

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
                    }
                });

                const step2_1 = this.audioManager.playSoundEffect('step_2_1');
                step2_1?.on('complete', () => {
                    this.highlightEqualBtn();
                    const step2_2 = this.audioManager.playSoundEffect('step_2_2');
                    step2_2?.on('complete', () => {
                        this.hand.setTexture('hand');
                        this.hand.setVisible(false);
                        this.handTween.stop();
                        this.handTween.destroy();
                        this.tweens.add({
                            targets: this.infoCardGlow,
                            alpha: 0,
                            duration: 500,
                            ease: 'Back.easeOut',
                        });
                        this.greyOutRectangle(this.step1Rect);
                        this.greyOutRectangle(this.step2Rect);

                        if (this.parentScene === 'SplashScene') {
                            const timer = this.time.delayedCall(1000, () => {
                                this.playStep3();
                            });
                            this.delayedCalls.push(timer);
                        } else {
                            this.instructionLoopTimer = this.time.delayedCall(5000, () => {
                                this.playStep1();
                            });
                        }
                    });
                });
            },
        });
    }

    private playStep3() {
        const step3 = this.audioManager.playSoundEffect('step_3');

        let playButtonTween: Phaser.Tweens.Tween;

        if (this.parentScene === 'SplashScene') {
            playButtonTween = ButtonHelper.startBreathingAnimation(this.playButton, {
                scale: 1.1,
                duration: 1000,
                ease: 'Sine.easeInOut'
            });
        }

        step3?.on('complete', () => {
            this.instructionLoopTimer = this.time.delayedCall(5000, () => {
                if (this.parentScene === 'SplashScene') {
                    ButtonHelper.stopBreathingAnimation(playButtonTween, this.playButton);
                }
                this.playStep1();
            });
        });
    }

    private destroyTweens() {
        // Stop and destroy any active tween
        if (this.handTween) {
            this.handTween.stop();
            this.handTween.destroy();
        }

        // Stop the instruction loop timer
        if (this.instructionLoopTimer) {
            this.instructionLoopTimer.destroy();
            this.instructionLoopTimer = undefined;
        }

        // Reset all game objects to their initial state
        if (this.hand) {
            this.hand.destroy();
        }

        // Stop any playing audio
        this.audioManager.stopAllSoundEffects();
    }

    private highlightEqualBtn() {
        const btn = this.equalBtn2.getAt(0) as Phaser.GameObjects.Image;

        const border = this.add.graphics();
        const bounds = btn.getBounds();
        border.lineStyle(4, 0x5025a3);
        border.strokeRoundedRect(bounds.x - this.getScaledValue(2), bounds.y - this.getScaledValue(2), bounds.width + this.getScaledValue(4), bounds.height + this.getScaledValue(4), this.getScaledValue(10));

        this.tweens.add({
            targets: border,
            alpha: { from: 1, to: 0.2 },
            duration: 500,
            yoyo: true,
            repeat: 2,
            onComplete: () => {
                border.destroy();
            }
        });
    }

    private createVolumeSlider() {
        this.volumeSlider = new VolumeSlider(this);
        this.volumeSlider.create(this.display.width - 220, 160, 'blue', i18n.t('common.volume')).setDepth(1);
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
            y: 142,
            raisedOffset: 3.5,
            onClick: () => {
                this.volumeSlider.toggleControl();
            },
        }).setDepth(5);
    }

    private createMuteButton() {
        this.muteBtn = ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: this.audioManager.getIsAllMuted() ? BUTTONS.MUTE_ICON.KEY : BUTTONS.UNMUTE_ICON.KEY,
            label: i18n.t('common.mute'),
            ariaLive: 'off',
            x: this.display.width - 54,
            y: 66,
            raisedOffset: 3.5,
            onClick: () => {
                this.audioManager.setMute(!this.audioManager.getIsAllMuted());
                const icon = this.muteBtn.getAt(1) as Phaser.GameObjects.Sprite;
                icon.setTexture(this.audioManager.getIsAllMuted() ? BUTTONS.MUTE_ICON.KEY : BUTTONS.UNMUTE_ICON.KEY);
            },
        }).setDepth(5);

        const handleMuteBtnUpdate = () => {
            const muteBtnItem = this.muteBtn.getAt(1) as Phaser.GameObjects.Sprite;
            muteBtnItem.setTexture(this.audioManager.getIsAllMuted() ? BUTTONS.MUTE_ICON.KEY : BUTTONS.UNMUTE_ICON.KEY);

            // Update mute button state
            const label = this.audioManager.getIsAllMuted() ? i18n.t('common.unmute') : i18n.t('common.mute');
            const overlay = (this.muteBtn as any).buttonOverlay as ButtonOverlay;
            const muteBtnState = this.muteBtn.getData('state');
            if(muteBtnState != label) {
                this.muteBtn.setData('state', label);
                overlay.setLabel(label);
            }
        }
        // Add update event listener to the mute button
        this.events.on("update", handleMuteBtnUpdate);
        // Remove event listener when mute button is destroyed
        this.muteBtn.on("destroy", () => {
            this.events.off("update", handleMuteBtnUpdate);
        });
    }

    private closeDoors(cb?: () => void) {
        const doorLeft = this.addImage(0, this.display.height / 2, 'door').setOrigin(1, 0.5).setDepth(100);
        const doorRight = this.addImage(this.display.width, this.display.height / 2, 'door').setOrigin(0, 0.5).setFlipX(true).setDepth(100);

        this.audioManager.playSoundEffect('door_close');
        this.tweens.add({
            targets: doorLeft,
            x: this.getScaledValue(this.display.width / 2),
            duration: 1000,
            ease: 'Power2'
        });
        this.tweens.add({
            targets: doorRight,
            x: this.getScaledValue(this.display.width / 2),
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                this.audioManager.stopSoundEffect('door_close');
                cb?.();
            }
        });
    }
}