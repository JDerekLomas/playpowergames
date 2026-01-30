import {
    announceToScreenReader,
    BaseScene,
    ButtonHelper,
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
    CustomSlider,
    ButtonOverlay,
    focusToGameContainer,
    AnalyticsHelper
} from '@k8-games/sdk';
import { ASSETS_PATHS, BUTTONS, COMMON_ASSETS } from '../config/common';
import { animateDoors } from '../utils/helper';
import { MonsterJail } from './MonsterJail';

export class FourQuadrant {
    private scene!: BaseScene;
    private gridBoard!: Phaser.GameObjects.Rectangle;
    private gridBoardErrorTint!: Phaser.GameObjects.Image;
    private xCord: number = 0;
    private yCord: number = 0;
    private xCordText!: Phaser.GameObjects.Text;
    private yCordText!: Phaser.GameObjects.Text;
    private xIntercept!: Phaser.GameObjects.Graphics;
    private yIntercept!: Phaser.GameObjects.Graphics;
    private monster!: Phaser.GameObjects.Image;
    private currentMonsterKey: string = '';
    private questionSelector?: QuestionSelectorHelper;
    private totalQuestions: number = 10;
    private isInstructionMode: boolean = false;
    private parentScene: string = 'SplashScene';

    private positionCoordinates!: Phaser.GameObjects.Text;
    private infoText?: Phaser.GameObjects.Text;
    private infoTextOverlay?: TextOverlay;
    private positionTextOverlay?: TextOverlay;

    // Score helper
    private scoreHelper: ScoreHelper;

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
    private question: Question | null = null;

    // Instruction mode state tracking
    private captureButton?: Phaser.GameObjects.Container;
    private resetButton!: Phaser.GameObjects.Container;
    private xSliderCorrect: boolean = false;
    private ySliderCorrect: boolean = false;
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

    // Store drag event handlers for cleanup
    private dragStartHandler?: (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => void;
    private dragEndHandler?: (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => void;

    // Add to class properties
    private monsterJail!: MonsterJail;

    private xSlider?: CustomSlider;
    private ySlider?: CustomSlider;

    constructor(scene: BaseScene, isInstructionMode: boolean = false, parentScene: string = 'SplashScene') {
        this.scene = scene;
        this.isInstructionMode = isInstructionMode;
        this.parentScene = parentScene;
        this.scoreHelper = new ScoreHelper(2);

        // Only initialize question selector if not in instruction mode
        if (!this.isInstructionMode) {
            const _q = getQuestionBankByName(questionBankNames.g6_t2_integers_and_coordinate);
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

        // Load countdown images
        scene.load.image('countdown_1', 'countdown_1.png');
        scene.load.image('countdown_2', 'countdown_2.png');
        scene.load.image('countdown_3', 'countdown_3.png');

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen`);
        scene.load.image('game_scene_bg', 'game_scene_bg.png');
        scene.load.image('instruction_scene_bg', 'instruction_scene_bg.png');
        scene.load.image('grid_board', 'grid_board.png');
        scene.load.image('grid_board_error', 'grid_board_error.png');
        scene.load.image('correct_icon', 'correct_icon.png');

        scene.load.image('slider_bg', 'slider_bg.png');
        scene.load.image('slider_fill_yellow', 'slider_fill_yellow.png');
        scene.load.image('slider_fill_orange', 'slider_fill_orange.png');
        scene.load.image('slider_knob_yellow', 'slider_knob_yellow.png');
        scene.load.image('slider_knob_orange', 'slider_knob_orange.png');
        scene.load.image('slider_value_bg', 'slider_value_bg.png');

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
        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/info_screen`);
        scene.load.audio('step_1', `step_1_${language}.mp3`);
        scene.load.audio('step_2', `step_2_${language}.mp3`);
        scene.load.audio('step_3', `step_3_${language}.mp3`);

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
            this.scene.addImage(327, 100, 'grid_board').setOrigin(0).setScale(0.75);
            this.gridBoard = this.scene.addRectangle(364, 158, 554, 313, 0x001317, 1).setOrigin(0);
            this.gridBoardErrorTint = this.scene
                .addImage(327, 100, 'grid_board_error')
                .setOrigin(0)
                .setScale(0.75)
                .setVisible(false);
        } else {
            this.scene.addImage(220, 88, 'grid_board').setOrigin(0);
            this.gridBoard = this.scene.addRectangle(270, 161, 742, 419, 0x001317, 1).setOrigin(0);
            this.gridBoardErrorTint = this.scene.addImage(220, 88, 'grid_board_error').setOrigin(0).setVisible(false);
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
        this.drawAxisLines();

        this.createButtons();
        this.createPositionText();

        if(this.isInstructionMode) {
            this.loadNextQuestion();
        } else {
            // delay call for countdown announcement
            this.scene.time.delayedCall(3000, () => {
                this.loadNextQuestion();
            });
        }

        if (this.isInstructionMode) {
            this.infoText = this.scene
                .addText(this.scene.display.width / 2, 560, '', {
                    font: '400 26px Exo',
                    align: 'center',
                })
                .setOrigin(0.5)
                .setDepth(5);
            this.infoTextOverlay = new TextOverlay(this.scene, this.infoText, { label: '' });
        }

        if (!this.isInstructionMode) {
            this.monsterJail = new MonsterJail(this.scene).create();
            this.openDoors();
        }

        if (!this.isInstructionMode) {
            this.scene.events.on('resume', () => {
                const sliders = [this.xSlider, this.ySlider];
                sliders.forEach((slider) => {
                    const knobOverlay = (slider as any)?.getKnobOverlay();
                    const element = (knobOverlay as any)?.domElement?.node as HTMLElement;
                    if (element) {
                        element.removeAttribute('aria-disabled');
                        element.setAttribute('tabindex', '0');
                        element.style.pointerEvents = 'auto';
                    }
                });
            });

            this.scene.events.on('pause', () => {
                const sliders = [this.xSlider, this.ySlider];
                sliders.forEach((slider) => {
                    const knobOverlay = (slider as any)?.getKnobOverlay();
                    const element = (knobOverlay as any)?.domElement?.node as HTMLElement;
                    if (element) {
                        element.setAttribute('aria-disabled', 'true');
                        element.removeAttribute('tabindex');
                        element.style.pointerEvents = 'none';
                    }
                });
            });
        }
    }

    private resetGame() {
        this.questionSelector?.reset();
        this.scoreHelper.reset();
        this.currentMonsterKey = ''; // Reset monster key for new game
    }

    private async loadNextQuestion() {
        // Focus to game container for screen readers
        focusToGameContainer();

        // Get the next question first to check if game is over
        if (this.isInstructionMode) {
            // Use static question for instruction mode
            this.question = {
                operand1: '3',
                operand2: '2',
                answer: '(3,2)',
                minX: -5,
                maxX: 5,
                xInterval: 1,
                minY: -5,
                maxY: 5,
                yInterval: 1,
            };
        } else {
            this.question = this.questionSelector?.getNextQuestion() || null;
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
        }
    }

    private loadQuestionContent() {
        this.question = {
            ...this.question!,
            minX: parseInt(this.question!.minX),
            maxX: parseInt(this.question!.maxX),
            xInterval: parseInt(this.question!.xInterval),
            minY: parseInt(this.question!.minY),
            maxY: parseInt(this.question!.maxY),
            yInterval: parseInt(this.question!.yInterval),
        };
        // console.log(this.question);

        this.positionCoordinates.setText(`(${this.question.operand1},${this.question.operand2})`);
        this.positionCoordinates.setAlpha(0);

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

        // Recreate current position text overlay for correct navigation order
        if(this.positionTextOverlay) this.positionTextOverlay.destroy();
        this.positionTextOverlay = new TextOverlay(this.scene, this.positionCoordinates, {
            label: i18n.t('common.currentPosition', { x: '0', y: '0' }),
        });

        // Show the monster at the question coordinates
        this.showMonster();

        // Create reset button
        this.createResetButton();

        // Create sliders
        this.createSlider(
            this.question.minX,
            this.question.maxX,
            this.question.minY,
            this.question.maxY,
        );

        // Create capture button
        this.createCaptureButton();

        // Initialize instruction mode state for new question
        if (this.isInstructionMode) {
            this.xSliderCorrect = false;
            this.ySliderCorrect = false;

            // Start instruction audio flow
            this.scene.time.delayedCall(1000, () => {
                this.playInstructionStep1();
            });
        }

        // Randomly hide xIntercept or yIntercept if on 6th question or above (game mode only)
        if (
            !this.isInstructionMode &&
            this.questionSelector &&
            this.questionSelector.getTotalQuestionsAnswered() + 1 >= 6
        ) {
            const hideX = Math.random() < 0.5;
            if (hideX) {
                this.xIntercept.setVisible(false);
                this.yIntercept.setVisible(true);
            } else {
                this.xIntercept.setVisible(true);
                this.yIntercept.setVisible(false);
            }
        } else {
            // Always show both for earlier questions or instruction mode
            this.xIntercept.setVisible(true);
            this.yIntercept.setVisible(true);
        }

        this.isProcessing = false;
    }

    private gameOver() {
        const finalScore = this.scoreHelper.endGame();

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
                    // Send data to ScoreBoard scene
                    this.scene.scene.start('Scoreboard', {
                        totalRounds: this.scoreHelper.getTotalQuestions(),
                        rounds: this.scoreHelper.getCorrectAnswers(),
                        score: finalScore,
                    });
                },
            });
        });
    }

    private createPositionText() {
        const positionText = this.scene
            .addText(528, 123, i18n.t('game.position'), {
                font: '700 24px Exo',
                color: '#00AEA7',
            })
            .setOrigin(0);
        this.positionTextOverlay = new TextOverlay(this.scene, positionText, {
            label: i18n.t('common.currentPosition', { x: '0', y: '0' }),
        });

        this.scene.addImage(629, 123, 'position_bg').setOrigin(0).setScale(1.4, 1.1);
        //Keep this blank until user presses capture button
        this.positionCoordinates = this.scene
            .addText(669, 140, '(0,0)', {
                font: '700 20px Exo',
                color: '#00AEA7',
            })
            .setOrigin(0.5);
    }

    private async cleanupQuestionUI(): Promise<void> {
        const animationPromises: Promise<void>[] = [];

        // Clean up grid lines
        if (this.gridLinesGraphics) {
            this.gridLinesGraphics.destroy();
        }

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

        // Clean up CustomSlider instances
        if (this.xSlider) {
            this.xSlider.destroy();
            this.xSlider = undefined;
        }
        if (this.ySlider) {
            this.ySlider.destroy();
            this.ySlider = undefined;
        }

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

        // Remove drag event listeners
        if (this.dragStartHandler) {
            this.scene.input.off('dragstart', this.dragStartHandler);
            this.dragStartHandler = undefined;
        }
        if (this.dragEndHandler) {
            this.scene.input.off('dragend', this.dragEndHandler);
            this.dragEndHandler = undefined;
        }

        // Stop slider sound
        this.scene.audioManager.stopSoundEffect('slider');

        // Reset coordinates
        this.xCord = 0;
        this.yCord = 0;

        // Update intercepts to reflect the reset coordinates
        this.updateIntercepts();

        // Reset instruction mode state
        if (this.isInstructionMode) {
            this.xSliderCorrect = false;
            this.ySliderCorrect = false;

            // Clean up instruction timers and animations
            this.destroyInstructionTimers();
        }

        // Wait for all animations to complete
        await Promise.all(animationPromises);
    }

    private showMonster() {
        if (!this.question) return;

        // Padding values (same as used in other functions)
        const xPadding = this.scene.getScaledValue(40);
        const yPadding = this.scene.getScaledValue(20);

        // Calculate the center of the grid board
        const gridCenterX = this.gridBoard.x + this.gridBoard.displayWidth / 2;
        const gridCenterY = this.gridBoard.y + this.gridBoard.displayHeight / 2;

        // Calculate scale factors using the question's min/max values
        const xScale = (this.gridBoard.displayWidth - xPadding * 2) / (this.question.maxX - this.question.minX);
        const yScale = (this.gridBoard.displayHeight - yPadding * 2) / (this.question.maxY - this.question.minY);

        // Calculate pixel position for the monster using question coordinates
        const monsterX = gridCenterX + parseInt(this.question.operand1) * xScale;
        const monsterY = gridCenterY - parseInt(this.question.operand2) * yScale; // Note: Y is inverted in screen coordinates

        // Generate a random monster key that's different from the previous one
        const monsterKey = this.getRandomMonsterKey();

        // Create and position the monster sprite
        this.monster = this.scene
            .addImage(monsterX / this.scene.display.scale, monsterY / this.scene.display.scale, monsterKey)
            .setOrigin(0.5)
            .setScale(0.6)
            .setDepth(3);
        new ImageOverlay(this.scene, this.monster, {
            label: i18n.t('common.monster', { x: this.question.operand1, y: this.question.operand2 }),
        });
        this.positionTextOverlay?.updateContent(
            i18n.t('common.currentPosition', { x: this.question.operand1, y: this.question.operand2 }),
        );

        if (!this.isInstructionMode) {
            this.monster.setScale(0);
            this.scene.tweens.add({
                targets: this.monster,
                scale: this.scene.getScaledValue(0.6),
                duration: 500,
                ease: 'Cubic.easeOut',
            });
        }
    }

    private getRandomMonsterKey(): string {
        const monsterKeys = ['monster_1', 'monster_2', 'monster_3', 'monster_4', 'monster_5'];

        // If this is the first monster or we want to ensure it's different from the previous one
        if (!this.currentMonsterKey) {
            // For the first monster, just pick a random one
            const randomIndex = Math.floor(Math.random() * monsterKeys.length);
            this.currentMonsterKey = monsterKeys[randomIndex];
            return this.currentMonsterKey;
        } else {
            // Filter out the current monster key to ensure we get a different one
            const availableKeys = monsterKeys.filter((key) => key !== this.currentMonsterKey);
            const randomIndex = Math.floor(Math.random() * availableKeys.length);
            this.currentMonsterKey = availableKeys[randomIndex];
            return this.currentMonsterKey;
        }
    }

    private drawAxisLines() {
        // Calculate the center of the grid board using the gridBoard object
        const gridCenterX = this.gridBoard.x + this.gridBoard.displayWidth / 2;
        const gridCenterY = this.gridBoard.y + this.gridBoard.displayHeight / 2;

        // Create graphics object for drawing lines
        this.axisLinesGraphics = this.scene.add.graphics();
        this.axisLinesGraphics.setDepth(1);

        // Set line style for x-axis (horizontal line)
        this.axisLinesGraphics.lineStyle(4, 0xffe100);
        this.axisLinesGraphics.beginPath();
        this.axisLinesGraphics.moveTo(this.gridBoard.x, gridCenterY); // Start from left edge of grid
        this.axisLinesGraphics.lineTo(this.gridBoard.x + this.gridBoard.displayWidth, gridCenterY); // End at right edge of grid
        this.axisLinesGraphics.strokePath();

        // Set line style for y-axis (vertical line)
        this.axisLinesGraphics.lineStyle(4, 0xff5900);
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

        // Draw X-axis markers
        for (let x = xMin; x <= xMax; x += xInterval) {
            if (x === 0) continue; // Skip origin point as it's already marked by axis intersection

            const pixelX = gridCenterX + x * xScale;
            const pixelY = gridCenterY;

            // Add text label
            const text = this.scene
                .addText(pixelX / this.scene.display.scale, pixelY / this.scene.display.scale + 20, x.toString(), {
                    font: '700 16px Exo',
                    color: '#FFE100',
                    stroke: '#001317',
                    strokeThickness: 2,
                })
                .setOrigin(0.5)
                .setDepth(1);
            new TextOverlay(this.scene, text, { label: i18n.t('common.xMarker', { x: x.toString() }) });

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

        // Draw Y-axis markers
        for (let y = yMax; y >= yMin; y -= yInterval) {
            if (y === 0) continue; // Skip origin point as it's already marked by axis intersection

            const pixelX = gridCenterX;
            const pixelY = gridCenterY - y * yScale; // Note: Y is inverted in screen coordinates

            // Add text label
            const text = this.scene
                .addText(pixelX / this.scene.display.scale - 20, pixelY / this.scene.display.scale, y.toString(), {
                    font: '700 16px Exo',
                    color: '#FF5900',
                    stroke: '#001317',
                    strokeThickness: 2,
                })
                .setOrigin(1, 0.5);
            new TextOverlay(this.scene, text, { label: i18n.t('common.yMarker', { y: y.toString() }) });

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

    private createSlider(xMin: number, xMax: number, yMin: number, yMax: number) {
        this.xCordText = this.scene
            .addText(271, 648, this.formatCoordinateVariable(i18n.t('game.xCoordinate')), {
                font: '700 24px Exo',
                color: '#FFE100',
            })
            .setOrigin(0);
        new TextOverlay(this.scene, this.xCordText, { label: i18n.t('game.xCoordinate') });
        this.markerTexts.push(this.xCordText);

        // Create X slider with CustomSlider
        this.xSlider = new CustomSlider(this.scene, {
            x: 444,
            y: 652,
            min: xMin,
            max: xMax,
            initialValue: 0,
            step: 1,
            label: i18n.t('game.xCoordinate'),
            knobLabel: i18n.t('game.xCoordinate'),
            backgroundTexture: 'slider_bg',
            fillTexture: 'slider_fill_yellow',
            knobTexture: 'slider_knob_yellow',
            valueBgTexture: 'slider_value_bg',
            textColor: '#FFE100',
            i18n: i18n,
            onChange: (value: number) => {
                this.xCord = value;
                this.updateIntercepts();

                // Check if X coordinate is correct in instruction mode
                if (this.isInstructionMode) {
                    const isXCorrect = this.checkXCoordinate();
                    if (isXCorrect && !this.xSliderCorrect) {
                        this.xSliderCorrect = true;
                        this.disableXSlider();
                        this.enableYSlider();

                        // Start Y hand animation
                        this.startYHandAnimation();
                    }
                }
            },
            onDragStart: () => {
                const sound = this.scene.audioManager.playSoundEffect('slider');
                if (sound) {
                    sound.setLoop(true);
                }
            },
            onDragEnd: () => {
                this.scene.audioManager.stopSoundEffect('slider');
            },
        });

        this.yCordText = this.scene.addText(271, 707, this.formatCoordinateVariable(i18n.t('game.yCoordinate')), {
            font: '700 24px Exo',
            color: '#FF5900',
        });
        new TextOverlay(this.scene, this.yCordText, { label: i18n.t('game.yCoordinate') });
        this.markerTexts.push(this.yCordText);

        // Create Y slider with CustomSlider
        this.ySlider = new CustomSlider(this.scene, {
            x: 444,
            y: 711,
            min: yMin,
            max: yMax,
            initialValue: 0,
            step: 1,
            label: i18n.t('game.yCoordinate'),
            knobLabel: i18n.t('game.yCoordinate'),
            backgroundTexture: 'slider_bg',
            fillTexture: 'slider_fill_orange',
            knobTexture: 'slider_knob_orange',
            valueBgTexture: 'slider_value_bg',
            textColor: '#FF5900',
            i18n: i18n,
            onChange: (value: number) => {
                this.yCord = value;
                this.updateIntercepts();

                // Check if Y coordinate is correct in instruction mode
                if (this.isInstructionMode) {
                    const isYCorrect = this.checkYCoordinate();
                    if (isYCorrect && !this.ySliderCorrect) {
                        this.ySliderCorrect = true;
                        this.disableYSlider();

                        // Both X and Y are now correct, play step 3 audio
                        this.playInstructionStep3();
                    }
                }
            },
            onDragStart: () => {
                const sound = this.scene.audioManager.playSoundEffect('slider');
                if (sound) {
                    sound.setLoop(true);
                }
            },
            onDragEnd: () => {
                this.scene.audioManager.stopSoundEffect('slider');
            },
        });

        // In instruction mode, initially disable both sliders
        if (this.isInstructionMode) {
            this.disableXSlider();
            this.disableYSlider();
        }
    }

    private checkXCoordinate(): boolean {
        if (!this.question) return false;
        return this.xCord === parseInt(this.question.operand1);
    }

    private checkYCoordinate(): boolean {
        if (!this.question) return false;
        return this.yCord === parseInt(this.question.operand2);
    }

    private enableYSlider() {
        if (this.ySlider) {
            this.ySlider.setEnabled(true);
        }
    }

    private disableYSlider() {
        if (this.ySlider) {
            this.ySlider.setEnabled(false);
            // Stop slider sound when disabling
            this.scene.audioManager.stopSoundEffect('slider');
        }
    }

    private disableXSlider() {
        if (this.xSlider) {
            this.xSlider.setEnabled(false);
            // Stop slider sound when disabling
            this.scene.audioManager.stopSoundEffect('slider');
        }
    }

    private createIntercepts() {
        // Create graphics objects for intercept lines
        this.xIntercept = this.scene.add.graphics();
        this.yIntercept = this.scene.add.graphics();

        // Set line style for both intercepts
        this.xIntercept.lineStyle(4, 0x00ffe6); // #00FFE6 color, 4px width
        this.yIntercept.lineStyle(4, 0x00ffe6); // #00FFE6 color, 4px width

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
        this.xIntercept?.clear();
        this.yIntercept?.clear();

        // Set line style again after clearing
        this.xIntercept.lineStyle(4, 0x00ffe6).setDepth(2);
        this.yIntercept.lineStyle(4, 0x00ffe6).setDepth(2);

        // Draw X intercept (vertical line at xCord)
        const xPixel = gridCenterX + this.xCord * xScale;
        this.xIntercept.beginPath();
        this.xIntercept.moveTo(xPixel, this.gridBoard.y);
        this.xIntercept.lineTo(xPixel, this.gridBoard.y + this.gridBoard.height);
        this.xIntercept.strokePath();

        // Draw Y intercept (horizontal line at yCord)
        const yPixel = gridCenterY - this.yCord * yScale; // Note: Y is inverted in screen coordinates
        this.yIntercept.beginPath();
        this.yIntercept.moveTo(this.gridBoard.x, yPixel);
        this.yIntercept.lineTo(this.gridBoard.x + this.gridBoard.width, yPixel);
        this.yIntercept.strokePath();

        this.updateMonsterSelectionVisuals();
    }

    private updateMonsterSelectionVisuals() {
        if (!this.question) return;
        const isCorrect =
            this.xCord === parseInt(this.question.operand1) && this.yCord === parseInt(this.question.operand2);

        if (
            !!this.monster &&
            this.monster.scene &&
            this.monster.active &&
            this.monster.texture &&
            typeof this.monster.setTexture === 'function'
        ) {
            // Get the base key (remove '_select' if it exists)
            let baseKey = this.monster.texture.key;
            if (baseKey.endsWith('_select')) {
                baseKey = baseKey.replace('_select', '');
            }
            const selectKey = `${baseKey}_select`;

            if (isCorrect) {
                // Show selected version when coordinates are correct
                if (this.monster.texture.key !== selectKey) {
                    this.monster.setTexture(selectKey);
                }
            } else {
                // Show normal version when coordinates are incorrect
                if (this.monster.texture.key !== baseKey) {
                    this.monster.setTexture(baseKey);
                }
            }
        }
    }

    private resetMonsterSelectionVisuals() {
        if (
            !!this.monster &&
            this.monster.scene &&
            this.monster.active &&
            this.monster.texture &&
            typeof this.monster.setTexture === 'function'
        ) {
            // Get the base key (remove '_select' if it exists)
            let baseKey = this.monster.texture.key;
            if (baseKey.endsWith('_select')) {
                baseKey = baseKey.replace('_select', '');
            }

            // Only change texture if it's currently showing the selected version
            if (this.monster.texture.key !== baseKey) {
                this.monster.setTexture(baseKey);
            }
        }
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
        const volumeSliderBtn = ButtonHelper.createIconButton({
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
                if (!this.volumeSlider.isOpen()) {
                    const overlay = (volumeSliderBtn as any).buttonOverlay;
                    overlay?.focus();
                }
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
                    this.scene.scene.launch('InstructionsScene', { parentScene: 'GameScene' });
                    this.scene.scene.bringToTop('InstructionsScene');
                },
            });
        }
    }

    private createCaptureButton() {
        if(this.captureButton) {
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
            x: 1154,
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
        if(this.resetButton) {
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
        // Reset coordinates to 0,0
        this.xCord = 0;
        this.yCord = 0;

        // Reset instruction mode state
        if (this.isInstructionMode) {
            this.xSliderCorrect = false;
            this.ySliderCorrect = false;
        }

        // Reset slider values using CustomSlider methods
        if (this.xSlider) {
            this.xSlider.setValue(0);
        }
        if (this.ySlider) {
            this.ySlider.setValue(0);
        }

        // Update intercepts to show at 0,0
        this.updateIntercepts();

        // Handle instruction mode hand animations
        if (this.isInstructionMode) {
            // Check if step 1 is over (X slider was previously correct)
            // We can determine this by checking if Y hand animation is running
            if (this.yHandLoopTimer) {
                // Step 1 is over, restart X hand animation and stop Y hand animation
                this.stopYHandAnimation();
                this.startXHandAnimation();

                // Re-enable X slider and disable Y slider
                if (this.xSlider) {
                    this.xSlider.setEnabled(true);
                }
                this.disableYSlider();
            }
        }
    }

    private checkAnswer() {
        if (!this.question) return;
        if (this.isProcessing) return;

        this.resetMonsterSelectionVisuals();
        // Show actual coordinates when capture button is pressed
        this.scene.tweens.add({
            targets: this.positionCoordinates,
            alpha: 1,
            duration: 300,
            ease: 'Power2.easeOut',
        });

        const isCorrect =
            this.xCord === parseInt(this.question.operand1) && this.yCord === parseInt(this.question.operand2);

        if (isCorrect) {
            console.log('correct');
            this.isProcessing = true;

            if (this.isInstructionMode) {
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
                    questionText: `Locate ${this.question.answer}`,
                    isCorrect: true,
                    questionMechanic: 'default',
                    gameLevelInfo: 'game.grid_lock.default',
                    studentResponse: `(${this.xCord}, ${this.yCord})`,
                    studentResponseAccuracyPercentage: '100%',
                });

                // Normal game mode
                this.scoreHelper.answerCorrectly();
                this.questionSelector?.answerCorrectly();
                this.scoreCoins?.updateScoreDisplay(true);
                this.monsterJail.animateMonsterToJail([this.monster], () => {
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
            }
        } else {
            console.log('wrong');
            this.isProcessing = true;

            if (!this.isInstructionMode) {
                this.analyticsHelper?.createTrial({
                    questionMaxPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                    achievedPoints: 0,
                    questionText: `Locate ${this.question.answer}`,
                    isCorrect: false,
                    questionMechanic: 'default',
                    gameLevelInfo: 'game.grid_lock.default',
                    studentResponse: `(${this.xCord}, ${this.yCord})`,
                    studentResponseAccuracyPercentage: '0%',
                });
                
                // Only update score and progress in game mode
                this.scoreHelper.answerIncorrectly();
                this.questionSelector?.answerIncorrectly(this.question);
                this.scoreCoins?.updateScoreDisplay(false);

                // Update progress bar
                const progress = this.questionSelector!.getTotalQuestionsAnswered() / this.totalQuestions;
                this.progressBar?.drawProgressFill(progress, this.scoreHelper.getCurrentStreak());

                this.showErrorAnimation();

                this.scene.time.delayedCall(1000, () => {
                    this.loadNextQuestion();
                });
            } else {
                this.scene.tweens.add({
                    targets: this.positionCoordinates,
                    alpha: 0,
                    duration: 300,
                    ease: 'Power2.easeOut',
                });
            }
            // In instruction mode, do nothing for incorrect answers (button shouldn't be clickable anyway)
        }
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
                new ImageOverlay(this.scene, icon, { label: i18n.t('common.correct') + ' ' + i18n.t('common.icon') });
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

    private showErrorAnimation() {
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

        // Create icon and text
        const icon = this.scene.addImage(0, 0, 'incorrect_icon').setOrigin(0.5);
        errorContainer.add(icon);

        this.scene.audioManager.playSoundEffect('negative-sfx');

        // Simple slide up animation
        this.scene.tweens.add({
            targets: errorContainer,
            y: this.scene.getScaledValue(this.scene.display.height - height / 2),
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                new ImageOverlay(this.scene, icon, { label: i18n.t('common.incorrect') + ' ' + i18n.t('common.icon') });
                // Wait for a moment and then slide down
                this.scene.time.delayedCall(500, () => {
                    this.scene.tweens.add({
                        targets: errorContainer,
                        y: this.scene.getScaledValue(this.scene.display.height + height / 2),
                        duration: 500,
                        ease: 'Power2',
                        onComplete: () => {
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

    // Instruction mode audio methods
    private playInstructionStep1() {
        const step1 = this.scene.audioManager.playSoundEffect('step_1');

        this.infoText?.setText(i18n.t('info.step1'));
        this.infoTextOverlay?.updateContent(i18n.t('info.step1'));

        const sliderContainers = [this.xSlider?.getContainer(), this.ySlider?.getContainer()].filter(
            Boolean,
        ) as Phaser.GameObjects.GameObject[];

        const elements = [
            this.captureButton?.getAt(0),
            this.resetButton?.getAt(0),
            this.captureButton?.getAt(1),
            this.resetButton?.getAt(1),
            ...sliderContainers,
            this.xCordText,
            this.yCordText,
        ] as Phaser.GameObjects.GameObject[];
        this.setBehind(elements);

        // Disable both sliders during step 1
        this.disableXSlider();
        this.disableYSlider();

        // Start monster pulse animation
        if (this.monster) {
            const monsterScale = this.monster.scale;
            this.monsterPulseTween = this.scene.tweens.add({
                targets: this.monster,
                scale: monsterScale * 1.2,
                duration: 1000,
                yoyo: true,
                ease: 'Sine.easeInOut',
                repeat: -1,
            });
        }

        step1?.on('complete', () => {
            // Stop monster pulse animation
            if (this.monsterPulseTween) {
                this.monster.setScale(0.6);
                this.monsterPulseTween.stop();
                this.monsterPulseTween.destroy();
                this.monsterPulseTween = undefined;
            }

            const timer = this.scene.time.delayedCall(1000, () => {
                this.resetBehind();
                this.playInstructionStep2();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playInstructionStep2() {
        const step2 = this.scene.audioManager.playSoundEffect('step_2');

        ButtonHelper.enableButton(this.resetButton);
        const elements = [
            this.captureButton?.getAt(0),
            this.captureButton?.getAt(1),
        ] as Phaser.GameObjects.GameObject[];

        this.setBehind(elements);

        this.infoText?.setText(i18n.t('info.step2'));
        this.infoTextOverlay?.updateContent(i18n.t('info.step2'));

        // Keep both sliders disabled during step 2 audio
        this.disableXSlider();
        this.disableYSlider();

        step2?.on('complete', () => {
            this.resetBehind();

            // Step 2 audio is complete, now enable X slider only
            if (this.xSlider) {
                this.xSlider.setEnabled(true);
            }

            // Keep Y slider disabled
            this.disableYSlider();

            // Start X hand animation
            this.startXHandAnimation();
        });
    }

    private startXHandAnimation() {
        if (!this.question) return;

        const elements = [
            this.captureButton?.getAt(0),
            this.captureButton?.getAt(1),
        ] as Phaser.GameObjects.GameObject[];

        this.setBehind(elements);

        // Clear any existing loop timer
        if (this.xHandLoopTimer) {
            this.xHandLoopTimer.destroy();
            this.xHandLoopTimer = undefined;
        }

        // Start the loop timer that repeats every 3 seconds
        this.xHandLoopTimer = this.scene.time.addEvent({
            delay: 5000,
            callback: () => {
                // Only continue if X slider is not yet correct
                if (!this.xSliderCorrect) {
                    this.performXHandAnimation();
                }
            },
            callbackScope: this,
            loop: true,
        });

        // Perform the first animation immediately
        this.performXHandAnimation();
    }

    private performXHandAnimation() {
        if (!this.question || !this.xSlider) return;

        // Clean up any existing hand image
        if (this.handImageX) {
            this.handImageX.destroy();
            this.handImageX = undefined;
        }

        const targetX = parseInt(this.question.operand1);

        // Calculate start position (0) and target position (correct X value)
        const startProgress = (0 - this.question.minX) / (this.question.maxX - this.question.minX);
        const targetProgress = (targetX - this.question.minX) / (this.question.maxX - this.question.minX);

        // Use CustomSlider configuration to calculate positions
        const sliderStartX = 500; // From slider config
        const sliderWidth = 308; // Default slider width

        const startX = sliderStartX + startProgress * sliderWidth;
        const targetXPos = sliderStartX + targetProgress * sliderWidth;

        const handWidth = 20;
        // Create hand at start position (unscaled coordinates)
        this.handImageX = this.scene
            .addImage(
                startX + handWidth,
                652 + 20, // Y position from slider config
                'hand_click',
            )
            .setOrigin(0.5)
            .setScale(0.13)
            .setDepth(10);

        // Move hand to target position
        this.scene.tweens.add({
            targets: this.handImageX,
            x: this.scene.getScaledValue(targetXPos + handWidth),
            duration: 1500,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                // Wait a moment then hide hand
                this.scene.time.delayedCall(500, () => {
                    if (this.handImageX) {
                        this.handImageX.destroy();
                        this.handImageX = undefined;
                    }
                });
            },
        });
    }

    private startYHandAnimation() {
        if (!this.question) return;

        // Clear any existing loop timer
        if (this.yHandLoopTimer) {
            this.yHandLoopTimer.destroy();
            this.yHandLoopTimer = undefined;
        }

        // Start the loop timer that repeats every 3 seconds
        this.yHandLoopTimer = this.scene.time.addEvent({
            delay: 5000,
            callback: () => {
                // Only continue if Y slider is not yet correct
                if (!this.ySliderCorrect) {
                    this.performYHandAnimation();
                }
            },
            callbackScope: this,
            loop: true,
        });

        // Perform the first animation immediately
        this.performYHandAnimation();
    }

    private stopYHandAnimation() {
        // Stop Y hand loop timer
        if (this.yHandLoopTimer) {
            this.yHandLoopTimer.destroy();
            this.yHandLoopTimer = undefined;
        }

        // Clean up Y hand image
        if (this.handImageY) {
            this.handImageY.destroy();
            this.handImageY = undefined;
        }
    }

    private performYHandAnimation() {
        if (!this.question || !this.ySlider) return;

        // Clean up any existing hand images
        if (this.handImageX) {
            this.handImageX.destroy();
            this.handImageX = undefined;
        }

        if (this.handImageY) {
            this.handImageY.destroy();
            this.handImageY = undefined;
        }

        const targetY = parseInt(this.question.operand2);

        // Calculate start position (0) and target position (correct Y value)
        const startProgress = (0 - this.question.minY) / (this.question.maxY - this.question.minY);
        const targetProgress = (targetY - this.question.minY) / (this.question.maxY - this.question.minY);

        // Use CustomSlider configuration to calculate positions
        const sliderStartX = 500; // From slider config
        const sliderWidth = 308; // Default slider width

        const startX = sliderStartX + startProgress * sliderWidth;
        const targetXPos = sliderStartX + targetProgress * sliderWidth;

        const handWidth = 20;
        // Create hand at start position (unscaled coordinates)
        this.handImageY = this.scene
            .addImage(
                startX + handWidth,
                711 + 20, // Y position from Y slider config
                'hand_click',
            )
            .setOrigin(0.5)
            .setScale(0.13)
            .setDepth(10);

        // Move hand to target position
        this.scene.tweens.add({
            targets: this.handImageY,
            x: this.scene.getScaledValue(targetXPos + handWidth),
            duration: 1500,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                // Wait a moment then hide hand
                this.scene.time.delayedCall(500, () => {
                    if (this.handImageY) {
                        this.handImageY.destroy();
                        this.handImageY = undefined;
                    }
                });
            },
        });
    }

    private playInstructionStep3() {
        ButtonHelper.disableButton(this.resetButton);

        this.resetBehind();

        const elements = [this.resetButton?.getAt(0), this.resetButton?.getAt(1)] as Phaser.GameObjects.GameObject[];
        this.setBehind(elements);

        this.infoText?.setText(i18n.t('info.step3'));
        this.infoTextOverlay?.updateContent(i18n.t('info.step3'));

        if (this.handImageY) {
            this.handImageY.destroy();
            this.handImageY = undefined;
        }

        this.scene.audioManager.playSoundEffect('step_3');
        if (this.captureButton) {
            ButtonHelper.enableButton(this.captureButton);

            ButtonHelper.startBreathingAnimation(this.captureButton, { moveUpAmount: 10 });
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

    private formatCoordinateVariable(word: string): string {
        return word.replace(/x/g, '𝑥').replace(/y/g, '𝑦');
    }
}
