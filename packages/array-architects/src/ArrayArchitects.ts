import { BaseScene, setSceneBackground, ScoreHelper, ProgressBar, ScoreCoins, Question, i18n, ButtonHelper, ImageOverlay, VolumeSlider, GameConfigManager, announceToScreenReader, TextOverlay, AnalyticsHelper } from "@k8-games/sdk";
import { ASSETS_PATHS, BUTTONS, QuestionType } from "./config/common";
import { MuteButton } from "./utils/MuteButton";
import { GridManager, GridTile } from "./utils/GridManager";
import { FactMasteryItem, MathFact, MultiverseQuestionSelector, parseMathFact, StudentResponse, topicToTagsMapping } from "@k8-games/sdk/multiverse";
import { continueGameAfterWrongAnswer } from "./utils/helper";

export class ArrayArchitects {
    private scene: BaseScene;
    private isInstructionMode: boolean = false;
    
    // Question bank components
    private questionSelector?: MultiverseQuestionSelector;
    private scoreHelper: ScoreHelper;
    private progressBar?: ProgressBar;
    private scoreCoins?: ScoreCoins;
    private totalQuestions: number = 10;
    private question: Question | null = null;
    private isProcessing: boolean = false;

    // Timer for question completion time
    private questionStartTime: number = 0;
    private questionCompletionTime: number = 0;
    private multiverseQuestion: MathFact | null = null;

    // Grid components
    private gridManager: GridManager;

    // Drag selection
    private isDragging: boolean = false;
    private dragStartTile: { row: number; col: number } | null = null;
    private dragEndTile: { row: number; col: number } | null = null;

    // Keyboard navigation state
    private currentFocusedTile: { row: number; col: number } | null = null;
    private keyboardSelectionStart: { row: number; col: number } | null = null;
    private focusIndicator?: Phaser.GameObjects.Graphics;
    private selectionStartIndicator?: Phaser.GameObjects.Graphics;
    private tileOverlays: Map<string, any> = new Map();
    private gridContainer?: Phaser.GameObjects.Container;
    private isGridContainerFocused: boolean = false;
    private isInteractionEnabled: boolean = true;

    // UI elements
    private questionText?: Phaser.GameObjects.Text;
    private instructionText?: Phaser.GameObjects.Text;
    private volumeSlider?: VolumeSlider;
    private muteButton?: MuteButton;
    private checkButton?: Phaser.GameObjects.Container;
    private resetButton?: Phaser.GameObjects.Container;

    // Callback for external button management (used in instruction mode)
    private onSelectionCompleteCallback?: () => void;

    private topic: string = '';
    private analyticsHelper!: AnalyticsHelper;

    constructor(scene: BaseScene, isInstructionMode: boolean = false) {
        this.scene = scene;
        this.isInstructionMode = isInstructionMode;
        this.scoreHelper = new ScoreHelper(2);
        this.gridManager = new GridManager(this.scene, this.isInstructionMode ? -50 : 0);
        
        const gameConfigManager = GameConfigManager.getInstance();
        this.topic = gameConfigManager.get('topic') || 'grade3_topic2';
        const tagKeys = topicToTagsMapping[this.topic];
        
        if (!this.questionSelector) {
            this.questionSelector = new MultiverseQuestionSelector(tagKeys);
        }
    }

    static _preload(scene: BaseScene) {
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/common`);
        scene.load.image('bg', 'bg.png');
        scene.load.image('game_bg', 'game_bg.png');
        
        // Load button assets
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen/`);
        scene.load.image('btn_purple', 'btn_purple.png');
        scene.load.image('btn_purple_hover', 'btn_purple_hover.png');
        scene.load.image('btn_purple_pressed', 'btn_purple_pressed.png');
        scene.load.image('btn_purple_inactive', 'btn_purple_inactive.png');
        scene.load.image('btn_red', 'btn_red.png');
        scene.load.image('btn_red_hover', 'btn_red_hover.png');
        scene.load.image('btn_red_pressed', 'btn_red_pressed.png');
        scene.load.image('btn_red_inactive', 'btn_red_inactive.png');
        scene.load.image('continue_btn_bg', 'continue_btn_bg.png');
        
        // Load icon assets for success/error animations
        scene.load.image('correct_icon', 'correct_icon.png');
        scene.load.image('incorrect_icon', 'incorrect_icon.png');
        
        // Load icon button assets for pause, mute, volume, and help buttons
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
        
        // Load audio assets
        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}`);
        scene.load.audio('positive-sfx', 'positive.mp3');
        scene.load.audio('negative-sfx', 'negative.mp3');
        scene.load.audio('bg-music', 'bg-music.mp3');
        scene.load.audio('card-flip', 'card-flip.mp3');
        
        // Preload progress bar and score coins
        ProgressBar.preload(scene, 'dark');
        ScoreCoins.preload(scene, 'blue');
        VolumeSlider.preload(scene, 'blue');
    }

    init(data?: { reset?: boolean }) {
        ProgressBar.init(this.scene);
        ScoreCoins.init(this.scene);
        
        if (data?.reset) {
            this.resetGame();
            this.questionSelector?.reset();
        }
    }

    create() {
        if (!this.isInstructionMode) {
            const _analyticsHelper = AnalyticsHelper.getInstance();
            if (_analyticsHelper) {
                this.analyticsHelper = _analyticsHelper;
                this.analyticsHelper?.createSession('game.multiverse.array_architects');
            } else {
                console.error('AnalyticsHelper not found');
            }
        }

        const bgKey = this.isInstructionMode ? 'bg' : 'game_bg';
        setSceneBackground(bgKey);
        this.scene.addImage(this.scene.display.width / 2, this.scene.display.height / 2, bgKey);
        
        if (!this.isInstructionMode) {
            this.scene.audioManager.playBackgroundMusic('bg-music');
            this.createScoreDisplay();
            this.createProgressBar();
            this.createButtons();
        }

        // Initialize with 5×10 grid
        this.updateGridForQuestion();

        // Create UI elements
        this.createQuestionUI();

        // Load the first question
        this.loadNextQuestion();
        
        // Set up grid event handlers AFTER grid is created
        this.setupGridEventHandlers();

        // Set up keyboard navigation
        this.setupKeyboardNavigation();

        if (!this.isInstructionMode) {
            this.createResetButton();
            this.createCheckAnswerButton();
        }
    }

    public setupGridEventHandlers(): void {
        // Set up grid event handlers
        this.gridManager.setupGridEvents(
            (row, col) => this.onTilePointerDown(row, col),
            (row, col) => this.onTilePointerOver(row, col),
            () => this.onTilePointerUp()
        );

        // Global pointer up to catch releases outside tiles
        this.scene.input.on('pointerup', () => {
            if (this.isDragging) {
                this.onSelectionComplete();
            }
        });
        
        // Add accessibility overlays to tiles for screen reader support
        this.createTileOverlays();
    }

    private createTileOverlays(): void {
        // Clear existing overlays
        this.tileOverlays.forEach((overlay) => {
            if (overlay && overlay.destroy) {
                overlay.destroy();
            }
        });
        this.tileOverlays.clear();
        
        const gridTiles = this.gridManager.getGridTiles();
        const gridDimensions = this.gridManager.getGridDimensions();
        
        for (let row = 0; row < gridDimensions.rows; row++) {
            for (let col = 0; col < gridDimensions.cols; col++) {
                const tile = gridTiles[row][col];
                if (tile) {
                    const tileKey = `${row}-${col}`;
                    
                    // Create a transparent sprite to use with ImageOverlay
                    const transparentTile = this.scene.add.sprite(
                        tile.fillGraphics.x, 
                        tile.fillGraphics.y, 
                        ''
                    );
                    transparentTile.setSize(tile.scaledWidth, tile.scaledHeight);
                    transparentTile.setVisible(false); // Invisible but interactive for accessibility
                    transparentTile.setDepth(20); // Above everything else
                    
                    // Create overlay for the tile (using ImageOverlay from SDK)
                    const overlay = new ImageOverlay(this.scene, transparentTile, {
                        label: i18n.t('accessibility.gridTile', { 
                            row: row + 1, 
                            col: col + 1
                        }),
                        cursor: 'pointer',
                    });
                    
                    // Make it focusable for keyboard navigation as alternative
                    const domElement = (overlay as any).domElement;
                    if (domElement?.node) {
                        const htmlElement = domElement.node as HTMLElement;
                        htmlElement.setAttribute('tabindex', '-1'); // Can be focused programmatically but not via tab
                        htmlElement.setAttribute('role', 'gridcell');
                        htmlElement.setAttribute('aria-label', 
                            i18n.t('accessibility.gridTile', { 
                                row: row + 1, 
                                col: col + 1
                            })
                        );
                        
                        // Add click handler for mouse/touch users
                        htmlElement.addEventListener('click', () => {
                            this.onTilePointerDown(row, col);
                        });
                    }
                    
                    this.tileOverlays.set(tileKey, { overlay, sprite: transparentTile });
                }
            }
        }
    }

    public setupKeyboardNavigation(): void {
        // Initialize focus at top-left corner (0, 0) but don't show indicator yet
        this.currentFocusedTile = { row: 0, col: 0 };
        
        // Create a focusable overlay for the entire grid area
        this.createFocusableGridContainer();
        
        // Set up keyboard event listeners only when grid has focus
        this.scene.input.keyboard?.on('keydown', this.handleKeyDown, this);
    }

    private createFocusableGridContainer(): void {
        const gridDimensions = this.gridManager.getTotalGridDimensions();
        const gridStart = this.gridManager.getGridStartPosition();
        
        // Create an invisible sprite that covers the entire grid area
        // Use the actual grid center position instead of screen center
        const gridCenterX = gridStart.x + gridDimensions.width / 2;
        const gridCenterY = gridStart.y + gridDimensions.height / 2;
        
        const gridOverlay = this.scene.add.sprite(
            gridCenterX,
            gridCenterY,
            ''
        );
        gridOverlay.setSize(gridDimensions.width + 40, gridDimensions.height + 40); // Add padding
        gridOverlay.setVisible(false);
        gridOverlay.setDepth(15); // Above everything else

        // Create ImageOverlay for proper tab navigation
        const gridContainerOverlay = new ImageOverlay(this.scene, gridOverlay, {
            label: i18n.t('accessibility.keyboardInstructions'),
            cursor: 'default',
        });
        
        // Make it focusable via tab
        const domElement = (gridContainerOverlay as any).domElement;
        if (domElement?.node) {
            const htmlElement = domElement.node as HTMLElement;
            htmlElement.setAttribute('tabindex', '0');
            htmlElement.setAttribute('role', 'application');
            htmlElement.setAttribute('aria-label', 
                i18n.t('accessibility.keyboardInstructions')
            );
            
            // Add focus/blur event listeners
            htmlElement.addEventListener('focus', () => {
                this.onGridContainerFocus();
            });
            
            htmlElement.addEventListener('blur', () => {
                this.onGridContainerBlur();
            });

            // htmlElement.addEventListener('blur', () => {
            //     htmlElement.style.boxShadow = 'none';
            // });
        }
        
        this.gridContainer = this.scene.add.container();
        this.gridContainer.add([gridOverlay]);
    }

    private onGridContainerFocus(): void {
        this.isGridContainerFocused = true;
        
        // Create and show focus indicator when grid gets focus
        this.createFocusIndicator();
        
        // Announce position and instructions
        this.announceTilePosition(0, 0);
        // this.scene.time.delayedCall(1500, () => {
        //     announceToScreenReader(i18n.t('accessibility.keyboardInstructions'));
        // });
    }

    private onGridContainerBlur(): void {
        this.isGridContainerFocused = false;
        
        // Hide focus indicator when grid loses focus
        if (this.focusIndicator) {
            this.focusIndicator.destroy();
            this.focusIndicator = undefined;
        }
        
        // Also clear any selection start indicator
        this.clearKeyboardSelectionState();
    }

    private handleKeyDown(event: KeyboardEvent): void {
        // Only handle keyboard events when grid container is focused and interactions are enabled
        if (!this.isGridContainerFocused || !this.currentFocusedTile || !this.isInteractionEnabled) return;
        
        const { row, col } = this.currentFocusedTile;
        const gridDimensions = this.gridManager.getGridDimensions();
        
        switch (event.code) {
            case 'ArrowUp':
                event.preventDefault();
                if (row > 0) {
                    this.moveFocus(row - 1, col);
                }
                break;
                
            case 'ArrowDown':
                event.preventDefault();
                if (row < gridDimensions.rows - 1) {
                    this.moveFocus(row + 1, col);
                }
                break;
                
            case 'ArrowLeft':
                event.preventDefault();
                if (col > 0) {
                    this.moveFocus(row, col - 1);
                }
                break;
                
            case 'ArrowRight':
                event.preventDefault();
                if (col < gridDimensions.cols - 1) {
                    this.moveFocus(row, col + 1);
                }
                break;
                
            case 'Enter':
            case 'Space':
                event.preventDefault();
                this.handleKeyboardSelection(row, col);
                break;
                
            case 'KeyR':
                // R key for Reset
                event.preventDefault();
                this.clearSelection();
                announceToScreenReader(i18n.t('accessibility.selectionCleared'));
                break;
                
            case 'KeyC':
                // C key for Check Answer (if selection exists)
                event.preventDefault();
                if (this.checkButton && this.getSelectedTileCount() > 0) {
                    this.checkAnswer();
                }
                break;
                
            case 'Escape':
                // Escape to clear keyboard selection state but keep tile selections
                event.preventDefault();
                this.clearKeyboardSelectionState();
                if (this.keyboardSelectionStart) {
                    announceToScreenReader(i18n.t('accessibility.selectionCancelled'));
                }
                break;
        }
    }

    private moveFocus(newRow: number, newCol: number): void {
        this.currentFocusedTile = { row: newRow, col: newCol };
        this.updateFocusIndicator(newRow, newCol);
        this.announceTilePosition(newRow, newCol);
    }

    private handleKeyboardSelection(row: number, col: number): void {
        if (!this.keyboardSelectionStart) {
            // First corner selection
            this.keyboardSelectionStart = { row, col };
            this.createSelectionStartIndicator(row, col);
            this.announceFistCornerSelected(row, col);
        } else {
            // Second corner selection - complete the rectangle
            this.completeKeyboardSelection(row, col);
        }
    }

    private completeKeyboardSelection(endRow: number, endCol: number): void {
        if (!this.keyboardSelectionStart) return;
        
        const startRow = Math.min(this.keyboardSelectionStart.row, endRow);
        const finalEndRow = Math.max(this.keyboardSelectionStart.row, endRow);
        const startCol = Math.min(this.keyboardSelectionStart.col, endCol);
        const finalEndCol = Math.max(this.keyboardSelectionStart.col, endCol);

        // Clear any existing selections
        this.clearAllSelections();

        // Select tiles in the rectangle
        for (let r = startRow; r <= finalEndRow; r++) {
            for (let c = startCol; c <= finalEndCol; c++) {
                this.gridManager.updateTileSelection(r, c, true, 0x8EC3FF); // blue color
            }
        }
        
        // Complete the selection (add numbers, play sound, etc.)
        this.gridManager.completeSelection();

        // Enable check button after completing selection
        if (this.checkButton) {
            ButtonHelper.enableButton(this.checkButton);
        }

        // Call external callback if set (for instruction mode)
        if (this.onSelectionCompleteCallback) {
            this.onSelectionCompleteCallback();
        }

        // Clear keyboard selection state
        this.clearKeyboardSelectionState();
        
        // Announce completed rectangle
        const width = finalEndCol - startCol + 1;
        const height = finalEndRow - startRow + 1;
        this.announceRectangleCompleted(width, height);
    }

    private clearKeyboardSelectionState(): void {
        this.keyboardSelectionStart = null;
        
        if (this.selectionStartIndicator) {
            this.selectionStartIndicator.destroy();
            this.selectionStartIndicator = undefined;
        }
    }

    private createFocusIndicator(): void {
        if (!this.currentFocusedTile) return;
        
        // Destroy existing indicator if it exists
        if (this.focusIndicator) {
            this.focusIndicator.destroy();
        }
        
        this.focusIndicator = this.scene.add.graphics();
        this.updateFocusIndicator(this.currentFocusedTile.row, this.currentFocusedTile.col);
        
        // Add a gentle pulsing animation to make the focus more noticeable
        this.scene.tweens.add({
            targets: this.focusIndicator,
            alpha: 0.6,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    private updateFocusIndicator(row: number, col: number): void {
        if (!this.focusIndicator) return;
        
        const gridTiles = this.gridManager.getGridTiles();
        if (row >= 0 && row < gridTiles.length && col >= 0 && col < gridTiles[row].length) {
            const tile = gridTiles[row][col];
            
            // Position the indicator at the tile location
            this.focusIndicator.setPosition(tile.fillGraphics.x, tile.fillGraphics.y);
            
            // Clear and redraw the focus indicator with prominent outline
            this.focusIndicator.clear();
            
            // Create a thick, bright focus outline that's very visible
            this.focusIndicator.lineStyle(6, 0x0066FF, 1); // Bright blue, thick border
            this.focusIndicator.strokeRoundedRect(
                -tile.scaledWidth / 2 - 3,
                -tile.scaledHeight / 2 - 3,
                tile.scaledWidth + 6,
                tile.scaledHeight + 6,
                tile.scaledRadius
            );
            
            // Add a subtle white glow effect for better visibility
            this.focusIndicator.lineStyle(2, 0xFFFFFF, 0.8); // Thinner white outline
            this.focusIndicator.strokeRoundedRect(
                -tile.scaledWidth / 2 - 1,
                -tile.scaledHeight / 2 - 1,
                tile.scaledWidth + 2,
                tile.scaledHeight + 2,
                tile.scaledRadius
            );
            
            this.focusIndicator.setDepth(10); // Ensure it's on top
        }
    }

    private createSelectionStartIndicator(row: number, col: number): void {
        // Destroy existing indicator if it exists
        if (this.selectionStartIndicator) {
            this.selectionStartIndicator.destroy();
        }
        
        const gridTiles = this.gridManager.getGridTiles();
        if (row >= 0 && row < gridTiles.length && col >= 0 && col < gridTiles[row].length) {
            const tile = gridTiles[row][col];
            
            this.selectionStartIndicator = this.scene.add.graphics();
            this.selectionStartIndicator.setPosition(tile.fillGraphics.x, tile.fillGraphics.y);
            
            // Draw a prominent green outline to indicate the start corner
            this.selectionStartIndicator.lineStyle(5, 0x00AA00, 1); // Thick green border
            this.selectionStartIndicator.strokeRoundedRect(
                -tile.scaledWidth / 2 - 2,
                -tile.scaledHeight / 2 - 2,
                tile.scaledWidth + 4,
                tile.scaledHeight + 4,
                tile.scaledRadius
            );
            
            // Add a thin white outline for contrast
            this.selectionStartIndicator.lineStyle(2, 0xFFFFFF, 0.9);
            this.selectionStartIndicator.strokeRoundedRect(
                -tile.scaledWidth / 2,
                -tile.scaledHeight / 2,
                tile.scaledWidth,
                tile.scaledHeight,
                tile.scaledRadius
            );
            
            // Add corner markers to emphasize this is the "start" corner
            const markerSize = 8;
            this.selectionStartIndicator.fillStyle(0x00AA00, 1);
            // Top-left corner marker
            this.selectionStartIndicator.fillCircle(
                -tile.scaledWidth / 2 - 2, 
                -tile.scaledHeight / 2 - 2, 
                markerSize
            );
            // Bottom-right corner marker  
            this.selectionStartIndicator.fillCircle(
                tile.scaledWidth / 2 + 2, 
                tile.scaledHeight / 2 + 2, 
                markerSize
            );
            
            this.selectionStartIndicator.setDepth(9); // Below focus indicator but above tiles
            
            // Add a subtle pulsing animation to the selection start indicator
            this.scene.tweens.add({
                targets: this.selectionStartIndicator,
                alpha: 0.7,
                duration: 1000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    private announceTilePosition(row: number, col: number): void {
        const message = i18n.t('accessibility.tilePosition', { 
            row: row + 1, 
            col: col + 1
        });
        announceToScreenReader(message);
    }

    private announceFistCornerSelected(row: number, col: number): void {
        const message = i18n.t('accessibility.firstCornerSelected', { 
            row: row + 1, 
            col: col + 1
        });
        announceToScreenReader(message);
    }

    private announceRectangleCompleted(width: number, height: number): void {
        const message = i18n.t('accessibility.rectangleCompleted', { 
            width, 
            height,
            total: width * height
        });
        announceToScreenReader(message);
    }

    private cleanupKeyboardNavigation(): void {
        // Remove keyboard event listeners
        this.scene.input.keyboard?.off('keydown', this.handleKeyDown, this);
        
        // Destroy visual indicators
        if (this.focusIndicator) {
            this.focusIndicator.destroy();
            this.focusIndicator = undefined;
        }
        
        if (this.selectionStartIndicator) {
            this.selectionStartIndicator.destroy();
            this.selectionStartIndicator = undefined;
        }
        
        // Destroy grid container
        if (this.gridContainer) {
            this.gridContainer.destroy();
            this.gridContainer = undefined;
        }
        
        // Clean up overlays
        this.cleanupTileOverlays();
        
        // Reset state
        this.currentFocusedTile = null;
        this.keyboardSelectionStart = null;
        this.isGridContainerFocused = false;
    }

    private createProgressBar(): void {
        this.progressBar = new ProgressBar(this.scene, 'dark', i18n);
        this.progressBar.create(
            this.scene.getScaledValue(this.scene.display.width / 2),
            this.scene.getScaledValue(70)
        );
    }

    private createScoreDisplay() {
        this.scoreCoins = new ScoreCoins(this.scene, this.scoreHelper, i18n, 'blue');
        this.scoreCoins.create(
            this.scene.getScaledValue(87),
            this.scene.getScaledValue(63)
        );
    }

    /**
     * Update grid size and layout - always use 5×10 grid
     */
    private updateGridForQuestion(): void {
        // Clean up existing overlays
        this.cleanupTileOverlays();
        
        // Always use 5×10 grid regardless of question
        this.gridManager.updateGridForDimensions(5, 10);
    }

    private cleanupTileOverlays(): void {
        this.tileOverlays.forEach((tileData) => {
            if (tileData.overlay && tileData.overlay.destroy) {
                tileData.overlay.destroy();
            }
            if (tileData.sprite && tileData.sprite.destroy) {
                tileData.sprite.destroy();
            }
        });
        this.tileOverlays.clear();
    }

    /**
     * Create question UI
     */
    private createQuestionUI(): void {
        const gridDimensions = this.gridManager.getTotalGridDimensions();

        // Create question text
        this.questionText = this.scene.addText(
            this.scene.display.width / 2 - 100, 
            this.scene.display.height / 2 - gridDimensions.height / 2 - 80, 
            "", 
            {
                font: "700 52px Exo",
                color: "#FFFFFF",
            }
        );

        const questionTextOverlay = new TextOverlay(this.scene, this.questionText, { label: '' });

        this.questionText.setData('overlay', questionTextOverlay);

        this.instructionText = this.scene.addText(
            this.scene.display.width / 2, 
            230, 
            i18n.t('game.drawRectangle'), 
            {
                font: "500 24px Exo",
                color: "#FFFFFF",
            }
        ).setOrigin(0.5);

        new TextOverlay(this.scene, this.instructionText, { label: i18n.t('game.drawRectangle') });
    }

    /**
     * Create buttons
     */
    private createButtons(): void {
        this.createPauseButton();
        this.createMuteButton();
        this.createVolumeSliderButton();
        this.createHelpButton();
    }

    private createCheckAnswerButton(): void {
        // Check Answer button
        this.checkButton = ButtonHelper.createButton({
            scene: this.scene,
            imageKeys: {
                default: 'btn_purple',
                hover: 'btn_purple_hover',
                pressed: 'btn_purple_pressed',
                disabled: 'btn_purple_inactive'
            },
            text: i18n.t('game.checkAnswer'),
            label: i18n.t('game.checkAnswer'),
            textStyle: {
                font: "700 36px Exo",
                color: "#FFFFFF",
            },
            x: this.scene.display.width - 100,
            y: this.scene.display.height - 120,
            onClick: () => this.checkAnswer()
        });
        
        // Initially disable the check button
        if (this.checkButton) {
            ButtonHelper.disableButton(this.checkButton);
        }
    }

    private createResetButton(): void {
        // Reset button
        this.resetButton = ButtonHelper.createButton({
            scene: this.scene,
            imageKeys: {
                default: 'btn_red',
                hover: 'btn_red_hover',
                pressed: 'btn_red_pressed',
                disabled: 'btn_red_inactive'
            },
            text: i18n.t('game.resetSelection'),
            label: i18n.t('game.resetSelection'),
            textStyle: {
                font: "700 36px Exo",
                color: "#FFFFFF",
            },
            x: 100,
            y: this.scene.display.height - 120,
            onClick: () => this.clearSelection()
        });
    }

    /**
     * Handle tile pointer down
     */
    private onTilePointerDown(row: number, col: number): void {
        // Ignore interaction if disabled
        if (!this.isInteractionEnabled) return;
        
        // Clear previous selection immediately when starting new selection
        this.clearAllSelections();

        this.isDragging = true;
        this.dragStartTile = { row, col };
        this.dragEndTile = { row, col };
        // Show initial 1 × 1 selection immediately
        this.updateTileSelection(row, col, true, 0xFFCC5F); // yellow while dragging
    }

    /**
     * Handle tile pointer over (during drag)
     */
    private onTilePointerOver(row: number, col: number): void {
        // Ignore interaction if disabled
        if (!this.isInteractionEnabled) return;
        
        if (this.isDragging && this.dragStartTile) {
            this.dragEndTile = { row, col };
            this.updateSelectionBetweenPoints();
        }
    }

    /**
     * Handle tile pointer up
     */
    private onTilePointerUp(): void {
        // Ignore interaction if disabled
        if (!this.isInteractionEnabled) return;
        
        if (!this.isDragging) return;
        this.onSelectionComplete();
    }

    private onSelectionComplete(): void {
        this.isDragging = false;

        if (!this.dragStartTile || !this.dragEndTile) return;

        const startRow = Math.min(this.dragStartTile.row, this.dragEndTile.row);
        const endRow = Math.max(this.dragStartTile.row, this.dragEndTile.row);
        const startCol = Math.min(this.dragStartTile.col, this.dragEndTile.col);
        const endCol = Math.max(this.dragStartTile.col, this.dragEndTile.col);

        // Number tiles from 1..N and finalize color to green
        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                this.gridManager.updateTileSelection(r, c, true, 0x8EC3FF); // blue on completion
            }
        }
        this.gridManager.completeSelection();

        // Enable check button when tiles are selected
        if (this.checkButton) {
            ButtonHelper.enableButton(this.checkButton);
        }

        // Call external callback if set (for instruction mode)
        if (this.onSelectionCompleteCallback) {
            this.onSelectionCompleteCallback();
        }

        // Reset drag refs
        this.dragStartTile = null;
        this.dragEndTile = null;
    }

    /**
     * Update selection between two points
     */
    private updateSelectionBetweenPoints(): void {
        if (!this.dragStartTile || !this.dragEndTile) return;

        const startRow = Math.min(this.dragStartTile.row, this.dragEndTile.row);
        const endRow = Math.max(this.dragStartTile.row, this.dragEndTile.row);
        const startCol = Math.min(this.dragStartTile.col, this.dragEndTile.col);
        const endCol = Math.max(this.dragStartTile.col, this.dragEndTile.col);

        this.gridManager.clearAllSelections();

        // Select tiles in the rectangle (yellow while dragging)
        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                this.updateTileSelection(row, col, true, 0xFFCC5F);
            }
        }
    }

    /**
     * Update individual tile selection
     */
    private updateTileSelection(row: number, col: number, selected: boolean, colorWhenSelected: number = 0x4a90e2): void {
        this.gridManager.updateTileSelection(row, col, selected, colorWhenSelected);
    }

    /**
     * Clear all selections.
     */
    private clearAllSelections(): void {
        this.gridManager.clearAllSelections();
    }

    /**
     * Calculate built caption from selected tiles
     */
    private calculateBuiltCaption(): string {
        const gridDimensions = this.gridManager.getGridDimensions();
        const gridTiles = this.gridManager.getGridTiles();
        
        let minRow = gridDimensions.rows;
        let maxRow = -1;
        let minCol = gridDimensions.cols;
        let maxCol = -1;
        let hasSelection = false;

        // Find the bounds of selected tiles
        for (let row = 0; row < gridDimensions.rows; row++) {
            for (let col = 0; col < gridDimensions.cols; col++) {
                if (gridTiles[row][col].isSelected) {
                    hasSelection = true;
                    minRow = Math.min(minRow, row);
                    maxRow = Math.max(maxRow, row);
                    minCol = Math.min(minCol, col);
                    maxCol = Math.max(maxCol, col);
                }
            }
        }

        if (!hasSelection) {
            return "";
        }

        const numRows = maxRow - minRow + 1;
        const numCols = maxCol - minCol + 1;
        return i18n.t('game.youHaveBuilt', { rows: numRows, cols: numCols });
    }

    /**
     * Clear selection button handler
     */
    private clearSelection(): void {
        this.clearAllSelections();
        this.clearKeyboardSelectionState();
        
        // Disable check button when selection is cleared
        if (this.checkButton) {
            ButtonHelper.disableButton(this.checkButton);
        }
    }

    /**
     * Get number of selected tiles
     */
    private getSelectedTileCount(): number {
        return this.gridManager.getSelectedTileCount();
    }

    /**
     * Check if selected tiles form a rectangle with the expected dimensions
     */
    private checkRectangleDimensions(expectedRows: number, expectedCols: number, expectedTotal: number): boolean {
        const gridDimensions = this.gridManager.getGridDimensions();
        const gridTiles = this.gridManager.getGridTiles();
        
        // First check if the total number of selected tiles matches
        const selectedCount = this.getSelectedTileCount();
        // Special case: if expectedTotal is 0 (multiply by zero), accept empty selection
        if (expectedTotal === 0) {
            return selectedCount === 0;
        }
        if (selectedCount !== expectedTotal) {
            return false;
        }
        
        // Find the bounds of selected tiles
        let minRow = gridDimensions.rows;
        let maxRow = -1;
        let minCol = gridDimensions.cols;
        let maxCol = -1;
        let hasSelection = false;

        for (let row = 0; row < gridDimensions.rows; row++) {
            for (let col = 0; col < gridDimensions.cols; col++) {
                if (gridTiles[row][col].isSelected) {
                    hasSelection = true;
                    minRow = Math.min(minRow, row);
                    maxRow = Math.max(maxRow, row);
                    minCol = Math.min(minCol, col);
                    maxCol = Math.max(maxCol, col);
                }
            }
        }

        if (!hasSelection) {
            return false;
        }

        // Calculate the actual dimensions of the selected rectangle
        const actualRows = maxRow - minRow + 1;
        const actualCols = maxCol - minCol + 1;

        // Check if the dimensions match the expected dimensions
        // For 3×4=12, we expect 3 rows × 4 columns
        if (actualRows === expectedRows && actualCols === expectedCols) {
            return true;
        }
        
        // Also check the reverse (4×3=12 should also be correct)
        if (actualRows === expectedCols && actualCols === expectedRows) {
            return true;
        }

        return false;
    }

    private resetGame(): void {
        this.scoreHelper.reset();
        this.clearAllSelections();
        this.clearKeyboardSelectionState();
        
        // Reset focus to top-left but don't show indicator unless grid is focused
        this.currentFocusedTile = { row: 0, col: 0 };
        if (!this.isInstructionMode && this.isGridContainerFocused) {
            this.createFocusIndicator();
        }
        
        // Reset to 5×10 grid size
        this.updateGridForQuestion();
        // Disable check button on reset
        if (this.checkButton) {
            ButtonHelper.disableButton(this.checkButton);
        }
    }

    public destroy(): void {
        // Cleanup keyboard navigation when the game is destroyed
        this.cleanupKeyboardNavigation();
    }

    private extractQuestion(question: string): QuestionType {
        // Supported operators
        const operators = ['×'];
        // Find the operator in the question string
        let operator = operators.find((op) => question.includes(op));
        if (!operator) throw new Error('Operator not found in question string');
        // Split on '=' to separate question from answer
        const [left, answer] = question.split('=').map((s) => s.trim());
        if (!left || answer === undefined) throw new Error('Invalid question format');
        // Split left part on operator
        const [operand1, operand2] = left.split(operator).map((s) => s.trim());
        if (operand1 === undefined || operand2 === undefined) throw new Error('Invalid operands');
        return {
            operand1: operand1.trim(),
            operand2: operand2.trim(),
            operator: operator.trim(),
            answer: answer.trim(),
        };
    }

    /**
     * Load the next question from the question bank
     */
    private loadNextQuestion(response?: StudentResponse): void {
        const filter = (fm: FactMasteryItem) => {
            const questionText = fm.mathFact["question text"];
            
            // Check if it's a multiplication question with operands
            const multiplyMatch = questionText.match(/(\d+)\s*×\s*(\d+)/) || questionText.match(/(\d+)\s*\*\s*(\d+)/);
            
            if (multiplyMatch) {
                const operand1 = parseInt(multiplyMatch[1]);
                const operand2 = parseInt(multiplyMatch[2]);
                
                // Return false if any operand is 0 (this excludes the question)
                if (operand1 === 0 || operand2 === 0) {
                    return false;
                }
                
                if (this.topic === 'grade3_topic3') {
                    if (operand1 > 5 || operand2 > 10) {
                        return false;
                    }
                }
            }

            const parsed = parseMathFact(questionText);
            if (this.topic === 'grade3_topic2' && parsed) {
                const allowedOperands = [0, 1, 2, 5, 10];
                return allowedOperands.includes(parsed?.operand1) && allowedOperands.includes(parsed?.operand2);
            }
            
            return true; // Include all other questions
        };
        this.multiverseQuestion = response 
        ? this.questionSelector!.getNextQuestion(response, filter) 
        : this.questionSelector!.getNextQuestion(undefined, filter);
        
        if (!this.multiverseQuestion || this.scoreHelper.getTotalQuestions() >= this.totalQuestions) {
            this.gameOver();
            return;
        }
        this.question = this.extractQuestion(this.multiverseQuestion["question text"]);

        // Clear previous selections
        this.clearAllSelections();

        // Start timer for this question
        this.questionStartTime = Date.now();

        // Disable check button for new question
        if (this.checkButton) {
            ButtonHelper.disableButton(this.checkButton);
        }

        // Load the question content
        this.loadQuestionContent();
        this.instructionText?.setText(i18n.t('game.drawRectangle'));
        this.instructionText?.setColor("#FFFFFF");
    }

    /**
     * Load and display the question content
     */
    private loadQuestionContent(): void {
        if (!this.question) return;

        // Always use 5×10 grid regardless of question
        this.updateGridForQuestion();

        // Re-setup grid event handlers after grid is recreated
        this.setupGridEventHandlers();
        
        // Re-enable grid interactions for new question
        this.isInteractionEnabled = true;
        this.gridManager.enableGridInteractions();

        // Re-create keyboard navigation after grid is recreated
        this.currentFocusedTile = { row: 0, col: 0 };
        // Only show focus indicator if grid container is focused
        if (this.isGridContainerFocused) {
            this.createFocusIndicator();
        }

        // Compose the question text from operands
        const questionText = this.question.operand1 + " × " + this.question.operand2 + " = ?";
        this.questionText?.setText(questionText);
        this.questionText?.setColor("#FFFFFF");

        const questionTextOverlay = this.questionText?.getData('overlay');
        if (questionTextOverlay) {
            this.scene.time.delayedCall(2000, () => {
                questionTextOverlay.updateContent('');
                // ensure the announcement occurs even if question is same as previous
                this.scene.time.delayedCall(100, () => {
                    questionTextOverlay.updateContent(questionText);
                })
            })
        }

        // Ensure check button is disabled for new question
        if (this.checkButton) {
            ButtonHelper.disableButton(this.checkButton);
        }
    }

    /**
     * Check if the selected answer is correct
     */
    private checkAnswer(): void {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        // Stop timer and calculate completion time
        this.questionCompletionTime = Date.now() - this.questionStartTime;
        
        // Get the expected dimensions from the question
        const expectedRows = parseInt(this.question?.operand1 || "0");
        const expectedCols = parseInt(this.question?.operand2 || "0");
        const expectedTotal = expectedRows * expectedCols;
        
        // Check if the selected tiles form a rectangle with the correct dimensions
        const isCorrect = this.checkRectangleDimensions(expectedRows, expectedCols, expectedTotal);

        const questionText = this.multiverseQuestion?.["question text"] || '';
        const [questionPart] = questionText.split('=');
        const formattedQuestionText = `${questionPart}=?`;

        // Get all selected tiles for animation
        const selectedTiles: GridTile[] = [];
        const gridDimensions = this.gridManager.getGridDimensions();
        const gridTiles = this.gridManager.getGridTiles();
        
        for (let row = 0; row < gridDimensions.rows; row++) {
            for (let col = 0; col < gridDimensions.cols; col++) {
                const tile = gridTiles[row][col];
                if (tile.isSelected) {
                    selectedTiles.push(tile);
                }
            }
        }

        // Update tile colors first
        if (isCorrect) {            
            // Update tile colors for correct answer
            this.updateSelectedTilesColors(0x103A00, 0x1CDF06);

            if (!this.isInstructionMode) {
                this.analyticsHelper?.createTrial({
                    questionMaxPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                    achievedPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                    questionText: formattedQuestionText,
                    isCorrect: true,
                    questionMechanic: 'default',
                    gameLevelInfo: 'game.multiverse.array_architects',
                    studentResponse: this.getSelectedTileCount().toString(),
                    studentResponseAccuracyPercentage: '100%',
                });
            }
            
            // Update score and progress
            this.scoreHelper.answerCorrectly();
            this.scoreCoins?.updateScoreDisplay(true);

            // Update progress bar
            const progress = this.scoreHelper.getTotalQuestions() / this.totalQuestions;
            this.progressBar?.drawProgressFill(progress, this.scoreHelper.getCurrentStreak());

            this.isInteractionEnabled = false;
            this.gridManager.disableGridInteractions();

            // Show success animation and animate tiles simultaneously
            this.showSuccessAnimation();
            this.animateSelectedTiles(selectedTiles, isCorrect);
            
            if (this.question) {
                this.questionText?.setText(this.question.operand1 + " × " + this.question.operand2 + " = " + this.question.answer);
                this.questionText?.setColor("#6BFF00");
            }
            this.instructionText?.setText(i18n.t('game.correctFeedback'));
            this.instructionText?.setColor("#6BFF00");
        } else {
            const incorrectCount = this.getSelectedTileCount();
            
            // Update tile colors for incorrect answer
            this.updateSelectedTilesColors(0xBD1111, 0xFF6F65);

            if (!this.isInstructionMode) {
                this.analyticsHelper?.createTrial({
                    questionMaxPoints: (this.scoreHelper.getCurrentMultiplier() || 1),
                    achievedPoints: 0,
                    questionText: formattedQuestionText,
                    isCorrect: false,
                    questionMechanic: 'default',
                    gameLevelInfo: 'game.multiverse.array_architects',
                    studentResponse: this.getSelectedTileCount().toString(),
                    studentResponseAccuracyPercentage: '0%',
                });
            }
            
            // Update score and progress
            this.scoreHelper.answerIncorrectly();
            this.scoreCoins?.updateScoreDisplay(false);

            // Update progress bar
            const progress = this.scoreHelper.getTotalQuestions() / this.totalQuestions;
            this.progressBar?.drawProgressFill(progress, this.scoreHelper.getCurrentStreak());
            
            // Show incorrect answer count in question
            if (this.question) {
                this.questionText?.setText(this.question.operand1 + " × " + this.question.operand2 + " = " + incorrectCount);
                this.questionText?.setColor("#FFFFFF");
            }
            this.instructionText?.setText(i18n.t('game.incorrectFeedback'));
            this.instructionText?.setColor("#FFFFFF");
            
            // Disable grid interactions during error feedback
            this.isInteractionEnabled = false;
            this.gridManager.disableGridInteractions();
            
            // Show error animation and animate tiles simultaneously
            this.showErrorAnimation(expectedRows, expectedCols);
            this.animateSelectedTiles(selectedTiles, isCorrect);
        }
    }

    /**
     * Update colors of all selected tiles (fill and border)
     */
    private updateSelectedTilesColors(fillColor: number, borderColor: number): void {
        const gridDimensions = this.gridManager.getGridDimensions();
        const gridTiles = this.gridManager.getGridTiles();
        
        for (let row = 0; row < gridDimensions.rows; row++) {
            for (let col = 0; col < gridDimensions.cols; col++) {
                const tile = gridTiles[row][col];
                if (tile.isSelected) {
                    // Update fill color
                    this.gridManager.redrawTileFill(tile, fillColor);
                    tile.numberText?.style.setColor("#ffffff");
                    
                    // Update border color
                    if (tile.borderGraphics) {
                        tile.borderGraphics.clear();
                        tile.borderGraphics.lineStyle(this.scene.getScaledValue(3), borderColor, 1);
                        tile.borderGraphics.strokeRoundedRect(
                            -tile.scaledWidth / 2,
                            -tile.scaledHeight / 2,
                            tile.scaledWidth,
                            tile.scaledHeight,
                            tile.scaledRadius
                        );
                    }
                }
            }
        }
    }

    /**
     * Animate selected tiles with enlargement and shake effect
     */
    private animateSelectedTiles(tiles: GridTile[], isCorrect: boolean): void {
        tiles.forEach((tile) => {
            // Store original scale
            const originalScaleX = tile.fillGraphics.scaleX;
            const originalScaleY = tile.fillGraphics.scaleY;
            if (isCorrect) {
                // Enlarge animation
                this.scene.tweens.add({
                    targets: [tile.fillGraphics, tile.borderGraphics],
                    scaleX: originalScaleX * 1.1,
                    scaleY: originalScaleY * 1.1,
                    duration: 250,
                    ease: 'Power2',
                    onComplete: () => {
                        // Shake animation after enlargement (keep enlarged size)
                        this.scene.tweens.add({
                            targets: [tile.fillGraphics, tile.borderGraphics],
                            scaleX: originalScaleX,
                            scaleY: originalScaleY,
                            duration: 200,
                            ease: 'Power2',
                        });
                    }
                });
            } else {
                this.scene.tweens.add({
                    targets: [tile.fillGraphics, tile.borderGraphics, tile.numberText],
                    x: tile.fillGraphics.x + 5,
                    duration: 50,
                    yoyo: true,
                    repeat: 3,
                    ease: 'Sine.easeInOut',
                });
            }
        });
    }

    /**
     * Show success animation
     */
    private showSuccessAnimation(): void {
        const width = this.scene.display.width;
        const height = 122;
        const successContainer = this.scene.add.container(
            this.scene.getScaledValue(this.scene.display.width / 2),
            this.scene.getScaledValue(this.scene.display.height + height / 2)
        );

        successContainer.setDepth(100);

        // Create background rectangle
        const bgRect = this.scene.addRectangle(0, 0, width, height, 0x007E11);
        successContainer.add(bgRect);

        const bgRectTop = this.scene.addRectangle(0, -height / 2, width, 7, 0x24E13E).setOrigin(0.5, 0);
        successContainer.add(bgRectTop);

        // Create icon and text
        const icon = this.scene.addImage(0, 0, 'correct_icon').setOrigin(0.5);
        successContainer.add(icon);

        // Add "Well Done!" text
        const successText = this.scene.addText(0, 0, i18n.t('common.wellDone'), {
            font: "700 36px Exo",
            color: "#FFFFFF",
        }).setOrigin(0.5);
        successContainer.add(successText);
        announceToScreenReader(i18n.t('common.wellDone'));

        // Position icon and text side by side
        const iconWidth = icon.displayWidth;
        const textWidth = successText.displayWidth;
        const spacing = this.scene.getScaledValue(20); // Space between icon and text
        const totalWidth = iconWidth + spacing + textWidth;

        icon.setPosition(-totalWidth / 2 + iconWidth / 2, 0);
        successText.setPosition(-totalWidth / 2 + iconWidth + spacing + textWidth / 2, 0);

        // Play success sound
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
                        ease: "Power2",
                        onComplete: () => {
                            successContainer.destroy();
                            this.isProcessing = false;
                            this.loadNextQuestion(
                                this.questionSelector!.createStudentResponse(
                                    this.multiverseQuestion!,
                                    this.questionCompletionTime,
                                    true
                                )
                            );
                        }
                    });
                });
            }
        });
    }

    /**
     * Show error animation
     */
    private showErrorAnimation(expectedRows: number, expectedCols: number): void {
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

        // Calculate built caption from selected tiles
        const builtCaption = this.calculateBuiltCaption();
        const errorText = this.scene.addText(0, 0, builtCaption, {
            font: "700 36px Exo",
            color: "#FFFFFF",
        }).setOrigin(0.5);
        errorContainer.add(errorText);
        announceToScreenReader(builtCaption);

        // Position icon and text side by side
        const iconWidth = icon.displayWidth;
        const textWidth = errorText.displayWidth;
        const spacing = this.scene.getScaledValue(20); // Space between icon and text
        const totalWidth = iconWidth + spacing + textWidth;

        icon.setPosition(-totalWidth / 2 + iconWidth / 2, 0);
        errorText.setPosition(-totalWidth / 2 + iconWidth + spacing + textWidth / 2, 0);

        // Play error sound
        this.scene.audioManager.playSoundEffect('negative-sfx');

        // Simple slide up animation
        this.scene.tweens.add({
            targets: errorContainer,
            y: this.scene.getScaledValue(this.scene.display.height - height / 2),
            duration: 500,
            ease: "Power2",
            onComplete: () => {
                new ImageOverlay(this.scene, icon, { label: i18n.t('common.incorrect') + ' ' + i18n.t('common.icon') });
                // Wait for a moment and then slide down
                this.scene.time.delayedCall(1000, () => {
                    this.scene.tweens.add({
                        targets: errorContainer,
                        y: this.scene.getScaledValue(this.scene.display.height + height / 2),
                        duration: 500,
                        ease: "Power2",
                        onComplete: () => {
                            errorContainer.destroy();
                            this.isProcessing = false;
                            // Load next question after delay
                            if (this.checkButton) {
                                ButtonHelper.disableButton(this.checkButton);
                            }
                            if (this.resetButton) {
                                ButtonHelper.disableButton(this.resetButton);
                            }
                            
                            // Show correct answer before continue button
                            this.showCorrectAnswer(expectedRows, expectedCols);
                            
                            continueGameAfterWrongAnswer(this.scene, () => {
                                if (this.checkButton) {
                                    ButtonHelper.enableButton(this.checkButton);
                                }
                                if (this.resetButton) {
                                    ButtonHelper.enableButton(this.resetButton);
                                }
                                this.loadNextQuestion(
                                    this.questionSelector!.createStudentResponse(
                                        this.multiverseQuestion!,
                                        this.questionCompletionTime,
                                        false
                                    )
                                );
                            })
                        }
                    });
                });
            }
        });
    }

    /**
     * Show the correct answer with green tiles
     */
    private showCorrectAnswer(expectedRows: number, expectedCols: number): void {
        // Disable grid interactions while showing correct answer
        this.isInteractionEnabled = false;
        this.gridManager.disableGridInteractions();
        
        // Clear all selections first (this will reset borders and fill colors)
        this.clearAllSelections();
        
        // Add a small delay to ensure red tiles are cleared before showing green ones
        this.scene.time.delayedCall(100, () => {
            // Select the correct tiles (starting from top-left)
            for (let row = 0; row < expectedRows; row++) {
                for (let col = 0; col < expectedCols; col++) {
                    this.gridManager.updateTileSelection(row, col, true, 0x007E11); // Green color for correct
                }
            }
            
            // Complete the selection (add numbers)
            this.gridManager.completeSelection();
            
            // Update tile colors to green with green border
            this.updateSelectedTilesColors(0x103A00, 0x1CDF06);
            
            // Update question text to show correct answer in green
            if (this.question) {
                this.questionText?.setText(this.question.operand1 + " × " + this.question.operand2 + " = " + this.question.answer);
                this.questionText?.setColor("#6BFF00"); // Green color
            }
        });
    }

    /**
     * Handle game over
     */
    private gameOver(): void {
        const finalScore = this.scoreHelper.endGame();
        console.log('Game Over! Final score:', finalScore);
        
        // Navigate to scoreboard
        this.scene.scene.start('ScoreboardScene', {
            score: finalScore,
            scoreData: {
                correctAnswers: this.scoreHelper.getCorrectAnswers(),
                totalQuestions: this.scoreHelper.getTotalQuestions()
            }
        });
    }

    /**
     * Create pause button
     */
    private createPauseButton(): void {
        ButtonHelper.createIconButton({
            scene: this.scene,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.PAUSE_ICON.KEY,
            label: i18n.t("common.pause"),
            x: this.scene.display.width - 54,
            y: 75,
            onClick: () => {
                this.scene.scene.pause();
                this.scene.scene.launch("PauseScene", { parentScene: "GameScene" });
                this.scene.audioManager.pauseAll();
                this.scene.scene.bringToTop("PauseScene");
            },
            raisedOffset: 3.5,
        }).setDepth(2).setName('pause_btn');
    }

    /**
     * Create mute button
     */
    private createMuteButton(): void {
        this.muteButton = new MuteButton(
            this.scene,
            this.scene.display.width - 54,
            155
        );
        this.scene.events.on('update', () => {
            this.muteButton?.updateIcon(this.scene);
        });
    }

    /**
     * Create volume slider button
     */
    private createVolumeSliderButton(): void {
        this.volumeSlider = new VolumeSlider(this.scene);
        this.volumeSlider.create(this.scene.display.width - 220, 220, 'blue', i18n.t('common.volume'));
        ButtonHelper.createIconButton({
            scene: this.scene,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.SETTINGS_ICON.KEY,
            label: i18n.t("common.volume"),
            x: this.scene.display.width - 54,
            y: 235,
            onClick: () => {
                this.volumeSlider?.toggleControl();
            },
            raisedOffset: 3.5,
        }).setDepth(2);
    }

    /**
     * Create help button
     */
    private createHelpButton(): void {
        ButtonHelper.createIconButton({
            scene: this.scene,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.HELP_ICON.KEY,
            label: i18n.t("common.help"),
            x: this.scene.display.width - 54,
            y: 310,
            onClick: () => {
                this.scene.audioManager.pauseAll();
                this.scene.scene.pause();
                this.scene.scene.launch("InstructionsScene", { parentScene: "GameScene" });
                this.scene.scene.bringToTop("InstructionsScene");
            },
            raisedOffset: 3.5,
        }).setDepth(2);
    }

    // Public methods for instruction mode
    public getGridManager(): GridManager {
        return this.gridManager;
    }

    public getQuestionText(): Phaser.GameObjects.Text | undefined {
        return this.questionText;
    }

    public getCurrentQuestion(): Question | null {
        return this.question;
    }

    public setSelectionCompleteCallback(callback: () => void): void {
        this.onSelectionCompleteCallback = callback;
    }

    public loadTutorialQuestion(): void {
        // For tutorial, create a simple 3x4 question
        this.question = {
            operand1: "3",
            operand2: "4",
            operator: "×",
            answer: "12",
            markers: "0,1,2,3,4,5,6,7,8,9,10,11,12",
            visibleMarkers: "0,1,2,3,4,5,6,7,8,9,10,11,12"
        };

        // Clear previous selections
        this.clearAllSelections();

        // Load the question content
        this.loadQuestionContent();
    }
}
