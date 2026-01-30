import { BaseScene, ButtonHelper, QuestionSelectorHelper, ScoreHelper, ScoreCoins, i18n, announceToScreenReader, TextOverlay, ImageOverlay, VolumeSlider, TweenAnimations, GameConfigManager, getQuestionBankByLevel, ButtonOverlay, ExpressionUtils, focusToGameContainer, AnalyticsHelper } from "@k8-games/sdk";
import { ASSETS_PATHS, BUTTONS } from "../config/common";
import { DoorUtils } from "../utils/DoorUtils";
import { ProgressBar } from "../components/ProgressBar";
import { getGameSubtitle } from "../utils/helper";

export class Inequality {
    private scene!: BaseScene;
    private totalQuestions: number = 10;
    private questionSelector?: QuestionSelectorHelper;
    private currentQuestion?: any;
    private scoreHelper: ScoreHelper;
    private scoreCoins!: ScoreCoins;
    private progressBar!: ProgressBar;
    private previousStreak: number = 0;
    private isInstructionMode: boolean = false;
    private level: number;
    private doorUtils!: DoorUtils;
    private gameSubtitle!: string;
    private analyticsHelper!: AnalyticsHelper;

    // Volume slider and mute button
    private volumeSlider!: VolumeSlider;
    private muteBtn!: Phaser.GameObjects.Container;

    // UI elements
    private questionText?: ExpressionUtils;
    private questionOverlay?: TextOverlay;
    private blocksContainer?: Phaser.GameObjects.Container;
    private blocks: Phaser.GameObjects.Container[] = [];
    // Keep parallel array of accessibility overlays for each block so we can update aria-labels with feedback
    private blockOverlays: ButtonOverlay[] = [];
    private selectedBlocks: number[] = [];
    private blockNumbers: number[] = []; // Store the numbers for each block

    // Instructions mode properties
    private correctAnswerIndices: number[] = [];
    public headingText?: Phaser.GameObjects.Text;



    // Hammer cursor bounds
    private hammerBounds = {
        x: 0,
        y: 318,
        width: 1280,
        height: 450
    };

    // Hammer animation properties
    private isHammerAnimating: boolean = false;
    private hammerSprite?: Phaser.GameObjects.Sprite;
    private isHammerDisabled: boolean = false;

    private isProcessing: boolean = false;

     // Lifeline system
    private lifelineContainer?: Phaser.GameObjects.Container;
    private lifelineImages: Phaser.GameObjects.Image[] = [];
    private lifelineText?: Phaser.GameObjects.Text;
    private lifelineTextOverlay?: TextOverlay;
    private wrongAttempts: number = 0;
    private maxWrongAttempts: number = 3;

    constructor(scene: BaseScene, level: number, isInstructionMode: boolean = false, questionSelector?: QuestionSelectorHelper) {
        this.scene = scene;
        this.level = level;
        this.isInstructionMode = isInstructionMode;
        this.scoreHelper = new ScoreHelper(2);
        
        if (questionSelector) {
            this.questionSelector = questionSelector;
        } else {
            // Only initialize question selector if not in instruction mode
            if (!this.isInstructionMode) {
                const gameConfigManager = GameConfigManager.getInstance();
                const topic = gameConfigManager.get('topic') || 'grade6_topic4';

                const questionBank = getQuestionBankByLevel(topic, level);
                if (questionBank) {
                    this.questionSelector = new QuestionSelectorHelper(questionBank, this.totalQuestions);
                }
            }
        }
    }

    static _preload(scene: BaseScene) {
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen`);
        scene.load.image('diamond', 'diamond.png');
        scene.load.image('block_default', 'block_default.png');
        scene.load.image('block_hover', 'block_hover.png');
        scene.load.image('block_pressed', 'block_pressed.png');
        scene.load.image('block_correct', 'block_correct.png');
        scene.load.image('block_incorrect', 'block_incorrect.png');
        scene.load.image('correct_icon', 'correct_icon.png');
        scene.load.image('incorrect_icon', 'incorrect_icon.png');
        scene.load.image('block_break_1', 'block_break_1.png');
        scene.load.image('block_break_2', 'block_break_2.png');
        scene.load.image('block_break_3', 'block_break_3.png');
        scene.load.image('lifeline_full', 'lifeline_full.png');
        scene.load.image('lifeline_empty', 'lifeline_empty.png');

        // Load audio assets
        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}`);
        scene.load.audio('positive-sfx', 'positive.mp3');
        scene.load.audio('negative-sfx', 'negative.mp3');
        scene.load.audio('bg_music', 'bg_music.mp3');
        scene.load.audio('door_close', 'door_close.mp3');

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

        scene.load.setPath(`${ASSETS_PATHS.ATLAS}/hammer`);
        scene.load.atlas('hammer', 'spritesheet.png', 'spritesheet.json');

        scene.load.setPath(`${ASSETS_PATHS.ATLAS}/smoke`);
        scene.load.atlas('smoke', 'spritesheet.png', 'spritesheet.json');

        ScoreCoins.preload(scene, 'purple');
        VolumeSlider.preload(scene, 'purple');
    }

    init(data?: { reset?: boolean }) {
        ScoreCoins.init(this.scene);

        if (data?.reset) {
            this.resetGame();
        }

        // Create hammer animation
        if (!this.scene.anims.exists('hammer_swing')) {
            this.scene.anims.create({
                key: 'hammer_swing',
                frames: 'hammer',
                frameRate: 14,
                repeat: 0
            });
        }

        if (!this.scene.anims.exists('smoke_animation')) {
            this.scene.anims.create({
                key: 'smoke_animation',
                frames: 'smoke',
                frameRate: 24,
                repeat: 0,
                hideOnComplete: true
            })
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

        // Create background
        this.scene.addImage(this.scene.display.width / 2, this.scene.display.height / 2, `game_scene_bg_${this.level}_inequality`).setOrigin(0.5);
        this.doorUtils = new DoorUtils(this.scene);

        // Initialize audio manager
        this.scene.audioManager.initialize(this.scene);

        if(!this.isInstructionMode) {
            this.doorUtils.openDoors();
        }
        
        // Only play background music in game mode, not in instructions mode
        if (!this.isInstructionMode) {
            this.scene.audioManager.playBackgroundMusic('bg_music');
        }

        // Only create progress bar and score coins if not in instruction mode
        if (!this.isInstructionMode) {
            // Create progress bar
            this.progressBar = new ProgressBar(this.scene);
            this.progressBar.create(76);
            // Create score coins
            this.scoreCoins = new ScoreCoins(this.scene, this.scoreHelper, i18n, 'purple');
            this.scoreCoins.create(
                this.scene.getScaledValue(105),
                this.scene.getScaledValue(67)
            );
        }

        // Create UI buttons
        if(!this.isInstructionMode) {
            this.createButtons();
        }

        this.headingText = this.scene.addText(this.scene.display.width / 2, 215, this.isInstructionMode ? "" : i18n.t('game.inequalityHeading'), {
            font: "400 20px Exo",
        }).setOrigin(0.5);
        new TextOverlay(this.scene, this.headingText, { label: this.headingText.text, tag: 'h1' });
        
        const questionY = 275;
        
        // Create question text
        this.questionText = new ExpressionUtils(this.scene, this.scene.display.width / 2, questionY, ' ', {
            fontSize: "36px",
            fontFamily: "Exo",
            fontColor: 0xffffff,
            spacing: 5
        });

        // Create blocks container
        this.blocksContainer = this.scene.add.container(this.scene.getScaledValue(this.scene.display.width / 2), this.scene.getScaledValue(400));

        // Add mouse move listener for hammer cursor
        this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            this.handleMouseMove(pointer.x, pointer.y);
        });

        // Create hammer sprite and animation
        this.createHammerSprite();
        
        // Add click listener for hammer animation
        this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.handleMouseClick(pointer.x, pointer.y);
        });

        // Reset cursor when leaving game
        this.scene.game.events.on('blur', () => {
            document.body.style.cursor = 'default';
            if (this.hammerSprite) {
                this.hammerSprite.setVisible(false);
            }
        });

        // Create lifeline display
        this.createLifelineDisplay();

        // Load first question
        this.loadNextQuestion();
    }

    private createHammerSprite() {
        // Create hammer sprite
        this.hammerSprite = this.scene.addSprite(0, 0, 'hammer');
        this.hammerSprite.setFrame('hammer instance 10003');
        this.hammerSprite.setScale(0.2); // Scale down the sprite
        this.hammerSprite.setVisible(false);
        this.hammerSprite.setDepth(50);
        this.hammerSprite.setFlipX(true);
    }

    private createLifelineDisplay(): void {
        if (this.isInstructionMode) return;
        
        this.lifelineContainer = this.scene.add.container(this.scene.getScaledValue(34), this.scene.getScaledValue(218));
        
        for (let i = 0; i < this.maxWrongAttempts; i++) {
            const lifelineImage = this.scene.addImage(i * 28, 0, 'lifeline_full').setOrigin(0.5);
            this.lifelineImages.push(lifelineImage);
            this.lifelineContainer.add(lifelineImage);
        }
        
        const remainingLifelines = this.maxWrongAttempts - this.wrongAttempts;
        this.lifelineText = this.scene.addText(
            this.maxWrongAttempts * 28 + 15, 
            0, 
            `(${remainingLifelines}/${this.maxWrongAttempts})`,
            {
                font: "400 16px Exo",
            }
        ).setOrigin(0.5);

        this.lifelineTextOverlay = new TextOverlay(this.scene, this.lifelineText, { label: i18n.t('game.attemptsRemaining', { attempts: remainingLifelines }), tag: 'h2' });
        
        this.lifelineContainer.add(this.lifelineText);
    }

    private updateLifelineDisplay(): void {
        // Only update lifeline display if not in instruction mode and lifelines exist
        if (this.isInstructionMode || this.lifelineImages.length === 0) return;
        
        for (let i = 0; i < this.lifelineImages.length; i++) {
            if (i < this.maxWrongAttempts - this.wrongAttempts) {
                this.lifelineImages[i].setTexture('lifeline_full');
            } else {
                this.scene.tweens.add({
                    targets: this.lifelineImages[i],
                    scale: this.scene.getScaledValue(1.3),
                    duration: 150,
                    ease: 'Power2',
                    yoyo: true,
                    onComplete: () => {
                        this.lifelineImages[i].setTexture('lifeline_empty');
                    }
                })
                break;
            }
        }
        
        // Update the lifeline count text
        if (this.lifelineText) {
            const remainingLifelines = this.maxWrongAttempts - this.wrongAttempts;
            this.lifelineText.setText(`(${remainingLifelines}/${this.maxWrongAttempts})`);
            const label = remainingLifelines === 1 ? i18n.t('game.attemptRemaining', { attempts: remainingLifelines }) : i18n.t('game.attemptsRemaining', { attempts: remainingLifelines });
            this.lifelineTextOverlay?.updateContent(label);
        }
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
            y: 146,
            raisedOffset: 3.5,
            onClick: () => {
                this.scene.audioManager.setMute(!this.scene.audioManager.getIsAllMuted());
            },
        });

        // Volume slider
        this.volumeSlider = new VolumeSlider(this.scene);
        this.volumeSlider.create(this.scene.display.width - 220, this.isInstructionMode ? 256 : 238, 'purple', i18n.t('common.volume'));
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
            y: 232,
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
            y: 318,
            raisedOffset: 3.5,
            onClick: () => {
                this.scene.audioManager.stopBackgroundMusic();
                this.scene.scene.pause();
                this.scene.scene.launch('InstructionsScene', {
                    level: this.level,
                    mechanic: 'inequality',
                    parentScene: 'GameScene',
                });
                this.scene.scene.bringToTop("InstructionsScene");
            },
        });
    }

    private loadNextQuestion(): void {
        this.isProcessing = false;
        this.wrongAttempts = 0;
        
        // Get the next question first to check if game is over
        if (this.isInstructionMode) {
            this.currentQuestion = {
                operand1: "x + 3 < 10",
                answer: "0,3,6,−1,5",
                incorrectOptions: "7,8,9,12,15"
            };
        } else {
            this.currentQuestion = this.questionSelector?.getNextQuestion();
        }
        
        // Check if game is over
        if (!this.currentQuestion) {
            this.gameOver();
            return;
        }

        this.selectedBlocks = [];

        // Clean up previous UI
        this.cleanupUI();

        // Display the question
        this.updateQuestionBlock(this.currentQuestion.operand1);

        // Create blocks with numbers
        this.createBlocks();
    }

    private updateQuestionBlock(question: string) {
        if (this.questionText) {
            const formattedQuestion = question.replace(/x/gi, "𝑥").replace(/[-–]/g, "−");
            this.questionText.setExpression(formattedQuestion);
            this.questionOverlay = new TextOverlay(this.scene, this.questionText.getContainer().getAt(0) as Phaser.GameObjects.Text, { label: formattedQuestion, tag: 'h2', announce: true });
            this.questionOverlay?.updateContent(formattedQuestion);
            this.scene.time.delayedCall(100, () => {
                announceToScreenReader(formattedQuestion);
            });
        }
    }

    private shuffleOptions(correctOptions: string[], incorrectOptions: string[]): string[] {
        const allOptions = [...correctOptions, ...incorrectOptions];

        // Fisher–Yates shuffle
        for (let i = allOptions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allOptions[i], allOptions[j]] = [allOptions[j], allOptions[i]];
        }

        return allOptions;
    }

    private createBlocks(): void {
        if (!this.currentQuestion || !this.blocksContainer) return;

        // Combine correct answers and incorrect options
        const correctAnswers = this.currentQuestion.answer.split(',').map((opt: string) => opt.trim());
        const incorrectOptions = this.currentQuestion.incorrectOptions.split(',').map((opt: string) => opt.trim());
        
        // Shuffle the options array to randomize the arrangement
        const shuffledOptions = this.shuffleOptions(correctAnswers, incorrectOptions);
        
        // Placement config
        const blockSize = 108;
        const xGap = 120;
        const yGap = 90;
        const rows = 2;
        const cols = Math.ceil(shuffledOptions.length / rows);
        const centerX = 0;
        const centerY = 120;
        const xJitter = 60; // horizontal random offset
        const yJitter = 45; // vertical random offset

        // Generate all grid positions
        const gridPositions: {x: number, y: number}[] = [];
        for (let i = 0; i < shuffledOptions.length; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;
            const totalGridWidth = (cols - 1) * (blockSize + xGap);
            const totalGridHeight = (rows - 1) * (blockSize + yGap);
            const baseX = centerX - totalGridWidth / 2 + col * (blockSize + xGap);
            const baseY = centerY - totalGridHeight / 2 + row * (blockSize + yGap);
            gridPositions.push({x: baseX, y: baseY});
        }

        // Place blocks
        gridPositions.forEach((pos, index) => {
            const offsetX = (Math.random() - 0.5) * 2 * xJitter;
            const offsetY = (Math.random() - 0.5) * 2 * yJitter;
            this.createBlock(pos.x + offsetX, pos.y + offsetY, shuffledOptions[index], index);
        });
    }

    private createBlock(x: number, y: number, number: string, index: number): void {
        if (!this.blocksContainer) return;

        const block = this.scene.add.container(this.scene.getScaledValue(x), this.scene.getScaledValue(y));
        
        // Create block background
        const blockBg = this.scene.addImage(0, 0, 'block_default').setOrigin(0.5);
        block.add(blockBg);
        
        // Create number text with proper minus sign for display
        const displayNumber = number.replace(/[-–]/g, "−");
        const fontSize = displayNumber.length >= 3 ? "700 32px Exo" : "700 42px Exo";
        const numberText = this.scene.addText(0, 0, displayNumber, {
            font: fontSize,
            color: "#FFFFFF",
        }).setOrigin(0.5);
        block.add(numberText);
        
        const handlePointerDown = () => {
            if (!this.isProcessing) {
                this.hammerSprite?.setPosition(block.getBounds().centerX + this.scene.getScaledValue(35), block.getBounds().centerY - this.scene.getScaledValue(28));
                this.startHammerAnimation(() => {
                    // Reset hammer position to current mouse position after animation
                    const pointer = this.scene.input.activePointer;
                    if (pointer && this.hammerSprite) {
                        this.hammerSprite.setPosition(pointer.x, pointer.y);
                    }
                });
                this.onBlockSelected(index, parseInt(number));
            }
        }

        const handlePointerOver = () => {
            if (!this.selectedBlocks.includes(index) && (!this.isInstructionMode || this.correctAnswerIndices.includes(index)) && !this.isProcessing) {
                blockBg.setTexture('block_hover');
            }
        }

        const handlePointerOut = () => {
            if (!this.selectedBlocks.includes(index) && !this.isProcessing) {
                blockBg.setTexture('block_default');
            }
        }

        // Make block interactive
        blockBg.setInteractive({ cursor: '' });
        blockBg.on('pointerdown', handlePointerDown);
        blockBg.on('pointerover', handlePointerOver);
        blockBg.on('pointerout', handlePointerOut);
        
        this.blocks.push(block);
        this.blockNumbers.push(parseInt(number));
        this.blocksContainer.add(block);

        const blockOverlay = new ButtonOverlay(this.scene, block, { 
            label: i18n.t('game.answerOption', { number: number }), 
            onKeyDown: handlePointerDown, 
            onFocus: handlePointerOver, 
            onBlur: handlePointerOut, 
            cursor: 'inherit',
            style: {
                width: `${blockBg.getBounds().width}px`,
                height: `${blockBg.getBounds().height}px`
            } 
        });
        // Store overlay reference explicitly so we can update aria-label with feedback later
        this.blockOverlays[index] = blockOverlay;
    }

    private onBlockSelected(blockIndex: number, number: number): void {
        // Don't allow selection if block is already selected
        if (this.selectedBlocks.includes(blockIndex)) {
            return;
        }


        if (this.isProcessing) {
            return;
        }

        // In instructions mode, only allow selection of highlighted blocks (correct answers)
        if (this.isInstructionMode && !this.correctAnswerIndices.includes(blockIndex)) {
            return;
        }
        
        // Select block
        this.selectedBlocks.push(blockIndex);
        
        // Check if this is a correct or incorrect selection
        this.checkBlockSelection(number);
    }

    private updateBlockVisual(blockIndex: number, state: 'normal' | 'correct' | 'incorrect' | 'highlighted'): void {
        const block = this.blocks[blockIndex];
        if (!block) return;

        const blockBg = block.getAt(0) as Phaser.GameObjects.Image;
        const numberText = block.getAt(1) as Phaser.GameObjects.Text;
        
        switch (state) {
            case 'normal':
                blockBg.setTexture('block_default');
                blockBg.clearTint();
                break;
            case 'correct':
                this.scene.time.delayedCall(700, () => {
                    this.playBlockBreakAnimation(blockIndex, () => {
                        blockBg.setTexture('block_correct');
                        numberText.setColor('#000000');
                        TweenAnimations.scaleUp(this.scene, block, 300, 0.8, 1.2, 0, () => {
                            TweenAnimations.scaleUp(this.scene, block, 200, 1.2, 1.0);
                        });
                    });
                });
                break;
            case 'incorrect':
                this.scene.time.delayedCall(700, () => {
                    this.playBlockBreakAnimation(blockIndex, () => {
                        blockBg.setTexture('block_incorrect');
                        numberText.setColor('#000000');
                        TweenAnimations.shake(this.scene, block, 8, 600);
                    });
                });
                break;
            case 'highlighted':
                blockBg.setTexture('block_default');
                blockBg.setTint(0xFFFF00);
                // Start pulse animation on the block for 2 seconds (2 cycles of 1 second each)
                TweenAnimations.pulse(this.scene, block, 1.1, 1000, 2);
                break;
        }
    }

    private checkBlockSelection(number: number): void {
        if (!this.currentQuestion) return;

        const correctAnswers = this.currentQuestion.answer.split(',').map((ans: string) => parseInt(ans.trim()));
        const isCorrect = correctAnswers.includes(number);

        if (isCorrect) {
            // Correct selection
            this.scene.audioManager.playSoundEffect('positive-sfx');
            const selectedBlockIndex = this.selectedBlocks[this.selectedBlocks.length - 1];
            // Update aria-label immediately so SR users know which stone was correct
            const overlay = this.blockOverlays[selectedBlockIndex];
            if (overlay) {
                const ariaLabel = i18n.t('game.answerOption', { number }) + ', ' + i18n.t('common.correctFeedback');
                overlay.setLabel(ariaLabel);
            }
            // Restore focus to game container to ensure announcements are heard
            focusToGameContainer();
            this.scene.time.delayedCall(100, () => {
                // Announce immediately for keyboard users (space/enter)
                announceToScreenReader(i18n.t('common.correctFeedback'));
            });
            
            // Update block visual to show correct state
            this.updateBlockVisual(selectedBlockIndex, 'correct');
            
            // In instructions mode, update highlighting for remaining correct blocks
            if (this.isInstructionMode) {
                this.highlightAllCorrectBlocks();
            }
            
            // Check if all correct blocks are selected
            const selectedNumbers = this.selectedBlocks.map(index => this.blockNumbers[index]);
            
            const allCorrectSelected = correctAnswers.every((ans: number) => selectedNumbers.includes(ans));
            
            if (allCorrectSelected) {
                // All correct blocks selected - question complete
                if (this.isInstructionMode) {
                    // Emmit correct answer event for tutorial
                    this.scene.events.emit('correctanswer', {isCorrect: true});
                } else {
                    this.analyticsHelper?.createTrial({
                        questionMaxPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                        achievedPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                        questionText: this.currentQuestion.operand1,
                        isCorrect: true,
                        questionMechanic: 'default',
                        gameLevelInfo: `game.algebra_trials.${this.gameSubtitle}`,
                        studentResponse: selectedNumbers.join(','),
                        studentResponseAccuracyPercentage: this.getAccuracyPercentage(selectedNumbers),
                        optionsDisplay: this.getOptionsDisplay(),
                    });
                    // Normal game mode
                    // Update score and progress
                    this.questionSelector?.answerCorrectly();
                    this.scoreHelper.answerCorrectly();
                    this.previousStreak = this.scoreHelper.getCurrentStreak();
                    
                    // Update score and streak displays
                    this.scoreCoins?.updateScoreDisplay(true);
                    this.isProcessing = true;

                    // Update progress bar
                    const progress = this.questionSelector!.getTotalQuestionsAnswered() / this.totalQuestions;
                    this.progressBar.updateProgress(progress*100);
                    this.showSuccessAnimation();

                    if (this.scoreHelper.showStreakAnimation()) {
                        this.showMascotCelebration();
                    }
                }
            }
        } else {
            // Incorrect selection - handle wrong attempt
            this.wrongAttempts++;
            this.updateLifelineDisplay();
            
            this.scene.audioManager.playSoundEffect('negative-sfx');
            const selectedBlockIndex = this.selectedBlocks[this.selectedBlocks.length - 1];
            const overlay = this.blockOverlays[selectedBlockIndex];
            if (overlay) {
                const ariaLabel = i18n.t('game.answerOption', { number }) + ', ' + i18n.t('common.incorrectFeedback');
                overlay.setLabel(ariaLabel);
            }
            // Restore focus to game container to ensure announcements are heard
            focusToGameContainer();
            this.scene.time.delayedCall(100, () => {
                announceToScreenReader(i18n.t('common.incorrectFeedback'));
            });
            // Store the incorrect block index before popping it
            const incorrectBlockIndex = this.selectedBlocks[this.selectedBlocks.length - 1];
            
            // Update block visual to show incorrect state
            this.updateBlockVisual(incorrectBlockIndex, 'incorrect');
            
            if (this.wrongAttempts >= this.maxWrongAttempts) {
                // Max wrong attempts reached - move to next question
                this.isProcessing = true;
                
                if (!this.isInstructionMode) {
                    const selectedNumbers = this.selectedBlocks.map(index => this.blockNumbers[index]);

                    this.analyticsHelper?.createTrial({
                        questionMaxPoints: (this.scoreHelper.getCurrentMultiplier() || 1) + this.previousStreak,
                        achievedPoints: 0,
                        questionText: this.currentQuestion.operand1,
                        isCorrect: false,
                        questionMechanic: 'default',
                        gameLevelInfo: `game.algebra_trials.${this.gameSubtitle}`,
                        studentResponse: selectedNumbers.join(','),
                        studentResponseAccuracyPercentage: this.getAccuracyPercentage(selectedNumbers),
                        optionsDisplay: this.getOptionsDisplay(),
                    });
                    // Only update score and progress in game mode
                    this.questionSelector?.answerIncorrectly(this.currentQuestion);
                    this.scoreHelper.answerIncorrectly();
                    
                    // Update score and streak displays
                    this.scoreCoins?.updateScoreDisplay(false, this.previousStreak >= 3);
                    const progress = this.questionSelector!.getTotalQuestionsAnswered() / this.totalQuestions;
                    this.progressBar.updateProgress(progress*100, true);
                    this.previousStreak = this.scoreHelper.getCurrentStreak();
                }
                
                this.showErrorAnimation();
            } else {
                // Still have attempts left - allow player to continue
                this.isProcessing = false;
            }
        }
    }

    private getOptionsDisplay(): Array<{ option: string; isCorrect: boolean }> {
        const allOptions = this.blockNumbers.map(String);
        const correctAnswersStr = this.currentQuestion.answer.split(',').map((ans: string) => ans.trim());
        
        const optionsDisplay = allOptions.map((option) => ({
            option: option,
            isCorrect: correctAnswersStr.includes(option)
        }));

        return optionsDisplay;
    }

    private getAccuracyPercentage(selectedNumbers: number[]): string {
        const correctAnswersStr = this.currentQuestion.answer.split(',').map((ans: string) => ans.trim());

        const selectedNumbersStr = selectedNumbers.map(String);
        const correctSelections = selectedNumbersStr.filter(num => correctAnswersStr.includes(num)).length;
        const accuracyPercentage = selectedNumbersStr.length > 0 
            ? (correctSelections / selectedNumbersStr.length * 100).toFixed(2) + '%' 
            : '0%';
        return accuracyPercentage;
    }

    private showMascotCelebration(cb?: () => void) {
        this.scene.time.delayedCall(1000, () => {
            const streak = this.scoreHelper.getCurrentStreak();
            if (streak >= 3) {
                // Announce BEFORE pausing / launching new scene to avoid focus loss swallowing live region update
                const msg = i18n.t('game.inARow', { count: streak });
                console.log('streak announce (pre-pause)', streak, msg);
                announceToScreenReader(msg);
            }
            this.scene.time.delayedCall(150, () => {
                this.scene.scene.pause();
                this.scene.scene.launch('CelebrationScene', {
                    scoreHelper: this.scoreHelper,
                    progress: this.questionSelector!.getTotalQuestionsAnswered() / this.totalQuestions,
                    callback: () => {
                        cb?.();
                    }
                });
                this.scene.scene.bringToTop('CelebrationScene');
                // Fallback re-announce after scene transition if first was missed
                if (streak >= 3) {
                    this.scene.time.delayedCall(200, () => {
                        const msg2 = i18n.t('game.inARow', { count: streak });
                        announceToScreenReader(msg2);
                    });
                }
            });
        });
    }

    private showSuccessAnimation(): void {
        const width = this.scene.display.width;
        const height = 122;
        const successContainer = this.scene.add.container(
            this.scene.getScaledValue(this.scene.display.width / 2), 
            this.scene.getScaledValue(this.scene.display.height + height / 2)
        );
        successContainer.setDepth(100);

        // Create background rectangle
        const bgRect = this.scene.addRectangle(0, 0, width, height, 0x1A8B29);
        successContainer.add(bgRect);

        const bgRectTop = this.scene.addRectangle(0, -height / 2, width, 7, 0x24E13E).setOrigin(0.5, 0);
        successContainer.add(bgRectTop);

        // Create icon and text
        const icon = this.scene.addImage(0, 0, 'correct_icon').setOrigin(0.5);
        successContainer.add(icon);

        const gap = this.scene.getScaledValue(10);
        const iconWidth = icon.getBounds().width;
        let totalWidth = iconWidth + gap;

        // Add text
        const text = this.scene.addText(0, 0, i18n.t('common.correct'), {
            font: "700 32px Exo",
            color: "#FFFFFF",
        });
        text.setOrigin(0.5);
        successContainer.add(text);

        const textWidth = text.getBounds().width;
        totalWidth += textWidth;

        // Center icon and text together
        icon.setPosition(-totalWidth / 2 + iconWidth / 2, 0);
        text.setPosition(-totalWidth / 2 + iconWidth + gap + textWidth / 2, 0);

        // Simple slide up animation
        this.scene.tweens.add({
            targets: successContainer,
            y: this.scene.getScaledValue(this.scene.display.height - height / 2),
            delay: 500,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                new ImageOverlay(this.scene, icon, { label: i18n.t('common.correct') + ' ' + i18n.t('common.icon') });
                new TextOverlay(this.scene, text, { label: i18n.t('common.correct') });
                
                // Wait for a moment and then slide down
                this.scene.time.delayedCall(500, () => {
                    this.scene.tweens.add({
                        targets: successContainer,
                        y: this.scene.getScaledValue(this.scene.display.height + height / 2),
                        duration: 1000,
                        ease: "Power2",
                        onComplete: () => {
                            successContainer.destroy();
                            this.loadNextQuestion();
                        }
                    });
                });
            }
        });
    }

    private showErrorAnimation(): void {
        const width = this.scene.display.width;
        const height = 122;
        const errorContainer = this.scene.add.container(
            this.scene.getScaledValue(this.scene.display.width / 2), 
            this.scene.getScaledValue(this.scene.display.height + height / 2)
        );
        errorContainer.setDepth(100);

        // Create background rectangle
        const bgRect = this.scene.addRectangle(0, 0, width, height, 0x8B0000);
        errorContainer.add(bgRect);

        const bgRectTop = this.scene.addRectangle(0, -height / 2, width, 7, 0xF40000).setOrigin(0.5, 0);
        errorContainer.add(bgRectTop);

        // Create icon and text
        const icon = this.scene.addImage(0, 0, 'incorrect_icon').setOrigin(0.5);
        errorContainer.add(icon);

        const gap = this.scene.getScaledValue(10);
        const iconWidth = icon.getBounds().width;
        let totalWidth = iconWidth + gap;

        // Add text
        const text = this.scene.addText(0, 0, i18n.t('common.incorrect'), {
            font: "700 32px Exo",
            color: "#FFFFFF",
        });
        text.setOrigin(0.5);
        errorContainer.add(text);

        const textWidth = text.getBounds().width;
        totalWidth += textWidth;

        // Center icon and text together
        icon.setPosition(-totalWidth / 2 + iconWidth / 2, 0);
        text.setPosition(-totalWidth / 2 + iconWidth + gap + textWidth / 2, 0);

        // Simple slide up animation
        this.scene.tweens.add({
            targets: errorContainer,
            y: this.scene.getScaledValue(this.scene.display.height - height / 2),
            delay: 500,
            duration: 500,
            ease: "Power2",
            onComplete: () => {
                new ImageOverlay(this.scene, icon, { label: i18n.t('common.incorrect') + ' ' + i18n.t('common.icon') });
                new TextOverlay(this.scene, text, { label: i18n.t('common.incorrect') });
                
                // Wait for a moment and then slide down
                this.scene.time.delayedCall(500, () => {
                    this.scene.tweens.add({
                        targets: errorContainer,
                        y: this.scene.getScaledValue(this.scene.display.height + height / 2),
                        duration: 1000,
                        ease: "Power2",
                        onComplete: () => {
                            errorContainer.destroy();
                            this.loadNextQuestion();
                        }
                    });
                });
            }
        });
    }

    public initializeInstructionsMode(): void {
        if (!this.currentQuestion) return;

        // Get correct answers
        const correctAnswers = this.currentQuestion.answer.split(',').map((ans: string) => parseInt(ans.trim()));
        
        // Find indices of correct blocks
        this.correctAnswerIndices = [];
        this.blockNumbers.forEach((number, index) => {
            if (correctAnswers.includes(number)) {
                this.correctAnswerIndices.push(index);
            }
        });

        // Highlight all correct blocks at once
        this.highlightAllCorrectBlocks();
    }

    private highlightAllCorrectBlocks(): void {
        // Highlight all correct blocks that haven't been selected yet
        this.correctAnswerIndices.forEach(index => {
            if (!this.selectedBlocks.includes(index)) {
                const block = this.blocks[index];
                const blockBg = block.getAt(0) as Phaser.GameObjects.Image;
                
                // Only apply highlight if the block isn't already highlighted (yellow tint)
                if (blockBg.tint !== 0xFFFF00) {
                    this.updateBlockVisual(index, 'highlighted');
                }
            }
        });
    }

    private cleanupUI(): void {
        // Clear all blocks
        if (this.blocksContainer) {
            for (const block of this.blocks) {
                block.destroy();
            }
        }
        this.blocks = [];
        this.blockNumbers = [];
        this.blockOverlays = [];
        
        // Reset instructions mode properties
        this.correctAnswerIndices = [];
        
        // Reset lifeline display for new question
        this.wrongAttempts = 0;
        this.updateLifelineDisplay();
    }

    private gameOver(): void {
        this.doorUtils.closeDoors(() => {
            this.scoreHelper.setPlannedTotalQuestions(this.totalQuestions);
            const finalScore = this.scoreHelper.endGame();

            this.scene.time.delayedCall(1000, () => {
                document.body.style.cursor = 'default';
                if (this.hammerSprite) {
                    this.hammerSprite.setVisible(false);
                }
                this.scene.scene.start('Scoreboard', {
                    totalRounds: this.scoreHelper.getTotalQuestions(),
                    rounds: this.scoreHelper.getCorrectAnswers(),
                    score: finalScore,
                    mechanic: 'inequality',
                    level: this.level
                });
            });
        }, false);
    }

    private resetGame(): void {
        // Reset hammer animation state
        this.isHammerAnimating = false;
        if (this.hammerSprite) {
            this.hammerSprite.setVisible(false);
            this.hammerSprite.setFrame('hammer instance 10003');
        }
        
        this.questionSelector?.reset();
        this.scoreHelper.reset();
        this.selectedBlocks = [];
        this.cleanupUI();
        
        // Reset instructions mode properties
        this.correctAnswerIndices = [];
        
        // Reset processing flag
        this.isProcessing = false;
        
        // Reset lifeline system
        this.wrongAttempts = 0;
        this.updateLifelineDisplay();
    }

    // Hammer cursor methods
    private handleMouseMove(x: number, y: number): void {
        // Don't change cursor if hammer animation is in progress or hammer is disabled
        if (this.isHammerAnimating || this.isHammerDisabled) return;

        // Check if mouse is within hammer bounds
        let isInBounds = x >= this.scene.getScaledValue(this.hammerBounds.x) && 
                          x <= this.scene.getScaledValue(this.hammerBounds.x + this.hammerBounds.width) &&
                          y >= this.scene.getScaledValue(this.hammerBounds.y) && 
                          y <= this.scene.getScaledValue(this.hammerBounds.y + this.hammerBounds.height) &&
                          !(x >= this.scene.getScaledValue(this.scene.display.width - 90) && y <= this.scene.getScaledValue(348)); // help button area - restricted

        if (isInBounds && this.hammerSprite) {
            // Show hammer sprite and update position
            this.hammerSprite.setVisible(true);
            this.hammerSprite.setPosition(x, y);
            // Hide cursor
            document.body.style.cursor = 'none';
        } else {
            // Hide hammer sprite and show default cursor
            if (this.hammerSprite) {
                this.hammerSprite.setVisible(false);
            }
            document.body.style.cursor = 'default';
        }
    }

    private handleMouseClick(x: number, y: number): void {
        // Don't handle clicks if hammer is disabled
        if (this.isHammerDisabled) return;
        
        // Check if mouse is within hammer bounds
        const isInBounds = x >= this.scene.getScaledValue(this.hammerBounds.x) && 
                          x <= this.scene.getScaledValue(this.hammerBounds.x + this.hammerBounds.width) &&
                          y >= this.scene.getScaledValue(this.hammerBounds.y) && 
                          y <= this.scene.getScaledValue(this.hammerBounds.y + this.hammerBounds.height) &&
                          !(x >= this.scene.getScaledValue(this.scene.display.width - 90) && y <= this.scene.getScaledValue(348)); // help button area - restricted

        if (isInBounds && !this.isHammerAnimating) {
            this.startHammerAnimation();
        }
    }

    private startHammerAnimation(onComplete?: () => void): void {
        if (this.isHammerAnimating || !this.hammerSprite) return;

        this.isHammerAnimating = true;
        
        // Play hammer swing animation
        this.hammerSprite.play('hammer_swing');
        
        // Reset animation state after animation completes
        this.hammerSprite.once('animationcomplete', () => {
            this.isHammerAnimating = false;
            // Reset to first frame
            this.hammerSprite?.setFrame('hammer instance 10003');
            
            this.playSmokeAnimation();
            
            onComplete?.();
        });
    }

    private playSmokeAnimation(): void {
        if (!this.hammerSprite) return;
        
        const smokeSprite = this.scene.addSprite(
            this.hammerSprite.getBounds().centerX / this.scene.display.scale - 25, 
            this.hammerSprite.getBounds().centerY / this.scene.display.scale + 25, 
            'smoke'
        );
        smokeSprite.setScale(0.3);
        smokeSprite.setDepth(40);
        
        smokeSprite.play('smoke_animation');
        
        smokeSprite.once('animationcomplete', () => {
            smokeSprite.destroy();
        });
    }

    private playBlockBreakAnimation(blockIndex: number, cb?: () => void): void {
        if (!this.hammerSprite) return;

        const block = this.blocks[blockIndex];
        const blockBg = block.getAt(0) as Phaser.GameObjects.Image;
        
        // Cycle through break textures on the block background itself
        blockBg.setTexture('block_break_1');
        
        let frameCount = 1;
        const interval = setInterval(() => {
            frameCount++;
            
            if (frameCount === 2) {
                blockBg.setTexture('block_break_2');
            } else if (frameCount === 3) {
                blockBg.setTexture('block_break_3');
            } else if (frameCount === 4) {
                // Animation complete
                clearInterval(interval);
                cb?.();
            }
        }, 100);
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

    /**
     * Gets the question selector instance
     */
    public getQuestionSelector(): QuestionSelectorHelper | undefined {
        return this.questionSelector;
    }

    /**
     * Gets the level
     */
    public getLevel(): number {
        return this.level;
    }

    public hideHammerSprite(): void {
        this.isHammerDisabled = true;
        if (this.hammerSprite) {
            this.hammerSprite.setVisible(false);
        }
        document.body.style.cursor = 'default';
    }
} 