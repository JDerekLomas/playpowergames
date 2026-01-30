import { BaseScene, ButtonHelper, i18n, ScoreCoins, ScoreHelper, QuestionSelectorHelper, TextOverlay, announceToScreenReader, ImageOverlay, GameConfigManager, getQuestionBankByLevel, Question, VolumeSlider, ButtonOverlay, focusToGameContainer, AnalyticsHelper } from "@k8-games/sdk";
import { ASSETS_PATHS, BUTTONS } from "../config/common";
import { FactoringConfig } from "../config/FactoringConfig";
import { DoorUtils } from "../utils/DoorUtils";
import { ProgressBar } from "../components/ProgressBar";
import { getGameSubtitle } from "../utils/helper";

export class Factoring {
    private scene: BaseScene;
    private level: number;
    private gameSubtitle!: string;

    private scoreCoins?: ScoreCoins;
    private scoreHelper: ScoreHelper;
    private questionSelector: QuestionSelectorHelper;
    private volumeSlider!: VolumeSlider;
    private progressBar!: ProgressBar;
    private analyticsHelper!: AnalyticsHelper;

    private totalQuestions: number = 10;
    public currentQuestion!: Question;
    private currentQuestionIndex: number = 0;

    public titleText!: Phaser.GameObjects.Text;
    private questionBg?: Phaser.GameObjects.Rectangle;
    public questionText?: Phaser.GameObjects.Text;
    private answerBg?: Phaser.GameObjects.Rectangle;
    public answerText?: Phaser.GameObjects.Text;
    public optionBtns: Phaser.GameObjects.Container[] = [];
    private errorBoard!: Phaser.GameObjects.Image;
    private successBoard!: Phaser.GameObjects.Image;
    private doorUtils!: DoorUtils;

    private isProcessing: boolean = false;
    private isInstructionMode: boolean;


    constructor(scene: BaseScene, level: number, isInstructionMode: boolean = false, questionSelector?: QuestionSelectorHelper) {
        this.scene = scene;
        this.level = level;
        this.scoreHelper = new ScoreHelper(2);
        this.isInstructionMode = isInstructionMode;

        if (questionSelector) {
            this.questionSelector = questionSelector;
        } else {
            // Initialize question selector with factoring question bank
            const gameConfigManager = GameConfigManager.getInstance();
            const topic = gameConfigManager.get('topic') || 'grade6_topic4';

            const questionBank = getQuestionBankByLevel(topic, level);
            if (!questionBank) {
                throw new Error('Question bank not found');
            }
            this.questionSelector = new QuestionSelectorHelper(questionBank, this.totalQuestions);
        }
    }

    static _preload(scene: BaseScene) {
        ScoreCoins.preload(scene);

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}${FactoringConfig.ASSETS.PATHS.FACTORING}`);
        // Load background

        // Load option buttons
        FactoringConfig.ASSETS.OPTION_BUTTONS.forEach((button) => {
            scene.load.image(button.DEFAULT.KEY, button.DEFAULT.PATH);
            scene.load.image(button.HOVER.KEY, button.HOVER.PATH);
            scene.load.image(button.PRESSED.KEY, button.PRESSED.PATH);
            scene.load.image(button.INACTIVE.KEY, button.INACTIVE.PATH);
        });

        // Load buttons
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
        scene.load.image(BUTTONS.HALF_BUTTON.KEY, BUTTONS.HALF_BUTTON.PATH);
        scene.load.image(BUTTONS.HALF_BUTTON_HOVER.KEY, BUTTONS.HALF_BUTTON_HOVER.PATH);
        scene.load.image(BUTTONS.HALF_BUTTON_PRESSED.KEY, BUTTONS.HALF_BUTTON_PRESSED.PATH);

        // Load audio
        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}`);
        scene.load.audio('bg_music', 'bg_music.mp3');
        scene.load.audio("positive-sfx", "positive.mp3");
        scene.load.audio("negative-sfx", "negative.mp3");
    }

    init(data?: { reset?: boolean }) {
        ScoreCoins.init(this.scene);
        this.scene.audioManager.initialize(this.scene);

        // Reset game state if requested
        if (data?.reset) {
            this.resetGame();
        }
    }

    create(parentScene?: string) {
        if (!this.isInstructionMode) {
            const _analyticsHelper = AnalyticsHelper.getInstance();
            if (_analyticsHelper) {
                this.analyticsHelper = _analyticsHelper;
            } else {
                console.error('AnalyticsHelper not found');
            }
            
            const gameConfigManager = GameConfigManager.getInstance();
            const topic = gameConfigManager.get('topic') || 'grade6_topic4';
            this.gameSubtitle = getGameSubtitle(topic, this.level);
            this.analyticsHelper?.createSession(`game.algebra_trials.${this.gameSubtitle}`);
        }

        if (this.isInstructionMode && parentScene === 'GameScene') {
            focusToGameContainer();
            this.scene.time.delayedCall(1000, () => {
                announceToScreenReader(i18n.t('info.helpPage'));
            })
        }

        // Add background
        this.scene.addImage(this.scene.display.width / 2, this.scene.display.height / 2 + 4, `game_scene_bg_${this.level}`);
        // Question board rectangle
        this.scene.addRectangle(this.scene.display.width / 2, 405, 987, 432, 0xBCC6D9, 1).setOrigin(0.5);

        // Add title text
        this.titleText = this.scene.addText(this.scene.display.width / 2, 218, i18n.t('game.findGCF'), {
            font: "400 20px Exo",
            color: "#000000",
        }).setOrigin(0.5);

        this.errorBoard = this.scene.addImage(this.scene.display.width / 2, 405, 'error_board_bg').setOrigin(0.5).setAlpha(0);
        this.successBoard = this.scene.addImage(this.scene.display.width / 2, 405, 'success_board_bg').setOrigin(0.5).setAlpha(0);

        // Create doors
        this.doorUtils = new DoorUtils(this.scene);

        if (!this.isInstructionMode) {
            // Open doors
            this.doorUtils.openDoors();

            // Play background music
            this.scene.audioManager.playBackgroundMusic('bg_music');

            // Create score coins
            this.scoreCoins = new ScoreCoins(this.scene, this.scoreHelper, i18n, 'purple');
            this.scoreCoins.create(
                this.scene.getScaledValue(87),
                this.scene.getScaledValue(62)
            );

            // Create progress bar
            this.progressBar = new ProgressBar(this.scene);
            this.progressBar.create(80);

            this.createControlButtons();
        }

        new TextOverlay(this.scene, this.titleText, { label: i18n.t('game.findGCF'), tag: 'h1', role: 'heading' });

        this.loadNextQuestion();
    }

    private createControlButtons() {
        // Pause button
        ButtonHelper.createIconButton({
            scene: this.scene,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.PAUSE_ICON.KEY,
            raisedOffset: 3.5,
            x: this.scene.display.width - 54,
            y: 66,
            label: i18n.t('common.pause'),
            onClick: () => {
                this.scene.scene.pause();
                this.scene.scene.launch("PauseScene", { parentScene: "GameScene" });
                this.scene.audioManager.pauseAll();
                this.scene.scene.bringToTop("PauseScene");
            }
        }).setName('pause_btn');

        // Mute button
        const muteBtn = ButtonHelper.createIconButton({
            scene: this.scene,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.UNMUTE_ICON.KEY,
            label: i18n.t("common.mute"),
            ariaLive: 'off',
            x: this.scene.display.width - 54,
            y: 142,
            raisedOffset: 3.5,
            onClick: () => {
                this.scene.audioManager.setMute(!this.scene.audioManager.getIsAllMuted());
            },
        });

        const handleMuteBtnUpdate = () => {
            const muteBtnItem = muteBtn.getAt(1) as Phaser.GameObjects.Sprite;
            muteBtnItem.setTexture(this.scene.audioManager.getIsAllMuted() ? BUTTONS.MUTE_ICON.KEY : BUTTONS.UNMUTE_ICON.KEY);

            // Update mute button state
            const label = this.scene.audioManager.getIsAllMuted() ? i18n.t('common.unmute') : i18n.t('common.mute');
            const overlay = (muteBtn as any).buttonOverlay as ButtonOverlay;
            const muteBtnState = muteBtn.getData('state');
            if(muteBtnState != label) {
                muteBtn.setData('state', label);
                overlay.setLabel(label);
            }
        }
        // Add update event listener to the mute button
        this.scene.events.on("update", handleMuteBtnUpdate);
        // Remove event listener when mute button is destroyed
        muteBtn.on("destroy", () => {
            this.scene.events.off("update", handleMuteBtnUpdate);
        });

        // Volume slider
        this.volumeSlider = new VolumeSlider(this.scene);
        this.volumeSlider.create(this.scene.display.width - 220, 238, 'purple', i18n.t('common.volume'));
        ButtonHelper.createIconButton({
            scene: this.scene,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.SETTINGS_ICON.KEY,
            label: i18n.t('common.volume'),
            x: this.scene.display.width - 54,
            y: 218,
            raisedOffset: 3.5,
            onClick: () => {
                this.volumeSlider.toggleControl();
            }
        });

        // Help
        ButtonHelper.createIconButton({
            scene: this.scene,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.HELP_ICON.KEY,
            label: i18n.t('common.help'),
            x: this.scene.display.width - 54,
            y: 294,
            raisedOffset: 3.5,
            onClick: () => {
                this.scene.audioManager.stopBackgroundMusic();
                this.scene.scene.pause();
                this.scene.scene.launch('InstructionsScene', {
                    level: this.level,
                    mechanic: 'factoring',
                    parentScene: 'GameScene',
                });
                this.scene.scene.bringToTop("InstructionsScene");
            }
        });
    }

    private createOptionBtn(index: number, x: number, y: number, text: string) {
        // Clamp index to valid range
        index = Math.max(0, Math.min(index, FactoringConfig.ASSETS.OPTION_BUTTONS.length - 1));

        // Get button configuration for this index
        const buttonConfig = FactoringConfig.ASSETS.OPTION_BUTTONS[index];

        // Create button using ButtonHelper
        const button = ButtonHelper.createButton({
            scene: this.scene,
            imageKeys: {
                default: buttonConfig.DEFAULT.KEY,
                hover: buttonConfig.HOVER.KEY,
                pressed: buttonConfig.PRESSED.KEY,
                disabled: buttonConfig.INACTIVE.KEY,
            },
            text: text,
            label: text,
            textStyle: {
                font: "700 36px Exo",
                color: "#FFFFFF",
            },
            x: x,
            y: y,
            onClick: () => {
                this.checkAnswer(text);
            },
        });

        // Set button text
        button.setData('text', text);

        return button;
    }

    private loadNextQuestion() {
        let nextQuestion = null;
        if (this.isInstructionMode) {
            nextQuestion = {
                operand1: "2x + 2",
                operand2: "1,2,3,4",
                answer: "2"
            };
        } else {
            this.currentQuestionIndex++;
            nextQuestion = this.questionSelector.getNextQuestion();
        }
        if (!nextQuestion) {
            this.gameOver();
            return;
        }

        this.currentQuestion = nextQuestion;
        this.createQuestion();
    }

    private createQuestion() {

        // Clear previous question
        this.clearQuestion();

        // Create question background
        this.questionBg = this.scene.addRectangle(this.scene.display.width / 2, 283, 197, 76, 0xffffff, 1);

        // Create question text using the question from the bank
        this.questionText = this.scene.addText(this.scene.display.width / 2, 283, this.makeItalic(this.currentQuestion.operand1), {
            font: "700 42px Exo",
            color: "#000000",
        });
        this.questionText.setOrigin(0.5);

        // Add text overlay for accessibility
        new TextOverlay(this.scene, this.questionText, {
            label: this.currentQuestion.operand1,
            announce: true,
        });

        // Announce the question to screen readers
        this.scene.time.delayedCall(100, () => {
            announceToScreenReader(`${i18n.t('game.findGCF')}: ${this.currentQuestion.operand1}`);
        });

        // Update question background width
        const bounds = this.questionText.getBounds();
        this.questionBg.setSize(bounds.width + this.scene.getScaledValue(48), this.questionBg.height);

        // Create options from the question bank
        const btnWidth = 82;
        const gap = 40
        const totalWidth = (btnWidth * 4) + (gap * 3);
        const optionsStartX = this.scene.display.width / 2 - totalWidth / 2 + (btnWidth / 2);
        const optionsStartY = this.scene.display.height - 89;

        const options = this.currentQuestion.operand2.split(",");

        // Shuffle options randomly
        for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [options[i], options[j]] = [options[j], options[i]];
        }

        this.optionBtns = options.map((option: string, index: number) => {
            return this.createOptionBtn(index, optionsStartX + (index * (82 + gap)), optionsStartY, option.trim());
        });
    }

    private parseExpression(expression: string): { coefficients: Map<string, number>, constant: number } {
        // Normalize minus signs and remove extra spaces
        expression = expression.replace(/−/g, '-').replace(/\s+/g, '');

        // Match all terms, including variables with any letter (x, y, z, etc.)
        const terms: string[] = expression.match(/[+-]?\d*[a-zA-Z]?|[+-]?\d+/g) || [];

        const coefficients = new Map<string, number>();
        let constant = 0;

        for (let term of terms) {
            if (term === '') continue;

            // Check if term contains a variable (any letter)
            const variableMatch = term.match(/[a-zA-Z]/);
            if (variableMatch) {
                const variable = variableMatch[0];
                let value = term.replace(new RegExp(variable, 'g'), '');

                // Handle cases like 'x', '+x', '-x', 'y', '+y', '-y' as 1 or -1
                if (value === '' || value === '+') value = '1';
                else if (value === '-') value = '-1';

                const coefficient = parseInt(value, 10);
                coefficients.set(variable, (coefficients.get(variable) || 0) + coefficient);
            } else {
                constant += parseInt(term, 10);
            }
        }

        return { coefficients, constant };
    }

    private clearQuestion() {
        this.questionBg?.destroy();
        this.questionText?.destroy();
        this.optionBtns.forEach(btn => {
            btn.destroy();
        });
        this.optionBtns = [];
    }

    public showAnswer() {
        let { coefficients, constant } = this.parseExpression(this.currentQuestion.operand1);
        const gcf = parseInt(this.currentQuestion.answer);

        // Divide all coefficients and constant by GCF
        const factoredCoefficients = new Map<string, number>();
        for (const [variable, coefficient] of coefficients) {
            factoredCoefficients.set(variable, coefficient / gcf);
        }
        const factoredConstant = constant / gcf;

        // Build the factored expression string
        let factoredTerms: string[] = [];

        // Add variable terms
        let isFirstTerm = true;
        for (const [variable, coefficient] of factoredCoefficients) {
            if (coefficient === 0) continue;
            let term = '';
            let operator = '';

            if (isFirstTerm) {
                operator = coefficient < 0 ? '−' : '';
            } else {
                operator = coefficient < 0 ? '− ' : '+ ';
            }

            if (Math.abs(coefficient) === 1) {
                term = `${operator}${variable}`;
            } else {
                term = `${operator}${Math.abs(coefficient)}${variable}`;
            }
            factoredTerms.push(term);
            isFirstTerm = false;
        }

        // Add constant term if it's not zero
        if (factoredConstant !== 0) {
            const constantTerm = factoredConstant < 0 ? `− ${Math.abs(factoredConstant)}` : `+ ${factoredConstant}`;
            factoredTerms.push(constantTerm);
        }

        const answer = `= ${gcf} ( ${factoredTerms.join(' ')} )`;

        this.answerBg = this.scene.addRectangle(this.scene.display.width / 2 - 1, 545, 986, 149, 0xffffff, 1);
        this.answerText = this.scene.addText(this.scene.display.width / 2, 545, this.makeItalic(answer), {
            font: "700 52px Exo",
            color: "#000000",
        }).setOrigin(0.5);

        new TextOverlay(this.scene, this.answerText, {
            label: answer
        });
    }

    private clearAnswer() {
        this.answerBg?.destroy();
        this.answerText?.destroy();
    }

    private answerFadeInOut() {
        this.answerText?.setAlpha(0);
        this.scene.tweens.chain({
            targets: [this.answerText, this.answerBg],
            tweens: [
                {
                    alpha: 1,
                    duration: 2000,
                    ease: "Power2",
                },
                {
                    alpha: 0,
                    duration: 300,
                    ease: "Power2",
                    onComplete: () => {
                        this.clearAnswer();
                    }
                }
            ]
        })
    }

    private checkAnswer(selectedAnswer: string) {
        if (this.isProcessing) return;
        this.isProcessing = true;

        const isCorrect = selectedAnswer === this.currentQuestion.answer;

        if (this.isInstructionMode) {
            if (isCorrect) {
                // Emmit correct answer event for tutorial
                this.scene.events.emit('correctanswer', { isCorrect: true });
            }
            this.isProcessing = false;
            return;
        }

        // Restore focus to game container to ensure announcements are heard
        focusToGameContainer();

        // Announce feedback immediately for screen readers
        if (isCorrect) {
            announceToScreenReader(i18n.t('common.correctFeedback'));
        } else {
            announceToScreenReader(i18n.t('common.incorrectFeedback'));
        }

        // Update progress bar
        const progress = this.currentQuestionIndex / this.totalQuestions;
        this.progressBar.updateProgress(progress * 100, !isCorrect);

        const options = this.currentQuestion.operand2.split(",");
        const optionsDisplay = options.map(option => ({ option: option.trim(), isCorrect: option.trim() === this.currentQuestion.answer }));

        if (isCorrect) {
            this.analyticsHelper?.createTrial({
                questionMaxPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                achievedPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                questionText: this.currentQuestion.operand1,
                isCorrect: true,
                questionMechanic: 'default',
                gameLevelInfo: `game.algebra_trials.${this.gameSubtitle}`,
                studentResponse: selectedAnswer,
                studentResponseAccuracyPercentage: '100%',
                optionsDisplay: optionsDisplay,
            });
            // Handle correct answer
            this.scoreHelper.answerCorrectly();
            this.questionSelector.answerCorrectly();
            this.scoreCoins?.updateScoreDisplay(true);

            this.showAnswer();
            // Add fade in animation
            this.answerFadeInOut();

            if (this.scoreHelper.showStreakAnimation()) {
                this.showMascotCelebration(() => {
                    this.scene.time.delayedCall(1000, () => {
                        this.loadNextQuestion();
                        this.isProcessing = false;
                    });
                });
                return;
            }

            this.showSuccessAnimation();

        } else {
            this.analyticsHelper?.createTrial({
                questionMaxPoints: (this.scoreHelper.getCurrentMultiplier() || 1),
                achievedPoints: 0,
                questionText: this.currentQuestion.operand1,
                isCorrect: false,
                questionMechanic: 'default',
                gameLevelInfo: `game.algebra_trials.${this.gameSubtitle}`,
                studentResponse: selectedAnswer,
                studentResponseAccuracyPercentage: '0%',
                optionsDisplay: optionsDisplay,
            });
            // Handle incorrect answer
            this.scoreHelper.answerIncorrectly();
            this.questionSelector.answerIncorrectly(this.currentQuestion);
            this.scoreCoins?.updateScoreDisplay(false);

            this.showErrorAnimation();
        }

        this.scene.time.delayedCall(2000, () => {
            this.loadNextQuestion();
            this.isProcessing = false;
        });
    }

    private showMascotCelebration(cb?: () => void) {
        this.scene.time.delayedCall(1000, () => {
            this.scene.scene.pause();
            this.scene.scene.launch('CelebrationScene', {
                scoreHelper: this.scoreHelper,
                progress: this.questionSelector!.getTotalQuestionsAnswered() / this.totalQuestions,
                callback: () => {
                    cb?.();
                }
            });
            this.scene.scene.bringToTop('CelebrationScene');
        });
    }

    private showSuccessAnimation() {
        this.scene.time.delayedCall(100, () => {
            announceToScreenReader(i18n.t('common.correctFeedback'));
        });
        const width = this.scene.display.width;
        const height = 145;
        const successContainer = this.scene.add.container(this.scene.getScaledValue(this.scene.display.width / 2), this.scene.getScaledValue(this.scene.display.height + height / 2)).setDepth(10);

        // Create background rectangle
        const bgRect = this.scene.addRectangle(0, 0, width, height, 0x1A8B29);
        successContainer.add(bgRect);

        const bgRectTop = this.scene.addRectangle(0, -height / 2, width, 8.32, 0x24E13E).setOrigin(0.5, 0);
        successContainer.add(bgRectTop);

        // Create icon and text
        const icon = this.scene.addImage(0, 0, 'correct_icon').setOrigin(0.5);
        successContainer.add(icon);

        const gap = this.scene.getScaledValue(10);
        const iconWidth = icon.getBounds().width;
        let totalWidth = iconWidth + gap;

        // Add text
        const text = this.scene.addText(0, 0, i18n.t('common.solved'), {
            font: "700 36px Exo",
            color: "#FFFFFF",
        });
        text.setOrigin(0.5);
        successContainer.add(text);

        const textWidth = text.getBounds().width;
        totalWidth += textWidth;

        icon.setPosition(-totalWidth / 2 + iconWidth / 2, 0);
        text.setPosition(-totalWidth / 2 + iconWidth + gap + textWidth / 2, 0);

        this.scene.audioManager.playSoundEffect('positive-sfx');

        // Simple slide up animation
        this.scene.tweens.add({
            targets: successContainer,
            y: this.scene.getScaledValue(this.scene.display.height - height / 2),
            duration: 1000,
            ease: "Power2",
            onComplete: () => {
                new ImageOverlay(this.scene, icon, { label: i18n.t('common.correct') + ' ' + i18n.t('common.icon') });
                // Wait for a moment and then slide down
                this.scene.time.delayedCall(500, () => {
                    this.scene.tweens.add({
                        targets: successContainer,
                        y: this.scene.getScaledValue(this.scene.display.height + height / 2),
                        duration: 1000,
                        ease: "Power2",
                        onComplete: () => {
                            successContainer.destroy();
                        }
                    });
                });
            }
        });

        // Show success board
        // Reset alpha to 0 first
        this.successBoard.setAlpha(0);
        this.successBoard.setDepth(10);
        // Tween animation: fade in to 0.6, then fade out to 0
        this.scene.tweens.chain({
            targets: this.successBoard,
            tweens: [
                {
                    alpha: 1,
                    duration: 1000,
                    ease: 'Power2',
                },
                {
                    alpha: 0,
                    duration: 1000,
                    ease: 'Power2',
                }
            ]
        })
    }

    private showErrorAnimation() {
        this.scene.time.delayedCall(100, () => {
            announceToScreenReader(i18n.t('common.incorrectFeedback'));
        });

        const width = this.scene.display.width;
        const height = 145;
        const errorContainer = this.scene.add.container(this.scene.getScaledValue(this.scene.display.width / 2), this.scene.getScaledValue(this.scene.display.height + height / 2)).setDepth(10);

        // Create background rectangle
        const bgRect = this.scene.addRectangle(0, 0, width, height, 0x8B211A);
        errorContainer.add(bgRect);

        const bgRectTop = this.scene.addRectangle(0, -height / 2, width, 8.32, 0xE94338).setOrigin(0.5, 0);
        errorContainer.add(bgRectTop);

        // Create icon and text
        const icon = this.scene.addImage(0, 0, 'incorrect_icon').setOrigin(0.5);
        errorContainer.add(icon);

        const gap = this.scene.getScaledValue(10);
        const iconWidth = icon.getBounds().width;
        let totalWidth = iconWidth + gap;

        // Add text
        const text = this.scene.addText(0, 0, i18n.t('common.notQuite'), {
            font: "700 36px Exo",
            color: "#FFFFFF",
        });
        text.setOrigin(0.5);
        errorContainer.add(text);

        const textWidth = text.getBounds().width;
        totalWidth += textWidth;

        icon.setPosition(-totalWidth / 2 + iconWidth / 2, 0);
        text.setPosition(-totalWidth / 2 + iconWidth + gap + textWidth / 2, 0);


        this.scene.audioManager.playSoundEffect('negative-sfx');

        // Simple slide up animation
        this.scene.tweens.add({
            targets: errorContainer,
            y: this.scene.getScaledValue(this.scene.display.height - height / 2),
            duration: 1000,
            ease: "Power2",
            onComplete: () => {
                new ImageOverlay(this.scene, icon, { label: i18n.t('common.incorrect') + ' ' + i18n.t('common.icon') });
                // Wait for a moment and then slide down
                this.scene.time.delayedCall(500, () => {
                    this.scene.tweens.add({
                        targets: errorContainer,
                        y: this.scene.getScaledValue(this.scene.display.height + height / 2),
                        duration: 1000,
                        ease: "Power2",
                        onComplete: () => {
                            errorContainer.destroy();
                        }
                    });
                });
            }
        });

        // Show error board
        // Reset alpha to 0 first
        this.errorBoard.setAlpha(0);
        this.errorBoard.setDepth(10);
        // Tween animation: fade in to 0.6, then fade out to 0
        this.scene.tweens.chain({
            targets: this.errorBoard,
            tweens: [
                {
                    alpha: 1,
                    duration: 1000,
                    ease: 'Power2',
                },
                {
                    alpha: 0,
                    duration: 1000,
                    ease: 'Power2',
                }
            ]
        })
    }

    private gameOver() {
        this.doorUtils.closeDoors(() => {
            // Game Over handling here
            this.scoreHelper.setPlannedTotalQuestions(this.totalQuestions)
            const finalScore = this.scoreHelper.endGame();

            // Send data to ScoreBoard scene
            this.scene.scene.start("Scoreboard", {
                totalRounds: this.scoreHelper.getTotalQuestions(),
                rounds: this.scoreHelper.getCorrectAnswers(),
                score: finalScore,
                mechanic: 'factoring',
                level: this.level
            });
        }, false);
    }

    private resetGame() {
        this.questionSelector.reset();
        this.scoreHelper.reset();
        this.currentQuestionIndex = 0;
    }

    /**
     * Gets the question selector instance
     */
    public getQuestionSelector(): QuestionSelectorHelper {
        return this.questionSelector;
    }

    /**
     * Gets the level
     */
    public getLevel(): number {
        return this.level;
    }

    private makeItalic(text: string) {
        const italicAlphabets = {
            x: '𝑥',
            y: '𝑦',
        }
        return text.replace(/[a-z]/g, (char) => italicAlphabets[char as keyof typeof italicAlphabets] || char);
    }
}
