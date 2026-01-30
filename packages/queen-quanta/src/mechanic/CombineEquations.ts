import { BaseScene, ButtonHelper, QuestionSelectorHelper, ScoreHelper, ScoreCoins, i18n, GameConfigManager, getQuestionBankByLevel, VolumeSlider, Question, announceToScreenReader, ImageOverlay, TextOverlay, ButtonOverlay, focusToGameContainer, AnalyticsHelper } from "@k8-games/sdk";
import { ASSETS_PATHS, BUTTONS } from "../config/common";
import { TileButtonData, TileConfig, TileState, DropZoneBounds, ButtonConfig, TileData, ANIMATION_DURATION, ANIMATION_DELAY, DROP_ZONE_PADDING, DROP_ZONE_HEIGHT, BUTTON_SIZE, TILE_COLLISION_SIZE } from "../config/combineEquationsConfig";
import { DoorUtils } from "../utils/DoorUtils";
import { ProgressBar } from "../components/ProgressBar";
import { getGameSubtitle } from "../utils/helper";

export class CombineEquations {
    private scene!: BaseScene;
    private level: number;
    private totalQuestions: number = 10;
    private questionSelector: QuestionSelectorHelper;
    private currentQuestion?: any;
    private scoreHelper: ScoreHelper;
    private scoreCoins!: ScoreCoins;
    private previousStreak: number = 0;
    private muteBtn!: Phaser.GameObjects.Container;
    private equations: Array<{
        equation: Phaser.GameObjects.Text;
    }> = [];

    public optionButtons: Phaser.GameObjects.Container[] = [];
    private errorBoard!: Phaser.GameObjects.Image;
    private successBoard!: Phaser.GameObjects.Image;
    public tileButtons: Map<string, TileButtonData> = new Map();
    private dropZone!: Phaser.GameObjects.Rectangle;
    private originalPositions: Map<string, { x: number; y: number }> = new Map();
    private progressBar!: ProgressBar;
    public titleText!: Phaser.GameObjects.Text;
    private doorUtils!: DoorUtils;
    private isInstructionMode: boolean;
    private occupiedGridPositions: Set<string> = new Set();
    private isProcessing: boolean = false;
    private gameConfigManager!: GameConfigManager;
    private topic!: string;
    private gameSubtitle!: string;
    private analyticsHelper!: AnalyticsHelper;
    private announcementQueue: string[] = [];
    private isAnnouncing: boolean = false;
    private volumeSlider!: VolumeSlider;
    // Keyboard accessibility for drag and drop
    private selectedTileForKeyboard?: Phaser.GameObjects.Container;
    private selectedTileIndicator?: Phaser.GameObjects.Graphics;
    private tileOverlays: Map<Phaser.GameObjects.Container, ImageOverlay> = new Map();
    private dropZoneOverlay?: ImageOverlay;

    constructor(scene: BaseScene, level: number, isInstructionMode: boolean = false, questionSelector?: QuestionSelectorHelper) {
        this.scene = scene;
        this.level = level;
        this.isInstructionMode = isInstructionMode;

        this.gameConfigManager = GameConfigManager.getInstance();
        this.topic = this.gameConfigManager.get('topic') || "grade6_topic4";

        if (questionSelector) {
            this.questionSelector = questionSelector;
        } else {
            const gameConfigManager = GameConfigManager.getInstance();
            const topic = gameConfigManager.get('topic') || 'grade6_topic4';

            const questionBank = getQuestionBankByLevel(topic, level);
            if (!questionBank) {
                throw new Error('Question bank not found');
            }
            this.questionSelector = new QuestionSelectorHelper(questionBank, this.totalQuestions);
        }

        this.scoreHelper = new ScoreHelper(2); // Base bonus of 2 for streaks
    }

    static _preload(scene: BaseScene) {
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen`);
        scene.load.image('combine_equation_bg', 'combine_equation_bg.png');
        scene.load.image('combine_equation_bottom_bg', 'combine_equation_bottom_bg.png');
        scene.load.image('correct_icon', 'correct_icon.png');
        scene.load.image('incorrect_icon', 'incorrect_icon.png');
        scene.load.image('correct_tile', 'correct_tile.png');
        scene.load.image('incorrect_tile', 'incorrect_tile.png');
        scene.load.image('correct_tile_large', 'correct_tile_large.png');
        scene.load.image('incorrect_tile_large', 'incorrect_tile_large.png');

        scene.load.image('btn_purple', 'btn_purple.png');
        scene.load.image('btn_purple_hover', 'btn_purple_hover.png');
        scene.load.image('btn_purple_pressed', 'btn_purple_pressed.png');
        scene.load.image('btn_red', 'btn_red.png');
        scene.load.image('btn_red_hover', 'btn_red_hover.png');
        scene.load.image('btn_red_pressed', 'btn_red_pressed.png');
        scene.load.image('btn_red_inactive', 'btn_red_inactive.png');
        scene.load.image('option_btn_blue_small', 'option_btn_blue_small.png');
        scene.load.image('option_btn_blue_small_hover', 'option_btn_blue_small_hover.png');
        scene.load.image('option_btn_blue_small_pressed', 'option_btn_blue_small_pressed.png');
        scene.load.image('option_btn_orange_small', 'option_btn_orange_small.png');
        scene.load.image('option_btn_orange_small_hover', 'option_btn_orange_small_hover.png');
        scene.load.image('option_btn_orange_small_pressed', 'option_btn_orange_small_pressed.png');
        scene.load.image('option_btn_pink_small', 'option_btn_pink_small.png');
        scene.load.image('option_btn_pink_small_hover', 'option_btn_pink_small_hover.png');
        scene.load.image('option_btn_pink_small_pressed', 'option_btn_pink_small_pressed.png');
        scene.load.image('option_btn_purple_small', 'option_btn_purple_small.png');
        scene.load.image('option_btn_purple_small_hover', 'option_btn_purple_small_hover.png');
        scene.load.image('option_btn_purple_small_pressed', 'option_btn_purple_small_pressed.png');

        scene.load.image('blue_tile', 'blue_tile.png');
        scene.load.image('blue_tile_hover', 'blue_tile_hover.png');
        scene.load.image('blue_tile_pressed', 'blue_tile_pressed.png');
        scene.load.image('orange_tile', 'orange_tile.png');
        scene.load.image('orange_tile_hover', 'orange_tile_hover.png');
        scene.load.image('orange_tile_pressed', 'orange_tile_pressed.png');
        scene.load.image('pink_tile', 'pink_tile.png');
        scene.load.image('pink_tile_hover', 'pink_tile_hover.png');
        scene.load.image('pink_tile_pressed', 'pink_tile_pressed.png');
        scene.load.image('purple_tile', 'purple_tile.png');
        scene.load.image('purple_tile_hover', 'purple_tile_hover.png');
        scene.load.image('purple_tile_pressed', 'purple_tile_pressed.png');


        scene.load.image('error_board_bg', 'error_board_bg.png');
        scene.load.image('success_board_bg', 'success_board_bg.png');

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}`);
        scene.load.audio('bg_music', 'bg_music.mp3');
        scene.load.audio('positive', 'positive.mp3');
        scene.load.audio('negative', 'negative.mp3');

        // Load button assets
        scene.load.setPath(`${BUTTONS.PATH}`);
        scene.load.image(BUTTONS.PAUSE_ICON.KEY, BUTTONS.PAUSE_ICON.PATH);
        scene.load.image(BUTTONS.ICON_BTN.KEY, BUTTONS.ICON_BTN.PATH);
        scene.load.image(BUTTONS.ICON_BTN_HOVER.KEY, BUTTONS.ICON_BTN_HOVER.PATH);
        scene.load.image(BUTTONS.ICON_BTN_PRESSED.KEY, BUTTONS.ICON_BTN_PRESSED.PATH);
        scene.load.image(BUTTONS.MUTE_ICON.KEY, BUTTONS.MUTE_ICON.PATH);
        scene.load.image(BUTTONS.UNMUTE_ICON.KEY, BUTTONS.UNMUTE_ICON.PATH);
        scene.load.image(BUTTONS.HELP_ICON.KEY, BUTTONS.HELP_ICON.PATH);
        scene.load.image(BUTTONS.SETTINGS_ICON.KEY, BUTTONS.SETTINGS_ICON.PATH);

        ScoreCoins.preload(scene, 'purple');
        VolumeSlider.preload(scene, 'purple');
    }

    init(data?: { reset?: boolean }) {
        ScoreCoins.init(this.scene);

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
            
            this.gameSubtitle = getGameSubtitle(this.topic, this.level);
            this.analyticsHelper?.createSession(`game.algebra_trials.${this.gameSubtitle}`);
        }
        if (this.isInstructionMode && parentScene === 'GameScene') {
            focusToGameContainer();
            this.scene.time.delayedCall(1000, () => {
                this.queueAnnouncement(i18n.t('info.helpPage'));
            })
        }

        this.scene.addImage(this.scene.display.width / 2, this.scene.display.height / 2, `game_scene_bg_${this.level}`).setOrigin(0.5);
        this.errorBoard = this.scene.addImage(this.scene.display.width / 2, this.scene.display.height / 2 + 15, 'error_board_bg').setOrigin(0.5).setAlpha(0);
        this.successBoard = this.scene.addImage(this.scene.display.width / 2, this.scene.display.height / 2 + 15, 'success_board_bg').setOrigin(0.5).setAlpha(0);

        this.scene.audioManager.initialize(this.scene);

        // Create door utils
        this.doorUtils = new DoorUtils(this.scene);

        if (!this.isInstructionMode) {
            this.scene.audioManager.playBackgroundMusic('bg_music');

            // Open door
            this.doorUtils.openDoors();

            // Create score coins
            this.scoreCoins = new ScoreCoins(this.scene, this.scoreHelper, i18n, 'purple');
            this.scoreCoins.create(
                this.scene.getScaledValue(87),
                this.scene.getScaledValue(62)
            );

            // Create progress bar
            this.progressBar = new ProgressBar(this.scene);
            this.progressBar.create(76);

            // Create UI buttons
            this.createPauseButton();
            this.createMuteButton();
            this.createVolumeSlider();
            this.createHelpButton();

        }

        this.titleText = this.scene.addText(this.scene.display.width / 2, 215, i18n.t('game.combineEssences'), {
            font: "400 20px Exo",
            color: "#000000",
        }).setOrigin(0.5);
        new TextOverlay(this.scene, this.titleText, { label: this.titleText.text, tag: 'h1' });

        // Load first question
        this.loadNextQuestion();
    }

    private showFeedbackAnimation(isSuccess: boolean, studentResponse: string): void {
        if (isSuccess) {
            this.scene.time.delayedCall(100, () => {
                announceToScreenReader(i18n.t('common.correctFeedback'));
            });
        } else {
            this.scene.time.delayedCall(100, () => {
                announceToScreenReader(i18n.t('common.incorrectFeedback'));
            });        
        }

        const width = this.scene.display.width;
        const height = 115;
        const color = isSuccess ? 0x007E11 : 0x8B211A;
        const topColor = isSuccess ? 0x24E13E : 0xE94338;
        const icon = isSuccess ? 'correct_icon' : 'incorrect_icon';
        const text = isSuccess ? i18n.t('common.correct') : i18n.t('common.incorrect');
        const sound = isSuccess ? 'positive' : 'negative';
        this.scene.time.delayedCall(1000, () => {
            this.queueAnnouncement(text);
        })

        const feedbackWrapperContainer = this.scene.add.container(this.scene.getScaledValue(this.scene.display.width / 2), this.scene.getScaledValue(this.scene.display.height + height / 2));

        // Create background rectangle
        const bgRect = this.scene.addRectangle(0, 0, width, height, color);
        feedbackWrapperContainer.add(bgRect);

        const bgRectTop = this.scene.addRectangle(0, -height / 2, width, 7, topColor).setOrigin(0.5, 0);
        feedbackWrapperContainer.add(bgRectTop);

        // Create icon and text
        const feedbackContainer = this.scene.add.container(0, 0);
        const iconSprite = this.scene.addImage(0, 0, icon).setOrigin(0, 0.5);
        const feedbackText = this.scene.addText(0, 0, text, {
            font: "700 36px Exo",
        }).setOrigin(0, 0.5);

        feedbackText.setX(iconSprite.getBounds().right + this.scene.getScaledValue(14));

        feedbackContainer.add([iconSprite, feedbackText]);

        feedbackContainer.setX(feedbackContainer.x - feedbackContainer.getBounds().width / 2);

        feedbackWrapperContainer.add(feedbackContainer);

        // Add image overlay for accessibility
        new ImageOverlay(this.scene, iconSprite, { label: text + ' ' + i18n.t('common.icon') });
        this.updateTileButtonStates(isSuccess ? TileState.SUCCESS : TileState.ERROR);
        this.scene.audioManager.playSoundEffect(sound);

        if (isSuccess) {
            this.analyticsHelper?.createTrial({
                questionMaxPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                achievedPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                questionText: this.currentQuestion.operand1,
                isCorrect: true,
                questionMechanic: 'default',
                gameLevelInfo: `game.algebra_trials.${this.gameSubtitle}`,
                studentResponse: studentResponse,
                studentResponseAccuracyPercentage: '100%',
            });

            this.successBoard.setAlpha(1);
            this.questionSelector.answerCorrectly();
            this.scoreHelper.answerCorrectly();
            this.previousStreak = this.scoreHelper.getCurrentStreak();

            // Update score and streak displays
            this.scoreCoins.updateScoreDisplay(true);
        } else {
            this.analyticsHelper?.createTrial({
                questionMaxPoints: (this.scoreHelper.getCurrentMultiplier() || 1),
                achievedPoints: 0,
                questionText: this.currentQuestion.operand1,
                isCorrect: false,
                questionMechanic: 'default',
                gameLevelInfo: `game.algebra_trials.${this.gameSubtitle}`,
                studentResponse: studentResponse,
                studentResponseAccuracyPercentage: '0%',
            });
            this.errorBoard.setAlpha(1);
            this.questionSelector.answerIncorrectly(this.currentQuestion);
            this.scoreHelper.answerIncorrectly();

            // Update score and streak displays
            this.scoreCoins.updateScoreDisplay(false, this.previousStreak >= 3);
            this.previousStreak = this.scoreHelper.getCurrentStreak();
        }
        const progress = this.questionSelector.getTotalQuestionsAnswered() / this.totalQuestions;
        this.progressBar.updateProgress(progress * 100, !isSuccess);

        // Tween animation: slide in and out
        this.scene.tweens.add({
            targets: feedbackWrapperContainer,
            y: this.scene.getScaledValue(this.scene.display.height - height / 2),
            duration: ANIMATION_DURATION,
            ease: 'Power2',
            onComplete: () => {
                this.scene.tweens.add({
                    targets: feedbackWrapperContainer,
                    y: this.scene.getScaledValue(this.scene.display.height + height / 2),
                    duration: ANIMATION_DURATION,
                    delay: ANIMATION_DELAY,
                    ease: 'Power2',
                    onComplete: () => {
                        isSuccess ? this.successBoard.setAlpha(0) : this.errorBoard.setAlpha(0);
                        this.resetTileButtonStates();
                        feedbackWrapperContainer.destroy();
                        this.loadNextQuestion();
                    }
                });
            }
        });
    }

    private showKeepTryingAnimation(): void {
        this.scene.time.delayedCall(100, () => {
            this.queueAnnouncement(i18n.t('game.keepTrying'));
        })

        const width = this.scene.display.width;
        const height = 115;
        const color = 0x008588;
        const topColor = 0x00FAFF;
        const text = i18n.t('game.keepTrying');
        const sound = 'positive'; // Use positive sound for encouragement

        const keepTryingContainer = this.scene.add.container(this.scene.getScaledValue(this.scene.display.width / 2), this.scene.getScaledValue(this.scene.display.height + height / 2));

        // Create background rectangle
        const bgRect = this.scene.addRectangle(0, 0, width, height, color);
        keepTryingContainer.add(bgRect);

        const bgRectTop = this.scene.addRectangle(0, -height / 2, width, 7, topColor).setOrigin(0.5, 0);
        keepTryingContainer.add(bgRectTop);

        const feedbackContainer = this.scene.add.container(0, 0);
        const feedbackText = this.scene.addText(0, 0, text, {
            font: "700 36px Exo",
            color: "#FFFFFF",
        }).setOrigin(0.5, 0.5);

        feedbackContainer.add([feedbackText]);
        keepTryingContainer.add(feedbackContainer);

        this.scene.audioManager.playSoundEffect(sound);

        // Tween animation: slide in and out
        this.scene.tweens.add({
            targets: keepTryingContainer,
            y: this.scene.getScaledValue(this.scene.display.height - height / 2),
            duration: ANIMATION_DURATION,
            ease: 'Power2',
            onComplete: () => {
                this.scene.tweens.add({
                    targets: keepTryingContainer,
                    y: this.scene.getScaledValue(this.scene.display.height + height / 2),
                    duration: ANIMATION_DURATION,
                    delay: 500,
                    ease: 'Power2',
                    onComplete: () => {
                        keepTryingContainer.destroy();
                        // Reset processing flag to allow user to try again
                        this.isProcessing = false;
                    }
                });
            }
        });
    }

    private showMascotCelebration(cb?: () => void) {
        this.scene.time.delayedCall(1000, () => {
            const streak = this.scoreHelper.getCurrentStreak();
            if (streak >= 3) {
                const msg = i18n.t('game.inARow', { count: streak });
                this.queueAnnouncement(msg, true);
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
                if (streak >= 3) {
                    this.scene.time.delayedCall(800, () => {
                        this.queueAnnouncement(i18n.t('game.inARow', { count: streak }), true);
                    });
                }
            });
        });
    }

    private createDropZone(): void {
        // Create a designated drop zone where tiles can be dropped
        const dropZoneWidth = this.scene.getScaledValue(this.scene.display.width - DROP_ZONE_PADDING);;
        const dropZoneHeight = this.scene.getScaledValue(DROP_ZONE_HEIGHT);
        const dropZoneX = this.scene.getScaledValue(this.scene.display.width / 2);
        const dropZoneY = this.scene.getScaledValue(this.scene.display.height / 2 + 90);

        // Create drop zone as a semi-transparent rectangle
        this.dropZone = this.scene.add.rectangle(
            dropZoneX,
            dropZoneY,
            dropZoneWidth,
            dropZoneHeight,
        ).setOrigin(0.5);

        // Create dotted border using graphics
        const borderGraphics = this.scene.add.graphics();
        borderGraphics.lineStyle(2, 0x5C7880); // 2px white line

        const dashLength = 10;
        const gapLength = 10;
        const totalLength = dashLength + gapLength;

        // Draw dotted border
        const x = dropZoneX - dropZoneWidth / 2;
        const y = dropZoneY - dropZoneHeight / 2;
        const width = dropZoneWidth;

        // Top edge
        for (let i = 0; i < width; i += totalLength) {
            const startX = x + i;
            const endX = Math.min(x + i + dashLength, x + width);
            borderGraphics.moveTo(startX, y);
            borderGraphics.lineTo(endX, y);
        }

        borderGraphics.strokePath();

        // Set depth to be above background but below buttons
        this.dropZone.setDepth(0);

        // Create an invisible image for accessibility overlay (since ImageOverlay requires Image/Sprite)
        const dropZoneAccessibilityImage = this.scene.add.image(dropZoneX, dropZoneY, '')
            .setSize(dropZoneWidth, dropZoneHeight)
            .setVisible(false)
            .setInteractive();

        // Create accessibility overlay for drop zone keyboard interaction
        this.dropZoneOverlay = new ImageOverlay(this.scene, dropZoneAccessibilityImage, {
            label: i18n.t('accessibility.dropZone'),
            cursor: 'default',
        });

        // Make drop zone focusable via tab and add keyboard interaction
        const domElement = (this.dropZoneOverlay as any).domElement;
        if (domElement?.node) {
            const htmlElement = domElement.node as HTMLElement;
            htmlElement.setAttribute('tabindex', '-1'); // Not focusable since tiles handle interactions
            htmlElement.setAttribute('role', 'region');
            htmlElement.setAttribute('aria-label', i18n.t('accessibility.dropZone'));
        }
    }

    private setupDragEvents(): void {
        // Add drag events for buttons - set up once
        this.scene.input.on('dragstart', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Container) => {
            const buttonKey = this.getButtonKeyFromGameObject(gameObject);
            if (buttonKey) {
                // Store the original position when drag starts
                this.originalPositions.set(buttonKey, {
                    x: gameObject.x,
                    y: gameObject.y
                });
                gameObject.setAlpha(0.7);
            }
        });

        this.scene.input.on('drag', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Container, dragX: number, dragY: number) => {
            // Handle button dragging - simple like Game.ts
            const buttonKey = this.getButtonKeyFromGameObject(gameObject); // Added check
            if (buttonKey) {                                              // Added check
               gameObject.x = dragX;
               gameObject.y = dragY;
            }                                                             // Added check
        });

        this.scene.input.on('dragend', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Container) => {
            const buttonKey = this.getButtonKeyFromGameObject(gameObject);

            if (buttonKey && this.tileButtons.has(buttonKey)) {
                const buttonData = this.tileButtons.get(buttonKey);
                if (buttonData && buttonData.button.active) {
                    // Check if the tile is dropped in the drop zone
                    const isInDropZone = this.isInDropZone(gameObject.x, gameObject.y);

                    if (isInDropZone) {
                        // Tile is dropped in drop zone - check for combination
                        const targetTileKey = this.findTileAtPosition(gameObject.x, gameObject.y, gameObject);

                        if (targetTileKey && this.canCombineTiles(buttonKey, targetTileKey)) {
                            // Combine the tiles
                            this.combineTiles(buttonKey, targetTileKey);
                        } else {
                            // No combination possible - keep it at the final position
                            buttonData.button.setAlpha(1);
                        }
                    } else {
                        // Tile is dropped outside drop zone - return to original position
                        const originalPos = this.originalPositions.get(buttonKey);
                        if (originalPos) {
                            buttonData.button.setPosition(originalPos.x, originalPos.y);
                            buttonData.button.setAlpha(1);
                        }
                    }
                }
            }
        });
    }

    private isInDropZone(x: number, y: number): boolean {
        if (!this.dropZone) return false;

        const dropZoneBounds = this.dropZone.getBounds();

        // Subtract from all sides: top, left, right, bottom
        const paddingX = this.scene.getScaledValue(35); // 35 pixels from left and right
        const paddingY = this.scene.getScaledValue(35); // 35 pixels from top and bottom

        dropZoneBounds.x += paddingX; // Move left edge right
        dropZoneBounds.y += paddingY; // Move top edge down
        dropZoneBounds.width -= (paddingX * 2); // Reduce width from both sides
        dropZoneBounds.height -= (paddingY * 2); // Reduce height from both sides

        return dropZoneBounds.contains(x, y);
    }

    private findTileAtPosition(x: number, y: number, excludeButton?: Phaser.GameObjects.Container): string | null {
        const collisionRadius = TILE_COLLISION_SIZE / 2;

        for (const [buttonKey, buttonData] of this.tileButtons.entries()) {
            if (buttonData.button === excludeButton) continue;

            // Use rectangular collision detection for rectangular buttons
            const distanceX = Math.abs(x - buttonData.button.x);
            const distanceY = Math.abs(y - buttonData.button.y);

            if (distanceX < collisionRadius && distanceY < collisionRadius) {
                return buttonKey;
            }
        }

        return null;
    }

    private canCombineTiles(tile1Key: string, tile2Key: string): boolean {
        const config1 = this.getConfigFromKey(tile1Key);
        const config2 = this.getConfigFromKey(tile2Key);

        // Get the base type (x or constant)
        const baseType1 = config1.value.replace('-', '');
        const baseType2 = config2.value.replace('-', '');

        // Can combine if they have the same base type
        return baseType1 === baseType2;
    }

    private combineTiles(sourceKey: string, targetKey: string): Phaser.GameObjects.Container | null {

        if (this.isInstructionMode) {
            // Emmit combine tiles event
            this.scene.events.emit('combinetiles', { sourceKey, targetKey });
        }

        const sourceData = this.tileButtons.get(sourceKey);
        const targetData = this.tileButtons.get(targetKey);

        if (!sourceData || !targetData) return null;

        const sourceConfig = this.getConfigFromKey(sourceKey);
        const targetConfig = this.getConfigFromKey(targetKey);

        // Calculate the mathematical combination
        const sourceValue = this.getNumericValue(sourceConfig.value, sourceData.count);
        const targetValue = this.getNumericValue(targetConfig.value, targetData.count);
        const combinedValue = targetValue + sourceValue;

        // Capture target position before destroying
        const targetPosX = targetData.button.x;
        const targetPosY = targetData.button.y;

        // Clean up overlays before destroying buttons
        const sourceOverlay = this.tileOverlays.get(sourceData.button);
        if (sourceOverlay) {
            sourceOverlay.destroy();
            this.tileOverlays.delete(sourceData.button);
        }
        
        const targetOverlay = this.tileOverlays.get(targetData.button);
        if (targetOverlay) {
            targetOverlay.destroy();
            this.tileOverlays.delete(targetData.button);
        }

        // Clear selection if one of these tiles was selected
        if (this.selectedTileForKeyboard === sourceData.button || this.selectedTileForKeyboard === targetData.button) {
            this.clearSelectedTile();
        }

        // Destroy both tiles and remove from map
        sourceData.button.destroy();
        targetData.button.destroy();
        this.tileButtons.delete(sourceKey);
        this.tileButtons.delete(targetKey);

        // If result is 0, nothing to create
        if (combinedValue === 0) {
            return null;
        }

        // Determine base type (x or 1)
        const baseValue = targetConfig.value.replace('-', '');
        const isPositive = combinedValue > 0;

        // Determine color and operation based on sign and type
        const color = baseValue === 'x' ? (isPositive ? 'blue' : 'orange') : (isPositive ? 'pink' : 'purple');
        const operation = isPositive ? 'add' : 'subtract';
        const value = isPositive ? baseValue : `-${baseValue}`;
        const text = value;

        const newConfig = { color, operation, value, text } as any; // conforms to TileConfig
        const newKey = `${color}_${operation}_${value}`;
        const newCount = Math.abs(combinedValue);

        // Create the new tile at the target's position
        this.createTileButton(newConfig, newKey, { x: targetPosX, y: targetPosY });

        // Update count and displayed text on the newly created tile
        const createdData = this.tileButtons.get(newKey);
        if (createdData) {
            createdData.count = newCount;
            const displayText = this.getDisplayText(newConfig, newCount);
            ButtonHelper.setButtonText(createdData.button, displayText);
            return createdData.button;
        }

        return null;
    }

    private getNumericValue(value: string, count: number): number {
        switch (value) {
            case 'x': return count;
            case '-x': return -count;
            case '1': return count;
            case '-1': return -count;
            default: return 0;
        }
    }

    private cleanupUI(): void {
        // Clear any selected tile state
        this.clearSelectedTile();

        // Clear all equations
        this.equations.forEach(singleEquation => {
            singleEquation.equation.destroy();
        });
        this.equations = [];

        // Clear all option buttons
        this.optionButtons.forEach(button => {
            button.destroy();
        });
        this.optionButtons = [];

        // Clear container buttons and their accessibility overlays
        this.tileButtons.forEach(buttonData => {
            // Destroy overlay first if it exists
            const overlay = this.tileOverlays.get(buttonData.button);
            if (overlay) {
                overlay.destroy();
                this.tileOverlays.delete(buttonData.button);
            }
            
            // Only destroy if the button is still active and not already destroyed
            if (buttonData.button && buttonData.button.active) {
                buttonData.button.destroy();
            }
        });
        this.tileButtons.clear();

        // Clear drop zone overlay
        if (this.dropZoneOverlay) {
            this.dropZoneOverlay.destroy();
            this.dropZoneOverlay = undefined;
        }
    }

    private gameOver() {
        this.cleanupUI();

        this.doorUtils.closeDoors(() => {
            // Game Over handling here
            this.scoreHelper.setPlannedTotalQuestions(this.totalQuestions);
            const finalScore = this.scoreHelper.endGame();

            // Send data to ScoreBoard scene
            this.scene.scene.start('Scoreboard', {
                totalRounds: this.scoreHelper.getTotalQuestions(),
                rounds: this.scoreHelper.getCorrectAnswers(),
                score: finalScore,
                mechanic: 'combine_equations',
                level: this.level
            });
        }, false);
    }

    private resetGame() {
        // Since we're coming from ScoreBoard, we know it's a play-again
        this.questionSelector.reset(true);
        this.scoreHelper.reset();
        this.cleanupUI();

        // Clear occupied grid positions when resetting
        this.occupiedGridPositions.clear();

        // Reset processing flag when game is reset
        this.isProcessing = false;
    }

    private loadNextQuestion(): void {
        let question: Question | null = null;
        if (this.isInstructionMode) {
            if (this.topic === 'grade7_topic4' && this.level === 2) {
                question = {
                    operand1: '2(x + 3) - x',
                    operand2: '',
                    answer: 'x + 3',
                }
            } else {
                question = {
                    operand1: '2x + 3 – x',
                    operand2: '',
                    answer: 'x + 3',
                }
            }
        } else {
            question = this.questionSelector.getNextQuestion();
        }

        if (!question) {
            // Game over
            this.gameOver();
            return;
        }

        this.currentQuestion = question;

        // Clean up previous UI
        this.cleanupUI();

        const formattedQuestion = this.formatForDisplay(this.currentQuestion.operand1);

        // Create white box for equation text
        // Create the initial equation text first to measure its width
        const equationText = this.scene.addText(
            this.scene.display.width / 2,
            this.scene.display.height / 2 - 110, formattedQuestion, {
            font: "700 42px Exo",
            color: "#000000",
        }).setOrigin(0.5).setDepth(2); // Ensure text is above box

        // Calculate dynamic box width based on text width
        const textWidth = this.scene.getScaledValue(equationText.width);
        const minBoxWidth = this.scene.getScaledValue(240); // Minimum width
        const padding = this.scene.getScaledValue(50); // Padding on each side
        const dynamicBoxWidth = Math.max(minBoxWidth, textWidth + padding);

        const boxHeight = this.scene.getScaledValue(76);
        const boxX = this.scene.getScaledValue(this.scene.display.width / 2);
        const boxY = this.scene.getScaledValue(this.scene.display.height / 2 - 110);

        const equationBox = this.scene.add.graphics();
        equationBox.fillStyle(0xFFFFFF); // White color
        equationBox.fillRoundedRect(boxX - dynamicBoxWidth / 2, boxY - boxHeight / 2, dynamicBoxWidth, boxHeight, 8);
        equationBox.setDepth(0); // Ensure box is behind text

        // Format the question for screen readers
        const accessibleQuestion = this.formatForScreenReader(this.currentQuestion.operand1);

        // Add text overlay for accessibility with screen reader formatted text
        new TextOverlay(this.scene, equationText, {
            label: accessibleQuestion,
            tag: 'h2',
            announce: true
        });

        // Store the initial equation
        this.equations.push({
            equation: equationText,
        });

        // Create drop zone
        this.createDropZone();

        // Create Options from the question data
        const optionWidth = 80;
        const gap = 50;
        const totalWidth = 4 * optionWidth + 3 * gap;
        const startX = this.scene.display.width / 2 - totalWidth / 2 - 30;

        // Create the undo button
        this.createResetButton(startX - optionWidth - gap, this.scene.display.height - 90);

        // Create the option buttons
        this.createOption(startX, this.scene.display.height - 90, optionWidth, gap);

        // Create the check button after the options
        const lastOptionX = startX + 3 * (optionWidth + gap) + optionWidth * 2;
        this.createCheckButton(lastOptionX + optionWidth + gap / 2, this.scene.display.height - 90);

        // Set up drag events after all buttons are created (like Game.ts)
        this.setupDragEvents();

        // Reset processing flag to allow next check
        this.isProcessing = false;
    }

    public formatForDisplay(expression: string): string {
        let formatted = expression;

        // Replace x with proper algebra symbol 𝑥
        formatted = formatted.replace(/x/g, '𝑥');

        // Replace operators with proper math symbols
        formatted = formatted.replace(/-/g, '–'); // en-dash for subtraction
        formatted = formatted.replace(/\*/g, '×'); // multiplication symbol
        // formatted = formatted.replace(/\//g, '÷'); // division symbol

        return formatted;
    }

    /**
     * Formats mathematical expression for screen readers to pronounce naturally
     */
    private formatForScreenReader(expression: string): string {
        console.log('Original expression:', expression);
        console.log('Expression char codes:', expression.split('').map(c => `${c}(${c.charCodeAt(0)})`).join(' '));
        
        // Normalize different types of minus/dash characters to standard hyphen
        // U+002D: Hyphen-minus (-)
        // U+2212: Minus sign (−)
        // U+2013: En dash (–)
        // U+2014: Em dash (—)
        let formatted = expression.replace(/[\u002D\u2212\u2013\u2014]/g, '-');
        console.log('After normalization:', formatted);

        // Process character by character to handle all cases properly
        let result = '';
        for (let i = 0; i < formatted.length; i++) {
            const char = formatted[i];
            
            if (char === '+') {
                result += ` ${i18n.t('math.plus')} `;
            } else if (char === '-') {
                // Check if this is a negative sign (at start or after operator/parenthesis)
                if (i === 0 || formatted[i - 1] === '(' || formatted[i - 1] === '+' || formatted[i - 1] === '-' || formatted[i - 1] === '*' || formatted[i - 1] === '/') {
                    result += `${i18n.t('math.minus')}`;
                } else {
                    result += ` ${i18n.t('math.minus')} `;
                }
            } else if (char === '*') {
                result += ` ${i18n.t('math.times')} `;
            } else if (char === '/') {
                result += ` ${i18n.t('math.dividedBy')} `;
            } else if (char === '(') {
                result += ` ${i18n.t('math.openParenthesis')} `;
            } else if (char === ')') {
                result += ` ${i18n.t('math.closeParenthesis')} `;
            } else if (char === ' ') {
                // Skip existing spaces, we'll add our own
                continue;
            } else {
                result += char;
            }
        }

        result = result.replace(/\s+/g, ' ').trim();
    
        console.log('Final screen reader text:', result);

        return result;
    }

    private createOption(startX: number, y: number, buttonWidth: number, gap: number): void {
        // Define button configurations for the four operations with fixed values
        const buttonConfigs: ButtonConfig[] = [
            {
                color: 'blue',
                operation: 'add',
                optionIndex: 0,
                text: this.formatForDisplay('x'),
                value: 'x'
            },
            {
                color: 'orange',
                operation: 'subtract',
                optionIndex: 1,
                text: this.formatForDisplay('-x'),
                value: '-x'
            },
            {
                color: 'pink',
                operation: 'add',
                optionIndex: 2,
                text: '1',
                value: '1'
            },
            {
                color: 'purple',
                operation: 'subtract',
                optionIndex: 3,
                text: this.formatForDisplay('-1'),
                value: '-1'
            }
        ];

            buttonConfigs.forEach((config, index) => {
            const x = startX + index * (buttonWidth + gap) + buttonWidth / 2 + 30;

            // Create button using ButtonHelper
            const button = ButtonHelper.createButton({
                scene: this.scene,
                imageKeys: {
                    default: `option_btn_${config.color}_small`,
                    hover: `option_btn_${config.color}_small_hover`,
                    pressed: `option_btn_${config.color}_small_pressed`
                },
                text: config.text,
                label: this.getAccessibleLabel(config.value),
                textStyle: {
                    font: "700 24px Exo",
                    color: "#FFFFFF",
                },
                imageScale: 1,
                x: x,
                y: y,
                onClick: () => {
                    this.handleOptionClick(config);
                }
            });

            // Set config text data to button for tutorial
            if (this.isInstructionMode) {
                button.setData('text', config.text);
            }

            // Store button and text for cleanup
            this.optionButtons.push(button);
        });

        // In tutorial mode, disable buttons that are not part of the guided correct path
        if (this.isInstructionMode) {
            // For this tutorial, we expect the user to combine into target 'x + 3'.
            // Only allow adding 'x' and adding '1' (not subtract variants) to proceed.
            this.optionButtons.forEach((btn) => {
                const text = btn.getData('text') as string | undefined;
                const overlay = (btn as any).buttonOverlay as ButtonOverlay | undefined;
                const allow = text === this.formatForDisplay('x') || text === '1';
                if (!allow) {
                    btn.disableInteractive();
                    // btn.setAlpha(0.6);
                    if (overlay && (overlay as any).domElement?.node) {
                        const el = (overlay as any).domElement.node as HTMLElement;
                        el.setAttribute('tabindex', '-1');
                        el.setAttribute('aria-disabled', 'true');
                    }
                } else if (overlay && (overlay as any).domElement?.node) {
                    const el = (overlay as any).domElement.node as HTMLElement;
                    el.setAttribute('tabindex', '0');
                    el.removeAttribute('aria-disabled');
                }
            });
            // Focus the first allowed button (x)
            const firstAllowed = this.optionButtons.find(btn => (btn.getData('text') as string) === this.formatForDisplay('x'));
            if (firstAllowed) {
                const overlay = (firstAllowed as any).buttonOverlay as ButtonOverlay | undefined;
                if (overlay && (overlay as any).element) {
                    try { (overlay as any).element.focus({ preventScroll: true }); } catch {}
                }
            }
        }
    }

    private getAccessibleLabel(value: string): string {
        switch (value) {
            case 'x': return 'x';
            case '-x': return 'minus x';
            case '1': return 'one';
            case '-1': return 'minus one';
            default: return value;
        }
    }

    private getAccessibleDisplayText(config: TileConfig, count: number): string {
        if (count === 1) {
            return this.getAccessibleLabel(config.value);
        }

        // For multiple clicks, show the cumulative value in accessible format
        switch (config.value) {
            case 'x':
                return `${count} x`;
            case '-x':
                return `minus ${count} x`;
            case '1':
                return `${count}`;
            case '-1':
                return `minus ${count}`;
            default:
                return `${config.text} (${count})`;
        }
    }

    private createResetButton(x: number, y: number): void {
        const resetButton = ButtonHelper.createButton({
            scene: this.scene,
            imageKeys: {
                default: 'btn_red',
                hover: 'btn_red_hover',
                pressed: 'btn_red_pressed',
                disabled: 'btn_red_inactive'
            },
            text: i18n.t('game.clear'),
            label: i18n.t('game.clear'),
            textStyle: {
                font: "700 32px Exo",
                color: "#FFFFFF",
            },
            imageScale: 0.9,
            x: x,
            y: y,
            padding: 20,
            isDisabled: this.isInstructionMode,
            onClick: () => {
                this.handleUndoClick();
            }
        });

        // Store undo button and text for cleanup
        this.optionButtons.push(resetButton);

        // Add text overlay for accessibility
        const resetButtonText = resetButton.getByName('text') as Phaser.GameObjects.Text;
        if (resetButtonText) {
            new TextOverlay(this.scene, resetButtonText, { label: i18n.t('game.clear') });
        }
    }

    private createCheckButton(x: number, y: number): void {
        const checkButton = ButtonHelper.createButton({
            scene: this.scene,
            imageKeys: {
                default: 'btn_purple',
                hover: 'btn_purple_hover',
                pressed: 'btn_purple_pressed'
            },
            text: i18n.t('game.check'),
            label: i18n.t('game.check'),
            textStyle: {
                font: "700 32px Exo",
                color: "#FFFFFF",
            },
            imageScale: 0.9,
            x: x,
            y: y,
            onClick: () => {
                this.handleCheckClick();
            }
        });

        // Set button type data for tutorial
        if (this.isInstructionMode) {
            checkButton.setData('type', 'check');
        }

        // Store check button and text for cleanup
        this.optionButtons.push(checkButton);
    }

    private handleOptionClick(config: ButtonConfig): void {
        const buttonKey = `${config.color}_${config.operation}_${config.value}`;

        // Check if button already exists in container
        if (this.tileButtons.has(buttonKey)) {
            // Increment existing button
            const buttonData = this.tileButtons.get(buttonKey)!;
            buttonData.count++;

            // Update the text to show the cumulative value
            const displayText = this.getDisplayText(config, buttonData.count);
            // Update the button's text directly
            ButtonHelper.setButtonText(buttonData.button, displayText);
            
            // Update the accessibility label to reflect the new count
            const overlay = this.tileOverlays.get(buttonData.button);
            if (overlay) {
                const accessibleText = this.getAccessibleDisplayText(config, buttonData.count);
                const domElement = (overlay as any).domElement;
                if (domElement?.node) {
                    const htmlElement = domElement.node as HTMLElement;
                    htmlElement.setAttribute('aria-label', i18n.t('accessibility.draggableTile', { value: accessibleText }));
                }
            }
        } else {
            // Create new button in container at fixed grid position
            this.createTileButton(config, buttonKey);
        }

        if (this.isInstructionMode) {
            // Emmit option click event
            this.scene.events.emit('optionclick', { buttonKey: buttonKey });
        }
    }

    private getDisplayText(config: TileConfig, count: number): string {
        if (count === 1) {
            return this.formatForDisplay(config.text);
        }

        // For multiple clicks, show the cumulative value
        switch (config.value) {
            case 'x':
                return `${count}${this.formatForDisplay('x')}`;
            case '-x':
                return `${this.formatForDisplay(`-${count}x`)}`;
            case '1':
                return `${count}`;
            case '-1':
                return `${this.formatForDisplay(`-${count}`)}`;
            default:
                return `${config.text} (${count})`;
        }
    }

    private getDropZoneBounds(): DropZoneBounds {
        const dropZoneWidth = this.scene.getScaledValue(this.scene.display.width - DROP_ZONE_PADDING);
        const dropZoneHeight = this.scene.getScaledValue(DROP_ZONE_HEIGHT);
        const dropZoneX = this.scene.getScaledValue(this.scene.display.width / 2);
        const dropZoneY = this.scene.getScaledValue(this.scene.display.height / 2 + 90);
        return {
            minX: dropZoneX - dropZoneWidth / 2,
            maxX: dropZoneX + dropZoneWidth / 2,
            minY: dropZoneY - dropZoneHeight / 2,
            maxY: dropZoneY + dropZoneHeight / 2
        };
    }

    private createTileButton(config: TileConfig, buttonKey: string, positionOverride?: { x: number; y: number }): void {
        // Determine position: use override if provided; else choose from grid
        let posX: number;
        let posY: number;
        if (positionOverride) {
            posX = positionOverride.x;
            posY = positionOverride.y;
        } else {
            // Get drop zone bounds in unscaled coordinates
            const bounds = this.getDropZoneBounds();
            // Generate grid-based position
            const gridPos = this.getAvailableGridPosition(bounds);
            posX = gridPos.x;
            posY = gridPos.y;
        }
        // Create button using ButtonHelper at the decided position
        const button = ButtonHelper.createButton({
            scene: this.scene,
            imageKeys: {
                default: `${config.color}_tile`,
                hover: `${config.color}_tile_hover`,
                pressed: `${config.color}_tile_pressed`
            },
            imageScale: 1,
            text: config.text,
            textStyle: {
                font: "700 32px Exo",
                color: "#FFFFFF",
                align: 'center',
                padding: {
                    top: 10,
                    left: 10,
                },
            },
            x: posX / this.scene.display.scale,
            y: posY / this.scene.display.scale,
        });

        // Make the button draggable
        button.setInteractive({ draggable: true });
        this.scene.input.setDraggable(button);

        // Create accessibility overlay for keyboard navigation
        // Use the button's image component for the overlay
        const buttonImage = button.getAt(0) as Phaser.GameObjects.Image;
        const overlay = new ImageOverlay(this.scene, buttonImage, {
            label: i18n.t('accessibility.draggableTile', { value: this.getAccessibleDisplayText(config, 1) }),
            cursor: 'pointer',
        });
        this.tileOverlays.set(button, overlay);

        // Make it focusable via tab and add keyboard interaction
        const domElement = (overlay as any).domElement;
        if (domElement?.node) {
            const htmlElement = domElement.node as HTMLElement;
            htmlElement.setAttribute('tabindex', '0');
            htmlElement.setAttribute('role', 'button');
            htmlElement.setAttribute('aria-label', i18n.t('accessibility.draggableTile', { value: this.getAccessibleDisplayText(config, 1) }));
            
            // Add keyboard event listener for Enter/Space key
            htmlElement.addEventListener('keydown', (event: KeyboardEvent) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.handleTileKeyboardInteraction(button);
                }
            });

            // Add focus event listener to console log when tabbing to the tile
            htmlElement.addEventListener('focus', () => {
                const buttonKey = this.getButtonKeyFromGameObject(button);
                if (buttonKey) {
                    const config = this.getConfigFromKey(buttonKey);
                    const tileData = this.tileButtons.get(buttonKey);
                    const count = tileData?.count || 1;
                    console.log(`🎯 Focused on tile: ${config.value} (count: ${count})`);
                }
            });
        }

        // Store button data
        this.tileButtons.set(buttonKey, {
            button: button,
            count: 1,
            text: button.getByName('text') as Phaser.GameObjects.Text
        });
    }

    private getAvailableGridPosition(bounds: DropZoneBounds): { x: number; y: number } {
        const buttonSize = this.scene.getScaledValue(BUTTON_SIZE);
        const padding = this.scene.getScaledValue(20);
        const columnSpacing = buttonSize + padding * 2; // Space for 3 buttons per column

        // Generate grid positions
        const positions: { x: number; y: number; gridKey: string }[] = [];

        // Start from first valid position
        const startY = bounds.minY + buttonSize + padding;
        const startX = bounds.minX + buttonSize + padding;
        const maxX = bounds.maxX - buttonSize - padding;
        const maxY = bounds.maxY - buttonSize - padding;

        // Create grid positions row by row
        for (let y = startY; y <= maxY; y += (columnSpacing - padding)) {
            for (let x = startX; x <= maxX; x += columnSpacing) {
                positions.push({
                    x,
                    y,
                    gridKey: `${x},${y}`
                });
            }
        }

        // Filter out occupied positions
        const availablePositions = positions.filter(pos =>
            !this.occupiedGridPositions.has(pos.gridKey)
        );

        if (availablePositions.length === 0) {
            // Fallback to random placement if no grid positions available
            return {
                x: Phaser.Math.Between(bounds.minX + padding, bounds.maxX - padding),
                y: Phaser.Math.Between(bounds.minY + padding, bounds.maxY - padding)
            };
        }

        // Randomize and select first available position
        Phaser.Utils.Array.Shuffle(availablePositions);
        const selectedPosition = availablePositions[0];
        this.occupiedGridPositions.add(selectedPosition.gridKey);

        return { x: selectedPosition.x, y: selectedPosition.y };
    }
    private getConfigFromKey(buttonKey: string): TileConfig {
        const parts = buttonKey.split('_');
        const color = parts[0];
        const operation = parts[1];
        const value = parts[2];

        // Map the value back to the display text
        let text = value;
        if (value === 'x') {
            text = 'x';
        } else if (value === '-x') {
            text = '-x';
        } else if (value === '1') {
            text = '1';
        } else if (value === '-1') {
            text = '-1';
        }

        return {
            color,
            operation,
            text,
            value
        };
    }

    private getButtonKeyFromGameObject(gameObject: Phaser.GameObjects.GameObject): string | null {
        // Find the button key by checking if the gameObject matches any of our stored buttons
        for (const [key, buttonData] of this.tileButtons.entries()) {
            if (buttonData.button === gameObject) {
                return key;
            }
        }
        return null;
    }

    private handleUndoClick(): void {
        // Clear any selected tile state
        this.clearSelectedTile();
        
        // Clear all tile buttons (undo all operations) and their overlays
        this.tileButtons.forEach(buttonData => {
            // Destroy overlay first
            const overlay = this.tileOverlays.get(buttonData.button);
            if (overlay) {
                overlay.destroy();
                this.tileOverlays.delete(buttonData.button);
            }
            
            if (buttonData.button && buttonData.button.active) {
                buttonData.button.destroy();
            }
        });
        this.tileButtons.clear();

        // Clear occupied grid positions when resetting
        this.occupiedGridPositions.clear();
    }

    private handleCheckClick(): void {
        if (this.isProcessing) return;
        this.isProcessing = true;

        // Form equation from tile buttons without evaluation
        const formedEquation = this.formEquationFromTiles();

        // If no tiles are placed in the drop zone, skip evaluation
        if (formedEquation === '0' && formedEquation !== this.currentQuestion.answer) {
            this.isProcessing = false;
            return;
        }

        // Check if the answer is correct by evaluating the question and comparing
        this.checkAnswer(formedEquation);
    }

    private formEquationFromTiles(): string {
        // Collect all tile data from tiles in the drop zone
        const tileData: TileData[] = [];

        for (const [buttonKey, buttonData] of this.tileButtons.entries()) {
            if (buttonData.button.active && this.isInDropZone(buttonData.button.x, buttonData.button.y)) {
                const config = this.getConfigFromKey(buttonKey);
                tileData.push({
                    value: config.value,
                    count: buttonData.count
                });
            }
        }

        // Form equation by combining tiles as they are (no evaluation)
        return this.combineTilesToEquation(tileData);
    }

    private combineTilesToEquation(tileData: TileData[]): string {
        // Form equation by combining tiles as they are (no evaluation)
        const parts: string[] = [];

        for (const tile of tileData) {
            const displayText = this.getDisplayTextForTile(tile);
            if (displayText) {
                parts.push(displayText);
            }
        }

        // Handle edge cases
        if (parts.length === 0) {
            return '0';
        }

        // Join with proper signs (negative terms should use subtraction)
        return this.joinTermsWithSigns(parts);
    }

    private joinTermsWithSigns(parts: string[]): string {
        if (parts.length === 0) return '0';
        if (parts.length === 1) return parts[0];

        let result = parts[0];
        for (let i = 1; i < parts.length; i++) {
            const term = parts[i];
            if (term.startsWith('-')) {
                result += ` - ${term.substring(1)}`;
            } else {
                result += ` + ${term}`;
            }
        }

        return result;
    }

    private getDisplayTextForTile(tile: TileData): string {
        switch (tile.value) {
            case 'x':
                return tile.count === 1 ? 'x' : `${tile.count}x`;
            case '-x':
                return tile.count === 1 ? '-x' : `-${tile.count}x`;
            case '1':
                return tile.count === 1 ? '1' : `${tile.count}`;
            case '-1':
                return tile.count === 1 ? '-1' : `-${tile.count}`;
            default:
                return '';
        }
    }

    private checkAnswer(formedEquation: string): void {
        if (this.isInstructionMode) {
            // Emit check answer event
            this.scene.events.emit('checkanswer', { isCorrect: true }); // TODO: update normalize expression to handle all cases
            this.isProcessing = false;
            return;
        }

        // Restore focus to game container to ensure announcements are heard
        focusToGameContainer();

        // First check: Compare the simplified forms of both the question and user input
        const evaluatedQuestion = this.evaluateExpression(this.currentQuestion.operand1);
        const normalizedEvaluatedQuestion = this.normalizeExpression(evaluatedQuestion);
        const evaluatedFormedEquation = this.evaluateExpression(formedEquation);
        const normalizedEvaluatedFormed = this.normalizeExpression(evaluatedFormedEquation);

        if (!this.areExpressionsEquivalent(normalizedEvaluatedQuestion, normalizedEvaluatedFormed)) {
            // Simplified forms are not equal - incorrect answer
            this.showFeedbackAnimation(false, formedEquation);
            return;
        }

        // Second check: Check if the user's input is already in simplified form
        const normalizedFormedEquation = this.normalizeExpression(formedEquation);

        if (this.isExpressionCombined(normalizedFormedEquation, normalizedEvaluatedFormed)) {
            // this.scene.time.delayedCall(100, () => {
            //     this.queueAnnouncement(i18n.t('common.correctFeedback'), true);
            // })
            // User input is already in simplified form - correct answer
            this.showFeedbackAnimation(true, formedEquation);

            if (this.scoreHelper.showStreakAnimation()) {
                this.showMascotCelebration();
            }
        } else {
            // this.scene.time.delayedCall(100, () => {
            //     this.queueAnnouncement(i18n.t('common.incorrectFeedback'), true);
            // })
            // User input is mathematically correct but not in simplified form - keep trying
            this.showKeepTryingAnimation();
        }
    }

    private exprToTerms(expr: string): string[] {
        // 7x -2x - 5 + 3 => ["-2x", "-5", "+3", "7x"]
        expr = expr.replace(/\s+/g, "");
        const matchTerms = expr.match(/[+\-]?\d*x?/g)?.filter(Boolean) || [];
        const terms = matchTerms.map((term) => {
            // If term does not contain + or -, add + to the front
            if(!term.includes('+') && !term.includes('-')) {
                return '+' + term;
            } else {
                return term;
            }
        });
        return terms;
    }

    private isExpressionCombined(expr1: string, expr2: string): boolean {
        const terms1 = this.exprToTerms(expr1).sort().join('');
        const terms2 = this.exprToTerms(expr2).sort().join('');
        return terms1 === terms2;
    }

    private areExpressionsEquivalent(expr1: string, expr2: string): boolean {
        // Parse both expressions into their component terms
        const terms1 = this.parseExpression(expr1);
        const terms2 = this.parseExpression(expr2);

        // Compare the parsed terms
        return this.compareTermSets(terms1, terms2);
    }

    private parseExpression(expression: string): { xCoefficient: number; constant: number } {
        // Remove all spaces and normalize minus signs
        let normalized = expression
            .replace(/\s+/g, '')
            .replace(/[−–—]/g, '-');

        // Split into terms
        const terms = normalized.split(/(?=[+-])/).filter(term => term.trim() !== '');

        let xCoefficient = 0;
        let constant = 0;

        for (const term of terms) {
            const trimmedTerm = term.trim();
            if (trimmedTerm === '') continue;

            // Handle terms with explicit signs
            if (trimmedTerm.startsWith('+')) {
                const rest = trimmedTerm.substring(1).trim();
                if (rest === 'x') {
                    xCoefficient += 1;
                } else if (rest.endsWith('x')) {
                    const numPart = rest.substring(0, rest.length - 1);
                    const num = numPart === '' ? 1 : parseInt(numPart);
                    if (!isNaN(num)) xCoefficient += num;
                } else if (!isNaN(parseInt(rest))) {
                    const num = parseInt(rest);
                    constant += num;
                }
            } else if (trimmedTerm.startsWith('-')) {
                const rest = trimmedTerm.substring(1).trim();
                if (rest === 'x') {
                    xCoefficient -= 1;
                } else if (rest.endsWith('x')) {
                    const numPart = rest.substring(0, rest.length - 1);
                    const num = numPart === '' ? 1 : parseInt(numPart);
                    if (!isNaN(num)) xCoefficient -= num;
                } else if (!isNaN(parseInt(rest))) {
                    const num = parseInt(rest);
                    constant -= num;
                }
            } else {
                // Handle terms without explicit signs
                if (trimmedTerm === 'x') {
                    xCoefficient += 1;
                } else if (trimmedTerm.endsWith('x')) {
                    const numPart = trimmedTerm.substring(0, trimmedTerm.length - 1);
                    const num = numPart === '' ? 1 : parseInt(numPart);
                    if (!isNaN(num)) xCoefficient += num;
                } else if (!isNaN(parseInt(trimmedTerm))) {
                    const num = parseInt(trimmedTerm);
                    constant += num;
                }
            }
        }

        return { xCoefficient, constant };
    }

    private compareTermSets(terms1: { xCoefficient: number; constant: number }, terms2: { xCoefficient: number; constant: number }): boolean {
        return terms1.xCoefficient === terms2.xCoefficient && terms1.constant === terms2.constant;
    }

    private evaluateExpression(expression: string): string {
        // Handle complex expressions like 3(x + 1) - 4, 5(2x - 3), etc.
        let result = expression;

        // Normalize minus signs first
        result = result.replace(/[−–—]/g, '-');

        // First, expand parentheses
        result = this.expandParentheses(result);

        // Then combine like terms
        result = this.combineLikeTermsInExpression(result);

        return result;
    }

    private expandParentheses(expression: string): string {
        // Handle expressions like 3(x + 1) - 4, 5(2x - 3), −5(x − 1), 3(−x − 1), etc.
        const parenRegex = /([−-]?\d*)\(([^)]+)\)/g;
        let result = expression;

        // Use matchAll to avoid issues with global regex state
        const matches = Array.from(expression.matchAll(parenRegex));

        for (const match of matches) {
            let coefficientStr = match[1];
            const innerExpression = match[2];

            // Handle empty coefficient (implicit 1)
            if (coefficientStr === '' || coefficientStr === '+') {
                coefficientStr = '1';
            } else if (coefficientStr === '-' || coefficientStr === '−') {
                coefficientStr = '-1';
            }

            // Normalize minus signs and parse coefficient
            coefficientStr = coefficientStr.replace(/[−–—]/g, '-');
            const coefficient = parseInt(coefficientStr);

            // Expand the inner expression by multiplying each term by the coefficient
            const expanded = this.expandTerms(innerExpression, coefficient);

            // Replace the original expression with the expanded one
            result = result.replace(match[0], expanded);
        }

        return result;
    }

    private expandTerms(expression: string, coefficient: number): string {
        // Normalize minus signs in the inner expression first
        let normalizedExpression = expression.replace(/[−–—]/g, '-');

        // Split the expression into terms and multiply each by the coefficient
        const terms = normalizedExpression.split(/(?=[+-])/).filter(term => term.trim() !== '');

        const expandedTerms = terms.map(term => {
            const trimmedTerm = term.trim();
            if (trimmedTerm.startsWith('+') || trimmedTerm.startsWith('-')) {
                const sign = trimmedTerm[0];
                const rest = trimmedTerm.substring(1).trim();

                // Calculate the effective coefficient including the sign
                const effectiveCoeff = coefficient * (sign === '-' ? -1 : 1);
                const multipliedTerm = this.multiplyTermByCoefficient(rest, Math.abs(effectiveCoeff));

                // Apply the final sign
                return effectiveCoeff < 0 ? '-' + multipliedTerm : multipliedTerm;
            } else {
                const multipliedTerm = this.multiplyTermByCoefficient(trimmedTerm, Math.abs(coefficient));
                return coefficient < 0 ? '-' + multipliedTerm : multipliedTerm;
            }
        });

        // Join terms with proper spacing and signs
        let result = expandedTerms[0] || '';
        for (let i = 1; i < expandedTerms.length; i++) {
            const term = expandedTerms[i];
            if (term.startsWith('-')) {
                result += ' ' + term;
            } else {
                result += ' + ' + term;
            }
        }
        return result;
    }

    private multiplyTermByCoefficient(term: string, coefficient: number): string {
        // Handle terms like 'x', '2x', '3', etc.
        // Note: coefficient should be positive (absolute value) since signs are handled separately
        const trimmedTerm = term.trim();

        if (trimmedTerm === 'x') {
            return coefficient === 1 ? 'x' : `${coefficient}x`;
        } else if (trimmedTerm.endsWith('x')) {
            const numPart = trimmedTerm.substring(0, trimmedTerm.length - 1);
            const num = numPart === '' ? 1 : parseInt(numPart);
            const result = num * coefficient;
            return result === 1 ? 'x' : `${result}x`;
        } else {
            const num = parseInt(trimmedTerm);
            return `${num * coefficient}`;
        }
    }

    private combineLikeTermsInExpression(expression: string): string {
        // Normalize the expression first
        let normalizedExpression = expression.replace(/[−–—]/g, '-');

        // Parse the expression and combine like terms
        const terms = normalizedExpression.split(/(?=[+-])/).filter(term => term.trim() !== '');

        let xCoefficient = 0;
        let constantTerm = 0;

        for (const term of terms) {
            const trimmedTerm = term.trim();
            if (trimmedTerm === '') continue;

            // Handle terms with explicit signs
            if (trimmedTerm.startsWith('+')) {
                const rest = trimmedTerm.substring(1).trim();
                if (rest === 'x') {
                    xCoefficient += 1;
                } else if (rest.endsWith('x')) {
                    const numPart = rest.substring(0, rest.length - 1);
                    const num = numPart === '' ? 1 : parseInt(numPart);
                    xCoefficient += num;
                } else if (!isNaN(parseInt(rest))) {
                    const num = parseInt(rest);
                    constantTerm += num;
                }
            } else if (trimmedTerm.startsWith('-')) {
                const rest = trimmedTerm.substring(1).trim();
                if (rest === 'x') {
                    xCoefficient -= 1;
                } else if (rest.endsWith('x')) {
                    const numPart = rest.substring(0, rest.length - 1);
                    const num = numPart === '' ? 1 : parseInt(numPart);
                    xCoefficient -= num;
                } else if (!isNaN(parseInt(rest))) {
                    const num = parseInt(rest);
                    constantTerm -= num;
                }
            } else {
                // Handle terms without explicit signs
                if (trimmedTerm === 'x') {
                    xCoefficient += 1;
                } else if (trimmedTerm.endsWith('x')) {
                    const numPart = trimmedTerm.substring(0, trimmedTerm.length - 1);
                    const num = numPart === '' ? 1 : parseInt(numPart);
                    xCoefficient += num;
                } else if (!isNaN(parseInt(trimmedTerm))) {
                    const num = parseInt(trimmedTerm);
                    constantTerm += num;
                }
            }
        }

        // Build the result expression
        const parts: string[] = [];

        if (xCoefficient !== 0) {
            if (xCoefficient === 1) {
                parts.push('x');
            } else if (xCoefficient === -1) {
                parts.push('-x');
            } else {
                parts.push(`${xCoefficient}x`);
            }
        }

        if (constantTerm !== 0) {
            if (constantTerm > 0 && parts.length > 0) {
                parts.push(`+ ${constantTerm}`);
            } else if (constantTerm < 0 && parts.length > 0) {
                parts.push(`- ${Math.abs(constantTerm)}`);
            } else {
                parts.push(`${constantTerm}`);
            }
        }

        const result = parts.length === 0 ? '0' : parts.join(' ');

        return result;
    }

    private normalizeExpression(expression: string): string {
        // Remove all spaces and normalize minus signs
        let normalized = expression
            .replace(/\s+/g, '') // Remove all whitespace
            .replace(/[−–—]/g, '-'); // Normalize different minus signs

        // Add consistent spacing around operators
        normalized = normalized
            .replace(/([+-])/g, ' $1 ') // Add spaces around + and -
            .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
            .replace(/^\s+|\s+$/g, ''); // Trim leading/trailing spaces

        return normalized;
    }

    private updateTileButtonStates(state: TileState): void {
        this.tileButtons.forEach((buttonData) => {
            if (buttonData.button && buttonData.button.active) {
                const buttonBg = buttonData.button.list[0] as Phaser.GameObjects.Image;
                if (state === TileState.SUCCESS) {
                    buttonBg.setTexture('correct_tile');
                } else if (state === TileState.ERROR) {
                    buttonBg.setTexture('incorrect_tile');
                }
            }
        });
    }

    // Add this method to reset tile button states after animation
    private resetTileButtonStates(): void {
        this.tileButtons.forEach((buttonData) => {
            if (buttonData.button && buttonData.button.active) {
                const buttonBg = buttonData.button.list[0] as Phaser.GameObjects.Image;
                buttonBg.clearTint(); // Remove any tint
            }
        });
    }

    // UI Button Creation Methods
    private createPauseButton() {
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
                this.scene.scene.launch("PauseScene", { parentScene: "GameScene" });
                this.scene.audioManager.pauseAll();
                this.scene.scene.bringToTop("PauseScene");
            },
        }).setName('pause_btn');
    }

    private createMuteButton() {
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
            y: 142,
            raisedOffset: 3.5,
            onClick: () => {
                this.scene.audioManager.setMute(!this.scene.audioManager.getIsAllMuted());
                this.updateMuteButton();
            },
        });
    }

    private createVolumeSlider() {
        this.volumeSlider = new VolumeSlider(this.scene);
        this.volumeSlider.create(this.scene.display.width - 220, 238, 'purple', i18n.t('common.volume'));
        const onKeyDown = () => {
            this.volumeSlider.toggleControl();
        }
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
            onClick: () => onKeyDown(),
        });
    }

    private createHelpButton() {
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
                    mechanic: 'combine_equations',
                    parentScene: 'GameScene',
                });
                this.scene.scene.bringToTop("InstructionsScene");
            },
        });
    }

    /**
     * Handles keyboard interaction with tiles - either selects or drops depending on current state
     */
    private handleTileKeyboardInteraction(targetContainer: Phaser.GameObjects.Container): void {
        if (!this.selectedTileForKeyboard) {
            // No tile selected, so select this one
            this.selectTileForKeyboard(targetContainer);
        } else if (this.selectedTileForKeyboard === targetContainer) {
            // Same tile clicked again, deselect it
            this.clearSelectedTile();
        } else {
            // Different tile clicked, try to combine them
            const selectedButtonKey = this.getButtonKeyFromGameObject(this.selectedTileForKeyboard);
            const targetButtonKey = this.getButtonKeyFromGameObject(targetContainer);
            
            if (selectedButtonKey && targetButtonKey && this.canCombineTiles(selectedButtonKey, targetButtonKey)) {
                // Can combine - do the combination
                announceToScreenReader(i18n.t('accessibility.tilesCombined'));
                const newTile = this.combineTiles(selectedButtonKey, targetButtonKey);
                this.clearSelectedTile();
                
                // Focus on the newly created tile
                if (newTile) {
                    this.scene.time.delayedCall(100, () => {
                        const overlay = this.tileOverlays.get(newTile);
                        if (overlay) {
                            overlay.element.focus({ preventScroll: true });
                        }
                    });
                } else {
                    // If no tile created (result was 0), focus back to game container
                    focusToGameContainer();
                }
            } else {
                // Cannot combine - select the new tile instead
                focusToGameContainer();
                announceToScreenReader(i18n.t('accessibility.cannotCombineTiles'));
                this.selectTileForKeyboard(targetContainer);
            }
        }
    }

    /**
     * Selects a tile for keyboard-based dropping
     */
    private selectTileForKeyboard(container: Phaser.GameObjects.Container): void {
        // Clear any previously selected tile
        this.clearSelectedTile();
        
        // Set the new selected tile
        this.selectedTileForKeyboard = container;
        
        // Create visual indicator (white outline around the tile)
        this.createSelectedTileIndicator(container);
        
        // Update alpha to indicate selection
        container.setAlpha(0.7);
        
        // Update aria-label to indicate selection
        const overlay = this.tileOverlays.get(container);
        if (overlay) {
            const domElement = (overlay as any).domElement;
            if (domElement?.node) {
                const htmlElement = domElement.node as HTMLElement;
                const buttonKey = this.getButtonKeyFromGameObject(container);
                if (buttonKey) {
                    const config = this.getConfigFromKey(buttonKey);
                    const buttonData = this.tileButtons.get(buttonKey);
                    const count = buttonData?.count || 1;
                    const label = this.getAccessibleDisplayText(config, count);
                    htmlElement.setAttribute('aria-label', i18n.t('accessibility.selectedTile', { value: label }));
                }
            }
        }
        
        // Play positive sound to indicate selection
        this.scene.audioManager.playSoundEffect('positive');
    }

    /**
     * Creates a visual indicator around the selected tile
     */
    private createSelectedTileIndicator(container: Phaser.GameObjects.Container): void {
        this.selectedTileIndicator = this.scene.add.graphics();
        this.selectedTileIndicator.lineStyle(4, 0xffffff, 1);
        
        // Draw a rectangle around the tile
        const bounds = container.getBounds();
        const width = bounds.width + 10;
        const height = bounds.height + 10;
        this.selectedTileIndicator.strokeRect(-width / 2, -height / 2, width, height);
        
        // Position the indicator at the tile's position
        this.selectedTileIndicator.setPosition(container.x, container.y);
    }

    /**
     * Clears the currently selected tile and its visual indicator
     */
    private clearSelectedTile(): void {
        if (this.selectedTileForKeyboard) {
            // Reset tile alpha
            this.selectedTileForKeyboard.setAlpha(1);
            
            // Reset aria-label
            const overlay = this.tileOverlays.get(this.selectedTileForKeyboard);
            if (overlay) {
                const domElement = (overlay as any).domElement;
                if (domElement?.node) {
                    const htmlElement = domElement.node as HTMLElement;
                    const buttonKey = this.getButtonKeyFromGameObject(this.selectedTileForKeyboard);
                    if (buttonKey) {
                        const config = this.getConfigFromKey(buttonKey);
                        const buttonData = this.tileButtons.get(buttonKey);
                        const count = buttonData?.count || 1;
                        const label = this.getAccessibleDisplayText(config, count);
                        htmlElement.setAttribute('aria-label', i18n.t('accessibility.draggableTile', { value: label }));
                    }
                }
            }
            
            this.selectedTileForKeyboard = undefined;
        }
        
        // Destroy visual indicator
        if (this.selectedTileIndicator) {
            this.selectedTileIndicator.destroy();
            this.selectedTileIndicator = undefined;
        }
    }

    // Update method for mute button icon
    update(): void {
        // Update mute button icon
        this.updateMuteButton();
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

    private updateMuteButton() {
        const muteBtnItem = this.muteBtn.getAt(1) as Phaser.GameObjects.Sprite;
        muteBtnItem.setTexture(this.scene.audioManager.getIsAllMuted() ? BUTTONS.MUTE_ICON.KEY : BUTTONS.UNMUTE_ICON.KEY);

        // Update mute button state for accessibility
        const label = this.scene.audioManager.getIsAllMuted() ? i18n.t('common.unmute') : i18n.t('common.mute');
        const overlay = (this.muteBtn as any).buttonOverlay as ButtonOverlay;
        const muteBtnState = this.muteBtn.getData('state');
        if(muteBtnState != label) {
            this.muteBtn.setData('state', label);
            overlay.setLabel(label);
        }
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
    
            this.scene.time.delayedCall(delay, () => {
                this.isAnnouncing = false;
                this.processAnnouncementQueue();
            });
        }, 50);
    }
} 