import { BaseScene, ButtonHelper, GameConfigManager, i18n, QuestionSelectorHelper, ScoreHelper, getQuestionBankByName, VolumeSlider, ScoreCoins, ProgressBar, setSceneBackground, TextOverlay, announceToScreenReader, ButtonOverlay, focusToGameContainer, AnalyticsHelper } from "@k8-games/sdk";
import { CardHelper } from "../utils/CardHelper";
import { ASSETS_PATHS, BUTTONS, BUTTONS_YELLOW, COMMON_ASSETS, getTopicConfig, TOPICS } from "../config/common";

export class GameScene extends BaseScene {
    private progressBar?: ProgressBar;
    private card1?: Phaser.GameObjects.Container;
    private card2?: Phaser.GameObjects.Container;
    private card1Overlay?: ButtonOverlay;
    private card2Overlay?: ButtonOverlay;
    private totalQuestions: number = 10;
    private questionSelector: QuestionSelectorHelper;
    private currentQuestion?: { operand1: string, operand2: string, answer: string };
    private scoreHelper: ScoreHelper;
    private equalBtn?: Phaser.GameObjects.Image;
    private greaterBtn?: Phaser.GameObjects.Image;
    private lessBtn?: Phaser.GameObjects.Image;
    private equalAnsBtn!: Phaser.GameObjects.Container;
    private gameTimer?: Phaser.Time.TimerEvent;
    private isProcessing: boolean = false;
    private muteBtn!: Phaser.GameObjects.Container;
    private volumeSlider!: VolumeSlider;
    private previousStreak: number = 0;
    private doorLeft!: Phaser.GameObjects.Image;
    private doorRight!: Phaser.GameObjects.Image;
    private topic: string;
    private gameConfigManager!: GameConfigManager;
    private analyticsHelper!: AnalyticsHelper;  
    private scoreCoins!: ScoreCoins;
    private announcementQueue: string[] = [];
    private isAnnouncing: boolean = false;

    private isAudioPlaying: boolean = false;
    private audioInstance!: Phaser.Sound.WebAudioSound | undefined;
    private infoTextAudioButton!: Phaser.GameObjects.Container;

    constructor() {
        super('GameScene');
        this.gameConfigManager = GameConfigManager.getInstance();
        this.topic = this.gameConfigManager.get('topic') || "compare_percents";
        const questionBank = getQuestionBankByName(this.topic);
        if (!questionBank) {
            throw new Error('Question bank not found');
        }
        this.questionSelector = new QuestionSelectorHelper(questionBank, this.totalQuestions);
        this.scoreHelper = new ScoreHelper(2); // Base bonus of 2 for streaks
    }

    private createDoors() {
        this.doorLeft = this.addImage(this.display.width / 2, this.display.height / 2, 'door').setOrigin(1, 0.5).setDepth(100);
        this.doorRight = this.addImage(this.display.width / 2, this.display.height / 2, 'door').setOrigin(0, 0.5).setFlipX(true).setDepth(100);
    }

    private openDoors() {
        const countdownImg = this.addImage(this.display.width / 2, this.display.height / 2, 'countdown_3').setOrigin(0.5).setDepth(101);
        countdownImg.setScale(250/countdownImg.height);

        let count = 3;

        this.audioManager.playSoundEffect('countdown');
        this.time.addEvent({
            delay: 1000,
            callbackScope: this,
            repeat: 3,
            callback: () => {
                // Announce to screen reader
                announceToScreenReader(count > 0 ? count.toString() : '');
                count--;
                if (count > 0) {
                    this.audioManager.playSoundEffect('countdown');
                    countdownImg.setTexture(`countdown_${count}`);
                } else if (count === 0) {
                    countdownImg.destroy();
                    this.audioManager.playSoundEffect('door_open');
                    this.tweens.add({
                        targets: this.doorLeft,
                        x: 0,
                        duration: 1000,
                        ease: 'Power2'
                    });
                    this.tweens.add({
                        targets: this.doorRight,
                        x: this.getScaledValue(this.display.width),
                        duration: 1000,
                        ease: 'Power2',
                    });
                    setTimeout(() => {
                        this.audioManager.playBackgroundMusic('bg-music');
                    }, 1000);
                }
            }
        });
    }

    private closeDoors() {
        setTimeout(() => {
            this.audioManager.playSoundEffect('door_close');
        }, 500);

        this.tweens.add({
            targets: this.doorLeft,
            x: this.getScaledValue(this.display.width / 2),
            duration: 1000,
            ease: 'Power2'
        });
        this.tweens.add({
            targets: this.doorRight,
            x: this.getScaledValue(this.display.width / 2),
            duration: 1000,
            ease: 'Power2',
        });
    }

    private gameOver() {
        // Game Over handling here
        this.scoreHelper.setPlannedTotalQuestions(this.totalQuestions);
        const finalScore = this.scoreHelper.endGame();

        // Stop the timer
        if (this.gameTimer) {
            this.gameTimer.destroy();
        }

        this.closeDoors();
        this.time.delayedCall(2000, () => {
            this.audioManager.unduckBackgroundMusic();
            // Send data to ScoreBoard scene
            this.scene.start('ScoreBoardScene', {
                totalRounds: this.scoreHelper.getTotalQuestions(),
                rounds: this.scoreHelper.getCorrectAnswers(),
                score: finalScore
            });
        });
    }

    private getCardOverlayLabel(question: string) {
        if (question.includes('/')) {
            const [numerator, denominator] = question.split('/');
            return i18n.t('common.visualCard', { firstNumber: numerator, secondNumber: denominator });
        } else {
            return i18n.t('common.valueCard', { value: question });
        }
    }

    private async loadNextQuestion() {
        const question = this.questionSelector.getNextQuestion();
        if (!question) {
            this.gameOver();
            return;
        }

        this.currentQuestion = question;
        let maxValue: number | undefined;
        if (this.topic === "compare_numbers") maxValue = 100;
        else if (this.topic === "compare_fractions") {
            const [_num1, den1] = question.operand1.split('/');
            const [_num2, den2] = question.operand2.split('/');
            maxValue = Math.max(parseInt(den1), parseInt(den2));
        };

        const createCardBtnOverlay = (scene: BaseScene, side: 'left' | 'right', bgImage: Phaser.GameObjects.Image, card: Phaser.GameObjects.Container, label: string) => {
            return new ButtonOverlay(scene, card, {
                label: label,
                style: {
                    height: `${bgImage.height * this.display.scale}px`,
                    width: `${bgImage.width * this.display.scale}px`
                },
                onKeyDown: () => {
                    bgImage.setTexture('card_front');
                    this.handleCardClick(side);
                },
                onFocus: () => bgImage.setTexture('card_front_hover'),
                onBlur: () => bgImage.setTexture('card_front')
            })
        }

        const card1OverlayLabel = this.getCardOverlayLabel(question.operand1);
        if (this.card1) {
            this.card1Overlay?.cleanup();
            // Reset card texture to default before flipping
            const card1BgImage = this.card1.list[3] as Phaser.GameObjects.Image;
            if (card1BgImage) {
                card1BgImage.setTexture('card_front');
            }
            CardHelper.flipCard(
                this,
                this.card1,
                'leftCard',
                question.operand1,
                maxValue,
                () => this.handleCardClick('left'),
                (bgImage, card) => {this.card1Overlay = createCardBtnOverlay(this, 'left', bgImage, card, card1OverlayLabel)}
            );
        } else {
            this.card1 = await CardHelper.createCard(
                this,
                (this.display.width / 2) - 210,
                420,
                'leftCard',
                question.operand1,
                maxValue,
                () => this.handleCardClick('left'),
                (bgImage, card) => {this.card1Overlay = createCardBtnOverlay(this, 'left', bgImage, card, card1OverlayLabel)}
            );
        }

        const card2OverlayLabel = this.getCardOverlayLabel(question.operand2);
        if (this.card2) {
            this.card2Overlay?.cleanup();
            // Reset card texture to default before flipping
            const card2BgImage = this.card2.list[3] as Phaser.GameObjects.Image;
            if (card2BgImage) {
                card2BgImage.setTexture('card_front');
            }
            CardHelper.flipCard(
                this,
                this.card2,
                'rightCard',
                question.operand2,
                maxValue,
                () => this.handleCardClick('right'),
                (bgImage, card) => {this.card2Overlay = createCardBtnOverlay(this, 'right', bgImage, card, card2OverlayLabel)},
                () => {
                    // Recreate equal and btn overlay for navigation order
                    const equalAnsBtnOverlay = (this.equalAnsBtn as any).buttonOverlay as ButtonOverlay;
                    equalAnsBtnOverlay.recreate();
                }
            );
        } else {
            this.card2 = await CardHelper.createCard(
                this,
                (this.display.width / 2) + 210,
                420,
                'rightCard',
                question.operand2,
                maxValue,
                () => this.handleCardClick('right'),
                (bgImage, card) => {this.card2Overlay = createCardBtnOverlay(this, 'right', bgImage, card, card2OverlayLabel)},
                () => {
                    // Recreate equal and btn overlay for navigation order
                    const equalAnsBtnOverlay = (this.equalAnsBtn as any).buttonOverlay as ButtonOverlay;
                    equalAnsBtnOverlay.recreate();
                }
            );
        }

        if (this.volumeSlider.isOpen()) {
            this.setCardsInputEnabled(false);
        }
                
        this.time.delayedCall(2000, () => {
            focusToGameContainer();
            announceToScreenReader(i18n.t('common.questionAnnounce', { number1: card1OverlayLabel, number2: card2OverlayLabel }));
            this.isProcessing = false;
        });
    }

    private updateOverlay(card: Phaser.GameObjects.GameObject, overlay: ButtonOverlay, enabled: boolean) {
        if (enabled) {
            overlay.setDisabled(false);
            overlay.element.style.width = card.getData('overlayWidth') || '0px';
            overlay.element.style.height = card.getData('overlayHeight') || '0px';

            if (this.equalAnsBtn) {
                ButtonHelper.enableButton(this.equalAnsBtn);
            }
        } else {
            overlay.setDisabled(true);
            card.setData('overlayWidth', overlay.element.style.width);
            card.setData('overlayHeight', overlay.element.style.height);
            overlay.element.style.width = '0px';
            overlay.element.style.height = '0px';

            if (this.equalAnsBtn) {
                ButtonHelper.disableButton(this.equalAnsBtn);
            }
        }
    }
    
    private setCardsInputEnabled(enabled: boolean) {
        if (this.card1 && this.card1Overlay) {
            this.updateOverlay(this.card1, this.card1Overlay, enabled);
        }
        if (this.card2 && this.card2Overlay) {
            this.updateOverlay(this.card2, this.card2Overlay, enabled);
        }
    } 

    private showAnswerButton() {
        if (!this.currentQuestion) return;

        // Only show the correct answer button
        let answerButton: Phaser.GameObjects.Image | undefined;

        switch (this.currentQuestion.answer) {
            case '>':
                answerButton = this.addImage(this.display.width / 2, (this.display.height / 2) + 50, COMMON_ASSETS.GREATER_BUTTON.KEY);
                this.greaterBtn = answerButton;
                break;
            case '<':
                answerButton = this.addImage(this.display.width / 2, (this.display.height / 2) + 50, COMMON_ASSETS.LESS_BUTTON.KEY);
                this.lessBtn = answerButton;
                break;
            case '=':
                answerButton = this.addImage(this.display.width / 2, (this.display.height / 2) + 50, COMMON_ASSETS.EQUAL_BUTTON.KEY);
                this.equalBtn = answerButton;
                break;
        }

        // Add popup animation to the answer button
        if (answerButton) {
            // Set initial state (invisible and scaled down)
            answerButton.setAlpha(0);
            answerButton.setScale(0.5);

            // Create a popup animation
            this.tweens.add({
                targets: answerButton,
                alpha: 1,
                scale: this.getScaledValue(1),
                duration: 300,
                ease: 'Back.out(1.7)', // Bouncy effect
                onComplete: () => {
                    // Add a subtle floating animation after the popup
                    this.tweens.add({
                        targets: answerButton,
                        y: answerButton.y - 10,
                        duration: 1000,
                        yoyo: true,
                        repeat: 1,
                        ease: 'Sine.easeInOut'
                    });
                }
            });
        }

        // Remove the button after 1 second
        this.time.delayedCall(1000, () => {
            this.equalBtn?.destroy();
            this.greaterBtn?.destroy();
            this.lessBtn?.destroy();
        });
    }

    private getCorrectAnswerValue() {
        if (!this.currentQuestion) return '';

        const { operand1, operand2, answer } = this.currentQuestion;

        if (answer === '>') return operand1;
        if (answer === '<') return operand2;

        // Equal case → choose either one
        if (answer === '=') return operand1;

        return '';
    }

    private handleClick(isCorrect: boolean, studentResponse: string) {
        if (!this.currentQuestion || this.isProcessing) return;
        this.isProcessing = true;

        // Show the correct answer first
        this.showAnswerButton();

        const questionText = i18n.t('common.questionAnnounce', { number1: this.currentQuestion.operand1, number2: this.currentQuestion.operand2});
        const correctAnswerValue = this.getCorrectAnswerValue();
    
        // Queue feedback announcement with priority (clears other announcements)
        const feedbackMessage = isCorrect 
            ? i18n.t('common.correctFeedback', { value: correctAnswerValue })
            : i18n.t('common.incorrectFeedback', { value: correctAnswerValue });
        
        this.queueAnnouncement(feedbackMessage);
    
        if (isCorrect) {
            this.analyticsHelper?.createTrial({
                questionMaxPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                achievedPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                questionText: questionText,
                isCorrect: true,
                questionMechanic: 'default',
                gameLevelInfo: this.topic === 'compare_numbers' ? 'game.number_comparison.default' : 'game.fraction_frenzy.default',
                studentResponse: studentResponse,
                studentResponseAccuracyPercentage: '100%',
            });

            
            // Add delay before showing animations to let announcement be heard
            this.time.delayedCall(1000, () => {
                if (!this.currentQuestion) return;
                
                // Flash the correct card green
                if (this.currentQuestion.answer === '>') {
                    CardHelper.flashCard(this, this.card1!, true);
                } else if (this.currentQuestion.answer === '<') {
                    CardHelper.flashCard(this, this.card2!, true);
                } else {
                    // For equal case, flash both cards
                    CardHelper.flashCard(this, this.card1!, true);
                    CardHelper.flashCard(this, this.card2!, true);
                }

                this.questionSelector.answerCorrectly();
                this.scoreHelper.answerCorrectly();
                this.showSuccessAnimation();
                this.previousStreak = this.scoreHelper.getCurrentStreak();

                // Update score and streak displays
                this.scoreCoins.updateScoreDisplay(true);

                // Update progress bar
                const progress = this.questionSelector.getTotalQuestionsAnswered() / this.totalQuestions;
                this.progressBar?.drawProgressFill(progress, this.scoreHelper.getCurrentStreak());

                if (this.scoreHelper.showStreakAnimation()) {
                    this.showMascotCelebration(() => {
                        this.loadNextQuestion();
                    });
                    return;
                }

                // Increased delay to allow announcements to complete
                this.time.delayedCall(3000, () => {
                    this.loadNextQuestion();
                });
            });

        } else {
            this.analyticsHelper?.createTrial({
                questionMaxPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                achievedPoints: 0,
                questionText: questionText,
                isCorrect: false,
                questionMechanic: 'default',
                gameLevelInfo: this.topic === 'compare_numbers' ? 'game.number_comparison.default' : 'game.fraction_frenzy.default',
                studentResponse: studentResponse,
                studentResponseAccuracyPercentage: '0%',
            });
            
            // Add delay before showing animations to let announcement be heard
            this.time.delayedCall(1000, () => {
                if (!this.currentQuestion) return;
                
                // Flash the incorrect card red
                if (this.currentQuestion.answer === '>') {
                    CardHelper.flashCard(this, this.card2!, false);
                } else if (this.currentQuestion.answer === '<') {
                    CardHelper.flashCard(this, this.card1!, false);
                } else {
                    // For equal case, flash both cards
                    CardHelper.flashCard(this, this.card1!, false);
                    CardHelper.flashCard(this, this.card2!, false);
                }

                this.questionSelector.answerIncorrectly(this.currentQuestion);
                this.scoreHelper.answerIncorrectly();
                this.showErrorAnimation();

                // Update score and streak displays
                this.scoreCoins.updateScoreDisplay(false, this.previousStreak >= 3);
                // Update progress bar
                const progress = this.questionSelector.getTotalQuestionsAnswered() / this.totalQuestions;
                this.progressBar?.updateStreakText(progress, this.scoreHelper.getCurrentStreak());
                this.progressBar?.drawProgressFill(progress, this.scoreHelper.getCurrentStreak());
                this.previousStreak = this.scoreHelper.getCurrentStreak();
            });

            // Increased delay to allow announcements to complete
            this.time.delayedCall(4000, () => {
                this.loadNextQuestion();
            });
        }
    }

    private handleCardClick(side: 'left' | 'right') {
        if (!this.currentQuestion) return;

        let isCorrect = false;
        if (side === 'left' && this.currentQuestion.answer === '>') {
            isCorrect = true;
        } else if (side === 'right' && this.currentQuestion.answer === '<') {
            isCorrect = true;
        }

        this.handleClick(isCorrect, side === 'left' ? this.currentQuestion.operand1 : this.currentQuestion.operand2);
    }

    private handleEqualClick() {
        if (!this.currentQuestion) return;

        const isCorrect = this.currentQuestion.answer === '=';

        this.handleClick(isCorrect, 'Equal');
    }

    private showSuccessAnimation() {
        const width = this.display.width;
        const height = 122;
        const successContainer = this.add.container(this.getScaledValue(this.display.width / 2), this.getScaledValue(this.display.height + height / 2));

        // Create background rectangle
        const bgRect = this.addRectangle(0, 0, width, height, 0x007E11);
        successContainer.add(bgRect);

        const bgRectTop = this.addRectangle(0, -height / 2, width, 7, 0x24E13E).setOrigin(0.5, 0);
        successContainer.add(bgRectTop);

        // Create icon and text
        const icon = this.addImage(0, 0, 'correct_icon').setOrigin(0.5);

        successContainer.add(icon);

        // Play success sound
        this.audioManager.playSoundEffect('positive-sfx');

        // Simple slide up animation
        this.tweens.add({
            targets: successContainer,
            y: this.getScaledValue(this.display.height - height / 2),
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                // new ImageOverlay(this, icon, { label: i18n.t('common.correct') + ' ' + i18n.t('common.icon') });
                // Wait for a moment and then slide down
                this.time.delayedCall(500, () => {
                    this.tweens.add({
                        targets: successContainer,
                        y: this.getScaledValue(this.display.height + height / 2),
                        duration: 500,
                        ease: "Power2",
                        onComplete: () => {
                            successContainer.destroy();
                        }
                    });
                });
            }
        });
    }

    private showErrorAnimation() {
        const width = this.display.width;
        const height = 122;
        const errorContainer = this.add.container(this.getScaledValue(this.display.width / 2), this.getScaledValue(this.display.height + height / 2));

        // Create background rectangle
        const bgRect = this.addRectangle(0, 0, width, height, 0x8B0000);
        errorContainer.add(bgRect);

        const bgRectTop = this.addRectangle(0, -height / 2, width, 7, 0xF40000).setOrigin(0.5, 0);
        errorContainer.add(bgRectTop);

        // Create icon and text
        const icon = this.addImage(0, 0, 'incorrect_icon').setOrigin(0.5);

        errorContainer.add(icon);

        // Play error sound
        this.audioManager.playSoundEffect('negative-sfx');

        // Simple slide up animation
        this.tweens.add({
            targets: errorContainer,
            y: this.getScaledValue(this.display.height - height / 2),
            duration: 500,
            ease: "Power2",
            onComplete: () => {
                // new ImageOverlay(this, icon, { label: i18n.t('common.incorrect') + ' ' + i18n.t('common.icon') });
                // Wait for a moment and then slide down
                this.time.delayedCall(500, () => {
                    this.tweens.add({
                        targets: errorContainer,
                        y: this.getScaledValue(this.display.height + height / 2),
                        duration: 500,
                        ease: "Power2",
                        onComplete: () => {
                            errorContainer.destroy();
                        }
                    });
                });
            }
        });
    }

    private showMascotCelebration(cb?: () => void) {
        this.time.delayedCall(2000, () => {
            this.scene.pause();
            this.scene.launch('CelebrationScene', {
                scoreHelper: this.scoreHelper,
                progress: this.questionSelector.getTotalQuestionsAnswered() / this.totalQuestions,
                callback: () => {
                    // Add delay before callback to ensure celebration announcements complete
                    this.time.delayedCall(1000, () => {
                        cb?.();
                    });
                }
            });
            this.scene.bringToTop('CelebrationScene');
        });
    }

    private resetGame() {
        this.questionSelector.reset();
        this.scoreHelper.reset();
        this.card1?.destroy();
        this.card2?.destroy();
        this.card1 = undefined;
        this.card2 = undefined;
    }

    init(data?: { reset?: boolean }) {
        ScoreCoins.init(this);
        ProgressBar.init(this);
        this.isAudioPlaying = false;

        // Reset game state if requested
        if (data?.reset) {
            this.resetGame();
        }

        if (!this.anims.exists('power_up')) {
            let frames: Phaser.Types.Animations.AnimationFrame[] = [
                ...this.anims.generateFrameNames('streak_animation_0'),
                ...this.anims.generateFrameNames('streak_animation_1'),
                ...this.anims.generateFrameNames('streak_animation_2'),
            ]

            frames.sort((a, b) => {
                if (!a.frame || !b.frame) return 0;
                
                const aNum = Number(a.frame.toString().replace(/\D/g, ''));
                const bNum = Number(b.frame.toString().replace(/\D/g, ''));
                return aNum - bNum;
            });

            this.anims.create({
                key: 'power_up',
                frames: frames,
                frameRate: 12,
                repeat: -1,
                hideOnComplete: false
            })
        }
    }

    static _preload(scene: BaseScene) {
        const language = i18n.getLanguage() || 'en';
        const gameConfigManager = GameConfigManager.getInstance();
        const topic = gameConfigManager.get('topic') || 'compare_percents';
        const topicConfig = getTopicConfig(topic);

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen`);
        scene.load.image('correct_icon', 'correct_icon.png');
        scene.load.image('incorrect_icon', 'incorrect_icon.png');
        scene.load.image('card_bg', 'card_bg.png');
        scene.load.image('card_bg_hover', 'card_bg_hover.png');
        scene.load.image('card_bg_success', 'card_bg_success.png');
        scene.load.image('card_bg_error', 'card_bg_error.png');
        scene.load.image('mascot_image', 'mascot.png');
        scene.load.image('countdown_1', 'countdown_1.png');
        scene.load.image('countdown_2', 'countdown_2.png');
        scene.load.image('countdown_3', 'countdown_3.png');
        scene.load.image('icon_close', 'icon_close.png');
        scene.load.image('icon_plus', 'icon_plus.png');
        scene.load.image('icon_minus', 'icon_minus.png');

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}${COMMON_ASSETS.PATH}`);
        scene.load.image(COMMON_ASSETS.EQUAL_BUTTON.KEY, COMMON_ASSETS.EQUAL_BUTTON.PATH);
        scene.load.image(COMMON_ASSETS.GREATER_BUTTON.KEY, COMMON_ASSETS.GREATER_BUTTON.PATH);
        scene.load.image(COMMON_ASSETS.LESS_BUTTON.KEY, COMMON_ASSETS.LESS_BUTTON.PATH);
        scene.load.image('card_front', 'card_front.png');
        scene.load.image('card_front_hover', 'card_front_hover.png');
        scene.load.image('card_front_pressed', 'card_front_pressed.png');
        scene.load.image('card_back', `card_back_${topicConfig.SPLASH_SCREEN.TITLE}_${language}.png`);
        scene.load.image('card_glow_success', 'card_glow_success.png');
        scene.load.image('card_glow_error', 'card_glow_error.png');
        scene.load.image('info_text_audio_button', 'unmute_icon.png');
        scene.load.image('transparent', 'transparent.png');

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}`);
        scene.load.audio('door_close', 'door_close.wav');
        scene.load.audio('door_open', 'door_open.wav');
        scene.load.audio('countdown', 'countdown.mp3');
        scene.load.audio('card_flip', 'card_flip.mp3');

        scene.load.setPath(`${BUTTONS.PATH}`);
        scene.load.image(BUTTONS.PAUSE_ICON.KEY, BUTTONS.PAUSE_ICON.PATH);
        scene.load.image(BUTTONS.ICON_BTN.KEY, BUTTONS.ICON_BTN.PATH);
        scene.load.image(BUTTONS.ICON_BTN_HOVER.KEY, BUTTONS.ICON_BTN_HOVER.PATH);
        scene.load.image(BUTTONS.ICON_BTN_PRESSED.KEY, BUTTONS.ICON_BTN_PRESSED.PATH);
        scene.load.image(BUTTONS.MUTE_ICON.KEY, BUTTONS.MUTE_ICON.PATH);
        scene.load.image(BUTTONS.UNMUTE_ICON.KEY, BUTTONS.UNMUTE_ICON.PATH);
        scene.load.image(BUTTONS.HELP_ICON.KEY, BUTTONS.HELP_ICON.PATH);
        scene.load.image(BUTTONS.SETTINGS_ICON.KEY, BUTTONS.SETTINGS_ICON.PATH);

        scene.load.setPath(`${BUTTONS_YELLOW.PATH}`);
        scene.load.image(BUTTONS_YELLOW.ICON_BTN.KEY, BUTTONS_YELLOW.ICON_BTN.PATH);
        scene.load.image(BUTTONS_YELLOW.ICON_BTN_HOVER.KEY, BUTTONS_YELLOW.ICON_BTN_HOVER.PATH);
        scene.load.image(BUTTONS_YELLOW.ICON_BTN_PRESSED.KEY, BUTTONS_YELLOW.ICON_BTN_PRESSED.PATH);
        scene.load.image(BUTTONS_YELLOW.ICON_BTN_DISABLED.KEY, BUTTONS_YELLOW.ICON_BTN_DISABLED.PATH);
        scene.load.image(BUTTONS_YELLOW.LAB_ICON.KEY, BUTTONS_YELLOW.LAB_ICON.PATH);

        scene.load.setPath(`${ASSETS_PATHS.ATLAS}/mascot_eyes`);
        scene.load.atlas('mascot_eyes', 'mascot_eyes.png', 'mascot_eyes.json');

        scene.load.setPath(`${ASSETS_PATHS.ATLAS}/streak_animation`);
        scene.load.atlas('streak_animation_0', 'texture-0.png', 'texture-0.json');
        scene.load.atlas('streak_animation_1', 'texture-1.png', 'texture-1.json');
        scene.load.atlas('streak_animation_2', 'texture-2.png', 'texture-2.json');

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}`);
        scene.load.audio('positive-sfx', 'positive.wav');
        scene.load.audio('negative-sfx', 'negative.wav');
        scene.load.audio('bg-music', 'bg_music.mp3');

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/game_screen`);
        if(topicConfig.TYPE === 'numbers') {
            scene.load.audio('info-text-audio', `${topicConfig.TYPE}InfoText_${language}.mp3`);
        }

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/fraction_lab`);
        scene.load.audio('fraction_lab_description', `description_${language}.mp3`);
        scene.load.audio('fraction_lab_title', `title_${language}.mp3`);
        
        ProgressBar.preload(scene, 'light');
        ScoreCoins.preload(scene, 'blue');
        VolumeSlider.preload(scene, 'blue');
    }

    override update(): void {
        // Update mute button icon
        const muteBtnItem = this.muteBtn.getAt(1) as Phaser.GameObjects.Sprite;
        if (this.audioManager.getIsAllMuted()) {
            muteBtnItem.setTexture(BUTTONS.MUTE_ICON.KEY);
        } else {
            muteBtnItem.setTexture(BUTTONS.UNMUTE_ICON.KEY);
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

    create() {
        const _analyticsHelper = AnalyticsHelper.getInstance();
        if (_analyticsHelper) {
            this.analyticsHelper = _analyticsHelper;
        } else {
            console.error('AnalyticsHelper not found');
        }

        if (this.topic === 'compare_numbers') {
            this.analyticsHelper?.createSession('game.number_comparison.default');
        } else {
            this.analyticsHelper?.createSession('game.fraction_frenzy.default');
        }

        // Focus to game container
        focusToGameContainer();

        this.createDoors();
        // Initialize audio manager
        this.audioManager.initialize(this);

        // Add background
        setSceneBackground('assets/images/common/bg.png');
        this.addImage(this.display.width / 2, this.display.height / 2, COMMON_ASSETS.BACKGROUND.KEY);

        // Scoreboard
        this.scoreCoins = new ScoreCoins(this, this.scoreHelper, i18n, 'blue');
        this.scoreCoins.create(
            this.getScaledValue(87),
            this.getScaledValue(62)
        );

        this.progressBar = new ProgressBar(this, 'light', i18n);
        this.progressBar.create(
            this.getScaledValue(this.display.width / 2),
            this.getScaledValue(70),
        );

        // Add pause button
        this.createPauseButton();

        // Add mute button
        this.createMuteButton();

        // Add volume slider
        this.createVolumeSlider();

        // Add help button
        this.createHelpButton();

        if (this.topic !== 'compare_numbers') {
            // Add fraction lab button
            this.createFractionLabButton();
        }

        const topicConfig = getTopicConfig(this.topic);
        const infoText = this.addText(this.display.width / 2, 160, i18n.t(`info.${topicConfig.TYPE}InfoText`), {
            fontFamily: "Exo",
            fontStyle: "bold",
            fontSize: 25,
            color: '#000000',
        }).setOrigin(0.5);
        new TextOverlay(this, infoText, { label: i18n.t(`info.${topicConfig.TYPE}InfoText`), tag: 'h1' });
        
        // Add info text audio button
        topicConfig.TYPE === TOPICS.compare_numbers.TYPE && this.displayInfoTextAudio((this.display.width / 2) - (infoText.width / 2) - 20, 160);

        this.equalAnsBtn = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY
            },
            text: i18n.t('game.equal'),
            label: i18n.t('game.equal'),
            textStyle: {
                fontFamily: "Exo",
                fontStyle: "bold",
                fontSize: 30,
                color: '#ffffff',
            },
            imageScale: 0.8,
            raisedOffset: 3.5,
            x: this.display.width / 2,
            y: (this.display.height / 2) + 300,
            onClick: () => this.handleEqualClick()
        });

        // Load first question with longer delay to allow all introductory announcements
        this.time.delayedCall(6000, () => {
            this.loadNextQuestion();
        });
        setTimeout(() => {
            this.openDoors();
        }, 500);
    }

    private displayInfoTextAudio(x: number, y: number) {
        this.infoTextAudioButton = ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: 'transparent',
                hover: 'transparent',
                pressed: 'transparent',
            },
            icon:'info_text_audio_button',
            label: i18n.t('game.playInstructionAudio'),
            x,
            y,
            raisedOffset: 0,
            onClick: () => {
                if (this.isAudioPlaying) {
                    this.stopQuestionAudio();
                    return;
                }
                
                this.infoTextAudioButton.disableInteractive();
                this.audioManager.duckBackgroundMusic();
                this.isAudioPlaying = true;
                this.audioInstance = this.audioManager.playSoundEffect('info-text-audio');
                if (this.audioInstance) {
                    this.audioInstance.once(Phaser.Sound.Events.COMPLETE, () => {
                        this.isAudioPlaying = false;
                        this.audioManager.unduckBackgroundMusic();
                        if (this.infoTextAudioButton && this.infoTextAudioButton.scene && this.infoTextAudioButton.active) {
                            this.infoTextAudioButton.setInteractive();
                        }
                        this.audioInstance = undefined;
                    });
                } else {
                    this.isAudioPlaying = false;
                    this.audioManager.unduckBackgroundMusic();
                    if (this.infoTextAudioButton && this.infoTextAudioButton.scene && this.infoTextAudioButton.active) {
                        this.infoTextAudioButton.setInteractive();
                    }
                }
            },
        });
        // Disable for screen readers
        // this.infoTextAudioButton.setData('aria-hidden', 'true');
    }

    private stopQuestionAudio() {
        if (!this.isAudioPlaying) return;

        this.isAudioPlaying = false;
        this.audioManager.unduckBackgroundMusic();

        // Stop the audio
        if (this.audioInstance) {
            this.audioInstance.stop();
            this.audioInstance = undefined;
        }

        // Re-enable the button
        if (this.infoTextAudioButton && this.infoTextAudioButton.scene && this.infoTextAudioButton.active) {
            this.infoTextAudioButton.setInteractive();
        }
    }

    private createPauseButton() {
        ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.PAUSE_ICON.KEY,
            label: i18n.t('common.pause'),
            x: this.display.width - 54,
            y: 66,
            raisedOffset: 3.5,
            onClick: () => {
                this.scene.pause();
                this.scene.launch("PauseScene", { parentScene: "GameScene" });
                this.audioManager.pauseAll();
            },
        }).setName('pause_btn');
    }

    private createHelpButton() {
        ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.HELP_ICON.KEY,
            label: i18n.t('common.help'),
            x: this.display.width - 54,
            y: 294,
            raisedOffset: 3.5,
            onClick: () => {
                this.stopQuestionAudio();
                this.scene.pause();
                this.scene.launch("InfoScene", { parentScene: "GameScene" });
                this.scene.bringToTop("InfoScene");
            },
        });
    }

    private createVolumeSlider() {
        this.volumeSlider = new VolumeSlider(this);
        this.volumeSlider.create(this.display.width - 220, 238, 'blue', i18n.t('common.volume'));
        this.volumeSlider.setOnOpen(() => {
            this.setCardsInputEnabled(false);
        });
        this.volumeSlider.setOnClose(() => {
            this.setCardsInputEnabled(true);
        });
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
            y: 218,
            raisedOffset: 3.5,
            onClick: () => {
                this.volumeSlider.toggleControl();
            },
        });
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
            x: this.display.width - 54,
            y: 142,
            raisedOffset: 3.5,
            onClick: () => {
                this.audioManager.setMute(!this.audioManager.getIsAllMuted());
            },
        });
    }

    private createFractionLabButton() {
        ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: BUTTONS_YELLOW.ICON_BTN.KEY,
                hover: BUTTONS_YELLOW.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS_YELLOW.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS_YELLOW.LAB_ICON.KEY,
            label: i18n.t('common.fractionLabButton'),
            x: this.display.width - 54,
            y: 372,
            raisedOffset: 5,
            onClick: () => {
                // Pause current scene and launch FractionLabScene
                this.scene.pause();
                this.scene.launch('FractionLabScene', { parentScene: 'GameScene', topic: getTopicConfig(this.topic).TYPE });
                this.scene.bringToTop("FractionLabScene");
            },
        });
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