import { BaseScene, ButtonHelper, i18n, QuestionSelectorHelper, ScoreHelper, getQuestionBankByName, VolumeSlider, ProgressBar, ScoreCoins, setSceneBackground, TextOverlay, announceToScreenReader, GameConfigManager, ButtonOverlay, focusToGameContainer, Question, AnalyticsHelper } from "@k8-games/sdk";
import { CardHelper } from "../utils/CardHelper";
import { ASSETS_PATHS, BUTTONS, COMMON_ASSETS, ITEM_MAPPING } from "../config/common";
import { ImageOverlay } from "../ImageOverlay";
import { continueGameAfterWrongAnswer } from "../utils/helper";

export class GameScene extends BaseScene {
    private card1?: Phaser.GameObjects.Container;
    private card1Overlay?: ButtonOverlay;
    private card2?: Phaser.GameObjects.Container;
    private card2Overlay?: ButtonOverlay;
    private totalQuestions: number = 10;
    private questionSelector: QuestionSelectorHelper;
    private currentQuestion?: Question;
    private scoreHelper: ScoreHelper;
    private equalBtn?: Phaser.GameObjects.Image;
    private greaterBtn?: Phaser.GameObjects.Image;
    private lessBtn?: Phaser.GameObjects.Image;
    private equalButton?: Phaser.GameObjects.Container;
    private gameTimer?: Phaser.Time.TimerEvent;
    private progressBar?: ProgressBar;
    private isProcessing: boolean = false;
    private muteBtn!: Phaser.GameObjects.Container;
    private volumeSlider!: VolumeSlider;
    private scoreCoins!: ScoreCoins;
    private previousStreak: number = 0;
    private doorLeft!: Phaser.GameObjects.Image;
    private doorRight!: Phaser.GameObjects.Image;
    private topic: string;
    private gameConfigManager!: GameConfigManager;
    private bottomTray?: Phaser.GameObjects.Image;
    private equalButtonOverlay?: ButtonOverlay;
    private analyticsHelper!: AnalyticsHelper;

    constructor() {
        super('GameScene');
        
        this.gameConfigManager = GameConfigManager.getInstance();
        this.topic = this.gameConfigManager.get('topic') || "compare_scientific";
        const questionBank = getQuestionBankByName(this.topic);
        if (!questionBank) {
            throw new Error('Question bank not found');
        }
        this.questionSelector = new QuestionSelectorHelper(questionBank, this.totalQuestions);
        this.scoreHelper = new ScoreHelper(2); // Base bonus of 2 for streaks
    }

    private createDoors() {
        this.doorLeft = this.addImage(this.display.width / 2, this.display.height / 2, COMMON_ASSETS.DOOR.KEY).setOrigin(1, 0.5).setDepth(100);
        this.doorRight = this.addImage(this.display.width / 2, this.display.height / 2, COMMON_ASSETS.DOOR.KEY).setOrigin(0, 0.5).setFlipX(true).setDepth(100);
    }

    private openDoors() {
        const countdownImg = this.addImage(this.display.width / 2, this.display.height / 2, 'countdown_3').setOrigin(0.5).setDepth(101);
        countdownImg.setScale(240/countdownImg.height);
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
            // Send data to ScoreBoard scene
            this.scene.start('ScoreBoardScene', {
                totalRounds: this.scoreHelper.getTotalQuestions(),
                rounds: this.scoreHelper.getCorrectAnswers(),
                score: finalScore
            });
        });
    }

    private getCardOverlayLabel(side: 'left' | 'right') {
        if(side === 'left') {
            const opr1 = this.currentQuestion?.operand1 ?? ''
            if(this.topic !== 'grade7_topic3') {
                const type = this.determineNumberType(opr1);
                return i18n.t('game.valueCard', { form: i18n.t(`common.${type}`), value: opr1 });
            } else {
                return i18n.t('game.coinsCard', { value: opr1 });
            }
        } else {
            const question = this.currentQuestion!
            if(this.topic !== 'grade7_topic3') {
                const type = this.determineNumberType(question.operand2);
                return i18n.t('game.valueCard', { form: i18n.t(`common.${type}`), value: question.operand2 });
            } else {
                const [percentage, type] = question.discount.split(' ');
                const typeLabel = i18n.t(type == 'UP' ? 'game.discountTypeUp' : 'game.discountTypeOff');
                return i18n.t('game.itemCard', {
                    item: i18n.t(`game.items.${ITEM_MAPPING[question.item]}`),
                    value: question.operand2,
                    percentage: percentage,
                    type: typeLabel
                })
            }
        }
    }

    private async loadNextQuestion() {
        // focus to game container for screen reader
        focusToGameContainer();
        this.equalButtonOverlay?.setAriaHidden(false);

        const question = this.questionSelector.getNextQuestion();
        if (!question) {
            this.gameOver();
            return;
        }

        this.currentQuestion = question;

        if (this.topic === 'grade7_topic3' && this.bottomTray) {
            this.tweens.add({
                targets: this.bottomTray,
                x: "-=" + this.getScaledValue(150),
                duration: 800,
                ease: 'Sine.easeInOut'
            });
        }

        // Update cards with new question
        // Determine the question types for i18n labels
        const leftType = this.determineNumberType(question.operand1);
        const rightType = this.determineNumberType(question.operand2);

        const createCardBtnOverlay = (scene: BaseScene, side: 'left' | 'right', bgImage: Phaser.GameObjects.Image, card: Phaser.GameObjects.Container, label: string) => {
            return new ButtonOverlay(scene, card, {
                label: label,
                style: {
                    height: `${bgImage.height * this.display.scale}px`,
                    width: `${bgImage.width * this.display.scale}px`
                },
                onKeyDown: () => {
                    this.handleCardClick(side);
                    bgImage.setTexture('card_front');
                },
                onFocus: () => bgImage.setTexture('card_front_hover'),
                onBlur: () => bgImage.setTexture('card_front')
            })
        }

        const card1OverlayLabel = this.getCardOverlayLabel('left');
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
                this.topic === "grade7_topic3" ? "" : i18n.t(`common.${leftType}`),
                this.topic === "grade7_topic3" ? i18n.t('game.coins', { coins: question.operand1 }) : question.operand1,
                () => this.handleCardClick('left'),
                (bgImage, card) => {this.card1Overlay = createCardBtnOverlay(this, 'left', bgImage, card, card1OverlayLabel)}
            );
        } else {
            this.card1 = CardHelper.createCard(
                this,
                (this.display.width / 2) - 210,
                420,
                'leftCard',
                this.topic === "grade7_topic3" ? "" : i18n.t(`common.${leftType}`),
                this.topic === "grade7_topic3" ? i18n.t('game.coins', { coins: question.operand1 }) : question.operand1,
                () => this.handleCardClick('left'),
                (bgImage, card) => {this.card1Overlay = createCardBtnOverlay(this, 'left', bgImage, card, card1OverlayLabel)}
            );
        }

        const card2OverlayLabel = this.getCardOverlayLabel('right');
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
                this.topic === "grade7_topic3" ? "" : i18n.t(`common.${rightType}`),
                this.topic === "grade7_topic3" ? `${i18n.t('game.coins', { coins: question.operand2 })}|${question.discount}|${question.item}` : question.operand2,
                () => this.handleCardClick('right'),
                (bgImage, card) => {
                    this.card2Overlay = createCardBtnOverlay(this, 'right', bgImage, card, card2OverlayLabel);
                    // re-create equal ans button overlay for correct screen reader navigation
                    if(this.equalButtonOverlay) {
                        this.equalButtonOverlay.recreate();
                    }
                }
            );
        } else {
            this.card2 = CardHelper.createCard(
                this,
                (this.display.width / 2) + 210,
                420,
                'rightCard',
                this.topic === "grade7_topic3" ? "" : i18n.t(`common.${rightType}`),
                this.topic === "grade7_topic3" ? `${i18n.t('game.coins', { coins: question.operand2 })}|${question.discount}|${question.item}` : question.operand2,
                () => this.handleCardClick('right'),
                (bgImage, card) => {
                    this.card2Overlay = createCardBtnOverlay(this, 'right', bgImage, card, card2OverlayLabel);
                    // re-create equal ans button overlay for correct screen reader navigation
                    if(this.equalButtonOverlay) {
                        this.equalButtonOverlay.recreate();
                    }
                }
            );
        }

        if (this.volumeSlider.isOpen()) {
            this.setCardsInputEnabled(false);
        }

        this.time.delayedCall(1000, () => {
            announceToScreenReader(i18n.t('common.questionAnnounce', { number1: question.operand1, number2: this.topic === "grade7_topic3" ? `${i18n.t('game.coins', { coins: question.operand2 })} ${question.discount}` : question.operand2 }));
            this.isProcessing = false;
        });
    }

    private updateOverlay(card: Phaser.GameObjects.GameObject, overlay: ButtonOverlay, enabled: boolean) {
        if (enabled) {
            overlay.setDisabled(false);
            overlay.element.style.width = card.getData('overlayWidth') || '0px';
            overlay.element.style.height = card.getData('overlayHeight') || '0px';

            if (this.equalButton) {
                ButtonHelper.enableButton(this.equalButton);
            }
        } else {
            overlay.setDisabled(true);
            card.setData('overlayWidth', overlay.element.style.width);
            card.setData('overlayHeight', overlay.element.style.height);
            overlay.element.style.width = '0px';
            overlay.element.style.height = '0px';

            if (this.equalButton) {
                ButtonHelper.disableButton(this.equalButton);
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

    // Helper method to determine the number type for i18n
    private determineNumberType(number: string): string {
        // Check if it's scientific notation (contains '^')
        if (number.includes('^')) {
            return 'scientificNotation';
        }

        // Check if it's a fraction (contains '/')
        if (number.includes('/')) {
            return 'fractionForm';
        }

        // Check if it's a decimal (contains '.')
        if (number.includes('.')) {
            return 'decimalForm';
        }

        if (number.includes('√')) {
            return 'squareRoot';
        }

        if (number.includes('∛')) {
            return 'cubeRoot';
        }

        // Default to standard form
        return 'standardForm';
    }

    private showAnswerButton(autoClear: boolean = false) {
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
            let scale = this.getScaledValue(1);
            if (this.topic === "grade7_topic3") {
                scale = this.getScaledValue(1.2);
            }
            // Set initial state (invisible and scaled down)
            answerButton.setAlpha(0);
            answerButton.setScale(0.5);

            // Create a popup animation
            this.tweens.add({
                targets: answerButton,
                alpha: 1,
                scale,
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
        if (autoClear) {
            this.time.delayedCall(1000, () => {
                this.clearAnswerButtons();
            });
        }
    }

    private clearAnswerButtons() {
        this.equalBtn?.destroy();
        this.greaterBtn?.destroy();
        this.lessBtn?.destroy();
    }

    private handleClick(isCorrect: boolean, selectedSide?: 'left' | 'right' | 'equal') {
        if (!this.currentQuestion || this.isProcessing) return;
        this.isProcessing = true;

        // Create questionText based on topic
        let questionText: string;
        let formattedStudentResponse: string;
        
        if (this.topic === 'grade7_topic3') {
            questionText = `Which one is greater? ${this.currentQuestion.operand1} coins or ${this.currentQuestion.item} of ${this.currentQuestion.operand2} coins with ${this.currentQuestion.discount}`;
            
            // Format student response for grade7_topic3
            if (selectedSide === 'left') {
                formattedStudentResponse = `${this.currentQuestion.operand1} coins`;
            } else if (selectedSide === 'right') {
                formattedStudentResponse = `${this.currentQuestion.item} of ${this.currentQuestion.operand2} coins with ${this.currentQuestion.discount}`;
            } else {
                formattedStudentResponse = 'Equal';
            }
        } else {
            questionText = `Which one is greater? ${this.currentQuestion.operand1} or ${this.currentQuestion.operand2}`;
            if(selectedSide === 'left') {
                formattedStudentResponse = this.currentQuestion.operand1;
            } else if(selectedSide === 'right') {
                formattedStudentResponse = this.currentQuestion.operand2;
            } else {
                formattedStudentResponse = 'Equal';
            }
        }
        
        if (isCorrect) {
            this.analyticsHelper?.createTrial({
                questionMaxPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                achievedPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                questionText: questionText,
                isCorrect: true,
                questionMechanic: 'default',
                gameLevelInfo: 'game.number_knockout.default',
                studentResponse: formattedStudentResponse,
                studentResponseAccuracyPercentage: '100%',
            });

            // Show the correct answer first
            this.showAnswerButton(true);

            announceToScreenReader(i18n.t('common.correct'));
            // Flash the correct card green
            if (this.currentQuestion.answer === '>') {
                CardHelper.flashCard(this, this.card1!, true);
                // Animate yellow box on right card if topic is grade7_topic3
                if (this.topic === "grade7_topic3" && this.card2) {
                    CardHelper.animateYellowBox(this, this.card2!.list[5] as Phaser.GameObjects.Container);
                }
            } else if (this.currentQuestion.answer === '<') {
                CardHelper.flashCard(this, this.card2!, true);
                if (this.topic === "grade7_topic3" && this.card2) {
                    CardHelper.animateYellowBox(this, this.card2!.list[5] as Phaser.GameObjects.Container);
                }
            } else {
                // For equal case, flash both cards
                CardHelper.flashCard(this, this.card1!, true);
                CardHelper.flashCard(this, this.card2!, true);
                if (this.topic === "grade7_topic3" && this.card2) {
                    CardHelper.animateYellowBox(this, this.card2!.list[5] as Phaser.GameObjects.Container);
                }
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

            this.time.delayedCall(1000, () => {
                this.loadNextQuestion();
            });
        } else {
            this.analyticsHelper?.createTrial({
                questionMaxPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                achievedPoints: 0,
                questionText: questionText,
                isCorrect: false,
                questionMechanic: 'default',
                gameLevelInfo: 'game.number_knockout.default',
                studentResponse: formattedStudentResponse,
                studentResponseAccuracyPercentage: '0%',
            });

            // Show the correct answer first
            this.showAnswerButton();

            // Announce incorrect with the correct value for grade7_topic3
            if (this.topic === "grade7_topic3" && this.currentQuestion) {
                const discountedValue = CardHelper.calculateDiscountedValue(
                    this.currentQuestion.operand2,
                    this.currentQuestion.discount
                );
                announceToScreenReader(
                    i18n.t('common.incorrectCoins', { value: discountedValue }));
            } else {
                announceToScreenReader(i18n.t('common.incorrect'));
            }
            
            // Flash the incorrect card red
            if (this.currentQuestion.answer === '>') {
                CardHelper.flashCard(this, this.card2!, false);
                if (this.topic === "grade7_topic3" && this.card2) {
                    CardHelper.animateYellowBox(this, this.card2!.list[5] as Phaser.GameObjects.Container);
                }
            } else if (this.currentQuestion.answer === '<') {
                CardHelper.flashCard(this, this.card1!, false);
                if (this.topic === "grade7_topic3" && this.card2) {
                    CardHelper.animateYellowBox(this, this.card2!.list[5] as Phaser.GameObjects.Container);
                }
            } else {
                // For equal case, flash both cards
                CardHelper.flashCard(this, this.card1!, false);
                CardHelper.flashCard(this, this.card2!, false);
                if (this.topic === "grade7_topic3" && this.card2) {
                    CardHelper.animateYellowBox(this, this.card2!.list[5] as Phaser.GameObjects.Container);
                }
            }

            this.questionSelector.answerIncorrectly(this.currentQuestion);
            this.scoreHelper.answerIncorrectly();
            this.showErrorAnimation();

            // Update score and streak displays
            this.scoreCoins.updateScoreDisplay(false, this.previousStreak >= 3);
            const progress = this.questionSelector.getTotalQuestionsAnswered() / this.totalQuestions;
            this.progressBar?.updateStreakText(progress, this.scoreHelper.getCurrentStreak());
            this.progressBar?.drawProgressFill(progress, this.scoreHelper.getCurrentStreak());
            this.previousStreak = this.scoreHelper.getCurrentStreak();
            
            this.equalButton?.setAlpha(0);
            this.equalButtonOverlay?.setAriaHidden(true);

            ButtonHelper.disableButton(this.equalButton!);
            continueGameAfterWrongAnswer(this, () => {
                this.equalButton?.setAlpha(1);
                ButtonHelper.enableButton(this.equalButton!);
                this.clearAnswerButtons();
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

        this.handleClick(isCorrect, side);
    }

    private handleEqualClick() {
        if (!this.currentQuestion) return;

        const isCorrect = this.currentQuestion.answer === '=';

        this.handleClick(isCorrect, 'equal');
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

        this.audioManager.playSoundEffect('positive-sfx');
        // Simple slide up animation
        this.tweens.add({
            targets: successContainer,
            y: this.getScaledValue(this.display.height - height / 2),
            duration: 500,
            ease: "Power2",
            onComplete: () => {
                new ImageOverlay(this, icon, { label: i18n.t('common.correct') + ' ' + i18n.t('common.icon') });
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
        errorContainer.setDepth(100);
        // Create background rectangle
        const bgRect = this.addRectangle(0, 0, width, height, 0x8B0000);
        errorContainer.add(bgRect);

        const bgRectTop = this.addRectangle(0, -height / 2, width, 7, 0xF40000).setOrigin(0.5, 0);
        errorContainer.add(bgRectTop);

        // Create icon and text
        const icon = this.addImage(0, 0, 'incorrect_icon').setOrigin(0.5);

        errorContainer.add(icon);

        this.audioManager.playSoundEffect('negative-sfx');
        // Simple slide up animation
        this.tweens.add({
            targets: errorContainer,
            y: this.getScaledValue(this.display.height - height / 2),
            duration: 500,
            ease: "Power2",
            onComplete: () => {
                new ImageOverlay(this, icon, { label: i18n.t('common.incorrect') + ' ' + i18n.t('common.icon') });
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
        this.time.delayedCall(1000, () => {
            this.scene.pause();
            this.scene.launch('CelebrationScene', {
                scoreHelper: this.scoreHelper,
                progress: this.questionSelector.getTotalQuestionsAnswered() / this.totalQuestions,
                showSuccessCheckmark: false,
                callback: () => {
                    cb?.();
                }
            });
            this.scene.bringToTop('CelebrationScene');
        });
    }

    private resetGame() {
        // Since we're coming from ScoreBoard, we know it's a play-again
        this.questionSelector.reset(true);
        this.scoreHelper.reset();
        this.card1?.destroy();
        this.card2?.destroy();
        this.card1 = undefined;
        this.card2 = undefined;
    }

    init(data?: { reset?: boolean }) {
        if (!this.anims.exists('mascot_eyes_blink')) {
            this.anims.create({
                key: 'mascot_eyes_blink',
                frames: 'mascot_eyes',
                frameRate: 24,
                repeat: 1,
                hideOnComplete: true
            })
        }

        ScoreCoins.init(this);
        ProgressBar.init(this);

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

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen`);
        scene.load.image('star', 'star.png');
        scene.load.image('correct_icon', 'correct_icon.png');
        scene.load.image('incorrect_icon', 'incorrect_icon.png');
        scene.load.image('card_bg', 'card_bg.png');
        scene.load.image('card_bg_hover', 'card_bg_hover.png');
        scene.load.image('card_bg_success', 'card_bg_success.png');
        scene.load.image('card_bg_error', 'card_bg_error.png');
        scene.load.image("mascot_image", "mascot.png");
        scene.load.image('countdown_1', 'countdown_1.png');
        scene.load.image('countdown_2', 'countdown_2.png');
        scene.load.image('countdown_3', 'countdown_3.png');

        scene.load.image('card_coins', 'card_coins.png');
        scene.load.image('comic_books', 'comic_books.png');
        scene.load.image('archer_fox_figurine', 'archer_fox_figurine.png');
        scene.load.image('hoodie', 'hoodie.png');
        scene.load.image('sneakers', 'sneakers.png');
        scene.load.image('headphones', 'headphones.png');
        scene.load.image('game_controller', 'game_controller.png');
        scene.load.image('rubiks_cube', 'rubiks_cube.png');
        scene.load.image('strawberry_smoothie', 'strawberry_smoothie.png');
        scene.load.image('quadcopter_drone', 'quadcopter_drone.png');
        scene.load.image('skateboard', 'skateboard.png');
        scene.load.image('discount_text_bg_red', 'discount_text_bg_red.png');
        scene.load.image('discount_text_bg_green', 'discount_text_bg_green.png');
        scene.load.image('arrow_up', 'arrow_up.png');
        scene.load.image('arrow_down', 'arrow_down.png');
        scene.load.image('game_info_bg', 'game_info_bg.png');
        scene.load.image('grab_the_deal_bg', 'grab_the_deal_bg.png');
        scene.load.image('bottom_tray', 'bottom_tray.png');
        scene.load.image('celebration_bg_amount', 'celebration_bg_amount.png');

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}${COMMON_ASSETS.PATH}`);
        scene.load.image(COMMON_ASSETS.EQUAL_BUTTON.KEY, COMMON_ASSETS.EQUAL_BUTTON.PATH);
        scene.load.image(COMMON_ASSETS.GREATER_BUTTON.KEY, COMMON_ASSETS.GREATER_BUTTON.PATH);
        scene.load.image(COMMON_ASSETS.LESS_BUTTON.KEY, COMMON_ASSETS.LESS_BUTTON.PATH);
        scene.load.image('yellow_box', 'yellow_box.png');
        scene.load.image('card_front', 'card_front.png');
        scene.load.image('card_front_amount', 'card_front_amount.png');
        scene.load.image('card_front_hover', 'card_front_hover.png');
        scene.load.image('card_front_hover_amount', 'card_front_hover_amount.png');
        scene.load.image('card_front_pressed', 'card_front_pressed.png');
        scene.load.image('card_front_pressed_amount', 'card_front_pressed_amount.png');
        scene.load.image('card_back', `card_back_${language}.png`);
        scene.load.image('card_glow_success', 'card_glow_success.png');
        scene.load.image('card_glow_error', 'card_glow_error.png');
        scene.load.image(COMMON_ASSETS.DOOR.KEY, COMMON_ASSETS[topic === 'grade7_topic3' ? 'DOOR_2' : 'DOOR'].PATH);

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}`);
        scene.load.audio('door_close', 'door_close.wav');
        scene.load.audio('door_open', 'door_open.wav');
        scene.load.audio('countdown', 'countdown.mp3');

        scene.load.setPath(`${BUTTONS.PATH}`);
        scene.load.image(BUTTONS.ICON_BTN.KEY, BUTTONS.ICON_BTN.PATH);
        scene.load.image(BUTTONS.ICON_BTN_HOVER.KEY, BUTTONS.ICON_BTN_HOVER.PATH);
        scene.load.image(BUTTONS.ICON_BTN_PRESSED.KEY, BUTTONS.ICON_BTN_PRESSED.PATH);
        scene.load.image(BUTTONS.PAUSE_ICON.KEY, BUTTONS.PAUSE_ICON.PATH);
        scene.load.image(BUTTONS.RESUME_ICON.KEY, BUTTONS.RESUME_ICON.PATH);
        scene.load.image(BUTTONS.MUTE_ICON.KEY, BUTTONS.MUTE_ICON.PATH);
        scene.load.image(BUTTONS.UNMUTE_ICON.KEY, BUTTONS.UNMUTE_ICON.PATH);
        scene.load.image(BUTTONS.HELP_ICON.KEY, BUTTONS.HELP_ICON.PATH);
        scene.load.image(BUTTONS.SETTINGS_ICON.KEY, BUTTONS.SETTINGS_ICON.PATH);

        scene.load.setPath(`${ASSETS_PATHS.ATLAS}/mascot_eyes`);
        scene.load.atlas('mascot_eyes', 'mascot_eyes.png', 'mascot_eyes.json');

        scene.load.setPath(`${ASSETS_PATHS.ATLAS}/streak_animation`);
        scene.load.atlas('streak_animation_0', 'texture-0.png', 'texture-0.json');
        scene.load.atlas('streak_animation_1', 'texture-1.png', 'texture-1.json');
        scene.load.atlas('streak_animation_2', 'texture-2.png', 'texture-2.json');

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}`);
        scene.load.audio('positive-sfx', 'positive.wav');
        scene.load.audio('negative-sfx', 'negative.wav');
        scene.load.audio('bg-music', `bg_music.mp3`);
        scene.load.audio('card_flip', 'card_flip.mp3');

        VolumeSlider.preload(scene, 'blue');
        ProgressBar.preload(scene, 'light');
        ScoreCoins.preload(scene, 'blue');
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
        this.analyticsHelper?.createSession('game.number_knockout.default');

        // Focus to game container
        focusToGameContainer();

        this.audioManager.initialize(this);

        this.createDoors();

        // Add background
        setSceneBackground('assets/images/common/bg.png');
        const backgroundImage = this.topic === "grade7_topic3" ? 'grab_the_deal_bg' : COMMON_ASSETS.BACKGROUND.KEY;
        this.addImage(this.display.width / 2, this.display.height / 2, backgroundImage).setOrigin(0.5);
        if (this.topic === "grade7_topic3") {
            this.bottomTray = this.addImage(0, this.display.height - 169, 'bottom_tray').setOrigin(0);
            this.addImage(this.display.width / 2, 150, 'game_info_bg').setOrigin(0.5);
        }


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

        // Pause button
        this.createPauseButton();

        // Mute button
        this.createMuteButton();

        // Volume slider
        this.createVolumeSlider();

        // Help button
        this.createHelpButton();

        const infoTextContent = this.topic === "grade7_topic3" ? i18n.t('info.infoTextAmount') : i18n.t('info.infoText');
        const infoText = this.addText(this.display.width / 2, 150, infoTextContent, {
            fontFamily: "Exo",
            fontStyle: "bold",
            fontSize: 25,
            color: '#000000',
        }).setOrigin(0.5);
        new TextOverlay(this, infoText, { label: infoTextContent });

        this.equalButton = ButtonHelper.createButton({
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

        this.equalButtonOverlay = (this.equalButton as any).buttonOverlay as ButtonOverlay;

        // Load first question
        // delay question load for countdown announcement
        this.time.delayedCall(4000, () => {
            this.loadNextQuestion();
        });

        setTimeout(() => {
            this.openDoors();
        }, 500);
    }

    private createHelpButton() {
        const onKeyDown = () => {
            this.scene.pause();
            this.scene.launch("InfoScene", { parentScene: "Shooter" });
            this.scene.bringToTop("InfoScene");
        }
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
            onClick: () => onKeyDown(),
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
        const onKeyDown = () => {
            this.volumeSlider.toggleControl();
        }
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
            onClick: () => onKeyDown(),
        });
    }

    private createMuteButton() {
        const onKeyDown = () => {
            this.audioManager.setMute(!this.audioManager.getIsAllMuted());
        }
        this.muteBtn = ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: this.audioManager.getIsAllMuted() ? BUTTONS.MUTE_ICON.KEY : BUTTONS.UNMUTE_ICON.KEY,
            x: this.display.width - 54,
            y: 142,
            label: i18n.t('common.mute'),
            ariaLive: 'off',
            raisedOffset: 3.5,
            onClick: () => onKeyDown(),
        });
    }

    private createPauseButton() {
        const onKeyDown = () => {
            this.scene.pause();
            this.scene.launch("PauseScene", { parentScene: "GameScene" });
            this.audioManager.pauseAll();
        }
        ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.PAUSE_ICON.KEY,
            raisedOffset: 3.5,
            x: this.display.width - 54,
            y: 66,
            label: i18n.t('common.pause'),
            onClick: () => onKeyDown(),
        }).setName('pause_btn');
    }
}