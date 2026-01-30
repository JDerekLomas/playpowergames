import { AnalyticsHelper, BaseScene, ButtonHelper, ButtonOverlay, GameConfigManager, ImageOverlay, Question, QuestionSelectorHelper, ScoreCoins, ScoreHelper, TextOverlay, VolumeSlider, announceToScreenReader, focusToGameContainer, getQuestionBankByName, i18n, questionBankNames } from '@k8-games/sdk';
import { NUMBER_AUDIO_CONFIG_EN, NUMBER_AUDIO_CONFIG_ES } from '../config/audioConfig';
import { ASSETS_PATHS, BUTTONS } from '../config/common';

const BEAR_TYPES = ['red', 'blue', 'green', 'purple'];

export class Counting {
    private scene!: BaseScene;
    private scoreCoins!: ScoreCoins;
    private scoreHelper: ScoreHelper;
    private stage!: Phaser.GameObjects.Rectangle;
    private shipCharacters: Phaser.GameObjects.Container[] = [];
    public characterOptions: Phaser.GameObjects.Container[] = [];
    public dropZone!: Phaser.GameObjects.Image;
    private currentExpectedNumber: number = 3;
    private lang: string = i18n.getLanguage() || 'en';
    private analyticsHelper!: AnalyticsHelper;

    // Question bank / selector
    private questionSelector!: QuestionSelectorHelper;
    private currentQuestion!: Question;
    private currentQuestionIndex: number = 0;
    private totalQuestions: number = 10;
    private currentSeatIndex: number = 3;
    private bearColor = BEAR_TYPES[0];

    // Layers
    private worldContainer!: Phaser.GameObjects.Container;
    private backgroundLayer!: Phaser.GameObjects.Container;
    private shipLayer!: Phaser.GameObjects.Container;
    private oceanLayer!: Phaser.GameObjects.Container;
    private dockLayer!: Phaser.GameObjects.Container;

    // Question volume icon properties
    private questionVolumeIcon!: Phaser.GameObjects.Container;
    private isQuestionAudioPlaying: boolean = false;
    private questionAudioTween!: Phaser.Tweens.Tween;
    private currentQuestionAudio!: Phaser.Sound.WebAudioSound | null;

    // Instruction mode
    private isInstructionMode: boolean = false;
    private isStepTenTutorialPlayed: boolean = false;
    private isStepTen: boolean = false;

    // Accessibility overlays for tab navigation
    private characterOverlays: Map<Phaser.GameObjects.Container, ImageOverlay> = new Map();
    private dropZoneOverlay?: ImageOverlay;

    // Keyboard interaction state
    private selectedCharacterForKeyboard?: Phaser.GameObjects.Container;
    private selectedCharacterIndicator?: Phaser.GameObjects.Graphics;

    private overlayPrevStates: Map<ImageOverlay, { hidden: boolean; tabIndex: string | null; pointerEvents: string; }> = new Map();

    constructor(scene: BaseScene, isInstructionMode: boolean = false) {
        this.scene = scene;
        this.isInstructionMode = isInstructionMode;
        this.scoreHelper = new ScoreHelper(2); // Base bonus of 2 for streaks

        // Initialize question selector based on topic from URL/config
        const gameConfigManager = GameConfigManager.getInstance();
        const topic = gameConfigManager.get('topic') || 'gradeK_topic10';

        let bankNameKey;
        if (topic === 'gradeK_topic10') {
            bankNameKey = questionBankNames.gradeK_topic10;
        } else if (topic === 'gradeK_topic12') {
            bankNameKey = questionBankNames.gradeK_topic12;
        } else if (topic === 'grade1_topic7') {
            bankNameKey = questionBankNames.grade1_topic7;
        } else {
            bankNameKey = questionBankNames.gradeK_topic10;
        }

        const questionBank = getQuestionBankByName(bankNameKey);
        if (questionBank) {
            this.questionSelector = new QuestionSelectorHelper(questionBank, this.totalQuestions);
        }
    }

    static _preload(scene: BaseScene) {
        const lang = i18n.getLanguage() || 'en';

        ScoreCoins.preload(scene, 'blue');
        VolumeSlider.preload(scene, 'blue');

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen`);
        scene.load.image('bg', 'bg.png');
        scene.load.image('question_board', 'question_board.png');
        scene.load.image('water_waves', 'water_waves.png');
        scene.load.image('cloud', 'cloud.png');
        scene.load.image('steam_puff', 'steam_puff.png');
        scene.load.image('dock', 'dock.png');
        scene.load.image('correct_icon', 'correct_icon.png');

        // Load volume icons
        scene.load.image("volume", "volume.png");
        scene.load.image("volume_1", "volume_1.png");
        scene.load.image("volume_2", "volume_2.png");
        // scene.load.image("volume_off", "volume_off.png");

        // Load ship
        scene.load.image('ship_base', 'ship_base.png');
        scene.load.image('ship_top', 'ship_top.png');
        scene.load.image('seat', 'seat.png');
        scene.load.image('seat_drop_zone', 'seat_drop_zone.png');

        // Load bear animations (atlases)
        scene.load.setPath(`${ASSETS_PATHS.ATLAS}/bear`);
        BEAR_TYPES.forEach(type => scene.load.atlas(`${type}_bear`, `${type}_bear.png`, `${type}_bear.json`));

        // Load audio
        scene.load.setPath(ASSETS_PATHS.AUDIOS);
        scene.load.audio('bg_music', 'bg_music.mp3');
        scene.load.audio('ship_horn', 'ship_horn.mp3');
        scene.load.audio('positive-sfx', 'positive.wav');
        scene.load.audio('negative-sfx', 'negative.wav');

        // Load question audio
        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/game_screen`);
        scene.load.audio(`numbers_${lang}`, `numbers_${lang}.mp3`);
        scene.load.audio('which_number', `which_number_${lang}.mp3`);

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
        // scene.load.image(BUTTONS.HALF_BUTTON.KEY, BUTTONS.HALF_BUTTON.PATH);
        // scene.load.image(BUTTONS.HALF_BUTTON_HOVER.KEY, BUTTONS.HALF_BUTTON_HOVER.PATH);
        // scene.load.image(BUTTONS.HALF_BUTTON_PRESSED.KEY, BUTTONS.HALF_BUTTON_PRESSED.PATH);
    }

    init(data?: { reset?: boolean, isStepTen?: boolean }) {
        if (data?.reset) {
            this.resetGame();
        }
        if (data) {
            this.isStepTen = data.isStepTen || false;
        }
        ScoreCoins.init(this.scene);
        // Create bear animations
        BEAR_TYPES.forEach(type => this.createCharacterAnimation(type));
    }

    create() {
        if (!this.isInstructionMode) {
            const _analyticsHelper = AnalyticsHelper.getInstance();
            if (_analyticsHelper) {
                this.analyticsHelper = _analyticsHelper;
            } else {
                console.error('AnalyticsHelper not found');
            }
            this.analyticsHelper?.createSession('game.count_the_crew.default');
        }
        
        this.createLayers();

        this.createUI();

        this.registerScenePauseResumeHandlers();

        if (!this.isInstructionMode) {
            // Create score coins
            this.scoreCoins = new ScoreCoins(this.scene, this.scoreHelper, i18n, 'blue');
            this.scoreCoins.create(
                this.scene.getScaledValue(90),
                this.scene.getScaledValue(62)
            );
            // Create control buttons
            this.createControlButtons();

            // Play bg music
            this.scene.audioManager.playBackgroundMusic('bg_music');
        }

        this.loadNextQuestion();
    }

    private createLayers() {
        this.worldContainer = this.scene.add.container(0, 0);
        this.backgroundLayer = this.scene.add.container(0, 0);
        this.shipLayer = this.scene.add.container(0, 0);
        this.oceanLayer = this.scene.add.container(0, 0);
        this.dockLayer = this.scene.add.container(0, 0);

        this.worldContainer.add([this.backgroundLayer, this.shipLayer, this.oceanLayer, this.dockLayer]);
    }

    private createUI() {
        this.createQuestionBoard();

        const bg = this.scene.addImage(this.scene.display.width / 2, this.scene.display.height / 2, 'bg');
        bg.setName('bg');
        this.backgroundLayer.add(bg);
        this.animateClouds();

        const dock = this.scene.addImage(this.scene.display.width / 2, this.scene.display.height - 111, 'dock');
        dock.setName('dock');
        this.dockLayer.add(dock);

        const waterWaves = this.scene.addImage(this.scene.display.width / 2, 596, 'water_waves');
        waterWaves.setName('water_waves');
        this.oceanLayer.add(waterWaves);
        this.animateWaterWaves();

        const ship = this.createShip();
        ship.setName('ship');
        this.shipLayer.add(ship);
        this.animateShip();
    }

    private createQuestionBoard() {
        const questionBoardX = this.scene.getScaledValue(this.scene.display.width / 2);
        const questionBoardY = this.scene.getScaledValue(this.isInstructionMode ? 146 : 75);
        const questionBoard = this.scene.add.container(questionBoardX, questionBoardY);
        questionBoard.setName('question_board');

        // Background
        const bg = this.scene.addImage(0, 0, 'question_board');
        bg.setName('bg');

        let textX = 0;
        if (this.isInstructionMode) {
            textX = -35;
        }

        // Text
        const text = this.scene.addText(textX, 0, i18n.t('game.whichNumberComesAfter'), {
            font: '700 30px Exo',
            color: '#000000'
        });
        text.setOrigin(0.5);

        // Number
        const numberX = textX + text.width / 2 + 40;
        const number = this.scene.addText(numberX, 0, '2', {
            font: '700 30px Exo',
            color: '#000000'
        });
        number.setName('number');
        number.setOrigin(0.5);

        // Number background
        const numberBg = this.scene.addCircle(numberX, -3, 31, 0xFFE77E, 1);
        numberBg.setName('number_bg');

        const questionMark = this.scene.addText(numberX + 45, 0, '?', {
            font: '700 30px Exo',
            color: '#000000',
        });
        questionMark.setOrigin(0.5);

        // Add text overlay
        const textOverlay = new TextOverlay(this.scene, text, {
            label: `${i18n.t('game.whichNumberComesAfter')} ${number.toString()} ?`,
            style: {
                top: `${questionBoardY}px`,
                left: `${questionBoardX}px`,
            }
        })

        questionBoard.setData('textOverlay', textOverlay);

        questionBoard.add([bg, text, numberBg, number, questionMark]);

        if (!this.isInstructionMode) {
            const volumeIconX = this.scene.getScaledValue(- text.width / 2 - 40);
            const volumeIconY = this.scene.getScaledValue(-3);
            this.createQuestionVolumeIcon(volumeIconX, volumeIconY);
            questionBoard.add(this.questionVolumeIcon);
        }

    }

    private updateQuestionBoard(number: number) {
        const questionBoard = this.scene.children.getByName('question_board') as Phaser.GameObjects.Container;
        const numberText = questionBoard.getByName('number') as Phaser.GameObjects.Text;
        const textOverlay = questionBoard.getData('textOverlay') as TextOverlay;
        textOverlay.updateContent(`${i18n.t('game.whichNumberComesAfter')} ${number.toString()} ?`);
        numberText.setText(number.toString());
    }

    private resetFocusToFirstOption() {
        const overlay = this.characterOverlays.get(this.characterOptions[0]);
        if (overlay) {
            overlay.element.focus({ preventScroll: true });
        }
    }

    private animateQuestionBoard(direction: 'up' | 'down') {
        const questionBoard = this.scene.children.getByName('question_board') as Phaser.GameObjects.Container;

        this.scene.tweens.add({
            targets: questionBoard,
            y: direction === 'up' ? this.scene.getScaledValue(-100) : this.scene.getScaledValue(75),
            duration: 1000,
            ease: direction === 'up' ? 'Sine.easeIn' : 'Sine.easeOut',
            onStart: () => {
                if (direction === 'up') {
                    questionBoard.setY(this.scene.getScaledValue(75));
                } else {
                    questionBoard.setY(this.scene.getScaledValue(-100));
                }
            }
        });
    }

    private createShip() {
        const shipX = this.scene.display.width / 2;
        const shipY = this.scene.display.height / 2;
        const container = this.scene.add.container(this.scene.getScaledValue(shipX), this.scene.getScaledValue(shipY));
        container.setName('ship');

        const shipBase = this.scene.addImage(0, 120, 'ship_base');
        shipBase.setName('ship_base');

        const shipTop = this.scene.addImage(440, -75, 'ship_top');
        shipTop.setName('ship_top');

        const seats: Phaser.GameObjects.Image[] = [];
        let seatWidth = 100;
        let seatHeight = 100;
        for (let i = 1; i <= 10; i++) {
            const seat = this.scene.addImage(0, 0, 'seat');
            seat.setName(`seat_${i}`);
            seats.push(seat);
            seatWidth = seat.displayWidth;
            seatHeight = seat.displayHeight;
        }

        Phaser.Actions.GridAlign(seats, {
            width: 10,
            height: 1,
            cellWidth: seatWidth + this.scene.getScaledValue(34),
            cellHeight: seatHeight,
            x: -shipBase.displayWidth / 2 + this.scene.getScaledValue(18),
            y: this.scene.getScaledValue(-12),
            position: Phaser.Display.Align.CENTER,
        });

        container.add([shipTop, ...seats, shipBase]);

        return container;
    }

    private animateShip() {
        const ship = this.shipLayer.getByName('ship') as Phaser.GameObjects.Container;

        this.scene.tweens.add({
            targets: ship,
            y: '-=' + this.scene.getScaledValue(5),
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    private animateShipPosition(type: 'start' | 'end'): Promise<boolean> {
        const ship = this.shipLayer.getByName('ship') as Phaser.GameObjects.Container;
        const shipBase = ship.getByName('ship_base') as Phaser.GameObjects.Image;
        const waterWaves = this.oceanLayer.getByName('water_waves') as Phaser.GameObjects.Image;

        const displayWidth = this.scene.getScaledValue(this.scene.display.width);
        const newX = type === 'start' ? displayWidth + shipBase.displayWidth / 2 : displayWidth / 2;
        ship.setX(newX);
        waterWaves.setX(newX);

        const targetX = type === 'start' ? displayWidth / 2 : -shipBase.displayWidth / 2;

        // Animate steam puff only on end
        if (type === 'end') {
            this.animateSteamPuff();
        }

        return new Promise((resolve) => {
            this.scene.tweens.add({
                targets: [ship, waterWaves],
                x: targetX,
                duration: 5000,
                delay: type === 'start' ? 0 : 2000,
                ease: type === 'start' ? 'Sine.easeOut' : 'Sine.easeIn',
                onComplete: () => {
                    if (type === 'start') {
                        this.animateSteamPuff();
                    }
                    resolve(true);
                },
                onStart: () => {
                }
            });
        });
    }

    private animateSteamPuff() {
        const ship = this.shipLayer.getByName('ship') as Phaser.GameObjects.Container;

        const startX = 480;
        const startY = -205;
        const endX = 500;
        const endY = -320;

        // Play ship horn
        this.scene.audioManager.playSoundEffect('ship_horn');

        const handleSteamPuff = () => {
            const steamPuff = this.scene.addImage(startX, startY, 'steam_puff');
            steamPuff.setScale(0.38);
            ship.add(steamPuff);

            this.scene.tweens.add({
                targets: steamPuff,
                scale: this.scene.getScaledValue(0.93),
                alpha: 0.3,
                duration: 1000,
                x: this.scene.getScaledValue(endX),
                y: this.scene.getScaledValue(endY),
                onComplete: () => {
                    steamPuff.destroy();
                }
            });
        }

        this.scene.time.addEvent({
            delay: 400,
            repeat: 2,
            callback: handleSteamPuff
        });

    }

    private animateWaterWaves() {
        const waterWaves = this.oceanLayer.getByName('water_waves') as Phaser.GameObjects.Image;
        this.scene.tweens.add({
            targets: waterWaves,
            y: '-=' + this.scene.getScaledValue(10),
            duration: 1600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    private animateClouds() {
        const clouds = [
            {
                x: 144,
                y: 170,
                scale: 1,
                repeatDelay: 4000,
                startDelay: 0,
                duration: 120_000,
            },
            {
                x: 746,
                y: 276,
                scale: 0.69,
                repeatDelay: 5000,
                startDelay: 0,
                duration: 120_000,
            },
            {
                x: 1268,
                y: 237,
                scale: 0.49,
                repeatDelay: 8000,
                startDelay: 0,
                duration: 120_000,
            },
        ]

        clouds.forEach((cloud) => {
            const cloudImage = this.scene.addImage(cloud.x, cloud.y, 'cloud');
            cloudImage.setScale(cloud.scale);
            this.backgroundLayer.add(cloudImage);

            this.scene.tweens.add({
                targets: cloudImage,
                delay: cloud.startDelay,
                repeatDelay: cloud.repeatDelay,
                alpha: 1,
                duration: cloud.duration,
                repeat: -1,
                onUpdate: (tween: any) => {
                    const cloudImage = tween.targets[0] as Phaser.GameObjects.Image;
                    cloudImage.setX((cloudImage.x + 0.2) % (this.scene.getScaledValue(this.scene.display.width) + cloudImage.displayWidth));
                },
            });
        });
    }

    private createShipCharacters() {
        const startNumber = parseInt(this.currentQuestion.operand1);
        const step = parseInt(this.currentQuestion.step || '1');
        const numbers = [startNumber, startNumber + step];

        numbers.forEach((number) => {
            const bear = this.createNumberCharacter(0, 0, number).setData('onShipInitially', true);
            this.shipCharacters.push(bear);
        });

        const ship = this.shipLayer.getByName('ship') as Phaser.GameObjects.Container;
        const shipBase = ship.getByName('ship_base') as Phaser.GameObjects.Image;

        ship.add(this.shipCharacters);
        ship.bringToTop(shipBase);

        this.updateShipCharactersPosition();
    }

    private updateShipCharactersPosition() {
        const ship = this.shipLayer.getByName('ship') as Phaser.GameObjects.Container;
        const shipBase = ship.getByName('ship_base') as Phaser.GameObjects.Image;

        this.shipCharacters.forEach(character => {
            if (ship.list.indexOf(character) === -1) {
                ship.add(character);
            }
        });

        ship.bringToTop(shipBase);

        const bearWidth = this.scene.getScaledValue(75 + 34)
        const bearHeight = this.shipCharacters[0].displayHeight;

        Phaser.Actions.GridAlign(this.shipCharacters, {
            width: 10,
            height: 1,
            cellWidth: bearWidth,
            cellHeight: bearHeight,
            x: -shipBase.displayWidth / 2 + this.scene.getScaledValue(18),
            y: this.scene.getScaledValue(-50),
            position: Phaser.Display.Align.CENTER,
        });
    }

    public createDropZone() {
        const ship = this.shipLayer.getByName('ship') as Phaser.GameObjects.Container;
        const shipBase = ship.getByName('ship_base') as Phaser.GameObjects.Image;
        const currentSeat = ship.getByName(`seat_${this.currentSeatIndex}`) as Phaser.GameObjects.Image;
        const dropZoneX = currentSeat.x / this.scene.display.scale;
        const dropZoneY = currentSeat.y / this.scene.display.scale;

        this.dropZone = this.scene.addImage(dropZoneX, dropZoneY, 'seat_drop_zone');
        this.dropZone.setName('drop_zone');

        ship.add(this.dropZone);

        ship.bringToTop(shipBase);

        this.scene.tweens.add({
            targets: this.dropZone,
            scale: this.scene.getScaledValue(1.1),
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Create accessibility overlay for tab navigation
        this.dropZoneOverlay = new ImageOverlay(this.scene, this.dropZone, {
            label: `Drop zone for seat ${this.currentSeatIndex}`,
            cursor: 'default',
        });

        // Make it focusable via tab and add keyboard interaction
        const domElement = (this.dropZoneOverlay as any).domElement;
        if (domElement?.node) {
            const htmlElement = domElement.node as HTMLElement;
            htmlElement.setAttribute('tabindex', '0');
            htmlElement.setAttribute('role', 'region');
            htmlElement.setAttribute('aria-label', i18n.t('accessibility.dropZoneSeat', { seatNumber: this.currentSeatIndex }));
            htmlElement.style.outline = 'none';
            
            // Add keyboard event listener for Enter key
            htmlElement.addEventListener('keydown', (event: KeyboardEvent) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.dropSelectedCharacterWithKeyboard();
                }
            });
        }
    }

    private createCharacterOptions() {
        // Build number options from current question sequence (start+2*step .. end, step)
        const startNumber = parseInt(this.currentQuestion.operand1);
        const endNumber = parseInt(this.currentQuestion.operand2);
        const step = parseInt(this.currentQuestion.step || '1');
        const numbers: number[] = [];
        for (let n = startNumber + 2 * step; n <= endNumber; n += step) {
            numbers.push(n);
        }
        const shuffledNumbers = this.shuffleArray([...numbers]);

        const startX = 150; // Start position
        const startY = 645; // Y position for ground

        const characterWidth = 103;
        const spacing = 40;

        shuffledNumbers.forEach((number, index) => {
            const x = startX + (index * (characterWidth + spacing));
            let y = startY;
            if (index % 2 === 1) {
                y += Phaser.Math.Between(30, 50);
            }
            const numberContainer = this.createNumberCharacter(x, y, number, true).setData('onShipInitially', false);
            numberContainer.setData('number', number);
            // Store original position for return functionality
            numberContainer.setData('originalX', x);
            numberContainer.setData('originalY', y);
            this.characterOptions.push(numberContainer);
        });
    }

    private shuffleArray(array: number[]): number[] {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    private createNumberCharacter(x: number, y: number, number: number, draggable: boolean = false): Phaser.GameObjects.Container {
        x = this.scene.getScaledValue(x);
        y = this.scene.getScaledValue(y);

        const scale = 0.58;

        const container = this.scene.add.container(x, y);

        container.setData('value', number);

        const character = this.scene.addSprite(0, 0, `${this.bearColor}_bear`);
        character.setScale(scale);
        character.setName('character');

        // const shadow = this.scene.addImage(0, (character.displayHeight / this.scene.display.scale) / 2 - 10, 'bear_shadow');
        // shadow.setScale(scale);
        // shadow.setName('shadow');

        // Create number text
        const text = this.scene.addText(0, 16, number.toString(), {
            font: '700 32px Exo',
            color: '#FFFFFF'
        });
        text.setName('number_text');
        text.setOrigin(0.5);

        // Add to container
        container.add([character, text]);

        // Set interactive area for the container
        container.setSize(character.displayWidth, character.displayHeight);
        if (draggable) {
            container.setInteractive({
                draggable: true,
                useHandCursor: true,
            });
        } else {
            container.setInteractive();
        }

        // Play ideal animation at random start delay
        character.play({
            key: `${this.bearColor}_bear_dock_stand`,
            delay: Phaser.Math.Between(0, 1000),
        });

        // Start blinking animation
        this.startBlinking(character);
        // Start looking up animation
        this.startLookup(character);

        character.on('animationstart', () => {
            const currAnimKey = character.anims.currentAnim?.key || '';
            const keyList = {
                [`${this.bearColor}_bear_negative_fall`]: 25,
                [`${this.bearColor}_bear_negative_blink`]: 25,
                [`${this.bearColor}_bear_select_dragstart`]: 20,
                [`${this.bearColor}_bear_select_drag`]: 20
            };

            if (keyList[currAnimKey]) {
                text.setY(this.scene.getScaledValue(keyList[currAnimKey]));
            } else {
                text.setY(this.scene.getScaledValue(16));
            }
        });

        container.on('pointerdown', () => {
            // check if the container is in the stage
            if (this.shipCharacters.includes(container)) {
                character.play({
                    key: `${this.bearColor}_bear_positive_dance`,
                    repeat: 1,
                })
                character.once('animationcomplete', () => {
                    character.play(`${this.bearColor}_bear_dock_stand`);
                });
            }
            const config = this.lang === 'en' ? NUMBER_AUDIO_CONFIG_EN : NUMBER_AUDIO_CONFIG_ES;
            // check if number exists in config
            if (config[number]) {
                // Play number audio
                this.scene.audioManager.playAudioSprite(`numbers_${this.lang}`, config[number].start_time, config[number].end_time);
            }
        })

        // Create accessibility overlay for tab navigation
        if (draggable) {
            const overlay = new ImageOverlay(this.scene, character, {
                label: `Number ${number} bear`,
                cursor: 'pointer',
            });
            this.characterOverlays.set(container, overlay);

            // Make it focusable via tab and add keyboard interaction
            const domElement = (overlay as any).domElement;
            if (domElement?.node) {
                const htmlElement = domElement.node as HTMLElement;
                htmlElement.setAttribute('tabindex', '0');
                htmlElement.setAttribute('role', 'button');
                htmlElement.setAttribute('aria-label', i18n.t('accessibility.draggableBear', { number: number }));
                htmlElement.style.outline = 'none';
                
                // Add keyboard event listener for Enter key
                htmlElement.addEventListener('keydown', (event: KeyboardEvent) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        this.selectCharacterForKeyboard(container);
                    }
                });
            }
        }

        return container;
    }

    private startBlinking(character: Phaser.GameObjects.Sprite) {
        const timeEvent = this.scene.time.addEvent({
            delay: 3000,
            callback: () => {
                let currAnimKey = character.anims.currentAnim?.key;
                if (currAnimKey === `${this.bearColor}_bear_dock_lookup`) {
                    return;
                } else if (currAnimKey === `${this.bearColor}_bear_dock_stand`) {
                    character.play({
                        key: `${this.bearColor}_bear_dock_blink`,
                        delay: Phaser.Math.Between(0, 1000),
                    });
                    character.once('animationcomplete', () => {
                        if (character.anims.currentAnim?.key !== `${this.bearColor}_bear_select_dragstart`) {
                            character.play(`${this.bearColor}_bear_dock_stand`);
                        }
                    });
                } else if (currAnimKey === `${this.bearColor}_bear_negative_fall` || currAnimKey === `${this.bearColor}_bear_negative_blink`) {
                    character.play(`${this.bearColor}_bear_negative_blink`);
                }
            },
            loop: true
        });

        character.setData('blinkTimeEvent', timeEvent);

        character.on('destroy', () => {
            timeEvent.destroy();
        });
    }

    private startLookup(character: Phaser.GameObjects.Sprite) {
        const timeEvent = this.scene.time.addEvent({
            delay: 6000,
            callback: () => {
                // Check if the character is on the dock
                if (this.shipCharacters.includes(character.parentContainer!)) {
                    return;
                }
                const currAnimKey = character.anims.currentAnim?.key;
                if (currAnimKey === `${this.bearColor}_bear_dock_stand` || currAnimKey === `${this.bearColor}_bear_dock_blink`) {
                    character.play({
                        key: `${this.bearColor}_bear_dock_lookup`,
                        repeat: 2,
                        delay: Phaser.Math.Between(0, 1000)
                    });
                    character.once('animationcomplete', () => {
                        if (character.anims.currentAnim?.key !== `${this.bearColor}_bear_select_dragstart`) {
                            character.play(`${this.bearColor}_bear_dock_stand`);
                        }
                    });
                }
            },
            loop: true
        });

        character.setData('lookupTimeEvent', timeEvent);

        character.on('destroy', () => {
            timeEvent.destroy();
        });
    }

    private createCharacterAnimation(type: string) {
        const texture = `${type}_bear`;
        const fps = 5;

        const seq = (prefix: string, start: number, end: number) =>
            this.scene.anims.generateFrameNames(texture, {
                prefix,
                start,
                end,
                zeroPad: 4,
                suffix: '.png',
            });

        const make = (
            { key, frames, repeat, frameRate = fps, hideOnComplete = false }: { key: string, frames: Phaser.Types.Animations.AnimationFrame[], repeat: number, frameRate?: number, hideOnComplete?: boolean }
        ) => {
            if (!this.scene.anims.exists(key)) {
                this.scene.anims.create({ key, frames, frameRate, repeat, hideOnComplete });
            }
        };

        // dock
        make({ key: `${type}_bear_dock_blink`, frames: seq('dock/blink/', 1, 4), repeat: 0, });
        make({ key: `${type}_bear_dock_lookup`, frames: seq('dock/lookup/', 1, 4), repeat: 0 });
        make({ key: `${type}_bear_dock_stand`, frames: seq('dock/stand/', 1, 4), repeat: -1, frameRate: 4 });

        // negative
        make({ key: `${type}_bear_negative_blink`, frames: seq('negative/blink/', 1, 4), repeat: 0 });
        make({ key: `${type}_bear_negative_fall`, frames: seq('negative/fall/', 1, 6), repeat: 0 });
        make({ key: `${type}_bear_negative_getup`, frames: seq('negative/getup/', 1, 6), repeat: 0 });

        // positive
        make({ key: `${type}_bear_positive_dance`, frames: seq('positive/dance/', 1, 6), repeat: -1, frameRate: 9 });

        // select
        make({ key: `${type}_bear_select_dragstart`, frames: seq('select/dragstart/', 1, 4), repeat: 0, frameRate: 5 });
        make({ key: `${type}_bear_select_drag`, frames: seq('select/drag/', 1, 4), repeat: -1 });
        make({ key: `${type}_bear_select_dragend`, frames: seq('select/dragend/', 1, 4), repeat: 0, frameRate: 10 });
    }

    private makeAllCharactersStand() {
        this.characterOptions.forEach(container => {
            const character = container.getByName('character') as Phaser.GameObjects.Sprite;
            const currAnimKey = character.anims.currentAnim?.key || '';
            const keyList = [
                `${this.bearColor}_bear_negative_fall`,
                `${this.bearColor}_bear_negative_blink`,
            ]
            if (keyList.includes(currAnimKey)) {
                character.play(`${this.bearColor}_bear_negative_getup`);
                character.once('animationcomplete', () => {
                    character.play(`${this.bearColor}_bear_dock_stand`);
                });
            }
        });
    }

    private async loadNextQuestion() {
        // Get next question from selector
        let nextQuestion: Question | null = null;

        if (this.isInstructionMode) {
            if (this.isStepTen) {
                nextQuestion = {
                    operand1: "10",
                    operand2: "50",
                    answer: "",
                    step: "10",
                };
            } else {
                nextQuestion = {
                    operand1: "1",
                    operand2: "5",
                    answer: "",
                    step: "1",
                };
            }
        } else {
            nextQuestion = this.questionSelector.getNextQuestion();
            if (!nextQuestion) {
                this.gameOver();
                return;
            }
            this.currentQuestionIndex++;
        }

        this.currentQuestion = nextQuestion;

        const startNumber = parseInt(this.currentQuestion.operand1);
        const step = parseInt(this.currentQuestion.step || '1');
        this.currentExpectedNumber = startNumber + 2 * step;
        this.currentSeatIndex = 3;

        // Randomly select bear color other than the current one
        this.bearColor = Phaser.Utils.Array.GetRandom(BEAR_TYPES.filter(color => color !== this.bearColor));

        // Update isStepTen
        this.isStepTen = step === 10;

        // play step ten tutorial if not played
        if (!this.isInstructionMode && this.isStepTen && !this.isStepTenTutorialPlayed) {
            this.isStepTenTutorialPlayed = true;
            this.playTutorial(true);
        }

        // clear all elements
        this.clearAllElements();

        // Update question board (which number comes after X)
        this.updateQuestionBoard(this.currentExpectedNumber - step);

        if (!this.isInstructionMode) {
            this.animateQuestionBoard('down');
        }

        // Create initial stage numbers and options
        this.createShipCharacters();
        this.createCharacterOptions();

        // Animate ship to start position
        await this.animateShipPosition('start');

        if (this.questionSelector.getTotalQuestionsAnswered() > 0) {
            this.resetFocusToFirstOption();
        }

        if (!this.isInstructionMode) {
            // Create drop zone next to second placed number
            this.createDropZone();

            // Setup drag and drop
            this.setupDragAndDrop();
        }
    }

    public setupDragAndDrop() {
        // Clear previous drag and drop listeners
        this.clearDragAndDrop();

        // Handle drag events
        this.scene.input.on('dragstart', this.handleDragStart, this);

        this.scene.input.on('drag', this.handleDrag, this);

        this.scene.input.on('dragend', this.handleDragEnd, this);
    }

    private handleDragStart(_pointer: any, gameObject: Phaser.GameObjects.Container) {
        // Check if the drag container is in the stage
        if (!this.characterOptions.includes(gameObject)) {
            return;
        }
        // stop all tweens on the gameObject
        this.scene.tweens.killTweensOf(gameObject);
        // Make character drag
        // const shadow = gameObject.getByName('shadow') as Phaser.GameObjects.Image;
        // shadow.setVisible(false);
        // Play drag animation
        const character = gameObject.getByName('character') as Phaser.GameObjects.Sprite;
        character.play(`${this.bearColor}_bear_select_dragstart`);
        character.once('animationcomplete', () => {
            character.play({
                key: `${this.bearColor}_bear_select_drag`,
                delay: 1000,
            }, true);
        });
        // Reset scale
        gameObject.setScale(1);
    }

    private handleDrag(_pointer: any, gameObject: Phaser.GameObjects.Container, dragX: number, dragY: number) {
        // Check if the drag container is in the stage
        if (!this.characterOptions.includes(gameObject)) {
            return;
        }
        const character = gameObject.getByName('character') as Phaser.GameObjects.Sprite;
        const currAnimKey = character.anims.currentAnim?.key || '';
        const keyList = [
            `${this.bearColor}_bear_select_dragstart`,
            `${this.bearColor}_bear_select_drag`,
        ]
        if (!keyList.includes(currAnimKey)) {
            character.play(`${this.bearColor}_bear_select_drag`, true);
        }
        gameObject.setPosition(dragX, dragY);
    }

    private handleDragEnd(_pointer: any, gameObject: Phaser.GameObjects.Container) {
        const numberValue = gameObject.getData('number');
        const dropZoneBounds = this.dropZone.getBounds();
        const numberBounds = gameObject.getBounds();

        // Check if the drag container is in the stage
        if (!this.characterOptions.includes(gameObject)) {
            return;
        }

        // Check if dropped in drop zone
        if (Phaser.Geom.Rectangle.Overlaps(dropZoneBounds, numberBounds)) {
            // Check if it's the correct number
            if (numberValue === this.currentExpectedNumber) {
                focusToGameContainer();
                announceToScreenReader(i18n.t('common.correctFeedback'));
                // Correct number dropped
                this.handleCorrectDrop(gameObject);
            } else {
                focusToGameContainer();
                announceToScreenReader(i18n.t('common.incorrectFeedback'));
                // Wrong number, return to original position
                this.returnToOriginalPosition(gameObject, true);
            }
        } else {
            // Not in drop zone, return to original position
            this.returnToOriginalPosition(gameObject);
        }
    }

    public clearDragAndDrop() {
        this.scene.input.off('dragstart', this.handleDragStart, this);
        this.scene.input.off('drag', this.handleDrag, this);
        this.scene.input.off('dragend', this.handleDragEnd, this);
    }

    public handleCorrectDrop(dragContainer: Phaser.GameObjects.Container) {

        // Add to stage numbers
        this.shipCharacters.push(dragContainer);

        this.updateShipCharactersPosition();

        // Make all characters stand
        this.makeAllCharactersStand();

        // Remove from ground numbers and destroy its overlay
        const index = this.characterOptions.indexOf(dragContainer);
        if (index > -1) {
            this.characterOptions.splice(index, 1);
            
            // Remove and destroy the overlay so it's no longer tabbable
            const overlay = this.characterOverlays.get(dragContainer);
            if (overlay) {
                overlay.destroy();
                this.characterOverlays.delete(dragContainer);
            }
        }

        // Update expected number
        this.currentExpectedNumber += parseInt(this.currentQuestion.step || '1');

        // Play positive sfx
        this.scene.audioManager.playSoundEffect('positive-sfx');

        // Play dance animation
        const character = dragContainer.getByName('character') as Phaser.GameObjects.Sprite;
        character.play({
            key: `${this.bearColor}_bear_positive_dance`,
            repeat: 1,
        });

        // this.dropZone.setVisible(false);
        // this.clearDragAndDrop();
        // dragContainer.removeInteractive();
        this.moveDropZone();

        character.once('animationcomplete', () => {
            // this.dropZone.setVisible(true);
            // this.setupDragAndDrop();
            // dragContainer.setInteractive();
            // Play stand animation
            character.play(`${this.bearColor}_bear_dock_stand`);
        });

        // Emmit bear drop event
        this.scene.events.emit('dropbear');
    }

    private returnToOriginalPosition(dragContainer: Phaser.GameObjects.Container, isIntersected: boolean = false) {
        const originalX = dragContainer.getData('originalX');
        const originalY = dragContainer.getData('originalY');

        // const shadow = dragContainer.getByName('shadow') as Phaser.GameObjects.Image;
        // shadow.setVisible(true);
        this.scene.tweens.chain({
            targets: dragContainer,
            tweens: [
                {
                    x: this.scene.getScaledValue(originalX),
                    y: this.scene.getScaledValue(originalY),
                    duration: 300,
                    ease: 'Power2',
                    onComplete: () => {
                        const character = dragContainer.getByName('character') as Phaser.GameObjects.Sprite;
                        character.play(`${this.bearColor}_bear_select_dragend`);
                        character.once('animationcomplete', () => {
                            if (isIntersected) {
                                character.play(`${this.bearColor}_bear_negative_fall`);
                            } else {
                                character.play(`${this.bearColor}_bear_dock_stand`);
                            }
                        });
                        const overlay = this.characterOverlays.get(dragContainer);
                        if (overlay) {
                            // Add longer delay to allow announcement to complete before focus shift
                            this.scene.time.delayedCall(4000, () => {
                                overlay.element.focus({ preventScroll: true });
                            })
                        }
                    }
                },
            ]
        });
    }

    private async moveDropZone() {
        const endNumber = parseInt(this.currentQuestion.operand2);
        const step = parseInt(this.currentQuestion.step || '1');
        if (this.currentExpectedNumber <= endNumber) {
            this.currentSeatIndex++;
            const ship = this.shipLayer.getByName('ship') as Phaser.GameObjects.Container;
            const currentSeat = ship.getByName(`seat_${this.currentSeatIndex}`) as Phaser.GameObjects.Image;
            this.dropZone.setPosition(currentSeat.x, currentSeat.y);
            
            // Update the overlay to reflect new position and seat number
            if (this.dropZoneOverlay) {
                this.dropZoneOverlay.destroy();
                this.dropZoneOverlay = new ImageOverlay(this.scene, this.dropZone, {
                    label: `Drop zone for seat ${this.currentSeatIndex}`,
                    cursor: 'default',
                });

                // Make it focusable via tab and add keyboard interaction
                const domElement = (this.dropZoneOverlay as any).domElement;
                if (domElement?.node) {
                    const htmlElement = domElement.node as HTMLElement;
                    htmlElement.setAttribute('tabindex', '0');
                    htmlElement.setAttribute('role', 'region');
                    htmlElement.setAttribute('aria-label', i18n.t('accessibility.dropZoneSeat', { seatNumber: this.currentSeatIndex }));
                    
                    // Add keyboard event listener for Enter key
                    htmlElement.addEventListener('keydown', (event: KeyboardEvent) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            this.dropSelectedCharacterWithKeyboard();
                        }
                    });
                }
            }
            
            // Add delay before updating question board to let correct/incorrect announcements finish
            this.scene.time.delayedCall(2000, () => {
                this.updateQuestionBoard(this.currentExpectedNumber - step);
            });
            
            // Increase delay to allow announcements to complete before focus shift
            this.scene.time.delayedCall(5000, () => {
                this.resetFocusToFirstOption();
            })
        } else {
            // All numbers placed, destroy drop zone and its overlay
            if (this.dropZoneOverlay) {
                this.dropZoneOverlay.destroy();
                this.dropZoneOverlay = undefined;
            }
            this.dropZone.destroy();

            if (this.isInstructionMode) {
                await this.animateShipPosition('end');
                return;
            }

            this.showSuccessAnimation();

            this.animateQuestionBoard('up');

            const questionSequence = this.shipCharacters.filter(character => character.getData('onShipInitially')).map(character => character.getData('value')).join(",");

            const studentResponse = this.shipCharacters.filter(character => !character.getData('onShipInitially')).map(character => character.getData('number')).join(",");

            this.analyticsHelper?.createTrial({
                questionMaxPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                achievedPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                questionText: `Complete the sequence: ${questionSequence},...`,
                isCorrect: true,
                questionMechanic: this.isStepTen ? 'skip_count_by_10' : 'count_by_1',
                gameLevelInfo: 'game.count_the_crew.default',
                studentResponse: studentResponse,
                studentResponseAccuracyPercentage: '100%',
            });

            // update score
            this.questionSelector.answerCorrectly();
            this.scoreHelper.answerCorrectly();
            this.scoreCoins.updateScoreDisplay(true);

            await this.animateShipPosition('end');

            if (this.scoreHelper.showStreakAnimation()) {
                this.showMascotCelebration(() => {
                    this.loadNextQuestion();
                });
            } else {
                this.loadNextQuestion();
            }
        }
    }

    private createQuestionVolumeIcon(x: number, y: number) {
        this.questionVolumeIcon = this.scene.add.container(x, y);
        const iconImage = this.scene
            .addImage(0, 0, "volume_2")
            .setOrigin(0.5)
            .setName('question_volume_icon');
        this.questionVolumeIcon.add(iconImage);

        // Make it interactive
        this.questionVolumeIcon.setSize(40, 40);
        this.questionVolumeIcon.setInteractive({ useHandCursor: true });
        this.questionVolumeIcon.on("pointerdown", () =>
            this.toggleQuestionAudio()
        );

        // Add accessibility overlay
        new ButtonOverlay(this.scene, this.questionVolumeIcon, {
            label: i18n.t("common.playQuestionAudio"),
            onKeyDown: () => this.toggleQuestionAudio(),
            style: {
                height: `${iconImage.displayHeight}px`,
                width: `${iconImage.displayWidth}px`,
                top: `${this.scene.getScaledValue(75)}px`,
                left: `${this.scene.getScaledValue(this.scene.display.width / 2)}px`,
            },
        });
    }

    private toggleQuestionAudio() {
        if (this.isQuestionAudioPlaying) {
            this.stopQuestionAudio();
        } else {
            this.playQuestionAudio();
        }
    }

    private playQuestionAudio() {
        if (this.isQuestionAudioPlaying) return;

        this.isQuestionAudioPlaying = true;
        const iconImage = this.questionVolumeIcon.getByName('question_volume_icon') as Phaser.GameObjects.Image;
        iconImage.setTexture("volume");

        // Lower the background music volume
        this.scene.audioManager.duckBackgroundMusic();

        // Play the audio
        const audio = this.scene.audioManager.playSoundEffect("which_number");
        this.currentQuestionAudio = audio || null;

        if (this.currentQuestionAudio) {
            // Start volume animation
            this.startVolumeAnimation();

            // Set up audio completion handler
            this.currentQuestionAudio.once("complete", () => {
                const config = this.lang === 'en' ? NUMBER_AUDIO_CONFIG_EN : NUMBER_AUDIO_CONFIG_ES;
                const currNum = this.currentExpectedNumber - parseInt(this.currentQuestion.step || '1')
                // check if number exists in config
                if (!config[currNum]) {
                    this.stopQuestionAudio();
                    return;
                }
                const audio2 = this.scene.audioManager.playAudioSprite(`numbers_${this.lang}`, config[currNum].start_time, config[currNum].end_time);
                this.currentQuestionAudio = audio2 || null;
                audio2?.once("complete", () => {
                    this.stopQuestionAudio();
                });
            });
        }
    }

    private stopQuestionAudio() {
        if (!this.isQuestionAudioPlaying) return;

        this.isQuestionAudioPlaying = false;
        this.scene.audioManager.unduckBackgroundMusic();
        const iconImage = this.questionVolumeIcon.getByName('question_volume_icon') as Phaser.GameObjects.Image;
        if (iconImage && iconImage.scene && iconImage.active) {
            iconImage.setTexture("volume_2");
        }

        // Stop the audio
        if (this.currentQuestionAudio) {
            this.currentQuestionAudio.stop();
            this.currentQuestionAudio = null;
        }

        // Stop the animation
        if (this.questionAudioTween) {
            this.questionAudioTween.stop();
        }
    }

    private startVolumeAnimation() {
        const volumeLevels = ["volume_2", "volume_1", "volume", "volume_1", "volume_2"];
        let currentIndex = 0;

        // Set initial texture
        const iconImage = this.questionVolumeIcon.getByName('question_volume_icon') as Phaser.GameObjects.Image;
        iconImage.setTexture(volumeLevels[currentIndex]);

        this.questionAudioTween = this.scene.tweens.add({
            targets: iconImage,
            alpha: 1,
            duration: 200,
            repeat: volumeLevels.length - 1,
            onRepeat: () => {
                currentIndex = (currentIndex + 1) % volumeLevels.length;
                iconImage.setTexture(volumeLevels[currentIndex]);
            }
        });
    }

    private showMascotCelebration(cb?: () => void) {
        this.scene.time.delayedCall(2000, () => {
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

    resetGame() {
        // Reset expected number
        this.currentQuestionIndex = 0;
        this.scoreHelper.reset();
        this.questionSelector.reset(true);
    }

    private gameOver() {
        const finalScore = this.scoreHelper.endGame();
        this.scene.time.delayedCall(1000, () => {
            this.scene.audioManager.unduckBackgroundMusic();
            this.scene.scene.start("Scoreboard", {
                totalRounds: this.scoreHelper.getTotalQuestions(),
                rounds: this.scoreHelper.getCorrectAnswers(),
                score: finalScore,
            });
        });
    }

    private clearAllElements() {
        // Clear keyboard selection state
        this.clearSelectedCharacter();
        
        // Clear stage numbers
        this.shipCharacters.forEach(container => container.destroy());
        this.shipCharacters = [];

        // Clear ground numbers and their overlays
        this.characterOptions.forEach(container => {
            const overlay = this.characterOverlays.get(container);
            if (overlay) {
                overlay.destroy();
                this.characterOverlays.delete(container);
            }
            container.destroy();
        });
        this.characterOptions = [];

        // Clear drop zone and its overlay if it exists
        if (this.dropZoneOverlay) {
            this.dropZoneOverlay.destroy();
            this.dropZoneOverlay = undefined;
        }
        if (this.dropZone && this.dropZone.active) {
            this.dropZone.destroy();
        }

        // Clear stage
        if (this.stage && this.stage.active) {
            this.stage.destroy();
        }

        this.clearDragAndDrop();
    }

    private showSuccessAnimation() {
        const width = this.scene.display.width;
        const height = 122;
        const successContainer = this.scene.add.container(
            this.scene.getScaledValue(this.scene.display.width / 2),
            this.scene.getScaledValue(this.scene.display.height + height / 2)
        );

        successContainer.setDepth(100);

        // Create background rectangle
        const bgRect = this.scene.addRectangle(0, 0, width, height, 0x007e11);
        successContainer.add(bgRect);

        const bgRectTop = this.scene
            .addRectangle(0, -height / 2, width, 7, 0x24e13e)
            .setOrigin(0.5, 0);
        successContainer.add(bgRectTop);

        // Create icon and text
        const icon = this.scene.addImage(0, 0, 'correct_icon').setOrigin(0.5);
        // this.announcementQueue.queue(i18n.t('common.correct'));

        successContainer.add(icon);

        this.scene.audioManager.playSoundEffect('positive-sfx');
        // Simple slide up animation
        this.scene.tweens.add({
            targets: successContainer,
            y: this.scene.getScaledValue(
                this.scene.display.height - height / 2
            ),
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                // Wait for a moment and then slide down
                this.scene.time.delayedCall(500, () => {
                    this.scene.tweens.add({
                        targets: successContainer,
                        y: this.scene.getScaledValue(
                            this.scene.display.height + height / 2
                        ),
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

    private playTutorial(isStepTen: boolean = false) {
        this.stopQuestionAudio();
        this.scene.scene.pause();
        this.scene.audioManager.pauseAll();
        this.scene.scene.launch("InstructionsScene", {
            parentScene: 'GameScene',
            isStepTen: isStepTen,
        });
        this.scene.scene.bringToTop("InstructionsScene");
    }

    /**
     * Selects a character for keyboard-based dropping
     */
    private selectCharacterForKeyboard(container: Phaser.GameObjects.Container): void {
        // Clear any previously selected character
        this.clearSelectedCharacter();
        
        // Set the new selected character
        this.selectedCharacterForKeyboard = container;
        
        // Create visual indicator (white outline around the character)
        this.createSelectedCharacterIndicator(container);
        
        // Get the character sprite to play selection animation
        const character = container.getByName('character') as Phaser.GameObjects.Sprite;
        character.play(`${this.bearColor}_bear_select_dragstart`);
        character.once('animationcomplete', () => {
            character.play(`${this.bearColor}_bear_select_drag`);
        });
        
        // Update aria-label to indicate selection
        const overlay = this.characterOverlays.get(container);
        if (overlay) {
            const domElement = (overlay as any).domElement;
            if (domElement?.node) {
                const htmlElement = domElement.node as HTMLElement;
                const number = container.getData('value');
                htmlElement.setAttribute('aria-label', i18n.t('accessibility.selectedBear', { number: number }));
            }
        }
        
        // Play positive sound to indicate selection
        this.scene.audioManager.playSoundEffect('positive-sfx');
    }

    /**
     * Creates a visual indicator around the selected character
     */
    private createSelectedCharacterIndicator(container: Phaser.GameObjects.Container): void {
        const character = container.getByName('character') as Phaser.GameObjects.Sprite;
        
        this.selectedCharacterIndicator = this.scene.add.graphics();
        this.selectedCharacterIndicator.lineStyle(4, 0xffffff, 1);
        
        // Draw a circle around the character
        const radius = Math.max(character.displayWidth, character.displayHeight) / 2 + 10;
        this.selectedCharacterIndicator.strokeCircle(0, 0, radius);
        
        // Position the indicator at the character's position
        this.selectedCharacterIndicator.setPosition(container.x, container.y);
    }

    /**
     * Attempts to drop the selected character at the drop zone
     */
    private dropSelectedCharacterWithKeyboard(): void {
        if (!this.selectedCharacterForKeyboard) {
            // No character selected, play negative sound
            this.scene.audioManager.playSoundEffect('negative-sfx');
            return;
        }
        
        const selectedContainer = this.selectedCharacterForKeyboard;
        const selectedNumber = selectedContainer.getData('value');
        
        // Get drop zone position for animation
        const dropZoneWorldPos = this.dropZone.getWorldTransformMatrix();
        const dropZoneX = dropZoneWorldPos.tx;
        const dropZoneY = dropZoneWorldPos.ty;
        
        // Validate if this is the correct number to drop
        if (selectedNumber === this.currentExpectedNumber) {
            focusToGameContainer();
            announceToScreenReader(i18n.t('common.correctFeedback', { value: this.currentExpectedNumber }));
            // Correct drop - animate movement to drop zone, then handle success
            this.scene.tweens.add({
                targets: selectedContainer,
                x: dropZoneX,
                y: dropZoneY,
                duration: 300,
                ease: 'Power2',
                onComplete: () => {
                    // Play dragend animation first
                    const character = selectedContainer.getByName('character') as Phaser.GameObjects.Sprite;
                    character.play(`${this.bearColor}_bear_select_dragend`);
                    character.once('animationcomplete', () => {
                        // Now handle the correct drop (which will play dance animation)
                        this.handleCorrectDrop(selectedContainer);
                        this.clearSelectedCharacter();
                    });
                }
            });
        } else {
            focusToGameContainer();
            announceToScreenReader(i18n.t('common.incorrectFeedback', { value: this.currentExpectedNumber }));
            // Incorrect drop - animate to drop zone, then back to original position
            this.scene.tweens.add({
                targets: selectedContainer,
                x: dropZoneX,
                y: dropZoneY,
                duration: 300,
                ease: 'Power2',
                onComplete: () => {
                    // Play negative sound when reaching drop zone
                    this.scene.audioManager.playSoundEffect('negative-sfx');
                    
                    // Return to original position with same animation as mouse drag
                    this.returnToOriginalPosition(selectedContainer, true);
                    
                    // Clear selection after animation starts
                    this.clearSelectedCharacter();
                }
            });
        }
    }

    /**
     * Clears the currently selected character and its visual indicator
     */
    private clearSelectedCharacter(): void {
        if (this.selectedCharacterForKeyboard) {
            // Reset character animation to stand
            const character = this.selectedCharacterForKeyboard.getByName('character') as Phaser.GameObjects.Sprite;
            character.play(`${this.bearColor}_bear_dock_stand`);
            
            // Reset aria-label
            const overlay = this.characterOverlays.get(this.selectedCharacterForKeyboard);
            if (overlay) {
                const domElement = (overlay as any).domElement;
                if (domElement?.node) {
                    const htmlElement = domElement.node as HTMLElement;
                    const number = this.selectedCharacterForKeyboard.getData('value');
                    htmlElement.setAttribute('aria-label', i18n.t('accessibility.draggableBear', { number: number }));
                }
            }
            
            this.selectedCharacterForKeyboard = undefined;
        }
        
        // Destroy visual indicator
        if (this.selectedCharacterIndicator) {
            this.selectedCharacterIndicator.destroy();
            this.selectedCharacterIndicator = undefined;
        }
    }

    private createControlButtons() {
        // Pause button
        const pauseBtn = ButtonHelper.createIconButton({
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
                this.scene.audioManager.pauseAll();
                this.scene.scene.launch('PauseScene', {
                    parentScene: 'GameScene',
                });
            },
        });
        pauseBtn.setDepth(1).setName('pause_btn');

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
            x: this.scene.display.width - 54,
            y: 142,
            raisedOffset: 3.5,
            onClick: () => {
                this.scene.audioManager.setMute(!this.scene.audioManager.getIsAllMuted());
            },
        });
        muteBtn.setDepth(1);

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
        volumeSlider.create(
            this.scene.display.width - 215,
            218,
            'blue',
            i18n.t('common.volume')
        );
        const volumeBtn = ButtonHelper.createIconButton({
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
                volumeSlider.toggleControl();
            },
        });
        volumeBtn.setDepth(1);

        // Help button
        const helpBtn = ButtonHelper.createIconButton({
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
                this.playTutorial(this.isStepTen);
            },
        });
        helpBtn.setDepth(2);
    }

    private registerScenePauseResumeHandlers() {
        this.scene.events.on('pause', this.handleScenePause, this);
        this.scene.events.on('resume', this.handleSceneResume, this);
        this.scene.events.once('shutdown', () => this.unregisterScenePauseResumeHandlers());
        this.scene.events.once('destroy', () => this.unregisterScenePauseResumeHandlers());
    }

    private unregisterScenePauseResumeHandlers() {
        this.scene.events.off('pause', this.handleScenePause, this);
        this.scene.events.off('resume', this.handleSceneResume, this);
        this.overlayPrevStates.clear();
    }

    private getAllOverlays(): ImageOverlay[] {
        const overlays: ImageOverlay[] = [];
        this.characterOverlays.forEach((overlay) => overlays.push(overlay));
        if (this.dropZoneOverlay) overlays.push(this.dropZoneOverlay);
        return overlays;
    }

    private handleScenePause = () => {
        const overlays = this.getAllOverlays();
        overlays.forEach((overlay) => {
            const domElement = (overlay as any).domElement;
            const node = domElement?.node as HTMLElement | undefined;
            if (!node) return;

            if (this.overlayPrevStates.has(overlay)) return; // already paused

            const prev = {
                hidden: node.getAttribute('aria-hidden') === 'true',
                tabIndex: node.getAttribute('tabindex'),
                pointerEvents: node.style.pointerEvents || '',
            };
            this.overlayPrevStates.set(overlay, prev);

            overlay.setAriaHidden(true);
            node.setAttribute('tabindex', '-1');
            node.style.pointerEvents = 'none';
        });
    }

    private handleSceneResume = () => {
        const overlays = this.getAllOverlays();
        overlays.forEach((overlay) => {
            const prev = this.overlayPrevStates.get(overlay);
            const domElement = (overlay as any).domElement;
            const node = domElement?.node as HTMLElement | undefined;
            if (!node) return;

            overlay.setAriaHidden(false);
            if (prev) {
                if (prev.tabIndex === null) node.removeAttribute('tabindex');
                else node.setAttribute('tabindex', prev.tabIndex);
                node.style.pointerEvents = prev.pointerEvents || '';
            }
        });
        this.overlayPrevStates.clear();
    }
}
