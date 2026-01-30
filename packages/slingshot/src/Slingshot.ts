import { BaseScene, setSceneBackground, ScoreHelper, ProgressBar, ScoreCoins, i18n, ButtonHelper, VolumeSlider, TweenAnimations, GameConfigManager, ImageOverlay } from "@k8-games/sdk";
import { ASSETS_PATHS, BUTTONS, ProjectileState, QuestionType, TargetData, MULTIVERSE_TOPICS } from "./config/common";
import { MuteButton } from "./utils/MuteButton";
import { FactMasteryItem, MathFact, MultiverseQuestionSelector, StudentResponse, topicToTagsMapping, withinFilter, getBonusMultiverseTagsByMode, g5_g6Filter } from "@k8-games/sdk/multiverse";
import { continueGameAfterWrongAnswer } from "./utils/helper";

export class Slingshot {
    private scene: BaseScene;
    private isInstructionMode: boolean = false;
    public isSkipped: boolean = false;
    private topic: string = '';
    private mode: string | null = null;
    
    // Question bank components
    private questionSelector?: MultiverseQuestionSelector;
    private scoreHelper: ScoreHelper;
    private progressBar?: ProgressBar;
    private scoreCoins?: ScoreCoins;
    private totalQuestions: number = 10;
    private question: QuestionType | null = null;
    private questionBox!: Phaser.GameObjects.Image;

    // Question data
    private multiverseQuestion: MathFact | null = null;
    private questionStartTime: number = 0;

    // Slingshot components
    private slingshot?: Phaser.GameObjects.Container;
    private projectile?: Phaser.GameObjects.Image;
    private targets: Phaser.GameObjects.Container[] = [];
    private targetData: TargetData[] = [];
    private rubberBand?: Phaser.GameObjects.Graphics;
    private projectileState: ProjectileState = ProjectileState.IDLE;
    private currentDragPointScaled: { x: number; y: number } = { x: 0, y: 0 };
    
    // Projectile physics state
    private isLaunched: boolean = false;
    private velocityX: number = 0;
    private velocityY: number = 0;
    
    // Physics constants
    private readonly GRAVITY: number = 0.8; // Gravity force
    private readonly MAX_PULL_DISTANCE: number = 100; // Maximum pull distance in pixels
    private readonly PROJECTILE_RADIUS: number = 10;
    private readonly POWER_MULTIPLIER: number = 0.08; // Power scaling factor (reduced to require more pull)
    private readonly MAX_TRAJECTORY_DISTANCE: number = 200; // Maximum trajectory distance
    private readonly SLINGSHOT_START_Y: number = 220; // Starting Y position from bottom
    
    // UI elements
    private trajectoryLine?: Phaser.GameObjects.Graphics;
    private volumeSlider?: VolumeSlider;
    private muteButton?: MuteButton;
    
    // Input text elements
    private inputText?: Phaser.GameObjects.Text;
    private questionContainer?: Phaser.GameObjects.Container;

    // Interaction state
    private isInteractionEnabled: boolean = false;
    private isStep2AudioCompleted: boolean = false;
    
    // Accessibility properties
    private selectedDrumIndex: number = 0;
    private drumSelectionIndicator?: Phaser.GameObjects.Graphics;
    private accessibilityAnnouncer?: Phaser.GameObjects.DOMElement;
    private drumOverlays: Map<Phaser.GameObjects.Container, ImageOverlay> = new Map();
    
    // Enhanced animation properties
    private projectileRotation: number = 0;
    private projectileScale: number = 1;
    private projectileTrail: Phaser.GameObjects.Graphics[] = [];
    private trailTimer: number = 0;
    // Landing target for projectile
    private landingTargetX: number = 0;
    private landingTargetY: number = 0;
    private hasLandingTarget: boolean = false;


    constructor(scene: BaseScene, isInstructionMode: boolean = false) {
        this.scene = scene;
        this.isInstructionMode = isInstructionMode;
        this.scoreHelper = new ScoreHelper(2);
        
        const gameConfigManager = GameConfigManager.getInstance();
        this.topic = gameConfigManager.get('topic') || 'grade2_topic1';
        this.mode = gameConfigManager.get('mode') || null;

        // Initialize multiverse question selector
        if (!isInstructionMode && MULTIVERSE_TOPICS.includes(this.topic)) {
            let tagKeys = topicToTagsMapping[this.topic];
            if ((this.topic === 'g5_g6' || this.topic === 'g7_g8') && this.mode) {
                tagKeys = getBonusMultiverseTagsByMode(this.topic, this.mode);
            }
            if (tagKeys && !this.questionSelector) {
                this.questionSelector = new MultiverseQuestionSelector(tagKeys);
            }
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
        scene.load.image('slingshot', 'slingshot_bar.png');
        scene.load.image('slingshot_strips', 'strips.png');
        scene.load.image('blue_drum', 'blue_drum.png');
        scene.load.image('green_drum', 'green_drum.png');
        scene.load.image('red_drum', 'red_drum.png');
        scene.load.image('stone', 'stone.png');
        scene.load.image('question_box', 'question_box.png');
        scene.load.image('question_box_correct', 'question_box_correct.png');
        scene.load.image('question_box_incorrect', 'question_box_incorrect.png');
        scene.load.image('lights', 'lights.png');
        scene.load.image('top_layer', 'top_layer.png');
        scene.load.image('middle_layer', 'middle_layer.png');
        scene.load.image('bottom_layer', 'bottom_layer.png');
        scene.load.image('continue_btn_bg', 'continue_btn_bg.png');
        
        // Load icon assets for success/error animations
        scene.load.image('correct_icon', 'correct_icon.png');
        scene.load.image('incorrect_icon', 'incorrect_icon.png');
        
        // Load icon button assets
        scene.load.setPath(`${BUTTONS.PURPLE_PATH}`);
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
        scene.load.audio('throw-stone', 'throw-stone.mp3');
        scene.load.audio('slingshot-stretch', 'slingshot-stretch.mp3');
        scene.load.audio('question-change', 'question-change.mp3');

        // Preload progress bar and score coins
        ProgressBar.preload(scene, 'dark');
        ScoreCoins.preload(scene, 'purple');
        VolumeSlider.preload(scene, 'purple');
    }

    init(data?: { reset?: boolean }) {
        ProgressBar.init(this.scene);
        ScoreCoins.init(this.scene);
        
        this.accessibilityAnnouncer = undefined;
        
        if (data?.reset) {
            this.resetGame();
        }
    }

    create() {
        this.createBackground();
        
        if (!this.isInstructionMode) {
            this.scene.audioManager.playBackgroundMusic('bg-music');
        }

        // Create slingshot game elements
        this.createSlingshot();
        this.createProjectile();

        // Create UI elements
        this.createQuestionUI();
        
        if (!this.isInstructionMode) {
            this.createProgressBar();
            this.createScoreDisplay();
            this.createButtons();
            // Load the first question
            this.loadNextQuestion();
        } else {
            // In instruction mode, disable interactions initially
            this.setInteractionsEnabled(false);
            this.createMuteButton();
            this.createVolumeSliderButton();
        }
        
        // Start game loop
        this.startGameLoop();
    }

    private createBackground(): void {
        setSceneBackground('assets/images/common/bg.png');
        // Create background container
        const backgroundContainer = this.scene.add.container(
            this.scene.getScaledValue(this.scene.display.width / 2), 
            this.scene.getScaledValue(165)
        );
        
        // Add all 4 background images to the container
        const topLayer = this.scene.addImage(0, 0, 'top_layer');
        const lights = this.scene.addImage(0, -30, 'lights');
        const middleLayer = this.scene.addImage(0, 25, 'middle_layer');
        const bottomLayer = this.scene.addImage(0, 390, 'bottom_layer');
        
        // Add images to container in order (bottom to top)
        backgroundContainer.add(middleLayer);
        backgroundContainer.add(lights);
        backgroundContainer.add(topLayer);
        backgroundContainer.add(bottomLayer);
        
        // Add wave animation to lights
        this.scene.tweens.add({
            targets: lights,
            x: lights.x + this.scene.getScaledValue(2),
            y: lights.y + this.scene.getScaledValue(2), // Move up and down by 10 pixels
            rotation: lights.rotation - this.scene.getScaledValue(0.003),
            duration: 2000, // 2 seconds for a full cycle
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1 // Infinite repeat
        });
    }

    private createSlingshot(): void {
        // Create slingshot container
        this.slingshot = this.scene.add.container(this.scene.getScaledValue(this.scene.display.width / 2), this.scene.getScaledValue(this.scene.display.height - 120));
        
        // Use the existing slingshot image
        const slingshotImage = this.scene.addImage(0, 0, 'slingshot');
        this.slingshot.add(slingshotImage);
        
        // Create rubber band
        this.rubberBand = this.scene.add.graphics();
        this.slingshot.add(this.rubberBand);

        // Create slingshot strips
        const slingshotStrips = this.scene.addImage(0, -92, 'slingshot_strips');
        this.slingshot.add(slingshotStrips);
    }

    private createProjectile(): void {
        const projectileX = this.scene.display.width / 2;
        const projectileY = this.scene.display.height - 300; // Positioned at slingshot center
        
        // Create projectile as direct image
        this.projectile = this.scene.addImage(projectileX, projectileY, 'stone');
        
        // Reset projectile state
        this.isLaunched = false;
        this.velocityX = 0;
        this.velocityY = 0;
        
        // Set depth for proper layering
        this.projectile.setDepth(2);
        this.bounceProjectile();
    }

    private createTargets(): void {
        // Clear existing targets
        this.targets.forEach(target => target.destroy());
        this.targets = [];
        this.targetData = []; // Clear target data
        
        if (this.question) {
            const correctAnswer = parseInt(this.question.answer);
            
            // Generate 3 answer choices: correct answer and 2 wrong answers
            const answers = this.generateAnswerChoices(correctAnswer);
            
            const startX = this.scene.getScaledValue(this.scene.display.width / 2 - 310);
            const startY = this.scene.getScaledValue(280);
            const spacingX = this.scene.getScaledValue(300);
            
            for (let i = 0; i < 3; i++) {
                const targetX = startX + i * spacingX;
                const targetY = startY;
                
                // Create target container with drum image
                const { targetContainer, text, drum } = this.createTargetDrum(targetX, targetY, answers[i]);
                const targetData: TargetData = {
                    value: answers[i],
                    isCorrect: answers[i] === correctAnswer,
                    isHit: false,
                    index: i,
                    text: text,
                    drum: drum
                };
                this.targetData.push(targetData);
                
                this.targets.push(targetContainer);
                
                // Create accessibility overlay for this drum
                this.createDrumOverlay(targetContainer, answers[i], i);
            }
            
            // Hide all targets initially
            this.targets.forEach(target => {
                target.setAlpha(0);
            });
            
            // Animate targets sliding in from right to left one by one
            this.animateTargetsIn();
        }
    }

    private createTargetDrum(x: number, y: number, answer: number, drumType: string = 'blue_drum'): { targetContainer: Phaser.GameObjects.Container; text: Phaser.GameObjects.Text; drum: Phaser.GameObjects.Image } {
        // Create target container
        const targetContainer = this.scene.add.container(x, y);
        
        // Add drum image with specified type
        const drum = this.scene.addImage(0, 0, drumType);
        
        // Add answer text on top of drum
        let textSize = 45;
        const len = answer.toString().length;
        textSize = textSize - Math.max(len - 2, 0) * 6;
        const answerText = this.scene.addText(0, 5, i18n.formatNumber(answer), {
            font: `700 ${textSize}px Exo`,
            color: "#FFFFFF", // White text for better contrast on drum
            align: 'center',
        }).setOrigin(0.5);
        
        // Add all elements to container
        targetContainer.add(drum);
        targetContainer.add(answerText);
        
        return { targetContainer, text: answerText, drum: drum };
    }

    private generateAnswerChoices(correctAnswer: number): number[] {
        const answers = [correctAnswer];
        
        // Generate 2 wrong answers
        while (answers.length < 3) {
            let wrongAnswer;
            if (Math.random() < 0.5) {
                // Add or subtract a small number
                wrongAnswer = correctAnswer + (Math.random() < 0.5 ? 1 : -1) * Math.floor(Math.random() * 5 + 1);
            } else {
                // Multiply or divide by a small number
                const factor = Math.random() < 0.5 ? 2 : 0.5;
                wrongAnswer = Math.round(correctAnswer * factor);
            }
			
			// Ensure wrong answer is different from correct answer and unique
			if (wrongAnswer !== correctAnswer && !answers.includes(wrongAnswer)) {
                answers.push(wrongAnswer);
            }
        }
        
        // Shuffle the answers
        return answers.sort(() => Math.random() - 0.5);
    }

    private animateTargetsIn(): void {
        // Disable interaction during target animation
        this.isInteractionEnabled = false;
        
        // Animate each target sliding in from right to left with a staggered delay
        this.targets.forEach((target, index) => {
            // Start position: off-screen to the right
            const startX = this.scene.getScaledValue(this.scene.display.width + 200);
            const endX = target.x;
            
            // Set initial position off-screen
            target.setPosition(startX, target.y);
            
            // Animate sliding in with staggered timing
            this.scene.tweens.add({
                targets: target,
                x: endX,
                alpha: 1,
                duration: 900,
                delay: index * 300, // Stagger each target by 300ms
                ease: 'Back.easeOut',
                onComplete: () => {
                    // Ensure target is fully visible and in correct position
                    target.setAlpha(1);
                    target.setPosition(endX, target.y);
                    
                    // Check if this is the last target to complete animation
                    if (index === this.targets.length - 1) {
                        // All targets are ready, enable interaction
                        this.isInteractionEnabled = true;
                        
                        // Initialize accessibility features
                        this.initializeAccessibility();
                    }
                }
            });
        });
    }

    private animateTargetsOut(): void {
        this.scene.audioManager.playSoundEffect('question-change');
        // Animate each target sliding out to the left
        this.targets.forEach((target, index) => {
            const endX = this.scene.getScaledValue(-200); // Slide out to the left (off-screen)
            
            this.scene.tweens.add({
                targets: target,
                x: endX,
                alpha: 0,
                duration: 600,
                delay: index * 200, // Stagger each target by 100ms
                ease: 'Back.easeIn',
                onComplete: () => {
                    // Ensure target is fully hidden
                    target.setAlpha(0);
                    // Accessibility: hide drum overlays after animation
                    const overlay = this.drumOverlays.get(target);
                    if (overlay && overlay.domElement) {
                        overlay.domElement.node.setAttribute('aria-hidden', 'true');
                        overlay.domElement.node.setAttribute('tabindex', '-1');
                        const element = overlay.domElement.node as HTMLElement;
                        if (element.style) {
                            element.style.pointerEvents = 'none';
                        }
                    }
                }
            });
        });
    }

    private createQuestionUI(): void {

        this.questionBox = this.scene.addImage(this.scene.display.width / 2, this.scene.display.height - 57, 'question_box').setOrigin(0.5);
        // Create trajectory line
        this.trajectoryLine = this.scene.add.graphics();
    }

    private createButtons(): void {
        this.createPauseButton();
        this.createMuteButton();
        this.createVolumeSliderButton();
        this.createHelpButton();
    }

    private createProgressBar(): void {
        this.progressBar = new ProgressBar(this.scene, 'dark', i18n);
        this.progressBar.create(
            this.scene.getScaledValue(this.scene.display.width / 2),
            this.scene.getScaledValue(70)
        );
    }

    private createScoreDisplay() {
        this.scoreCoins = new ScoreCoins(this.scene, this.scoreHelper, i18n, 'purple');
        this.scoreCoins.create(
            this.scene.getScaledValue(87),
            this.scene.getScaledValue(63)
        );
    }

    // Public method to get projectile for GameScene
    public getProjectile(): Phaser.GameObjects.Image | undefined {
        return this.projectile;
    }

    // Public methods for GameScene to handle events
    public handlePointerDown(pointer: Phaser.Input.Pointer): void {
        if (this.projectileState !== ProjectileState.IDLE || !this.isInteractionEnabled) return;
        
        // In instruction mode, check if step 2 audio is completed
        if (this.isInstructionMode && !this.isStep2AudioCompleted) {
            return; // Don't allow dragging until step 2 audio is completed
        }
        
        // Check if pointer is close enough to projectile or slingshot anchor
        const projectileX = this.projectile?.x || 0;
        const projectileY = this.projectile?.y || 0;
        const slingshotAnchorX = this.scene.getScaledValue(this.scene.display.width / 2);
        const slingshotAnchorY = this.scene.getScaledValue(this.scene.display.height - 150);
        
        const distToProjectile = Math.sqrt((pointer.x - projectileX) ** 2 + (pointer.y - projectileY) ** 2);
        const distToAnchor = Math.sqrt((pointer.x - slingshotAnchorX) ** 2 + (pointer.y - slingshotAnchorY) ** 2);
        const scaledProjectileRadius = this.scene.getScaledValue(this.PROJECTILE_RADIUS);
        const scaledMaxPullDistance = this.scene.getScaledValue(this.MAX_PULL_DISTANCE);
        if (distToProjectile < scaledProjectileRadius * 3.5 || distToAnchor < scaledProjectileRadius * 3.5 + scaledMaxPullDistance / 3) {
            this.projectileState = ProjectileState.DRAGGING;
            this.projectile?.setPosition(pointer.x, pointer.y);
            this.scene.input.setDefaultCursor('grabbing');
            this.scene.audioManager.playSoundEffect('slingshot-stretch');
        }
    }

    public handlePointerMove(pointer: Phaser.Input.Pointer): void {
        if (this.projectileState === ProjectileState.DRAGGING && this.isInteractionEnabled) {
            this.projectile?.setPosition(pointer.x, pointer.y);
            
            // Calculate pull distance and limit it
            const slingshotAnchorX = this.scene.getScaledValue(this.scene.display.width / 2);
            const slingshotAnchorY = this.scene.getScaledValue(this.scene.display.height - this.SLINGSHOT_START_Y);
            
            const pullDx = pointer.x - slingshotAnchorX;
            const pullDy = pointer.y - slingshotAnchorY;
            const pullDistance = Math.sqrt(pullDx * pullDx + pullDy * pullDy);
            const scaledMaxPullDistance = this.scene.getScaledValue(this.MAX_PULL_DISTANCE);
            // Apply circular boundary constraint
            if (pullDistance > scaledMaxPullDistance) {
                const angle = Math.atan2(pullDy, pullDx);
                const limitedX = slingshotAnchorX + scaledMaxPullDistance * Math.cos(angle);
                const limitedY = slingshotAnchorY + scaledMaxPullDistance * Math.sin(angle);
                
                // Set projectile to limited position
                this.projectile?.setPosition(limitedX, limitedY);
            }
            
            // Always update rubber band regardless of quadrant
            this.updateRubberBand();
            
            // Update trajectory prediction
            this.updateTrajectoryPrediction();
        }
    }

    public handlePointerUp(): void {
        if (this.projectileState === ProjectileState.DRAGGING && this.isInteractionEnabled) {
            // Reset cursor to default
            this.scene.input.setDefaultCursor('default');      
            // Launch the projectile
            this.launchProjectile();
        }
    }

    // Accessibility Methods for Keyboard Navigation
    public focusToGameContainer(): void {
        // Focus on the main game content - this should be called after game is loaded
        // This sets focus to the first focusable element in the game for screen readers
        if (this.targets.length > 0) {
            const firstDrumOverlay = this.drumOverlays.get(this.targets[0]);
            if (firstDrumOverlay) {
                const domElement = (firstDrumOverlay as any).domElement;
                if (domElement?.node) {
                    // Focus the first drum
                    (domElement.node as HTMLElement).focus();
                }
            }
        }
    }

    public shootAtSelectedDrum(): void {
        if (!this.isInteractionEnabled || this.targets.length === 0 || this.projectileState !== ProjectileState.IDLE) return;
        
        const targetIndex = this.selectedDrumIndex;
        const targetData = this.targetData[targetIndex];
        
        if (targetData && !targetData.isHit) {
            // Announce shooting action
            this.announceToScreenReader(i18n.t('accessibility.shootingAt', { answer: targetData.value }));
            
            // Simulate projectile hit on selected drum
            this.simulateProjectileHit(targetIndex);
        }
    }

    private updateRubberBand(): void {
        if (!this.rubberBand || !this.projectile || !this.slingshot) return;
        
        this.rubberBand.clear();
        this.rubberBand.lineStyle(15, 0x610400, 1);
        
        // Get the slingshot anchor position
        const slingshotAnchorX = this.scene.getScaledValue(this.scene.display.width / 2);
        const slingshotAnchorY = this.scene.getScaledValue(this.scene.display.height - 125);
        
        // Get current projectile position
        const projectileX = this.projectile.x;
        const projectileY = this.projectile.y;
        
        // Draw rubber band from slingshot to projectile
        // Left attachment point (relative to slingshot center)
        const leftAttachmentX = this.scene.getScaledValue(-55);  // Relative to slingshot container
        const leftAttachmentY = this.scene.getScaledValue(-95);  // Relative to slingshot container
        
        // Right attachment point (relative to slingshot container)
        const rightAttachmentX = this.scene.getScaledValue(55);  // Relative to slingshot container
        const rightAttachmentY = this.scene.getScaledValue(-95); // Relative to slingshot container
        
        // Calculate the relative position from slingshot to projectile
        const relativePullX = projectileX - slingshotAnchorX;
        const relativePullY = projectileY - slingshotAnchorY;
        
        this.rubberBand.beginPath();
        this.rubberBand.moveTo(leftAttachmentX, leftAttachmentY);
        this.rubberBand.lineTo(relativePullX, relativePullY);
        this.rubberBand.moveTo(rightAttachmentX, rightAttachmentY);
        this.rubberBand.lineTo(relativePullX, relativePullY);
        this.rubberBand.strokePath();
        
        // Update scaled drag point for consistent physics calculations
        this.currentDragPointScaled = { x: projectileX, y: projectileY };
    }

    private updateTrajectoryPrediction(): void {
        if (!this.trajectoryLine || !this.projectile) return;
        
        this.trajectoryLine.clear();
        
        // Get slingshot center position using SLINGSHOT_START_Y
        const slingshotX = this.scene.getScaledValue(this.scene.display.width / 2);
        const slingshotY = this.scene.getScaledValue(this.scene.display.height - this.SLINGSHOT_START_Y);
        
        // Get current drag position from projectile
        const dragX = this.projectile.x;
        const dragY = this.projectile.y;
        
        // Calculate pull vector (from slingshot to drag point)
        const pullX = dragX - slingshotX;
        const pullY = dragY - slingshotY;
        const pullDistance = Math.sqrt(pullX * pullX + pullY * pullY);
        
        // Don't show trajectory if not pulling or pulling too little
        if (pullDistance < 10) {
            return;
        }
        
        
        // Calculate launch velocity based on pull distance and direction
        const normalizedPullX = pullX / pullDistance;
        const normalizedPullY = pullY / pullDistance;
        
        // Calculate power based on pull distance (0 to 1)
        const powerRatio = Math.min(pullDistance / this.scene.getScaledValue(this.MAX_PULL_DISTANCE), 1);
        
        // Calculate launch angle from pull direction
        const launchAngle = Math.atan2(-normalizedPullY, -normalizedPullX);
        
        // Calculate velocity magnitude with gravity compensation
        const baseVelocityMagnitude = powerRatio * this.scene.getScaledValue(this.MAX_TRAJECTORY_DISTANCE) * this.POWER_MULTIPLIER;
        const gravityCompensation = 1 + Math.abs(Math.sin(launchAngle)) * 0.5;
        const velocityMagnitude = baseVelocityMagnitude * gravityCompensation;
        
        // Launch velocity is opposite to pull direction
        const launchVelocityX = -normalizedPullX * velocityMagnitude;
        const launchVelocityY = -normalizedPullY * velocityMagnitude;
        
        // Calculate landing point using physics simulation
        const landingPoint = this.calculateLandingPoint(slingshotX, slingshotY, launchVelocityX, launchVelocityY);
        
        // Check if landing is in 3rd or 4th quadrant (below slingshot) - restrict if so
        const isLandingBackward = this.isLandingBackward(slingshotY, landingPoint.y);
        if (isLandingBackward) {
            // Clear trajectory and boundary when landing would be backward
            this.trajectoryLine?.clear();
            return;
        }
        
        // Store landing target for projectile
        this.landingTargetX = landingPoint.x;
        this.landingTargetY = landingPoint.y;
        this.hasLandingTarget = true;
        
        // Draw straight line trajectory
        this.drawStraightTrajectory(slingshotX, slingshotY, landingPoint.x, landingPoint.y);
    }

    private calculateLandingPoint(startX: number, startY: number, initialVx: number, initialVy: number): { x: number; y: number } {
        let x = startX;
        let y = startY;
        let vx = initialVx;
        let vy = initialVy;
        
        const timeStep = 0.1;
        const maxSteps = 200;
        const scaledGravity = this.scene.getScaledValue(this.GRAVITY);
        
        for (let i = 0; i < maxSteps; i++) {
            // Update position
            x += vx * timeStep;
            y += vy * timeStep;
            
            // Apply gravity
            vy += scaledGravity * timeStep;
            
            // Stop if trajectory goes off screen or hits ground
            if (y > this.scene.getScaledValue(this.scene.display.height) || 
                x < 0 || 
                x > this.scene.getScaledValue(this.scene.display.width)) {
                break;
            }
        }
        
        return { x, y };
    }

    private drawStraightTrajectory(startX: number, startY: number, endX: number, endY: number): void {
        if (!this.trajectoryLine) return;
        
        // Draw dashed straight line from start to end point
        this.trajectoryLine.lineStyle(6, 0xFFFFFF, 0.8).setDepth(2);
        
        // Calculate the distance and direction
        const distance = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
        const dashLength = 20; // Length of each dash
        const gapLength = 15;  // Length of each gap
        const totalSegmentLength = dashLength + gapLength;
        
        const numSegments = Math.floor(distance / totalSegmentLength);
        
        for (let i = 0; i < numSegments; i++) {
            const segmentStart = i * totalSegmentLength;
            const segmentEnd = segmentStart + dashLength;
            
            // Calculate positions for this dash segment
            const startRatio = segmentStart / distance;
            const endRatio = segmentEnd / distance;
            
            const dashStartX = startX + (endX - startX) * startRatio;
            const dashStartY = startY + (endY - startY) * startRatio;
            const dashEndX = startX + (endX - startX) * endRatio;
            const dashEndY = startY + (endY - startY) * endRatio;
            
            // Draw this dash segment
            this.trajectoryLine.beginPath();
            this.trajectoryLine.moveTo(dashStartX, dashStartY);
            this.trajectoryLine.lineTo(dashEndX, dashEndY);
            this.trajectoryLine.strokePath();
        }
        
        // Draw arrow at the end point
        this.drawTrajectoryArrow(endX, endY, endX - startX, endY - startY);
    }

    private isLandingBackward(slingshotY: number, landingY: number): boolean {
        return landingY > slingshotY;
    }

    private drawTrajectoryArrow(x: number, y: number, vx: number, vy: number): void {
        if (!this.trajectoryLine) return;
        
        const angle = Math.atan2(vy, vx);
        const arrowLength = this.scene.getScaledValue(25);
        const triangleSize = this.scene.getScaledValue(12);
        
        const base1X = x - triangleSize * Math.cos(angle + Math.PI / 2);
        const base1Y = y - triangleSize * Math.sin(angle + Math.PI / 2);
        const base2X = x + triangleSize * Math.cos(angle + Math.PI / 2);
        const base2Y = y + triangleSize * Math.sin(angle + Math.PI / 2);
        
        const trianglePointX = x + arrowLength * Math.cos(angle);
        const trianglePointY = y + arrowLength * Math.sin(angle);
        this.trajectoryLine.lineStyle(4, 0xFFFFFF, 1);
        this.trajectoryLine.beginPath();
        this.trajectoryLine.moveTo(base1X, base1Y);
        this.trajectoryLine.lineTo(trianglePointX, trianglePointY);
        this.trajectoryLine.lineTo(base2X, base2Y);
        this.trajectoryLine.closePath();
        this.trajectoryLine.strokePath();
        this.trajectoryLine.fillStyle(0xFFFFFF, 0.9);
        this.trajectoryLine.fill();
    }

    private launchProjectile(): void {
        if (!this.projectile) return;
        
        const slingshotX = this.scene.getScaledValue(this.scene.display.width / 2);
        const slingshotY = this.scene.getScaledValue(this.scene.display.height - this.SLINGSHOT_START_Y);
        
        const dragX = this.currentDragPointScaled.x;
        const dragY = this.currentDragPointScaled.y;
        
        const pullX = dragX - slingshotX;
        const pullY = dragY - slingshotY;
        const pullDistance = Math.sqrt(pullX * pullX + pullY * pullY);
        
        if (pullDistance < 10) {
            this.resetProjectile();
            this.repositionProjectile();
            return;
        }
        
        const normalizedPullX = pullX / pullDistance;
        const normalizedPullY = pullY / pullDistance;
        
        const powerRatio = Math.min(pullDistance / this.scene.getScaledValue(this.MAX_PULL_DISTANCE), 1);
        
        const launchAngle = Math.atan2(-normalizedPullY, -normalizedPullX);
        
        const baseVelocityMagnitude = powerRatio * this.scene.getScaledValue(this.MAX_TRAJECTORY_DISTANCE) * this.POWER_MULTIPLIER;
        const gravityCompensation = 1 + Math.abs(Math.sin(launchAngle)) * 0.5;
        const velocityMagnitude = baseVelocityMagnitude * gravityCompensation;
        
        const launchVelocityX = -normalizedPullX * velocityMagnitude;
        const launchVelocityY = -normalizedPullY * velocityMagnitude;
        
        const landingPoint = this.calculateLandingPoint(slingshotX, slingshotY, launchVelocityX, launchVelocityY);
        
        const isLandingBackward = this.isLandingBackward(slingshotY, landingPoint.y);
        if (isLandingBackward) {
            this.resetProjectile();
            this.repositionProjectile();
            return;
        }
        this.scene.audioManager.playSoundEffect('throw-stone');
        
        this.projectileState = ProjectileState.FLYING;
        this.isLaunched = true;
        
        this.velocityX = launchVelocityX;
        this.velocityY = launchVelocityY;
        
        this.landingTargetX = landingPoint.x;
        this.landingTargetY = landingPoint.y;
        this.hasLandingTarget = true;
        
        this.projectileRotation = 0;
        this.projectileScale = 1;
        this.projectile.setRotation(0);
        this.projectile.setScale(1);
        
        this.projectile.setPosition(slingshotX, slingshotY);
        
        this.scene.tweens.add({
            targets: this.projectile,
            scale: 1.3,
            duration: 100,
            yoyo: true,
            ease: 'Power2'
        });
        
        this.rubberBand?.clear();
        this.trajectoryLine?.clear();
    }

    private startGameLoop(): void {
        this.scene.time.addEvent({
            delay: 16,
            callback: this.gameLoop,
            callbackScope: this,
            loop: true
        });
    }

    private gameLoop(): void {
        if (this.projectileState === ProjectileState.FLYING && this.isLaunched && this.isInteractionEnabled) {
            this.updateProjectilePhysics();
        }
    }

    private updateProjectilePhysics(): void {
        if (!this.projectile) return;
        
        const timeStep = 0.45;
        
        this.velocityY += this.scene.getScaledValue(this.GRAVITY) * timeStep;
        
        const newX = this.projectile.x + this.velocityX * timeStep;
        const newY = this.projectile.y + this.velocityY * timeStep;
        if (this.hasLandingTarget) {
            const distanceToTarget = Math.sqrt((newX - this.landingTargetX) ** 2 + (newY - this.landingTargetY) ** 2);
            const tolerance = this.scene.getScaledValue(10);
            
            if (distanceToTarget <= tolerance) {
                this.projectile.setPosition(this.landingTargetX, this.landingTargetY);
                this.projectileState = ProjectileState.IDLE;
                this.isLaunched = false;
                
                this.checkCollisionsOnLanding();
                this.hasLandingTarget = false;
                return;
            }
        }
        
        this.projectile.setPosition(newX, newY);
        
        const speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
        this.projectileRotation += speed * 0.01;
        this.projectile.setRotation(this.projectileRotation);
        
        this.projectileScale = 1 + Math.sin(this.projectileRotation * 0.1) * 0.05;
        this.projectile.setScale(this.projectileScale);
        
        this.trailTimer++;
        if (this.trailTimer >= 3) {
            this.createTrailEffect(this.projectile.x, this.projectile.y);
            this.trailTimer = 0;
        }
        
        if (newY > this.scene.getScaledValue(this.scene.display.height) + this.scene.getScaledValue(this.PROJECTILE_RADIUS) || 
            newX < -this.scene.getScaledValue(this.PROJECTILE_RADIUS) || 
            newX > this.scene.getScaledValue(this.scene.display.width) + this.scene.getScaledValue(this.PROJECTILE_RADIUS)) {
            
            this.projectileState = ProjectileState.IDLE;
            this.isLaunched = false;
            this.hasLandingTarget = false;
            this.onProjectileMiss();
        }
    }

    private checkCollisionsOnLanding(): void {
        if (!this.projectile) return;
        
        // NEW BEHAVIOR: Instead of checking precise collision with barrel bounds,
        // we now check if the extended trajectory line intersects with any barrel.
        // This makes the game easier as players don't need to hit the barrel exactly.
        const targetResult = this.checkWhichTargetArrowPointsTo();
        
        if (targetResult !== null) {
            const { targetIndex } = targetResult;
            if (!this.targetData[targetIndex].isHit) {
                this.onProjectileHitTarget(this.targets[targetIndex], targetIndex);
            } else {
                this.onProjectileMiss();
            }
        } else {
            this.onProjectileMiss();
        }
    }

    /**
     * Checks which target the extended trajectory line intersects with.
     * This method extends the trajectory line in a straight line and checks if it
     * intersects with any barrel's bounds. This makes the game easier as
     * players don't need precise barrel contact.
     * 
     * @returns object with targetIndex and isCorrect, or null if no intersection
     */
    private checkWhichTargetArrowPointsTo(): { targetIndex: number; isCorrect: boolean } | null {
        if (!this.hasLandingTarget || this.targets.length === 0) {
            return null;
        }
        
        // Get the trajectory start point (slingshot position)
        const slingshotX = this.scene.getScaledValue(this.scene.display.width / 2);
        const slingshotY = this.scene.getScaledValue(this.scene.display.height - this.SLINGSHOT_START_Y);
        
        // Get the trajectory end point (landing point)
        const trajectoryEndX = this.landingTargetX;
        const trajectoryEndY = this.landingTargetY;
        
        // Calculate the direction vector from slingshot to landing point
        const directionX = trajectoryEndX - slingshotX;
        const directionY = trajectoryEndY - slingshotY;
        const directionLength = Math.sqrt(directionX * directionX + directionY * directionY);
        
        // Normalize the direction
        const normalizedX = directionX / directionLength;
        const normalizedY = directionY / directionLength;
        
        // Extend the line much further to check for barrel intersections
        const extendedLength = this.scene.getScaledValue(1000); // Extend 1000 pixels
        const extendedEndX = slingshotX + normalizedX * extendedLength;
        const extendedEndY = slingshotY + normalizedY * extendedLength;
        
        // Check if the extended trajectory line intersects with any target
        for (let i = 0; i < this.targets.length; i++) {
            if (this.targetData[i].isHit) {
                continue;
            }
            
            const target = this.targets[i];
            const targetData = this.targetData[i];
            const targetX = target.x;
            const targetY = target.y;
            
            const drum = targetData.drum;
            if (!drum) {
                continue;
            }
            
            // Calculate the drum's bounds
            const drumWidth = drum.width * drum.scaleX;
            const drumHeight = drum.height * drum.scaleY;
            const drumLeft = targetX - drumWidth / 2;
            const drumRight = targetX + drumWidth / 2;
            const drumTop = targetY - drumHeight / 2;
            const drumBottom = targetY + drumHeight / 2;
            
            // Check if the extended trajectory line intersects with this barrel
            const intersectsTarget = this.lineIntersectsRectangle(
                slingshotX, slingshotY, extendedEndX, extendedEndY,
                drumLeft, drumTop, drumRight, drumBottom
            );
            
            if (intersectsTarget) {
                return {
                    targetIndex: i,
                    isCorrect: targetData.isCorrect
                };
            }
        }
        
        // If trajectory doesn't intersect any target, it's a miss
        return null;
    }

    /**
     * Checks if a line segment intersects with a rectangle.
     * Uses the Liang-Barsky line clipping algorithm to determine intersection.
     * 
     * @param x1 Line start X coordinate
     * @param y1 Line start Y coordinate
     * @param x2 Line end X coordinate
     * @param y2 Line end Y coordinate
     * @param rectLeft Rectangle left edge
     * @param rectTop Rectangle top edge
     * @param rectRight Rectangle right edge
     * @param rectBottom Rectangle bottom edge
     * @returns true if line intersects rectangle, false otherwise
     */
    private lineIntersectsRectangle(
        x1: number, y1: number, x2: number, y2: number,
        rectLeft: number, rectTop: number, rectRight: number, rectBottom: number
    ): boolean {
        // Calculate line direction
        const dx = x2 - x1;
        const dy = y2 - y1;
        
        // If line has no length, check if point is inside rectangle
        if (dx === 0 && dy === 0) {
            return x1 >= rectLeft && x1 <= rectRight && y1 >= rectTop && y1 <= rectBottom;
        }
        
        // Calculate parameter values for intersection with rectangle edges
        const tLeft = (rectLeft - x1) / dx;
        const tRight = (rectRight - x1) / dx;
        const tTop = (rectTop - y1) / dy;
        const tBottom = (rectBottom - y1) / dy;
        
        // Find the range of t values where the line intersects the rectangle
        const tMin = Math.max(
            Math.min(tLeft, tRight),
            Math.min(tTop, tBottom)
        );
        const tMax = Math.min(
            Math.max(tLeft, tRight),
            Math.max(tTop, tBottom)
        );
        
        // Line intersects rectangle if there's a valid range of t values
        // and the intersection occurs within the line segment (0 <= t <= 1)
        return tMax >= tMin && tMax >= 0 && tMin <= 1;
    }


    private createTrailEffect(x: number, y: number): void {
        // Create trail particle
        const trailParticle = this.scene.add.graphics();
        trailParticle.fillStyle(0x8B4513, 0.6); // Brown color with transparency
        
        // Create small trail dot
        const size = Math.random() * 4 + 2;
        trailParticle.fillCircle(0, 0, size);
        trailParticle.setPosition(x, y);
        
        // Animate trail particle fade out
        this.scene.tweens.add({
            targets: trailParticle,
            alpha: 0,
            scale: 0.5,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                trailParticle.destroy();
                const index = this.projectileTrail.indexOf(trailParticle);
                if (index > -1) {
                    this.projectileTrail.splice(index, 1);
                }
            }
        });
        
        this.projectileTrail.push(trailParticle);
        
        // Limit trail length
        if (this.projectileTrail.length > 15) {
            const oldTrail = this.projectileTrail.shift();
            if (oldTrail) {
                oldTrail.destroy();
            }
        }
    }

    private clearTrailEffects(): void {
        // Clear all trail particles
        this.projectileTrail.forEach(particle => particle.destroy());
        this.projectileTrail = [];
        this.trailTimer = 0;
    }

    private replaceDrumColor(newDrumKey: string, targetIndex: number): void {
        // Get the current drum and text
        const targetData = this.targetData[targetIndex];
        const currentDrum = targetData.drum;
        const currentText = targetData.text;
        const target = this.targets[targetIndex];
        
        if (!currentDrum || !currentText || !target) return;
        
        // Create new drum and text using the existing method
        const { drum: newDrum, text: newText } = this.createTargetDrum(0, 0, targetData.value, newDrumKey);
        
        // Add new drum and text to the existing target container
        target.add(newDrum);
        target.add(newText);
        
        // Store references to new drum and text
        targetData.drum = newDrum;
        targetData.text = newText;
        
        // Hide the old drum and text
        currentDrum.setVisible(false);
        currentText.setVisible(false);
    }

    private resetDrumColor(targetIndex: number): void {
        // Reset drum color back to blue in instruction mode
        this.replaceDrumColor('blue_drum', targetIndex);
        
        // Reset the isHit flag so the target can be hit again
        const targetData = this.targetData[targetIndex];
        if (targetData) {
            targetData.isHit = false;
        }
        
        this.updateQuestionBox('default');
        
        // Re-enable interactions after resetting drum color
        this.setInteractionsEnabled(true);
    }

    private knockDownAllDrums(): void {
        // Knock down all drums when answer is correct
        // Immediately clear the yellow selection indicator
        if (this.drumSelectionIndicator) {
            this.drumSelectionIndicator.clear();
            this.drumSelectionIndicator.setVisible(false);
        }
        
        // Immediately disable all drum overlays to prevent interaction during animation
        this.targets.forEach((target) => {
            const overlay = this.drumOverlays.get(target);
            if (overlay && overlay.domElement) {
                // Hide from screen readers and disable keyboard focus
                overlay.domElement.node.setAttribute('aria-hidden', 'true');
                overlay.domElement.node.setAttribute('tabindex', '-1');
                const element = overlay.domElement.node as HTMLElement;
                if (element.style) {
                    element.style.pointerEvents = 'none';
                }
            }
        });
        
        this.targets.forEach((_, index) => {
            const targetData = this.targetData[index];
            if (targetData && targetData.drum && targetData.text) {
                const drum = targetData.drum;
                const text = targetData.text;
                
                // Create falling animation with random rotation
                const startY = drum.y;
                const fallDistance = this.scene.getScaledValue(200);
                const randomRotation = (Math.random() - 0.5) * Math.PI; // Random rotation between -90 and 90 degrees
                const randomDelay = Phaser.Math.Between(0, 400);
                
                // First phase: slight wobble and rotation
                this.scene.tweens.add({
                    targets: [drum, text],
                    rotation: randomRotation * 0.3,
                    duration: 200,
                    ease: 'Power2',
                    delay: randomDelay,
                    onComplete: () => {
                        // Second phase: falling down with full rotation
                        this.scene.tweens.add({
                            targets: [drum, text],
                            y: startY + fallDistance,
                            rotation: randomRotation,
                            duration: Phaser.Math.Between(400, 800),
                            ease: 'Power2',
                            onComplete: () => {
                                // Third phase: fade out
                                this.scene.tweens.add({
                                    targets: [drum, text],
                                    alpha: 0,
                                    scale: 0.8,
                                    duration: 300,
                                    ease: 'Power2'
                                });
                            }
                        });
                    }
                });
            }
        });
    }

    private animateDrum(isCorrect: boolean, targetIndex: number): void {
        const targetData = this.targetData[targetIndex];
        const newDrum = targetData.drum;
        const newText = targetData.text;
        
        if (!newDrum || !newText) return;
        
        // Update SDK components
        if (isCorrect) {
            this.scoreHelper.answerCorrectly();
            this.scoreCoins?.updateScoreDisplay(true);
        } else {
            this.scoreHelper.answerIncorrectly();
            this.scoreCoins?.updateScoreDisplay(false);
        }
        const progress = this.scoreHelper.getTotalQuestions() / this.totalQuestions;
        this.progressBar?.drawProgressFill(progress, this.scoreHelper.getCurrentStreak());
                    
        // Animate based on correctness
        if (isCorrect) {
            // Correct answer: knock down all drums
            this.knockDownAllDrums();
            
            // Wait for animations to complete before proceeding
            this.scene.time.delayedCall(1500, () => {
                if (this.isInstructionMode) {
                    return;
                }
                
                // Announce progression to screen reader
                const questionsAnswered = this.scoreHelper.getTotalQuestions();
                const questionsRemaining = this.totalQuestions - questionsAnswered;
                if (questionsRemaining > 0) {
                    this.announceToScreenReader(i18n.t('accessibility.progressUpdate', { remaining: questionsRemaining }));
                }
                                            
                if (this.scoreHelper.showStreakAnimation()) {
                    // Show celebration for correct answers
                    this.showMascotCelebration(() => {
                        this.repositionProjectile();
                        this.loadNextQuestion(
                            this.questionSelector!.createStudentResponse(
                                this.multiverseQuestion!,
                                Date.now() - this.questionStartTime,
                                true
                            )
                        );
                    });
                } else {
                    this.repositionProjectile();
                    this.loadNextQuestion(
                        this.questionSelector!.createStudentResponse(
                            this.multiverseQuestion!,
                            Date.now() - this.questionStartTime,
                            true
                        )
                    );
                }
            });
        } else {
            // Red drum: shake animation
            this.scene.tweens.add({
                targets: [newDrum, newText],
                x: newDrum.x + this.scene.getScaledValue(10),
                duration: 100,
                yoyo: true,
                repeat: 2,
                onComplete: () => {
                    this.repositionProjectile();
                    if(!this.isInstructionMode) {
                        this.showCorrectAnswer();
                        
                        continueGameAfterWrongAnswer(this.scene, () => {
                            this.repositionProjectile();
                            this.loadNextQuestion(
                                this.questionSelector!.createStudentResponse(
                                    this.multiverseQuestion!,
                                    Date.now() - this.questionStartTime,
                                    false
                                )
                            );
                        });
                    } else {
                        // In instruction mode, reset drum color back to blue after shake animation
                        this.resetDrumColor(targetIndex);
                    }
                }
            });
        }
    }

    private updateQuestionBoxText(text: number): void {
        if (!this.inputText) return;

        this.inputText.setAlpha(1);
        this.inputText.setText(i18n.formatNumber(+text));
    }

    private showCorrectAnswer(): void {
        const answer = this.question?.answer;
        if (!answer || !this.inputText) return;
        
        // Update the single underscore with the correct answer
        this.inputText.setAlpha(1);
        this.inputText.setText(i18n.formatNumber(+answer));
        
        this.updateQuestionBox('correct');

        // Highlight the correct drum in green when revealing the correct answer
        const correctIndex = this.targetData.findIndex((data) => data.isCorrect);
        if (correctIndex !== -1) {
            this.replaceDrumColor('green_drum', correctIndex);
        }

        // Accessibility: announce the correct answer explicitly
        this.announceToScreenReader(
            i18n.t('accessibility.correctAnswerReveal', { correctAnswer: answer })
        );
    }
    
    private updateQuestionBox(type: 'correct' | 'incorrect' | 'default'): void {
        if (!this.questionBox) return;
        
        const textureKey = type === 'correct' ? 'question_box_correct' : 
                          type === 'incorrect' ? 'question_box_incorrect' : 
                          'question_box';
        
        this.questionBox.setTexture(textureKey);

        if (type === 'default' && this.question && this.inputText && this.inputText.active) {
            const answerLength = this.question.answer.length;
            const underscoreText = '_'.repeat(answerLength);
            this.inputText.setAlpha(1);
            this.inputText.setText(underscoreText);
        }
    }

    private showResultTextAndAnimateDrum(target: Phaser.GameObjects.Container, isCorrect: boolean, targetIndex: number): void {
        // Play appropriate sound effect
        if (isCorrect) {
            this.scene.audioManager.playSoundEffect('positive-sfx');
        } else {
            this.scene.audioManager.playSoundEffect('negative-sfx');
        }
        
        // Change drum color immediately
        const newDrumKey = isCorrect ? 'green_drum' : 'red_drum';
        this.replaceDrumColor(newDrumKey, targetIndex);
        
        // Update question box to show correct or incorrect
        this.updateQuestionBox(isCorrect ? 'correct' : 'incorrect');
        const selectedDrum = this.targetData[targetIndex];
        this.updateQuestionBoxText(selectedDrum.value);
        
        // Create result text
        const resultText = isCorrect ? i18n.t('common.correct') : i18n.t('common.incorrect');
        const textColor = isCorrect ? "#6CFF00" : "#FF4144"; // Green for correct, red for incorrect
        
        // Position text above the drum        
        const resultTextObj = this.scene.addText(
            (target.x) / this.scene.display.scale,
            180,
            resultText,
            {
                font: "700 26px Exo",
                color: textColor,
                stroke: "#000000",
            }
        ).setOrigin(0.5);
        
        // Animate text appearing from bottom to top
        this.scene.tweens.add({
            targets: resultTextObj,
            y: resultTextObj.y - this.scene.getScaledValue(20), // Move up slightly
            alpha: 1,
            duration: 300,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Wait 500ms then fade away
                this.scene.time.delayedCall(500, () => {
                    this.scene.tweens.add({
                        targets: resultTextObj,
                        alpha: 0,
                        y: resultTextObj.y - this.scene.getScaledValue(40), // Move up more while fading
                        duration: 300,
                        ease: 'Power2',
                        onComplete: () => {
                            resultTextObj.destroy();
                            // After text animation completes, proceed with drum animation
                            this.animateDrum(isCorrect, targetIndex);
                        }
                    });
                });
            }
        });
    }

    private onProjectileHitTarget(target: Phaser.GameObjects.Container, targetIndex: number): void {
        const targetData = this.targetData[targetIndex];
        if (targetData.isHit) return;
        
        this.projectileState = ProjectileState.IDLE;
        this.isInteractionEnabled = false;
        targetData.isHit = true;

        // Accessibility: disable drum overlay immediately after hit
        const overlay = this.drumOverlays.get(target);
        if (overlay && overlay.domElement) {
            const node = overlay.domElement.node as HTMLElement;
            node.setAttribute('aria-hidden', 'true');
            node.setAttribute('tabindex', '-1');
            node.removeAttribute('role');
            if (node.style) {
                node.style.pointerEvents = 'none';
            }
            // If this element is focused, blur it
            if (document.activeElement === node) {
                node.blur();
            }
        }

        // Announce result to screen reader
        const resultMessage = targetData.isCorrect 
            ? i18n.t('accessibility.correctHit', { answer: targetData.value })
            : i18n.t('accessibility.incorrectHit', { 
                answer: targetData.value,
                operand1: this.question?.operand1 || '',
                operator: this.question?.operator || '',
                operand2: this.question?.operand2 || '',
                correctAnswer: this.question?.answer || ''
            });
        this.announceToScreenReader(resultMessage);
        
        // Hide projectile and clear trail effects
        this.projectile?.setAlpha(0);
        this.clearTrailEffects();
        
        // Show result text and animate drum for both modes
        this.showResultTextAndAnimateDrum(target, targetData.isCorrect, targetIndex);
        
        // In instruction mode, handle progression differently
        if (this.isInstructionMode) {
            if (targetData.isCorrect) {
                // Correct answer in instruction mode - play step 3 after animation
                this.scene.time.delayedCall(2000, () => {
                    this.playStep3();
                });
            } else {
                // Incorrect answer in instruction mode - reset for retry after animation
                this.scene.time.delayedCall(1000, () => {
                    this.setInteractionsEnabled(true);
                });
            }
        }
    }

    private onProjectileMiss(): void {
        this.projectileState = ProjectileState.IDLE;
        this.isInteractionEnabled = false;
        
        // Announce miss to screen reader
        this.announceToScreenReader(i18n.t('accessibility.projectileMiss'));
        
        // Show incorrect question box
        this.updateQuestionBox('incorrect');
        
        if (!this.isInstructionMode) {
            // Only update score components in normal game mode
            this.scoreHelper.answerIncorrectly();
            this.scoreCoins?.updateScoreDisplay(false);
            const progress = this.scoreHelper.getTotalQuestions() / this.totalQuestions;
            this.progressBar?.drawProgressFill(progress, this.scoreHelper.getCurrentStreak());
        }
        
        this.repositionProjectile();
        
        if (this.isInstructionMode) {
            // In instruction mode, reset question box and allow retry
            this.scene.time.delayedCall(1000, () => {
                this.updateQuestionBox('default');
                this.setInteractionsEnabled(true);
            });
        } else {
            this.scene.time.delayedCall(1500, () => {
                this.showCorrectAnswer();
                
                // Show continue button after wrong answer
                continueGameAfterWrongAnswer(this.scene, () => {
                    // Create announcer if needed and announce instruction to continue
                    this.createAccessibilityAnnouncer();
                    // Nudge live region to ensure SR picks up next announcement
                    this.announceToScreenReader('');
                    this.scene.time.delayedCall(50, () => {
                        this.announceToScreenReader(i18n.t('accessibility.pressContinue'));
                    });

                    this.loadNextQuestion(
                        this.questionSelector!.createStudentResponse(
                            this.multiverseQuestion!,
                            Date.now() - this.questionStartTime,
                            false // Mark as incorrect
                        )
                    );
                        // Ensure the next question is announced for screen readers after it loads and targets animate in
                        this.scene.time.delayedCall(1200, () => {
                        this.createAccessibilityAnnouncer();
                        // First clear announcer content to force change
                        this.announceToScreenReader('');
                        // Announce next-question immediately after
                        this.scene.time.delayedCall(100, () => {
                            this.announceCurrentQuestion();
                        });
                    });
                });
            });
        }
    }


    private resetProjectile(clearRubberBand: boolean = true): void {
        if (!this.projectile) return;
        
        // Reset projectile state
        this.projectileState = ProjectileState.IDLE;
        this.isLaunched = false;
        this.velocityX = 0;
        this.velocityY = 0;
        
        // Reset animation properties
        this.projectileRotation = 0;
        this.projectileScale = 1;
        this.projectile.setRotation(0);
        this.projectile.setScale(1);
        this.projectile.setAlpha(1);
        
        // Clear trail effects
        this.clearTrailEffects();
        
        // Reset landing target
        this.hasLandingTarget = false;
        this.landingTargetX = 0;
        this.landingTargetY = 0;
        
        // Only clear rubber band if explicitly requested
        if (clearRubberBand) {
            this.rubberBand?.clear();
        }
        this.trajectoryLine?.clear();
    }

    private repositionProjectile(): void {
        if (!this.projectile) return;
        if (this.scoreHelper.getTotalQuestions() >= this.totalQuestions) return;

        // Position projectile at the correct position
        const stoneX = this.scene.getScaledValue(this.scene.display.width / 2);
        const stoneY = this.scene.getScaledValue(this.scene.display.height - 330);
        
        // Position projectile at the center of the stone image
        this.projectile.setPosition(stoneX, stoneY);
        this.bounceProjectile();
    }

    private bounceProjectile(): void {
        const finalY = this.scene.getScaledValue(this.scene.display.height - 220);
        
        // First phase: make visible and drop down with gravity effect
        this.scene.tweens.add({
            targets: this.projectile,
            alpha: 1,
            y: finalY,
            duration: 1000,
            ease: 'Bounce.easeOut',
            onComplete: () => {
                this.updateRubberBand();
            }
        });
    }

    private createTopicFilter(): ((fm: FactMasteryItem) => boolean) | undefined {
        switch (this.topic) {
            case 'grade2_topic1':
                return (fm: FactMasteryItem) => withinFilter(fm, 20, 10);
            case 'grade2_topic3':
            case 'grade2_topic4':
                return (fm: FactMasteryItem) => withinFilter(fm, 100);
            case 'g5_g6':
                return (fm: FactMasteryItem) => g5_g6Filter(fm);
            default:
                return undefined;
        }
    }

    private extractQuestionFromMathFact(question: string): QuestionType {
        // Supported operators
        const operators = ['+', '−', '×', '÷', '-'];
        
        // Split on '=' to separate question from answer
        const [left, answer] = question.split('=').map((s) => s.trim());
        if (!left || answer === undefined) throw new Error('Invalid question format');
        
        // Remove all parentheses first
        const cleaned = left.replace(/[()]/g, '');
        
        // Find the operator (skip the first character to avoid leading negative)
        let operator = null;
        let operatorIndex = -1;
        
        for (let i = 1; i < cleaned.length; i++) {
            if (operators.includes(cleaned[i])) {
                operator = cleaned[i];
                operatorIndex = i;
                break;
            }
        }
        
        if (!operator || operatorIndex === -1) throw new Error('Operator not found in question string');
        
        // Split at the operator
        const operand1 = cleaned.substring(0, operatorIndex).trim();
        const operand2 = cleaned.substring(operatorIndex + 1).trim();
        
        if (!operand1 || !operand2) throw new Error('Invalid operands');
        
        return {
            operand1: operand1.toString(),
            operand2: operand2.toString(),
            operator: operator.toString(),
            answer: answer.toString(),
        };
    }

    private loadNextQuestion(response?: StudentResponse): void {

        const filter = this.createTopicFilter();
        if(this.topic === 'grade2_topic1') {
            this.multiverseQuestion = this.questionSelector!.getNextQuestionAddSub(response || undefined, filter)
        } else {
            this.multiverseQuestion = this.questionSelector!.getNextQuestion(response || undefined, filter)
        }
        
        if (!this.multiverseQuestion || this.scoreHelper.getTotalQuestions() >= this.totalQuestions) {
            this.gameOver();
            return;
        }
        
        this.question = this.extractQuestionFromMathFact(this.multiverseQuestion["question text"]);

        // Animate targets out before clearing game state
        if (this.targets.length > 0) {
            this.animateTargetsOut();
            // Wait for animation to complete before clearing and loading new content
            this.scene.time.delayedCall(800, () => {
                this.clearGameState();
                this.questionStartTime = Date.now();
                this.loadQuestionContent();
            });
        } else {
            // No targets to animate out, proceed immediately
            this.clearGameState();
            this.questionStartTime = Date.now();
            this.loadQuestionContent();
        }
    }

    private loadQuestionContent(): void {
        if (!this.question) return;
        
        // Reset question box to default
        this.updateQuestionBox('default');
        
        // Create question with input box instead of question mark
        this.createQuestionWithInputBox();
        
        // Create accessibility announcer early (needed for announcements before animation completes)
        this.createAccessibilityAnnouncer();
        
        this.createTargets();
        
        // Announce the question after targets are created and animation starts
        // This ensures the announcement happens after the previous question's feedback is done
        this.scene.time.delayedCall(600, () => {
            this.announceGameState();
        });
    }

    private createQuestionWithInputBox(): void {
        if (!this.question) return;
        
        // Clear previous question container if it exists
        if (this.questionContainer) {
            this.questionContainer.destroy();
        }
        
        // Create new question container
        this.questionContainer = this.scene.add.container(
            this.scene.getScaledValue(this.scene.display.width / 2), 
            this.scene.getScaledValue(this.scene.display.height - 57)
        );
        
        const answerLength = this.question.answer.length;
        
        const formattedOperand2 = Number(this.question.operand2) < 0 ? `(${i18n.formatNumber(+this.question.operand2)})` : i18n.formatNumber(+this.question.operand2);
        // Create question text without the answer part
        const questionPart = i18n.formatNumber(+this.question.operand1) + ' ' + this.question.operator + ' ' + formattedOperand2 + " = ";
        
        // Create the question text element
        const questionText = this.scene.addText(0, 0, questionPart, {
            font: "700 38px Exo",
            color: "#FFFFFF",
        }).setOrigin(0, 0.5);
        
        // Create a single underscore with width based on number of digits
        const underscoreText = "_".repeat(answerLength);
        
        this.inputText = this.scene.addText(
            0,
            0,
            underscoreText,
            {
                font: "700 38px Exo",
                color: "#FFFFFF",
            }
        ).setOrigin(0, 0.5);

        const totalWidth = questionText.displayWidth + this.inputText.displayWidth;
        const startX = -totalWidth/2;
        const gap = this.scene.getScaledValue(10);

        questionText.x = startX;
        this.inputText.x = startX + questionText.displayWidth + gap;
        
        this.questionContainer.add([questionText, this.inputText]);
    }


    /**
     * Clear previous game state for new question
     */
    private clearGameState(): void {
        // Clear targets and their overlays
        this.targets.forEach(target => {
            // Remove and destroy drum overlay
            const overlay = this.drumOverlays.get(target);
            if (overlay) {
                overlay.destroy();
                this.drumOverlays.delete(target);
            }
            target.destroy();
        });
        this.targets = [];
        this.targetData = []; // Clear target data
        
        // Clear accessibility elements
        if (this.drumSelectionIndicator) {
            this.drumSelectionIndicator.destroy();
            this.drumSelectionIndicator = undefined;
        }
        
        // Clear question container
        if (this.questionContainer) {
            this.questionContainer.destroy();
            this.questionContainer = undefined;
        }
        
        // Reset projectile but keep rubber band since it will be restored by repositionProjectile
        this.resetProjectile(false);
        
        // Clear any active animations
        this.isInteractionEnabled = false;
        
        // Clear trail effects
        this.clearTrailEffects();
        
        // Reset cursor to default
        this.scene.input.setDefaultCursor('default');
    }

    private gameOver(): void {
        const finalScore = this.scoreHelper.endGame();
        
        // Navigate to scoreboard after delay
        this.scene.time.delayedCall(2000, () => {
            this.scene.scene.start('ScoreboardScene', {
                score: finalScore,
                scoreData: {
                    correctAnswers: this.scoreHelper.getCorrectAnswers(),
                    totalQuestions: this.scoreHelper.getTotalQuestions()
                }
            });
        });
    }

    private showMascotCelebration(cb?: () => void) {
        this.scene.time.delayedCall(2000, () => {
            this.scene.scene.pause();
            this.scene.scene.launch('CelebrationScene', {
                scoreHelper: this.scoreHelper,
                progress: this.scoreHelper.getTotalQuestions() / this.totalQuestions,
                callback: () => {
                    cb?.();
                }
            });
            this.scene.scene.bringToTop('CelebrationScene');
        });
    }

    private resetGame(): void {
        // Clear game state
        this.clearGameState();
        this.isInteractionEnabled = false;
        
        // Reset projectile state
        this.projectileState = ProjectileState.IDLE;
        this.isLaunched = false;
        this.velocityX = 0;
        this.velocityY = 0;
        
        // Reset SDK components
        this.scoreHelper.reset();
        this.questionSelector?.reset();
    }

    // Button creation methods
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

    private createMuteButton(): void {
        this.muteButton = new MuteButton(
            this.scene,
            this.scene.display.width - 54,
            155
        );

        this.scene.events.on('update', () => {
            this.muteButton?.updateIcon(this.scene);
        }, this.scene);
    }

    private createVolumeSliderButton(): void {
        this.volumeSlider = new VolumeSlider(this.scene);
        this.volumeSlider.create(this.scene.display.width - 220, 220, 'purple', i18n.t('common.volume'));
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
                // Disable drum overlays focusability when help is opened
                this.disableDrumOverlaysFocusability();
                this.scene.scene.launch("InstructionsScene", { parentScene: "GameScene" });
                this.scene.scene.bringToTop("InstructionsScene");
            },
            raisedOffset: 3.5,
        }).setDepth(2);
    }

    // Public methods for instruction mode
    public getSlingshot(): Phaser.GameObjects.Container | undefined {
        return this.slingshot;
    }

    public getCurrentQuestion(): QuestionType | null {
        return this.question;
    }

    /**
     * Forces announcement of the current question state
     * Use this to ensure question is announced after scene transitions or state changes
     */
    public announceCurrentQuestion(): void {
        this.announceGameState();
    }

    public loadTutorialQuestion(): void {
        if (this.topic === 'grade2_topic4') {
            this.question = {
                operand1: "10",
                operand2: "2",
                operator: "-",
                answer: "8"
            };
        } else if (this.topic === 'grade3_topic2' || this.topic === 'grade3_topic3') {
            this.question = {
                operand1: "5",
                operand2: "2",
                operator: "×",
                answer: "10"
            };
        } else if (this.topic === 'grade3_topic4') {
            this.question = {
                operand1: "12",
                operand2: "2",
                operator: "÷",
                answer: "6"
            };
        }
        else if (this.topic === 'grade4_topic2') {
            this.question = {
                operand1: "1000",
                operand2: "200",
                operator: "+",
                answer: "1200"
            };
        } else if (this.topic === 'grade5_topic3') {
            this.question = {
                operand1: "10",
                operand2: "50",
                operator: "×",
                answer: "500"
            };
        } else if (this.topic === 'g5_g6' || this.topic === 'g7_g8') {
            if (this.mode === 'add') {
                this.question = {
                    operand1: "70",
                    operand2: "80",
                    operator: "+",
                    answer: "150"
                };
            } else if (this.mode === 'sub') {
                this.question = {
                    operand1: "150",
                    operand2: "70",
                    operator: "-",
                    answer: "80"
                };
            } else if (this.mode === 'mul') {
                this.question = {
                    operand1: "7",
                    operand2: "9",
                    operator: "×",
                    answer: "63"
                };
            } else if (this.mode === 'div') {
                this.question = {
                    operand1: "56",
                    operand2: "7",
                    operator: "÷",
                    answer: "8"
                };
            } else {
                this.question = {
                    operand1: "70",
                    operand2: "80",
                    operator: "+",
                    answer: "150"
                };
            }
        } else {
            this.question = {
                operand1: "9",
                operand2: "3",
                operator: "+",
                answer: "12"
            };
        }
        this.loadQuestionContent();
    }


    public setInteractionsEnabled(enabled: boolean): void {
        // Enable or disable interactions for instruction mode
        this.isInteractionEnabled = enabled;
        
        if (enabled) {
            // Ensure projectile is in IDLE state when enabling interactions
            this.projectileState = ProjectileState.IDLE;
        } else {
            // Reset step 2 audio completion flag when disabling interactions
            this.isStep2AudioCompleted = false;
        }
    }

    public playStep1(): void {
        // Step 1: Announce audio and zoom on question
        const step1 = this.scene.audioManager.playSoundEffect('step_1');
        
        TweenAnimations.pulse(this.scene, this.questionBox, 1.2, 1000, 1);
        step1?.on('complete', () => {
            this.scene.time.delayedCall(500, () => {
                this.playStep2();
            });
        });
    }

    public playStep2(): void {
        // Step 2: Show hand animation pointing to slingshot and play step2 audio
        const step2Audio = this.scene.audioManager.playSoundEffect('step_2');
        
        // Create hand animation pointing to slingshot
        const hand = this.scene.addImage(
            this.scene.getScaledValue(this.scene.display.width / 2 + 30), 
            this.scene.getScaledValue(this.scene.display.height - 200), 
            'hand'
        ).setScale(0.13)
        .setOrigin(0.5);
        hand.setDepth(10);
        
        // Animate hand pointing to slingshot
        this.scene.tweens.add({
            targets: hand,
            x: this.scene.getScaledValue(this.scene.display.width / 2 + 30),
            y: this.scene.getScaledValue(this.scene.display.height - 200),
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                // Show hand click and then drag down animation
                hand.setTexture('hand_click');
                this.scene.time.delayedCall(500, () => {
                    this.scene.tweens.add({
                        targets: hand,
                        y: this.scene.getScaledValue(this.scene.display.height - 150),
                        duration: 1000,
                        ease: 'Power2',
                        onComplete: () => {
                            hand.destroy();
                            this.setInteractionsEnabled(true);
                        }
                    });
                });
            }
        });
        
        // Mark step 2 audio as completed when the audio finishes
        if (step2Audio) {
            step2Audio.on('complete', () => {
                this.isStep2AudioCompleted = true;
            });
        }
    }

    public playStep3(): void {
        // Step 3: Play step3 audio and show play button
        this.scene.audioManager.playSoundEffect('step_3');
        this.questionContainer?.setVisible(false);
        this.createPlayButton();
    }

    private createPlayButton(): void {
        const playButton = ButtonHelper.createButton({
            scene: this.scene,
            imageKeys: {
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY,
            },
            text: i18n.t("common.play"),
            label: i18n.t("common.play"),
            textStyle: {
                font: "700 32px Exo",
                color: "#ffffff",
            },
            imageScale: 0.8,
            raisedOffset: 3.5,
            x: this.scene.display.width / 2,
            y: this.scene.display.height - 57,
            onClick: () => {
                this.scene.audioManager.stopAllSoundEffects();
                this.isSkipped = true;
                this.scene.scene.stop('InstructionsScene');
                this.scene.scene.start('GameScene');
            },
        });
        playButton.setDepth(20);

        ButtonHelper.startBreathingAnimation(playButton, {
            scale: 1.1,
            duration: 1000,
            ease: "Sine.easeInOut",
        });
    }

    // Accessibility Helper Methods
    private createDrumOverlay(targetContainer: Phaser.GameObjects.Container, _answer: number, index: number): void {
        // Get the drum image from the container (it's the first element)
        const drum = targetContainer.getAt(0) as Phaser.GameObjects.Image;
        if (!drum) return;

        // Create overlay for tab navigation and accessibility
        const overlay = new ImageOverlay(this.scene, drum, {
            label: `${i18n.t('accessibility.drumLabel', { value: _answer })}`,
            cursor: 'pointer',
        });
        
        this.drumOverlays.set(targetContainer, overlay);

        // Make it focusable via tab and add keyboard interaction
        const domElement = (overlay as any).domElement;
        if (domElement?.node) {
            const htmlElement = domElement.node as HTMLElement;
            htmlElement.setAttribute('tabindex', '0');
            htmlElement.setAttribute('role', 'button');
            
            // Remove default focus outline (blue rectangle)
            htmlElement.style.outline = 'none';
            
            // Track if this is keyboard navigation
            let isKeyboardNavigation = false;
            
            // Detect keyboard navigation (Tab key)
            htmlElement.addEventListener('keydown', (event: KeyboardEvent) => {
                if (event.key === 'Tab') {
                    isKeyboardNavigation = true;
                }
                
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.shootAtSelectedDrum();
                }
            });
            
            // Detect mouse interaction
            htmlElement.addEventListener('mousedown', () => {
                isKeyboardNavigation = false;
            });
            
            // Add focus event to select this drum
            htmlElement.addEventListener('focus', () => {
                this.selectedDrumIndex = index;
                // Only show yellow circle indicator on keyboard navigation
                if (isKeyboardNavigation) {
                    this.updateDrumSelection();
                    this.announceDrumSelection();
                }
                // Reset flag after handling
                isKeyboardNavigation = false;
            });
            
            // Clear indicator on blur
            htmlElement.addEventListener('blur', () => {
                if (this.drumSelectionIndicator) {
                    this.drumSelectionIndicator.destroy();
                    this.drumSelectionIndicator = undefined;
                }
            });
        }
    }

    private initializeAccessibility(): void {
        // Reset selection to first drum (but don't show visual indicator yet)
        this.selectedDrumIndex = 0;
        
        // Create accessibility announcer if not exists
        this.createAccessibilityAnnouncer();
        
        // Don't automatically focus on drums - let user tab to them naturally
        // Just announce the game state
        this.announceGameState();
    }

    private createAccessibilityAnnouncer(): void {
        // Check if we're in an iframe - if so, don't create local announcer
        // to avoid duplication (parent frame handles announcements)
        const inIframe = this.isInsideIframe();
        if (inIframe) {
            return;
        }
        
        if (!this.accessibilityAnnouncer) {
            // Create a hidden DOM element for screen reader announcements
            this.accessibilityAnnouncer = this.scene.add.dom(0, 0, 'div', {
                position: 'absolute',
                left: '-9999px',
                top: '-9999px',
                width: '1px',
                height: '1px',
                overflow: 'hidden'
            });
            this.accessibilityAnnouncer.node.setAttribute('aria-live', 'polite');
            this.accessibilityAnnouncer.node.setAttribute('aria-atomic', 'true');
        }
    }

    private announceGameState(): void {
        if (!this.question) return;
        
        // Map operators to spoken words for better screen reader support
        const operatorMap: Record<string, string> = {
            '+': 'plus',
            '−': 'minus',
            '-': 'minus',
            '×': 'times',
            '÷': 'divided by'
        };
        const spokenOperator = operatorMap[this.question.operator] || this.question.operator;
        
        const questionText = `${this.question.operand1} ${spokenOperator} ${this.question.operand2} equals`;
        this.announceToScreenReader(i18n.t('accessibility.questionAnnouncement', { 
            question: questionText, 
            instructions: i18n.t('accessibility.gameInstructions') 
        }));
    }

    private updateDrumSelection(): void {
        // Clear previous selection indicator
        if (this.drumSelectionIndicator) {
            this.drumSelectionIndicator.destroy();
            this.drumSelectionIndicator = undefined;
        }

        if (this.targets.length === 0 || this.selectedDrumIndex >= this.targets.length) return;

        const selectedTarget = this.targets[this.selectedDrumIndex];
        if (!selectedTarget) return;

        // Create selection indicator (glowing border around selected drum)
        this.drumSelectionIndicator = this.scene.add.graphics();
        this.drumSelectionIndicator.lineStyle(6, 0xFFFF00, 1); // Yellow border
        this.drumSelectionIndicator.strokeCircle(selectedTarget.x, selectedTarget.y, this.scene.getScaledValue(75));
        this.drumSelectionIndicator.setDepth(10); // Ensure it's on top

        // Add pulsing animation to make it more visible
        this.scene.tweens.add({
            targets: this.drumSelectionIndicator,
            alpha: 0.5,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    private announceDrumSelection(): void {
        if (this.targets.length === 0 || this.selectedDrumIndex >= this.targetData.length) return;

        const targetData = this.targetData[this.selectedDrumIndex];
        if (!targetData) return;

        const position = this.selectedDrumIndex + 1; // Convert to 1-based index for user
        this.announceToScreenReader(i18n.t('accessibility.drumSelection', { 
            position: position, 
            total: this.targets.length, 
            value: targetData.value 
        }));
    }

    private announceToScreenReader(message: string): void {
        // Check if we're in an iframe
        const inIframe = this.isInsideIframe();
        
        if (inIframe) {
            // Send announcement to parent frame via postMessage
            window.parent.postMessage({
                type: 'ANNOUNCE_TO_SCREEN_READER',
                message: message,
                ariaLive: 'assertive'
            }, '*');
        } else {
            // Ensure accessibility announcer exists
            if (!this.accessibilityAnnouncer) {
                this.createAccessibilityAnnouncer();
            }
            
            // Update the announcer content to trigger screen reader announcement
            if (this.accessibilityAnnouncer && this.accessibilityAnnouncer.node) {
                this.accessibilityAnnouncer.node.textContent = message;
            }
        }
    }

    private isInsideIframe(): boolean {
        try {
            return window.self !== window.top;
        } catch (e) {
            // Cross-origin error means we're in an iframe
            return true;
        }
    }

    /**
     * Disables tab focusability for all drum overlays
     * Used when help scene is opened to prevent background drums from being focused
     */
    public disableDrumOverlaysFocusability(): void {
        this.drumOverlays.forEach((overlay) => {
            const domElement = (overlay as any).domElement;
            if (domElement?.node) {
                const htmlElement = domElement.node as HTMLElement;
                htmlElement.setAttribute('tabindex', '-1');
            }
        });
    }

    /**
     * Enables tab focusability for all drum overlays
     * Used when help scene is closed to restore normal keyboard navigation
     */
    public enableDrumOverlaysFocusability(): void {
        this.drumOverlays.forEach((overlay) => {
            const domElement = (overlay as any).domElement;
            if (domElement?.node) {
                const htmlElement = domElement.node as HTMLElement;
                htmlElement.setAttribute('tabindex', '0');
            }
        });
    }

    private simulateProjectileHit(targetIndex: number): void {
        if (!this.isInteractionEnabled || targetIndex >= this.targets.length) return;

        // Set projectile state to prevent other interactions
        this.projectileState = ProjectileState.FLYING;
        this.isLaunched = true;

        // Play sound effects
        this.scene.audioManager.playSoundEffect('throw-stone');

        // Create visual effect of projectile moving to target
        const targetContainer = this.targets[targetIndex];
        const targetX = targetContainer.x;
        const targetY = targetContainer.y;

        if (this.projectile) {
            // Animate projectile to target position
            this.scene.tweens.add({
                targets: this.projectile,
                x: targetX,
                y: targetY,
                scale: 1.2,
                rotation: Math.PI * 2,
                duration: 800,
                ease: 'Power2',
                onComplete: () => {
                    // Simulate hit
                    this.projectileState = ProjectileState.IDLE;
                    this.isLaunched = false;
                    
                    // Trigger the hit logic
                    this.onProjectileHitTarget(targetContainer, targetIndex);
                }
            });
        } else {
            // If no projectile, just trigger hit immediately
            this.projectileState = ProjectileState.IDLE;
            this.isLaunched = false;
            this.onProjectileHitTarget(targetContainer, targetIndex);
        }
    }
}