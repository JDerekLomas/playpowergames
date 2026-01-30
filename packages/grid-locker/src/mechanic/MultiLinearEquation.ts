import {
    AnalyticsHelper,
    announceToScreenReader,
    BaseScene,
    ButtonHelper,
    ButtonOverlay,
    focusToGameContainer,
    getQuestionBankByName,
    i18n,
    ImageOverlay,
    ProgressBar,
    Question,
    questionBankNames,
    QuestionSelectorHelper,
    ScoreCoins,
    ScoreHelper,
    TextOverlay,
    VolumeSlider,
} from '@k8-games/sdk';
import { ASSETS_PATHS, BUTTONS, COMMON_ASSETS } from '../config/common';
import { animateDoors } from '../utils/helper';
import { MonsterJail } from './MonsterJail';

export class MultiLinearEquation {
    private scene!: BaseScene;
    private gridBoard!: Phaser.GameObjects.Rectangle;
    private gridBoardErrorTint!: Phaser.GameObjects.Image;
    private xCord: number = 0; // Line 1 slope
    private yCord: number = 0; // Line 1 y-intercept
    private xCord2: number = 0; // Line 2 slope
    private yCord2: number = 0; // Line 2 y-intercept

    private intercept1!: Phaser.GameObjects.Graphics;
    private intercept2!: Phaser.GameObjects.Graphics;
    private monster!: Phaser.GameObjects.Image;
    private monsters: Phaser.GameObjects.Image[] = [];
    private questionSelector?: QuestionSelectorHelper;
    private totalQuestions: number = 6;
    private isInstructionMode: boolean = false;
    private parentScene: string = 'SplashScene';

    private infoText?: Phaser.GameObjects.Text;
    private infoTextOverlay?: TextOverlay;
    private positionTextOverlay?: TextOverlay;

    // Add to class properties at the top
    private intersectionDisplayElements: Phaser.GameObjects.GameObject[] = [];

    // Score helper
    private scoreHelper: ScoreHelper;

    // Monster capture tracking
    private totalMonstersCaptured: number = 0;
    private totalMonstersInAllQuestions: number = 0;

    // Progress bar and score coins
    private progressBar?: ProgressBar;
    private scoreCoins?: ScoreCoins;

    private analyticsHelper!: AnalyticsHelper;

    // Volume slider and mute button
    private volumeSlider!: VolumeSlider;
    private muteBtn!: Phaser.GameObjects.Container;

    // UI elements that need cleanup
    private gridLinesGraphics!: Phaser.GameObjects.Graphics;
    private axisLinesGraphics!: Phaser.GameObjects.Graphics;
    private markerTexts: Phaser.GameObjects.Text[] = [];
    private controlButtons?: {
        m1Minus: Phaser.GameObjects.Container;
        m1Plus: Phaser.GameObjects.Container;
        b1Minus: Phaser.GameObjects.Container;
        b1Plus: Phaser.GameObjects.Container;
    };
    private controlButtons2?: {
        m2Minus: Phaser.GameObjects.Container;
        m2Plus: Phaser.GameObjects.Container;
        b2Minus: Phaser.GameObjects.Container;
        b2Plus: Phaser.GameObjects.Container;
    };

    private question: Question | null = null;

    // Instruction mode state tracking
    private captureButton?: Phaser.GameObjects.Container;
    private resetButton!: Phaser.GameObjects.Container;
    private behindElements: Phaser.GameObjects.GameObject[] = [];

    // Instruction mode audio tracking
    private delayedCalls: Phaser.Time.TimerEvent[] = [];
    private instructionLoopTimer?: Phaser.Time.TimerEvent;

    // Animation tracking
    private monsterPulseTween?: Phaser.Tweens.Tween;
    private handClickTween?: Phaser.Tweens.Tween;
    private handImageX?: Phaser.GameObjects.Image;
    private handImageY?: Phaser.GameObjects.Image;
    private xHandLoopTimer?: Phaser.Time.TimerEvent;
    private yHandLoopTimer?: Phaser.Time.TimerEvent;

    private isProcessing: boolean = false;

    private doorLeft!: Phaser.GameObjects.Image;
    private doorRight!: Phaser.GameObjects.Image;

    // Add monsterJail property
    private monsterJail!: MonsterJail;

    // Add 3 tries variables.
    private maxChances: number = 3;
    private remainingChances: number = 3;
    private isInterceptRed = false;
    private chancesContainer?: Phaser.GameObjects.Container;

    private currentStep = 0;
    // Line visibility control
    // private shouldShowLines: boolean = false; // Controls overall line visibility
    // private showLinesTemporarily: boolean = false; // For showing lines after incorrect answer

    constructor(scene: BaseScene, isInstructionMode: boolean = false, parentScene: string = 'SplashScene') {
        this.scene = scene;
        this.isInstructionMode = isInstructionMode;
        this.parentScene = parentScene;
        this.scoreHelper = new ScoreHelper(2);

        // Only initialize question selector if not in instruction mode
        if (!this.isInstructionMode) {
            const _q = getQuestionBankByName(questionBankNames.g8_t5);
            if (_q) {
                this.questionSelector = new QuestionSelectorHelper(_q, this.totalQuestions);
            }
        }
    }

    init(data?: { reset?: boolean }) {
        ProgressBar.init(this.scene);
        ScoreCoins.init(this.scene);

        if (data?.reset) {
            this.resetGame();
        }
    }

    static _preload(scene: BaseScene) {
        const language = i18n.getLanguage() || 'en';

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}${COMMON_ASSETS.PATH}`);
        scene.load.image(COMMON_ASSETS.DOOR.KEY, COMMON_ASSETS.DOOR.PATH);
        scene.load.image('success_bg', 'success_bg.png');
        scene.load.image('chance', 'chance.png');
        scene.load.image('chance_lost', 'chance_lost.png');
        scene.load.image('lightning', 'lightning.png');

        // Load countdown images
        scene.load.image('countdown_1', 'countdown_1.png');
        scene.load.image('countdown_2', 'countdown_2.png');
        scene.load.image('countdown_3', 'countdown_3.png');

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen/multi_line`);
        scene.load.image('monster_intersect', 'monster_intersect.png');
        scene.load.image('monster_intersect_select', 'monster_intersect_select.png');
        scene.load.image('grid_board_small', 'grid_board.png');
        scene.load.image('grid_board_error_small', 'grid_board_error.png');
        scene.load.image('controls_box', 'controls_box.png');
        scene.load.image('equation_box', 'equation_box.png');
        scene.load.image('input_box', 'input_box.png');
        scene.load.image('intersection_box', 'intersection_box.png');
        scene.load.image('plus_icon', 'plus_icon.png');
        scene.load.image('minus_icon', 'minus_icon.png');
        scene.load.image('orange_btn_default', 'orange_btn_default.png');
        scene.load.image('orange_btn_hover', 'orange_btn_hover.png');
        scene.load.image('orange_btn_pressed', 'orange_btn_pressed.png');
        scene.load.image('orange_btn_inactive', 'orange_btn_inactive.png');
        scene.load.image('blue_btn_default', 'blue_btn_default.png');
        scene.load.image('blue_btn_hover', 'blue_btn_hover.png');
        scene.load.image('blue_btn_pressed', 'blue_btn_pressed.png');
        scene.load.image('blue_btn_inactive', 'blue_btn_inactive.png');

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen`);
        scene.load.image('game_scene_bg', 'game_scene_bg.png');
        scene.load.image('instruction_scene_bg', 'instruction_scene_bg.png');
        scene.load.image('correct_icon', 'correct_icon.png');

        scene.load.image('capture_btn', 'capture_btn.png');
        scene.load.image('capture_btn_hover', 'capture_btn_hover.png');
        scene.load.image('capture_btn_pressed', 'capture_btn_pressed.png');
        scene.load.image('reset_btn', 'reset_btn.png');
        scene.load.image('reset_btn_hover', 'reset_btn_hover.png');
        scene.load.image('reset_btn_pressed', 'reset_btn_pressed.png');

        scene.load.image('position_bg', 'position_bg.png');

        scene.load.image('monster_1', 'monster_1.png');
        scene.load.image('monster_2', 'monster_2.png');
        scene.load.image('monster_3', 'monster_3.png');
        scene.load.image('monster_4', 'monster_4.png');
        scene.load.image('monster_5', 'monster_5.png');

        scene.load.image('monster_1_select', 'monster_1_select.png');
        scene.load.image('monster_2_select', 'monster_2_select.png');
        scene.load.image('monster_3_select', 'monster_3_select.png');
        scene.load.image('monster_4_select', 'monster_4_select.png');
        scene.load.image('monster_5_select', 'monster_5_select.png');

        scene.load.image('correct_icon', 'correct_icon.png');
        scene.load.image('incorrect_icon', 'incorrect_icon.png');

        ProgressBar.preload(scene, 'dark');
        ScoreCoins.preload(scene, 'purple');
        VolumeSlider.preload(scene, 'purple');

        // Load audio assets
        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}`);
        scene.load.audio('positive-sfx', 'positive.mp3');
        scene.load.audio('negative-sfx', 'negative.mp3');
        scene.load.audio('bg-music', 'bg-music.mp3');
        scene.load.audio('slider', 'slider.mp3');
        scene.load.audio('door_close', 'door_close.mp3');
        scene.load.audio('countdown', 'countdown.mp3');

        // Load button assets
        scene.load.setPath(`${BUTTONS.PATH}`);
        scene.load.image(BUTTONS.BUTTON.KEY, BUTTONS.BUTTON.PATH);
        scene.load.image(BUTTONS.PAUSE_ICON.KEY, BUTTONS.PAUSE_ICON.PATH);
        scene.load.image(BUTTONS.HELP_ICON.KEY, BUTTONS.HELP_ICON.PATH);
        scene.load.image(BUTTONS.ICON_BTN.KEY, BUTTONS.ICON_BTN.PATH);
        scene.load.image(BUTTONS.ICON_BTN_HOVER.KEY, BUTTONS.ICON_BTN_HOVER.PATH);
        scene.load.image(BUTTONS.ICON_BTN_PRESSED.KEY, BUTTONS.ICON_BTN_PRESSED.PATH);
        scene.load.image(BUTTONS.SETTINGS_ICON.KEY, BUTTONS.SETTINGS_ICON.PATH);
        scene.load.image(BUTTONS.MUTE_ICON.KEY, BUTTONS.MUTE_ICON.PATH);
        scene.load.image(BUTTONS.UNMUTE_ICON.KEY, BUTTONS.UNMUTE_ICON.PATH);
        scene.load.image(BUTTONS.HALF_BUTTON.KEY, BUTTONS.HALF_BUTTON.PATH);
        scene.load.image(BUTTONS.HALF_BUTTON_HOVER.KEY, BUTTONS.HALF_BUTTON_HOVER.PATH);
        scene.load.image(BUTTONS.HALF_BUTTON_PRESSED.KEY, BUTTONS.HALF_BUTTON_PRESSED.PATH);

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/info_screen`);
        scene.load.image('hand', 'hand.png');
        scene.load.image('hand_click', 'hand_click.png');

        // Load Audios
        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/info_screen/multi_linear_equation`);
        scene.load.audio('step_1_multi_linear', `step_1_${language}.mp3`);
        scene.load.audio('step_2_multi_linear', `step_2_${language}.mp3`);
        scene.load.audio('step_3_multi_linear', `step_3_${language}.mp3`);
        scene.load.audio('step_4_multi_linear', `step_4_${language}.mp3`);
        scene.load.audio('step_5_multi_linear', `step_5_${language}.mp3`);
        scene.load.audio('step_6_multi_linear', `step_6_${language}.mp3`);

        MonsterJail.preload(scene);
    }

    public create() {
        if (!this.isInstructionMode) {
            this.createDoors();
            const _analyticsHelper = AnalyticsHelper.getInstance();
            if (_analyticsHelper) {
                this.analyticsHelper = _analyticsHelper;
            } else {
                console.error('AnalyticsHelper not found');
            }
            this.analyticsHelper?.createSession('game.grid_lock.default');
        }
        this.scene
            .addImage(
                this.scene.display.width / 2,
                this.scene.display.height / 2,
                this.isInstructionMode ? 'instruction_scene_bg' : 'game_scene_bg',
            )
            .setOrigin(0.5);

        if (this.isInstructionMode) {
            this.scene.addImage(327, 100, 'grid_board_small').setOrigin(0).setScale(0.75).setDepth(2);
            this.scene.addRectangle(334, 118, 574, 333, 0x000000, 1).setOrigin(0);
            this.gridBoard = this.scene.addRectangle(355, 122, 530, 310, 0x001317, 1).setOrigin(0);
            this.gridBoardErrorTint = this.scene
                .addImage(327, 100, 'grid_board_error_small')
                .setOrigin(0)
                .setScale(0.75)
                .setVisible(false);
        } else {
            this.scene.addImage(220, 88, 'grid_board_small').setOrigin(0).setDepth(2);
            this.scene.addRectangle(252, 112, 720, 420, 0x000000, 1).setOrigin(0);
            this.gridBoard = this.scene.addRectangle(262, 122, 700, 400, 0x001317, 1).setOrigin(0);
            this.gridBoardErrorTint = this.scene
                .addImage(220, 88, 'grid_board_error_small')
                .setOrigin(0)
                .setVisible(false);
        }

        this.scene.audioManager.initialize(this.scene);

        // Create and position the capture container

        // Only create progress bar and score coins if not in instruction mode
        if (!this.isInstructionMode) {
            // Create score coins
            this.scoreCoins = new ScoreCoins(this.scene, this.scoreHelper, i18n, 'purple');
            this.scoreCoins.create(this.scene.getScaledValue(87), this.scene.getScaledValue(58));
            // Create progress bar
            this.progressBar = new ProgressBar(this.scene, 'dark', i18n);
            this.progressBar.create(
                this.scene.getScaledValue(this.scene.display.width / 2),
                this.scene.getScaledValue(63),
            );
        }

        // Create intercept lines
        this.createIntercepts();
        this.createShadowIntercepts();
        this.drawAxisLines();

        this.createButtons();
        // this.createPositionText();

        this.loadNextQuestion();

        if (this.isInstructionMode) {
            this.infoText = this.scene
                .addText(this.scene.display.width / 2, 500, '', {
                    font: '400 26px Exo',
                    align: 'center',
                })
                .setOrigin(0.5)
                .setDepth(5);
            this.infoTextOverlay = new TextOverlay(this.scene, this.infoText, {
                label: '',
            });
        }

        if (!this.isInstructionMode) {
            this.monsterJail = new MonsterJail(this.scene).create();
            this.openDoors();
        }
    }

    private resetGame() {
        this.questionSelector?.reset();
        this.scoreHelper.reset();
        this.totalMonstersCaptured = 0; // Reset monster count when restarting game
    }

    private calculateTotalMonsters(question: Question): number {
        let totalMonsters = 0;

        // Count monsters from coordinates field (multiple coordinate pairs)
        if (question.coordinates && question.coordinates.trim()) {
            const coordinatePairs = question.coordinates.split(',').filter((coord: string) => coord.includes('('));
            totalMonsters += coordinatePairs.length;
        }

        // Count monsters from coordinateIntersection field (single coordinate pair)
        if (question.coordinateIntersection && question.coordinateIntersection.trim()) {
            totalMonsters += 1; // This is always a single coordinate pair
        }

        return totalMonsters;
    }

    private async loadNextQuestion() {
        // Focus to game container for screen readers
        focusToGameContainer();

        this.resetChances();
        // Get the next question first to check if game is over
        if (this.isInstructionMode) {
            // Use static question for instruction mode
            this.question = {
                operand1: '0', // slope
                operand2: '0', // y-intercept
                answer: 'y=1x+2,y=-1x+4',
                minX: -5,
                maxX: 5,
                xInterval: 1,
                minY: -5,
                maxY: 5,
                yInterval: 1,
                coordinates: '(0,2),(0,4)', // Individual monster positions
                coordinateIntersection: '(1,3)', // Intersection point

                slope1Min: -5,
                slope1Max: 5,
                slope1Step: 1,
                yIntercept1Min: -5,
                yIntercept1Max: 5,
                yIntercept1Step: 1,
                slope2Min: -5,
                slope2Max: 5,
                slope2Step: 1,
                yIntercept2Min: -5,
                yIntercept2Max: 5,
                yIntercept2Step: 1,
            };
        } else {
            this.createChancesContainer();
            this.question = this.questionSelector?.getNextQuestion() || null;
            console.log(this.question);
        }

        // Check if game is over
        if (!this.question) {
            this.gameOver();
            return;
        }

        // Only clean up UI if game is not over
        await this.cleanupQuestionUI();

        // In instruction mode, load immediately without delay
        if (this.isInstructionMode) {
            this.loadQuestionContent();
        } else {
            // Wait a small delay before loading new question to ensure smooth transition
            await new Promise(resolve => this.scene.time.delayedCall(50, resolve));
            this.loadQuestionContent();
            
            // Check if this is exactly the 4th question (after completing 3 questions)
            const currentQuestionNum = (this.questionSelector?.getTotalQuestionsAnswered() ?? 0) + 1;
            
            if (currentQuestionNum === 4) {
                // This is the 4th question - show fade line modal first
                this.showFadeLineModal();
            } else {
                // For all other questions, update intercepts normally
                this.updateIntercepts();
            }
        }
    }

    private loadQuestionContent() {
        this.question = {
            ...this.question!,
            minX: parseInt(this.question!.minX),
            maxX: parseInt(this.question!.maxX),
            xInterval: parseFloat(this.question!.xInterval),
            minY: parseInt(this.question!.minY),
            maxY: parseInt(this.question!.maxY),
            yInterval: parseFloat(this.question!.yInterval),
        };

        // Draw grid lines
        this.drawGridLines(
            this.question.minX,
            this.question.maxX,
            this.question.xInterval,
            this.question.minY,
            this.question.maxY,
            this.question.yInterval,
        );

        // Draw coordinate markers
        this.drawMarkers(
            this.question.minX,
            this.question.maxX,
            this.question.xInterval,
            this.question.minY,
            this.question.maxY,
            this.question.yInterval,
        );

        // Show the monster at the question coordinates
        this.showMonster();

        // Creatte reset button
        this.createResetButton();

        // Create controls
        this.createControls();

        // Create capture button
        this.createCaptureButton();

        if(!this.isInstructionMode) {
            this.totalMonstersInAllQuestions += this.calculateTotalMonsters(this.question);
        }
        // Initialize instruction mode state for new question
        if (this.isInstructionMode) {
            // Start instruction audio flow
            this.scene.time.delayedCall(1000, () => {
                this.playInstructionStep1();
            });
        }

        this.isProcessing = false;
    }

    private createControls(): void {
        const box1Config = {
            boxX: 420,
            boxY: 650,
            equationColor: '#00AEA7',
            slopeLabel: 'm1',
            interceptLabel: 'b1',
        };

        // Create Box 2 (Right side - Orange/Red theme)
        const box2Config = {
            boxX: 815,
            boxY: 650,
            equationColor: '#FF5900',
            slopeLabel: 'm2',
            interceptLabel: 'b2',
        };

        // Create both adjustment boxes
        const box1Elements = this.createSingleAdjustmentBox(box1Config, 1);
        const box2Elements = this.createSingleAdjustmentBox(box2Config, 2);

        // Store button references for both boxes
        this.controlButtons = {
            m1Minus: box1Elements.mMinus,
            m1Plus: box1Elements.mPlus,
            b1Minus: box1Elements.bMinus,
            b1Plus: box1Elements.bPlus,
        };

        this.controlButtons2 = {
            m2Minus: box2Elements.mMinus,
            m2Plus: box2Elements.mPlus,
            b2Minus: box2Elements.bMinus,
            b2Plus: box2Elements.bPlus,
        };

        // In instruction mode, initially disable all buttons
        if (this.isInstructionMode) {
            this.disablecontrolButtons();
            this.disablecontrolButtons2();
        }
    }

    // Helper method to handle instruction mode logic (extracted for reuse)
    private handleInstructionModeLogic() {
        if (!this.isInstructionMode) return;

        if (this.xCord === 1 && this.yCord === 2 && this.xCord2 === -1 && this.yCord2 === 4) {
            this.playInstructionStep6();
        } else if (this.xCord === 1 && this.yCord === 2) {
            if (this.currentStep === 4) {
                this.playInstructionStep5();
            } else {
                this.startLine2Adjustment();
            }
        } else {
            this.startLine1Adjustment();
        }
    }

    // Helper method to create a single adjustment box with all its components
    private createSingleAdjustmentBox(
        config: {
            boxX: number;
            boxY: number;
            equationColor: string;
            slopeLabel: string;
            interceptLabel: string;
        },
        lineNumber: 1 | 2,
    ) {
        // Create the main box
        this.scene.addImage(config.boxX, config.boxY, 'controls_box').setOrigin(0.5);

        // Equation display
        this.scene.addImage(config.boxX, config.boxY - 60, 'equation_box').setOrigin(0.5);
        const equationText = this.scene
            .addText(config.boxX, config.boxY - 57, 'y = 0x + 0', {
                font: '700 24px Exo',
                color: config.equationColor,
            })
            .setOrigin(0.5);

        // Slope controls (m1/m2)
        this.scene
            .addText(config.boxX - 100, config.boxY - 5, config.slopeLabel, {
                font: '700 24px Exo',
                color: '#FFFFFF',
            })
            .setOrigin(0.5);

        // Determine button colors based on line number
        const slopeButtonImages =
            lineNumber === 1
                ? {
                      default: 'blue_btn_default',
                      hover: 'blue_btn_hover',
                      pressed: 'blue_btn_pressed',
                      disabled: 'blue_btn_inactive',
                  }
                : {
                      default: 'orange_btn_default',
                      hover: 'orange_btn_hover',
                      pressed: 'orange_btn_pressed',
                      disabled: 'orange_btn_inactive',
                  };

        // Create slope minus button
        const mMinus = ButtonHelper.createIconButton({
            scene: this.scene,
            imageKeys: slopeButtonImages,
            icon: 'minus_icon', // Using proper minus symbol
            label: i18n.t('game.decreaseButton', { value: config.slopeLabel }),
            imageScale: 0.6,
            x: config.boxX - 50,
            y: config.boxY - 5,
            onClick: () => {
                // Check instruction mode restrictions
                if (this.isInstructionMode) {
                    // For m1: don't allow minus (target is 1, start from 0)
                    // For m2: allow minus only until -1
                    if (lineNumber === 1) {
                        return; // Block m1 minus completely
                    }
                    if (lineNumber === 2 && currentSlope - 1 < -1) {
                        return; // Block m2 going below -1
                    }
                }
                this.destroyIncorrectIntercept();
                const newValue = currentSlope - 1;
                updateSlope(newValue);
            },
        });
        // const mMinus = this.scene.addImage(config.boxX - 50, config.boxY - 5, config.minusButtonKey).setOrigin(0.5).setInteractive();
        this.scene.addImage(config.boxX + 23, config.boxY - 5, 'input_box').setOrigin(0.5);
        const mValue = this.scene
            .addText(config.boxX + 23, config.boxY - 2, '0', {
                font: '700 30px Exo',
                color: '#FFFFFF',
            })
            .setOrigin(0.5);
        const mValueOverlay = new TextOverlay(this.scene, mValue, {label: `${config.slopeLabel}: 0`});
        mValue.setData('overlay', mValueOverlay);
        mMinus.on('destroy', () => mValueOverlay.destroy());

        // Create slope plus button
        const mPlus = ButtonHelper.createIconButton({
            scene: this.scene,
            imageKeys: slopeButtonImages,
            icon: 'plus_icon',
            label: i18n.t('game.increaseButton', { value: config.slopeLabel }),
            imageScale: 0.6,
            x: config.boxX + 95,
            y: config.boxY - 5,
            onClick: () => {
                if (this.isInstructionMode) {
                    // For m1: allow plus only until 1
                    // For m2: don't allow plus (target is -1, start from 0)
                    if (lineNumber === 1 && currentSlope + 1 > 1) {
                        return; // Block m1 going above 1
                    }
                    if (lineNumber === 2) {
                        return; // Block m2 plus completely
                    }
                }
                this.destroyIncorrectIntercept();
                const newValue = currentSlope + 1;
                updateSlope(newValue);
            },
        });
        // const mPlus = this.scene.addImage(config.boxX + 95, config.boxY - 5, config.plusButtonKey).setOrigin(0.5).setInteractive();

        // Y-intercept controls (b1/b2)
        this.scene
            .addText(config.boxX - 100, config.boxY + 55, config.interceptLabel, {
                font: '700 24px Exo',
                color: '#FFFFFF',
            })
            .setOrigin(0.5);

        // const bMinus = this.scene.addImage(config.boxX - 50, config.boxY + 55, config.minusOrangeKey).setOrigin(0.5).setInteractive();
        const bMinus = ButtonHelper.createIconButton({
            scene: this.scene,
            imageKeys: slopeButtonImages,
            icon: 'minus_icon', // Using proper minus symbol
            label: i18n.t('game.decreaseButton', { value: config.interceptLabel }),
            imageScale: 0.6,
            x: config.boxX - 50,
            y: config.boxY + 55,
            onClick: () => {
                if (this.isInstructionMode) {
                    // For b1: don't allow minus (target is 2, start from 0)
                    // For b2: don't allow minus (target is 4, start from 0)
                    return; // Block both b1 and b2 minus completely
                }
                this.destroyIncorrectIntercept();
                const newValue = currentYIntercept - 1;
                updateYIntercept(newValue);
            },
        });
        this.scene.addImage(config.boxX + 23, config.boxY + 55, 'input_box').setOrigin(0.5);
        const bValue = this.scene
            .addText(config.boxX + 23, config.boxY + 57, '0', {
                font: '700 30px Exo',
                color: '#FFFFFF',
            })
            .setOrigin(0.5);
        const bValueOverlay = new TextOverlay(this.scene, bValue, {label: `${config.interceptLabel}: 0`});
        bValue.setData('overlay', bValueOverlay);
        bMinus.on('destroy', () => bValueOverlay.destroy());

        // const bPlus = this.scene.addImage(config.boxX + 95, config.boxY + 55, config.plusOrangeKey).setOrigin(0.5).setInteractive();
        const bPlus = ButtonHelper.createIconButton({
            scene: this.scene,
            imageKeys: slopeButtonImages,
            icon: 'plus_icon',
            label: i18n.t('game.increaseButton', { value: config.interceptLabel }),
            imageScale: 0.6,
            x: config.boxX + 95,
            y: config.boxY + 55,
            onClick: () => {
                if (this.isInstructionMode) {
                    // For b1: allow plus only until 2
                    // For b2: allow plus only until 4
                    const targetIntercept = lineNumber === 1 ? 2 : 4;
                    if (currentYIntercept + 1 > targetIntercept) {
                        return; // Block going above target
                    }
                }
                this.destroyIncorrectIntercept();
                const newValue = currentYIntercept + 1;
                updateYIntercept(newValue);
            },
        });
        // Initialize values to 0
        let currentSlope = 0;
        let currentYIntercept = 0;

        // Initialize class properties based on line number
        if (lineNumber === 1) {
            this.xCord = currentSlope;
            this.yCord = currentYIntercept;
        } else {
            this.xCord2 = currentSlope;
            this.yCord2 = currentYIntercept;
        }

        const isValidSlope = (newSlope: number): boolean => {
            if (!this.question) return false;
            const slopeMin = lineNumber === 1 ? this.question.slope1Min : this.question.slope2Min;
            const slopeMax = lineNumber === 1 ? this.question.slope1Max : this.question.slope2Max;
            return newSlope >= slopeMin && newSlope <= slopeMax;
        };

        const isValidYIntercept = (newYIntercept: number): boolean => {
            if (!this.question) return false;
            const yInterceptMin = lineNumber === 1 ? this.question.yIntercept1Min : this.question.yIntercept2Min;
            const yInterceptMax = lineNumber === 1 ? this.question.yIntercept1Max : this.question.yIntercept2Max;
            return newYIntercept >= yInterceptMin && newYIntercept <= yInterceptMax;
        };

        const updateButtonStates = () => {
            if (!this.question) return;

            // Get slope bounds
            const slopeMin = lineNumber === 1 ? this.question.slope1Min : this.question.slope2Min;
            const slopeMax = lineNumber === 1 ? this.question.slope1Max : this.question.slope2Max;

            // Get y-intercept bounds
            const yInterceptMin = lineNumber === 1 ? this.question.yIntercept1Min : this.question.yIntercept2Min;
            const yInterceptMax = lineNumber === 1 ? this.question.yIntercept1Max : this.question.yIntercept2Max;
            // Enable/disable slope buttons
            if (currentSlope <= slopeMin) {
                ButtonHelper.disableButton(mMinus);
            } else {
                ButtonHelper.enableButton(mMinus);
            }

            if (currentSlope >= slopeMax) {
                ButtonHelper.disableButton(mPlus);
            } else {
                ButtonHelper.enableButton(mPlus);
            }

            // Enable/disable y-intercept buttons
            if (currentYIntercept <= yInterceptMin) {
                ButtonHelper.disableButton(bMinus);
            } else {
                ButtonHelper.enableButton(bMinus);
            }

            if (currentYIntercept >= yInterceptMax) {
                ButtonHelper.disableButton(bPlus);
            } else {
                ButtonHelper.enableButton(bPlus);
            }
        };

        const updateEquationDisplay = (slope: number, yIntercept: number) => {
            let equationText_str = 'y = ';

            // Format slope
            if (slope === 0) {
                equationText_str += '0x';
            } else if (slope === 1) {
                equationText_str += 'x';
            } else if (slope === -1) {
                equationText_str += '-x';
            } else {
                equationText_str += `${slope}x`;
            }

            // Format y-intercept
            if (yIntercept > 0) {
                equationText_str += ` + ${yIntercept}`;
            } else if (yIntercept < 0) {
                equationText_str += ` - ${Math.abs(yIntercept)}`;
            } else {
                equationText_str += ' + 0';
            }

            equationText.setText(equationText_str);
        };

        const updateSlope = (newSlope: number) => {
            if (!this.question || !isValidSlope(newSlope)) return;

            currentSlope = newSlope;
            // Update class properties based on line number
            if (lineNumber === 1) {
                this.xCord = currentSlope;
            } else {
                this.xCord2 = currentSlope;
            }

            // Update display
            mValue.setText(currentSlope.toString());
            updateEquationDisplay(currentSlope, currentYIntercept);
            const mValueOverlay = mValue.getData('overlay') as TextOverlay;
            if(mValueOverlay) {
                mValueOverlay.updateContent(`${config.slopeLabel}: ${currentSlope.toString()}`);
            }

            updateButtonStates();
            this.updateIntercepts();

            // Handle instruction mode logic
            this.handleInstructionModeLogic();
        };

        const updateYIntercept = (newYIntercept: number) => {
            if (!this.question || !isValidYIntercept(newYIntercept)) return;

            currentYIntercept = newYIntercept;
            // Hide lines when user interacts with controls
            // Update class properties based on line number
            if (lineNumber === 1) {
                this.yCord = currentYIntercept;
            } else {
                this.yCord2 = currentYIntercept;
            }

            // Update display
            bValue.setText(currentYIntercept.toString());
            updateEquationDisplay(currentSlope, currentYIntercept);
            const bValueOverlay = bValue.getData('overlay') as TextOverlay;
            if(bValueOverlay) {
                bValueOverlay.updateContent(`${config.interceptLabel}: ${currentYIntercept.toString()}`);
            }

            // Update intercepts only if line should be visible
            updateButtonStates();
            this.updateIntercepts();

            // Handle instruction mode logic
            this.handleInstructionModeLogic();
        };

        // Initialize the display with starting values (0, 0)
        updateEquationDisplay(currentSlope, currentYIntercept);

        // Return button references for external access
        return {
            mMinus,
            mPlus,
            bMinus,
            bPlus,
        };
    }

    private createIntersectionDisplay(monster: Phaser.GameObjects.Image | null, index?: number): void {
        if (!this.question || !monster) return;

        // Position the box to the right of the grid board
        let boxX = 1110;
        let boxY = 470;
        if (this.isInstructionMode) {
            boxX = 1020;
            boxY = 370;
        }

        // Create background box
        const intersectionBox = this.scene.addImage(boxX, boxY, 'intersection_box').setOrigin(0.5);

        // Add title text
        const titleText = this.scene
            .addText(boxX + 20, boxY - 35, i18n.t('game.intersectionPoint'), {
                font: '700 18px Exo',
                color: '#FFFFFF',
                align: 'center',
            })
            .setOrigin(0.5);
        new TextOverlay(this.scene, titleText, {
            label: i18n.t('game.monsterAtIntersectionPoint', {index: index})
        })

        // Create a copy of the intersection monster
        const intersectionMonster = this.scene
            .addImage(boxX - 75, boxY - 37, monster.texture.key)
            .setOrigin(0.5)
            .setScale(0.5);

        const description = this.scene
            .addText(boxX + 30, boxY + 12, i18n.t('game.intersectionDescription'), {
                font: '500 16px Exo',
                color: '#FFFFFF',
                align: 'left',
            })
            .setOrigin(0.5);
        new TextOverlay(this.scene, description, {label: i18n.t('game.intersectionDescription')});

        // Store references for cleanup (add these to your class properties)
        this.intersectionDisplayElements = [intersectionBox, titleText, intersectionMonster, description];

        // Animate in the elements (only in game mode)
        if (!this.isInstructionMode) {
            [intersectionBox, titleText, intersectionMonster, description].forEach((element, index) => {
                element.setAlpha(0);
                this.scene.tweens.add({
                    targets: element,
                    alpha: 1,
                    duration: 300,
                    delay: index * 100,
                    ease: 'Power2.easeOut',
                });
            });
        }
    }

    // Updated clearIntercepts method
    private clearIntercepts() {
        if (this.intercept1) {
            this.intercept1.clear();
        }

        if (this.intercept2) {
            this.intercept2.clear();
        }
    }

    private disablecontrolButtons() {
        if (this.controlButtons) {
            ButtonHelper.disableButton(this.controlButtons.m1Minus);
            ButtonHelper.disableButton(this.controlButtons.m1Plus);
            ButtonHelper.disableButton(this.controlButtons.b1Minus);
            ButtonHelper.disableButton(this.controlButtons.b1Plus);
        }
    }

    // TODO: Uncomment when required.
    // private enablecontrolButtons() {
    //     if (this.controlButtons) {
    //         ButtonHelper.enableButton(this.controlButtons.m1Minus);
    //         ButtonHelper.enableButton(this.controlButtons.m1Plus);
    //         ButtonHelper.enableButton(this.controlButtons.b1Minus);
    //         ButtonHelper.enableButton(this.controlButtons.b1Plus);
    //     }
    // }

    private disablecontrolButtons2() {
        if (this.controlButtons2) {
            ButtonHelper.disableButton(this.controlButtons2.m2Minus);
            ButtonHelper.disableButton(this.controlButtons2.m2Plus);
            ButtonHelper.disableButton(this.controlButtons2.b2Minus);
            ButtonHelper.disableButton(this.controlButtons2.b2Plus);
        }
    }

    // TODO: Uncomment when required.
    // private enablecontrolButtons2() {
    //     if (this.controlButtons2) {
    //         ButtonHelper.enableButton(this.controlButtons2.m2Minus);
    //         ButtonHelper.enableButton(this.controlButtons2.m2Plus);
    //         ButtonHelper.enableButton(this.controlButtons2.b2Minus);
    //         ButtonHelper.enableButton(this.controlButtons2.b2Plus);
    //     }
    // }

    private updateMonsterSelectionVisuals() {
        if (!this.question) return;
        const line1Monsters = this.getMonstersOnLine(this.xCord, this.yCord);
        const line2Monsters = this.getMonstersOnLine(this.xCord2, this.yCord2);

        this.monsters
            .filter(
                (monster): monster is Phaser.GameObjects.Image =>
                    !!monster &&
                    monster.scene &&
                    monster.active &&
                    monster.texture &&
                    typeof monster.setTexture === 'function',
            )
            .forEach((monster) => {
                let baseKey = monster.texture.key;
                if (baseKey.endsWith('_select')) {
                    baseKey = baseKey.replace('_select', '');
                }
                const selectKey = `${baseKey}_select`;

                const isOnLine1 = line1Monsters.includes(monster);
                const isOnLine2 = line2Monsters.includes(monster);
                const isOnAnyLine = isOnLine1 || isOnLine2;

                if (isOnAnyLine) {
                    if (monster.texture.key !== selectKey) {
                        monster.setTexture(selectKey);
                        this.scene.tweens.add({
                            targets: monster,
                            scale: monster.scale * 1.2,
                            duration: 200,
                            yoyo: true,
                            repeat: 0,
                            ease: 'Sine.easeInOut',
                            onComplete: () => {
                                monster.setScale(0.6); // Reset to original scale
                            },
                        });
                    }
                } else {
                    if (monster.texture.key !== baseKey) {
                        monster.setTexture(baseKey);
                        monster.setScale(0.6); // Ensure scale is reset
                    }
                }
            });
    }

    private resetMonsterSelectionVisuals() {
        this.monsters
            .filter(
                (monster): monster is Phaser.GameObjects.Image =>
                    !!monster &&
                    monster.scene &&
                    monster.active &&
                    monster.texture &&
                    typeof monster.setTexture === 'function',
            )
            .forEach((monster) => {
                let baseKey = monster.texture.key;
                if (baseKey.endsWith('_select')) {
                    baseKey = baseKey.replace('_select', '');
                }
                if (monster.texture.key !== baseKey) {
                    monster.setTexture(baseKey);
                }
            });
    }

    private createChancesContainer(): void {
        // Remove previous container if it exists
        if (this.chancesContainer) {
            this.chancesContainer.destroy();
            this.chancesContainer = undefined;
        }

        // Create a new container
        const x = this.scene.getScaledValue(1060);
        const y = this.scene.getScaledValue(575);
        this.chancesContainer = this.scene.add.container(x, y).setDepth(10);

        // Add chance images
        const chanceImages: Phaser.GameObjects.Image[] = [];
        const spacing = 25; // Space between chance images
        for (let i = 0; i < this.maxChances; i++) {
            // Reverse the order: last image loses first
            const lostIndex = this.maxChances - this.remainingChances;
            const imgKey = i >= this.maxChances - lostIndex ? 'chance_lost' : 'chance';
            const img = this.scene
                .addImage(i * spacing, 0, imgKey)
                .setOrigin(0.5)
                .setScale(0.9);
            chanceImages.push(img);
            this.chancesContainer.add(img);
        }

        // Add chances text (e.g., "2/3")
        const chancesText = this.scene
            .addText(
                70, // position after last chance image
                3,
                `(${this.remainingChances}/${this.maxChances})`,
                {
                    font: '400 20px Exo',
                    color: '#00AEA7',
                    align: 'center',
                },
            )
            .setOrigin(0, 0.5);
        this.chancesContainer.add(chancesText);

        // Add lightning image after text
        const lightningImg = this.scene
            .addImage(
                this.maxChances * spacing + chancesText.width + 10, // position after text
                0,
                'lightning',
            )
            .setOrigin(0.5)
            .setScale(1);
        this.chancesContainer.add(lightningImg);
    }

    private _interceptPoints1: any;
    private _interceptPoints2: any;
    private shadowIntercept1!: Phaser.GameObjects.Graphics;
    private shadowIntercept2!: Phaser.GameObjects.Graphics;

    private createShadowIntercepts() {
        // Create graphics objects for intercept lines
        this.shadowIntercept1 = this.scene.add.graphics();
        this.shadowIntercept1.lineStyle(4, 0x00ffe6);
        this.shadowIntercept1.setVisible(false); // Initially hidden

        this.shadowIntercept2 = this.scene.add.graphics();
        this.shadowIntercept2.lineStyle(4, 0x00ffe6);
        this.shadowIntercept2.setVisible(false); // Initially hidden
    }

    private updateShadowIntercept() {
        if (!this.shadowIntercept1 || !this.shadowIntercept2 || !this._interceptPoints1 || !this._interceptPoints2)
            return;

        this.shadowIntercept1.clear();
        this.shadowIntercept1.lineStyle(10, 0x7f0800, 1).setDepth(1); // Lower alpha for shadow
        this.shadowIntercept2.clear();
        this.shadowIntercept2.lineStyle(10, 0x7f0800, 1).setDepth(1); // Lower alpha for shadow

        if (this._interceptPoints1.length >= 2) {
            const [start, end] = this._interceptPoints1;
            this.shadowIntercept1.beginPath();
            this.shadowIntercept1.moveTo(start.x, start.y);
            this.shadowIntercept1.lineTo(end.x, end.y);
            this.shadowIntercept1.strokePath();
        } else if (this._interceptPoints1.length === 1) {
            const point = this._interceptPoints1[0];
            this.shadowIntercept1.beginPath();
            this.shadowIntercept1.arc(point.x, point.y, 2, 0, Math.PI * 2);
            this.shadowIntercept1.fillPath();
        }

        if (this._interceptPoints2.length >= 2) {
            const [start, end] = this._interceptPoints2;
            this.shadowIntercept2.beginPath();
            this.shadowIntercept2.moveTo(start.x, start.y);
            this.shadowIntercept2.lineTo(end.x, end.y);
            this.shadowIntercept2.strokePath();
        } else if (this._interceptPoints2.length === 1) {
            const point = this._interceptPoints2[0];
            this.shadowIntercept2.beginPath();
            this.shadowIntercept2.arc(point.x, point.y, 2, 0, Math.PI * 2);
            this.shadowIntercept2.fillPath();
        }
    }

    private showAndBlinkIntercept(times: number = 3, onComplete?: () => void) {
        if (!this.intercept1 || !this.intercept2) return;
        let count = 0;

        // Set intercepts to red and show them
        this.isInterceptRed = true;
        this.updateIntercepts();
        this.intercept1.setVisible(true);
        this.intercept2.setVisible(true);

        this.updateShadowIntercept();
        this.shadowIntercept1.setVisible(true);
        this.shadowIntercept2.setVisible(true);
        // this.setLinesTemporarilyVisible();

        const blink = () => {
            if (count >= times * 2) {
                this.shadowIntercept1.setVisible(false);
                this.shadowIntercept2.setVisible(false);
                onComplete?.();
                return;
            }
            // Blink intercepts: toggle visibility
            this.shadowIntercept1.setVisible(count % 2 === 0 ? false : true);
            this.shadowIntercept2.setVisible(count % 2 === 0 ? false : true);
            count++;
            this.scene.time.delayedCall(400, blink);
        };
        blink();
    }

    private resetChances() {
        this.remainingChances = this.maxChances;
    }

    private destroyIncorrectIntercept() {
        if (this.isInterceptRed) {
            this.isInterceptRed = false;
            this.updateIntercepts();
            this.intercept1.setVisible(false);
            this.intercept2.setVisible(false);
        }
    }

    private gameOver() {
        this.isInterceptRed = false; // Add this line
        this.scoreHelper.endGame(); // Still call to properly end the game
        
        // Use total monsters captured as the final score
        const monsterScore = this.totalMonstersCaptured;
        const totalMonsters = this.totalMonstersInAllQuestions;
        console.log(`Game Over! Final monster count: ${monsterScore}`);
        
        this.cleanupQuestionUI();
        this.scene.time.delayedCall(2000, () => {
            this.doorLeft.setVisible(true);
            this.doorRight.setVisible(true);
            animateDoors({
                scene: this.scene,
                leftDoor: this.doorLeft,
                rightDoor: this.doorRight,
                open: false,
                duration: 1000,
                delay: 0,
                soundEffectKey: 'door_close',
                onComplete: () => {
                    if (this.monsterJail) {
                        this.monsterJail.destroy();
                    }
                    
                    // Reset monster count for next game
                    this.totalMonstersCaptured = 0;
                    this.totalMonstersInAllQuestions = 0;
                    
                    // Send data to ScoreBoard scene with monster count as score
                    this.scene.scene.start('Scoreboard', {
                        totalRounds: totalMonsters,
                        rounds: monsterScore,
                        score: monsterScore, // Use captured monsters count as final score
                        mechanics: 'MultiLinearEquation'
                    });
                },
            });
        });
    }

    // Getter for current monster count (for debugging or UI display)
    public getTotalMonstersCaptured(): number {
        return this.totalMonstersCaptured;
    }

    private async cleanupQuestionUI(): Promise<void> {
        const animationPromises: Promise<void>[] = [];

        // Clean up grid lines
        if (this.gridLinesGraphics) {
            this.gridLinesGraphics.destroy();
        }

        this.intersectionDisplayElements.forEach((element) => {
            if (element && element.scene) {
                if (!this.isInstructionMode) {
                    const promise = new Promise<void>((resolve) => {
                        this.scene.tweens.add({
                            targets: element,
                            alpha: 0,
                            duration: 300,
                            ease: 'Cubic.easeIn',
                            onComplete: () => {
                                element.destroy();
                                resolve();
                            },
                        });
                    });
                    animationPromises.push(promise);
                } else {
                    element.destroy();
                }
            }
        });
        this.intersectionDisplayElements = [];

        // Clean up axis lines
        if (this.axisLinesGraphics) {
            // this.axisLinesGraphics.destroy();
        }

        // Animate out marker texts before destroying (game mode only)
        if (!this.isInstructionMode) {
            this.markerTexts.forEach((text) => {
                if (text) {
                    const promise = new Promise<void>((resolve) => {
                        this.scene.tweens.add({
                            targets: text,
                            scale: 0,
                            duration: 300,
                            ease: 'Cubic.easeIn',
                            onComplete: () => {
                                text.destroy();
                                resolve();
                            },
                        });
                    });
                    animationPromises.push(promise);
                }
            });
        } else {
            // In instruction mode, destroy markers immediately
            this.markerTexts.forEach((text) => {
                if (text) {
                    text.destroy();
                }
            });
        }

        // Clear the array immediately
        this.markerTexts = [];
        // Clean up monsters
        this.destroyMonsters();

        // Clean up both sets of adjustment buttons
        this.cleanupcontrolButtons();
        this.cleanupcontrolButtons2();

        // Handle dual-line graphics cleanup
        this.clearIntercepts();
        // Clean up monster
        if (this.monster) {
            if (!this.isInstructionMode) {
                const isFirstQuestion = this.questionSelector?.getTotalQuestionsAnswered() === 0;
                if (isFirstQuestion) {
                    this.monster.destroy();
                } else {
                    const monsterPromise = new Promise<void>((resolve) => {
                        this.scene.tweens.add({
                            targets: this.monster,
                            scale: 0,
                            duration: 300,
                            ease: 'Cubic.easeIn',
                            onComplete: () => {
                                this.monster.destroy();
                                resolve();
                            },
                        });
                    });
                    animationPromises.push(monsterPromise);
                }
            } else {
                this.monster.destroy();
            }
        }

        // Stop slider sound
        this.scene.audioManager.stopSoundEffect('slider');

        // Reset coordinates
        this.xCord = 0;
        this.yCord = 0;
        this.xCord2 = 0;
        this.yCord2 = 0;

        // Reset instruction mode state
        if (this.isInstructionMode) {
            // Clean up instruction timers and animations
            this.destroyInstructionTimers();
        }

        // Wait for all animations to complete
        await Promise.all(animationPromises);
    }

    private isFirstThreeQuestion(): boolean {
        // Get current question number (1-based)
        let currentQuestion = 1;
        if (this.questionSelector) {
            currentQuestion = this.questionSelector.getTotalQuestionsAnswered() + 1;
        }
        return currentQuestion <= 3;
    }

    private showFadeLineModal() {
        if (this.captureButton) ButtonHelper.disableButton(this.captureButton);
        if (this.resetButton) ButtonHelper.disableButton(this.resetButton);
        
        // Make sure intercepts are visible and updated for the modal
        this.updateIntercepts();
        this.intercept1.setVisible(true);
        this.intercept2.setVisible(true);

        const width = this.scene.display.width;
        const height = 145;
        const modalContainer = this.scene.add
            .container(
                this.scene.getScaledValue(this.scene.display.width / 2),
                this.scene.getScaledValue(this.scene.display.height + height / 2),
            )
            .setDepth(10);

        // Background
        const bgRect = this.scene.addRectangle(0, 0, width, height, 0x003531);
        modalContainer.add(bgRect);

        // Top accent
        const bgRectTop = this.scene.addRectangle(0, -height / 2, width, 8.32, 0x06dfd7).setOrigin(0.5, 0);
        modalContainer.add(bgRectTop);

        // Message
        const message = this.scene
            .addText(-100, 0, i18n.t('game.fadeLine'), {
                font: '700 32px Exo',
                color: '#FFFFFF',
                align: 'center',
            })
            .setOrigin(0.5);
        modalContainer.add(message);
        const infoIcon = this.scene
            .addImage(-(message.width / 2) - 100 - 55, -10, 'information_icon')
            .setOrigin(0, 0.5)
            .setScale(1);
        modalContainer.add(infoIcon);

        // Continue button
        const continueBtn = ButtonHelper.createButton({
            scene: this.scene,
            imageKeys: {
                default: 'capture_btn_continue',
                hover: 'capture_btn_continue_hover',
                pressed: 'capture_btn_continue_pressed',
            },
            text: i18n.t('game.continue'),
            label: i18n.t('game.continue'),
            textStyle: {
                font: '700 32px Exo',
                color: '#FFFFFF',
            },
            imageScale: 1,
            x: 0,
            y: 0,
            onClick: () => {
                // First fade both intercepts
                this.scene.tweens.add({
                    targets: [this.intercept1, this.intercept2],
                    alpha: 0,
                    duration: 500,
                    ease: 'Power2',
                    onComplete: () => {
                        this.intercept1.setVisible(false);
                        this.intercept2.setVisible(false);
                        // Reset alpha for future use
                        this.intercept1.setAlpha(1);
                        this.intercept2.setAlpha(1);
                    },
                });

                // Then hide the modal
                this.scene.tweens.add({
                    targets: modalContainer,
                    y: this.scene.getScaledValue(this.scene.display.height + height / 2),
                    duration: 400,
                    ease: 'Power2',
                    onComplete: () => {
                        modalContainer.destroy();

                        // Enable capture button and sliders again
                        if (this.captureButton) ButtonHelper.enableButton(this.captureButton);
                        if (this.resetButton) ButtonHelper.enableButton(this.resetButton);
                    },
                });
            },
        });
        modalContainer.add(continueBtn);
        continueBtn.setPosition(message.getBounds().width / 2 + 16, 0);

        // Animate modal in
        this.scene.tweens.add({
            targets: modalContainer,
            y: this.scene.getScaledValue(this.scene.display.height - height / 2),
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                const continueBtnOverlay = (continueBtn as any).buttonOverlay;
                if (continueBtnOverlay) {
                    continueBtnOverlay.recreate();
                }
            }        
        });
    }

    private cleanupcontrolButtons() {
        Object.values(this.controlButtons || {}).forEach((button) => {
            if (button && button.scene) {
                button.destroy();
            }
        });
        // Reset the references
        this.controlButtons = undefined;
    }

    private cleanupcontrolButtons2() {
        Object.values(this.controlButtons2 || {}).forEach((button) => {
            if (button && button.scene) {
                button.destroy();
            }
        });
        // Reset the references
        this.controlButtons2 = undefined;
    }

    private showMonster() {
        if (!this.question) return;

        // Clear any existing monsters first
        this.destroyMonsters();

        // Get available keys for regular monsters (excluding intersection key)
        const availableKeysForRegular = this.getAvailableMonsterKeys(['monster_intersect']);

        // Parse monster coordinates from coordinates field
        const coordPairs: string[] = this.question.coordinates.split('),(');
        coordPairs.forEach((coordPair, index) => {
            // Clean up the coordinate string
            const cleanCoord = coordPair.replace(/[()]/g, '');
            const coords = cleanCoord.split(',');

            if (coords.length === 2) {
                const monsterX = parseFloat(coords[0].trim());
                const monsterY = parseFloat(coords[1].trim());

                // Create monster at this coordinate using available keys
                const monster = this.createMonsterAt(monsterX, monsterY, 'regular', index + 1, availableKeysForRegular);
                if (monster) {
                    this.monsters.push(monster);

                    // Set the first monster as the main monster for backward compatibility
                    if (index === 0) {
                        this.monster = monster;
                    }
                }
            }
        });

        // Parse intersection point from coordinateIntersection field
        const intersectionCoord = this.question.coordinateIntersection.replace(/[()]/g, '');
        const intersectionCoords = intersectionCoord.split(',');
        const intersectionMonsterIndex = 3;
        if (intersectionCoords.length === 2) {
            const intersectionX = parseFloat(intersectionCoords[0].trim());
            const intersectionY = parseFloat(intersectionCoords[1].trim());

            // Create intersection monster with monster_intersect key
            const intersectionMonster = this.createMonsterAt(intersectionX, intersectionY, 'intersection', intersectionMonsterIndex, [
                'monster_intersect',
            ]);
            this.createIntersectionDisplay(intersectionMonster,intersectionMonsterIndex);
            if (intersectionMonster) {
                this.monsters.push(intersectionMonster);
            }
        }

        // Update position text overlay to show the first monster's position
        if (this.monsters.length > 0) {
            const coords = this.question.coordinates.split('),(')[0].replace(/[()]/g, '').split(',');
            const x = coords[0].trim();
            const y = coords[1].trim();
            this.positionTextOverlay?.updateContent(i18n.t('common.currentPosition', { x, y }));
        }
    }

    private createMonsterAt(
        monsterX: number,
        monsterY: number,
        monsterType: 'regular' | 'intersection',
        index: number,
        availableKeys?: string[],
    ): Phaser.GameObjects.Image | null {
        if (!this.question) return null;

        // Padding values (same as used in other functions)
        const xPadding = this.scene.getScaledValue(40);
        const yPadding = this.scene.getScaledValue(20);

        // Calculate the center of the grid board
        const gridCenterX = this.gridBoard.x + this.gridBoard.displayWidth / 2;
        const gridCenterY = this.gridBoard.y + this.gridBoard.displayHeight / 2;

        // Calculate scale factors using the question's min/max values
        const xScale = (this.gridBoard.displayWidth - xPadding * 2) / (this.question.maxX - this.question.minX);
        const yScale = (this.gridBoard.displayHeight - yPadding * 2) / (this.question.maxY - this.question.minY);

        const monsterPixelX = gridCenterX + monsterX * xScale;
        const monsterPixelY = gridCenterY - monsterY * yScale;

        // Use provided keys or get a random key
        let monsterKey: string;
        if (availableKeys && availableKeys.length > 0) {
            if (monsterType === 'intersection') {
                monsterKey = availableKeys[0]; // Use the specific intersection key
            } else {
                // For regular monsters, pick randomly from available keys and remove it
                const randomIndex = Math.floor(Math.random() * availableKeys.length);
                monsterKey = availableKeys[randomIndex];
                availableKeys.splice(randomIndex, 1); // Remove used key
            }
        } else {
            monsterKey = this.getRandomMonsterKey();
        }

        // Create and position the monster sprite
        const monster = this.scene
            .addImage(monsterPixelX / this.scene.display.scale, monsterPixelY / this.scene.display.scale, monsterKey)
            .setOrigin(0.5)
            .setScale(0.6)
            .setDepth(3);
        new ImageOverlay(this.scene, monster, {
            label: i18n.t('common.monsterWithIndex', {
                index: index,
                x: monsterX.toString(),
                y: monsterY.toString(),
            }),
        });

        if (!this.isInstructionMode) {
            monster.setScale(0);
            this.scene.tweens.add({
                targets: monster,
                scale: this.scene.getScaledValue(0.6),
                duration: 500,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    // Add rotation for intersection monster after scale animation completes
                    if (monsterType === 'intersection') {
                        this.scene.tweens.add({
                            targets: monster,
                            rotation: Math.PI * 2,
                            duration: 6000,
                            ease: 'Linear',
                            repeat: -1,
                        });
                    }
                },
            });
        } else {
            // In instruction mode, add rotation immediately for intersection monster
            if (monsterType === 'intersection') {
                this.scene.tweens.add({
                    targets: monster,
                    rotation: Math.PI * 2,
                    duration: 6000,
                    ease: 'Linear',
                    repeat: -1,
                });
            }
        }

        return monster;
    }

    // Helper method to get available monster keys excluding used ones
    private getAvailableMonsterKeys(excludeKeys: string[] = []): string[] {
        const allMonsterKeys = ['monster_1', 'monster_2', 'monster_3', 'monster_4', 'monster_5'];
        return allMonsterKeys.filter((key) => !excludeKeys.includes(key));
    }

    // Update getRandomMonsterKey to work with exclusions
    private getRandomMonsterKey(excludeKeys: string[] = []): string {
        const availableKeys = this.getAvailableMonsterKeys(excludeKeys);

        if (availableKeys.length === 0) {
            // Fallback to all keys if no available keys
            const allKeys = ['monster_1', 'monster_2', 'monster_3', 'monster_4', 'monster_5'];
            const randomIndex = Math.floor(Math.random() * allKeys.length);
            return allKeys[randomIndex];
        }

        const randomIndex = Math.floor(Math.random() * availableKeys.length);
        return availableKeys[randomIndex];
    }

    private destroyMonsters() {
        this.monsters.forEach((monster) => {
            if (monster && monster.scene) {
                // Check if monster still exists
                monster.destroy();
            }
        });
        this.monsters = [];
    }

    private drawAxisLines() {
        // Calculate the center of the grid board using the gridBoard object
        const gridCenterX = this.gridBoard.x + this.gridBoard.displayWidth / 2;
        const gridCenterY = this.gridBoard.y + this.gridBoard.displayHeight / 2;

        // Create graphics object for drawing lines
        this.axisLinesGraphics = this.scene.add.graphics();
        this.axisLinesGraphics.setDepth(1);

        // Set line style for x-axis (horizontal line)
        this.axisLinesGraphics.lineStyle(4, 0xffffff);
        this.axisLinesGraphics.beginPath();
        this.axisLinesGraphics.moveTo(this.gridBoard.x, gridCenterY); // Start from left edge of grid
        this.axisLinesGraphics.lineTo(this.gridBoard.x + this.gridBoard.displayWidth, gridCenterY); // End at right edge of grid
        this.axisLinesGraphics.strokePath();

        // Set line style for y-axis (vertical line)
        this.axisLinesGraphics.lineStyle(4, 0xffe100);
        this.axisLinesGraphics.beginPath();
        this.axisLinesGraphics.moveTo(gridCenterX, this.gridBoard.y); // Start from top edge of grid
        this.axisLinesGraphics.lineTo(gridCenterX, this.gridBoard.y + this.gridBoard.displayHeight); // End at bottom edge of grid
        this.axisLinesGraphics.strokePath();
    }

    private drawMarkers(xMin: number, xMax: number, xInterval: number, yMin: number, yMax: number, yInterval: number) {
        // Padding to prevent text overflow from grid edges
        const xPadding = this.scene.getScaledValue(40); // 40px for x-axis
        const yPadding = this.scene.getScaledValue(20); // 20px for y-axis

        // Calculate the center of the grid board
        const gridCenterX = this.gridBoard.x + this.gridBoard.displayWidth / 2;
        const gridCenterY = this.gridBoard.y + this.gridBoard.displayHeight / 2;

        // Calculate the scale factor for converting coordinate values to pixel positions
        // Use padded area for scaling to ensure markers don't overflow
        const xScale = (this.gridBoard.displayWidth - xPadding * 2) / (xMax - xMin);
        const yScale = (this.gridBoard.displayHeight - yPadding * 2) / (yMax - yMin);

        // Offsets for axis labels
        const xLabelOffset = this.scene.getScaledValue(15); // Distance from axis line
        const yLabelOffset = this.scene.getScaledValue(25); // Distance from axis line

        // X-axis labels (at both ends of horizontal line)
        // Left end of X-axis
        const leftXLabel = this.scene
            .addText(
                (this.gridBoard.x + xLabelOffset) / this.scene.display.scale,
                gridCenterY / this.scene.display.scale,
                '𝑥',
                {
                    font: '700 18px Exo',
                    color: '#FFFFFF',
                    stroke: '#001317',
                    strokeThickness: 2,
                },
            )
            .setOrigin(1, 1)
            .setDepth(1);
        new TextOverlay(this.scene, leftXLabel, {
            label: i18n.t('common.xAxisLabel'),
        });
        this.markerTexts.push(leftXLabel);

        // Draw X-axis markers
        for (let x = xMin; x <= xMax; x += xInterval) {
            if (x === 0) continue; // Skip origin point as it's already marked by axis intersection

            const pixelX = gridCenterX + x * xScale;
            const pixelY = gridCenterY;

            // Add text label
            const text = this.scene
                .addText(pixelX / this.scene.display.scale, pixelY / this.scene.display.scale + 20, x.toString(), {
                    font: '700 16px Exo',
                    color: '#FFFFFF',
                    stroke: '#001317',
                    strokeThickness: 2,
                })
                .setOrigin(0.5)
                .setDepth(1);
            new TextOverlay(this.scene, text, {
                label: i18n.t('common.xMarker', { x: x.toString() }),
            });

            // Animate in the marker (game mode only)
            if (!this.isInstructionMode) {
                text.setScale(0);
                this.scene.tweens.add({
                    targets: text,
                    scale: this.scene.getScaledValue(1),
                    duration: 500,
                    ease: 'Cubic.easeOut',
                });
            }

            this.markerTexts.push(text);
        }

        // Right end of X-axis
        const rightXLabel = this.scene
            .addText(
                (this.gridBoard.x + this.gridBoard.displayWidth - xLabelOffset) / this.scene.display.scale,
                gridCenterY / this.scene.display.scale,
                '𝑥',
                {
                    font: '700 18px Exo',
                    color: '#FFFFFF',
                    stroke: '#001317',
                    strokeThickness: 2,
                },
            )
            .setOrigin(0, 1)
            .setDepth(1);
        new TextOverlay(this.scene, rightXLabel, {
            label: i18n.t('common.xAxisLabel'),
        });
        this.markerTexts.push(rightXLabel);

        // Y-axis labels (at both ends of vertical line)
        // Bottom end of Y-axis
        const bottomYLabel = this.scene
            .addText(
                gridCenterX / this.scene.display.scale + 5,
                (this.gridBoard.y + this.gridBoard.displayHeight - yLabelOffset) / this.scene.display.scale,
                '𝑦',
                {
                    font: '700 18px Exo',
                    color: '#FFE100',
                    stroke: '#001317',
                    strokeThickness: 2,
                },
            )
            .setOrigin(0, 0)
            .setDepth(1);
        new TextOverlay(this.scene, bottomYLabel, {
            label: i18n.t('common.yAxisLabel'),
        });
        this.markerTexts.push(bottomYLabel);

        // Draw Y-axis markers
        for (let y = yMax; y >= yMin; y -= yInterval) {
            if (y === 0) continue; // Skip origin point as it's already marked by axis intersection

            const pixelX = gridCenterX;
            const pixelY = gridCenterY - y * yScale; // Note: Y is inverted in screen coordinates

            // Add text label
            const text = this.scene
                .addText(pixelX / this.scene.display.scale - 20, pixelY / this.scene.display.scale, y.toString(), {
                    font: '700 16px Exo',
                    color: '#FFE100',
                    stroke: '#001317',
                    strokeThickness: 2,
                })
                .setOrigin(1, 0.5);
            new TextOverlay(this.scene, text, {
                label: i18n.t('common.yMarker', { y: y.toString() }),
            });

            // Animate in the marker (game mode only)
            if (!this.isInstructionMode) {
                text.setScale(0);
                this.scene.tweens.add({
                    targets: text,
                    scale: this.scene.getScaledValue(1),
                    duration: 500,
                    ease: 'Cubic.easeOut',
                });
            }

            this.markerTexts.push(text);
        }

        // Top end of Y-axis
        const topYLabel = this.scene
            .addText(
                gridCenterX / this.scene.display.scale + 5,
                (this.gridBoard.y + yLabelOffset) / this.scene.display.scale,
                '𝑦',
                {
                    font: '700 18px Exo',
                    color: '#FFE100',
                    stroke: '#001317',
                    strokeThickness: 2,
                },
            )
            .setOrigin(0, 1)
            .setDepth(1);
        new TextOverlay(this.scene, topYLabel, {
            label: i18n.t('common.yAxisLabel'),
        });
        this.markerTexts.push(topYLabel);
    }

    private drawGridLines(
        xMin: number,
        xMax: number,
        xInterval: number,
        yMin: number,
        yMax: number,
        yInterval: number,
    ) {
        // Padding to prevent grid lines from touching the edges
        const xPadding = this.scene.getScaledValue(40); // 40px for x-axis
        const yPadding = this.scene.getScaledValue(20); // 20px for y-axis

        // Calculate the center of the grid board
        const gridCenterX = this.gridBoard.x + this.gridBoard.displayWidth / 2;
        const gridCenterY = this.gridBoard.y + this.gridBoard.displayHeight / 2;

        // Calculate the scale factor for converting coordinate values to pixel positions
        const xScale = (this.gridBoard.displayWidth - xPadding * 2) / (xMax - xMin);
        const yScale = (this.gridBoard.displayHeight - yPadding * 2) / (yMax - yMin);

        // Create graphics object for drawing grid lines
        this.gridLinesGraphics = this.scene.add.graphics();
        this.gridLinesGraphics.lineStyle(1, 0x006f64); // Green color #006F64, 1px width

        // Draw vertical grid lines (parallel to y-axis)
        for (let x = xMin; x <= xMax; x += xInterval) {
            if (x === 0) continue; // Skip center line as it's already the y-axis

            const pixelX = gridCenterX + x * xScale;

            this.gridLinesGraphics.beginPath();
            this.gridLinesGraphics.moveTo(pixelX, this.gridBoard.y);
            this.gridLinesGraphics.lineTo(pixelX, this.gridBoard.y + this.gridBoard.height);
            this.gridLinesGraphics.strokePath();
        }

        // Draw horizontal grid lines (parallel to x-axis)
        for (let y = yMin; y <= yMax; y += yInterval) {
            if (y === 0) continue; // Skip center line as it's already the x-axis

            const pixelY = gridCenterY - y * yScale; // Note: Y is inverted in screen coordinates

            this.gridLinesGraphics.beginPath();
            this.gridLinesGraphics.moveTo(this.gridBoard.x, pixelY);
            this.gridLinesGraphics.lineTo(this.gridBoard.x + this.gridBoard.width, pixelY);
            this.gridLinesGraphics.strokePath();
        }
    }

    private createIntercepts() {
        // Create graphics objects for intercept lines
        this.intercept1 = this.scene.add.graphics();
        this.intercept2 = this.scene.add.graphics();

        // Initial update
        this.updateIntercepts();
    }

    private updateIntercepts() {
        if (!this.question) return;

        // Padding values (same as used in other functions)
        const xPadding = this.scene.getScaledValue(40);
        const yPadding = this.scene.getScaledValue(20);

        // Calculate the center of the grid board
        const gridCenterX = this.gridBoard.x + this.gridBoard.displayWidth / 2;
        const gridCenterY = this.gridBoard.y + this.gridBoard.displayHeight / 2;

        // Calculate scale factors using actual question range
        const xScale = (this.gridBoard.displayWidth - xPadding * 2) / (this.question.maxX - this.question.minX);
        const yScale = (this.gridBoard.displayHeight - yPadding * 2) / (this.question.maxY - this.question.minY);

        // Clear previous lines
        this.intercept1?.clear();
        this.intercept2?.clear();

        this.drawInterceptLine(
            this.intercept1,
            this.xCord,
            this.yCord,
            xScale,
            yScale,
            gridCenterX,
            gridCenterY,
            'line1',
        );
        this.drawInterceptLine(
            this.intercept2,
            this.xCord2,
            this.yCord2,
            xScale,
            yScale,
            gridCenterX,
            gridCenterY,
            'line2',
        );

        // For the first 3 questions, make lines visible when updating
        // After 3rd question, the visibility is managed by other methods
        if (!this.isInstructionMode && this.isFirstThreeQuestion()) {
            this.intercept1.setVisible(true);
            this.intercept2.setVisible(true);
        }
    }

    private drawInterceptLine(
        graphicsObject: Phaser.GameObjects.Graphics,
        slope: number,
        yIntercept: number,
        xScale: number,
        yScale: number,
        gridCenterX: number,
        gridCenterY: number,
        lineType: 'line1' | 'line2',
    ) {
        if (!this.question) return;

        // Calculate the actual visible grid boundaries in coordinate space
        const gridLeft = this.gridBoard.x;
        const gridRight = this.gridBoard.x + this.gridBoard.displayWidth;
        const gridTop = this.gridBoard.y;
        const gridBottom = this.gridBoard.y + this.gridBoard.displayHeight;

        // Convert grid boundaries back to coordinate space
        const leftX = (gridLeft - gridCenterX) / xScale;
        const rightX = (gridRight - gridCenterX) / xScale;
        const topY = -(gridTop - gridCenterY) / yScale;
        const bottomY = -(gridBottom - gridCenterY) / yScale;

        // Calculate y values at left and right edges
        const yAtLeft = slope * leftX + yIntercept;
        const yAtRight = slope * rightX + yIntercept;

        // Calculate x values at top and bottom edges (if slope is not zero)
        let xAtTop = slope !== 0 ? (topY - yIntercept) / slope : leftX;
        let xAtBottom = slope !== 0 ? (bottomY - yIntercept) / slope : leftX;

        // Find intersection points that are within the grid boundaries
        const intersectionPoints: Array<{ x: number; y: number }> = [];

        // Check left edge intersection
        if (yAtLeft >= bottomY && yAtLeft <= topY) {
            intersectionPoints.push({ x: leftX, y: yAtLeft });
        }

        // Check right edge intersection
        if (yAtRight >= bottomY && yAtRight <= topY) {
            intersectionPoints.push({ x: rightX, y: yAtRight });
        }

        // Check top edge intersection
        if (xAtTop >= leftX && xAtTop <= rightX && slope !== 0) {
            intersectionPoints.push({ x: xAtTop, y: topY });
        }

        // Check bottom edge intersection
        if (xAtBottom >= leftX && xAtBottom <= rightX && slope !== 0) {
            intersectionPoints.push({ x: xAtBottom, y: bottomY });
        }

        // Remove duplicate points
        const uniquePoints = intersectionPoints.filter((point, index, array) => {
            return index === array.findIndex((p) => Math.abs(p.x - point.x) < 0.001 && Math.abs(p.y - point.y) < 0.001);
        });

        // Draw gradient line if we have 2 intersection points
        if (uniquePoints.length >= 2) {
            const startPoint = uniquePoints[0];
            const endPoint = uniquePoints[1];

            // Convert back to pixel coordinates
            const startPixelX = gridCenterX + startPoint.x * xScale;
            const startPixelY = gridCenterY - startPoint.y * yScale;
            const endPixelX = gridCenterX + endPoint.x * xScale;
            const endPixelY = gridCenterY - endPoint.y * yScale;

            // Create gradient line using different colors for each line
            this.drawGradientLineWithColor(graphicsObject, startPixelX, startPixelY, endPixelX, endPixelY, lineType);
        } else if (uniquePoints.length === 1) {
            // Special case: single point
            const point = uniquePoints[0];
            const pixelX = gridCenterX + point.x * xScale;
            const pixelY = gridCenterY - point.y * yScale;

            const color = lineType === 'line1' ? 0x00ffbf : 0xff5900;
            graphicsObject.lineStyle(4, this.isInterceptRed ? 0xff0000 : color);
            graphicsObject.beginPath();
            graphicsObject.arc(pixelX, pixelY, 2, 0, Math.PI * 2);
            graphicsObject.strokePath();
        }

        const updatedPoints = uniquePoints.map((pt) => ({
            x: gridCenterX + pt.x * xScale,
            y: gridCenterY - pt.y * yScale,
        }));

        if (lineType === 'line1') {
            this._interceptPoints1 = updatedPoints;
        } else {
            this._interceptPoints2 = updatedPoints;
        }
    }

    private drawGradientLineWithColor(
        graphicsObject: Phaser.GameObjects.Graphics,
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        lineType: 'line1' | 'line2',
    ) {
        const segments = 20; // Number of segments for smooth gradient
        const lineWidth = 6;

        // Different color schemes for each line
        let startColor, midColor, endColor;

        if (lineType === 'line1') {
            // Blue/Teal gradient for line 1
            startColor = { r: 0x00, g: 0x70, b: 0x65 }; // #007065
            midColor = { r: 0x00, g: 0xff, b: 0xe6 }; // #00FFE6
            endColor = { r: 0x00, g: 0x70, b: 0x65 }; // #007065
        } else {
            // Orange/Red gradient for line 2
            startColor = { r: 0x8b, g: 0x2d, b: 0x00 }; // #8B2D00
            midColor = { r: 0xff, g: 0x59, b: 0x00 }; // #FF5900
            endColor = { r: 0x8b, g: 0x2d, b: 0x00 }; // #8B2D00
        }

        for (let i = 0; i < segments; i++) {
            const t1 = i / segments;
            const t2 = (i + 1) / segments;

            // Calculate positions for this segment
            const x1 = startX + (endX - startX) * t1;
            const y1 = startY + (endY - startY) * t1;
            const x2 = startX + (endX - startX) * t2;
            const y2 = startY + (endY - startY) * t2;

            // Calculate color for this segment
            let color;
            if (t1 <= 0.75) {
                // Interpolate from start to mid (0% to 75%)
                const localT = t1 / 0.75;
                color = {
                    r: Math.round(startColor.r + (midColor.r - startColor.r) * localT),
                    g: Math.round(startColor.g + (midColor.g - startColor.g) * localT),
                    b: Math.round(startColor.b + (midColor.b - startColor.b) * localT),
                };
            } else {
                // Interpolate from mid to end (75% to 100%)
                const localT = (t1 - 0.75) / 0.25;
                color = {
                    r: Math.round(midColor.r + (endColor.r - midColor.r) * localT),
                    g: Math.round(midColor.g + (endColor.g - midColor.g) * localT),
                    b: Math.round(midColor.b + (endColor.b - midColor.b) * localT),
                };
            }

            // Convert to hex
            const hexColor = (color.r << 16) | (color.g << 8) | color.b;

            // Draw this segment
            graphicsObject.lineStyle(lineWidth, hexColor);
            graphicsObject.beginPath();
            graphicsObject.moveTo(x1, y1);
            graphicsObject.lineTo(x2, y2);
            graphicsObject.strokePath();
        }

        graphicsObject.setDepth(2);
    }

    private createButtons() {
        // Skip button for instruction mode
        if (this.isInstructionMode) {
            ButtonHelper.createButton({
                scene: this.scene,
                imageKeys: {
                    default: BUTTONS.HALF_BUTTON.KEY,
                    hover: BUTTONS.HALF_BUTTON_HOVER.KEY,
                    pressed: BUTTONS.HALF_BUTTON_PRESSED.KEY,
                },
                text: i18n.t('common.skip'),
                label: i18n.t('common.skip'),
                textStyle: {
                    font: '700 32px Exo',
                    color: '#FFFFFF',
                },
                imageScale: 1,
                x: this.scene.display.width - 54,
                y: 70,
                onClick: () => {
                    // Clean up instruction timers and animations before transitioning
                    this.destroyInstructionTimers();
                    this.startGameScene();
                },
            });
        }

        // Only create pause and help buttons if not in instruction mode
        if (!this.isInstructionMode) {
            // Pause button
            ButtonHelper.createIconButton({
                scene: this.scene,
                imageKeys: {
                    default: BUTTONS.ICON_BTN.KEY,
                    hover: BUTTONS.ICON_BTN_HOVER.KEY,
                    pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
                },
                icon: BUTTONS.PAUSE_ICON.KEY,
                label: i18n.t('common.pause'),
                x: this.scene.display.width - 54,
                y: 66,
                raisedOffset: 3.5,
                onClick: () => {
                    this.scene.scene.pause();
                    this.scene.scene.launch('PauseScene', { parentScene: 'GameScene' });
                    this.scene.audioManager.pauseAll();
                    this.scene.scene.bringToTop('PauseScene');
                },
            }).setName('pause_btn');
        }

        // Mute button (always create)
        this.muteBtn = ButtonHelper.createIconButton({
            scene: this.scene,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.UNMUTE_ICON.KEY,
            label: i18n.t('common.mute'),
            ariaLive: 'off',
            x: this.scene.display.width - 54,
            y: this.isInstructionMode ? 160 : 142,
            raisedOffset: 3.5,
            onClick: () => {
                this.scene.audioManager.setMute(!this.scene.audioManager.getIsAllMuted());
            },
        });

        // Volume slider (always create)
        this.volumeSlider = new VolumeSlider(this.scene);
        this.volumeSlider.create(
            this.scene.display.width - 220,
            this.isInstructionMode ? 256 : 238,
            'purple',
            i18n.t('common.volume'),
        );
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
            y: this.isInstructionMode ? 236 : 218,
            raisedOffset: 3.5,
            onClick: () => {
                this.volumeSlider.toggleControl();
            },
        });

        if (!this.isInstructionMode) {
            // Help button
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
                    this.scene.scene.pause();
                    this.scene.audioManager.pauseAll();
                    this.scene.scene.launch('InstructionsScene', {
                        parentScene: 'GameScene',
                    });
                    this.scene.scene.bringToTop('InstructionsScene');
                },
            });
        }
    }

    private createCaptureButton() {
        if (this.captureButton) {
            this.captureButton.destroy();
        }
        // Capture button
        this.captureButton = ButtonHelper.createButton({
            scene: this.scene,
            imageKeys: {
                default: 'capture_btn',
                hover: 'capture_btn_hover',
                pressed: 'capture_btn_pressed',
            },
            text: i18n.t('game.capture'),
            label: i18n.t('game.capture'),
            textStyle: {
                font: '700 36px Exo',
                color: '#FFFFFF',
            },
            imageScale: 1,
            x: 1110,
            y: 689,
            onClick: () => {
                this.checkAnswer();
            },
        });

        if (this.isInstructionMode) {
            ButtonHelper.disableButton(this.captureButton);
        }
    }

    private createResetButton() {
        if (this.resetButton) {
            this.resetButton.destroy();
        }
        // Reset button
        this.resetButton = ButtonHelper.createButton({
            scene: this.scene,
            imageKeys: {
                default: 'reset_btn',
                hover: 'reset_btn_hover',
                pressed: 'reset_btn_pressed',
            },
            text: i18n.t('game.reset'),
            label: i18n.t('game.reset'),
            textStyle: {
                font: '700 36px Exo',
                color: '#FFFFFF',
            },
            imageScale: 1,
            x: 127,
            y: 689,
            onClick: () => {
                this.resetToOrigin();
            },
        });

        if (this.isInstructionMode) {
            ButtonHelper.disableButton(this.resetButton);
        }
    }

    private resetToOrigin() {
        this.xCord = 0;
        this.yCord = 0;
        this.xCord2 = 0;
        this.yCord2 = 0;

        this.clearIntercepts();

        // Recreate the control boxes to reset their displays
        this.cleanupcontrolButtons();
        this.cleanupcontrolButtons2();
        this.createControls();

        // Reset both adjustment box displays
        this.resetAdjustmentBoxDisplays();

        // Update intercepts to show at 0,0
        this.updateIntercepts();

        // Handle instruction mode hand animations
        if (this.isInstructionMode) {
            this.disablecontrolButtons();
            this.disablecontrolButtons2();
        }
    }

    private checkAnswer() {
        if (!this.question) return;
        if (this.isProcessing) return;

        // Revert all monsters to their normal images
        const isCorrect = this.validateDualLineAnswerWithEquations();

        console.log(`Dual line validation result: ${isCorrect}`);

        this.intercept1.setVisible(true);
        this.intercept2.setVisible(true);

        if (isCorrect) {
            console.log('correct');
            this.isProcessing = true;
            this.scene.time.delayedCall(1000, () => {
                // Only hide lines if we're NOT in the first 3 questions
                // For first 3 questions, lines should remain visible for next question
                if (!this.isFirstThreeQuestion()) {
                    this.intercept1.setVisible(false);
                    this.intercept2.setVisible(false);
                }
            });
            if (this.isInstructionMode) {
                ButtonHelper.enableButton(this.resetButton);
                // Clean up instruction timers and animations before transitioning
                this.destroyInstructionTimers();

                // delay to allow coordinate reveal animation to be visible
                this.scene.time.delayedCall(800, () => {
                    this.startGameScene();
                });
            } else {
                this.analyticsHelper?.createTrial({
                    questionMaxPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                    achievedPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                    questionText: `Target Points: ${this.question.coordinates}, Intersection Point: ${this.question.coordinateIntersection}`,
                    isCorrect: true,
                    questionMechanic: 'default',
                    gameLevelInfo: 'game.grid_lock.default',
                    studentResponse: `${this.xCord}x + ${this.yCord}, ${this.xCord2}x + ${this.yCord2}`,
                    studentResponseAccuracyPercentage: '100%',
                });

                this.updateMonsterSelectionVisuals();
                // Normal game mode
                this.scoreHelper.answerCorrectly();
                this.questionSelector?.answerCorrectly();
                this.scoreCoins?.updateScoreDisplay(true);

                // Use first monster for jail animation
                const line1Monsters = this.getMonstersOnLine(this.xCord, this.yCord);
                const line2Monsters = this.getMonstersOnLine(this.xCord2, this.yCord2);
                const allMonstersOnLines = [...new Set([...line1Monsters, ...line2Monsters])]; // Remove duplicates
                this.scene.time.delayedCall(1000, () => {
                    this.resetMonsterSelectionVisuals();
                    if (allMonstersOnLines.length > 0) {
                        // Track captured monsters for final score
                        this.totalMonstersCaptured += allMonstersOnLines.length;
                        console.log(`Captured ${allMonstersOnLines.length} monsters. Total: ${this.totalMonstersCaptured}`);
                        this.monsterJail.animateMonsterToJail(allMonstersOnLines, () => {
                            this.showSuccessAnimation();

                            // Update progress bar
                            const progress = this.questionSelector!.getTotalQuestionsAnswered() / this.totalQuestions;
                            this.progressBar?.drawProgressFill(progress, this.scoreHelper.getCurrentStreak());

                            // Check if we should show streak celebration
                            if (this.scoreHelper.showStreakAnimation()) {
                                this.showMascotCelebration(() => {
                                    this.loadNextQuestion();
                                });
                                return;
                            }
                            // Load next question
                            this.loadNextQuestion();
                        });
                    } else {
                        // Fallback if no monsters exist
                        this.showSuccessAnimation();
                        this.loadNextQuestion();
                    }
                });
            }
        } else {
            console.log('wrong');
            this.isProcessing = true;

            if (!this.isInstructionMode) {
                this.showAndBlinkIntercept(3, () => {
                    if (this.remainingChances-- > 0) {
                        this.createChancesContainer();
                        this.showErrorAnimation(this.remainingChances === 0 ? true : false);
                        if (this.remainingChances !== 0) {
                            this.isProcessing = false;
                            return;
                        }
                    }

                    this.analyticsHelper?.createTrial({
                        questionMaxPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                        achievedPoints: 0,
                        questionText: `Target Points: ${this.question?.coordinates || ''}, Intersection Point: ${this.question?.coordinateIntersection || ''}`,
                        isCorrect: false,
                        questionMechanic: 'default',
                        gameLevelInfo: 'game.grid_lock.default',
                        studentResponse: `${this.xCord}x + ${this.yCord}, ${this.xCord2}x + ${this.yCord2}`,
                        studentResponseAccuracyPercentage: '0%',
                    });

                    // Only update score and progress in game mode
                    this.scoreHelper.answerIncorrectly();
                    this.questionSelector?.answerIncorrectly(this.question!);
                    this.scoreCoins?.updateScoreDisplay(false);

                    // Update progress bar
                    const progress = this.questionSelector!.getTotalQuestionsAnswered() / this.totalQuestions;
                    this.progressBar?.drawProgressFill(progress, this.scoreHelper.getCurrentStreak());

                    this.scene.time.delayedCall(this.remainingChances === 0 ? 2500 : 1000, () => {
                        this.loadNextQuestion();
                    });
                });
            } else {
            }
            // In instruction mode, do nothing for incorrect answers (button shouldn't be clickable anyway)
        }
    }

    private resetAdjustmentBoxDisplays() {
        // This method will reset the visual displays of both adjustment boxes
        // Since the displays are handled within the closures in createSingleAdjustmentBox,
        // we need to trigger a recreation or update the displays manually

        // For now, we'll clear and recreate the adjustment boxes
        // You might want to store references to the text elements for direct updates

        // Alternative: Store references to value display elements in class properties
        // and update them directly here

        console.log('Adjustment boxes reset to (0,0) for both lines');
    }

    private validateDualLineAnswerWithEquations(): boolean {
        if (!this.question) return false;

        // Parse expected equations from answer field
        const expectedEquations = this.parseExpectedEquations(this.question.answer);
        if (expectedEquations.length !== 2) return false;

        // Parse intersection point
        const intersectionCoord = this.question.coordinateIntersection.replace(/[()]/g, '');
        const intersectionCoords = intersectionCoord.split(',');

        if (intersectionCoords.length !== 2) return false;

        const intersectionX = parseFloat(intersectionCoords[0].trim());
        const intersectionY = parseFloat(intersectionCoords[1].trim());

        // Check if both lines pass through intersection point
        const line1AtIntersection = this.calculateYFromEquation(intersectionX, this.xCord, this.yCord);
        const line2AtIntersection = this.calculateYFromEquation(intersectionX, this.xCord2, this.yCord2);

        const line1PassesIntersection = Math.abs(line1AtIntersection - intersectionY) < 0.001;
        const line2PassesIntersection = Math.abs(line2AtIntersection - intersectionY) < 0.001;

        if (!line1PassesIntersection || !line2PassesIntersection) {
            console.log('Lines do not pass through intersection point');
            return false;
        }

        // Check if each line passes through at least one coordinate point
        const coordPairs: string[] = this.question.coordinates.split('),(');
        let line1PassesThroughMonster = false;
        let line2PassesThroughMonster = false;

        coordPairs.forEach((coordPair) => {
            const cleanCoord = coordPair.replace(/[()]/g, '');
            const coords = cleanCoord.split(',');

            if (coords.length === 2) {
                const monsterX = parseFloat(coords[0].trim());
                const monsterY = parseFloat(coords[1].trim());

                const line1Y = this.calculateYFromEquation(monsterX, this.xCord, this.yCord);
                if (Math.abs(line1Y - monsterY) < 0.001) {
                    line1PassesThroughMonster = true;
                }

                const line2Y = this.calculateYFromEquation(monsterX, this.xCord2, this.yCord2);
                if (Math.abs(line2Y - monsterY) < 0.001) {
                    line2PassesThroughMonster = true;
                }
            }
        });

        if (!line1PassesThroughMonster || !line2PassesThroughMonster) {
            console.log('Lines do not pass through required coordinate points');
            return false;
        }

        // Generate current equations and compare with expected equations
        const currentEquations = [
            this.formatEquation(this.xCord, this.yCord),
            this.formatEquation(this.xCord2, this.yCord2),
        ];

        return this.equationsMatch(currentEquations, expectedEquations);
    }

    private equationsMatch(
        currentEquations: Array<{ slope: number; yIntercept: number }>,
        expectedEquations: Array<{ slope: number; yIntercept: number }>,
    ): boolean {
        if (currentEquations.length !== expectedEquations.length) return false;

        // Check if equations match in any order
        const tolerance = 0.001;

        // Try to match each current equation with an expected equation
        const usedExpected: boolean[] = new Array(expectedEquations.length).fill(false);

        for (const current of currentEquations) {
            let matched = false;

            for (let i = 0; i < expectedEquations.length; i++) {
                if (usedExpected[i]) continue;

                const expected = expectedEquations[i];
                if (
                    Math.abs(current.slope - expected.slope) < tolerance &&
                    Math.abs(current.yIntercept - expected.yIntercept) < tolerance
                ) {
                    usedExpected[i] = true;
                    matched = true;
                    break;
                }
            }

            if (!matched) return false;
        }

        return true;
    }

    private parseExpectedEquations(answerField: string): Array<{ slope: number; yIntercept: number }> {
        // Parse "y=1x+2,y=-1x+4" format
        const equations = answerField.split(',');
        const parsedEquations: Array<{ slope: number; yIntercept: number }> = [];

        equations.forEach((equation) => {
            const trimmed = equation.trim();
            // Match patterns like "y=1x+2", "y=-1x+4", "y=x-3", etc.
            const match = trimmed.match(/y\s*=\s*([+-]?\d*(?:\.\d+)?)x\s*([+-]\s*\d+(?:\.\d+)?)?/);

            if (match) {
                // Parse slope
                let slope = match[1];
                if (slope === '' || slope === '+') slope = '1';
                if (slope === '-') slope = '-1';

                // Parse y-intercept
                let yIntercept = match[2] || '+0';
                yIntercept = yIntercept.replace(/\s/g, ''); // Remove spaces
                if (yIntercept === '') yIntercept = '0';
                if (yIntercept.startsWith('+')) yIntercept = yIntercept.substring(1);

                parsedEquations.push({
                    slope: parseFloat(slope),
                    yIntercept: parseFloat(yIntercept),
                });
            }
        });

        return parsedEquations;
    }

    private formatEquation(slope: number, yIntercept: number): { slope: number; yIntercept: number } {
        return { slope, yIntercept };
    }

    private getMonstersOnLine(slope: number, yIntercept: number): Phaser.GameObjects.Image[] {
        if (!this.question) return [];

        const monstersOnLine: Phaser.GameObjects.Image[] = [];

        // Parse individual monster coordinates from coordinates field
        const coordPairs: string[] = this.question.coordinates.split('),(');

        coordPairs.forEach((coordPair, index) => {
            // Clean up the coordinate string
            const cleanCoord = coordPair.replace(/[()]/g, '');
            const coords = cleanCoord.split(',');

            if (coords.length === 2) {
                const monsterX = parseFloat(coords[0].trim());
                const monsterY = parseFloat(coords[1].trim());

                // Calculate the expected Y value for this X using our equation
                const expectedY = this.calculateYFromEquation(monsterX, slope, yIntercept);

                // Check if the monster's Y coordinate matches the calculated Y
                if (Math.abs(monsterY - expectedY) < 0.001) {
                    // This monster is on the line, add it to the list
                    if (this.monsters[index]) {
                        monstersOnLine.push(this.monsters[index]);
                    }
                }
            }
        });

        // Also check intersection monster
        const intersectionCoord = this.question.coordinateIntersection.replace(/[()]/g, '');
        const intersectionCoords = intersectionCoord.split(',');

        if (intersectionCoords.length === 2) {
            const intersectionX = parseFloat(intersectionCoords[0].trim());
            const intersectionY = parseFloat(intersectionCoords[1].trim());

            // Calculate expected Y for intersection point
            const expectedY = this.calculateYFromEquation(intersectionX, slope, yIntercept);

            // Check if this line passes through the intersection point
            if (Math.abs(intersectionY - expectedY) < 0.001) {
                // Find the intersection monster (it should be the last one added)
                const intersectionMonsterIndex = this.monsters.length - 1;
                if (this.monsters[intersectionMonsterIndex]) {
                    monstersOnLine.push(this.monsters[intersectionMonsterIndex]);
                }
            }
        }

        return monstersOnLine;
    }

    private calculateYFromEquation(x: number, slope: number, yIntercept: number): number {
        return slope * x + yIntercept;
    }

    private startGameScene() {
        if (this.parentScene === 'SplashScene') {
            this.closeDoors(() => {
                this.scene.scene.stop('InstructionsScene');
                this.scene.scene.start('GameScene');
            });
        } else {
            this.scene.scene.stop('InstructionsScene');
            this.scene.scene.resume('GameScene');
            this.scene.audioManager.resumeAll();
        }
    }

    private closeDoors(onComplete: () => void) {
        const doorLeft = this.scene
            .addImage(0, this.scene.display.height / 2, COMMON_ASSETS.DOOR.KEY)
            .setOrigin(1, 0.5)
            .setDepth(100);
        const doorRight = this.scene
            .addImage(this.scene.display.width, this.scene.display.height / 2, COMMON_ASSETS.DOOR.KEY)
            .setOrigin(0, 0.5)
            .setFlipX(true)
            .setDepth(100);

        animateDoors({
            scene: this.scene,
            leftDoor: doorLeft,
            rightDoor: doorRight,
            open: false,
            duration: 1000,
            delay: 0,
            soundEffectKey: 'door_close',
            onComplete: () => {
                this.scene.audioManager.stopSoundEffect('door_close');
                onComplete();
            },
        });
    }

    private createDoors() {
        this.doorLeft = this.scene
            .addImage(this.scene.display.width / 2, this.scene.display.height / 2, COMMON_ASSETS.DOOR.KEY)
            .setOrigin(1, 0.5)
            .setDepth(100);
        this.doorRight = this.scene
            .addImage(this.scene.display.width / 2, this.scene.display.height / 2, COMMON_ASSETS.DOOR.KEY)
            .setOrigin(0, 0.5)
            .setFlipX(true)
            .setDepth(100);
    }

    private openDoors() {
        const countdownImg = this.scene
            .addImage(this.scene.display.width / 2, this.scene.display.height / 2, 'countdown_3')
            .setOrigin(0.5)
            .setDepth(100);
        countdownImg.setScale(200 / countdownImg.height);

        let count = 3;

        this.scene.audioManager.playSoundEffect('countdown');
        this.scene.time.addEvent({
            delay: 1000,
            callback: () => {
                // Announce to screen reader
                announceToScreenReader(count > 0 ? count.toString() : '');
                count--;
                if (count > 0) {
                    this.scene.audioManager.playSoundEffect('countdown');
                    countdownImg.setTexture(`countdown_${count}`);
                } else if (count === 0) {
                    countdownImg.destroy();

                    // Use animateDoors helper
                    animateDoors({
                        scene: this.scene,
                        leftDoor: this.doorLeft,
                        rightDoor: this.doorRight,
                        open: true,
                        duration: 1000,
                        delay: 0,
                        soundEffectKey: 'door_close',
                        onComplete: () => {
                            this.scene.audioManager.playBackgroundMusic('bg-music');
                            // this.gameStarted = true;
                            this.doorLeft.setVisible(false);
                            this.doorRight.setVisible(false);
                        },
                    });
                }
            },
            callbackScope: this,
            repeat: 3,
        });
    }

    private showSuccessAnimation() {
        announceToScreenReader(i18n.t('common.correctFeedback'));
        const width = this.scene.display.width;
        const height = 145;
        const successContainer = this.scene.add
            .container(
                this.scene.getScaledValue(this.scene.display.width / 2),
                this.scene.getScaledValue(this.scene.display.height + height / 2),
            )
            .setDepth(10);

        // Create background rectangle
        const bgRect = this.scene.addRectangle(0, 0, width, height, 0x1a8b29);
        successContainer.add(bgRect);

        const bgRectTop = this.scene.addRectangle(0, -height / 2, width, 8.32, 0x24e13e).setOrigin(0.5, 0);
        successContainer.add(bgRectTop);

        // Create icon and text
        const icon = this.scene.addImage(0, 0, 'correct_icon').setOrigin(0.5);
        successContainer.add(icon);

        this.scene.audioManager.playSoundEffect('positive-sfx');

        // Simple slide up animation
        this.scene.tweens.add({
            targets: successContainer,
            y: this.scene.getScaledValue(this.scene.display.height - height / 2),
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                new ImageOverlay(this.scene, icon, {
                    label: i18n.t('common.correct') + ' ' + i18n.t('common.icon'),
                });
                // Wait for a moment and then slide down
                this.scene.time.delayedCall(500, () => {
                    this.scene.tweens.add({
                        targets: successContainer,
                        y: this.scene.getScaledValue(this.scene.display.height + height / 2),
                        duration: 500,
                        ease: 'Power2',
                        onComplete: () => {
                            successContainer.destroy();
                        },
                    });
                });
            },
        });
    }

    private formatEquationString(equationString: string): string {
        // Split multiple equations by comma
        const equations = equationString.split(',');

        const formattedEquations = equations.map((equation) => {
            const trimmed = equation.trim();

            // Match pattern like "y=1x+3" or "y=-4x+5"
            const match = trimmed.match(/y\s*=\s*([+-]?\d*(?:\.\d+)?)x\s*([+-]\d+(?:\.\d+)?)/);

            if (match) {
                let slope = match[1];
                let intercept = match[2];

                // Handle slope formatting
                if (slope === '' || slope === '+') slope = '1';
                if (slope === '-') slope = '-1';

                // Handle intercept formatting - add space before + or -
                if (intercept.startsWith('+')) {
                    intercept = ' + ' + intercept.substring(1);
                } else if (intercept.startsWith('-')) {
                    intercept = ' - ' + intercept.substring(1);
                }

                return `y = ${slope}x${intercept}`;
            }

            return trimmed; // Return original if no match
        });

        return formattedEquations.join(' and ');
    }

    private showErrorAnimation(showAnswer = false) {
        announceToScreenReader(i18n.t('common.incorrectFeedback'));
        this.gridBoardErrorTint.setVisible(true);

        const width = this.scene.display.width;
        const height = 145;
        const errorContainer = this.scene.add
            .container(
                this.scene.getScaledValue(this.scene.display.width / 2),
                this.scene.getScaledValue(this.scene.display.height + height / 2),
            )
            .setDepth(10);

        // Create background rectangle
        const bgRect = this.scene.addRectangle(0, 0, width, height, 0x8b211a);
        errorContainer.add(bgRect);

        const bgRectTop = this.scene.addRectangle(0, -height / 2, width, 8.32, 0xe94338).setOrigin(0.5, 0);
        errorContainer.add(bgRectTop);

        // Create icon or answer text
        let icon: Phaser.GameObjects.Image | Phaser.GameObjects.Text;
        if (showAnswer) {
            // Show correct solution text instead of icon
            icon = this.scene
                .addText(
                    0,
                    0,
                    i18n.t('game.correctSolution', {
                        solution: this.formatEquationString(this.question?.answer || ''),
                    }),
                    {
                        font: '700 24px Exo',
                        color: '#00FF22',
                        align: 'center',
                    },
                )
                .setOrigin(0.5);
        } else {
            icon = this.scene.addImage(0, 0, 'incorrect_icon').setOrigin(0.5);
        }
        errorContainer.add(icon);

        this.scene.audioManager.playSoundEffect('negative-sfx');

        // Simple slide up animation
        this.scene.tweens.add({
            targets: errorContainer,
            y: this.scene.getScaledValue(this.scene.display.height - height / 2),
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                if (icon instanceof Phaser.GameObjects.Image) {
                    new ImageOverlay(this.scene, icon, {
                        label: i18n.t('common.incorrect') + ' ' + i18n.t('common.icon'),
                    });
                } else if (icon instanceof Phaser.GameObjects.Text) {
                    new TextOverlay(this.scene, icon, {
                        label: `Correct Solution: ${this.question?.answer}`,
                    });
                }
                // Wait for a moment and then slide down
                this.scene.time.delayedCall(showAnswer ? 2500 : 500, () => {
                    this.scene.tweens.add({
                        targets: errorContainer,
                        y: this.scene.getScaledValue(this.scene.display.height + height / 2),
                        duration: 500,
                        ease: 'Power2',
                        onComplete: () => {
                            showAnswer && this.destroyIncorrectIntercept();
                            errorContainer.destroy();
                            this.gridBoardErrorTint.setVisible(false);
                        },
                    });
                });
            },
        });
    }

    private showMascotCelebration(cb?: () => void) {
        this.scene.time.delayedCall(1000, () => {
            this.scene.scene.pause();
            this.scene.scene.launch('CelebrationScene', {
                scoreHelper: this.scoreHelper,
                progress: this.questionSelector!.getTotalQuestionsAnswered() / this.totalQuestions,
                showSuccessCheckmark: false,
                callback: () => {
                    cb?.();
                },
            });
            this.scene.scene.bringToTop('CelebrationScene');
        });
    }

    private setBehind(elements: Phaser.GameObjects.GameObject[]) {
        for (const e of elements) {
            this.behindElements.push(e);
        }

        for (const e of this.behindElements) {
            const element = e as any;
            if (element.setTint) {
                element.setAlpha(0.25);
            }
        }
    }

    private resetBehind() {
        for (const e of this.behindElements) {
            const element = e as any;
            if (element.setTint) {
                element.setAlpha(1);
            }
        }

        this.behindElements = [];
    }

    private playInstructionStep1() {
        // Set info text for step 1
        this.currentStep = 1;
        this.infoText?.setText(i18n.t('info.multi_linear_equation.step1'));
        this.infoTextOverlay?.updateContent(i18n.t('info.multi_linear_equation.step1'));

        const elementsToHide = [
            this.captureButton?.getAt(0),
            this.resetButton?.getAt(0),
            this.captureButton?.getAt(1),
            this.resetButton?.getAt(1),
            // Hide all control buttons
            ...(this.controlButtons
                ? Object.values(this.controlButtons)
                      .map((btn) => btn.getAt(0))
                      .concat(Object.values(this.controlButtons).map((btn) => btn.getAt(1)))
                : []),
            ...(this.controlButtons2
                ? Object.values(this.controlButtons2)
                      .map((btn) => btn.getAt(0))
                      .concat(Object.values(this.controlButtons2).map((btn) => btn.getAt(1)))
                : []),
        ] as Phaser.GameObjects.GameObject[];

        // Hide elements (set behind)
        this.setBehind(elementsToHide);

        // Highlight all monsters with pulse animation
        this.monsters.forEach((monster) => {
            if (monster) {
                const monsterScale = monster.scale;
                const pulseTween = this.scene.tweens.add({
                    targets: monster,
                    scale: monsterScale * 1.2,
                    duration: 1000,
                    yoyo: true,
                    ease: 'Sine.easeInOut',
                    repeat: -1,
                });
                // Store tween for cleanup
                monster.setData('pulseTween', pulseTween);
            }
        });

        // Play step_1 audio
        const step1 = this.scene.audioManager.playSoundEffect('step_1_multi_linear');
        step1?.on('complete', () => {
            // Stop all monster pulse animations
            this.monsters.forEach((monster) => {
                if (monster) {
                    const pulseTween = monster.getData('pulseTween');
                    if (pulseTween) {
                        pulseTween.stop();
                        pulseTween.destroy();
                        monster.setScale(0.6);
                    }
                }
            });

            // Wait a moment then proceed to step 2
            const timer = this.scene.time.delayedCall(1000, () => {
                // this.resetBehind();
                this.playInstructionStep2();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playInstructionStep2() {
        this.currentStep = 2;
        this.infoText?.setText(i18n.t('info.multi_linear_equation.step2'));
        this.infoTextOverlay?.updateContent(i18n.t('info.multi_linear_equation.step2'));
        // ButtonHelper.enableButton(this.resetButton);

        const step2 = this.scene.audioManager.playSoundEffect('step_2_multi_linear');
        step2?.on('complete', () => {
            // Start instruction for Line 1 (m1 = 1, b1 = 2)
            const timer = this.scene.time.delayedCall(500, () => {
                this.playInstructionStep3();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playInstructionStep3() {
        this.currentStep = 3;
        this.infoText?.setText(i18n.t('info.multi_linear_equation.step3'));
        this.infoTextOverlay?.updateContent(i18n.t('info.multi_linear_equation.step3'));
        this.resetBehind();
        const step3 = this.scene.audioManager.playSoundEffect('step_3_multi_linear');
        step3?.on('complete', () => {
            // Start instruction for Line 1 (m1 = 1, b1 = 2)
            const timer = this.scene.time.delayedCall(500, () => {
                this.playInstructionStep4();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playInstructionStep4() {
        this.currentStep = 4;
        this.infoText?.setText(i18n.t('info.multi_linear_equation.step4'));
        this.infoTextOverlay?.updateContent(i18n.t('info.multi_linear_equation.step4'));

        const step4 = this.scene.audioManager.playSoundEffect('step_4_multi_linear');
        step4?.on('complete', () => {
            // Start hand animation to guide user to set m1 = 1
            const timer = this.scene.time.delayedCall(500, () => {
                // ButtonHelper.enableButton(this.resetButton);
                if (this.controlButtons) {
                    Object.values(this.controlButtons).forEach((btn) => ButtonHelper.enableButton(btn));
                }
                this.startLine1Adjustment();
            });
            this.delayedCalls.push(timer);
        });
    }

    private startLine1Adjustment() {
        if (!this.controlButtons) return;

        // Show hand animation for m1 adjustment if not already correct
        console.log('startLine1Adjustment', this.xCord, this.yCord);
        if (this.xCord !== 1) {
            this.showHandAnimation(this.controlButtons.m1Plus);
        } else if (this.yCord !== 2) {
            this.showHandAnimation(this.controlButtons.b1Plus);
        } else {
            // Line 1 is complete, move to Line 2
            this.playInstructionStep5();
        }
    }

    private playInstructionStep5() {
        this.currentStep = 5;
        this.infoText?.setText(i18n.t('info.multi_linear_equation.step5'));
        this.infoTextOverlay?.updateContent(i18n.t('info.multi_linear_equation.step5'));
        this.stopHandAnimation();
        const step5 = this.scene.audioManager.playSoundEffect('step_5_multi_linear');
        step5?.on('complete', () => {
            // Start hand animation to guide user to set m1 = 1
            const timer = this.scene.time.delayedCall(500, () => {
                // ButtonHelper.enableButton(this.resetButton);
                if (this.controlButtons2) {
                    Object.values(this.controlButtons2).forEach((btn) => ButtonHelper.enableButton(btn));
                }
                this.startLine2Adjustment();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playInstructionStep6() {
        this.currentStep = 6;
        this.stopHandAnimation();
        this.infoText?.setText(i18n.t('info.step3'));
        this.infoTextOverlay?.updateContent(i18n.t('info.step3'));

        const step6 = this.scene.audioManager.playSoundEffect('step_6_multi_linear');
        step6?.on('complete', () => {
            // Start hand animation to guide user to set m1 = 1
            const timer = this.scene.time.delayedCall(500, () => {
                this.enableCaptureButton();
            });
            this.delayedCalls.push(timer);
        });
    }

    private startLine2Adjustment() {
        if (!this.controlButtons2) return;

        // Enable Line 2 controls
        if (this.controlButtons2) {
            Object.values(this.controlButtons2).forEach((btn) => ButtonHelper.enableButton(btn));
        }

        // Show hand animation for m2 adjustment if not already correct
        if (this.xCord2 !== -1) {
            this.showHandAnimation(this.controlButtons2.m2Minus);
        } else if (this.yCord2 !== 4) {
            this.showHandAnimation(this.controlButtons2.b2Plus);
        }
    }

    private showHandAnimation(targetButton: Phaser.GameObjects.Container) {
        if (!targetButton) return;
        // Stop any existing hand animation
        this.stopHandAnimation();

        const { centerX, centerY } = targetButton.getBounds();
        // Create hand image
        this.handImageX = this.scene
            .addImage(centerX / this.scene.display.scale + 30, centerY / this.scene.display.scale + 20, 'hand')
            .setOrigin(0.5)
            .setDepth(15)
            .setScale(0.13);

        // Animate hand clicking
        this.handClickTween = this.scene.tweens.add({
            targets: this.handImageX,
            x: this.handImageX.x,
            duration: 800,
            ease: 'Linear',
            yoyo: true,
            repeat: -1,
            onStart: () => {
                this.handImageX?.setTexture('hand');
            },
            onYoyo: () => {
                // Switch to click texture when going to "yoyo" phase
                this.handImageX?.setTexture('hand_click');
            },
            onRepeat: () => {
                // Switch back to normal hand when repeating
                this.handImageX?.setTexture('hand');
            },
        });
    }

    private enableCaptureButton() {
        // Enable capture button
        ButtonHelper.enableButton(this.captureButton!);
        // Show hand animation on capture button
        this.showHandAnimation(this.captureButton!);
    }

    private stopHandAnimation() {
        // Stop hand animation
        if (this.handClickTween) {
            this.handClickTween.stop();
            this.handClickTween.destroy();
            this.handClickTween = undefined;
        }

        // Clean up hand image
        if (this.handImageX) {
            this.handImageX.destroy();
            this.handImageX = undefined;
        }

        // Stop loop timer
        if (this.xHandLoopTimer) {
            this.xHandLoopTimer.destroy();
            this.xHandLoopTimer = undefined;
        }
    }

    private destroyInstructionTimers() {
        // Destroy all delayed calls
        this.delayedCalls.forEach((timer) => {
            if (timer) {
                timer.destroy();
            }
        });
        this.delayedCalls = [];

        // Stop the instruction loop timer
        if (this.instructionLoopTimer) {
            this.instructionLoopTimer.destroy();
            this.instructionLoopTimer = undefined;
        }

        // Stop hand loop timers
        if (this.xHandLoopTimer) {
            this.xHandLoopTimer.destroy();
            this.xHandLoopTimer = undefined;
        }

        if (this.yHandLoopTimer) {
            this.yHandLoopTimer.destroy();
            this.yHandLoopTimer = undefined;
        }

        // Stop monster pulse animation
        if (this.monsterPulseTween) {
            this.monsterPulseTween.stop();
            this.monsterPulseTween.destroy();
            this.monsterPulseTween = undefined;
        }

        // Stop hand click animation
        if (this.handClickTween) {
            this.handClickTween.stop();
            this.handClickTween.destroy();
            this.handClickTween = undefined;
        }

        // Clean up hand image
        if (this.handImageX) {
            this.handImageX.destroy();
            this.handImageX = undefined;
        }

        if (this.handImageY) {
            this.handImageY.destroy();
            this.handImageY = undefined;
        }

        // Stop any playing audio
        this.scene.audioManager.stopAllSoundEffects();
    }

    update(): void {
        // Update mute button icon
        const muteBtnItem = this.muteBtn.getAt(1) as Phaser.GameObjects.Sprite;
        if (this.scene.audioManager.getIsAllMuted()) {
            muteBtnItem.setTexture(BUTTONS.MUTE_ICON.KEY);
        } else {
            muteBtnItem.setTexture(BUTTONS.UNMUTE_ICON.KEY);
        }

        // Update mute button state
        const label = this.scene.audioManager.getIsAllMuted() ? i18n.t('common.unmute') : i18n.t('common.mute');
        const overlay = (this.muteBtn as any).buttonOverlay as ButtonOverlay;
        const muteBtnState = this.muteBtn.getData('state');
        if(muteBtnState != label) {
            this.muteBtn.setData('state', label);
            overlay.setLabel(label);
        }
    }
}
