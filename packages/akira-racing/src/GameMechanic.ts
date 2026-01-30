import { BaseScene, QuestionSelectorHelper, getQuestionBankByName, Question, questionBankNames, ScoreCoins, ProgressBar, VolumeSlider, i18n, ScoreHelper, TextOverlay, announceToScreenReader, AnalyticsHelper, ButtonHelper, ButtonOverlay } from '@k8-games/sdk';
import { ASSETS_PATHS, BUTTONS, CARS } from './config/common';
import { continueGameAfterWrongAnswer } from './utils/helper';

interface MovingBoard {
    container: Phaser.GameObjects.Container;
    side: 'left' | 'right';
    value: string;
}

export class GameMechanic {
    private scene: BaseScene;
    private isInstructionMode: boolean;
    public movingBoards: MovingBoard[] = [];
    private roadSpeed: number = 0.1;
    private movingPotholes: { container: Phaser.GameObjects.Container; side: 'left' | 'right' }[] = [];
    private questionSelector?: QuestionSelectorHelper;
    private totalQuestions: number = 10;
    public currentQuestion?: Question;
    public car?: Phaser.GameObjects.Container;
    private currentLaneIndex: number = 1; // start at center (0=left, 1=center, 2=right
    private answerChecked: boolean = false;
    private building?: Phaser.GameObjects.Image;
    public controlsEnabled: boolean = false;
    private isGamePaused: boolean = false;
    private finishLine?: Phaser.GameObjects.Image;
    private selectedCar?: string;
    private speedTextOverlay?: TextOverlay;
    private carValueTextOverlay?: TextOverlay;
    private boardSpawnTimer?: Phaser.Time.TimerEvent;

    private scoreHelper: ScoreHelper;
    private scoreCoins?: ScoreCoins;
    private progressBar?: ProgressBar;
    private analyticsHelper!: AnalyticsHelper;

    // Speedometer
    private ROAD_SPEED_MIN = 0;
    private ROAD_SPEED_MAX = 0.5;
    private ROAD_SPEED_INCREMENT = 0.025;
    private SPEEDOMETER_MIN_SPEED = 0;
    private SPEEDOMETER_MAX_SPEED = 100;
    public LANE_OFFSET = 320;

    constructor(scene: BaseScene, isInstructionMode: boolean = false) {
        this.scene = scene;
        this.isInstructionMode = isInstructionMode;
        this.scoreHelper = new ScoreHelper(2);

        const questionBank = getQuestionBankByName(questionBankNames.grade5_topic1);
        if (questionBank) {
            this.questionSelector = new QuestionSelectorHelper(questionBank, this.totalQuestions);
        }
    }

    static _preload(scene: BaseScene) {
        const lang = i18n.getLanguage() || 'en';

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen`);
        scene.load.image('gamescene_bg', 'gamescene_bg.png');
        scene.load.image('gamescene_road', 'gamescene_road.png');
        scene.load.image('gamescene_building', 'gamescene_building.png');
        scene.load.image('car_board', 'car_board.png');
        scene.load.image('car_board_correct', 'car_board_correct.png');
        scene.load.image('car_board_incorrect', 'car_board_incorrect.png');
        scene.load.image('question_board', 'question_board.png');
        scene.load.image('question_board_correct', 'question_board_correct.png');
        scene.load.image('question_board_incorrect', 'question_board_incorrect.png');
        scene.load.image('speedometer', 'speedometer.png');
        scene.load.image('finish_line', `finish_line_${lang}.png`);
        scene.load.image('instruction_bg', 'instruction_bg.png');
        scene.load.image('control_board', 'control_board.png');
        scene.load.image('left_right_key_bg', 'left_right_key_bg.png');
        scene.load.image('up_down_key_bg', 'up_down_key_bg.png');
        scene.load.image('left_key', 'left_key.png');
        scene.load.image('right_key', 'right_key.png');
        scene.load.image('up_key', 'up_key.png');
        scene.load.image('down_key', 'down_key.png');
        
        scene.load.image('road_obj_1', 'road_obj_1.png');
        scene.load.image('road_obj_2', 'road_obj_2.png');
        scene.load.image('road_obj_3', 'road_obj_3.png');
        scene.load.image('road_obj_4', 'road_obj_4.png');
        scene.load.image('road_obj_5', 'road_obj_5.png');

        CARS.forEach((car) => {
            scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen/cars/${car.KEY}`);
            scene.load.image(`${car.KEY}_car_center`, 'car_center.png');
            scene.load.image(`${car.KEY}_car_left`, 'car_left.png');
            scene.load.image(`${car.KEY}_car_right`, 'car_right.png');
            scene.load.image(`${car.KEY}_car_skid_left`, 'car_skid_left.png');
            scene.load.image(`${car.KEY}_car_skid_right`, 'car_skid_right.png');
        });

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}`);
        scene.load.audio('bg_music', 'bg_music.mp3');
        scene.load.audio('car_correct_sfx', 'car_correct_sfx.mp3');
        scene.load.audio('car_incorrect_sfx', 'car_incorrect_sfx.mp3');

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

        ProgressBar.preload(scene, 'dark');
        ScoreCoins.preload(scene, 'blue');
        VolumeSlider.preload(scene, 'blue');
    }

    init(data?: { reset?: boolean }) {
        ProgressBar.init(this.scene);
        ScoreCoins.init(this.scene);

        this.roadSpeed = 0.1;

        if (data?.reset) {
            this.resetGame();
        }
    }

    create() {
        if (!this.isInstructionMode) {
            const _analyticsHelper = AnalyticsHelper.getInstance();
            if (_analyticsHelper) {
                this.analyticsHelper = _analyticsHelper;
            } else {
                console.error('AnalyticsHelper not found');
            }
            this.analyticsHelper?.createSession('game.digit_drive.default');
        }

        this.scene.audioManager.initialize(this.scene);
        this.selectedCar = this.scene.registry.get('selected_car');

        this.scene.addImage(this.scene.display.width / 2, this.scene.display.height / 2, 'gamescene_bg').setOrigin(0.5);
        this.building = this.scene.addImage(this.scene.display.width / 2, this.scene.display.height / 2, 'gamescene_building').setOrigin(0.5);
        this.scene.addImage(this.scene.display.width / 2, this.scene.display.height / 2, 'gamescene_road').setOrigin(0.5);

        if (!this.isInstructionMode) {
            this.scene.audioManager.playBackgroundMusic('bg_music');

            // Create score coins
            this.scoreCoins = new ScoreCoins(this.scene, this.scoreHelper, i18n, 'blue');
            this.scoreCoins.create(
                this.scene.getScaledValue(108),
                this.scene.getScaledValue(54)
            ).setDepth(100);

            this.progressBar = new ProgressBar(this.scene, 'dark', i18n);
            this.progressBar.create(
                this.scene.getScaledValue(this.scene.display.width / 2 + 51),
                this.scene.getScaledValue(60),
            ).setDepth(100);

            this.createButtons();
        }
        
        if (this.scene.isTouchDevice()) this.createControlBoard();
        
        this.createSpeedometer();

        // Car
        this.car = this.scene.add.container(
            this.scene.getScaledValue(this.scene.display.width / 2),
            this.scene.getScaledValue(this.scene.display.height - 250)
        ).setDepth(2);
        const carImage = this.scene.addImage(0, 0, `${this.selectedCar}_car_center`).setOrigin(0.5, 0).setName('car');
        this.car.add([carImage]);

        const boardY = carImage.height; 
        const carBoard = this.scene.addImage(0, boardY, 'car_board').setOrigin(0.5).setName('car_board');
        this.car.add([carBoard]);

        const carAnswerText = this.scene.addText(0, boardY + 2, '', {
            font: '700 42px Exo',
            color: '#00FFFA'
        }).setOrigin(0.5).setName('car_answer_text');
        this.car.add([carAnswerText]);
        this.carValueTextOverlay = new TextOverlay(this.scene, carAnswerText, { label: i18n.t('game.carValue', { value: '' }) });

        // Input handling
        if (!this.isInstructionMode) {
            this.controlsEnabled = true;

            // Keyboard controls
            this.scene.input.keyboard?.on('keydown-LEFT', () => this.moveCar(-1));
            this.scene.input.keyboard?.on('keydown-RIGHT', () => this.moveCar(1));
            this.scene.input.keyboard?.on('keydown-UP', () => this.updateRoadSpeed(true));
            this.scene.input.keyboard?.on('keydown-DOWN', () => this.updateRoadSpeed(false));

            // Pointer / touch
            this.initializePointerControls();
        }

        this.createInstructionBoard();

        // Spawn potholes
        this.spawnRightPothole();
        this.spawnLeftPothole();

        if (this.prepareNextQuestionUI()) {
            this.addBoardsForCurrentQuestion();
        } 
    }

    public initializePointerControls() {
        this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]) => {
            if (!this.controlsEnabled || this.isGamePaused) return;

            // Dont move the car on clicking interactive elements
            if (gameObjects.length > 0) return;

            const controlBoard = this.scene.children.getByName('control_board') as Phaser.GameObjects.Container;
            if (controlBoard) {
                const controlBoardBounds = controlBoard.getBounds();
                if (controlBoardBounds.contains(pointer.x, pointer.y)) return;
            }

            const halfWidth = this.scene.getScaledValue(this.scene.display.width / 2);

            if (pointer.x < halfWidth) {
                this.scene.input.keyboard?.emit('keydown-LEFT');
            } else {
                this.scene.input.keyboard?.emit('keydown-RIGHT');
            }
        });
    }

    update(delta: number) {
        this.updateMovingBoards();
        this.handleBoardSpawning();
        this.updateMovingPotholes();
        this.handlePotholeSpawning();

        if (this.questionSelector?.isGameCompleted()) {
            this.updateFinishLine();
        }

        this.handleBuildingMovement(delta);
    }

    private createControlBoard() {
        const container = this.scene.add.container(
            this.scene.getScaledValue(142),
            this.scene.getScaledValue(626)
        ).setDepth(10).setName('control_board');

        const controlBoard = this.scene.addImage(0, 0, 'control_board').setOrigin(0.5);
        container.add([controlBoard]);

        const keys = [
            { key: 'up', x: 0, y: -60, onClick: () => this.updateRoadSpeed(true) },
            { key: 'left', x: -60, y: 0, onClick: () => this.moveCar(-1) },
            { key: 'right', x: 60, y: 0, onClick: () => this.moveCar(1) },
            { key: 'down', x: 0, y: 60, onClick: () => this.updateRoadSpeed(false) },
        ]

        keys.forEach((key) => {
            const keyBg = (key.key === 'up' || key.key === 'down') ? 'up_down_key_bg' : 'left_right_key_bg';
            const button = ButtonHelper.createIconButton({
                scene: this.scene,
                imageKeys: {
                    default: keyBg,
                    hover: keyBg,
                    pressed: keyBg,
                },
                icon: `${key.key}_key`,
                raisedOffset: 0,
                label: i18n.t(`game.controlBoard.${key.key}`),
                x: key.x,
                y: key.y,
                onClick: () => {
                    if (this.isInstructionMode) {
                        if (key.key === 'left') {
                            this.scene.input.keyboard?.emit('keydown-LEFT');
                        } else if (key.key === 'right') {
                            this.scene.input.keyboard?.emit('keydown-RIGHT');
                        }
                        return;
                    }
                    key.onClick();
                }
            }).setName(`${key.key}_key`);
            container.add([button]);

            // Adjust icon position to center
            const icon = button.getAt(1) as Phaser.GameObjects.Image;
            icon.y += this.scene.getScaledValue(2);

            const overlay = (button as any).buttonOverlay as ButtonOverlay;
            overlay?.recreate();
            if (overlay && overlay.element) {
                overlay.element.style.outline = 'revert';
            }
        })
    }

    private createInstructionBoard() {
        const container = this.scene.add.container(0, 0).setDepth(10).setName('instruction_board').setAlpha(0);
        const instructionBoard = this.scene.addImage(this.scene.display.width / 2, 230, 'instruction_bg').setOrigin(0.5).setTint(0x1a1a2e);
        const instructionText = this.scene.addText(this.scene.display.width / 2, 230, '', {
            font: '700 32px Exo',
            color: '#ffffff',
            wordWrap: { width: instructionBoard.width - 40 }
        }).setOrigin(0.5).setName('instruction_text');
        const overlay = new TextOverlay(this.scene, instructionText, { label: '' });
        instructionText.setData('overlay', overlay);

        container.add([instructionBoard, instructionText]);
    }

    private updateInstructionText(text: string, show: boolean = true) {
        const container = this.scene.children.getByName('instruction_board') as Phaser.GameObjects.Container;
        if (!container) return;
        const instructionText = container.getByName('instruction_text') as Phaser.GameObjects.Text;
        const overlay = instructionText.getData('overlay') as TextOverlay;
        instructionText.setText(text);
        overlay.updateContent(text);

        this.scene.tweens.add({
            targets: container,
            alpha: show ? 1 : 0,
            duration: 500,
            ease: 'Power1',
        });
    }

    private gameOver() {
        if (!this.isInstructionMode) {
            const finalScore = this.scoreHelper.endGame();
            this.scene.scene.start('Scoreboard', {
                totalRounds: this.scoreHelper.getTotalQuestions(),
                rounds: this.scoreHelper.getCorrectAnswers(),
                score: finalScore,
            });
        }
    }

    private animateFinishLine() {
        // Create finish line container
        this.finishLine = this.scene.addImage(
            this.scene.display.width / 2,
            220,
            'finish_line'
        ).setOrigin(0.5, 1).setScale(0.23).setDepth(1).setName('finish_line');

        const carBoard = this.car?.getByName('car_board') as Phaser.GameObjects.Image;
        carBoard?.destroy();
        const carAnswerText = this.car?.getByName('car_answer_text') as Phaser.GameObjects.Text;
        carAnswerText?.destroy();
    }

    private updateFinishLine() {
        if (this.isGamePaused) return;
        
        if (!this.finishLine) return;
        
        // Use the same perspective speed system as boards and potholes
        const startY = this.scene.getScaledValue(220);
        const endY = this.scene.getScaledValue(this.scene.display.height);
        const currentY = this.finishLine.y;
        const progress = Math.max(0, Math.min(1, (currentY - startY) / (endY - startY)));

        const perspectiveSpeed = this.getPerspectiveSpeed(this.roadSpeed, progress);
        const newY = currentY + perspectiveSpeed * this.scene.getScaledValue(this.finishLine.scale);
        this.finishLine.setY(newY);

        // Update scale based on progress (0.25 to 2.0)
        const scale = 0.25 + (progress * 2.25);
        this.finishLine.setScale(scale);

        const alpha = progress < 0.05 ? progress * 20 : progress > 0.95 ? (1.1 - progress) * 20 : 1;
        this.finishLine.setAlpha(alpha);

        // Remove when it reaches the final position
        if (newY >= endY) {
            this.gameOver();
        }
    }

    private resetGame() {
        this.questionSelector?.reset();
        this.scoreHelper.reset();
    }

    public moveCar(direction: number) {
        if (this.isInstructionMode) {
            if (!this.controlsEnabled) return;
            if (this.currentQuestion?.allowedDirection !== direction) {
                return;
            }
        }

        if (!this.car) return;

        if (this.isGamePaused) return;
        
        const newIndex = Phaser.Math.Clamp(this.currentLaneIndex + direction, 0, 2);
        if (newIndex !== this.currentLaneIndex) {
            this.currentLaneIndex = newIndex;
            this.resetCarPosition(newIndex);

            // Announce lane change for accessibility (localized)
            try {
                const laneKeys = ['left', 'center', 'right'] as const;
                const laneKey = laneKeys[newIndex] ?? 'center';
                const laneLabel = i18n.t(`game.lane.${laneKey}`);
                announceToScreenReader(i18n.t('game.movedToLane', { lane: laneLabel }));
            } catch (e) {
                // console.warn('Lane announce failed', e);
            }
        }

        this.scene.events.emit('car_moved');
    }

    private resetCarPosition(laneIndex: number) {
        if (!this.car) return;

        const carImage = this.car.getByName('car') as Phaser.GameObjects.Image;

        const newX = this.scene.display.width / 2 + this.LANE_OFFSET * (laneIndex - 1);
        this.car.setX(this.scene.getScaledValue(newX));

        let carXOffset = 25;
        if (this.selectedCar === 'red') carXOffset = 25;
        else if (this.selectedCar === 'yellow') carXOffset = 10;
        else if (this.selectedCar === 'pink') carXOffset = 25;

        if (laneIndex === 0) {
            carImage.setTexture(`${this.selectedCar}_car_left`);
            carImage.setX(this.scene.getScaledValue(carXOffset));
            carImage.setRotation(Phaser.Math.DegToRad(-15));
        } else if (laneIndex === 1) {
            carImage.setTexture(`${this.selectedCar}_car_center`);
            carImage.setX(this.scene.getScaledValue(0));
            carImage.setRotation(Phaser.Math.DegToRad(0));
        } else {
            carImage.setTexture(`${this.selectedCar}_car_right`);
            carImage.setX(this.scene.getScaledValue(-carXOffset));
            carImage.setRotation(Phaser.Math.DegToRad(15));
        }
    }

    public showAnswerInstruction() {
        if (!this.currentQuestion) return;
        const opr1 = parseFloat(this.currentQuestion.operand1);
        const opr2 = parseFloat(this.currentQuestion.operand2);
        const answer = parseFloat(this.currentQuestion.answer);
        if(answer < opr1) {
            this.updateInstructionText(i18n.t('game.instruction1', { answer, operand1: opr1 }), true);
        } else if(opr1 < answer && answer < opr2) {
            this.updateInstructionText(i18n.t('game.instruction2', { answer, operand1: opr1, operand2: opr2 }), true);
        } else if(opr2 < answer) {
            this.updateInstructionText(i18n.t('game.instruction3', { answer, operand2: opr2 }), true);
        }
    }

    private checkAnswer() {
        if (!this.currentQuestion || !this.car) return;

        const leftValue = parseFloat(this.currentQuestion.operand1);
        const rightValue = parseFloat(this.currentQuestion.operand2);
        const answer = parseFloat(this.currentQuestion.answer);

        let correctLane = 1;
        if (answer <= leftValue) {
            correctLane = 0;
        } else if (answer >= rightValue) {
            correctLane = 2;
        }

        const optionsDisplay = [
            { option: `<= ${leftValue}`, isCorrect: correctLane === 0 },
            { option: `between ${leftValue} and ${rightValue}`, isCorrect: correctLane === 1 },
            { option: `>= ${rightValue}`, isCorrect: correctLane === 2 },
        ];
    
        const studentResponse = optionsDisplay[this.currentLaneIndex]?.option ?? '';

        const carImage = this.car.getByName('car') as Phaser.GameObjects.Image;
        const carBoard = this.car?.getByName('car_board') as Phaser.GameObjects.Image;
        const carAnswerText = this.car?.getByName('car_answer_text') as Phaser.GameObjects.Text;

        const questionBoardLeft = this.movingBoards.find(board => board.side === 'left')?.container.getByName('question_board') as Phaser.GameObjects.Image;
        const questionBoardRight = this.movingBoards.find(board => board.side === 'right')?.container.getByName('question_board') as Phaser.GameObjects.Image;

        if (this.currentLaneIndex === correctLane) {
            announceToScreenReader(i18n.t('common.correctFeedback'));
            carBoard.setTexture('car_board_correct');
            carAnswerText.setColor('#000000');
            questionBoardLeft?.setTexture('question_board_correct');
            questionBoardRight?.setTexture('question_board_correct');
            this.scene.audioManager.playSoundEffect('car_correct_sfx');

            if (!this.isInstructionMode) {
                this.analyticsHelper?.createTrial({
                    questionMaxPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                    achievedPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                    questionText: this.currentQuestion.answer,
                    isCorrect: true,
                    questionMechanic: 'default',
                    gameLevelInfo: 'game.digit_drive.default',
                    studentResponse: studentResponse,
                    studentResponseAccuracyPercentage: '100%',
                    optionsDisplay: optionsDisplay,
                });
                this.scoreHelper.answerCorrectly();
                this.questionSelector?.answerCorrectly();
                this.scoreCoins?.updateScoreDisplay(true);
                
                // Update progress bar
                const progress = this.questionSelector!.getTotalQuestionsAnswered() / this.totalQuestions;
                this.progressBar?.drawProgressFill(progress, this.scoreHelper.getCurrentStreak());

                this.scene.time.delayedCall(2000, () => {
                    this.isGamePaused = false;
                });
            } else {
                // Emmit correctanswer event
                this.scene.events.emit('correctanswer');
            }

            if (this.scoreHelper.showStreakAnimation()) {
                this.showMascotCelebration();
            }
        } else {
            announceToScreenReader(i18n.t('common.incorrectFeedback'));
            carBoard.setTexture('car_board_incorrect');
            carAnswerText.setColor('#000000');
            questionBoardLeft?.setTexture('question_board_incorrect');
            questionBoardRight?.setTexture('question_board_incorrect');
            const skidSound = this.scene.audioManager.playSoundEffect('car_incorrect_sfx');

            if (!this.isInstructionMode) {
                this.analyticsHelper?.createTrial({
                    questionMaxPoints: (this.scoreHelper.getCurrentMultiplier() || 1),
                    achievedPoints: 0,
                    questionText: this.currentQuestion.answer,
                    isCorrect: false,
                    questionMechanic: 'default',
                    gameLevelInfo: 'game.digit_drive.default',
                    studentResponse: studentResponse,
                    studentResponseAccuracyPercentage: '0%',
                    optionsDisplay: optionsDisplay,
                });

                this.scoreHelper.answerIncorrectly();
                this.questionSelector?.answerIncorrectly(this.currentQuestion);
                this.scoreCoins?.updateScoreDisplay(false);
                
                // Update progress bar
                const progress = this.questionSelector!.getTotalQuestionsAnswered() / this.totalQuestions;
                this.progressBar?.drawProgressFill(progress, this.scoreHelper.getCurrentStreak());

                let skidXOffset = 80;
                if (this.selectedCar === 'red') skidXOffset = 80;
                else if (this.selectedCar === 'yellow') skidXOffset = 50;
                else if (this.selectedCar === 'pink') skidXOffset = 30;

                carImage.setRotation(0);
                if (this.currentLaneIndex === 0) {
                    carImage.setTexture(`${this.selectedCar}_car_skid_left`);
                    carImage.x -= this.scene.getScaledValue(skidXOffset);
                } else if (this.currentLaneIndex === 1 || this.currentLaneIndex === 2) {
                    carImage.setTexture(`${this.selectedCar}_car_skid_right`);
                    carImage.x += this.scene.getScaledValue(skidXOffset);
                }

                skidSound?.on('complete', () => {
                    this.resetCarPosition(this.currentLaneIndex);
                    this.showAnswerInstruction();
                    continueGameAfterWrongAnswer(this.scene, () => {
                        this.isGamePaused = false;
                        this.updateInstructionText('', false);
                    })
                });
            }
        }
    }

    private createSpeedometer() {
        const speedometer = this.scene.add.container(this.scene.getScaledValue(1168.5), this.scene.getScaledValue(683.5)).setDepth(10);
        speedometer.setName('speedometer');

        const speedometerImage = this.scene.addImage(0, 0, 'speedometer').setOrigin(0.5).setName('speedometer_bg');

        const speedText = this.scene.addText(0, -33, i18n.t('common.speed').toUpperCase(), {
            font: '500 16px Exo'
        }).setOrigin(0.5);
        
        const calcSpeed = this.getSpeedValue(this.roadSpeed);
        const speedVal = this.scene.addText(0, 5, calcSpeed.toString(), {
            font: '700 42px Exo'
        }).setOrigin(0.5).setName('speed_value');

        const kmphText = this.scene.addText(0, 40, 'km/h', {
            font: '500 16px Exo'
        }).setOrigin(0.5);
        
        speedometer.add([speedometerImage, speedText, speedVal, kmphText]);
        new TextOverlay(this.scene, speedText, { label: i18n.t('common.speed') });
        this.speedTextOverlay = new TextOverlay(this.scene, speedVal, { label: calcSpeed.toString() + ' km/h' });
    }

    private updateRoadSpeed(increase: boolean): void {
        if (this.isInstructionMode) return;

        if (increase) {
            this.roadSpeed = Math.min(this.ROAD_SPEED_MAX, this.roadSpeed + this.ROAD_SPEED_INCREMENT);
        } else {
            this.roadSpeed = Math.max(this.ROAD_SPEED_MIN, this.roadSpeed - this.ROAD_SPEED_INCREMENT);
        }

        const calcSpeed = this.getSpeedValue(this.roadSpeed);

        const speedometer = this.scene.children.getByName('speedometer') as Phaser.GameObjects.Container;
        const speedValText = speedometer.getByName('speed_value') as Phaser.GameObjects.Text;
        speedValText.setText(calcSpeed.toString());
        this.speedTextOverlay?.updateContent(calcSpeed.toString() + ' km/h');
    }

    private getSpeedValue(speed: number): number {
        return Math.round((speed - this.ROAD_SPEED_MIN) / (this.ROAD_SPEED_MAX - this.ROAD_SPEED_MIN) * (this.SPEEDOMETER_MAX_SPEED - this.SPEEDOMETER_MIN_SPEED) + this.SPEEDOMETER_MIN_SPEED);
    }

    private createMovingBoard(side: 'left' | 'right', value: string): MovingBoard {
        const startY = this.scene.getScaledValue(212);
        const container = this.scene.add.container(0, startY).setDepth(2);
        
        // Create board image
        const boardImage = this.scene.addImage(0, 0, 'question_board').setOrigin(0.5).setName('question_board');
        if (side === 'left') boardImage.setOrigin(1, 1);
        if (side === 'right') {
            boardImage.setFlipX(true);
            boardImage.setOrigin(0, 1);
        }
        
        // Create text
        const textOffsetX = side === 'left' ? -206/2 : 206/2;
        const text = this.scene.addText(textOffsetX, -210, value, {
            font: '700 46px Exo',
            color: '#000000',
        }).setOrigin(0.5).setName('board_text');
        
        container.add([boardImage, text]);
        
    const labelText = side === 'left' ? i18n.t('game.leftBoard', { value: value }) : i18n.t('game.rightBoard', { value: value });
    // avoid announcing each board separately (can get split); leave overlay for accessibility
    new TextOverlay(this.scene, text, { label: labelText, announce: false });
        
        const board: MovingBoard = {
            container,
            side,
            value
        };
        
        // Set initial position and scale
        this.updateBoardTransform(board);
        
        return board;
    }

    private getPerspectiveSpeed(
        roadSpeed: number,
        progress: number,
        {
          minFactor = 5,  // calm at start
          maxFactor = 100,  // aggressive at end
          power = 2  // >2 makes it steeper near the end
        } = {}
      ): number {
        const t = Math.pow(progress, power); // squashes curve toward the end
        const factor = minFactor + (maxFactor - minFactor) * t;
        return roadSpeed * factor;
      }

    private updateMovingBoards() {
        if (this.isGamePaused) return;

        for (let i = this.movingBoards.length - 1; i >= 0; i--) {
            const board = this.movingBoards[i];
            
            // Move the board down the road
            const boardHeight = 290;
            const startY = this.scene.getScaledValue(212);
            const endY = this.scene.getScaledValue(this.scene.display.height);
            const currentY = board.container.y;
            const progress = Math.max(0, Math.min(1, (currentY - startY) / (endY - startY)));

            // const perspectiveSpeed = this.roadSpeed + this.roadSpeed * progress * 50;
            const perspectiveSpeed = this.getPerspectiveSpeed(this.roadSpeed, progress);
            
            const newY = currentY + perspectiveSpeed * this.scene.getScaledValue(board.container.scale);
            board.container.setY(newY);

            if (!this.answerChecked && this.car && newY >= (this.car.y + this.scene.getScaledValue(100))) {
                this.checkAnswer();
                this.answerChecked = true;
                if (!this.isInstructionMode) {
                    this.isGamePaused = true;
                    // this.scene.time.delayedCall(2000, () => {
                    //     this.isGamePaused = false;
                    // });
                }
            }
            
            // Remove boards that have passed completely off screen
            const endYBoard = this.scene.getScaledValue(this.scene.display.height + boardHeight * 2);
            if (newY > endYBoard) {
                board.container.destroy();
                this.movingBoards.splice(i, 1);
                continue;
            }
            
            // Update position and scale based on current Y position
            this.updateBoardTransform(board);
        }
    }

    private updateBoardTransform(board: MovingBoard) {
        // Calculate progress based on current Y position
        const startY = this.scene.getScaledValue(212);
        const boardHeight = 290;
        const endY = this.scene.getScaledValue(this.scene.display.height + boardHeight * 2);
        const currentY = board.container.y;
        const progress = Math.max(0, Math.min(1, (currentY - startY) / (endY - startY)));
        
        // Calculate scale (perspective effect)
        // scale 0.25 --> top, 1.0 --> mid, 2 --> bottom
        const scale = 0.25 + (progress * 1.75);
        
        // Calculate X position using a fixed line angle relative to vertical
        const centerX = this.scene.getScaledValue(this.scene.display.width / 2);
        const dy = currentY - startY;
        const angleRad = Phaser.Math.DegToRad(15); // angle of the yellow road lines relative to vertical
        const slope = Math.tan(angleRad); // dx per 1px of y
        const baseHalfGap = this.scene.getScaledValue(37/2); // half the distance between yellow lines at the top (unscaled)

        // Position boards on the yellow lines using angle-driven offset from center
        let x: number;
        const offset = this.scene.getScaledValue(90);
        if (board.side === 'left') {
            x = centerX - (baseHalfGap + dy * slope) + offset * scale;
        } else {
            x = centerX + (baseHalfGap + dy * slope) - offset * scale;
        }
        
        // Apply transformations (only update X position and scale, Y is handled in updateMovingBoards)
        board.container.setX(x);
        board.container.setScale(scale);
        
        // Fade out boards that are very close or far
        const alpha = progress < 0.05 ? progress * 20 : progress > 0.95 ? (1.1 - progress) * 20 : 1;
        board.container.setAlpha(Math.max(0, Math.min(1, alpha)));
    }

    private handleBoardSpawning() {
        // After boards are gone, load next question UI immediately, then add boards after 2s
        if (this.questionSelector?.isGameCompleted()) return;

        if (!this.isInstructionMode) {
            if (this.movingBoards.length === 0) {
                if (!this.boardSpawnTimer) {
                    const hasQuestion = this.prepareNextQuestionUI();
                    if (hasQuestion) {
                        this.boardSpawnTimer = this.scene.time.delayedCall(2000, () => {
                            this.boardSpawnTimer = undefined;
                            this.addBoardsForCurrentQuestion();
                        });
                    }
                }
            } else if (this.boardSpawnTimer) {
                this.boardSpawnTimer.remove(false);
                this.boardSpawnTimer = undefined;
            }
        }
    }

    private prepareNextQuestionUI(): boolean {
        if (this.isInstructionMode) {
            this.currentQuestion = {
                operand1: '0.3',
                operand2: '0.8',
                answer: '0.9',
                allowedDirection: 1
            } as Question;
        } else {
            this.currentQuestion = this.questionSelector?.getNextQuestion() || undefined;
        }
        this.answerChecked = false;

        if (this.car) {
            const carBoard = this.car.getByName('car_board') as Phaser.GameObjects.Image;
            carBoard.setTexture('car_board');
            const carAnswerText = this.car.getByName('car_answer_text') as Phaser.GameObjects.Text;
            carAnswerText.setColor('#FFFFFF');
        }

        if (!this.currentQuestion) {
            this.animateFinishLine();
            return false;
        }

        const carAnswerText = this.car?.getByName('car_answer_text') as Phaser.GameObjects.Text;
        if (carAnswerText) {
            carAnswerText.setText(this.currentQuestion.answer);
            this.carValueTextOverlay?.updateContent(i18n.t('game.carValue', { value: this.currentQuestion.answer }));
        }

        return true;
    }

    private addBoardsForCurrentQuestion() {
        if (!this.currentQuestion) return;
        const leftBoard = this.createMovingBoard('left', this.currentQuestion.operand1);
        const rightBoard = this.createMovingBoard('right', this.currentQuestion.operand2);
        this.movingBoards.push(leftBoard, rightBoard);

        // Announce both signs together so screen readers receive a single, mandatory announcement
        try {
            const leftAnn = i18n.t('game.leftBoard', { value: this.currentQuestion?.operand1 });
            const rightAnn = i18n.t('game.rightBoard', { value: this.currentQuestion?.operand2 });
            announceToScreenReader(`${leftAnn} ${rightAnn}`);
        } catch (e) {
            // fallback: no-op
        }
    }

    private spawnRightPothole() {
        const pothole = this.createMovingPothole('right');
        this.movingPotholes.push(pothole);
    }
    private spawnLeftPothole() {
        const pothole = this.createMovingPothole('left');
        this.movingPotholes.push(pothole);
    }

    private createMovingPothole(side: 'left' | 'right') {
        const startY = this.scene.getScaledValue(212);
        const container = this.scene.add.container(0, startY);

        const randomPothole = Math.floor(Math.random() * 5) + 1;
        const textureKey = `road_obj_${randomPothole}`;

        const randomX = Math.floor(Math.random() * 350) + 250;
        const startX = side === 'left' ? -randomX : randomX;
        const potholeImage = this.scene.addImage(startX, 0, textureKey).setOrigin(0.5, 0).setScale(0.7);

        if (side === 'right') potholeImage.setFlipX(true);

        container.add([potholeImage]);
        
        this.updatePotholeTransform(container, side);

        return { container, side } as { container: Phaser.GameObjects.Container; side: 'left' | 'right' };
    }

    private updateMovingPotholes() {
        if (this.isGamePaused) return;

        for (let i = this.movingPotholes.length - 1; i >= 0; i--) {
            const pothole = this.movingPotholes[i];

            const startY = this.scene.getScaledValue(212);
            const endY = this.scene.getScaledValue(this.scene.display.height);
            const currentY = pothole.container.y;
            const progress = Math.max(0, Math.min(1, (currentY - startY) / (endY - startY)));

            // const perspectiveSpeed = this.roadSpeed > 0 ? this.roadSpeed + Math.min(10, progress * 15) : 0;
            const perspectiveSpeed = this.getPerspectiveSpeed(this.roadSpeed, progress);
            const newY = currentY + perspectiveSpeed * this.scene.getScaledValue(pothole.container.scale);
            pothole.container.setY(newY);

            const endYBoard = this.scene.getScaledValue(this.scene.display.height * 1.5);
            if (newY > endYBoard) {
                pothole.container.destroy();
                this.movingPotholes.splice(i, 1);
                continue;
            }

            this.updatePotholeTransform(pothole.container, pothole.side);
        }
    }

    private updatePotholeTransform(container: Phaser.GameObjects.Container, side: 'left' | 'right') {
        const startY = this.scene.getScaledValue(212);
        const endY = this.scene.getScaledValue(this.scene.display.height * 1.5);
        const currentY = container.y;
        const progress = Math.max(0, Math.min(1, (currentY - startY) / (endY - startY)));

        const scale = 0.5 + (progress * 1.5);

        const centerX = this.scene.getScaledValue(this.scene.display.width / 2);
        const dy = currentY - startY;
        const angleRad = Phaser.Math.DegToRad(45);
        const slope = Math.tan(angleRad);
        const baseHalfGap = this.scene.getScaledValue(37 / 2);

        let x: number;
        const offset = this.scene.getScaledValue(16);
        if (side === 'left') {
            x = centerX - (baseHalfGap + dy * slope) + offset * scale;
        } else {
            x = centerX + (baseHalfGap + dy * slope) - offset * scale;
        }

        container.setX(x);
        container.setScale(scale);

        const alpha = progress < 0.05 ? progress * 20 : progress > 0.95 ? (1.1 - progress) * 20 : 1;
        container.setAlpha(Math.max(0, Math.min(1, alpha)));
    }

    private handlePotholeSpawning() {
        const lastLeftPothole = this.movingPotholes.slice().reverse().find(p => p.side === 'left') || null;
        const lastRightPothole = this.movingPotholes.slice().reverse().find(p => p.side === 'right') || null;
    
        const leftY = Math.floor(Math.random() * 150) + 250;
        const rightY = Math.floor(Math.random() * 150) + 250;

        if (lastLeftPothole && lastLeftPothole.container.y >= this.scene.getScaledValue(leftY)) {
            this.spawnLeftPothole();
        }
        
        if (lastRightPothole && lastRightPothole.container.y >= this.scene.getScaledValue(rightY)) {
            this.spawnRightPothole();
        }
    }

    private handleBuildingMovement(delta: number) {
        if (!this.building || this.isGamePaused) return;

        if (this.building.y > this.scene.getScaledValue(this.scene.display.height / 2 - 300)) {
            this.building.setY(this.building.y - delta * 0.01 * this.roadSpeed);
        }
    }

    private showMascotCelebration(cb?: () => void) {
        this.scene.time.delayedCall(500, () => {
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

    private createButtons() {
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
            x: this.scene.display.width - 56,
            y: 60,
            raisedOffset: 3.5,
            onClick: () => {
                this.scene.scene.pause();
                this.scene.scene.launch("PauseScene", { parentScene: "GameScene" });
                this.scene.audioManager.pauseAll();
                this.scene.scene.bringToTop("PauseScene");
            },
        }).setDepth(100).setName('pause_btn');

        // Mute button
        const muteBtn = ButtonHelper.createIconButton({
            scene: this.scene,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.UNMUTE_ICON.KEY,
            label: i18n.t('common.mute'),
            ariaLive: 'off',
            x: this.scene.display.width - 56,
            y: 146,
            raisedOffset: 3.5,
            onClick: () => {
                this.scene.audioManager.setMute(!this.scene.audioManager.getIsAllMuted());
            },
        }).setDepth(100);

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
        this.scene.events.on('update', handleMuteBtnUpdate);
        // Remove event listener when mute button is destroyed
        muteBtn.on('destroy', () => {
            this.scene.events.off('update', handleMuteBtnUpdate);
        });

        // Volume slider
        const volumeSlider = new VolumeSlider(this.scene);
        volumeSlider.create(this.scene.display.width - 220, 238, 'blue', i18n.t('common.volume'));
        ButtonHelper.createIconButton({
            scene: this.scene,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.SETTINGS_ICON.KEY,
            label: i18n.t('common.volume'),
            x: this.scene.display.width - 56,
            y: 232,
            raisedOffset: 3.5,
            onClick: () => {
                volumeSlider.toggleControl();
            },
        }).setDepth(100);

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
            x: this.scene.display.width - 56,
            y: 318,
            raisedOffset: 3.5,
            onClick: () => {
                this.scene.audioManager.pauseAll();
                this.scene.scene.pause();
                this.scene.scene.launch('InstructionsScene', { parentScene: 'GameScene' });
                this.scene.scene.bringToTop("InstructionsScene");
            },
        }).setDepth(100);
    }
}