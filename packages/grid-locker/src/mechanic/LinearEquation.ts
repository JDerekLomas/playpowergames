import { announceToScreenReader, CustomSlider, BaseScene, ButtonHelper, getQuestionBankByName, i18n, ImageOverlay, ProgressBar, Question, questionBankNames, QuestionSelectorHelper, ScoreCoins, ScoreHelper, TextOverlay, VolumeSlider, ButtonOverlay, focusToGameContainer, AnalyticsHelper } from '@k8-games/sdk';
import { ASSETS_PATHS, BUTTONS, COMMON_ASSETS } from '../config/common';
import { animateDoors } from '../utils/helper';
import { MonsterJail } from './MonsterJail';

export class LinearEquation {
    private scene!: BaseScene;
    private gridBoard!: Phaser.GameObjects.Rectangle;
    private gridBoardErrorTint!: Phaser.GameObjects.Image;
    private xCord: number = 0;
    private yCord: number = 0;
    // private xCordText!: Phaser.GameObjects.Text[];
    private yCordText!: Phaser.GameObjects.Text[];
    private intercept!: Phaser.GameObjects.Graphics;
    private shadowIntercept!: Phaser.GameObjects.Graphics;
    private monster!: Phaser.GameObjects.Image;
    private monsters: Phaser.GameObjects.Image[] = [];
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

    // CustomSlider instances
    private xSlider?: CustomSlider; // Slope slider (m)
    private ySlider?: CustomSlider; // Y-intercept slider (b)

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

    private maxChances: number = 3;
    private remainingChances: number = 3;
    private isInterceptRed = false;
    private chancesContainer?: Phaser.GameObjects.Container;

    constructor(scene: BaseScene, isInstructionMode: boolean = false, parentScene: string = 'SplashScene') {
        this.scene = scene;
        this.isInstructionMode = isInstructionMode;
        this.parentScene = parentScene;
        this.scoreHelper = new ScoreHelper(2);
        
        // Only initialize question selector if not in instruction mode
        if (!this.isInstructionMode) {
            const _q = getQuestionBankByName(questionBankNames.g8_t2_linear_equation);
            if (_q) {
                this.questionSelector = new QuestionSelectorHelper(_q, this.totalQuestions)
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

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen`);
        scene.load.image('game_scene_bg', 'game_scene_bg.png');
        scene.load.image('instruction_scene_bg', 'instruction_scene_bg.png');
        scene.load.image('grid_board', 'grid_board.png');
        scene.load.image('grid_board_error', 'grid_board_error.png');
        scene.load.image('correct_icon', 'correct_icon.png');

        scene.load.image('slider_bg', 'slider_bg.png');
        scene.load.image('slider_fill_blue', 'slider_fill_blue.png');
        scene.load.image('slider_fill_orange', 'slider_fill_orange.png');
        scene.load.image('slider_knob_blue', 'slider_knob_blue.png');
        scene.load.image('slider_knob_orange', 'slider_knob_orange.png');
        scene.load.image('slider_value_bg', 'slider_value_bg.png');

        scene.load.image('capture_btn', 'capture_btn.png');
        scene.load.image('capture_btn_hover', 'capture_btn_hover.png');
        scene.load.image('capture_btn_pressed', 'capture_btn_pressed.png');
        scene.load.image('capture_btn_continue', 'capture_btn_continue.png');
        scene.load.image('capture_btn_continue_hover', 'capture_btn_continue_hover.png');
        scene.load.image('capture_btn_continue_pressed', 'capture_btn_continue_pressed.png');
        scene.load.image('information_icon', 'information_icon.png');
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
        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/info_screen/linear_equation`);
        scene.load.audio('step_1_linear', `step_1_${language}.mp3`);
        scene.load.audio('step_2_linear', `step_2_${language}.mp3`);
        scene.load.audio('step_3_linear', `step_3_${language}.mp3`);
        scene.load.audio('step_4_linear', `step_4_${language}.mp3`);

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
        this.scene.addImage(this.scene.display.width / 2, this.scene.display.height / 2, this.isInstructionMode ? 'instruction_scene_bg' : 'game_scene_bg').setOrigin(0.5);

        if (this.isInstructionMode) {
            this.scene.addImage(327, 100, 'grid_board').setOrigin(0).setScale(0.75);
            this.gridBoard = this.scene.addRectangle(364, 128, 554, 313, 0x001317, 1).setOrigin(0);
            this.gridBoardErrorTint = this.scene.addImage(327, 100, 'grid_board_error').setOrigin(0).setScale(0.75).setVisible(false);
        } else {
            this.scene.addImage(220, 88, 'grid_board').setOrigin(0);
            this.gridBoard = this.scene.addRectangle(270, 130, 742, 419, 0x001317, 1).setOrigin(0);
            this.gridBoardErrorTint = this.scene.addImage(220, 88, 'grid_board_error').setOrigin(0).setVisible(false);
        }

        this.scene.audioManager.initialize(this.scene);

        // Create and position the capture container

        // Only create progress bar and score coins if not in instruction mode
        if (!this.isInstructionMode) {
            this.createChancesContainer();
            // Create score coins
            this.scoreCoins = new ScoreCoins(this.scene, this.scoreHelper, i18n, 'purple');
            this.scoreCoins.create(
                this.scene.getScaledValue(87),
                this.scene.getScaledValue(58)
            );
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
        this.createPositionText();

        this.loadNextQuestion();

        if (this.isInstructionMode) {
            this.infoText = this.scene.addText(this.scene.display.width / 2, 560, '', {
                font: '400 26px Exo',
                align: 'center'
            }).setOrigin(0.5).setDepth(5);
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

    private updateMonsterSelectionVisuals() {
        if (!this.question) return;
        const monstersOnLine = this.getMonstersOnLine(this.xCord, this.yCord);

        this.monsters
            .filter((monster): monster is Phaser.GameObjects.Image =>
                !!monster && monster.scene && monster.active && monster.texture && typeof monster.setTexture === 'function'
            )
            .forEach((monster) => {
                let baseKey = monster.texture.key;
                if (baseKey.endsWith('_select')) {
                    baseKey = baseKey.replace('_select', '');
                }
                const selectKey = `${baseKey}_select`;

                if (monstersOnLine.includes(monster)) {
                    if (monster.texture.key !== selectKey) {
                        monster.setTexture(selectKey);
                        // Play pulse animation ONCE
                        this.scene.tweens.add({
                            targets: monster,
                            scale: monster.scale * 1.2,
                            duration: 200,
                            yoyo: true,
                            repeat: 0,
                            ease: 'Sine.easeInOut',
                            onComplete: () => {
                                monster.setScale(0.6); // Reset to original scale
                            }
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
        .filter((monster): monster is Phaser.GameObjects.Image =>
            !!monster && monster.scene && monster.active && monster.texture && typeof monster.setTexture === 'function'
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

    private async loadNextQuestion() {
        this.resetChances();
        // Get the next question first to check if game is over
        if (this.isInstructionMode) {
            // Use static question for instruction mode
            this.question = {
                equation: 'y = 1x + 1',
                operand1: '-2', // slope
                operand2: '-1', // y-intercept
                monsterCoordinates: '(0,1),(2,3)',
                answer: '2',
                minX: -5,
                maxX: 5,
                xInterval: 1,
                minY: -5,
                maxY: 5,
                yInterval: 1,
                slopeMin: -5,
                slopeMax: 5,
                slopeStep: 1,
                yInterceptMin: -5,
                yInterceptMax: 5,
                yInterceptStep: 1
            };
        } else {
            this.createChancesContainer();
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
            this.intercept.setVisible(false);
            this.updateIntercepts(1);
        }
    }

    private loadQuestionContent() {
        // Focus to game container for screen readers
        focusToGameContainer();

        this.question = {
            ...this.question!,
            minX: parseInt(this.question!.minX),
            maxX: parseInt(this.question!.maxX),
            xInterval: parseFloat(this.question!.xInterval),
            minY: parseInt(this.question!.minY),
            maxY: parseInt(this.question!.maxY),
            yInterval: parseFloat(this.question!.yInterval),
        }

        this.updateEquationDisplay();
        
        this.positionCoordinates.setAlpha(1);
        
        // Draw grid lines
        this.drawGridLines(this.question.minX, this.question.maxX, this.question.xInterval, this.question.minY, this.question.maxY, this.question.yInterval);

        // Draw coordinate markers
        this.drawMarkers(this.question.minX, this.question.maxX, this.question.xInterval, this.question.minY, this.question.maxY, this.question.yInterval);

        // Show the monster at the question coordinates
        this.showMonster();

        // Create reset button
        this.createResetButton();

        // Create sliders
        this.createSlider(this.question.xInterval, this.question.yInterval);

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

        this.isProcessing = false;
    }

    private gameOver() {
        this.isInterceptRed = false;
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
                        score: finalScore
                    });
                }
            });
        });
    }

    private createPositionText() {
        //Keep this blank until user presses capture button
        this.positionCoordinates = this.scene.addText(639, 575, 'y = 1x + 0', {
            font: '700 20px Exo',
            color: '#00AEA7'
        }).setOrigin(0.5);

        // Initialize equation display
        this.updateEquationDisplay();
    }

    private updateEquationDisplay() {
        if (!this.positionCoordinates) return;
        
        if(this.isInstructionMode) {

            this.positionCoordinates.setY(this.scene.getScaledValue(465));
        } else {
            this.positionCoordinates.setY(this.scene.getScaledValue(575));
        }
        
        const slope = this.xCord;
        const yIntercept = this.yCord;
        
        let equationText = 'y = ';
        
        // Always display the coefficient, even if it's 0
        equationText += `${slope}x`;
        
        // Always add y-intercept in the proper format
        if (yIntercept > 0) {
            equationText += ` + ${yIntercept}`;
        } else if (yIntercept < 0) {
            equationText += ` - ${Math.abs(yIntercept)}`;
        } else {
            // When y-intercept is 0, add + 0 to show the full form
            equationText += ` + 0`;
        }
        
        this.positionCoordinates.setText(equationText);
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
            this.markerTexts.forEach(text => {
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
                            }
                        });
                    });
                    animationPromises.push(promise);
                }
            });
        } else {
            // In instruction mode, destroy markers immediately
            this.markerTexts.forEach(text => {
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
                            }
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

        // Clear any existing monsters first
        this.destroyMonsters();

        // Parse monster coordinates from monsterCoordinates field
        // Handle format like "(1,1),(2,3),(3,5)"
        const coordPairs: string[] = this.question.monsterCoordinates.split('),(');
        coordPairs.forEach((coordPair, index) => {
            // Clean up the coordinate string
            const cleanCoord = coordPair.replace(/[()]/g, '');
            const coords = cleanCoord.split(',');
            
            if (coords.length === 2) {
                const monsterX = parseFloat(coords[0].trim());
                const monsterY = parseFloat(coords[1].trim());
                
                // Create monster at this coordinate
                const monster = this.createMonsterAt(monsterX, monsterY, index + 1);
                if (monster) {
                    this.monsters.push(monster);
                    
                    // Set the first monster as the main monster for backward compatibility
                    if (index === 0) {
                        this.monster = monster;
                    }
                }
            }
        });

        // Update position text overlay to show the first monster's position
        if (this.monsters.length > 0) {
            // You'll need to store the coordinates or calculate them back from position
            const coords = this.question.monsterCoordinates.split('),(')[0].replace(/[()]/g, '').split(',');
            const x = coords[0].trim();
            const y = coords[1].trim();
            this.positionTextOverlay?.updateContent(i18n.t('common.currentPosition', { x, y }));
        }
    }

    private createMonsterAt(monsterX: number, monsterY: number, index: number): Phaser.GameObjects.Image | null {
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
        
        const monsterPixelX = gridCenterX + (monsterX * xScale);
        const monsterPixelY = gridCenterY - (monsterY * yScale);

        // Generate a random monster key that's different from the previous one
        const monsterKey = this.getRandomMonsterKey();
        
        // Create and position the monster sprite
        const monster = this.scene.addImage(monsterPixelX / this.scene.display.scale, monsterPixelY / this.scene.display.scale, monsterKey).setOrigin(0.5).setScale(0.6).setDepth(3);
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
            });
        }

        return monster;
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
            const availableKeys = monsterKeys.filter(key => key !== this.currentMonsterKey);
            const randomIndex = Math.floor(Math.random() * availableKeys.length);
            this.currentMonsterKey = availableKeys[randomIndex];
            return this.currentMonsterKey;
        }
    }

    private destroyMonsters() {
        this.monsters.forEach(monster => {
            if (monster && monster.scene) { // Check if monster still exists
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
        this.axisLinesGraphics.lineStyle(4, 0xFFE100);
        this.axisLinesGraphics.beginPath();
        this.axisLinesGraphics.moveTo(this.gridBoard.x, gridCenterY); // Start from left edge of grid
        this.axisLinesGraphics.lineTo(this.gridBoard.x + this.gridBoard.displayWidth, gridCenterY); // End at right edge of grid
        this.axisLinesGraphics.strokePath();
        
        // Set line style for y-axis (vertical line)
        this.axisLinesGraphics.lineStyle(4, 0xFF5900);
        this.axisLinesGraphics.beginPath();
        this.axisLinesGraphics.moveTo(gridCenterX, this.gridBoard.y); // Start from top edge of grid
        this.axisLinesGraphics.lineTo(gridCenterX, this.gridBoard.y + this.gridBoard.displayHeight); // End at bottom edge of grid
        this.axisLinesGraphics.strokePath();
    }

    private drawMarkers(
        xMin: number, 
        xMax: number, 
        xInterval: number, 
        yMin: number, 
        yMax: number, 
        yInterval: number
    ) {
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
        const leftXLabel = this.scene.addText(
            (this.gridBoard.x + xLabelOffset) / this.scene.display.scale, 
            gridCenterY / this.scene.display.scale,
            '𝑥',
            {
                fontFamily: 'Exo',
                fontSize: '18px',
                fontStyle: 'italic',
                color: '#FFE100',
                stroke: '#001317',
                strokeThickness: 2,
            }
        ).setOrigin(1, 1).setDepth(1);
        new TextOverlay(this.scene, leftXLabel, { label: i18n.t('common.xAxisLabel') });
        this.markerTexts.push(leftXLabel);
        
        // Draw X-axis markers
        for (let x = xMin; x <= xMax; x += xInterval) {
            if (x === 0) continue; // Skip origin point as it's already marked by axis intersection
            
            const pixelX = gridCenterX + (x * xScale);
            const pixelY = gridCenterY;
            
            // Add text label
            const text = this.scene.addText(pixelX / this.scene.display.scale, (pixelY / this.scene.display.scale) + 20, x.toString(), {
                font: '700 16px Exo',
                color: '#FFE100',
                stroke: '#001317',
                strokeThickness: 2,
            }).setOrigin(0.5).setDepth(1);
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

        // Right end of X-axis
        const rightXLabel = this.scene.addText(
            (this.gridBoard.x + this.gridBoard.displayWidth - xLabelOffset) / this.scene.display.scale, 
            gridCenterY / this.scene.display.scale,
            '𝑥',
            {
                fontFamily: 'Exo',
                fontSize: '18px',
                fontStyle: 'italic',
                color: '#FFE100',
                stroke: '#001317',
                strokeThickness: 2,
            }
        ).setOrigin(0, 1).setDepth(1);
        new TextOverlay(this.scene, rightXLabel, { label: i18n.t('common.xAxisLabel') });
        this.markerTexts.push(rightXLabel);
        
        // Y-axis labels (at both ends of vertical line)
        // Bottom end of Y-axis
        const bottomYLabel = this.scene.addText(
            gridCenterX / this.scene.display.scale + 5, 
            (this.gridBoard.y + this.gridBoard.displayHeight - yLabelOffset) / this.scene.display.scale,
            '𝑦',
            {
                fontFamily: 'Exo',
                fontSize: '18px',
                fontStyle: 'italic',
                color: '#FF5900',
                stroke: '#001317',
                strokeThickness: 2,
            }
        ).setOrigin(0, 0).setDepth(1);
        new TextOverlay(this.scene, bottomYLabel, { label: i18n.t('common.yAxisLabel') });
        this.markerTexts.push(bottomYLabel);
        
        // Draw Y-axis markers
        for (let y = yMax; y >= yMin; y -= yInterval) {
            if (y === 0) continue; // Skip origin point as it's already marked by axis intersection
            
            const pixelX = gridCenterX;
            const pixelY = gridCenterY - (y * yScale); // Note: Y is inverted in screen coordinates
            
            // Add text label
            const text = this.scene.addText((pixelX / this.scene.display.scale) - 20, (pixelY / this.scene.display.scale), y.toString(), {
                font: '700 16px Exo',
                color: '#FF5900',
                stroke: '#001317',
                strokeThickness: 2,
            }).setOrigin(1, 0.5);
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

        // Top end of Y-axis
        const topYLabel = this.scene.addText(
            gridCenterX / this.scene.display.scale + 5, 
            (this.gridBoard.y + yLabelOffset) / this.scene.display.scale,
            '𝑦',
            {
                fontFamily: 'Exo',
                fontSize: '18px',
                fontStyle: 'italic',
                color: '#FF5900',
                stroke: '#001317',
                strokeThickness: 2,
            }
        ).setOrigin(0, 1).setDepth(1);
        new TextOverlay(this.scene, topYLabel, { label: i18n.t('common.yAxisLabel') });
        this.markerTexts.push(topYLabel);
    }

    private drawGridLines(
        xMin: number, 
        xMax: number, 
        xInterval: number, 
        yMin: number, 
        yMax: number, 
        yInterval: number
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
        this.gridLinesGraphics.lineStyle(1, 0x006F64); // Green color #006F64, 1px width
        
        // Draw vertical grid lines (parallel to y-axis)
        for (let x = xMin; x <= xMax; x += xInterval) {
            if (x === 0) continue; // Skip center line as it's already the y-axis
            
            const pixelX = gridCenterX + (x * xScale);
            
            this.gridLinesGraphics.beginPath();
            this.gridLinesGraphics.moveTo(pixelX, this.gridBoard.y);
            this.gridLinesGraphics.lineTo(pixelX, this.gridBoard.y + this.gridBoard.height);
            this.gridLinesGraphics.strokePath();
        }
        
        // Draw horizontal grid lines (parallel to x-axis)
        for (let y = yMin; y <= yMax; y += yInterval) {
            if (y === 0) continue; // Skip center line as it's already the x-axis
            
            const pixelY = gridCenterY - (y * yScale); // Note: Y is inverted in screen coordinates
            
            this.gridLinesGraphics.beginPath();
            this.gridLinesGraphics.moveTo(this.gridBoard.x, pixelY);
            this.gridLinesGraphics.lineTo(this.gridBoard.x + this.gridBoard.width, pixelY);
            this.gridLinesGraphics.strokePath();
        }
    }

    private createSlider( 
        _xInterval: number,
        _yInterval: number
    ) {
        if (!this.question) return;

        const lang = i18n.getLanguage() || 'en';
        let positions = {
            m: {
                x1: 328,
                x2: 355,
                y: 660
            },
            b: {
                x1: 273,
                x2: 293,
                y: 720
            }
        };
        if(lang === 'es') {
            positions = {
                m: {
                    x1: 278,
                    x2: 305,
                    y: 660
                },
                b: {
                    x1: 273,
                    x2: 293,
                    y: 720
                }
            };
        }
        const mLabel = this.scene.addText(positions.m.x1, positions.m.y, 'm', {
            fontFamily: 'Exo',
            fontSize: '24px',
            fontStyle: 'italic',
            color: '#00FFBF'
        }).setOrigin(0, 0.5);

        const mRestLabel = this.scene.addText(positions.m.x2, positions.m.y, i18n.t('game.mCoordinate').slice(1), {
            font: '700 24px Exo',
            color: '#00FFBF'
        }).setOrigin(0, 0.5);

        new TextOverlay(this.scene, mLabel, { label: 'm' });
        new TextOverlay(this.scene, mRestLabel, { label: i18n.t('game.mCoordinate').slice(1) });
        this.markerTexts.push(mLabel, mRestLabel);

        // Create X slider for slope (m) using question data
        this.xSlider = new CustomSlider(this.scene, {
            x: 444,
            y: 652,
            min: parseFloat(this.question.slopeMin),
            max: parseFloat(this.question.slopeMax),
            initialValue: 1,
            step: parseFloat(this.question.slopeStep),
            fillTexture: 'slider_fill_blue',
            knobTexture: 'slider_knob_blue',
            textColor: '#00FFBF',
            knobLabel: i18n.t('game.mCoordinate'),
            label: 'm ' + i18n.t('game.mCoordinate'),
            i18n: i18n,
            onChange: (value: number) => {
                if (this.isInterceptRed) {
                    this.destroyIncorrectIntercept();
                }
                
                // Update class property (slope 'm')
                this.xCord = value;
                
                // Update intercepts and equation display
                this.updateIntercepts();
                this.updateEquationDisplay();

                // For instruction mode, check if slope is correct
                if (this.isInstructionMode) {
                    const isEquationCorrect = this.checkEquationCorrect();
                    
                    if (isEquationCorrect) {
                        // Both sliders are now at correct values - proceed to step 3
                        if (!this.xSliderCorrect || !this.ySliderCorrect) {
                            this.xSliderCorrect = true;
                            this.ySliderCorrect = true;

                            // Disable both sliders when equation is correct
                            this.disableXSlider();
                            this.disableYSlider();
                            
                            // Stop all hand animations
                            this.stopXHandAnimation();
                            this.stopYHandAnimation();
                            
                            // Proceed to step 3
                            this.playInstructionStep3();
                        }
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
            }
        });

        const bLabel = this.scene.addText(positions.b.x1, positions.b.y, 'b', {
            fontFamily: 'Exo',
            fontSize: '24px',
            fontStyle: 'italic',
            color: '#00FFBF'
        }).setOrigin(0, 0.5);

        const bRestLabel = this.scene.addText(positions.b.x2, positions.b.y, i18n.t('game.cCoordinate').slice(1), {
            font: '700 24px Exo',
            color: '#00FFBF',
            wordWrap: {
                width: 190,
            }
        }).setOrigin(0, 0.5);

        this.yCordText = [bLabel, bRestLabel];

        new TextOverlay(this.scene, bLabel, { label: 'b' });
        new TextOverlay(this.scene, bRestLabel, { label: i18n.t('game.cCoordinate').slice(1) });
        this.markerTexts.push(bLabel, bRestLabel);

        // Create Y slider for y-intercept (b) using question data  
        this.ySlider = new CustomSlider(this.scene, {
            x: 444,
            y: 711,
            min: parseFloat(this.question.yInterceptMin),
            max: parseFloat(this.question.yInterceptMax), 
            initialValue: 0,
            step: parseFloat(this.question.yInterceptStep),
            fillTexture: 'slider_fill_orange',
            knobTexture: 'slider_knob_orange',
            textColor: '#FF5900',
            knobLabel: i18n.t('game.cCoordinate'),
            label: 'b ' + i18n.t('game.cCoordinate'),
            i18n: i18n,
            onChange: (value: number) => {
                if (this.isInterceptRed) {
                    this.destroyIncorrectIntercept();
                }
                
                // Update class property (y-intercept 'b')
                this.yCord = value;
                
                // Update intercepts and equation display
                this.updateIntercepts();
                this.updateEquationDisplay();

                // Check if Y-intercept is correct in instruction mode
                if (this.isInstructionMode) {
                    const isEquationCorrect = this.checkEquationCorrect();
                    
                    if (isEquationCorrect) {
                        // Both sliders are now at correct values - proceed to step 3
                        if (!this.xSliderCorrect || !this.ySliderCorrect) {
                            this.xSliderCorrect = true;
                            this.ySliderCorrect = true;

                            // Disable both sliders when equation is correct
                            this.disableXSlider();
                            this.disableYSlider();
                            
                            // Stop all hand animations
                            this.stopXHandAnimation();
                            this.stopYHandAnimation();
                            
                            // Proceed to step 3
                            this.playInstructionStep3();
                        }
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
            }
        });

        // Sync coordinate properties with slider initial values
        this.xCord = 1; // Match xSlider initialValue
        this.yCord = 0; // Match ySlider initialValue
        
        // Update intercepts to reflect the correct initial slider positions
        this.updateIntercepts();
        this.updateEquationDisplay();

        // In instruction mode, initially disable both sliders
        if (this.isInstructionMode) {
            this.disableXSlider();
            this.disableYSlider();
        }
    }

    private checkEquationCorrect(): boolean {
        if (!this.question) return false;
        
        // Use the same logic as checkAnswer - count monsters on the line
        const monstersOnLine = this.countMonstersOnLine(this.xCord, this.yCord);
        const expectedMonsterCount = parseInt(this.question.answer);
        
        // Check if the current equation captures the expected number of monsters
        return monstersOnLine === expectedMonsterCount;
    }

    private disableYSlider() {
        if (this.ySlider) {
            this.ySlider.setEnabled(false);
        }
        // Stop slider sound when disabling
        this.scene.audioManager.stopSoundEffect('slider');
    }

    private disableXSlider() {
        if (this.xSlider) {
            this.xSlider.setEnabled(false);
        }
        // Stop slider sound when disabling
        this.scene.audioManager.stopSoundEffect('slider');
    }

    private createIntercepts() {
        // Create graphics objects for intercept lines
        this.intercept = this.scene.add.graphics();
        this.intercept.lineStyle(4, 0x00FFE6);
        // Initial update
        this.updateIntercepts();
    }

    private createShadowIntercepts() {
        // Create graphics objects for intercept lines
        this.shadowIntercept = this.scene.add.graphics();
        this.shadowIntercept.lineStyle(4, 0x00FFE6);
        this.shadowIntercept.setVisible(false); // Initially hidden
    }

    private updateIntercepts(alpha: number = 1) {
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
        this.intercept?.clear();

        // Set line style again after clearing
        this.intercept.lineStyle(4, this.isInterceptRed ? 0xFF0000 : 0x00FFE6, alpha).setDepth(2);

        const slope = this.xCord;
        const yIntercept = this.yCord;

        // Calculate the actual visible grid boundaries in coordinate space
        const gridLeft = this.gridBoard.x;
        const gridRight = this.gridBoard.x + this.gridBoard.displayWidth;
        const gridTop = this.gridBoard.y;
        const gridBottom = this.gridBoard.y + this.gridBoard.displayHeight;

        // Convert grid boundaries back to coordinate space
        const leftX = (gridLeft - gridCenterX) / xScale;
        const rightX = (gridRight - gridCenterX) / xScale;
        const topY = -(gridTop - gridCenterY) / yScale; // Y is inverted
        const bottomY = -(gridBottom - gridCenterY) / yScale; // Y is inverted

        // Calculate y values at left and right edges
        const yAtLeft = slope * leftX + yIntercept;
        const yAtRight = slope * rightX + yIntercept;

        // Calculate x values at top and bottom edges (if slope is not zero)
        let xAtTop = slope !== 0 ? (topY - yIntercept) / slope : leftX;
        let xAtBottom = slope !== 0 ? (bottomY - yIntercept) / slope : leftX;

        // Find intersection points that are within the grid boundaries
        const intersectionPoints: Array<{x: number, y: number}> = [];

        // Check left edge intersection
        if (yAtLeft >= bottomY && yAtLeft <= topY) {
            intersectionPoints.push({x: leftX, y: yAtLeft});
        }

        // Check right edge intersection
        if (yAtRight >= bottomY && yAtRight <= topY) {
            intersectionPoints.push({x: rightX, y: yAtRight});
        }

        // Check top edge intersection
        if (xAtTop >= leftX && xAtTop <= rightX && slope !== 0) {
            intersectionPoints.push({x: xAtTop, y: topY});
        }

        // Check bottom edge intersection
        if (xAtBottom >= leftX && xAtBottom <= rightX && slope !== 0) {
            intersectionPoints.push({x: xAtBottom, y: bottomY});
        }

        // Remove duplicate points (can happen at corners)
        const uniquePoints = intersectionPoints.filter((point, index, array) => {
            return index === array.findIndex(p => 
                Math.abs(p.x - point.x) < 0.001 && Math.abs(p.y - point.y) < 0.001
            );
        });

        // We should have exactly 2 intersection points for a line
        if (uniquePoints.length >= 2) {
            const startPoint = uniquePoints[0];
            const endPoint = uniquePoints[1];

            // Convert back to pixel coordinates
            const startPixelX = gridCenterX + (startPoint.x * xScale);
            const startPixelY = gridCenterY - (startPoint.y * yScale); // Y is inverted
            const endPixelX = gridCenterX + (endPoint.x * xScale);
            const endPixelY = gridCenterY - (endPoint.y * yScale); // Y is inverted

            // Draw the clipped line
            this.intercept.beginPath();
            this.intercept.moveTo(startPixelX, startPixelY);
            this.intercept.lineTo(endPixelX, endPixelY);
            this.intercept.strokePath();
        } else if (uniquePoints.length === 1) {
            // Special case: line might be tangent to a corner or completely outside
            // In this case, we can try to extend from the single point
            const point = uniquePoints[0];
            const pixelX = gridCenterX + (point.x * xScale);
            const pixelY = gridCenterY - (point.y * yScale);

            // Draw a small point or short line segment
            this.intercept.beginPath();
            this.intercept.arc(pixelX, pixelY, 2, 0, Math.PI * 2);
            this.intercept.fillPath();
        }

        this._interceptPoints = uniquePoints.map(pt => ({
            x: gridCenterX + (pt.x * xScale),
            y: gridCenterY - (pt.y * yScale)
        }));
    }

    private _interceptPoints: any;

    private updateShadowIntercept() {
    if (!this.shadowIntercept || !this._interceptPoints) return;

    this.shadowIntercept.clear();
    this.shadowIntercept.lineStyle(10, 0x7F0800, 1).setDepth(1); // Lower alpha for shadow

    if (this._interceptPoints.length >= 2) {
        const [start, end] = this._interceptPoints;
        this.shadowIntercept.beginPath();
        this.shadowIntercept.moveTo(start.x, start.y);
        this.shadowIntercept.lineTo(end.x, end.y);
        this.shadowIntercept.strokePath();
    } else if (this._interceptPoints.length === 1) {
        const point = this._interceptPoints[0];
        this.shadowIntercept.beginPath();
        this.shadowIntercept.arc(point.x, point.y, 2, 0, Math.PI * 2);
        this.shadowIntercept.fillPath();
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
                }
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
        this.volumeSlider.create(this.scene.display.width - 220, this.isInstructionMode ? 256 : 238, 'purple', i18n.t('common.volume'));
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
        if (this.captureButton) {
            this.captureButton.destroy();
        }
        // Capture button
        this.captureButton = ButtonHelper.createButton({
            scene: this.scene,
            imageKeys: {
                default: 'capture_btn',
                hover: 'capture_btn_hover',
                pressed: 'capture_btn_pressed'
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
            }
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
                pressed: 'reset_btn_pressed'
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
            }
        });

        if (this.isInstructionMode) {
            ButtonHelper.disableButton(this.resetButton);
        }
    }

    private resetToOrigin() {
        this.xCord = 1;
        this.yCord = 0;

        // Reset instruction mode state
        if (this.isInstructionMode) {
            this.xSliderCorrect = false;
            this.ySliderCorrect = false;
        }

        // Reset CustomSlider values
        if (this.xSlider) {
            this.xSlider.setValue(1);
        }
        if (this.ySlider) {
            this.ySlider.setValue(0);
        }

        // Update intercepts and equation display
        this.updateIntercepts();
        this.updateEquationDisplay();

        // Handle instruction mode hand animations
        if (this.isInstructionMode) {
            // Check if we're in step 2 or later (Y slider should be interactive)
            // We check this BEFORE stopping animations to preserve the state
            const wasInStep2OrLater = !!this.yHandLoopTimer;
            
            // Stop all hand animations
            this.stopYHandAnimation();
            this.stopXHandAnimation();
            
            if (wasInStep2OrLater) {
                // Step 2 or later is active - both sliders should be enabled
                if (this.xSlider) {
                    this.xSlider.setEnabled(true);
                }
                if (this.ySlider) {
                    this.ySlider.setEnabled(true);
                }
                // Restart Y hand animation to guide the user
                this.startYHandAnimation();
            } else {
                // Step 1 is active - only X slider should be enabled
                if (this.xSlider) {
                    this.xSlider.setEnabled(true);
                }
                // Y slider should remain disabled (it's not introduced yet in step 1)
                if (this.ySlider) {
                    this.ySlider.setEnabled(false);
                }
            }
        }
    }

    private checkAnswer() {
        if (!this.question) return;
        if (this.isProcessing) return;

        this.positionCoordinates.setText(`y = ${this.xCord}x + ${this.yCord}`);

        // Show actual coordinates when capture button is pressed
        this.scene.tweens.add({
            targets: this.positionCoordinates,
            alpha: 1,
            duration: 300,
            ease: 'Power2.easeOut'
        });

        this.intercept.setVisible(true);

        // Calculate how many monsters lie on our current line
        const monstersOnLine = this.countMonstersOnLine(this.xCord, this.yCord);
        
        // Get the expected number of monsters from the answer field
        const expectedMonsterCount = parseInt(this.question.answer);
        
        // Check if the number of monsters on our line matches the expected count
        const isCorrect = monstersOnLine === expectedMonsterCount;
        
        if (isCorrect) {
            console.log('correct');
            this.isProcessing = true;
            this.scene.time.delayedCall(1000,() => {
                this.intercept.setVisible(false);
            });

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
                    questionText: `Monsters at: ${this.question.monsterCoordinates}`,
                    isCorrect: true,
                    questionMechanic: 'default',
                    gameLevelInfo: 'game.grid_lock.default',
                    studentResponse: `${this.xCord}x + ${this.yCord}`,
                    studentResponseAccuracyPercentage: '100%',
                });

                this.updateMonsterSelectionVisuals();
                // Normal game mode
                this.scoreHelper.answerCorrectly();
                this.questionSelector?.answerCorrectly();
                this.scoreCoins?.updateScoreDisplay(true);

                // Use first monster for jail animation
                const monsterToJail = this.monsters[0] || this.monster;
                this.scene.time.delayedCall(1000, () => {
                    this.resetMonsterSelectionVisuals();
                
                    if (monsterToJail) {
                        this.monsterJail.animateMonsterToJail(this.getMonstersOnLine(this.xCord, this.yCord), () => {
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
                    if(this.remainingChances-- >= 0) {
                        this.createChancesContainer();
                        this.showErrorAnimation(this.remainingChances === 0 ? true : false);
                        if(this.remainingChances !== 0) {
                            this.isProcessing = false;
                            return;
                        }
                    }

                    this.analyticsHelper?.createTrial({
                        questionMaxPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                        achievedPoints: 0,
                        questionText: `Monsters at: ${this.question?.monsterCoordinates || ''}`,
                        isCorrect: false,
                        questionMechanic: 'default',
                        gameLevelInfo: 'game.grid_lock.default',
                        studentResponse: `${this.xCord}x + ${this.yCord}`,
                        studentResponseAccuracyPercentage: '0%',
                    });

                    // Only update score and progress in game mode
                    this.scoreHelper.answerIncorrectly();
                    this.questionSelector?.answerIncorrectly(this.question!);
                    this.scoreCoins?.updateScoreDisplay(false);

                    // Update progress bar
                    const progress = this.questionSelector!.getTotalQuestionsAnswered() / this.totalQuestions;
                    this.progressBar?.drawProgressFill(progress, this.scoreHelper.getCurrentStreak());
                    
                    this.scene.time.delayedCall(1000, () => {
                        this.loadNextQuestion();
                    });
                });
            } else {
                this.scene.tweens.add({
                    targets: this.positionCoordinates,
                    alpha: 0,
                    duration: 300,
                    ease: 'Power2.easeOut'
                });
            }
            // In instruction mode, do nothing for incorrect answers (button shouldn't be clickable anyway)
        }
    }

    private getCorrectSolutionText(): string {
        if (!this.question) return '';
        return this.question.equation;
    }

    private getMonstersOnLine(slope: number, yIntercept: number): Phaser.GameObjects.Image[] {
    if (!this.question) return [];

    const monstersOnLine: Phaser.GameObjects.Image[] = [];
    
    // Parse all monster coordinates and check which monsters are on the line
    const coordPairs: string[] = this.question.monsterCoordinates.split('),(');
    
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
                // This monster is on the line, add it to the jail list
                if (this.monsters[index]) {
                    monstersOnLine.push(this.monsters[index]);
                }
            }
        }
    });
    
    return monstersOnLine;
}

    private countMonstersOnLine(slope: number, yIntercept: number): number {
        if (!this.question) return 0;

        let count = 0;
        
        // Parse all monster coordinates
        const coordPairs = this.question.monsterCoordinates.split('),(');
        // TODO: check this. any
        coordPairs.forEach((coordPair: any) => {
            // Clean up the coordinate string
            const cleanCoord = coordPair.replace(/[()]/g, '');
            const coords = cleanCoord.split(',');
            
            if (coords.length === 2) {
                const monsterX = parseFloat(coords[0].trim());
                const monsterY = parseFloat(coords[1].trim());
                
                // Calculate the expected Y value for this X using our equation
                const expectedY = this.calculateYFromEquation(monsterX, slope, yIntercept);
                
                // Check if the monster's Y coordinate matches the calculated Y
                // Use a small tolerance for floating point comparisons
                if (Math.abs(monsterY - expectedY) < 0.001) {
                    count++;
                }
            }
        });
        
        return count;
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
        const doorLeft = this.scene.addImage(0, this.scene.display.height / 2, COMMON_ASSETS.DOOR.KEY).setOrigin(1, 0.5).setDepth(100);
        const doorRight = this.scene.addImage(this.scene.display.width, this.scene.display.height / 2, COMMON_ASSETS.DOOR.KEY).setOrigin(0, 0.5).setFlipX(true).setDepth(100);

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
            }
        });
    }

    private createDoors() {
        this.doorLeft = this.scene.addImage(this.scene.display.width / 2, this.scene.display.height / 2, COMMON_ASSETS.DOOR.KEY).setOrigin(1, 0.5).setDepth(100);
        this.doorRight = this.scene.addImage(this.scene.display.width / 2, this.scene.display.height / 2, COMMON_ASSETS.DOOR.KEY).setOrigin(0, 0.5).setFlipX(true).setDepth(100);
    }

    private openDoors() {
        const countdownImg = this.scene.addImage(this.scene.display.width / 2, this.scene.display.height / 2, 'countdown_3').setOrigin(0.5).setDepth(100);
        countdownImg.setScale(200/countdownImg.height);

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
                        }
                    });
                }
            },
            callbackScope: this,
            repeat: 3
        });
    }

    private showSuccessAnimation() {
        announceToScreenReader(i18n.t('common.correctFeedback'));
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
                        }
                    });
                });
            }
        });
    }

    private showErrorAnimation(showAnswer = false) {
        announceToScreenReader(i18n.t('common.incorrectFeedback'));
        this.gridBoardErrorTint.setVisible(true);

        const width = this.scene.display.width;
        const height = 145;
        const errorContainer = this.scene.add.container(this.scene.getScaledValue(this.scene.display.width / 2), this.scene.getScaledValue(this.scene.display.height + height / 2)).setDepth(10);

        // Create background rectangle
        const bgRect = this.scene.addRectangle(0, 0, width, height, 0x8B211A);
        errorContainer.add(bgRect);

        const bgRectTop = this.scene.addRectangle(0, -height / 2, width, 8.32, 0xE94338).setOrigin(0.5, 0);
        errorContainer.add(bgRectTop);

        // Create icon and text
        let icon: Phaser.GameObjects.Image | Phaser.GameObjects.Text;
        if (showAnswer) {
            if( this.isInterceptRed) {
                this.destroyIncorrectIntercept();
            }
            // Show correct solution text instead of icon
            icon = this.scene.addText(0, 0, `Correct Solution: ${this.getCorrectSolutionText()}`, {
                font: '700 36px Exo',
                color: '#00FF22',
                align: 'center'
            }).setOrigin(0.5);
        } else {
            // Create icon and text
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
                if(icon instanceof Phaser.GameObjects.Image) {
                    new ImageOverlay(this.scene, icon, { label: i18n.t('common.incorrect') + ' ' + i18n.t('common.icon') });
                } else if (icon instanceof Phaser.GameObjects.Text) {
                    new TextOverlay(this.scene, icon, { label: `Correct Solution: ${this.getCorrectSolutionText()}` });
                };

                // Wait for a moment and then slide down
                this.scene.time.delayedCall(showAnswer ? 1500 : 500, () => {
                    this.scene.tweens.add({
                        targets: errorContainer,
                        y: this.scene.getScaledValue(this.scene.display.height + height / 2),
                        duration: 500,
                        ease: 'Power2',
                        onComplete: () => {
                            errorContainer.destroy();
                            this.gridBoardErrorTint.setVisible(false);
                        }
                    });
                });
            }
        });
    }

    private destroyIncorrectIntercept() {
        this.isInterceptRed = false;
        this.updateIntercepts();
        this.intercept.setVisible(false);
    }

    private createChancesContainer(): void {
        // Remove previous container if it exists
        if (this.chancesContainer) {
            this.chancesContainer.destroy();
            this.chancesContainer = undefined;
        }

        // Create a new container
        const x = this.scene.getScaledValue(860);
        const y = this.scene.getScaledValue(575);
        this.chancesContainer = this.scene.add.container(x, y).setDepth(10);

        // Add chance images
        const chanceImages: Phaser.GameObjects.Image[] = [];
        const spacing = 25; // Space between chance images
        for (let i = 0; i < this.maxChances; i++) {
            // Reverse the order: last image loses first
            const lostIndex = this.maxChances - this.remainingChances;
            const imgKey = i >= this.maxChances - lostIndex ? 'chance_lost' : 'chance';
            const img = this.scene.addImage(i * spacing, 0, imgKey).setOrigin(0.5).setScale(0.9);
            chanceImages.push(img);
            this.chancesContainer.add(img);
        }

        // Add chances text (e.g., "2/3")
        const chancesText = this.scene.addText(
            70, // position after last chance image
            3,
            `(${this.remainingChances}/${this.maxChances})`,
            {
                font: '400 20px Exo',
                color: '#00AEA7',
                align: 'center'
            }
        ).setOrigin(0, 0.5);
        this.chancesContainer.add(chancesText);

        // Add lightning image after text
        const lightningImg = this.scene.addImage(
            this.maxChances * spacing + chancesText.width + 10, // position after text
            0,
            'lightning'
        ).setOrigin(0.5).setScale(1);
        this.chancesContainer.add(lightningImg);
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
                }
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
        this.infoText?.setText(i18n.t('info.linear_equation.step1'));
        this.infoTextOverlay?.updateContent(i18n.t('info.linear_equation.step1'));

        // Define elements to hide (everything except X slider)
        const ySliderContainer = this.ySlider ? [this.ySlider.getContainer()] : [];
        const elementsToHide = [this.captureButton?.getAt(0), this.resetButton?.getAt(0), this.captureButton?.getAt(1), this.resetButton?.getAt(1), ...ySliderContainer, ...this.yCordText] as Phaser.GameObjects.GameObject[];
        
        // Hide elements (set behind)
        this.setBehind(elementsToHide);
        
        // Disable both sliders initially
        this.disableXSlider();
        this.disableYSlider();

        // Enable X slider for interaction
        if (this.xSlider) {
            this.xSlider.setEnabled(true);
        }

        // Start monster pulse animation - use first monster
        const firstMonster = this.monsters[0] || this.monster;
        if (firstMonster) {
            const monsterScale = firstMonster.scale;
            this.monsterPulseTween = this.scene.tweens.add({
                targets: firstMonster,
                scale: monsterScale * 1.2,
                duration: 1000,
                yoyo: true,
                ease: 'Sine.easeInOut',
                repeat: -1
            });
        }

        // Play step_1 audio
        const step1 = this.scene.audioManager.playSoundEffect('step_1_linear');
        step1?.on('complete', () => {
        // Stop monster pulse animation when audio completes
        if (this.monsterPulseTween) {
            this.monster.setScale(0.6);
            this.monsterPulseTween.stop();
            this.monsterPulseTween.destroy();
            this.monsterPulseTween = undefined;
        }
        
        // Wait a moment then proceed to step 2
        const timer = this.scene.time.delayedCall(1000, () => {
            // Remove all the slope checking logic - just proceed to step 2
            this.resetBehind();
            this.playInstructionStep2();
        });
        this.delayedCalls.push(timer);
});
        
    }

    private playInstructionStep2() {
        const step2 = this.scene.audioManager.playSoundEffect('step_2_linear');

        ButtonHelper.enableButton(this.resetButton);
        
        // Reset behind to show Y slider elements
        this.resetBehind();
        
        // Only hide capture button elements in step 2
        const elementsToHide = [this.captureButton?.getAt(0), this.captureButton?.getAt(1)] as Phaser.GameObjects.GameObject[];
        this.setBehind(elementsToHide);

        this.infoText?.setText(i18n.t('info.linear_equation.step2'));
        this.infoTextOverlay?.updateContent(i18n.t('info.linear_equation.step2'));

        // Since we're using CustomSlider, we don't need to tween individual text elements
        // The CustomSlider handles its own visual updates
        
        // Keep both sliders disabled during step 2 audio
        this.disableXSlider();
        this.disableYSlider();

        step2?.on('complete', () => {
            this.resetBehind();
            
            // Enable both sliders after step 2
            if (this.xSlider) {
                this.xSlider.setEnabled(true);
            }
            if (this.ySlider) {
                this.ySlider.setEnabled(true);
            }

            this.startYHandAnimation();
        });
    }

    private stopXHandAnimation() {
        // Stop X hand loop timer
        if (this.xHandLoopTimer) {
            this.xHandLoopTimer.destroy();
            this.xHandLoopTimer = undefined;
        }

        // Clean up X hand image
        if (this.handImageX) {
            this.handImageX.destroy();
            this.handImageX = undefined;
        }
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
            loop: true
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
        if (this.handImageY) {
            this.handImageY.destroy();
            this.handImageY = undefined;
        }
        
        // Calculate hand animation based on CustomSlider configuration
        const startProgress = (0 - parseFloat(this.question.yInterceptMin)) / (parseFloat(this.question.yInterceptMax) - parseFloat(this.question.yInterceptMin));
        
        // Use CustomSlider configuration to calculate positions
        const sliderStartX = 500; // Y slider position from config
        const sliderWidth = 308; // Default slider width
        
        const startX = sliderStartX + startProgress * sliderWidth;
        const handWidth = 20;

        const stepSize = parseFloat(this.question.yInterceptStep);
        const totalSteps = (parseFloat(this.question.yInterceptMax) - parseFloat(this.question.yInterceptMin)) / stepSize;
        const stepPixelWidth = sliderWidth / totalSteps;

        // Create hand at start position (unscaled coordinates)
        this.handImageY = this.scene.addImage(
            startX + handWidth, 
            711 + 20, // Y position from Y slider config
            'hand_click'
        ).setOrigin(0.5).setScale(0.13).setDepth(10);
        
        // Move hand to target position
        this.scene.tweens.add({
            targets: this.handImageY,
            x: this.handImageY.x + stepPixelWidth * 2,
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
            }
        });
    }

    private playInstructionStep3() {
        ButtonHelper.disableButton(this.resetButton);

        this.resetBehind();

        const elements = [this.resetButton?.getAt(0), this.resetButton?.getAt(1)] as Phaser.GameObjects.GameObject[];
        this.setBehind(elements);

        this.infoText?.setText(i18n.t('info.linear_equation.step3'));
        this.infoTextOverlay?.updateContent(i18n.t('info.linear_equation.step3'));

        if (this.positionCoordinates) {
            // Remove any previous hand image
            if (this.handImageX) {
                this.handImageX.destroy();
                this.handImageX = undefined;
            }
            this.handImageX = this.scene.addImage(670, 450, 'hand')
                .setOrigin(0)
                .setScale(0.13)
                .setDepth(10);
        }

        if (this.handImageY) {
            this.handImageY.destroy();
            this.handImageY = undefined;
        }

        // Play step_3 audio
        const step3 = this.scene.audioManager.playSoundEffect('step_3_linear');
        
        step3?.on('complete', () => {
            // Wait 1 second then proceed to step 4
            const timer = this.scene.time.delayedCall(1000, () => {
                this.playInstructionStep4();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playInstructionStep4() {

        this.infoText?.setText(i18n.t('info.linear_equation.step4'));
        this.infoTextOverlay?.updateContent(i18n.t('info.linear_equation.step4'));

        // Play step_4 audio
        this.scene.audioManager.playSoundEffect('step_4_linear');
        
        // Enable capture button and start breathing animation
        if (this.captureButton) {
            ButtonHelper.enableButton(this.captureButton);
            ButtonHelper.startBreathingAnimation(this.captureButton, { moveUpAmount: 10 });
        }
    }

    private destroyInstructionTimers() {
        // Destroy all delayed calls
        this.delayedCalls.forEach(timer => {
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

    private showAndBlinkIntercept(times: number = 3, onComplete?: () => void) {
        if (!this.intercept) return;
        let count = 0;

        // Set intercept to red and show it
        this.isInterceptRed = true;
        this.updateIntercepts();
        this.intercept.setVisible(true);

        // Show shadow intercept and blink it
        this.updateShadowIntercept();
        this.shadowIntercept.setVisible(true);

        const blink = () => {
            if (count >= times * 2) {
                this.shadowIntercept.setVisible(false);
                onComplete?.();
                return;
            }
            // Blink shadow intercept: toggle visibility
            this.shadowIntercept.setVisible(count % 2 === 0 ? false : true);
            count++;
            this.scene.time.delayedCall(400, blink);
        };
        blink();
}

    private resetChances() {
        this.remainingChances = this.maxChances;
    }
}
