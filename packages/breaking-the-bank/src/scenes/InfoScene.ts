import { announceToScreenReader, BaseScene, ButtonHelper, ButtonOverlay, focusToGameContainer, GameConfigManager, i18n, setSceneBackground, TextOverlay, TweenAnimations, VolumeSlider } from '@k8-games/sdk';
import { ASSETS_PATHS, BUTTONS, COMMON_ASSETS } from '../config/common';
import { SortingInfo } from '../components/SortingInfo';
import { CountingInfo } from '../components/CountingInfo';

export class InfoScene extends BaseScene {
    private mode: 'sorting' | 'counting' = 'counting';
    private parentScene?: string;
    private volumeSlider!: VolumeSlider;
    private muteButton!: Phaser.GameObjects.Container;
    private sortingCoinElements: { nameText: Phaser.GameObjects.Text; coinImage: Phaser.GameObjects.Image; coinTray: Phaser.GameObjects.Image; valueText: Phaser.GameObjects.Text }[] = [];
    private countingCoinElements: { nameText: Phaser.GameObjects.Text; image: Phaser.GameObjects.Image; valueText: Phaser.GameObjects.Text }[] = [];
    private countingInputText!: Phaser.GameObjects.Text;
    private countingInputTextOverlay!: TextOverlay;
    private countingCheckButton!: Phaser.GameObjects.Container;
    private countingClearButton!: Phaser.GameObjects.Container;
    private inputBox!: Phaser.GameObjects.Image;
    private numpadButtons: Phaser.GameObjects.Image[] = [];
    private numpadTexts: Phaser.GameObjects.Text[] = [];
    private plusTexts: Phaser.GameObjects.Text[] = [];
    private instructionLoopTimer?: Phaser.Time.TimerEvent;
    private hand!: Phaser.GameObjects.Image;
    private handTween!: Phaser.Tweens.Tween;
    private playButton!: Phaser.GameObjects.Container;
    private isClosing: boolean = false;
    private delayedCalls: Phaser.Time.TimerEvent[] = [];
    private gameConfigManager!: GameConfigManager;

    constructor() {
        super('InfoScene');
        this.gameConfigManager = GameConfigManager.getInstance();
    }

    static _preload(scene: BaseScene) {
        const language = i18n.getLanguage() || "en";
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/info_screen`);
        scene.load.image('info_coin_tray', 'info_coin_tray.png');
        scene.load.image('counting_input', 'counting_input.png');
        scene.load.image('counting_num_button', 'counting_num_button.png');
        scene.load.image('counting_clear_button', 'counting_clear_button.png');
        scene.load.image('counting_check_button', 'counting_check_button.png');
        scene.load.image('hand', 'hand.png');
        scene.load.image('hand_click', 'hand_click.png');
        scene.load.image('correct_icon', 'correct_icon.png');
        scene.load.image('pointing_hand', 'pointing_hand.png');

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}${COMMON_ASSETS.PATH}`);
        scene.load.image(COMMON_ASSETS.BACKGROUND.KEY, COMMON_ASSETS.BACKGROUND.PATH);
        scene.load.image(COMMON_ASSETS.QUARTER.KEY, COMMON_ASSETS.QUARTER.PATH);
        scene.load.image(COMMON_ASSETS.NICKEL.KEY, COMMON_ASSETS.NICKEL.PATH);
        scene.load.image(COMMON_ASSETS.DIME.KEY, COMMON_ASSETS.DIME.PATH);
        scene.load.image(COMMON_ASSETS.PENNY.KEY, COMMON_ASSETS.PENNY.PATH);
        scene.load.image(COMMON_ASSETS.QUARTER_GRP.KEY, COMMON_ASSETS.QUARTER_GRP.PATH);
        scene.load.image(COMMON_ASSETS.NICKEL_GRP.KEY, COMMON_ASSETS.NICKEL_GRP.PATH);
        scene.load.image(COMMON_ASSETS.DIME_GRP.KEY, COMMON_ASSETS.DIME_GRP.PATH);
        scene.load.image(COMMON_ASSETS.PENNY_GRP.KEY, COMMON_ASSETS.PENNY_GRP.PATH);
        scene.load.image(COMMON_ASSETS.DOOR.KEY, COMMON_ASSETS.DOOR.PATH);

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}`);
        scene.load.audio('door_close', 'door_close.wav');

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/info_screen/sorting`);
        scene.load.audio('sort_step_1', `step_1_${language}.mp3`);
        scene.load.audio('sort_step_2_1', `step_2_1_${language}.mp3`);
        scene.load.audio('sort_step_2_2', `step_2_2_${language}.mp3`);
        scene.load.audio('sort_step_2_3', `step_2_3_${language}.mp3`);
        scene.load.audio('sort_step_2_4', `step_2_4_${language}.mp3`);
        scene.load.audio('sort_step_3', `step_3_${language}.mp3`);
        scene.load.audio('sort_step_4', `step_4_${language}.mp3`);

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/info_screen/counting`);
        scene.load.audio('count_step_1', `step_1_${language}.mp3`);
        scene.load.audio('count_step_2_1', `step_2_1_${language}.mp3`);
        scene.load.audio('count_step_2_2', `step_2_2_${language}.mp3`);
        scene.load.audio('count_step_2_3', `step_2_3_${language}.mp3`);
        scene.load.audio('count_step_2_4', `step_2_4_${language}.mp3`);
        scene.load.audio('count_step_3', `step_3_${language}.mp3`);
        scene.load.audio('count_step_4', `step_4_${language}.mp3`);
        scene.load.audio('count_step_5', `step_5_${language}.mp3`);

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/info_screen`);
        scene.load.audio('last_step', `last_step_${language}.mp3`);
    }

    init(data?: { parentScene?: string, mode?: 'sorting' | 'counting' }) {
        this.mode = data?.mode || (this.gameConfigManager.get('mode') === 'sorting' ? 'sorting' : 'counting');
        this.parentScene = data?.parentScene;
    }

    create() {
        setSceneBackground('assets/images/splash_screen/splash_screen_bg.png');

        if (this.parentScene === 'GameScene') {
            focusToGameContainer();
            this.time.delayedCall(1000, () => {
                announceToScreenReader(i18n.t('info.helpPage'));
            })
        }

        this.addImage(this.display.width / 2, this.display.height / 2, COMMON_ASSETS.BACKGROUND.KEY).setOrigin(0.5);

        this.addRectangle(this.display.width / 2, 69.5, this.display.width, 139, 0xFBC374, 0.5);
        if (this.mode === 'sorting') {
            this.sortingCoinElements = SortingInfo.createInfo(this);
        } else {
            const countingInfo = CountingInfo.createInfo(this);
            this.countingCoinElements = countingInfo.coinElements;
            this.countingInputText = countingInfo.inputElements.inputText;
            this.countingInputTextOverlay = countingInfo.inputElements.inputTextOverlay;
            this.countingCheckButton = countingInfo.inputElements.checkButtonContainer;
            this.countingClearButton = countingInfo.inputElements.clearButtonContainer;
            this.inputBox = countingInfo.inputElements.inputBox;
            this.numpadButtons = countingInfo.inputElements.numpadButtons;
            this.numpadTexts = countingInfo.inputElements.numpadTexts;
        }

        this.addRectangle(this.display.width / 2, this.display.height - 69.5, this.display.width, 139, 0xFBC374, 0.5);

        this.createMuteButton();
        this.createSettingsButton();

        this.playButton = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY
            },
            text: this.parentScene ? i18n.t('common.back') : i18n.t('common.play'),
            label: this.parentScene ? i18n.t('common.back') : i18n.t('common.play'),
            textStyle: {
                font: "700 32px Exo",
                color: '#ffffff',
            },
            imageScale: 0.8,
            x: this.display.width / 2,
            y: this.display.height - 80,
            onClick: () => {
                if (this.isClosing) return;

                this.destroyTimers();
                this.audioManager.stopAllSoundEffects();
                this.destroyTweens();

                if (!this.parentScene) {
                    this.isClosing = true;
                    this.closeDoors(() => {
                        this.scene.start('GameScene');
                        this.isClosing = false;
                    });
                } else {
                    this.scene.stop();
                    this.audioManager.setMusicMute(false);
                    this.scene.resume(this.parentScene);
                }
            }
        });

        if (!this.parentScene) {
            this.audioManager.initialize(this);
        } else {
            this.audioManager.setMusicMute(true);
        }

        const timer = this.time.delayedCall(1000, () => {
            if (this.mode === 'sorting') {
                this.playSortingStep1();
            } else {
                this.playCountingStep1();
            }
        });
        this.delayedCalls.push(timer);
    }

    private playSortingStep1() {
        const step1 = this.audioManager.playSoundEffect('sort_step_1');

        step1?.on('complete', () => {
            for (let i = 0; i < 4; i++) {
                this.sortingCoinElements[i].nameText.setAlpha(0.5);
                this.sortingCoinElements[i].coinImage.setAlpha(0.5);
                this.sortingCoinElements[i].coinTray.setAlpha(0.5);
                this.sortingCoinElements[i].valueText.setAlpha(0.5);
            }

            const timer = this.time.delayedCall(1000, () => {
                this.playSortingStep2();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playSortingStep2() {
        let currentIndex = 0;
        const interval = 1000;

        const playNextCoin = () => {
            if (currentIndex < 4) { // 4 coin types: quarter, dime, nickel, penny
                const step = this.audioManager.playSoundEffect(`sort_step_2_${currentIndex + 1}`);
                const currentCoinElement = this.sortingCoinElements[currentIndex];
                const originalScale = currentCoinElement.valueText.scaleX;

                this.tweens.add({
                    targets: [currentCoinElement.nameText, currentCoinElement.coinImage, currentCoinElement.coinTray, currentCoinElement.valueText],
                    alpha: 1,
                    duration: 500,
                    ease: 'Power2'
                });

                // Scale up value text
                this.tweens.add({
                    targets: currentCoinElement.valueText,
                    scaleX: originalScale * 1.2,
                    scaleY: originalScale * 1.2,
                    duration: 500,
                    ease: 'Back.easeOut',
                });

                // Reset effects after audio completes
                step?.on('complete', () => {
                    // Reset coin tint
                    this.tweens.add({
                        targets: [currentCoinElement.nameText, currentCoinElement.coinImage, currentCoinElement.coinTray, currentCoinElement.valueText],
                        alpha: 0.5,
                        duration: 500,
                        ease: 'Power2'
                    });

                    // Reset value text scale
                    this.tweens.add({
                        targets: currentCoinElement.valueText,
                        scaleX: originalScale,
                        scaleY: originalScale,
                        duration: 500,
                        ease: 'Back.easeOut'
                    });

                    currentIndex++;
                    const timer = this.time.delayedCall(interval, playNextCoin);
                    this.delayedCalls.push(timer);
                });
            } else {
                for (let i = 0; i < 4; i++) {
                    this.sortingCoinElements[i].nameText.setAlpha(1);
                    this.sortingCoinElements[i].coinImage.setAlpha(1);
                    this.sortingCoinElements[i].coinTray.setAlpha(1);
                    this.sortingCoinElements[i].valueText.setAlpha(1);
                }

                const timer = this.time.delayedCall(1000, () => {
                    this.playSortingStep3();
                });
                this.delayedCalls.push(timer);
            }
        };

        playNextCoin();
    }

    private playSortingStep3() {
        const step3 = this.audioManager.playSoundEffect('sort_step_3');

        // Blur name texts and coin images
        this.sortingCoinElements.forEach(({ nameText, coinImage }) => {
            this.tweens.add({
                targets: [nameText, coinImage],
                alpha: 0.5,
                duration: 500,
                ease: 'Power2'
            });
        });

        // Scale up all trays
        // const originalScale = coinTray.scaleX;
        const trayOriginalScale = this.sortingCoinElements[0].coinTray.scaleX;
        const valueOriginalScale = this.sortingCoinElements[0].valueText.scaleX;
        this.sortingCoinElements.forEach(({ coinTray, valueText }) => {

            this.tweens.add({
                targets: coinTray,
                scaleX: trayOriginalScale * 1.1,
                scaleY: trayOriginalScale * 1.1,
                duration: 500,
                ease: 'Back.easeOut',
            });

            this.tweens.add({
                targets: valueText,
                scaleX: valueOriginalScale * 1.1,
                scaleY: valueOriginalScale * 1.1,
                duration: 500,
                ease: 'Back.easeOut',
            });
        });

        // Reset effects after audio completes
        step3?.on('complete', () => {
            // Reset name texts and coin images
            this.sortingCoinElements.forEach(({ nameText, coinImage }) => {
                this.tweens.add({
                    targets: [nameText, coinImage],
                    alpha: 1,
                    duration: 500,
                    ease: 'Power2'
                });
            });

            // Reset trays and value texts
            this.sortingCoinElements.forEach(({ coinTray, valueText }) => {
                this.tweens.add({
                    targets: coinTray,
                    scaleX: trayOriginalScale,
                    scaleY: trayOriginalScale,
                    duration: 500,
                    ease: 'Back.easeOut'
                });

                this.tweens.add({
                    targets: valueText,
                    scaleX: valueOriginalScale,
                    scaleY: valueOriginalScale,
                    duration: 500,
                    ease: 'Back.easeOut'
                });
            });

            const timer = this.time.delayedCall(1000, () => {
                this.playSortingStep4();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playSortingStep4() {
        this.audioManager.playSoundEffect('sort_step_4');

        this.animateDime(2, () => {
            if (this.parentScene) {
                this.instructionLoopTimer = this.time.delayedCall(5000, () => {
                    this.playSortingStep1();
                });
            } else {
                const timer = this.time.delayedCall(1000, () => {
                    this.playLastStep();
                });
                this.delayedCalls.push(timer);
            }
        });
    }

    private animateDime(repeatCount: number = 2, onComplete?: () => void) {

        let currentRepeat = 0;

        const performAnimation = () => {
            // Find the dime coin (second coin in the array)
            const dimeElement = this.sortingCoinElements[1];
            const originalY = dimeElement.coinImage.y;

            // Create hand
            this.hand = this.addImage(
                dimeElement.coinImage.getBounds().centerX / this.display.scale + 100,
                dimeElement.coinImage.getBounds().centerY / this.display.scale - 20,
                'hand'
            ).setOrigin(0).setScale(0.13);

            // Create flat image for dime
            const flatImage = this.addImage(
                dimeElement.coinTray.getBounds().centerX / this.display.scale,
                dimeElement.coinTray.getBounds().centerY / this.display.scale - 20,
                'dime_flat'
            ).setScale(0.8);
            flatImage.setVisible(false);

            // Animate hand dragging the coin
            this.handTween = this.tweens.add({
                targets: this.hand,
                x: dimeElement.coinImage.getBounds().centerX - this.getScaledValue(20),
                duration: 1000,
                ease: 'Sine.easeInOut',
                onComplete: () => {
                    dimeElement.coinImage.setAlpha(0.7);

                    this.handTween = this.tweens.add({
                        targets: [this.hand, dimeElement.coinImage],
                        y: "+=" + this.getScaledValue(100),
                        duration: 1000,
                        ease: 'Sine.easeInOut',
                        onStart: () => {
                            this.hand.setTexture('hand_click');
                        },
                        onComplete: () => {
                            // Show the flat image
                            dimeElement.coinImage.setVisible(false);
                            this.hand.setVisible(false);
                            flatImage.setVisible(true);
                            this.audioManager.playSoundEffect('coin-drop-on-tray');

                            // After a delay, reset everything
                            this.time.delayedCall(1500, () => {
                                // Hide flat image
                                flatImage.destroy();
                                dimeElement.coinImage.setVisible(true);
                                dimeElement.coinImage.setAlpha(1);
                                dimeElement.coinImage.setY(originalY);
                                this.hand.destroy();

                                currentRepeat++;

                                if (currentRepeat < repeatCount) {
                                    const timer = this.time.delayedCall(500, performAnimation);
                                    this.delayedCalls.push(timer);
                                } else {
                                    onComplete?.();
                                }
                            });
                        }
                    });
                }
            });
        }

        performAnimation();
    }

    private playCountingStep1() {
        const step1 = this.audioManager.playSoundEffect('count_step_1');

        step1?.on('complete', () => {
            for (let i = 0; i < 4; i++) {
                this.countingCoinElements[i].nameText.setAlpha(0.5);
                this.countingCoinElements[i].image.setAlpha(0.5);
                this.countingCoinElements[i].valueText.setAlpha(0.5);
            }

            const timer = this.time.delayedCall(1000, () => {
                this.playCountingStep2();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playCountingStep2() {
        let currentIndex = 0;
        const interval = 1000;

        const playNextCoin = () => {
            if (currentIndex < 4) { // 4 coin types: quarter, dime, nickel, penny
                const step = this.audioManager.playSoundEffect(`count_step_2_${currentIndex + 1}`);
                const currentCoinElement = this.countingCoinElements[currentIndex];
                const originalScale = currentCoinElement.valueText.scaleX;

                this.tweens.add({
                    targets: [currentCoinElement.image, currentCoinElement.nameText, currentCoinElement.valueText],
                    alpha: 1,
                    duration: 500,
                    ease: 'Power2'
                });

                // Scale up value text
                this.tweens.add({
                    targets: currentCoinElement.valueText,
                    scaleX: originalScale * 1.2,
                    scaleY: originalScale * 1.2,
                    duration: 500,
                    ease: 'Back.easeOut',
                });

                // Reset effects after audio completes
                step?.on('complete', () => {
                    // Reset coin tint
                    this.tweens.add({
                        targets: [currentCoinElement.image, currentCoinElement.nameText, currentCoinElement.valueText],
                        alpha: 0.5,
                        duration: 500,
                        ease: 'Power2'
                    });

                    // Reset value text scale
                    this.tweens.add({
                        targets: currentCoinElement.valueText,
                        scaleX: originalScale,
                        scaleY: originalScale,
                        duration: 500,
                        ease: 'Back.easeOut'
                    });

                    currentIndex++;
                    const timer = this.time.delayedCall(interval, playNextCoin);
                    this.delayedCalls.push(timer);
                });
            } else {

                for (let i = 0; i < 4; i++) {
                    this.countingCoinElements[i].nameText.setAlpha(1);
                    this.countingCoinElements[i].image.setAlpha(1);
                    this.countingCoinElements[i].valueText.setAlpha(1);
                }

                const timer = this.time.delayedCall(1000, () => {
                    this.playCountingStep3();
                });
                this.delayedCalls.push(timer);
            }
        };

        playNextCoin();
    }

    private playCountingStep3() {
        const step3 = this.audioManager.playSoundEffect('count_step_3');

        for (let i = 0; i < 4; i++) {
            this.tweens.add({
                targets: [this.countingCoinElements[i].nameText, this.countingCoinElements[i].image],
                alpha: 1,
                duration: 500,
                ease: 'Back.easeOut',
            });
        }

        let plusTweens: Phaser.Tweens.Tween[] = [];
        let valueTextTweens: Phaser.Tweens.Tween[] = [];

        for (let i = 0; i < 3; i++) {
            const valueTextLeft = this.countingCoinElements[i].valueText.getBounds().right;
            const valueTextRight = this.countingCoinElements[i + 1].valueText.getBounds().left;

            const plusX = ((valueTextLeft + valueTextRight) / 2) / this.display.scale;
            const plusY = this.countingCoinElements[i].valueText.getBounds().centerY / this.display.scale;

            const plusText = this.addText(plusX, plusY, '+', {
                fontFamily: 'Exo',
                fontSize: '30px',
                fontStyle: 'bold',
                color: '#000000',
            }).setOrigin(0.5);

            const plusTween = this.tweens.add({
                targets: plusText,
                scale: 1.8,
                yoyo: true,
                duration: 500,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });

            this.plusTexts.push(plusText);
            plusTweens.push(plusTween);
        }

        // Add tweens for all value texts
        for (let i = 0; i < 4; i++) {
            const valueTextTween = this.tweens.add({
                targets: this.countingCoinElements[i].valueText,
                scale: 1.5,
                yoyo: true,
                duration: 500,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });

            valueTextTweens.push(valueTextTween);
        }

        step3?.on('complete', () => {
            this.inputBox.setAlpha(1);
            this.countingInputText.setText('84 ¢');
            this.countingInputText.setAlpha(1);
            this.countingInputText.setColor('#000000');
            this.countingInputTextOverlay.updateContent(this.countingInputText.text);

            // Destroy plus tweens and reset plus text scales
            plusTweens.forEach(tween => tween.destroy());
            this.plusTexts.forEach(text => text.setScale(1));

            // Destroy value text tweens and reset value text scales
            valueTextTweens.forEach(tween => tween.destroy());
            for (let i = 0; i < 4; i++) {
                this.countingCoinElements[i].valueText.setScale(1);
            }

            const timer = this.time.delayedCall(1000, () => {
                this.playCountingStep4();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playCountingStep4() {
        const step4 = this.audioManager.playSoundEffect('count_step_4');
        this.numpadButtons.forEach(button => button.setAlpha(1));
        this.numpadTexts.forEach(text => text.setAlpha(1));

        this.numpadButtons.forEach(button => {
            TweenAnimations.pulse(this, button, 1.05, 800, 1);
        });

        const pointingHand = this.addImage(260, 500, 'pointing_hand').setOrigin(0.5).setRotation(1.5708);

        this.tweens.add({
            targets: pointingHand,
            x: "+=" + this.getScaledValue(10),
            duration: 400,
            yoyo: true,
            repeat: 1,
            ease: 'Sine.easeInOut',
        });

        const timer = this.time.delayedCall(1500, () => {
            pointingHand.destroy();
            this.numpadButtons.forEach(button => button.setAlpha(0.3));
            this.numpadTexts.forEach(text => text.setAlpha(0.3));
            const checkButton = this.countingCheckButton.getAt(0) as Phaser.GameObjects.Image;
            checkButton.setAlpha(1);
            const bounds = checkButton.getBounds();

            // Create hand
            this.hand = this.addImage(
                bounds.centerX / this.display.scale + 100,
                bounds.centerY / this.display.scale - 20,
                'hand'
            ).setOrigin(0).setScale(0.13);

            // Animate hand to check button
            this.handTween = this.tweens.add({
                targets: this.hand,
                x: bounds.centerX - this.getScaledValue(20),
                duration: 1500,
                ease: 'Sine.easeInOut',
                onComplete: () => {
                    const correctIconX = this.countingInputText.getBounds().x;
                    const correctIconY = this.countingInputText.getBounds().y;
                    const correctIcon = this.addImage(
                        correctIconX / this.display.scale + 250,
                        correctIconY / this.display.scale - 4,
                        'correct_icon'
                    ).setOrigin(0);
                    this.hand.setTexture('hand_click');
                    const timer = this.time.delayedCall(1000, () => {
                        checkButton.setAlpha(0.3);
                        this.hand.destroy();
                        correctIcon.destroy();
                    });
                    this.delayedCalls.push(timer);
                }
            });
        });
        this.delayedCalls.push(timer);

        step4?.on('complete', () => {
            this.time.delayedCall(1000, () => {
                this.playCountingStep5();
            });
        });
    }

    private playCountingStep5() {
        const step5 = this.audioManager.playSoundEffect('count_step_5');

        const clearButton = this.countingClearButton.getAt(0) as Phaser.GameObjects.Image;
        clearButton.setAlpha(1);
        const bounds = clearButton.getBounds();

        // Create hand
        this.hand = this.addImage(
            bounds.centerX / this.display.scale + 100,
            bounds.centerY / this.display.scale - 20,
            'hand'
        ).setOrigin(0).setScale(0.13);

        // Animate hand to clear button
        this.handTween = this.tweens.add({
            targets: this.hand,
            x: bounds.centerX - this.getScaledValue(20),
            duration: 1500,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                this.countingInputText.setText(i18n.t('game.totalCents'));
                this.countingInputText.setColor('#989898');
                this.countingInputText.setAlpha(0.3);
                this.countingInputTextOverlay.updateContent(this.countingInputText.text);
                this.inputBox.setAlpha(0.3);
                this.hand.setTexture('hand_click');
                const timer = this.time.delayedCall(1000, () => {
                    clearButton.setAlpha(0.3);
                    this.hand.destroy();
                });
                this.delayedCalls.push(timer);
            }
        });

        step5?.on('complete', () => {
            this.plusTexts.forEach(text => text.destroy());

            if (this.parentScene) {
                this.instructionLoopTimer = this.time.delayedCall(5000, () => {
                    this.playCountingStep1();
                });
            } else {
                const timer = this.time.delayedCall(1000, () => {
                    this.playLastStep();
                });
                this.delayedCalls.push(timer);
            }
        });
    }

    private playLastStep() {
        const step = this.audioManager.playSoundEffect('last_step');

        let playButtonTween: Phaser.Tweens.Tween;

        if (!this.parentScene) {
            playButtonTween = ButtonHelper.startBreathingAnimation(this.playButton, {
                scale: 1.1,
                duration: 1000,
                ease: 'Sine.easeInOut'
            });
        }

        step?.on('complete', () => {
            this.instructionLoopTimer = this.time.delayedCall(5000, () => {

                if (!this.parentScene) {
                    ButtonHelper.stopBreathingAnimation(playButtonTween, this.playButton);
                }

                if (this.mode === 'sorting') {
                    this.playSortingStep1();
                } else {
                    this.playCountingStep1();
                }
            });
        });
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

    private closeDoors(cb?: () => void) {
        const doorLeft = this.addImage(0, this.display.height / 2, COMMON_ASSETS.DOOR.KEY).setOrigin(1, 0.5);
        const doorRight = this.addImage(this.display.width, this.display.height / 2, COMMON_ASSETS.DOOR.KEY).setOrigin(0, 0.5).setFlipX(true);

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

    private createMuteButton() {
        this.muteButton = ButtonHelper.createIconButton({
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
            y: 64,
            onClick: () => this.toggleMute()
        });

        const handleMuteBtnUpdate = () => {
            const muteBtnItem = this.muteButton.getAt(1) as Phaser.GameObjects.Sprite;
            muteBtnItem.setTexture(this.audioManager.getIsAllMuted() ? BUTTONS.MUTE_ICON.KEY : BUTTONS.UNMUTE_ICON.KEY);

            // Update mute button state
            const label = this.audioManager.getIsAllMuted() ? i18n.t('common.unmute') : i18n.t('common.mute');
            const overlay = (this.muteButton as any).buttonOverlay as ButtonOverlay;
            const muteBtnState = this.muteButton.getData('state');
            if(muteBtnState != label) {
                this.muteButton.setData('state', label);
                overlay.setLabel(label);
            }
        }
        // Add update event listener to the mute button
        this.events.on("update", handleMuteBtnUpdate);
        // Remove event listener when mute button is destroyed
        this.muteButton.on("destroy", () => {
            this.events.off("update", handleMuteBtnUpdate);
        });
    }

    private toggleMute() {
        this.audioManager.setMute(!this.audioManager.getIsAllMuted());
        const icon = this.muteButton.getAt(1) as Phaser.GameObjects.Image;
        icon.setTexture(this.audioManager.getIsAllMuted() ? BUTTONS.MUTE_ICON.KEY : BUTTONS.UNMUTE_ICON.KEY);
    }

    private createSettingsButton() {
        this.volumeSlider = new VolumeSlider(this);
        this.volumeSlider.create(this.display.width - 210, 160, 'blue', i18n.t('common.volume'));
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
            onClick: () => this.volumeSlider.toggleControl(),
        });
    }

    shutdown() {
        this.audioManager.stopAllSoundEffects();
    }
}