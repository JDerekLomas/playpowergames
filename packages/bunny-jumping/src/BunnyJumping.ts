import { BaseScene, ButtonHelper, QuestionSelectorHelper, ScoreHelper,  getQuestionBankByName, ProgressBar, ScoreCoins, i18n, Question, ImageOverlay, VolumeSlider, TweenAnimations, GameConfigManager, TextOverlay, announceToScreenReader, ButtonOverlay, AnalyticsHelper } from "@k8-games/sdk";
import { ASSETS_PATHS, BUTTONS } from "./config/common";
import { getTutorialQuestionForTopic } from "./config/tutorialQuestions";
import { STEP_3_BACKWARD_EN, STEP_3_BACKWARD_ES, STEP_3_EN, STEP_3_ES } from "./config/audioConfig";
import { generateMarkersForQuestion } from "./utils/markerGenerator";

interface NumberLine {
    numberLine: Phaser.GameObjects.Rectangle;
    markers: NumberLineMarker[];
}

interface NumberLineMarker {
    line: Phaser.GameObjects.Rectangle;
    text?: Phaser.GameObjects.Text;
    value: number;
}

export class BunnyJumping {
    private scene: BaseScene;
    private totalQuestions: number = 10;
    private questionSelector?: QuestionSelectorHelper;
    private currentQuestion?: Question;
    private scoreHelper: ScoreHelper;
    private scoreCoins?: ScoreCoins;
    private progressBar?: ProgressBar;
    private isInstructionMode: boolean = false;
    public currentNumberLine?: NumberLine;
    private isProcessing: boolean = false;
    private remainingAttempts: number = 3;
    public questionBox?: Phaser.GameObjects.Container;
    private topic: string = 'gradeK_topic5';
    private analyticsHelper!: AnalyticsHelper;

    // Volume slider and mute button
    private volumeSlider!: VolumeSlider;
    private muteBtn!: Phaser.GameObjects.Container;
    
    // Bunny jumping variables
    private bunny?: Phaser.GameObjects.Image;
    private carrot?: Phaser.GameObjects.Image;
    private currentHopStep: number = 0;
    private totalHopSteps: number = 0;
    private isAnimating: boolean = false;
    private pathGraphics?: Phaser.GameObjects.Graphics;
    public stepNumberTexts: Phaser.GameObjects.Text[] = [];
    private hopStartX: number = 0;
    private hopEndX: number = 0;
    private hopDirection: number = 1;
    private hopDuration: number = 600;
    private inputBuffer: string = '';
    private allowedNumbers: string[] = [];
    private questionOverlay?: TextOverlay;
    
    // Bunny Animation
    private standingTimer?: Phaser.Time.TimerEvent;
    private jumpingTimer?: Phaser.Time.TimerEvent;

    // Game View variables
    private worldContainer!: Phaser.GameObjects.Container;
    private gameWidth: number = 0;
    private margin: number = 80;
    private markerGap: number = 0;
    private markersPerView: number = 11; // default value
    private shiftByMarkers: number = this.markersPerView - 3; // default value

    // Container layers
    private bunnyLayer!: Phaser.GameObjects.Container;
    private numberLineLayer!: Phaser.GameObjects.Container;
    public pathLayer!: Phaser.GameObjects.Container;
    
    // Numberpad
    private numpadContainer!: Phaser.GameObjects.Container;
    public numpadButtons: Phaser.GameObjects.Container[] = [];
    private numberpadEnabled: boolean = true;
    private keyboardListener?: Phaser.Events.EventEmitter;

    // Tutorial 
    private delayedCalls: Phaser.Time.TimerEvent[] = [];
    public isSkipped: boolean = false;
    private instructionText!: Phaser.GameObjects.Text;
    private instructionTextOverlay!: TextOverlay;
    private isGuidedMode: boolean = false;

    // Instruction audio properties
    private instructionVolumeIcon?: Phaser.GameObjects.Container;
    private instructionVolumeIconButtonOverlay?: ButtonOverlay;
    private instructionVolumeIconImage!: Phaser.GameObjects.Image;
    private isInstructionAudioPlaying: boolean = false;
    private instructionAudioTween!: Phaser.Tweens.Tween;
    private currentInstructionAudio!: Phaser.Sound.WebAudioSound | null;

    constructor(scene: BaseScene, isInstructionMode: boolean = false) {
        this.scene = scene;
        this.isInstructionMode = isInstructionMode;
        this.scoreHelper = new ScoreHelper(2);

        const gameConfigManager = GameConfigManager.getInstance();
        this.topic = gameConfigManager.get('topic') || 'gradeK_topic5';
        
        const questionBank = getQuestionBankByName(this.topic);
        if (questionBank) {
            this.questionSelector = new QuestionSelectorHelper(questionBank, this.totalQuestions);
        }
    }

    static _preload(scene: BaseScene) {
        const language = i18n.getLanguage() || 'en';

        ProgressBar.preload(scene, 'light');
        ScoreCoins.preload(scene, 'blue');
        VolumeSlider.preload(scene, 'blue');
        
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen`);
        scene.load.image('game_scene_bg', 'game_scene_bg.png');
        scene.load.image('question_box', 'question_box.png');
        scene.load.image('tutorial_box', 'tutorial_box.png');
        scene.load.image('numpad_btn', 'numpad_btn.png');
        scene.load.image('numpad_btn_hover', 'numpad_btn_hover.png');
        scene.load.image('numpad_btn_pressed', 'numpad_btn_pressed.png');
        scene.load.image('correct_icon', 'correct_icon.png');
        scene.load.image('incorrect_icon', 'incorrect_icon.png');
        scene.load.image('carrot', 'carrot.png');
        
        scene.load.image('bunny', 'bunny.png');
        
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen/bunny_happy`);
        for (let i = 1; i <= 8; i++) {
            scene.load.image(`bunny_happy_${i}`, `frame_${i}.png`);
        }

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen/bunny_sad`);
        for (let i = 1; i <= 3; i++) {
            scene.load.image(`bunny_sad_${i}`, `frame_${i}.png`);
        }

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen/bunny_jump_vertical`);
        for (let i = 1; i <= 2; i++) {
            scene.load.image(`bunny_jump_vertical_${i}`, `frame_${i}.png`);
        }

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen/bunny_jump`);
        for (let i = 1; i <= 5; i++) {
            scene.load.image(`bunny_jump_${i}`, `frame_${i}.png`);
        }

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen/bunny_standing`);
        for (let i = 1; i <= 4; i++) {
            scene.load.image(`bunny_standing_${i}`, `frame_${i}.png`);
        }

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

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}`);
        scene.load.audio('bg_music', 'bg_music.mp3');
        scene.load.audio('jumping_sfx', 'jumping_sfx.mp3');
        
        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/counting_audios`);
        for (let i = 0; i <= 20; i++) {
            scene.load.audio(`count_${i}`, `${i}_${language}.mp3`);
        }

        // Load volume icons for instruction audio
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen`);
        scene.load.image("volume", "volume.png");
        scene.load.image("volume_1", "volume_1.png");
        scene.load.image("volume_2", "volume_2.png");

        // Load instruction audio
        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/info_screen`);
        scene.load.audio(`instruction_${language}`, `instruction_${language}.mp3`);

        scene.load.setPath(`${ASSETS_PATHS.ATLAS}/streak_animation`);
        scene.load.atlas('streak_animation_0', 'texture-0.png', 'texture-0.json');
        scene.load.atlas('streak_animation_1', 'texture-1.png', 'texture-1.json');
        scene.load.atlas('streak_animation_2', 'texture-2.png', 'texture-2.json');
    }

    init(data?: { reset?: boolean }) {
        
        ProgressBar.init(this.scene);
        ScoreCoins.init(this.scene);

        if (data?.reset) {
            this.resetGame();
        }
    }

    create() {
        this.createBg();

        if (!this.isInstructionMode) {
            this.scene.audioManager.playBackgroundMusic('bg_music');

            const _analyticsHelper = AnalyticsHelper.getInstance();
            if (_analyticsHelper) {
                this.analyticsHelper = _analyticsHelper;
            } else {
                console.error('AnalyticsHelper not found');
            }
            this.analyticsHelper?.createSession('game.bunny_jumping.default');
        }
        
        // World Container
        this.worldContainer = this.scene.add.container(0, 0);
        this.bunnyLayer = this.scene.add.container(0, 0);
        this.numberLineLayer = this.scene.add.container(0, 0);
        this.pathLayer = this.scene.add.container(0, 0);

        // Layering: Numberline -> Path -> Bunny
        this.worldContainer.add([this.numberLineLayer, this.pathLayer, this.bunnyLayer]);

        // Only create progress bar and score coins if not in instruction mode
        if (!this.isInstructionMode) {
            // Create score coins
            this.scoreCoins = new ScoreCoins(this.scene, this.scoreHelper, i18n, 'blue');
            this.scoreCoins.create(
                this.scene.getScaledValue(87),
                this.scene.getScaledValue(58)
            );

            // Create progress bar
            this.progressBar = new ProgressBar(this.scene, 'light', i18n);
            this.progressBar.create(
                this.scene.getScaledValue(this.scene.display.width / 2),
                this.scene.getScaledValue(63),
            );
        }

        // Create bunny (will be positioned when question loads)
        this.bunny = this.scene.addImage(0, 0, 'bunny').setOrigin(0.5, 1).setScale(0.2);
        this.playBunnyStandingAnimation();
        this.bunnyLayer.add(this.bunny);

        this.numpadContainer = this.scene.add.container(0, 0);
        
        if (this.topic === 'gradeK_topic5') {
            this.allowedNumbers = Array.from({ length: 6 }, (_, i) => (i).toString());
        } else if (this.topic === 'gradeK_topic6') {
            this.allowedNumbers = Array.from({ length: 11 }, (_, i) => (i).toString());
        } else if (this.topic === 'grade1_topic3') {
            this.allowedNumbers = Array.from({ length: 21 }, (_, i) => (i).toString());
        } else if (this.topic === 'grade1_topic4') {
            this.allowedNumbers = Array.from({ length: 21 }, (_, i) => (i).toString());
        } else {
            this.allowedNumbers = Array.from({ length: 6 }, (_, i) => (i).toString());
        }

        this.createQuestionBox();

        if (!this.isInstructionMode) {
            this.createButtons();
        }

        this.createNumberPad(this.allowedNumbers);

        this.loadNextQuestion();
    }

    private createBg() {
        this.scene.addImage(this.scene.display.width / 2, this.scene.display.height / 2, 'game_scene_bg').setOrigin(0.5);

        // const cloudTexture = this.scene.textures.get('bg_clouds');
        // const cloudHeight = cloudTexture.getSourceImage().height;
        // const cloudWidth = cloudTexture.getSourceImage().width;
        
        // const cloudTileSprite = this.scene.addTileSprite(
        //     this.scene.display.width / 2, 
        //     100,
        //     'bg_clouds',
        //     this.scene.display.width,
        //     cloudHeight,
        // ).setOrigin(0.5, 0.5);

        // this.scene.tweens.add({
        //     targets: cloudTileSprite,
        //     tilePositionX: -cloudWidth,
        //     duration: 60000,
        //     ease: 'Linear',
        //     repeat: -1,
        // });
    }

    private createQuestionBox() {
        this.questionBox = this.scene.add.container(
            this.scene.getScaledValue(this.scene.display.width / 2),
            this.scene.getScaledValue(184.5)
        ).setBelow(this.worldContainer);

        const questionBoxBg = this.scene.addImage(0, 0, 'question_box').setOrigin(0.5).setName('question_box_bg');
        this.questionBox.add(questionBoxBg);

        this.instructionText = this.scene.addText(0, -50, '', {
            font: "400 20px Exo",
            color: '#000000',
        }).setOrigin(0.5);
        this.questionBox.add(this.instructionText);

        // Add instruction volume icon - create it at a temporary position first
        if (!this.isInstructionMode) {
            this.createInstructionVolumeIcon(0, this.instructionText.getLeftCenter().y);
            if (this.instructionVolumeIcon) {
                this.questionBox.add(this.instructionVolumeIcon);
            }
        }

        this.instructionTextOverlay = new TextOverlay(this.scene, this.instructionText, { label: '' });

        const questionContainer = this.scene.add.container(0, 0).setName('question_container');
        this.questionBox.add(questionContainer);

        const questionText = this.scene.addText(0, 20, '', {
            font: "700 46px Exo",
            color: "#000000",
        }).setOrigin(0.5).setName('question_text');
        questionContainer.add(questionText);

        this.questionOverlay = new TextOverlay(this.scene, questionText, { label: '', announce: true });

        const answerBox = this.scene.addRectangle(0, 20, 62, 57).setStrokeStyle(3, 0x000000).setOrigin(0.5).setName('answer_box');
        const answerCursor = this.scene.addRectangle(0, 40, 44, 3, 0x000000).setOrigin(0.5).setName('answer_cursor');
        questionContainer.add([answerBox, answerCursor]);

        // cursor tweem
        this.scene.tweens.add({
            targets: answerCursor,
            alpha: 0,
            duration: 800,
            yoyo: true,
            repeat: -1,
        });

        const answerVal = this.scene.addText(0, 20, '', {
            font: "700 46px Exo",
            color: "#000000",
        }).setOrigin(0.5).setName('answer_val');
        questionContainer.add(answerVal);
    }

    private updateInstructionText(text: string) {
        this.instructionText.setText(text);
        this.instructionTextOverlay.updateContent(text);
        
        // Update volume icon position when text changes
        if (this.instructionVolumeIcon && !this.isInstructionMode) {
            const volumeIconX = 0 - this.instructionText.displayWidth / 2 - this.scene.getScaledValue(20);
            this.instructionVolumeIcon.setPosition(volumeIconX, this.instructionText.getLeftCenter().y); // Align with text baseline
            if (this.instructionVolumeIconButtonOverlay) {
                const element = this.instructionVolumeIconButtonOverlay.element;
                element.style.top = `${this.instructionText.getBounds().top + this.scene.getScaledValue(65)}px`;
                element.style.left = `${this.instructionText.getBounds().left - this.scene.getScaledValue(20)}px`;
            }
        }
    }

    private createInstructionVolumeIcon(x: number, y: number) {
        this.instructionVolumeIcon = this.scene.add.container(x, y);
        this.instructionVolumeIconImage = this.scene
            .addImage(0, 0, "volume_2")
            .setOrigin(0.5)
            .setScale(0.6) // Scale down to match text size better
            .setTint(0x000000) // Match the black color of the text
        this.instructionVolumeIcon.add(this.instructionVolumeIconImage);

        // Make it interactive - adjust size to match scaled icon
        const iconSize = 24; // Smaller size to match text better
        this.instructionVolumeIcon.setSize(iconSize, iconSize);
        this.instructionVolumeIcon.setInteractive({ useHandCursor: true });
        this.instructionVolumeIcon.on("pointerdown", () =>
            this.toggleInstructionAudio()
        );

        // Add accessibility overlay
        this.instructionVolumeIconButtonOverlay = new ButtonOverlay(this.scene, this.instructionVolumeIcon, {
            label: i18n.t("common.playQuestionAudio"),
            onKeyDown: () => this.toggleInstructionAudio(),
            style: {
                height: `${this.instructionVolumeIconImage.displayHeight}px`,
                width: `${this.instructionVolumeIconImage.displayWidth}px`,
            }
        });
    }

    private toggleInstructionAudio() {
        if (this.isInstructionAudioPlaying) {
            this.stopInstructionAudio();
        } else {
            this.playInstructionAudio();
        }
    }

    private playInstructionAudio() {
        if (this.isInstructionAudioPlaying) return;

        this.isInstructionAudioPlaying = true;
        this.instructionVolumeIconImage.setTexture("volume");
        this.instructionVolumeIconImage.setTint(0x000000); // Maintain black tint

        const language = i18n.getLanguage() || 'en';
        const audioKey = `instruction_${language}`;

        // Lower the background music volume
        this.scene.audioManager.duckBackgroundMusic();

        // Play the audio
        const audio = this.scene.audioManager.playSoundEffect(audioKey);
        this.currentInstructionAudio = audio || null;

        if (this.currentInstructionAudio) {
            // Start volume animation
            this.startInstructionVolumeAnimation();

            // Set up audio completion handler
            this.currentInstructionAudio.once("complete", () => {
                this.stopInstructionAudio();
            });
        }
    }

    private stopInstructionAudio() {
        if (!this.isInstructionAudioPlaying) return;

        this.scene.audioManager.unduckBackgroundMusic();

        this.isInstructionAudioPlaying = false;
        if (this.instructionVolumeIcon) {
            this.instructionVolumeIconImage.setTexture("volume_2");
            this.instructionVolumeIconImage.setTint(0x000000); // Maintain black tint
        }

        // Stop the audio
        if (this.currentInstructionAudio) {
            this.currentInstructionAudio.stop();
            this.currentInstructionAudio = null;
        }

        // Stop the animation
        if (this.instructionAudioTween) {
            this.instructionAudioTween.stop();
        }
    }

    private startInstructionVolumeAnimation() {
        const volumeLevels = ["volume_2", "volume_1", "volume", "volume_1", "volume_2"];
        let currentIndex = 0;

        // Set initial texture
        this.instructionVolumeIconImage.setTexture(volumeLevels[currentIndex]);

        this.instructionAudioTween = this.scene.tweens.add({
            targets: this.instructionVolumeIconImage,
            alpha: 1,
            duration: 200,
            repeat: volumeLevels.length - 1,
            onRepeat: () => {
                currentIndex = (currentIndex + 1) % volumeLevels.length;
                this.instructionVolumeIconImage.setTexture(volumeLevels[currentIndex]);
                this.instructionVolumeIconImage.setTint(0x000000); // Maintain black tint
            }
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
            x: this.scene.display.width - 60,
            y: 60,
            raisedOffset: 3.5,
            onClick: () => {
                this.scene.scene.pause();
                this.scene.scene.launch("PauseScene", { parentScene: "GameScene" });
                this.scene.audioManager.pauseAll();
                this.scene.scene.bringToTop("PauseScene");
            },
        }).setName('pause_btn');

        // Mute button
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
            x: this.scene.display.width - 60,
            y: 136,
            raisedOffset: 3.5,
            onClick: () => {
                this.scene.audioManager.setMute(!this.scene.audioManager.getIsAllMuted());
            },
        });

        // Volume slider
        this.volumeSlider = new VolumeSlider(this.scene);
        this.volumeSlider.create(this.scene.display.width - 220, this.isInstructionMode ? 256 : 238, 'blue', i18n.t('common.volume'));
        ButtonHelper.createIconButton({
            scene: this.scene,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.SETTINGS_ICON.KEY,
            label: i18n.t('common.volume'),
            x: this.scene.display.width - 60,
            y: 212,
            raisedOffset: 3.5,
            onClick: () => {
                this.volumeSlider.toggleControl();
            },
        });

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
            x: this.scene.display.width - 60,
            y: 288,
            raisedOffset: 3.5,
            onClick: () => {
                // Announce help page opened immediately when button is clicked
                announceToScreenReader(i18n.t('info.helpPage'), 'polite');
                this.scene.audioManager.pauseAll();
                this.stopInstructionAudio();
                this.scene.scene.pause();
                this.scene.scene.launch('InstructionsScene', { parentScene: 'GameScene' });
                this.scene.scene.bringToTop("InstructionsScene");
            },
        });
    }

    private createNumberPad(numbers: string[]) {
        this.numpadContainer.destroy();
        this.numpadContainer = this.scene.add.container(0, 0);
        this.numpadButtons = [];

        const buttonSize = 81;
        let spacing = 22;
        if (numbers.length < 10) spacing = 32; 
        const rowSpacing = 15; // Vertical spacing between rows
        
        // Determine number of rows and numbers per row
        const maxNumbersPerRow = 11;
        const numberOfRows = Math.ceil(numbers.length / maxNumbersPerRow);
        
        // Calculate total height for all rows
        const totalHeight = (numberOfRows * buttonSize) + ((numberOfRows - 1) * rowSpacing);
        const boardHeight = 230;
        const offsetY = (boardHeight - totalHeight) / 2;
        const startY = this.scene.display.height - boardHeight + offsetY + buttonSize / 2;

        numbers.forEach((number, index) => {
            const rowIndex = Math.floor(index / maxNumbersPerRow);
            const columnIndex = index % maxNumbersPerRow;
            
            // Calculate numbers in this row
            const numbersInThisRow = Math.min(maxNumbersPerRow, numbers.length - (rowIndex * maxNumbersPerRow));
            
            // Calculate row width and starting X position
            const rowWidth = (numbersInThisRow * buttonSize) + ((numbersInThisRow - 1) * spacing);
            const rowStartX = -rowWidth / 2 + buttonSize / 2;
            
            const buttonX = rowStartX + (columnIndex * (buttonSize + spacing));
            const buttonY = startY + (rowIndex * (buttonSize + rowSpacing));
            
            const button = ButtonHelper.createButton({
                scene: this.scene,
                imageKeys: {
                    default: 'numpad_btn',
                    hover: 'numpad_btn_hover',
                    pressed: 'numpad_btn_pressed'
                },
                text: number,
                label: `Number ${number}`,
                textStyle: {
                    font: "700 40px Exo", 
                    color: "#000000",
                },
                x: this.scene.display.width / 2 + buttonX,
                y: buttonY,
                onClick: () => {
                    if (this.isInstructionMode) {
                        if (number === this.currentQuestion?.answer) {
                            this.handleNumberClick(number);
                        }
                    } else {
                        this.handleNumberClick(number);
                    }
                },
            });

            this.numpadContainer.add(button);
            this.numpadButtons.push(button);
        });

        this.keyboardListener = this.scene.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
            // Only allow keyboard input if numberpad is enabled
            if (!this.numberpadEnabled) {
                return;
            }
            
            if (event.key >= '0' && event.key <= '9') {
                // Remove focus from any button when typing numbers
                if (document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                }

                if (this.inputBuffer.length < 2) {
                    const newInput = this.inputBuffer + event.key;
                    if (this.isValidInput(newInput)) {
                        this.inputBuffer += event.key;
                        this.updateAnswerVal(this.inputBuffer);
                    }
                }
            } else if (event.key === 'Backspace') {
                // Remove focus when using backspace
                if (document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                }

                this.inputBuffer = this.inputBuffer.slice(0, -1);
                // If inputBuffer becomes empty after backspace, reset the answer display
                if (this.inputBuffer.length === 0) {
                    this.resetAnswerVal();
                } else {
                    // Update the answer text to show the current input after backspace
                    this.updateAnswerVal(this.inputBuffer);
                }
            } else if (event.key === 'Enter') {
                // CRITICAL FIX: Prevent Enter from clicking focused buttons
                event.preventDefault();
                event.stopPropagation();

                if (this.inputBuffer.length > 0) {
                    if (this.isInstructionMode && this.inputBuffer !== this.currentQuestion?.answer) return;
                    // Remove focus from any element before submitting
                    if (document.activeElement instanceof HTMLElement) {
                        document.activeElement.blur();
                    }
                    this.handleNumberClick(this.inputBuffer);
                    this.inputBuffer = '';
                }
            }
        });
    } 

    private isValidInput(input: string): boolean {
        if (this.isInstructionMode) {
            const answer = this.currentQuestion?.answer || '';
            return answer.startsWith(input);
        }
        return this.allowedNumbers.some(num => num.startsWith(input));
    }

    private loadNextQuestion() {
        // Stop instruction audio if playing
        this.stopInstructionAudio();
        
        if (this.isInstructionMode) {
            this.currentQuestion = getTutorialQuestionForTopic(this.topic);
        } else {
            if (!this.instructionVolumeIcon) {
                this.createInstructionVolumeIcon(0, this.instructionText.getLeftCenter().y);
                if (this.instructionVolumeIcon && this.questionBox) {
                    this.questionBox.add(this.instructionVolumeIcon);
                }
            }
            this.currentQuestion = this.questionSelector?.getNextQuestion() || undefined;
            this.updateInstructionText(i18n.t('game.jumpToTheAnswer'));
            const questionBox = this.questionBox;
            const questionBoxBg = questionBox?.getByName('question_box_bg') as Phaser.GameObjects.Image;
            questionBoxBg.setTexture('question_box');
        }
        
        if (this.currentQuestion) {
            const operand1 = parseInt(this.currentQuestion?.operand1 || '0');
            const operand2 = parseInt(this.currentQuestion?.operand2 || '0');
            const operator = this.currentQuestion?.operator || '+';
            const answer = operator === '+' ? operand1 + operand2 : operand1 - operand2;
            this.currentQuestion.answer = answer.toString();

            // Generate dynamic markers for grade 1 topics 3 and 4
            if (this.topic === 'grade1_topic3' || this.topic === 'grade1_topic4') {
                this.currentQuestion.markers = generateMarkersForQuestion(this.currentQuestion.operand1, this.currentQuestion.operand2, this.currentQuestion.operator);
            }
        }
        
        if (!this.currentQuestion) {
            this.gameOver();
            return;
        }

        this.isProcessing = false;
        if (!this.numberpadEnabled) {
            this.enableNumberpad();
        }
        this.isGuidedMode = false;
        this.isAnimating = false;
        this.currentHopStep = 0;
        this.remainingAttempts = 3;
        this.resetAnswerVal();
        this.inputBuffer = '';

        // Update question text
        this.updateQuestionText(this.currentQuestion);

        // Clear previous number line and bunny hop elements
        if (this.currentNumberLine) {
            this.destroyNumberLine(this.currentNumberLine);
            this.currentNumberLine = undefined;
        }
        this.clearBunnyHopElements();

        this.playBunnyStandingAnimation();

        // Parse markers from question (assuming markers are in the question data)
        const markers = this.parseMarkers(this.currentQuestion.markers);
        const visibleMarkers = this.currentQuestion.visibleMarkers ? this.parseMarkers(this.currentQuestion.visibleMarkers) : markers;

        // Create new number line with markers from question
        this.currentNumberLine = this.createNumberLine(
            this.scene.display.height / 2 + 48, 
            markers,
            visibleMarkers
        );

        this.worldContainer.setX(0);

        // Position bunny at the first operand
        this.positionBunnyAtOperand(this.currentQuestion.operand1, this.currentQuestion.operator === '+' ? 'right' : 'left', markers);
        
        // Move screen to ensure bunny is in view
        if (markers.length > this.markersPerView) {
            // Find the index of the operand in the markers array
            const operandIndex = markers.findIndex(marker => marker === parseInt(this.currentQuestion!.operand1));
            
            if (operandIndex !== -1) {
                // Calculate the starting index for the view window
                let startIndex = Math.floor(operandIndex / this.markersPerView) * this.markersPerView;
                
                // Ensure we don't go beyond the available markers
                const maxStartIndex = markers.length - this.markersPerView;
                if (startIndex > maxStartIndex) {
                    startIndex = maxStartIndex;
                }
                
                // Ensure we don't go below 0
                if (startIndex < 0) {
                    startIndex = 0;
                }

                console.log("Screen Positioned at Marker Index:", startIndex, "Value:", markers[startIndex]);
                this.positionScreenAtMarkerIndex(startIndex);
            }
        }

        // Prepare hop animation data
        this.prepareHopAnimation(this.currentQuestion);
    }

    // Position screen with respect to first marker
    private positionScreenAtMarkerIndex(markerIndex: number) {
        const x = this.markerGap * markerIndex;
        this.worldContainer.setPosition(this.scene.getScaledValue(-x), 0);
    }

    private updateQuestionText(question: Question) {
        if (!this.questionBox) return;

        const questionContainer = this.questionBox.getByName('question_container') as Phaser.GameObjects.Container;
        const questionText = questionContainer.getByName('question_text') as Phaser.GameObjects.Text;

        // Format: "4 + 2 = ?"
        let operator = question.operator || '+';
        const questionString = `${question.operand1} ${operator.replace("-", "−")} ${question.operand2} =`;
        
        questionText.setText(questionString);
        this.scene.time.delayedCall(100, () => {
            this.questionOverlay?.updateContent(questionString);
        });

        const answerBox = questionContainer.getByName('answer_box') as Phaser.GameObjects.Rectangle;
        const answerCursor = questionContainer.getByName('answer_cursor') as Phaser.GameObjects.Rectangle;

        const gap = this.scene.getScaledValue(15);
        const answerX = questionText.getBounds().width / 2 + answerBox.getBounds().width / 2 + gap;
        answerBox.setX(answerX);
        answerCursor.setX(answerX);

        questionContainer.setX(-(answerBox.getBounds().width / 2 + gap));
    }

    private updateAnswerVal(answer: string) {
        if (!this.questionBox) return;

        const questionContainer = this.questionBox.getByName('question_container') as Phaser.GameObjects.Container;
        const questionText = questionContainer.getByName('question_text') as Phaser.GameObjects.Text;
        const answerCursor = questionContainer.getByName('answer_cursor') as Phaser.GameObjects.Rectangle;
        answerCursor.setVisible(false);
        const answerVal = questionContainer.getByName('answer_val') as Phaser.GameObjects.Text;

        answerVal.setPosition(answerCursor.x, questionText.y);

        answerVal.setText(answer);
    }

    private resetAnswerVal() {
        if (!this.questionBox) return;

        const questionContainer = this.questionBox.getByName('question_container') as Phaser.GameObjects.Container;
        const answerCursor = questionContainer.getByName('answer_cursor') as Phaser.GameObjects.Rectangle;
        const answerVal = questionContainer.getByName('answer_val') as Phaser.GameObjects.Text;

        answerCursor.setVisible(true);
        answerVal.setText('');
    }

    private playBunnyStandingAnimation() {

        if (this.standingTimer) {
            this.standingTimer.destroy();
        }

        if (this.jumpingTimer) {
            this.jumpingTimer.destroy();
        }
        
        const frames = ['bunny_standing_1', 'bunny_standing_2'];
        let frameIndex = 1;
        this.bunny?.setTexture(frames[0]);

        this.standingTimer = this.scene.time.addEvent({
            delay: 250,
            callback: () => {
                this.bunny?.setTexture(frames[frameIndex]);
                frameIndex = (frameIndex + 1) % frames.length;
                if (frameIndex === 0) {
                    this.playBunnyThinkingAnimation();
                }
            },
            repeat: frames.length - 2,
        });
    }

    private playBunnyThinkingAnimation() {
		const frames = ['bunny_standing_3', 'bunny_standing_4', 'bunny_standing_3'];
		let frameIndex = 1;

		this.bunny?.setTexture(frames[0]);

		this.standingTimer?.destroy();

		const frameDelay = 250;
		const cyclePauseMs = 3000;

		this.standingTimer = this.scene.time.addEvent({
			delay: frameDelay,
			loop: true,
			callback: () => {
				this.bunny?.setTexture(frames[frameIndex]);
				frameIndex = (frameIndex + 1) % frames.length;

				if (frameIndex === 0) {
					const currentTimer = this.standingTimer;
					if (currentTimer) {
						currentTimer.paused = true;
						this.scene.time.delayedCall(cyclePauseMs, () => {
							if (this.standingTimer === currentTimer && this.standingTimer) {
								this.standingTimer.paused = false;
							}
						});
					}
				}
			},
		});
    }

    private playBunnyJumpingAnimation() {
        if (this.jumpingTimer) {
            this.jumpingTimer.destroy();
        }

        if (this.standingTimer) {
            this.standingTimer.destroy();
        }

        this.scene.audioManager.playSoundEffect('jumping_sfx');

        const frames = ['bunny_jump_1', 'bunny_jump_2', 'bunny_jump_3'];
        let frameIndex = 1;

        this.bunny?.setTexture(frames[0]);

        this.jumpingTimer = this.scene.time.addEvent({
            delay: 20,
            callback: () => {
                this.bunny?.setTexture(frames[frameIndex]);
                frameIndex = (frameIndex + 1) % frames.length;
            },
            repeat: frames.length - 2,
        });
    }

    public playBunnyHopAnimation() {
        if (!this.bunny) return;

        const frames = ['bunny_jump_vertical_1', 'bunny_jump_vertical_2', 'bunny'];
        let frameIndex = 1;

        this.bunny.setTexture(frames[0]);

        this.scene.time.addEvent({
            delay: 250,
            callback: () => {
                this.bunny?.setTexture(frames[frameIndex]);
                frameIndex = (frameIndex + 1) % frames.length;
            },
            repeat: frames.length - 2,
        })

        const currentY = this.bunny.y;
        this.scene.tweens.add({
            targets: this.bunny,
            y: currentY - this.scene.getScaledValue(40),
            duration: 250,
            ease: 'Sine.out',
            yoyo: true,
        })
    }

    private playBunnyHappyAnimation() {
        if (!this.bunny) return;

        const frames = ['bunny_happy_1', 'bunny_happy_2', 'bunny_happy_3', 'bunny_happy_4', 'bunny_happy_5', 'bunny_happy_6', 'bunny_happy_7', 'bunny_happy_8'];
        let frameIndex = 1;

        this.bunny.setTexture(frames[0]);
        this.carrot?.destroy();
        this.carrot = undefined;

        const flyingTotalFrames = 6;
        const delay = 100;

        this.scene.time.addEvent({
            delay: delay,
            callback: () => {
                this.bunny?.setTexture(frames[frameIndex]);
                // start flying animation
                if (frameIndex === 1) {
                    const currentY = this.bunny!.y;
                    this.scene.tweens.add({
                        targets: this.bunny,
                        y: currentY - this.scene.getScaledValue(50),
                        duration: flyingTotalFrames * delay / 2,
                        ease: 'Sine.out',
                        yoyo: true
                    })
                };
                frameIndex = (frameIndex + 1) % frames.length;
            },
            repeat: 2 * frames.length - 2,
        });
    }

    private playBunnySadAnimation() {
        if (!this.bunny) return;

        this.jumpingTimer?.destroy();
        this.standingTimer?.destroy();

        const frames = ['bunny_sad_1', 'bunny_sad_2', 'bunny_sad_3'];
        let frameIndex = 1;

        this.bunny.setTexture(frames[0]);

        this.scene.time.addEvent({
            delay: 100,
            callback: () => {
                this.bunny?.setTexture(frames[frameIndex]);
                frameIndex = (frameIndex + 1) % frames.length;
            },
            repeat: frames.length - 2,
        })

        this.scene.time.delayedCall(1500, () => {
            this.bunny?.setTexture('bunny');
            // this.playBunnyStandingAnimation();
        });
    }

    private parseMarkers(markers: string): number[] {
        return markers.split(',').map((marker: string) => parseInt(marker.trim()));
    }

    private buildOptionsDisplay() {
        const rawMarkers = this.currentQuestion?.markers || '';
        const markers = this.parseMarkers(rawMarkers);

        const answer = this.currentQuestion?.answer?.toString() || '';

        return markers.map((value: number) => ({
            option: value.toString(),
            isCorrect: value.toString() === answer,
        }));
    }

    private handleNumberClick(number: string) {
        if (!this.currentQuestion || this.isProcessing) return;
        
        this.isProcessing = true;
        this.disableNumberpad();
        const isCorrect = number === this.currentQuestion.answer;
        this.updateAnswerVal(number);
        
        if (isCorrect) {
            if (!this.isInstructionMode) {
                this.analyticsHelper?.createTrial({
                    questionMaxPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                    achievedPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                    questionText: this.currentQuestion.operand1 + this.currentQuestion.operator + this.currentQuestion.operand2,
                    isCorrect: true,
                    questionMechanic: 'default',
                    gameLevelInfo: 'game.bunny_jumping.default',
                    studentResponse: this.currentQuestion.answer,
                    studentResponseAccuracyPercentage: '100%',
                    optionsDisplay: this.buildOptionsDisplay(),
                });

                this.scoreHelper.answerCorrectly();
                this.questionSelector?.answerCorrectly();
                this.scoreCoins?.updateScoreDisplay(true);
                
                // Update progress bar
                const progress = this.questionSelector!.getTotalQuestionsAnswered() / this.totalQuestions;
                this.progressBar?.drawProgressFill(progress, this.scoreHelper.getCurrentStreak());
                this.showSuccessAnimation();
            }
            
            // Start bunny animation for correct answer
            this.startBunnyAnimation();
        } else {
            this.remainingAttempts -= 1;

            this.showErrorAnimation();
            this.playBunnySadAnimation();

            if (this.remainingAttempts <= 0) {
                if (this.isGuidedMode) {
                    this.analyticsHelper?.createTrial({
                        questionMaxPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                        achievedPoints: 0,
                        questionText: this.currentQuestion.operand1 + this.currentQuestion.operator + this.currentQuestion.operand2,
                        isCorrect: false,
                        questionMechanic: 'default',
                        gameLevelInfo: 'game.bunny_jumping.default',
                        studentResponse: number,
                        studentResponseAccuracyPercentage: '0%',
                        optionsDisplay: this.buildOptionsDisplay(),
                    });
                    
                    this.scoreHelper.answerIncorrectly();
                    this.questionSelector?.answerIncorrectly(this.currentQuestion);
                    this.scoreCoins?.updateScoreDisplay(false);
                    
                    // Update progress bar
                    const progress = this.questionSelector!.getTotalQuestionsAnswered() / this.totalQuestions;
                    this.progressBar?.drawProgressFill(progress, this.scoreHelper.getCurrentStreak());

                    this.isGuidedMode = false;

                    let answerButton: Phaser.GameObjects.Container | null = null;
                    for (const button of this.numpadButtons) {
                        if ((button.getAt(1) as Phaser.GameObjects.Text).text === this.currentQuestion.answer.toString()) {
                            answerButton = button;
                            break;
                        }
                    }

                    if (answerButton) {
                        this.createHandClickAnimation(answerButton);
                    }

                    this.scene.time.delayedCall(2500, () => {
                        this.loadNextQuestion();
                    });

                    return;
                }
                this.isGuidedMode = true;
                this.scene.time.delayedCall(2500, () => {
                    // this.loadNextQuestion();
                    this.isProcessing = false;
                    this.playStep1();
                });
            } else {
                // Allow another try on the same question
                this.scene.time.delayedCall(1500, () => {
                    this.isProcessing = false;
                    this.enableNumberpad();
                });
            }
        }
    }

    private gameOver() {
        console.log('Game Over!');
        if (!this.isInstructionMode) {
            const finalScore = this.scoreHelper.endGame();
            this.scene.audioManager.unduckBackgroundMusic();
            console.log(`Final Score: ${finalScore}`);
            this.scene.scene.start('Scoreboard', {
                totalRounds: this.scoreHelper.getTotalQuestions(),
                rounds: this.scoreHelper.getCorrectAnswers(),
                score: finalScore,
            });
        }
    }

    private createNumberLine(y: number, numbers: number[], visibleNumbers: number[]) {
        let gap = (this.scene.display.width - 2 * this.margin) / (this.markersPerView - 1);
        const numberRange = numbers[numbers.length - 1] - numbers[0];
        
        // For less than 10 markers, make the number line full width
        if (numbers.length < this.markersPerView) {
            gap = (this.scene.display.width - 2 * this.margin) / numberRange;
        }
        this.gameWidth = numberRange * gap + 2 * this.margin;
        this.markerGap = gap;
        
        // Create the horizontal number line
        const numberLine = this.scene.addRectangle(
            0,
            y,
            this.gameWidth,
            9,
            0x000000
        ).setOrigin(0, 0.5);

        // Create markers for each number
        const markers: NumberLineMarker[] = [];
        
        if (numbers.length > 0) {
            numbers.forEach((number) => {
                const x = this.margin + (gap * (number - numbers[0]));
                
                // Create marker line (vertical line)
                const markerLine = this.scene.addRectangle(
                    x,
                    y,
                    5,
                    51,
                    0x000000
                ).setOrigin(0.5);
                
                // Create marker text
                let markerText: Phaser.GameObjects.Text | undefined;
                if (visibleNumbers.includes(number)) {
                    markerText = this.scene.addText(
                        x,
                        y + 30,
                        number.toString(),
                        {
                            font: "700 30px Exo",
                            color: "#000000",
                        }
                    ).setOrigin(0.5, 0);
                }
                
                markers.push({
                    line: markerLine,
                    text: markerText,
                    value: number
                });
            });
        }

        // Order: Line -> Text -> Numberline
        markers.forEach(marker => {
            this.numberLineLayer.add(marker.line);
            if (marker.text) {
                this.numberLineLayer.add(marker.text);
            }
        });
        this.numberLineLayer.add(numberLine);
        
        return {
            numberLine,
            markers
        };
    }

    private destroyNumberLine(numberLine: NumberLine) {
        numberLine.numberLine.destroy();
        numberLine.markers.forEach((marker) => {
            marker.line.destroy();
            marker.text?.destroy();
        });
    }

    private clearBunnyHopElements() {
        this.pathGraphics?.destroy();
        // this.highlightGraphics?.destroy();
        this.stepNumberTexts.forEach(text => text.destroy());
        this.stepNumberTexts = [];
        this.pathGraphics = undefined;
        // this.highlightGraphics = undefined;
    }

    // For tutorial mode
    public showTutorialPath() {
        if (!this.currentQuestion || !this.currentNumberLine) return;

        this.clearBunnyHopElements();
        
        const yPosition = this.scene.display.height / 2 + 48;
        const hopHeight = 100;
        
        // Create graphics for the static path
        this.pathGraphics = this.scene.add.graphics();
        this.pathLayer.add(this.pathGraphics);

        // Draw all paths with gray color for tutorial
        this.drawAllPaths(yPosition, hopHeight, 0x0015D3);

        // Add all step numbers above the paths
        this.addAllStepNumbers(yPosition, hopHeight, "#0015D3");
    }

    public destroyTutorialPath() {
        this.clearBunnyHopElements();
        // this.clearHighlight();
    }

    private positionBunnyAtOperand(operand: string, direction: 'left' | 'right', markers: number[]) {
        if (!this.bunny || !this.currentNumberLine) return;

        this.bunny.setFlipX(direction === 'left');

        const usableWidth = this.gameWidth - 2 * this.margin;
        const yPosition = this.scene.display.height / 2 + 48;

        const minNumber = Math.min(...markers);
        const maxNumber = Math.max(...markers);
        const numberRange = maxNumber - minNumber;
        
        // Calculate x position based on the operand's position in the range
        const operandNum = parseInt(operand);
        const percentage = numberRange === 0 ? 0.5 : (operandNum - minNumber) / numberRange;
        const x = this.margin + (usableWidth * percentage);
        
        this.bunny.setPosition(this.scene.getScaledValue(x), this.scene.getScaledValue(yPosition + 10));
    }

    private prepareHopAnimation(question: Question) {
        if (!this.currentNumberLine) return;

        const operand2 = parseInt(question.operand2);
        const operator = question.operator || '+';
        
        // Calculate the direction and number of steps
        this.hopDirection = operator === '+' ? 1 : -1;
        this.totalHopSteps = operand2;
        
        // Calculate start and end positions for the first hop
        const { startX, endX } = this.calculateHopPositions(0);
        this.hopStartX = startX;
        this.hopEndX = endX;
    }

    private startBunnyAnimation() {
        if (this.isAnimating) return;

        this.carrot?.destroy();
        this.carrot = undefined;
        const answer = parseInt(this.currentQuestion!.answer);
        const answerX = this.currentNumberLine!.markers.find(marker => marker.value === answer)?.line.x || 0;
        this.carrot = this.scene.addImage(answerX / this.scene.display.scale, this.scene.display.height / 2 + 48, 'carrot').setOrigin(0.5).setScale(0.9);

        this.scene.tweens.add({
            targets: this.carrot,
            y: "-=" + this.scene.getScaledValue(20),
            duration: 200,
            yoyo: true,
            ease: 'Power2',
        })

        this.bunnyLayer.add(this.carrot);
        this.scene.audioManager.duckBackgroundMusic();

        if (this.totalHopSteps === 0) {
            this.isAnimating = false;

            this.jumpingTimer?.destroy();
            this.standingTimer?.destroy();
            this.playBunnyHappyAnimation();
            this.scene.audioManager.unduckBackgroundMusic();

            if (this.isInstructionMode) {
                this.scene.events.emit('correctanswer', { isCorrect: true });
            } else {
                if (this.scoreHelper.showStreakAnimation()) {
                    this.showMascotCelebration();
                }
                this.scene.time.delayedCall(2500, () => {
                    this.loadNextQuestion();
                });
            }
            return;
        }
        
        this.isAnimating = true;
        this.currentHopStep = 0;
        this.performNextHop();
    }

    private performNextHop() {
        if (this.currentHopStep >= this.totalHopSteps) {
            // Animation complete
            this.isAnimating = false;

            this.jumpingTimer?.destroy();
            this.standingTimer?.destroy();
            this.playBunnyHappyAnimation();
            this.scene.audioManager.unduckBackgroundMusic();
            
            if (this.isInstructionMode) {
                this.scene.events.emit('correctanswer', { isCorrect: true });
            } else {
                if (this.scoreHelper.showStreakAnimation()) {
                    this.showMascotCelebration();
                }
                this.scene.time.delayedCall(2500, () => {
                    this.loadNextQuestion();
                });
            }

            return;
        }

        if (!this.bunny) return;

        // Start progressive path drawing and bunny animation
        this.startProgressiveHop();
    }

    private startProgressiveHop() {
        if (!this.bunny) return;

        const yPosition = this.scene.display.height / 2 + 48;
        const hopHeight = 100;
        
        // Create graphics for this hop if it doesn't exist
        if (!this.pathGraphics) {
            this.pathGraphics = this.scene.add.graphics();
            this.pathLayer.add(this.pathGraphics);
        }

        this.playBunnyJumpingAnimation();

        // Draw path segment
        this.drawPathSegment(this.hopStartX, this.hopEndX, yPosition, hopHeight, 0x0015D3, true);

        const operand1 = parseInt(this.currentQuestion!.operand1);
        const stepNumber = operand1 + (this.currentHopStep + 1) * this.hopDirection;

        if (this.scene.cache.audio.exists(`count_${stepNumber}`)) {
            this.scene.audioManager.playSoundEffect(`count_${stepNumber}`);
        }
        
        // Create a tween for the bunny's movement
        this.scene.time.delayedCall(150, () => {
            this.bunny?.setTexture('bunny_jump_4');
            this.scene.tweens.add({
                targets: this.bunny,
                x: this.scene.getScaledValue(this.hopEndX),
                y: this.scene.getScaledValue(yPosition),
                duration: this.hopDuration,
                ease: 'Linear',
                onUpdate: (tween) => {
                    // Calculate elliptical position using the same function as the path
                    const progress = tween.progress;
                    const { x, y } = this.calculateEllipticalPosition(progress, yPosition, hopHeight);
                    this.bunny!.setPosition(this.scene.getScaledValue(x), this.scene.getScaledValue(y + 10));
                },
                onComplete: () => {
                    // Add step number above the path
                    this.addStepNumber(this.hopStartX, this.hopEndX, yPosition, hopHeight, (this.currentHopStep + 1), "#0015D3");

                    this.currentHopStep++;
                    
                    // Calculate next hop positions
                    if (this.currentHopStep < this.totalHopSteps) {
                        const { startX, endX } = this.calculateHopPositions(this.currentHopStep);
                        this.hopStartX = startX;
                        this.hopEndX = endX;
                    }

                    // Shifting numberline logic
                    const currentMarkerNum = parseInt(this.currentQuestion!.operand1) + ((this.currentHopStep) * this.hopDirection);

                    let shiftBy = this.shiftByMarkers;
                    if (shiftBy <= 0) {
                        shiftBy = this.markersPerView;
                    }

                    this.jumpingTimer?.destroy();
                    this.standingTimer?.destroy();
                    this.bunny?.setTexture('bunny_jump_5');

                    this.scene.time.delayedCall(100, () => {
                        this.bunny?.setTexture('bunny');
                    })

                    // Out of View - Right side
                    if (this.hopEndX > -this.worldContainer.x / this.scene.display.scale + this.scene.display.width) {
                        const lastMarkerNum = this.currentNumberLine!.markers[this.currentNumberLine!.markers.length - 1].value;

                        if (currentMarkerNum + shiftBy > lastMarkerNum) {
                            shiftBy = lastMarkerNum - currentMarkerNum;
                        }

                        console.log("Shifting by:", shiftBy);

                        this.shiftNumberlineBy(shiftBy, 'right', () => {
                            this.scene.time.delayedCall(400, () => {
                                this.performNextHop();
                            });
                        });
                    } 
                    // Out of View - Left side
                    else if (this.hopEndX < -this.worldContainer.x / this.scene.display.scale) {
                        const firstMarkerNum = this.currentNumberLine!.markers[0].value;
                        
                        if (currentMarkerNum - shiftBy < firstMarkerNum) {
                            shiftBy = currentMarkerNum - firstMarkerNum;
                        }
                        
                        console.log("Shifting by:", shiftBy);

                        this.shiftNumberlineBy(shiftBy, 'left', () => {
                            this.scene.time.delayedCall(400, () => {
                                this.performNextHop();
                            });
                        });
                    }
                    // In View
                    else {
                        this.scene.time.delayedCall(400, () => {
                            this.performNextHop();
                        });
                    }
                }
            });   
        })
    }

    // Shift the numberline by totalMarkersShift markers
    private shiftNumberlineBy(totalMarkersShift: number, direction: 'left' | 'right', cb?: () => void) {
        const shift = totalMarkersShift * this.markerGap;

        const finalX = this.worldContainer.x + this.scene.getScaledValue(shift * (direction === 'left' ? 1 : -1));

        this.scene.tweens.add({
            targets: this.worldContainer,
            x: finalX,
            duration: 800,
            ease: 'Linear',
            onComplete: () => {
                cb?.();
            }
        });
    }

    private calculateEllipticalPosition(progress: number, yPosition: number, hopHeight: number): { x: number, y: number } {
        // Calculate center and radius for ellipse
        const centerX = (this.hopStartX + this.hopEndX) / 2;
        const radiusX = Math.abs(this.hopEndX - this.hopStartX) / 2;
        const radiusY = hopHeight;

        let startAngle: number;
        let endAngle: number;

        if (this.hopStartX <= this.hopEndX) {
            // left-to-right: start at π (which gives hopStartX), end at 0 (hopEndX)
            startAngle = Math.PI;
            endAngle = 0;
        } else {
            // right-to-left: start at 0 (hopStartX), end at π (hopEndX)
            startAngle = 0;
            endAngle = Math.PI;
        }
        
        const angle = startAngle + (endAngle - startAngle) * progress;
        
        const x = centerX + radiusX * Math.cos(angle);
        const y = yPosition - radiusY * Math.sin(angle);
        
        return { x, y };
    }
    
    private getPointAtDistance(pathPoints: { x: number, y: number }[], targetDistance: number): { x: number, y: number } | null {
        let currentDistance = 0;
        
        for (let i = 1; i < pathPoints.length; i++) {
            const prevPoint = pathPoints[i - 1];
            const currentPoint = pathPoints[i];
            
            const dx = currentPoint.x - prevPoint.x;
            const dy = currentPoint.y - prevPoint.y;
            const segmentLength = Math.sqrt(dx * dx + dy * dy);
            
            if (currentDistance + segmentLength >= targetDistance) {
                // The target distance is within this segment
                const remainingDistance = targetDistance - currentDistance;
                const ratio = remainingDistance / segmentLength;
                
                return {
                    x: prevPoint.x + dx * ratio,
                    y: prevPoint.y + dy * ratio
                };
            }
            
            currentDistance += segmentLength;
        }
        
        return null;
    }    

    private showSuccessAnimation(): void {
        announceToScreenReader(i18n.t('common.correctFeedback'));
        const width = this.scene.display.width;
        const height = 122;
        const successContainer = this.scene.add.container(this.scene.getScaledValue(this.scene.display.width / 2), this.scene.getScaledValue(this.scene.display.height + height / 2));
        successContainer.setDepth(100)

        // Create background rectangle
        const bgRect = this.scene.addRectangle(0, 0, width, height, 0x1A8B29);
        successContainer.add(bgRect);

        const bgRectTop = this.scene.addRectangle(0, -height / 2, width, 7, 0x24E13E).setOrigin(0.5, 0);
        successContainer.add(bgRectTop);

        // Create icon and text
        const icon = this.scene.addImage(0, 0, 'correct_icon').setOrigin(0.5);

        successContainer.add(icon);

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
                        ease: "Power2",
                        onComplete: () => {
                            successContainer.destroy();
                        }
                    });
                });
            }
        });
    }

    private showErrorAnimation(): void {
        announceToScreenReader(i18n.t('common.incorrectFeedback'));
        const width = this.scene.display.width;
        const height = 122;
        const errorContainer = this.scene.add.container(this.scene.getScaledValue(this.scene.display.width / 2), this.scene.getScaledValue(this.scene.display.height + height / 2));
        errorContainer.setDepth(100)

        // Create background rectangle
        const bgRect = this.scene.addRectangle(0, 0, width, height, 0x8B0000);
        errorContainer.add(bgRect);

        const bgRectTop = this.scene.addRectangle(0, -height / 2, width, 7, 0xF40000).setOrigin(0.5, 0);
        errorContainer.add(bgRectTop);

        // Create icon and text
        const icon = this.scene.addImage(0, 0, 'incorrect_icon').setOrigin(0.5);

        errorContainer.add(icon);

        // Simple slide up animation
        this.scene.tweens.add({
            targets: errorContainer,
            y: this.scene.getScaledValue(this.scene.display.height - height / 2),
            duration: 500,
            ease: "Power2",
            onComplete: () => {
                new ImageOverlay(this.scene, icon, { label: i18n.t('common.incorrect') + ' ' + i18n.t('common.icon') });
                // Wait for a moment and then slide down
                this.scene.time.delayedCall(500, () => {
                    this.scene.tweens.add({
                        targets: errorContainer,
                        y: this.scene.getScaledValue(this.scene.display.height + height / 2),
                        duration: 500,
                        ease: "Power2",
                        onComplete: () => {
                            errorContainer.destroy();
                            this.resetAnswerVal();
                        }
                    });
                });
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

    private resetGame() {
        this.questionSelector?.reset();
        this.scoreHelper.reset();
        
        // Stop instruction audio if playing
        this.stopInstructionAudio();
    }

    public disableNumberpad() {
        this.numberpadEnabled = false;
        this.numpadButtons.forEach(button => {
            ButtonHelper.disableButton(button);
            button.setAlpha(0.5);
        });
        this.numpadContainer.setAlpha(0.5);
        this.inputBuffer = '';
        this.resetAnswerVal();
    }

    public enableNumberpad() {
        this.numberpadEnabled = true;
        this.numpadButtons.forEach((button) => {
            ButtonHelper.enableButton(button);
            button.setAlpha(1);
            // Remove the auto-focus logic here
        });
        this.numpadContainer.setAlpha(1);
    }

    public hideNumberpad() {
        this.numberpadEnabled = false;
        this.numpadButtons.forEach(button => {
            button.setVisible(false);
            ButtonHelper.disableButton(button);
        });
    }

    public showNumberpad() {
        this.numberpadEnabled = true;
        this.numpadButtons.forEach(button => {
            button.setVisible(true);
            ButtonHelper.enableButton(button);
        });
    }

    public destroyNumberpad() {
        // Destroy keyboard listener
        if (this.keyboardListener) {
            this.keyboardListener.off('keydown');
            this.keyboardListener = undefined;
        }
        
        this.numpadButtons.forEach(button => {
            button.destroy();
        });
        this.numpadContainer.destroy();
        this.numpadButtons = [];
    }

    public getCurrentQuestion() {
        return this.currentQuestion;
    }
    
    // Calculate hop positions for a given step
    private calculateHopPositions(step: number): { startX: number, endX: number } {
        if (!this.currentQuestion) return { startX: 0, endX: 0 };
        
        const operand1 = parseInt(this.currentQuestion.operand1);
        const operator = this.currentQuestion.operator || '+';
        const hopDirection = operator === '+' ? 1 : -1;
        
        const startValue = operand1 + (step * hopDirection);
        const endValue = operand1 + ((step + 1) * hopDirection);
        
        const usableWidth = this.gameWidth - 2 * this.margin;
        const markers = this.parseMarkers(this.currentQuestion.markers);
        const minNumber = Math.min(...markers);
        const maxNumber = Math.max(...markers);
        const numberRange = maxNumber - minNumber;
        
        const startPercentage = numberRange === 0 ? 0.5 : (startValue - minNumber) / numberRange;
        const endPercentage = numberRange === 0 ? 0.5 : (endValue - minNumber) / numberRange;
        
        const startX = this.margin + (usableWidth * startPercentage);
        const endX = this.margin + (usableWidth * endPercentage);
        
        return { startX, endX };
    }

    private drawPathSegment(startX: number, endX: number, yPosition: number, hopHeight: number, color: number, animate: boolean = false) {
        if (!this.pathGraphics) return;
        
        this.pathGraphics.lineStyle(this.scene.getScaledValue(3), color, 1);
        
        const dashLength = 12;
        const gapLength = dashLength * 0.45;
        const totalSegmentLength = dashLength + gapLength;
        
        // Calculate the total path length by sampling points along the path
        const samples = 100;
        let totalPathLength = 0;
        const pathPoints: { x: number, y: number }[] = [];
        
        // Store original hop positions
        const originalStartX = this.hopStartX;
        const originalEndX = this.hopEndX;
        
        // Temporarily set hop positions for this segment
        this.hopStartX = startX;
        this.hopEndX = endX;
        
        for (let i = 0; i <= samples; i++) {
            const progress = i / samples;
            const point = this.calculateEllipticalPosition(progress, yPosition, hopHeight);
            pathPoints.push(point);
            
            if (i > 0) {
                const prevPoint = pathPoints[i - 1];
                const dx = point.x - prevPoint.x;
                const dy = point.y - prevPoint.y;
                totalPathLength += Math.sqrt(dx * dx + dy * dy);
            }
        }
        
        // Restore original hop positions
        this.hopStartX = originalStartX;
        this.hopEndX = originalEndX;
        
        // Calculate how many complete segments we can fit
        const totalSegments = Math.floor(totalPathLength / totalSegmentLength);
        
        if (animate) {
            // Draw dashes progressively
            this.drawPathSegmentsProgressively(pathPoints, totalSegments, totalSegmentLength, dashLength, color, 0);
        } else {
            // Draw all dashes at once
            for (let segmentIndex = 0; segmentIndex < totalSegments; segmentIndex++) {
                const segmentStartDistance = segmentIndex * totalSegmentLength;
                const dashStartDistance = segmentStartDistance;
                const dashEndDistance = segmentStartDistance + dashLength;
                
                // Find the points on the path at these distances
                const dashStartPoint = this.getPointAtDistance(pathPoints, dashStartDistance);
                const dashEndPoint = this.getPointAtDistance(pathPoints, dashEndDistance);
                
                if (dashStartPoint && dashEndPoint) {
                    // Draw the dash
                    this.pathGraphics.moveTo(this.scene.getScaledValue(dashStartPoint.x), this.scene.getScaledValue(dashStartPoint.y));
                    this.pathGraphics.lineTo(this.scene.getScaledValue(dashEndPoint.x), this.scene.getScaledValue(dashEndPoint.y));
                    this.pathGraphics.strokePath();
                    this.pathGraphics.lineStyle(this.scene.getScaledValue(3), color, 1);
                }
            }
        }
    }

    private drawPathSegmentsProgressively(
        pathPoints: { x: number, y: number }[], 
        totalSegments: number, 
        totalSegmentLength: number, 
        dashLength: number, 
        color: number, 
        currentSegment: number
    ) {
        if (currentSegment >= totalSegments || !this.pathGraphics) return;
        
        const segmentStartDistance = currentSegment * totalSegmentLength;
        const dashStartDistance = segmentStartDistance;
        const dashEndDistance = segmentStartDistance + dashLength;
        
        // Find the points on the path at these distances
        const dashStartPoint = this.getPointAtDistance(pathPoints, dashStartDistance);
        const dashEndPoint = this.getPointAtDistance(pathPoints, dashEndDistance);
        
        if (dashStartPoint && dashEndPoint) {
            // Draw the dash
            this.pathGraphics.moveTo(this.scene.getScaledValue(dashStartPoint.x), this.scene.getScaledValue(dashStartPoint.y));
            this.pathGraphics.lineTo(this.scene.getScaledValue(dashEndPoint.x), this.scene.getScaledValue(dashEndPoint.y));
            this.pathGraphics.strokePath();
            this.pathGraphics.lineStyle(this.scene.getScaledValue(3), color, 1);
        }
        
        // Schedule the next dash
        this.scene.time.delayedCall(50, () => {
            this.drawPathSegmentsProgressively(pathPoints, totalSegments, totalSegmentLength, dashLength, color, currentSegment + 1);
        });
    }

    private addStepNumber(startX: number, endX: number, yPosition: number, hopHeight: number, stepNumber: number, color: string = "#0015D3") {
        const midX = (startX + endX) / 2;
        const midY = yPosition - hopHeight - 20;
        
        const stepText = this.scene.addText(midX, midY, stepNumber.toString(), {
            font: "700 24px Exo",
            color: color,
        }).setOrigin(0.5);
        this.pathLayer.add(stepText);
        this.stepNumberTexts.push(stepText);
    }

    // For tutorial mode
    private drawAllPaths(yPosition: number, hopHeight: number, color: number) {
        if (!this.currentQuestion || !this.pathGraphics) return;
        
        const operand2 = parseInt(this.currentQuestion.operand2);
        
        // Draw path for each hop
        for (let step = 0; step < operand2; step++) {
            const { startX, endX } = this.calculateHopPositions(step);
            this.drawPathSegment(startX, endX, yPosition, hopHeight, color);
        }
    }

    private addAllStepNumbers(yPosition: number, hopHeight: number, color: string = "#0015D3") {
        if (!this.currentQuestion) return;
        
        const operand2 = parseInt(this.currentQuestion.operand2);
        
        // Add step numbers for each hop
        for (let step = 0; step < operand2; step++) {
            const { startX, endX } = this.calculateHopPositions(step);
            const stepNumber = (step + 1)
            this.addStepNumber(startX, endX, yPosition, hopHeight, stepNumber, color);
        }
    }

    // Tutorial Steps
    public playStep1() {
        if (this.isSkipped || !this.currentQuestion) return;
        
        if (!this.isInstructionMode) {
            this.scene.audioManager.duckBackgroundMusic();

            if (this.instructionVolumeIcon) {
                this.instructionVolumeIcon.destroy();
                this.instructionVolumeIcon = undefined;
            }
        }

        const questionBox = this.questionBox;
        const questionBoxBg = questionBox?.getByName('question_box_bg') as Phaser.GameObjects.Image;
        questionBoxBg.setTexture('tutorial_box');

        const questionContainer = questionBox?.getByName('question_container') as Phaser.GameObjects.Container;
        const questionText = questionContainer?.getByName('question_text') as Phaser.GameObjects.Text;
        const answerBox = questionContainer?.getByName('answer_box') as Phaser.GameObjects.Rectangle;
        const answerCursor = questionContainer?.getByName('answer_cursor') as Phaser.GameObjects.Rectangle;

        if (questionText) {
            questionText.setColor('#0015D3');
            answerBox.setStrokeStyle(3, 0x0015D3);
            answerCursor.setFillStyle(0x0015D3);
            TweenAnimations.pulse(this.scene, questionContainer, 1.1, 1500, 1);
        }

        this.disableNumberpad();

        const step1 = this.scene.audioManager.playSoundEffect('step_1');
        this.updateInstructionText(i18n.t('info.step1'));

        step1?.on('complete', () => {
            const timer = this.scene.time.delayedCall(1000, () => {
                questionText.setColor('#000000');
                answerBox.setStrokeStyle(3, 0x000000);
                answerCursor.setFillStyle(0x000000);
                this.playStep2();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playStep2() {
        if (this.isSkipped || !this.currentQuestion) return;

        const step2_1 = this.scene.audioManager.playSoundEffect('step_2');
        this.updateInstructionText(i18n.t('info.step2', { operand1: this.currentQuestion.operand1 }));

        step2_1?.on('complete', () => {
            const operand1 = parseInt(this.currentQuestion!.operand1);
            const step2_2 = this.scene.audioManager.playSoundEffect(`count_${operand1}`);
            this.playBunnyHopAnimation();
            step2_2?.on('complete', () => {
                const timer = this.scene.time.delayedCall(1000, () => {
                    this.playStep3();
                });
                this.delayedCalls.push(timer);
            });
        });
    }

    private playStep3() {
        if (this.isSkipped || !this.currentQuestion) return;

        const operand2 = parseInt(this.currentQuestion!.operand2);

        const lang = i18n.getLanguage() || "en";
        let audioKey = 'step_3';
        let startTime = 0;
        let endTime = 0;
        if (this.hopDirection === 1) {
            const textKey = this.currentQuestion!.operand2 === '1' ? 'step3_singular' : 'step3';
            this.updateInstructionText(i18n.t(`info.${textKey}`, { operand2: this.currentQuestion.operand2 }));
            startTime = lang === 'en' ? STEP_3_EN[operand2].start : STEP_3_ES[operand2].start;
            endTime = lang === 'en' ? STEP_3_EN[operand2].end : STEP_3_ES[operand2].end;
        } else {
            audioKey = 'step_3_backward';
            const textKey = this.currentQuestion!.operand2 === '1' ? 'step3_backward_singular' : 'step3_backward';
            this.updateInstructionText(i18n.t(`info.${textKey}`, { operand2: this.currentQuestion.operand2 }));
            startTime = lang === 'en' ? STEP_3_BACKWARD_EN[operand2].start : STEP_3_BACKWARD_ES[operand2].start;
            endTime = lang === 'en' ? STEP_3_BACKWARD_EN[operand2].end : STEP_3_BACKWARD_ES[operand2].end;
        }
        
        this.showTutorialPath();
        
        const step3 = this.scene.audioManager.playAudioSprite(audioKey, startTime, endTime);

        step3?.on('complete', () => {
            const timer = this.scene.time.delayedCall(1000, () => {
                this.playStep4();
            });
            this.delayedCalls.push(timer);
        })
    }

    private playStep4() {
        if (this.isSkipped || !this.currentQuestion) return;
        
        const step4 = this.scene.audioManager.playSoundEffect('step_4');
        this.updateInstructionText(i18n.t('info.step4'));

        this.destroyTutorialPath();

        let answerButton: Phaser.GameObjects.Container | null = null;
        for (const button of this.numpadButtons) {
            if ((button.getAt(1) as Phaser.GameObjects.Text).text === this.currentQuestion.answer.toString()) {
                answerButton = button;
                break;
            }
        }

        step4?.on('complete', () => {
            this.enableNumberpad();
            if (answerButton && !this.isGuidedMode) {
                this.createHandClickAnimation(answerButton);
            }
        });

        const handleCorrectAnswer = (data: { isCorrect: boolean }) => {
            if (data.isCorrect) {
                this.destroyTimers();
                this.scene.time.delayedCall(1000, () => {
                    if (this.isInstructionMode) {
                        this.scene.events.emit('showPlayButton');
                    } else {
                        this.loadNextQuestion();
                    }
                });
            }
        };

        this.scene.events.once('correctanswer', handleCorrectAnswer);
    }

    private createHandClickAnimation(targetButton: Phaser.GameObjects.Container) {
        // Create hand image for single click animation\
        const handX = targetButton.x / this.scene.display.scale + this.scene.getScaledValue(50);
        const handY = targetButton.y / this.scene.display.scale - this.scene.getScaledValue(20);
        const hand = this.scene.addImage(handX, handY, 'hand');
        hand.setOrigin(0.5);
        hand.setDepth(10);
        hand.setScale(0.13);

        // Add single click animation using both textures
        this.scene.tweens.chain({
            targets: hand,
            tweens: [
                {
                    x: targetButton.x + this.scene.getScaledValue(15),
                    y: targetButton.y + this.scene.getScaledValue(10),
                    duration: 1000,
                    ease: "Sine.easeInOut",
                    onComplete: () => {
                        hand.setTexture("hand_click");
                    }
                },
                {
                    alpha: 1,
                    duration: 500,
                    onComplete: () => {
                        hand.setTexture("hand");
                    }
                },
                {
                    alpha: 1,
                    duration: 500,
                    onComplete: () => {
                        hand.destroy();
                    }
                },
            ],
        });
    }

    private destroyTimers() {
        this.delayedCalls.forEach(timer => timer.destroy());
        this.delayedCalls = [];
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
