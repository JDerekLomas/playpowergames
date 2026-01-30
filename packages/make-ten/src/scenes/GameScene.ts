import { CirclesDisplay } from "../components/CirclesDisplay";
import { GameLogic } from "../GameLogic";
import { NumberPad } from "../components/NumberPad";
import { MuteButton } from "../components/MuteButton";
import { GameSceneConfig as Config } from "../config/GameSceneConfig";
import { AssetsConfig } from "../config/AssetsConfig";
import { BaseScene, ButtonHelper, i18n, ProgressBar, ScoreCoins, setSceneBackground, TextOverlay, VolumeSlider, announceToScreenReader, SCORE_COUNTS, GameConfigManager, focusToGameContainer, AnalyticsHelper } from "@k8-games/sdk";
import { DoorUtils } from "../utils/DoorUtils";
import { continueGameAfterWrongAnswer } from "../utils/helper";
import { MULTIVERSE_TOPICS } from "../config/CommonConfig";

export class GameScene extends BaseScene {
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    gameText: Phaser.GameObjects.Text;
    private circlesDisplay: CirclesDisplay | null = null;
    private numberPad: NumberPad;
    private gameLogic: GameLogic;
    private equationContainer: Phaser.GameObjects.Container;
    private cursorTween: Phaser.Tweens.Tween;
    private progressBar!: ProgressBar;
    private scoreCoins!: ScoreCoins;
    private prevStreak: number = 0;
    private previousStreakMilestone: number = 0;
    private volumeSlider: VolumeSlider;
    private questionBgRect: Phaser.GameObjects.Rectangle;
    private questionOverlay: TextOverlay;
    private muteButton: MuteButton;
    private mode: string;
    private inputBuffer: string = "";
    private inputLocked: boolean = false;
    private analyticsHelper!: AnalyticsHelper;
    // When true, after resuming from CelebrationScene we should advance to next question
    private advanceAfterResume: boolean = false;
    private announcementQueue: string[] = [];
    private isAnnouncing: boolean = false;
    
    constructor() {
        super("GameScene");
        this.gameLogic = new GameLogic(undefined, 20);
        this.audioManager.initialize(this);
        if (this.circlesDisplay) {
            this.circlesDisplay.clear();
            this.circlesDisplay = null;
        }

        const gameConfigManager = GameConfigManager.getInstance();
        this.mode = gameConfigManager.get('mode') || 'make_ten';
    }

    init(data?: { reset?: boolean }) {
        if (data?.reset) {
            this.gameLogic.resetGame();
        } else {
            this.gameLogic.setQuestion();
        }
        this.prevStreak = 0;
        this.previousStreakMilestone = 0;
        ProgressBar.init(this);
        ScoreCoins.init(this);

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
        ProgressBar.preload(scene, 'dark');
        ScoreCoins.preload(scene, 'purple');
        VolumeSlider.preload(scene, 'purple');
    }

    create() {
        const _analyticsHelper = AnalyticsHelper.getInstance();
        if (_analyticsHelper) {
            this.analyticsHelper = _analyticsHelper;
            this.gameLogic.analyticsHelper = this.analyticsHelper;
        } else {
            console.error('AnalyticsHelper not found');
        }

        const gameConfigManager = GameConfigManager.getInstance();
        const topic = gameConfigManager.get('topic') || 'make_ten';
        const mode = gameConfigManager.get('mode') || 'make_ten';
        if (MULTIVERSE_TOPICS.includes(topic)) {
            const gameLevelInfo = mode === 'make_20' ? 'game.multiverse.make_20' : 'game.multiverse.make_10';
            this.analyticsHelper?.createSession(gameLevelInfo);
        } else {
            this.analyticsHelper?.createSession('game.make_10.default');
        }

        this.setupBackground();
        this.createScoreDisplay();
        this.createProgressBar();
        this.createCirclesDisplay();
        this.renderQuestion();
        this.createPauseButton();
        this.createMuteButton();
        this.createVolumeSliderButton();
        this.createHelpButton();
        this.createNumberPad();

        const doorUtils = new DoorUtils(this);
        doorUtils.openDoors();

        // Advance to next question only when coming back from CelebrationScene
        this.events.on('resume', () => {
            if (this.advanceAfterResume && !this.gameLogic.isGameComplete()) {
                this.advanceAfterResume = false;
                // Proceed to next question and re-enable inputs
                this.updateProgressDisplay();
                this.audioManager.playSoundEffect(AssetsConfig.KEYS.AUDIO.QUESTION_CHANGE);
                this.gameLogic.setQuestion();
                this.circlesDisplay?.update();
                this.playQuestionChangeAnimation();
                this.time.delayedCall(100, () => {
                    this.renderQuestion();
                });
            }
        });
    }

    private setupBackground() {
        setSceneBackground('assets/images/game-light-background.png');
        this.background = this.addImage(
            Config.GAME_LIGHT_BACKGROUND.POSITION.X,
            Config.GAME_LIGHT_BACKGROUND.POSITION.Y,
            AssetsConfig.KEYS.IMAGES.GAME_LIGHT_BACKGROUND
        )
            .setOrigin(0.5)
            .setScale(Config.GAME_LIGHT_BACKGROUND.SCALE);

        this.addImage(
            Config.GAME_RECTANGLE.POSITION.X,
            Config.GAME_RECTANGLE.POSITION.Y,
            AssetsConfig.KEYS.IMAGES.GAME_RECTANGLE
        )
            .setOrigin(0.5)
            .setCrop(
                Config.GAME_RECTANGLE.CROP.X,
                Config.GAME_RECTANGLE.CROP.Y,
                Config.GAME_RECTANGLE.CROP.WIDTH,
                Config.GAME_RECTANGLE.CROP.HEIGHT
            )
            .setTint(Config.GAME_RECTANGLE.TINT);

        this.questionBgRect = this.addRectangle(
            Config.RECTANGLE.POSITION.X,
            Config.RECTANGLE.POSITION.Y,
            Config.RECTANGLE.SIZE.WIDTH,
            Config.RECTANGLE.SIZE.HEIGHT,
            undefined,
            0
        ).setOrigin(0.5);
    }

    private createProgressBar() {
        this.progressBar = new ProgressBar(this, 'dark', i18n);
        this.progressBar.create(
            this.getScaledValue(this.display.width / 2),
            this.getScaledValue(70)
        );
    }

    private createCirclesDisplay() {
        if (this.circlesDisplay) {
            if (this.gameLogic.getCurrentRound() > 1) {
                this.circlesDisplay.animateToLeft();
            } else {
                this.circlesDisplay.clear();
                this.circlesDisplay = null;
            }
        }
        this.circlesDisplay = new CirclesDisplay(this, this.gameLogic);

        this.circlesDisplay.create({
            x: this.mode === 'make_20' ? 379: Config.CIRCLES_DISPLAY.POSITION.X,
            y: Config.CIRCLES_DISPLAY.POSITION.Y,
            radius: Config.CIRCLES_DISPLAY.RADIUS,
            animate: true,
            totalCircles: this.mode === 'make_20' ? 20 : 10,
            maxCirclesPerRow: this.mode === 'make_20' ? 10 : 5,
        });
    }

    private createMuteButton() {
        this.muteButton = new MuteButton(
            this,
            Config.MUTE_BUTTON.POSITION.X,
            Config.MUTE_BUTTON.POSITION.Y
        );

        this.events.on('update', () => {
            this.muteButton.updateIcon(this);
        }, this);
    }

    private renderQuestion() {
        if (this.equationContainer) {
            const oldContainer = this.equationContainer;

            this.createNewEquationElements();
            this.createCirclesDisplay();
            
            this.tweens.add({
                targets: oldContainer,
                x: -this.display.width,
                duration: Config.PREV_QUESTION_TWEEN_2.DURATION,
                ease: Config.PREV_QUESTION_TWEEN_2.EASE,
                onComplete: () => {
                    oldContainer.destroy();
                    this.numberPad?.enableButtons();
                },
            });
        } else {
            this.createNewEquationElements();
            // Enable NumberPad for the first question (no animation)
            this.numberPad?.enableButtons();
        }
    }

    private createCursorTween(targetName: string = 'equationInputText') {
        if (this.cursorTween && this.cursorTween.isPlaying()) {
            this.cursorTween.stop();
        }

        const target = this.equationContainer.getByName(targetName) as Phaser.GameObjects.Text;
        if (!target) {
            return;
        }
        target.setAlpha(1);
        this.cursorTween = this.tweens.add({
            targets: target,
            alpha: 0,
            duration: 800,
            yoyo: true,
            repeat: -1,
        });
    }

    private createNewEquationElements() {
        this.inputBuffer = "";
        const questionConfig = {
            fontFamily: Config.QUESTION_CONFIG.FONT_FAMILY,
            fontSize: Config.QUESTION_CONFIG.FONT_SIZE,
            color: Config.QUESTION_CONFIG.COLOR,
            align: Config.QUESTION_CONFIG.ALIGN,
            fontStyle: Config.QUESTION_CONFIG.FONT_STYLE,
        };

        const equationConfig = {
            ...questionConfig,
            fontSize: Config.EQ_CONFIG.FONT_SIZE,
            fontStyle: Config.EQ_CONFIG.FONT_STYLE,
        };

        const firstNumber = this.gameLogic.getFirstNumber();
        const centerX = this.display.width / 2;
        const ySpacing = Config.QUESTION_TEXTS.SPACING;
        const equationY = Config.QUESTION_TEXTS.POSITION.Y - ySpacing;

        const startX = centerX * 2;
        const currentQuestion = this.gameLogic.getCurrentQuestion();
        const isTwoDigitAnswer = this.mode === 'make_20' && (currentQuestion.answer?.length === 2);
        const inputBoxWidth = isTwoDigitAnswer ? 102 : 62;
        const inputBoxHeight = 57;

        this.equationContainer = this.add.container(this.getScaledValue(startX), this.getScaledValue(equationY));

        const gap = 15;

        const elements: (Phaser.GameObjects.Text | Phaser.GameObjects.Rectangle)[] = [];

        const createQuestionText = (text: string) => {
            const questionText = this.addText(
                0,
                0,
                text,
                equationConfig
            ).setOrigin(0, 0.5).setName('questionText');
            
            if (elements.length > 0) {
                questionText.setX(elements[elements.length - 1].getBounds().right + this.getScaledValue(gap));
            }

            elements.push(questionText);
        }

        const createPlusText = () => {
            const plusText = this.addText(
                0,
                0,
                "+",
                equationConfig
            ).setOrigin(0, 0.5);

            if (elements.length > 0) {
                plusText.setX(elements[elements.length - 1].getBounds().right + this.getScaledValue(gap));
            }

            elements.push(plusText);
        }

        const createInputBox = () => {
            const inputBox = this.addRectangle(
                0,
                -2,
                inputBoxWidth,
                inputBoxHeight
            )
                .setOrigin(0, 0.5)
                .setStrokeStyle(
                    this.getScaledValue(2),
                    Config.INPUT_BOX.STROKE.COLOR
                )
                .setName('inputBox');

            if (elements.length > 0) {
                inputBox.setX(elements[elements.length - 1].getBounds().right + this.getScaledValue(gap));
            }

            if (isTwoDigitAnswer) {
                const bounds = inputBox.getBounds();
                const offset = this.getScaledValue(15);

                const equationInputText = this.addText(
                    0,
                    0,
                    "_",
                    equationConfig
                ).setOrigin(0.5).setName('equationInputText');

                equationInputText.setX(bounds.centerX - offset);

                const equationInputText2 = this.addText(
                    0,
                    0,
                    "_",
                    equationConfig
                ).setOrigin(0.5).setName('equationInputText2');

                equationInputText2.setX(bounds.centerX + offset);

                elements.push(equationInputText);
                elements.push(equationInputText2);
                elements.push(inputBox);
            } else {
                const equationInputText = this.addText(
                    0,
                    0,
                    "_",
                    equationConfig
                ).setOrigin(0.5).setName('equationInputText');

                equationInputText.setX(inputBox.getBounds().centerX);

                elements.push(equationInputText);
                elements.push(inputBox);
            }
        }

        const createEqualText = () => {
            const equalText = this.addText(
                0,
                0,
                "=",
                equationConfig
            ).setOrigin(0, 0.5);

            if (elements.length > 0) {
                equalText.setX(elements[elements.length - 1].getBounds().right + this.getScaledValue(gap));
            }

            elements.push(equalText);
        }

        const createTenText = () => {
            const equationAnswerText = this.addText(
                0,
                0,
                this.mode === 'make_20' ? "20" : "10",
                equationConfig
            ).setOrigin(0, 0.5);

            if (elements.length > 0) {
                equationAnswerText.setX(elements[elements.length - 1].getBounds().right + this.getScaledValue(gap));
            }

            elements.push(equationAnswerText);
        }

        const question = currentQuestion;

        if (question.position === 'lhs') {
            if (question.operand1 === "") {
                createInputBox();
                createPlusText();
                createQuestionText(i18n.formatNumber(firstNumber));
            } else {
                createQuestionText(i18n.formatNumber(firstNumber));
                createPlusText();
                createInputBox();
            }
            createEqualText();
            createTenText();
        } else {
            createTenText();
            createEqualText();
            if (question.operand1 === "") {
                createInputBox();
                createPlusText();
                createQuestionText(i18n.formatNumber(firstNumber));
            } else {
                createQuestionText(i18n.formatNumber(firstNumber));
                createPlusText();
                createInputBox();
            }
        }

        this.equationContainer.add([
            ...elements,
        ]);

        if (!this.questionOverlay) {
            // dummy text to create the overlay
            const dummyText = this.addText(this.equationContainer.x / this.display.scale, this.equationContainer.y / this.display.scale, '').setVisible(false);
            this.questionOverlay = new TextOverlay(this, dummyText, { label: '', announce: true });
        }

        this.createCursorTween();

        this.equationContainer.setSize(
            elements[elements.length - 1].getBounds().right - elements[0].getBounds().left,
            elements[elements.length - 1].getBounds().height
        );

        this.equationContainer.setPosition(
            this.getScaledValue(startX),
            this.getScaledValue(equationY)
        );

        this.tweens.add({
            targets: this.equationContainer,
            x: this.getScaledValue(centerX) - this.equationContainer.width / 2,
            duration: Config.PREV_QUESTION_TWEEN_2.DURATION,
            ease: Config.PREV_QUESTION_TWEEN_2.EASE,
            onComplete: () => {
                if (this.questionOverlay) {
                    this.questionOverlay.domElement?.setPosition(this.equationContainer.getBounds().centerX, this.equationContainer.getBounds().centerY);
                    const label = i18n.t("common.question", { number: i18n.formatNumberForScreenReader(firstNumber), target: this.mode === 'make_20' ? "20" : "10" });
                    this.questionOverlay.updateContent(label);
                }
            }
        });
    }

    private showCorrectAnswer() {
        const currentQuestion = this.gameLogic.getCurrentQuestion();
        const expectedAnswer = currentQuestion.answer;

        // Apply green color to show correct answer
        const inputBox = this.equationContainer.getByName('inputBox') as Phaser.GameObjects.Rectangle;
        if (inputBox) {
            inputBox.setStrokeStyle(this.getScaledValue(2), 0x6BFF00);
        }

        if(this.mode === 'make_20' && currentQuestion.answer.length === 2) {
            const inputText1 = this.equationContainer.getByName('equationInputText') as Phaser.GameObjects.Text;
            const inputText2 = this.equationContainer.getByName('equationInputText2') as Phaser.GameObjects.Text;
            if (inputText1) {
                inputText1.setText(expectedAnswer.charAt(0));
            }
            if (inputText2) {
                inputText2.setText(expectedAnswer.charAt(1));
            }
        } else {
            const inputText = this.equationContainer.getByName('equationInputText') as Phaser.GameObjects.Text;
            inputText.setText(expectedAnswer);
        }
    }
    
    private createNumberPad() {
        this.numberPad = new NumberPad(this, (number: number) => {
            if (this.inputLocked) return;
            this.inputLocked = true;

            const currentQuestion = this.gameLogic.getCurrentQuestion();
            const isTwoDigitAnswer = this.mode === 'make_20' && (currentQuestion.answer?.length === 2);

            if (isTwoDigitAnswer) {
                // First digit entry
                if (this.inputBuffer.length === 0) {
                    const inputText1 = this.equationContainer.getByName('equationInputText') as Phaser.GameObjects.Text;
                    inputText1.setAlpha(1);
                    inputText1.setText(`${number}`);
                    this.inputBuffer = `${number}`;
                    // Move blinking cursor to second digit
                    this.createCursorTween('equationInputText2');

                    this.time.delayedCall(25, () => { this.inputLocked = false; })
                    return; // Wait for second digit before evaluation
                }

                // Second digit entry
                const twoDigitValue = parseInt(this.inputBuffer + `${number}`, 10);
                this.gameLogic.setSecondNumber(twoDigitValue);
                if (this.cursorTween && this.cursorTween.isPlaying()) {
                    this.cursorTween.stop();
                }
                const inputText2 = this.equationContainer.getByName('equationInputText2') as Phaser.GameObjects.Text;
                if (inputText2) {
                    inputText2.setAlpha(1);
                    inputText2.setText(`${number}`);
                }
                this.circlesDisplay?.update();
                this.numberPad.disableButtons();
                // Clear buffer for next question lifecycle
                this.inputBuffer = "";
            } else {
                // One digit flow (make_ten or make_20 single digit)
                this.gameLogic.setSecondNumber(number);
                if (this.cursorTween && this.cursorTween.isPlaying()) {
                    this.cursorTween.stop();
                }
                const inputText = this.equationContainer.getByName('equationInputText') as Phaser.GameObjects.Text;
                inputText.setAlpha(1);
                inputText.setText(`${number}`);
                this.circlesDisplay?.update();
                this.numberPad.disableButtons();
            }

            this.gameLogic.submitAnswer();
            const isCorrect = this.gameLogic.isCorrect();

            // Apply color feedback to answer box and text
            const inputBox = this.equationContainer.getByName('inputBox') as Phaser.GameObjects.Rectangle;
            const color = isCorrect ? 0x6BFF00 : 0xF80501;
            
            if (inputBox) {
                inputBox.setStrokeStyle(this.getScaledValue(2), color);
            }

            this.updateProgressDisplay();

            if (isCorrect) {
                focusToGameContainer();
                this.queueAnnouncement(i18n.t('common.correct', { answer: currentQuestion.answer }), true);

                const streak = this.gameLogic.scoreHelper.getCurrentStreak();
                this.prevStreak = streak;

                // Check if we've reached a new streak milestone
                if (SCORE_COUNTS.includes(streak) && this.previousStreakMilestone < streak) {
                    this.previousStreakMilestone = streak;
                }

                this.time.delayedCall(1400, () => {
                    this.scoreCoins.updateScoreDisplay(true);
                    this.time.delayedCall(200, () => {
                        if (this.gameLogic.wizardHappy()) {
                            this.scene.pause();
                            // Mark to move forward once celebration ends and this scene resumes
                            this.advanceAfterResume = true;
                            this.scene.launch("CelebrationScene", {
                                scoreHelper: this.gameLogic.scoreHelper,
                                gameLogic: this.gameLogic,
                            });
                            this.scene.bringToTop("CelebrationScene");
                        } else {
                            this.time.delayedCall(800, () => {
                                this.updateProgressDisplay();
                                this.time.delayedCall(800, () => {
                                    this.audioManager.playSoundEffect(AssetsConfig.KEYS.AUDIO.QUESTION_CHANGE);
                                    this.gameLogic.setQuestion();
                                    this.circlesDisplay?.update();
                                    this.playQuestionChangeAnimation();
                                    this.time.delayedCall(100, () => {
                                        this.renderQuestion();
                                    });
                                });
                            });
                        }
                    });
                });
            } else {
                focusToGameContainer();
                this.queueAnnouncement(i18n.t('common.incorrect', { answer: currentQuestion.answer }), true);
                const hasStreakBroken = this.prevStreak >= 3;
                this.prevStreak = 0;
                this.scoreCoins.updateScoreDisplay(false, hasStreakBroken);
                this.updateProgressDisplay();
                this.audioManager.playSoundEffect(
                    AssetsConfig.KEYS.AUDIO.WIZARD_SAD
                );
            }

            // Handle question change after a short delay
            this.time.delayedCall(1500, () => {
                if (this.gameLogic.isGameComplete()) {
                    this.time.delayedCall(200, () => {
                        this.audioManager.playSoundEffect(
                            AssetsConfig.KEYS.AUDIO.COIN_SCORECARD
                        );
    
                        const doorUtils = new DoorUtils(this);
                        doorUtils.closeDoors(() => {
                            this.scene.start("ScoreboardScene", {
                                scoreData: {
                                    correctAnswers:
                                        this.gameLogic.scoreHelper.getCorrectAnswers(),
                                    totalQuestions:
                                        this.gameLogic.getMaxRounds(),
                                },
                                score: this.gameLogic.scoreHelper.getTotalScore(),
                            });
                        }, false);
                    })
                } else {
                    if(!isCorrect) {
                        this.time.delayedCall(1500, () => {
                            this.circlesDisplay?.update();
                            this.showCorrectAnswer();
                            continueGameAfterWrongAnswer(this, () => {
                                this.audioManager.playSoundEffect(AssetsConfig.KEYS.AUDIO.QUESTION_CHANGE);
                                this.gameLogic.setQuestion();
                                this.circlesDisplay?.update();
                                this.playQuestionChangeAnimation();
                                this.time.delayedCall(100, () => {
                                    this.renderQuestion();
                                    this.time.delayedCall(50, () => {
                                        focusToGameContainer();
                                        const firstNumber = this.gameLogic.getFirstNumber();
                                        const label = i18n.t("common.question", { 
                                            number: i18n.formatNumberForScreenReader(firstNumber), 
                                            target: this.mode === 'make_20' ? "20" : "10" 
                                        });
                                        this.queueAnnouncement(label, true);
                                    });
                                });
                            });
                        });
                    }
                }
            });

            this.inputLocked = false;
        }, this.mode === 'make_20' ? () => this.handleBackspace() : undefined);
        this.numberPad.create({
            x: Config.NUMBER_PAD.POSITION.X,
            y: Config.NUMBER_PAD.POSITION.Y,
            padding: Config.NUMBER_PAD.PADDING,
            theme: Config.NUMBER_PAD.THEME,
            fontSize: Config.NUMBER_PAD.FONT_SIZE,
            buttonBottomPadding: Config.NUMBER_PAD.BUTTON_BOTTOM_PADDING,
        });
    }

    private handleBackspace(): void {
        const currentQuestion = this.gameLogic.getCurrentQuestion();
        const isTwoDigitAnswer = this.mode === 'make_20' && (currentQuestion.answer?.length === 2);
        if (!isTwoDigitAnswer) {
            return;
        }

        // Only actionable before submission: when first digit is filled and waiting for second
        if (this.inputBuffer.length === 1) {
            const inputText1 = this.equationContainer.getByName('equationInputText') as Phaser.GameObjects.Text;
            const inputText2 = this.equationContainer.getByName('equationInputText2') as Phaser.GameObjects.Text;
            if (inputText1) {
                inputText1.setText('_');
            }
            if (inputText2) {
                inputText2.setText('_');
            }
            this.inputBuffer = "";
            this.createCursorTween('equationInputText');
            inputText2.setAlpha(1);
        }
    }

    private playQuestionChangeAnimation() {
        const x = (this.questionBgRect.x + this.questionBgRect.width / 2) / this.display.scale;
        const y = this.questionBgRect.getBounds().top  / this.display.scale;

        const animateImage = (image: Phaser.GameObjects.Image) => {
            this.tweens.add({
                targets: image,
                x: 0,
                duration: 500,
                ease: 'Linear',
                onComplete: () => {
                    image.destroy();
                }
            })
        };

        const firstImage = this.addImage(x, y, "question_change_light").setScale(0.87).setOrigin(0.5, 0);
        animateImage(firstImage);

        this.time.delayedCall(150, () => {
            const secondImage = this.addImage(x, y, "question_change_dark").setScale(0.87).setOrigin(0.5, 0);
            animateImage(secondImage);
        })

        this.time.delayedCall(300, () => {
            const thirdImage = this.addImage(x, y, "question_change_light").setScale(0.87).setOrigin(0.5, 0);
            animateImage(thirdImage);
        })
    }

    private createScoreDisplay() {
        this.scoreCoins = new ScoreCoins(this, this.gameLogic.scoreHelper, i18n, 'purple');
        this.scoreCoins.create(
            this.getScaledValue(87),
            this.getScaledValue(63)
        );
    }

    private createPauseButton() {
        ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: AssetsConfig.KEYS.BUTTONS.ICON_BTN,
                hover: AssetsConfig.KEYS.BUTTONS.ICON_BTN_HOVER,
                pressed: AssetsConfig.KEYS.BUTTONS.ICON_BTN_PRESSED,
            },
            icon: AssetsConfig.KEYS.BUTTONS.PAUSE_BTN,
            label: i18n.t("common.pause"),
            x: this.display.width - 54,
            y: 64,
            onClick: () => {
                this.scene.pause();
                this.scene.launch("PauseScene", { parentScene: "GameScene" });
                this.audioManager.pauseAll();
            },
            raisedOffset: 3.5,
        }).setDepth(2).setName('pause_btn');
    }

    private createVolumeSliderButton() {
        this.volumeSlider = new VolumeSlider(this);
        this.volumeSlider.create(this.display.width - 220, 245, 'purple', i18n.t('common.volume'));
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
            y: 220,
            onClick: () => {
                this.volumeSlider.toggleControl();
            },
            raisedOffset: 3.5,
        }).setDepth(2);
    }

    private createHelpButton() {
        ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: AssetsConfig.KEYS.BUTTONS.ICON_BTN,
                hover: AssetsConfig.KEYS.BUTTONS.ICON_BTN_HOVER,
                pressed: AssetsConfig.KEYS.BUTTONS.ICON_BTN_PRESSED,
            },
            icon: AssetsConfig.KEYS.BUTTONS.HELP_BTN,
            label: i18n.t("common.help"),
            x: this.display.width - 54,
            y: 298,
            onClick: () => {
                this.scene.pause();
                this.scene.launch("HowToPlay", { parentScene: "GameScene" });
                this.scene.bringToTop("HowToPlay");
            },
            raisedOffset: 3.5,
        }).setDepth(2);
    }

    private updateProgressDisplay() {
        const currentRound = this.gameLogic.getCurrentRound();
        const totalRounds = this.gameLogic.getMaxRounds();
        const progress = currentRound / totalRounds;
        const currentStreak = this.gameLogic.scoreHelper.getCurrentStreak();
        
        this.progressBar.drawProgressFill(progress, currentStreak);
    }

    private queueAnnouncement(message: string, priority: boolean = false) {
        if (priority) {
            // For priority announcements (like feedback), clear queue and add immediately
            this.announcementQueue = [message];
            this.isAnnouncing = false;
        } else {
            this.announcementQueue.push(message);
        }
        this.processAnnouncementQueue();
    }
    
    private processAnnouncementQueue() {
        if (this.isAnnouncing || this.announcementQueue.length === 0) {
            return;
        }
    
        this.isAnnouncing = true;
        const message = this.announcementQueue.shift()!;
    
        // Clear first, then announce with a small delay
        announceToScreenReader('', 'assertive');
        
        setTimeout(() => {
            announceToScreenReader(message, 'assertive');
            
            // Estimate the duration of the announcement
            const words = message.split(' ').length;
            const estimatedDuration = (words / 2.5) * 1000; // 2.5 words per second
            const delay = Math.max(estimatedDuration + 500, 2000); // Minimum 2 seconds
    
            this.time.delayedCall(delay, () => {
                this.isAnnouncing = false;
                this.processAnnouncementQueue();
            });
        }, 50);
    }

    shutdown() {
        this.audioManager.stopAllSoundEffects();
        
        if (this.circlesDisplay) {
            this.circlesDisplay.clear();
            this.circlesDisplay = null;
        }
    }
}
