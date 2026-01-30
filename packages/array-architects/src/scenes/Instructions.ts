import { BaseScene, ButtonHelper, i18n, VolumeSlider, setSceneBackground, TextOverlay, TweenAnimations, focusToGameContainer, announceToScreenReader } from "@k8-games/sdk";
import { ASSETS_PATHS, BUTTONS } from "../config/common";
import { ArrayArchitects } from "../ArrayArchitects";
import { MuteButton } from "../utils/MuteButton";

export class InstructionsScene extends BaseScene {
    private arrayArchitects: ArrayArchitects;
    private parentScene: string = 'SplashScene';
    private isSkipped: boolean = false;

    // Tutorial state
    private currentStep: number = 1;
    private isDragging: boolean = false;
    private dragStartTile: { row: number; col: number } | null = null;
    private dragEndTile: { row: number; col: number } | null = null;

    // UI elements
    private volumeSlider?: VolumeSlider;
    private hand?: Phaser.GameObjects.Image;
    private playButton?: Phaser.GameObjects.Container;
    private howToPlayText?: Phaser.GameObjects.Text;
    private questionText!: Phaser.GameObjects.Text;

    // Tutorial buttons
    private checkButton?: Phaser.GameObjects.Container;

    // Announcement queue system
    private announcementQueue: string[] = [];
    private isAnnouncing: boolean = false;

    constructor() {
        super('InstructionsScene');
        this.arrayArchitects = new ArrayArchitects(this, true);
    }

    static _preload(scene: BaseScene) {
        const lang = i18n.getLanguage() || "en";
        ArrayArchitects._preload(scene);
        
        // Load hand assets
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/info_screen`);
        scene.load.image('hand', 'hand.png');
        scene.load.image('hand_click', 'hand_click.png');

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/info_screen`);
        scene.load.audio('step_1', `step_1_${lang}.mp3`);
        scene.load.audio('step_2', `step_2_${lang}.mp3`);
        scene.load.audio('step_3', `step_3_${lang}.mp3`);
        scene.load.audio('step_4', `step_4_${lang}.mp3`);

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/common`);
        scene.load.image('half_button_default', 'half_button_default.png');
        scene.load.image('half_button_hover', 'half_button_hover.png');
        scene.load.image('half_button_pressed', 'half_button_pressed.png');
    }

    init(data?: { reset?: boolean, parentScene?: string }) {
        if (data?.parentScene) {
            this.parentScene = data.parentScene;
        }
        this.arrayArchitects.init(data);
    }

    create() {
        setSceneBackground('bg');

        // Iframe label announcement support
        const inIframe = this.isInsideIframe();
        if (this.parentScene === 'GameScene') {
            if (inIframe) {
                window.parent.postMessage({
                    type: 'UPDATE_IFRAME_LABEL',
                    label: i18n.t('info.helpPage')
                }, '*');
            }
            focusToGameContainer();
            this.time.delayedCall(1000, () => {
                announceToScreenReader(i18n.t('info.helpPage'));
            });
        }

        this.addImage(this.display.width / 2, this.display.height / 2, 'bg');

        this.createHowToPlayBox();

        this.createControlButtons();
        
        // Create tutorial grid (3x4)
        this.createTutorialGrid();

        // Create UI elements
        this.createUI();

        // Load tutorial question first
        this.arrayArchitects.loadTutorialQuestion();

        // Set up keyboard navigation for accessibility (this includes the focusable grid container)
        this.arrayArchitects.setupKeyboardNavigation();

        // Set callback to handle check button enabling when selection is completed via keyboard
        this.arrayArchitects.setSelectionCompleteCallback(() => {
            this.checkSelectionAndUpdateButton();
        });

        // Create tutorial buttons
        this.createButtons();

        // Start the tutorial sequence
        this.time.delayedCall(1000, () => {
            this.playStep1();
        });
    }

    private setupGridEventHandlers(): void {
        // Set up grid event handlers
        this.arrayArchitects.getGridManager().setupGridEvents(
            (row, col) => this.onTilePointerDown(row, col),
            (row, col) => this.onTilePointerOver(row, col),
            () => this.onTilePointerUp()
        );

        // Global pointer up to catch releases outside tiles
        this.input.on('pointerup', () => {
            if (this.isDragging) {
                this.onSelectionComplete();
            }
        });
    }

    private createTutorialGrid(): void {
        // Create 3x4 grid for tutorial
        this.arrayArchitects.getGridManager().updateGridForDimensions(5, 5);
    }

    private createUI(): void {
        const gridDimensions = this.arrayArchitects.getGridManager().getTotalGridDimensions();
        
        // Create question text
        this.questionText = this.addText(
            this.display.width / 2 - gridDimensions.width / 2 + 200, 
            this.display.height / 2 - gridDimensions.height / 2 - 85, 
            "3 × 4 = ?", 
            {
                font: "700 52px Exo",
                color: "#FFFFFF",
            }
        ).setOrigin(0.5);

        new TextOverlay(this, this.questionText, { label: '3 × 4 = ?' });

        // Create instruction text
        const instructionText = this.addText(
            this.display.width / 2 - gridDimensions.width / 2, 
            this.display.height / 2 - gridDimensions.height / 2 - 30, 
            i18n.t('game.drawRectangle'), 
            {
                font: "500 24px Exo",
                color: "#FFFFFF",
            }
        );

        new TextOverlay(this, instructionText, { label: i18n.t('game.drawRectangle') });

        this.time.delayedCall(2000, () => {
            this.queueAnnouncement('3 × 4 = ?');
            this.queueAnnouncement(i18n.t('game.drawRectangle'));
        })
    }

    private createHowToPlayBox(): void {
        // Create "How to Play" title
        this.howToPlayText = this.addText(
            this.display.width / 2 + 15,
            35,
            i18n.t('info.howToPlay'),
            {
                font: "700 32px Exo",
                color: '#FFFFFF',
            }
        ).setOrigin(0.5);

        new TextOverlay(this, this.howToPlayText, { label: i18n.t('info.howToPlay'), tag: 'h1', role: 'heading' });
    }

    private createControlButtons(): void {
        // skip button
        ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: 'half_button_default',
                hover: 'half_button_hover',
                pressed: 'half_button_pressed',
            },
            text: i18n.t('info.skip'),
            label: i18n.t('info.skip'),
            textStyle: {
                font: "700 32px Exo",
                color: '#FFFFFF',
            },
            imageScale: 1,
            x: this.display.width - 78,
            y: 80,
            onClick: () => {
                this.audioManager.stopAllSoundEffects();
                this.startGameScene();
            }
        });

        // Mute button
        new MuteButton(
            this,
            this.display.width - 54,
            175
        );

        // Volume slider
        this.volumeSlider = new VolumeSlider(this);
        this.volumeSlider.create(this.display.width - 220, 256, 'blue', i18n.t('common.volume'));
        ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.SETTINGS_ICON.KEY,
            label: i18n.t("common.volume"),
            x: this.display.width - 54,
            y: 250,
            raisedOffset: 3.5,
            onClick: () => {
                this.volumeSlider?.toggleControl();
            },
        }).setDepth(2);
    }

    private createButtons(): void {
        // Reset button
        ButtonHelper.createButton({
            scene: this,
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
            y: this.display.height - 120,
            onClick: () => this.clearAllSelections()
        });

        // Check button (initially disabled)
        this.checkButton = ButtonHelper.createButton({
            scene: this,
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
            x: this.display.width - 100,
            y: this.display.height - 120,
            onClick: () => this.onCheckButtonClick()
        });
        
        // Initially disable the check button
        if (this.checkButton) {
            ButtonHelper.disableButton(this.checkButton);
        }
    }

    private createPlayButton(): void {
        // Play/Back button
        if (this.playButton) {
            this.playButton.destroy();
            this.playButton = undefined;
        }

        this.playButton = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY,
            },
            text: this.parentScene === 'SplashScene' ? i18n.t("info.play") : i18n.t("info.back"),
            label: this.parentScene === 'SplashScene' ? i18n.t("info.play") : i18n.t("info.back"),
            textStyle: {
                font: "700 32px Exo",
                color: "#ffffff",
            },
            imageScale: 0.8,
            raisedOffset: 3.5,
            x: this.display.width / 2,
            y: this.display.height - 55,
            onClick: () => this.startGameScene(),
        });
        this.playButton.setDepth(5);
    }

    // ===== TUTORIAL STEPS =====
    
    // STEP 1: Highlight the question "3 × 4 = ?" to draw attention
    private playStep1(): void {
        if (this.isSkipped) return;

        this.currentStep = 1;
        const step1 = this.audioManager.playSoundEffect('step_1');

        TweenAnimations.pulse(this, this.questionText, 1.1, 1500, 1);

        step1?.on('complete', () => {
            this.playStep2();
        });
    }

    private playStep2(): void {
        if (this.isSkipped) return;

        this.currentStep = 2;

    // Enable grid interactivity now that the tutorial requires user input
    this.setupGridEventHandlers();

    // STEP 2: Hand animation - Drag horizontally (4 columns) then vertically (3 rows)
    this.createHandDragAnimation();
    }

    private createHandDragAnimation(): void {
        this.audioManager.playSoundEffect('step_2');
        // Create hand image for dragging animation
        this.hand = this.addImage(0, 0, 'hand').setOrigin(0).setScale(0.13);
        this.hand.setDepth(10);
        
        const gridStartPos = this.arrayArchitects.getGridManager().getGridStartPosition();
        
        // Calculate positions for 3x4 selection (top-left area)
        const tileSize = 66; // Tile size from GridManager
        const tileSpacing = 10; // Tile spacing from GridManager
        
        // Start position (top-left of grid)
        const startX = gridStartPos.x + this.getScaledValue(175);
        const startY = gridStartPos.y + this.getScaledValue(185);
        this.hand.setPosition(startX, startY);
        
        // End position after horizontal drag (4 columns)
        const horizontalEndX = startX + this.getScaledValue(4 * tileSize + 2 * tileSpacing);
        
        // End position after vertical drag (3 rows)
        const verticalEndY = startY + this.getScaledValue(2 * (tileSize + tileSpacing));
        
        // STEP 2A: Animate horizontal drag (4 columns)
        this.tweens.add({
            targets: this.hand,
            x: horizontalEndX,
            duration: 1500,
            ease: "Sine.easeInOut",
            onUpdate: () => {
                // Update selection during horizontal drag
                this.updateSelectionFromHandPositionHorizontal(this.hand!.x, startY);
            },
            onComplete: () => {
                // STEP 2B: Animate vertical drag (3 rows)
                this.tweens.add({
                    targets: this.hand,
                    y: verticalEndY,
                    duration: 1000,
                    ease: "Sine.easeInOut",
                    onUpdate: () => {
                        // Update selection during vertical drag
                        this.updateSelectionFromHandPositionVertical(horizontalEndX, this.hand!.y);
                    },
                    onComplete: () => {
                        // STEP 2C: Complete the selection and highlight tiles
                        this.completeTutorialSelection();
                        this.hand?.destroy();
                        this.hand = undefined;
                        
                        // STEP 2D: Reset selection and wait for user input
                        this.time.delayedCall(1000, () => {
                            this.clearAllSelections();
                            this.disableCheckButton();
                        });
                    }
                });
            }
        });
    }

    private playStep3(): void {
        if (this.isSkipped) return;

        this.currentStep = 3;

        this.audioManager.stopAllSoundEffects();

        if (this.hand) {
            // Clear all tweens on hand
            this.tweens.killTweensOf(this.hand);
            // Clear previous hand image
            this.hand.destroy();
            this.hand = undefined;
        }

        // STEP 3: Hand animation above check button (only if button is enabled)
        this.createCheckButtonHandAnimation();
    }

    private createCheckButtonHandAnimation(): void {
        // Check if the check button is enabled before showing hand animation
        const selectedCount = this.arrayArchitects.getGridManager().getSelectedTileCount();
        const expectedResult = 3 * 4; // 3x4 = 12

        this.audioManager.playSoundEffect('step_3');
        if (selectedCount !== expectedResult) {
            // If selection is incorrect, wait and try again
            this.time.delayedCall(1000, () => {
                this.createCheckButtonHandAnimation();
            });
            return;
        }

        // Create hand image for check button click
        this.hand = this.addImage(0, 0, 'hand').setOrigin(0).setScale(0.13);
        this.hand.setDepth(10);
        
        // Position hand near check button
        const checkButtonX = this.getScaledValue(this.display.width - 100);
        const checkButtonY = this.getScaledValue(this.display.height - 120);
        this.hand.setPosition(checkButtonX - 50, checkButtonY - 50);
        
        // STEP 3A: Animate hand moving to and clicking check button
        this.tweens.chain({
            targets: this.hand,
            tweens: [
                {
                    x: checkButtonX,
                    y: checkButtonY,
                    duration: 1000,
                    ease: "Sine.easeInOut",
                },
                {
                    scaleX: 0.15,
                    scaleY: 0.15,
                    duration: 200,
                    onComplete: () => {
                        this.hand?.setTexture('hand_click');
                    }
                },
                {
                    scaleX: 0.13,
                    scaleY: 0.13,
                    duration: 200,
                    onComplete: () => {
                        this.hand?.setTexture('hand');
                    }
                }
            ],
            onComplete: () => {
                this.hand?.destroy();
                this.hand = undefined;
            }
        });
    }

    // STEP 4: Hand animation above play button to start the game
    private playStep4(): void {
        if (this.isSkipped) return;

        // Stop all sound effects
        this.audioManager.stopAllSoundEffects();

        this.currentStep = 4;
        const step4 = this.audioManager.playSoundEffect('step_4');

        if (this.hand) {
            // Clear all tweens on hand
            this.tweens.killTweensOf(this.hand);
            // Clear previous hand image
            this.hand.destroy();
            this.hand = undefined;
        }

        // Create hand image for play button click
        this.hand = this.addImage(0, 0, 'hand').setOrigin(0).setScale(0.13);
        this.hand.setDepth(10);
        
        // Position hand near play button
        const playButtonX = this.getScaledValue(this.display.width / 2);
        const playButtonY = this.getScaledValue(this.display.height - 40);
        this.hand.setPosition(playButtonX - 50, playButtonY - 50);
        
        // Animate hand moving to and clicking play button
        this.tweens.chain({
            targets: this.hand,
            tweens: [
                {
                    x: playButtonX,
                    y: playButtonY,
                    duration: 1000,
                    ease: "Sine.easeInOut",
                },
                {
                    scaleX: 0.15,
                    scaleY: 0.15,
                    duration: 200,
                    onComplete: () => {
                        this.hand?.setTexture('hand_click');
                    }
                },
                {
                    scaleX: 0.13,
                    scaleY: 0.13,
                    duration: 200,
                    onComplete: () => {
                        this.hand?.setTexture('hand');
                    }
                }
            ],
            onComplete: () => {
                this.hand?.destroy();
                this.hand = undefined;
            }
        });

        step4?.on('complete', () => {
            if (this.playButton) {
            ButtonHelper.startBreathingAnimation(this.playButton, {
                scale: 1.1,
                    duration: 1000,
                    ease: 'Sine.easeInOut'
                });
            }
        });
    }

    // STEP 2A: Update selection during horizontal drag (4 columns)
    private updateSelectionFromHandPositionHorizontal(_handX: number, _handY: number): void {
        // Clear previous selection
        this.clearAllSelections();
        
        // Calculate selection based on hand position - select 1x4 area (top row, 4 columns)
        const startRow = 0;
        const startCol = 0;
        const endRow = 0; // 1 row (top row)
        const endCol = 3; // 4 columns (0, 1, 2, 3)
        
        // Select tiles in the horizontal rectangle
        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                this.arrayArchitects.getGridManager().updateTileSelection(row, col, true, 0xFFCC5F); // Yellow while dragging
            }
        }
    }

    // STEP 2B: Update selection during vertical drag (3 rows)
    private updateSelectionFromHandPositionVertical(_handX: number, _handY: number): void {
        // Clear previous selection
        this.clearAllSelections();
        
        // Calculate selection based on hand position - select 3x4 area (top-left)
        const startRow = 0;
        const startCol = 0;
        const endRow = 2; // 3 rows (0, 1, 2)
        const endCol = 3; // 4 columns (0, 1, 2, 3)
        
        // Select tiles in the rectangle
        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                this.arrayArchitects.getGridManager().updateTileSelection(row, col, true, 0xFFCC5F); // Yellow while dragging
            }
        }
    }

    private completeTutorialSelection(): void {
        // Finalize selection with blue color and numbering - select only 3x4 area (top-left)
        const startRow = 0;
        const startCol = 0;
        const endRow = 2; // 3 rows (0, 1, 2)
        const endCol = 3; // 4 columns (0, 1, 2, 3)
        
        // Select only the 3x4 area
        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                this.arrayArchitects.getGridManager().updateTileSelection(row, col, true, 0x8EC3FF); // Blue on completion
            }
        }
        this.arrayArchitects.getGridManager().completeSelection();
    }

    private clearAllSelections(): void {
        this.arrayArchitects.getGridManager().clearAllSelections();
    }

    private onCheckButtonClick(): void {
        // Simulate check button functionality for tutorial
        const selectedCount = this.arrayArchitects.getGridManager().getSelectedTileCount();
        const expectedResult = 3 * 4; // 3x4 = 12
        
        if (selectedCount === expectedResult) {
            this.enableCheckButton();
            this.createPlayButton();
            this.playStep4();
        }
    }

    // ===== DRAG AND DROP HANDLERS =====
    // These handlers allow user interaction during STEP 2 (drag and drop tutorial)
    
    private onTilePointerDown(row: number, col: number): void {
        if (this.currentStep !== 2) return; // Only allow interaction during step 2
        
        this.clearAllSelections();
        this.isDragging = true;
        this.dragStartTile = { row, col };
        this.dragEndTile = { row, col };
        this.updateTileSelection(row, col, true, 0xFFCC5F);
    }

    private onTilePointerOver(row: number, col: number): void {
        if (this.isDragging && this.dragStartTile && this.currentStep === 2) {
            this.dragEndTile = { row, col };
            this.updateSelectionBetweenPoints();
        }
    }

    private onTilePointerUp(): void {
        if (!this.isDragging) return;
        this.onSelectionComplete();
    }

    private updateSelectionBetweenPoints(): void {
        if (!this.dragStartTile || !this.dragEndTile) return;

        const startRow = Math.min(this.dragStartTile.row, this.dragEndTile.row);
        const endRow = Math.max(this.dragStartTile.row, this.dragEndTile.row);
        const startCol = Math.min(this.dragStartTile.col, this.dragEndTile.col);
        const endCol = Math.max(this.dragStartTile.col, this.dragEndTile.col);

        this.arrayArchitects.getGridManager().clearAllSelections();

        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                this.arrayArchitects.getGridManager().updateTileSelection(row, col, true, 0xFFCC5F);
            }
        }
    }

    private onSelectionComplete(): void {
        this.isDragging = false;

        if (!this.dragStartTile || !this.dragEndTile) return;

        const startRow = Math.min(this.dragStartTile.row, this.dragEndTile.row);
        const endRow = Math.max(this.dragStartTile.row, this.dragEndTile.row);
        const startCol = Math.min(this.dragStartTile.col, this.dragEndTile.col);
        const endCol = Math.max(this.dragStartTile.col, this.dragEndTile.col);

        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                this.arrayArchitects.getGridManager().updateTileSelection(r, c, true, 0x8EC3FF);
            }
        }
        this.arrayArchitects.getGridManager().completeSelection();

        // Check if selection is correct and update button state
        this.checkSelectionAndUpdateButton();
        this.dragStartTile = null;
        this.dragEndTile = null;
    }

    private updateTileSelection(row: number, col: number, selected: boolean, colorWhenSelected: number = 0x4a90e2): void {
        this.arrayArchitects.getGridManager().updateTileSelection(row, col, selected, colorWhenSelected);
    }

    // STEP 2D: Enable check button when correct number of tiles are selected
    private enableCheckButton(): void {
        if (this.checkButton) {
            ButtonHelper.enableButton(this.checkButton);
        }
    }

    // Disable check button initially and when incorrect selection
    private disableCheckButton(): void {
        if (this.checkButton) {
            ButtonHelper.disableButton(this.checkButton);
        }
    }

    // Check if selection is correct and update button state
    private checkSelectionAndUpdateButton(): void {
        const selectedCount = this.arrayArchitects.getGridManager().getSelectedTileCount();
        const expectedResult = 3 * 4; // 3x4 = 12
        
        if (selectedCount === expectedResult) {
            this.playStep3();
            this.enableCheckButton();
        }
    }

    private startGameScene(): void {
        // Iframe label reset support
        const inIframe = this.isInsideIframe();
        if (inIframe && this.parentScene === 'GameScene') {
            window.parent.postMessage({
                type: 'UPDATE_IFRAME_LABEL',
                label: 'Game'
            }, '*');
        }
        if (this.parentScene === 'SplashScene') {
            this.audioManager.stopAllSoundEffects();
            this.scene.stop('InstructionsScene');
            this.scene.start('GameScene');
        } else {
            this.scene.stop('InstructionsScene');
            this.scene.resume('GameScene');
            this.audioManager.resumeAll();
        }
    }
    // Helper to check if inside an iframe
    private isInsideIframe() {
        try {
            return window.self !== window.top;
        } catch (e) {
            // Cross-origin error means we're in an iframe
            return true;
        }
    }

    private queueAnnouncement(message: string) {
        this.announcementQueue.push(message);
        this.processAnnouncementQueue();
    }
    
    private processAnnouncementQueue() {
        if (this.isAnnouncing || this.announcementQueue.length === 0) {
            return;
        }
    
        this.isAnnouncing = true;
        const message = this.announcementQueue.shift()!;
    
        announceToScreenReader(message);
    
        // Estimate the duration of the announcement and wait before processing next
        const words = message.split(' ').length;
        const estimatedDuration = (words / 2.5) * 1000; // 2.5 words per second
        const delay = Math.max(estimatedDuration + 500, 1000); // Minimum 1 second
    
        this.time.delayedCall(delay, () => {
            this.isAnnouncing = false;
            this.processAnnouncementQueue();
        });
    }
}
