import { BaseScene, ButtonHelper, QuestionSelectorHelper, ScoreHelper, ScoreCoins, i18n, GameConfigManager, getQuestionBankByLevel, VolumeSlider, Question, announceToScreenReader, TextOverlay, ButtonOverlay, focusToGameContainer, AnalyticsHelper } from "@k8-games/sdk";
import { ASSETS_PATHS, BUTTONS, SUCCESS_TEXT_KEYS, ERROR_TEXT_KEYS } from "../config/common";
import { ProgressBar } from "../components/ProgressBar";
import { ExpressionUtils } from "@k8-games/sdk";
import { DoorUtils } from "../utils/DoorUtils";
import { getGameSubtitle } from "../utils/helper";

export class StepEquations {
    private scene!: BaseScene;
    private totalQuestions: number = 10;
    private questionSelector: QuestionSelectorHelper;
    private currentQuestion?: any;
    private scoreHelper: ScoreHelper;
    private scoreCoins!: ScoreCoins;
    private previousStreak: number = 0;
    private isInstructionMode: boolean = false;
    private level: number = 1;
    private doorUtils!: DoorUtils;
    private isProcessing: boolean = false;

    // New properties for multi-step equations
    private currentLhs: string = '';
    private currentRhs: string = '';
    private currentCorrectAnswers: string[] = [];
    private isEquationSolved: boolean = false; // New flag to track if equation is solved
    
    public equations: Array<{
        lhs: Phaser.GameObjects.Container;
        rhs: Phaser.GameObjects.Container;
        equals: Phaser.GameObjects.Text;
    }> = [];

    public optionButtons: Phaser.GameObjects.Container[] = [];
    private operationIndicators: Phaser.GameObjects.Container[] = [];
    private errorBoard!: Phaser.GameObjects.Image;
    private successBoard!: Phaser.GameObjects.Image;
    private equationBg!: Phaser.GameObjects.Image;
    private gameConfigManager!: GameConfigManager;
    private topic!: string;
    private muteBtn!: Phaser.GameObjects.Container;
    private volumeSlider!: VolumeSlider;
    private progressBar!: ProgressBar;
    public titleText!: Phaser.GameObjects.Text;
    
    // Scroll area properties
    private scrollContainer!: Phaser.GameObjects.Container;
    private scrollMask!: Phaser.GameObjects.Graphics;
    private scrollArea!: Phaser.GameObjects.Rectangle;

    // Tutorial mode properties
    public isOptionsDisabled: boolean = false;
    
    // Current option color for consistency
    private currentOptionColor: string = '';

    private a11yAnnouncementQueue: string[] = [];
    private a11yIsAnnouncing: boolean = false;

    private analyticsHelper!: AnalyticsHelper;
    private gameSubtitle!: string;
    private selectedOperations: string[] = []; // Track sequence of selected operations

    constructor(scene: BaseScene, level: number, isInstructionMode: boolean = false, questionSelector?: QuestionSelectorHelper) {
        this.scene = scene;
        this.level = level;
        this.gameConfigManager = GameConfigManager.getInstance();
        this.topic = this.gameConfigManager.get('topic') || "grade6_topic4";
        this.isInstructionMode = isInstructionMode;
        
        if (questionSelector) {
            this.questionSelector = questionSelector;
        } else {
            const questionBank = getQuestionBankByLevel(this.topic, this.level);
            if (!questionBank) {
                throw new Error('Question bank not found');
            }
            this.questionSelector = new QuestionSelectorHelper(questionBank, this.totalQuestions);
        }
        
        this.scoreHelper = new ScoreHelper(2); // Base bonus of 2 for streaks
    }

    static _preload(scene: BaseScene) {
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen`);
        scene.load.image('equation_bg', 'equation_bg.png');

        scene.load.image('option_btn_blue', 'option_btn_blue.png');
        scene.load.image('option_btn_blue_hover', 'option_btn_blue_hover.png');
        scene.load.image('option_btn_blue_pressed', 'option_btn_blue_pressed.png');
        scene.load.image('option_btn_pink', 'option_btn_pink.png');
        scene.load.image('option_btn_pink_hover', 'option_btn_pink_hover.png');
        scene.load.image('option_btn_pink_pressed', 'option_btn_pink_pressed.png');
        scene.load.image('option_btn_purple', 'option_btn_purple.png');
        scene.load.image('option_btn_purple_hover', 'option_btn_purple_hover.png');
        scene.load.image('option_btn_purple_pressed', 'option_btn_purple_pressed.png');
        scene.load.image('option_btn_teal', 'option_btn_teal.png');
        scene.load.image('option_btn_teal_hover', 'option_btn_teal_hover.png');
        scene.load.image('option_btn_teal_pressed', 'option_btn_teal_pressed.png');

        scene.load.image('error_board_bg', 'error_board_bg.png');
        scene.load.image('success_board_bg', 'success_board_bg.png');
        scene.load.image('correct_icon', 'correct_icon.png');
        scene.load.image('incorrect_icon', 'incorrect_icon.png');

        scene.load.image('filled_dot', 'filled_dot.png');
        scene.load.image('red_dot', 'red_dot.png');

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}`);
        scene.load.audio('bg_music', 'bg_music.mp3');
        scene.load.audio('positive-sfx', 'positive.wav');
        scene.load.audio('negative-sfx', 'negative.wav');

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
                this.queueA11yAnnouncement(i18n.t('info.helpPage'));
            })
        }

        this.scene.addImage(this.scene.display.width / 2, this.scene.display.height / 2, `game_scene_bg_${this.level}`).setOrigin(0.5);
        this.equationBg = this.scene.addImage(638, 401, 'equation_bg').setOrigin(0.5);
        this.errorBoard = this.scene.addImage(this.scene.display.width / 2, 401, 'error_board_bg').setOrigin(0.5).setAlpha(0);
        this.successBoard = this.scene.addImage(this.scene.display.width / 2, 401, 'success_board_bg').setOrigin(0.5).setAlpha(0);

        // Create scroll area for equations
        this.createScrollArea();

        this.scene.audioManager.initialize(this.scene);
        this.doorUtils = new DoorUtils(this.scene);

        if(!this.isInstructionMode) {
            // Open doors
            this.doorUtils.openDoors();

            // Play background music
            this.scene.audioManager.playBackgroundMusic('bg_music');
            
            // Create score coins
            this.scoreCoins = new ScoreCoins(this.scene, this.scoreHelper, i18n, 'purple');
            this.scoreCoins.create(
                this.scene.getScaledValue(87),
                this.scene.getScaledValue(62)
            );

            // Create progress bar
            this.progressBar = new ProgressBar(this.scene);
            this.progressBar.create(76);

            // Create buttons
            this.createPauseButton();
            this.createMuteButton();
            this.createVolumeSlider();
            this.createHelpButton();
        }

        this.titleText = this.scene.addText(this.scene.display.width / 2, 218, this.formatForDisplay(i18n.t('stepEquations.solveForX')), {
            font: "500 20px Exo",
            color: "#000000",
        }).setOrigin(0.5);

        // Load first question
        this.loadNextQuestion();

        // Info text
        this.scene.addRectangle(this.scene.display.width / 2, this.scene.display.height - 19, this.scene.display.width, 38, 0x000006);
        const infoText = this.scene.addText(this.scene.display.width / 2, this.scene.display.height - 19, i18n.t('stepEquations.operationsApplyToBothSides'), {
            font: "500 16px Exo",
            color: "#ffffff",
        }).setOrigin(0.5);

        // Add accessibility overlay (no need to announce every time, just label)
        new TextOverlay(this.scene, infoText, {
            label: i18n.t('stepEquations.operationsApplyToBothSides')
        });
    }

    private createScrollArea(): void {
        // Create the scroll container that will hold all equations
        this.scrollContainer = this.scene.add.container(this.scene.getScaledValue(638.5), this.scene.getScaledValue(433.5));
        
        // Add an invisible rectangle to define the scroll area boundaries
        this.scrollArea = this.scene.addRectangle(0, 0, 939, 371, 0x000000, 0).setOrigin(0.5);
        this.scrollContainer.add(this.scrollArea);
        
        // Create a mask graphics with the same dimensions as the rectangle
        this.scrollMask = this.scene.add.graphics();
        this.scrollMask.setVisible(false);
        
        // Apply the mask to the scroll container
        this.scrollContainer.setMask(new Phaser.Display.Masks.GeometryMask(this.scene, this.scrollMask));
        
        // Initial draw of the mask
        this.updateScrollMask();
    }
    
    private updateScrollMask(): void {
        // Get the scroll area's world position and dimensions
        const matrix = this.scrollArea.getWorldTransformMatrix();
        const areaX = matrix.tx;
        const areaY = matrix.ty;
        const areaWidth = this.scrollArea.displayWidth;
        const areaHeight = this.scrollArea.displayHeight;
        
        // Update mask to match the scroll area
        this.scrollMask.clear();
        this.scrollMask.fillStyle(0xffffff);
        this.scrollMask.fillRect(
            areaX - areaWidth / 2,
            areaY - areaHeight / 2,
            areaWidth,
            areaHeight
        );
    }

    private queueA11yAnnouncement(message: string, priority: boolean = false) {
        if (priority) {
            // For priority announcements (like feedback), clear queue and add immediately
            this.a11yAnnouncementQueue = [message];
            this.a11yIsAnnouncing = false;
        } else {
            this.a11yAnnouncementQueue.push(message);
        }
        this.processA11yAnnouncementQueue();
    }

    private processA11yAnnouncementQueue() {
        if (this.a11yIsAnnouncing || this.a11yAnnouncementQueue.length === 0) {
            return;
        }
        this.a11yIsAnnouncing = true;
        const message = this.a11yAnnouncementQueue.shift()!;
        announceToScreenReader(message);

        // Estimate duration based on message length (similar to Shooter.ts)
        const words = message.split(' ').length;
        const estimatedDuration = (words / 2.5) * 1000; // 2.5 words/sec
        let delay = Math.max(estimatedDuration + 500, 2000); // Minimum 2 seconds

        setTimeout(() => {
            this.a11yIsAnnouncing = false;
            this.processA11yAnnouncementQueue();
        }, delay);
    }

    private scrollToNewestEquation(): void {
        if (this.equations.length === 0) return;
        
        // Get the newest equation (last in the array)
        const newestEquation = this.equations[this.equations.length - 1];
        
        // Get the Y position of the newest equation relative to the scroll container
        const newestEquationY = newestEquation.lhs.y / this.scene.display.scale;
        
        // Calculate the scroll area boundaries
        // const scrollAreaTop = -371/2; // Top of scroll area (container is centered)
        const scrollAreaBottom = 371/2; // Bottom of scroll area
        const equationHeight = 88; // Approximate height of an equation
        
        // Check if the newest equation would overflow the bottom of the scroll area
        const equationBottom = newestEquationY + equationHeight/2;
        const scrollAreaBottomBoundary = scrollAreaBottom - 20; // Leave some padding
        
        if (equationBottom > scrollAreaBottomBoundary) {
            // Calculate how much we need to scroll to show the newest equation
            const overflowAmount = equationBottom - scrollAreaBottomBoundary;
            const scrollAmount = overflowAmount + 20; // Add extra padding
            
            // Animate the scroll
            this.scene.tweens.add({
                targets: this.scrollContainer,
                y: this.scene.getScaledValue(433.5) - this.scene.getScaledValue(scrollAmount), // Move container up to scroll down
                duration: 500,
                ease: 'Power2'
            });
        }
    }

    private getContainerWidth(container: Phaser.GameObjects.Container): number {
        // Calculate the width of a container by getting the bounds of all its children
        let maxX = 0;
        let minX = 0;
        
        container.each((child: any) => {
            if (child.getBounds) {
                const bounds = child.getBounds();
                maxX = Math.max(maxX, bounds.right);
                minX = Math.min(minX, bounds.left);
            }
        });
        
        return maxX - minX;
    }

    private containsFractions(expression: string): boolean {
        return expression.includes('/') || expression.includes('÷');
    }

    private simplifyOperation(operation: string, number: string): string {
        // Simplify operations to avoid confusing options like "Add -2" or "Subtract -3"
        
        // Check if the number is a fraction
        if (number.includes('/')) {
            // For fractions, keep them as fractions
            if (operation === '+' && number.startsWith('-')) {
                // "Add -3/4" becomes "Subtract 3/4"
                return `- ${number.substring(1)}`;
            } else if (operation === '-' && number.startsWith('-')) {
                // "Subtract -3/4" becomes "Add 3/4"
                return `+ ${number.substring(1)}`;
            } else {
                // Keep the original operation for positive fractions
                return `${operation} ${number}`;
            }
        } else {
            // For non-fractions, use the original logic
            const num = parseFloat(number);
            
            if (operation === '+' && num < 0) {
                // "Add -2" becomes "Subtract 2"
                return `- ${Math.abs(num)}`;
            } else if (operation === '-' && num < 0) {
                // "Subtract -3" becomes "Add 3"
                return `+ ${Math.abs(num)}`;
            } else {
                // Keep the original operation for positive numbers
                return `${operation} ${Math.abs(num)}`;
            }
        }
    }

    private createExpressionWithFractions(x: number, y: number, expression: string, color: string = "#000000", fontSize: string = "46px", spacing: number = 10, fractionLinePadding: number = 30): Phaser.GameObjects.Container {
        // Format the expression for display
        const displayExpression = this.formatForDisplay(expression);
        
        // Check if the expression contains fractions
        const fractionRegex = /[x𝑥\d]+\/\d+/g;
        const hasFractions = fractionRegex.test(expression);
        
        if (hasFractions) {
                // Use ExpressionUtils to render with stacked fractions
            const expressionUtils = new ExpressionUtils(this.scene, x, y, displayExpression, {
                font: `700 ${fontSize} Exo`,
                fontColor: parseInt(color.replace('#', '0x')),
                lineHeight: 3,
                spacing,
                fractionLinePadding,
            });
            
            const container = expressionUtils.getContainer();
            // Store the original expression string for later use
            container.setData('originalExpression', expression);
            return container;
        } else {
            // No fractions, use regular text
            const container = this.scene.add.container(x, y);
            const text = this.scene.addText(0, 0, displayExpression, {
                font: `700 ${fontSize} Exo`,
                color: color,
            }).setOrigin(0.5);
            container.add(text);
            // Store the original expression string for later use
            container.setData('originalExpression', expression);
            return container;
        }
    }

    private checkEquationBounds(): boolean {
        // Check if any equation is going out of bounds
        const equationBgBounds = this.equationBg.getBounds();
        
        for (const equation of this.equations) {
            const lhsBounds = equation.lhs.getBounds();
            const rhsBounds = equation.rhs.getBounds();
            
            // Check if LHS or RHS is outside the equation background bounds vertically
            if (lhsBounds.top < equationBgBounds.top || lhsBounds.bottom > equationBgBounds.bottom ||
                rhsBounds.top < equationBgBounds.top || rhsBounds.bottom > equationBgBounds.bottom) {
                return true; // Out of bounds
            }
        }
        
        return false; // Within bounds
    }

    private adjustEquationLayout(): void {
        // Check if equations are out of bounds
        if (this.checkEquationBounds()) {
            // Reduce font size and adjust positioning for all equations except the first one
            this.equations.forEach((equation, index) => {
                const isFirstEquation = index === 0;
                const newFontSize = "40px";
                const newFractionLinePadding = 23; // Reduced from 30 to 15
                const yOffset = isFirstEquation ? 0 : -5; // Move non-first equations down by 10px
                
                // Get the original expressions
                const lhsExpression = equation.lhs.getData('originalExpression');
                const rhsExpression = equation.rhs.getData('originalExpression');
                
                // Destroy old containers
                equation.lhs.destroy();
                equation.rhs.destroy();
                
                // Create new containers with reduced font size and padding
                const newLhsContainer = this.createExpressionWithFractions(
                    0,
                    0,
                    lhsExpression, 
                    "#000000", 
                    newFontSize, 
                    10, // spacing
                    newFractionLinePadding
                );
                newLhsContainer.setPosition(equation.lhs.x, equation.lhs.y + this.scene.getScaledValue(yOffset));
                
                const newRhsContainer = this.createExpressionWithFractions(
                    0,
                    0,
                    rhsExpression, 
                    "#000000", 
                    newFontSize, 
                    10, // spacing
                    newFractionLinePadding
                );
                newRhsContainer.setPosition(equation.rhs.x, equation.rhs.y + this.scene.getScaledValue(yOffset));
                
                // Update the equation with new containers
                equation.lhs = newLhsContainer;
                equation.rhs = newRhsContainer;
                
                // Update equals sign
                equation.equals.setFont(`700 ${newFontSize} Exo`);
                equation.equals.setY(equation.equals.y + this.scene.getScaledValue(yOffset));
                
                // Update corresponding operation indicators
                const operationIndex = index * 2; // Each equation has 2 operation indicators (left and right)
                if (this.operationIndicators[operationIndex]) {
                    // Update left operation indicator
                    const leftIndicator = this.operationIndicators[operationIndex];
                    const leftExpression = leftIndicator.getData('originalExpression');
                    if (leftExpression) {
                        leftIndicator.destroy();
                        const newLeftIndicator = this.createExpressionWithFractions(
                            0,
                            0,
                            leftExpression,
                            "#0067DC",
                            newFontSize,
                            5, // spacing
                            newFractionLinePadding
                        );
                        newLeftIndicator.setPosition(leftIndicator.x, leftIndicator.y + this.scene.getScaledValue(yOffset));
                        this.operationIndicators[operationIndex] = newLeftIndicator;
                    }
                }
                
                if (this.operationIndicators[operationIndex + 1]) {
                    // Update right operation indicator
                    const rightIndicator = this.operationIndicators[operationIndex + 1];
                    const rightExpression = rightIndicator.getData('originalExpression');
                    if (rightExpression) {
                        rightIndicator.destroy();
                        const newRightIndicator = this.createExpressionWithFractions(
                            0,
                            0,
                            rightExpression,
                            "#0067DC",
                            newFontSize,
                            5, // spacing
                            newFractionLinePadding
                        );
                        newRightIndicator.setPosition(rightIndicator.x, rightIndicator.y + this.scene.getScaledValue(yOffset));
                        this.operationIndicators[operationIndex + 1] = newRightIndicator;
                    }
                }
            });
        }
    }

    private updateExpressionFontSize(container: Phaser.GameObjects.Container, newFontSize: string): void {
        // Update font size for all text elements in the container
        container.each((child: any) => {
            if (child instanceof Phaser.GameObjects.Text) {
                child.setFont(`700 ${newFontSize} Exo`);
            } else if (child instanceof Phaser.GameObjects.Container) {
                // Recursively update nested containers (for fractions)
                this.updateExpressionFontSize(child, newFontSize);
            }
        });
    }

    private createOption(x: number, y: number, option: string) {
        // Use the current option color for consistency
        const color = this.currentOptionColor;

        // Transform the option text to be more descriptive
        const transformedOption = this.transformOptionText(option);

        // Format the option text to for math symbols
        const formattedOption = this.formatForDisplay(transformedOption);

        // Create the button using ButtonHelper (now handles fractions automatically)
        const button = ButtonHelper.createButton({
            scene: this.scene,
            imageKeys: {
                default: `option_btn_${color}`,
                hover: `option_btn_${color}_hover`,
                pressed: `option_btn_${color}_pressed`,
            },
            padding: 25,
            text: formattedOption,
            label: formattedOption,
            textStyle: {
                font: "700 22px Exo",
                color: '#ffffff',
            },
            imageScale: 0.7,
            x,
            y,
            onClick: () => {
                if (this.isProcessing) return;
                this.createUpdatedEquation(option);
            }
        });
        
        // Set option data in button
        button.setData('option', option);

        this.optionButtons.push(button);
    }

    private transformOptionText(option: string): string {
        // Handle different mathematical operations
        if (option === 'distribute') {
            return i18n.t('stepEquations.distribute');
        } else if (/^distribute\s+(.+)$/i.test(option)) {
            const match = option.match(/^distribute\s+(.+)$/i)!;
            const number = match[1];
            // If we don't have a dedicated i18n with number, append number
            return `${i18n.t('stepEquations.distribute')} ${number}`;
        } else if (option.startsWith('-') || option.startsWith('–')) {
            const number = option.substring(1);
            return i18n.t('stepEquations.subtract', { number });
        } else if (option.startsWith('+')) {
            const number = option.substring(1);
            return i18n.t('stepEquations.add', { number });
        } else if (option.startsWith('×') || option.startsWith('*')) {
            const number = option.substring(1);
            return i18n.t('stepEquations.multiplyBy', { number });
        } else if (option.startsWith('÷') || option.startsWith('/')) {
            const number = option.substring(1);
            return i18n.t('stepEquations.divideBy', { number });
        }
        
        // If no operation symbol is found, return the original option
        return option;
    }

    private getAnalyticsSelectedOption(option: string): string {
        if (option === 'distribute') {
            return 'Distribute';
        } else if (/^distribute\s+(.+)$/i.test(option)) {
            const match = option.match(/^distribute\s+(.+)$/i)!;
            const number = match[1].trim(); 
            return `Distribute ${number}`;
        } else if (option.startsWith('-') || option.startsWith('–')) {
            const number = option.substring(1).trim(); 
            return `Subtract ${number}`;
        } else if (option.startsWith('+')) {
            const number = option.substring(1).trim(); 
            return `Add ${number}`;
        } else if (option.startsWith('×') || option.startsWith('*')) {
            const number = option.substring(1).trim(); 
            return `Multiply by ${number}`;
        } else if (option.startsWith('÷') || option.startsWith('/')) {
            const number = option.substring(1).trim(); 
            return `Divide by ${number}`;
        }
    
        return option;
    }

    private createUpdatedEquation(selectedOption: string): void {
        this.isProcessing = true;
        if (!this.currentQuestion || this.isOptionsDisabled) return;
        
        // Track the selected operation for analytics
        if (!this.isInstructionMode) {
            this.selectedOperations.push(this.getAnalyticsSelectedOption(selectedOption));
        }
        
        console.log(`Current equation: ${this.currentLhs} = ${this.currentRhs}`);
        console.log(`Selected operation: ${selectedOption}`);
        console.log(`Correct answers: ${this.currentCorrectAnswers}`);
        
        // Check if the selected option is correct
        const normalizedSelectedOption = selectedOption.replace(/[−–—]/g, '-').trim();
        const isCorrect = this.currentCorrectAnswers.some(answer => {
            const normalizedAnswer = answer.replace(/[−–—]/g, '-').trim();
            return normalizedSelectedOption === normalizedAnswer;
        });
        
        if (isCorrect) {
            console.log("Correct!");
            
            // Store original values for operation indicator
            const originalLhs = this.currentLhs;
            const originalRhs = this.currentRhs;
            
            let newLhs = this.currentLhs;
            let newRhs = this.currentRhs;
            
            // Parse the operation and number from the selected option
            if (selectedOption === 'distribute' || selectedOption.toLowerCase().startsWith('distribute')) {
                newLhs = this.distributeExpression(this.currentLhs);
                newRhs = this.distributeExpression(this.currentRhs);
            } else if (selectedOption.startsWith('-') || selectedOption.startsWith('–')) {
                const number = selectedOption.substring(1).trim();
                // Check if we're subtracting an x-term
                if (number.includes('x')) {
                    newLhs = this.subtractXTerm(this.currentLhs, number);
                    newRhs = this.subtractXTerm(this.currentRhs, number);
                } else {
                    newLhs = this.subtractFromExpression(this.currentLhs, number);
                    newRhs = this.subtractFromExpression(this.currentRhs, number);
                }
            } else if (selectedOption.startsWith('+')) {
                const number = selectedOption.substring(1).trim();
                // Check if we're adding an x-term
                if (number.includes('x')) {
                    newLhs = this.addXTerm(this.currentLhs, number);
                    newRhs = this.addXTerm(this.currentRhs, number);
                } else {
                    newLhs = this.addToExpression(this.currentLhs, number);
                    newRhs = this.addToExpression(this.currentRhs, number);
                }
            } else if (selectedOption.startsWith('×') || selectedOption.startsWith('*')) {
                const number = selectedOption.substring(1).trim();
                newLhs = this.multiplyExpression(this.currentLhs, number);
                newRhs = this.multiplyExpression(this.currentRhs, number);
            } else if (selectedOption.startsWith('÷') || selectedOption.startsWith('/')) {
                const number = selectedOption.substring(1).trim();
                newLhs = this.divideExpression(this.currentLhs, number);
                newRhs = this.divideExpression(this.currentRhs, number);
            }

            console.log(`New equation: ${newLhs} = ${newRhs}`);
            
            // Simplify the expressions
            newLhs = this.simplifyExpression(newLhs);
            newRhs = this.simplifyExpression(newRhs);

            // Ensure neither side is empty; if empty, treat as 0
            if (!newLhs || newLhs.trim() === '') newLhs = '0';
            if (!newRhs || newRhs.trim() === '') newRhs = '0';

            console.log(`Simplified equation: ${newLhs} = ${newRhs}`);
            
            // Update current equation state
            this.currentLhs = newLhs;
            this.currentRhs = newRhs;
            
            // Check if equation is solved (x = ? or ? = x)
            // Also check if we have a simple numeric equation (no x terms)
            const isSolved = (newLhs === 'x' && !newRhs.includes('x')) || 
                            (newRhs === 'x' && !newLhs.includes('x')) ||
                            (!newLhs.includes('x') && !newRhs.includes('x'));
            
            // Reduce opacity of all previous equations and add operation indicators
            this.equations.forEach(equation => {
                // For containers, we need to set alpha on all children
                equation.lhs.each((child: any) => {
                    if (child.setAlpha) {
                        child.setAlpha(0.5);
                    }
                });
                equation.rhs.each((child: any) => {
                    if (child.setAlpha) {
                        child.setAlpha(0.5);
                    }
                });
                equation.equals.setAlpha(0.5);
            });

            // Add operation indicator only to the last equation (the previous step)
            if (this.equations.length > 0) {
                const lastEquation = this.equations[this.equations.length - 1];
                this.addOperationIndicator(lastEquation, selectedOption, originalLhs, originalRhs);
            }
            
            // Display the updated equation
            const padding = 10;
            const baseEquationHeight = 88;
            const fractionSpacing = 120; // Extra spacing when both equations have fractions
            
            // Check if the new equation contains fractions
            const newEquationHasFractions = this.containsFractions(newLhs) || this.containsFractions(newRhs);
            
            // Check if the previous equation (if it exists) contains fractions
            let previousEquationHasFractions = false;
            if (this.equations.length > 0) {
                const previousEquation = this.equations[this.equations.length - 1];
                const previousLhsExpression = previousEquation.lhs.getData('originalExpression');
                const previousRhsExpression = previousEquation.rhs.getData('originalExpression');
                previousEquationHasFractions = this.containsFractions(previousLhsExpression) || this.containsFractions(previousRhsExpression);
            }
            
            // Use extra spacing only when both new and previous equations have fractions
            const useExtraSpacing = newEquationHasFractions && previousEquationHasFractions;
            const equationHeight = useExtraSpacing ? fractionSpacing : baseEquationHeight;
            
            // Calculate total spacing for all previous equations using default spacing
            const totalSpacing = this.equations.length * baseEquationHeight;
            
            const newY = -371/2 + padding + equationHeight/2 + totalSpacing;
            
            // Add the new equation text
            const newLhsContainer = this.createExpressionWithFractions(0, 0, newLhs);
            const newLhsWidth = this.getContainerWidth(newLhsContainer) / this.scene.display.scale;
            const newRhsContainer = this.createExpressionWithFractions(0, 0, newRhs);
            const newRhsWidth = this.getContainerWidth(newRhsContainer) / this.scene.display.scale;
            
            // Center the equation horizontally within the scroll container
            const centerX = 0; // Container center is at (0,0) since we set origin to center
            
            // Add all elements to the scroll container first
            this.scrollContainer.add(newLhsContainer);
            this.scrollContainer.add(newRhsContainer);
            
            const newEqualsText = this.scene.addText(0, 0, "=", {
                font: "700 46px Exo",
                color: "#000000",
            }).setOrigin(0.5);
            this.scrollContainer.add(newEqualsText);
            
            // Set positions after adding to container
            newLhsContainer.setPosition(this.scene.getScaledValue(centerX - 62 - newLhsWidth/2), this.scene.getScaledValue(newY));
            newRhsContainer.setPosition(this.scene.getScaledValue(centerX + 62 + newRhsWidth/2), this.scene.getScaledValue(newY));
            newEqualsText.setPosition(this.scene.getScaledValue(centerX - 2), this.scene.getScaledValue(newY));
            
            // Store the new equation
            this.equations.push({
                lhs: newLhsContainer,
                rhs: newRhsContainer,
                equals: newEqualsText
            });

            // Auto-scroll to show the newest equation
            this.scrollToNewestEquation();

            // Emit correct answer event for tutorial
            if(this.isInstructionMode) {
                this.scene.events.emit('correctanswer', {isCorrect: true});
            }
            
            if (isSolved) {
                // Equation is solved, mark it and show success animation
                this.isEquationSolved = true;
                
                // Restore focus to game container to ensure announcements are heard
                focusToGameContainer();
                this.queueA11yAnnouncement(this.getReadableEquation(this.currentLhs, this.currentRhs));

                this.showSuccessAnimation();

                if (this.scoreHelper.showStreakAnimation()) {
                    this.showMascotCelebration();
                }
            } else {
                // Generate new options for the updated equation
                this.generateNewOptions();
                
                // Restore focus to game container to ensure announcements are heard
                focusToGameContainer();
                
                // Show success animation for intermediate steps
                // Pass isIntermediate=true to avoid clearing the announcement queue
                this.showSuccessAnimation(true);
                
                // Queue the equation announcement after success feedback
                this.scene.time.delayedCall(1500, () => {
                    this.queueA11yAnnouncement(this.getReadableEquation(this.currentLhs, this.currentRhs));
                });
            }
        } else {
            console.log("Incorrect!");
            // Restore focus to game container to ensure announcements are heard
            focusToGameContainer();
            this.showErrorAnimation();
        }
    }

    private subtractFromExpression(expression: string, number: string): string {
        // Handle subtraction for different expression types
        if (expression.includes('x')) {
            // Early check for pure x-terms (e.g., "x", "-x", "3x", "-3x")
            // to prevent falling through to parseInt which would give NaN
            const pureXMatch = expression.trim().match(/^(-?\d*)x$/);
            if (pureXMatch) {
                const result = `${expression} - ${number}`;
                console.log('[subtractFromExpression] Pure x-term result:', result);
                return result;
            }
            
            // Check if we're subtracting an x term (e.g., "-x" or "-3x")
            if (number.includes('x')) {
                return this.subtractXTerm(expression, number);
            }
            
            // Handle complex fraction expressions like "(x+2)/4+1"
            const complexFractionMatch = expression.match(/^\(([^)]+)\)\/(\d+)\+(\d+)$/);
            if (complexFractionMatch) {
                const numerator = complexFractionMatch[1].trim();
                const denominator = complexFractionMatch[2];
                const constant = parseInt(complexFractionMatch[3]);
                const newConstant = constant - parseInt(number);
                
                if (newConstant === 0) {
                    return `(${numerator})/${denominator}`;
                } else if (newConstant > 0) {
                    return `(${numerator})/${denominator}+${newConstant}`;
                } else {
                    return `(${numerator})/${denominator}-${Math.abs(newConstant)}`;
                }
            }
            
            // For expressions like "x + 5" or "10 + 8x", subtract from the constant term
            if (expression.includes('+')) {
                const parts = expression.split('+');
                const firstPart = parts[0].trim();
                const secondPart = parts[1].trim();
                
                // Enhanced x-term detection: handles x, -x, 3x, x/4, -x/4, 2x/3
                const isXTerm = (term: string) => {
                    const t = term.replace(/\s+/g, '');
                    return (
                        /^-?\d*x$/.test(t) || // 3x, -2x, x
                        /^-?x(?:\/\d+)?$/.test(t) || // x, -x, x/4, -x/4
                        /^-?\d+x(?:\/\d+)?$/.test(t) // 2x, 2x/3, -2x/3
                    );
                };
                const absStr = (val: string) => (val.startsWith('-') ? val.substring(1) : val);
                const subtractNumberStrings = (a: string, b: string): string => {
                    if (a.includes('/') || b.includes('/')) {
                        return this.subtractFractions(a, b);
                    }
                    const result = parseFloat(a);
                    const subtrahend = parseFloat(b);
                    const diff = result - subtrahend;
                    if (Math.abs(diff) === 0) return '0';
                    return Number.isInteger(diff) ? diff.toString() : diff.toString();
                };
                
                // Case: constant + x-term (e.g., "10 + x" or "5/4 + x" or "3 + x/4")
                if (!isXTerm(firstPart) && isXTerm(secondPart)) {
                    const diff = subtractNumberStrings(firstPart, number);
                    if (diff === '0') {
                        return secondPart; // constant cancels, leave x-term
                    }
                    return diff.startsWith('-') ? `${secondPart} - ${absStr(diff)}` : `${diff} + ${secondPart}`;
                }

                // Case: x-term + constant (e.g., "x + 5" or "3x + 2" or "x/4 + 3")
                if (isXTerm(firstPart) && !isXTerm(secondPart)) {
                    const diff = subtractNumberStrings(secondPart, number);
                    if (diff === '0') {
                        return firstPart; // constant cancels, leave x-term
                    }
                    return diff.startsWith('-') ? `${firstPart} - ${absStr(diff)}` : `${firstPart} + ${diff}`;
                }
                
                // Fallback to previous behavior if pattern not recognized
                const xPart = firstPart;
                const constantPart = secondPart;
                const newConstant = parseInt(constantPart) - parseInt(number);
                if (newConstant === 0) {
                    return xPart;
                }
                return newConstant > 0 ? `${xPart} + ${newConstant}` : `${xPart} - ${Math.abs(newConstant)}`;
            } else if (expression.includes('-') || expression.includes('–') || /[−–—]/g.test(expression)) {
                // Handle minus, en-dash, and unicode minus
                const dashMatch = expression.match(/[−–—]/);
                const dashChar = dashMatch ? dashMatch[0] : '-';
                const parts = expression.includes('-') ? expression.split('-') : expression.split(dashChar);
                const firstPart = parts[0].trim();
                const secondPart = parts[1].trim();

                // Enhanced x-term detection (x, -x, 3x, -3x, x/4, 2x/3)
                const isXTerm = (term: string) => {
                    const t = term.replace(/\s+/g, '');
                    return (
                        /^-?\d*x$/.test(t) ||
                        /^-?x(?:\/\d+)?$/.test(t) ||
                        /^-?\d+x(?:\/\d+)?$/.test(t)
                    );
                };
                const absStr = (val: string) => (val.startsWith('-') ? val.substring(1) : val);
                const subtractNumberStrings = (a: string, b: string): string => {
                    if (a.includes('/') || b.includes('/')) {
                        return this.subtractFractions(a, b);
                    }
                    const result = parseFloat(a) - parseFloat(b);
                    if (Math.abs(result) === 0) return '0';
                    return Number.isInteger(result) ? result.toString() : result.toString();
                };
                const addNumberStrings = (a: string, b: string): string => {
                    if (a.includes('/') || b.includes('/')) {
                        return this.addFractions(a, b);
                    }
                    const sum = parseFloat(a) + parseFloat(b);
                    if (Math.abs(sum) === 0) return '0';
                    return Number.isInteger(sum) ? sum.toString() : sum.toString();
                };

                // Debug for minus-branch handling
                console.log('[subtractFromExpression][minus]', { expression, number, firstPart, secondPart, isFirstXTerm: isXTerm(firstPart), isSecondXTerm: isXTerm(secondPart) });

                // Case: x-term - constant (e.g., "x - 5" or "3x - 2")
                if (isXTerm(firstPart) && !isXTerm(secondPart)) {
                    const newConst = addNumberStrings(secondPart, number); // constant + number
                    if (newConst === '0') {
                        return firstPart; // x - 0 -> x
                    }
                    return newConst.startsWith('-') ? `${firstPart} + ${absStr(newConst)}` : `${firstPart} - ${newConst}`;
                }

                // Case: constant - x-term (e.g., "30 - x" or "28 - 3x")
                if (!isXTerm(firstPart) && isXTerm(secondPart)) {
                    const diff = subtractNumberStrings(firstPart, number); // constant - number
                    if (diff === '0') {
                        // 0 - x-term => negative of x-term
                        return secondPart.startsWith('-') ? secondPart.substring(1) : `-${secondPart}`;
                    }
                    return `${diff} - ${secondPart}`;
                }

                // Fallback to previous behavior if pattern not recognized
                const xPart = firstPart;
                const constantPart = secondPart;
                const newConstant = parseInt(constantPart) + parseInt(number);
                return `${xPart} - ${newConstant}`;
            } else {
                // Just "x", add negative constant
                return `${expression} - ${number}`;
            }
        } else {
            // For numeric expressions, perform direct subtraction
            // Handle fractions properly
            if (expression.includes('/') || number.includes('/')) {
                return this.subtractFractions(expression, number);
            } else {
                const result = parseInt(expression) - parseInt(number);
                return result.toString();
            }
        }
    }

    private subtractFractions(expression: string, number: string): string {
        // Parse the first fraction
        let firstNum: number, firstDen: number;
        if (expression.includes('/')) {
            const [num, den] = expression.split('/').map(n => parseInt(n));
            firstNum = num;
            firstDen = den;
        } else {
            firstNum = parseInt(expression);
            firstDen = 1;
        }
        
        // Parse the second fraction
        let secondNum: number, secondDen: number;
        if (number.includes('/')) {
            const [num, den] = number.split('/').map(n => parseInt(n));
            secondNum = num;
            secondDen = den;
        } else {
            secondNum = parseInt(number);
            secondDen = 1;
        }
        
        // Perform fraction subtraction: a/b - c/d = (a*d - b*c)/(b*d)
        const resultNum = firstNum * secondDen - firstDen * secondNum;
        const resultDen = firstDen * secondDen;
        
        // Simplify the result
        return this.simplifyFraction(resultNum, resultDen);
    }

    private subtractXTerm(expression: string, xTerm: string): string {
        // Handle subtracting x terms like "-x" or "-3x"
        // Examples: "3x+5" - "x" = "2x+5", "x+3" - "x" = "3"
        
        const currentXCoeff = this.getXCoefficient(expression);
        const subtractXCoeff = this.getXCoefficient(xTerm);
        
        const newXCoeff = currentXCoeff - subtractXCoeff;
        
        // Special case: if the original expression is just an x-term (no constant)
        if (expression.match(/^-?\d*x$/)) {
            return `${newXCoeff}x`;
        }
        
        // Extract the constant part from the original expression
        let constantPart = '0';
        
        
        // Handle different expression formats
        if (expression.includes('+')) {
            const parts = expression.split('+');
            if (parts[0].includes('x')) {
                // Format: "3x+5" -> constant is "5"
                constantPart = parts[1].trim();
            } else {
                // Format: "5+3x" -> constant is "5"
                constantPart = parts[0].trim();
            }
        } else if (expression.includes('-') || expression.includes('–')) {
            // Handle subtraction format like "3x-5"
            const dashMatch = expression.match(/[−–]/);
            const dashChar = dashMatch ? dashMatch[0] : '-';
            const parts = expression.split(dashChar);
            if (parts[0].includes('x')) {
                // Format: "3x-5" -> constant is "-5"
                constantPart = `-${parts[1].trim()}`;
            } else {
                // Format: "5-3x" -> constant is "5"
                constantPart = parts[0].trim();
            }
        } else if (expression === 'x') {
            constantPart = '0';
        } else if (!expression.includes('x')) {
            // Just a number
            constantPart = expression;
        }
        
        // Normalize empty/zero constant part to '0'
        const normalizeConstantPart = (val: string): string => {
            const t = (val || '').trim();
            if (t === '' || t === '0' || t === '+0' || t === '-0') return '0';
            return t;
        };
        constantPart = normalizeConstantPart(constantPart);

        // Build the new expression
        if (newXCoeff === 0) {
            // No x term left
            return constantPart === '0' ? '0' : constantPart;
        } else if (newXCoeff === 1) {
            // Just x
            if (constantPart === '0') {
                return 'x';
            } else if (constantPart.startsWith('-')) {
                return `x - ${constantPart.substring(1)}`;
            } else {
                return `x + ${constantPart}`;
            }
        } else if (newXCoeff === -1) {
            // Negative x
            if (constantPart === '0') {
                return '-x';
            } else if (constantPart.startsWith('-')) {
                return `-x - ${constantPart.substring(1)}`;
            } else {
                return `-x + ${constantPart}`;
            }
        } else {
            // Multiple x
            if (constantPart === '0' || constantPart === '') {
                return `${newXCoeff}x`;
            } else if (constantPart.startsWith('-')) {
                return `${newXCoeff}x - ${constantPart.substring(1)}`;
            } else {
                return `${newXCoeff}x + ${constantPart}`;
            }
        }
    }

    private addToExpression(expression: string, number: string): string {
        // Handle addition for different expression types
        if (expression.includes('x')) {
            // Early case: pure x-term with optional coefficient (e.g., "x", "-x", "3x", "-3x")
            const pureXMatch = expression.trim().match(/^(-?\d*)x$/);
            if (pureXMatch) {
                const result = `${expression} + ${number}`;
                return result;
            }
            // Check if we're adding an x term (e.g., "+x" or "+3x")
            if (number.includes('x')) {
                return this.addXTerm(expression, number);
            }
            
            // Check for expressions with negative coefficients like "-11x - 11"
            const negativeCoeffMatch = expression.match(/^(-?\d+)x\s*([+\-–−])\s*(-?\d+)$/);
            if (negativeCoeffMatch) {
                const coefficient = parseInt(negativeCoeffMatch[1]);
                const operator = negativeCoeffMatch[2];
                const constant = parseInt(negativeCoeffMatch[3]);
                
                // Calculate the actual constant value based on the operator
                let actualConstant: number;
                if (operator === '+') {
                    actualConstant = constant;
                } else {
                    actualConstant = -constant;
                }
                
                // Add the number to the constant
                const newConstant = actualConstant + parseInt(number);
                
                // Reconstruct the expression
                if (newConstant === 0) {
                    return `${coefficient}x`;
                } else if (newConstant > 0) {
                    return `${coefficient}x + ${newConstant}`;
                } else {
                    return `${coefficient}x - ${Math.abs(newConstant)}`;
                }
            }
            
            // For expressions with plus, handle both orders: "x + C" and "C + x"
            if (expression.includes('+')) {
                const parts = expression.split('+');
                const firstPart = parts[0].trim();
                const secondPart = parts[1].trim();

                // Enhanced x-term detection: x, -x, 3x, -3x, x/4, 2x/3
                const isXTerm = (term: string) => {
                    const t = term.replace(/\s+/g, '');
                    return (
                        /^-?\d*x$/.test(t) ||
                        /^-?x(?:\/\d+)?$/.test(t) ||
                        /^-?\d+x(?:\/\d+)?$/.test(t)
                    );
                };
                const absStr = (val: string) => (val.startsWith('-') ? val.substring(1) : val);
                const addNumberStrings = (a: string, b: string): string => {
                    if (a.includes('/') || b.includes('/')) {
                        return this.addFractions(a, b);
                    }
                    const sum = parseFloat(a) + parseFloat(b);
                    if (Math.abs(sum) === 0) return '0';
                    return Number.isInteger(sum) ? sum.toString() : sum.toString();
                };

                // Case: constant + x-term (e.g., "-30 + x")
                if (!isXTerm(firstPart) && isXTerm(secondPart)) {
                    const sum = addNumberStrings(firstPart, number);
                    if (sum === '0') {
                        return secondPart; // constant cancels, leave x-term
                    }
                    return sum.startsWith('-') ? `${secondPart} - ${absStr(sum)}` : `${sum} + ${secondPart}`;
                }

                // Case: x-term + constant (e.g., "x + 5" or "3x + 2")
                if (isXTerm(firstPart) && !isXTerm(secondPart)) {
                    const sum = addNumberStrings(secondPart, number);
                    if (sum === '0') {
                        return firstPart; // constant cancels, leave x-term
                    }
                    return sum.startsWith('-') ? `${firstPart} - ${absStr(sum)}` : `${firstPart} + ${sum}`;
                }

                // Fallback: previous behavior assuming x then constant
                const xPart = parts[0].trim();
                const constantPart = parts[1].trim();
                const newConstant = parseInt(constantPart) + parseInt(number);
                return `${xPart} + ${newConstant}`;
            } else if (expression.includes('-') || expression.includes('–') || /[−–—]/g.test(expression)) {
                // Robust handling for expressions with a minus: supports forms like "x - C", "-x - C", and "C - x"
                const normalized = expression.replace(/[−–]/g, '-').trim();
                
                // Helpers
                const isXTerm = (term: string) => {
                    const t = term.replace(/\s+/g, '');
                    return (/^[-+]?\d*x$/.test(t) || /^[-+]?x$/.test(t));
                };
                const absStr = (val: string) => (val.startsWith('-') ? val.substring(1) : val);
                const addNumberStrings = (a: string, b: string): string => {
                    if (a.includes('/') || b.includes('/')) return this.addFractions(a, b);
                    const sum = parseFloat(a) + parseFloat(b);
                    if (Math.abs(sum) === 0) return '0';
                    return Number.isInteger(sum) ? sum.toString() : sum.toString();
                };
                const subtractNumberStrings = (a: string, b: string): string => {
                    if (a.includes('/') || b.includes('/')) return this.subtractFractions(a, b);
                    const diff = parseFloat(a) - parseFloat(b);
                    if (Math.abs(diff) === 0) return '0';
                    return Number.isInteger(diff) ? diff.toString() : diff.toString();
                };
                
                // Pattern A: x-term - constant  e.g., "x - 7", "-x - 7", "3x - 2"
                let m = normalized.match(/^([-+]?\d*x)\s*-\s*(\d+(?:\/\d+)?|\d+(?:\.\d+)?)$/);
                if (m) {
                    const xTerm = m[1];
                    const constantStr = m[2];
                    const newConst = subtractNumberStrings(constantStr, number); // C - N
                    if (newConst === '0') return xTerm; // x - 0 => x
                    // x - newConst (if newConst < 0 -> x + |newConst|)
                    return newConst.startsWith('-') ? `${xTerm} + ${absStr(newConst)}` : `${xTerm} - ${newConst}`;
                }
                
                // Pattern B: constant - x-term  e.g., "30 - x", "28 - 3x"
                m = normalized.match(/^(\d+(?:\/\d+)?|\d+(?:\.\d+)?)\s*-\s*([-+]?\d*x)$/);
                if (m) {
                    const constantStr = m[1];
                    const xTerm = m[2];
                    const sum = addNumberStrings(constantStr, number); // A + N
                    if (sum === '0') {
                        // 0 - xTerm => negative of xTerm
                        return xTerm.startsWith('-') ? xTerm.substring(1) : `-${xTerm}`;
                    }
                    return `${sum} - ${xTerm}`;
                }
                
                // Fallback: keep old simplistic behavior as last resort
                const dashChar = normalized.includes('-') ? '-' : '–';
                const parts = normalized.split(dashChar);
                const firstPart = parts[0].trim();
                const secondPart = (parts[1] || '').trim();
                if (isXTerm(firstPart) && secondPart) {
                    const newConstant = subtractNumberStrings(secondPart, number);
                    if (newConstant === '0') return firstPart;
                    return newConstant.startsWith('-') ? `${firstPart} + ${absStr(newConstant)}` : `${firstPart} - ${newConstant}`;
                }
                if (!isXTerm(firstPart) && isXTerm(secondPart)) {
                    const sum = addNumberStrings(firstPart, number);
                    if (sum === '0') return secondPart.startsWith('-') ? secondPart.substring(1) : `-${secondPart}`;
                    return `${sum} - ${secondPart}`;
                }
                
                // If still not matched, return original expression with appended addition (safe fallback)
                return `${expression} + ${number}`;
            } else {
                // Just "x", add positive constant
                return `${expression} + ${number}`;
            }
        } else {
            // For numeric expressions, perform direct addition
            // Handle fractions properly
            if (expression.includes('/') || number.includes('/')) {
                return this.addFractions(expression, number);
            } else {
                const result = parseInt(expression) + parseInt(number);
                return result.toString();
            }
        }
    }

    private addFractions(expression: string, number: string): string {
        // Parse the first fraction
        let firstNum: number, firstDen: number;
        if (expression.includes('/')) {
            const [num, den] = expression.split('/').map(n => parseInt(n));
            firstNum = num;
            firstDen = den;
        } else {
            firstNum = parseInt(expression);
            firstDen = 1;
        }
        
        // Parse the second fraction
        let secondNum: number, secondDen: number;
        if (number.includes('/')) {
            const [num, den] = number.split('/').map(n => parseInt(n));
            secondNum = num;
            secondDen = den;
        } else {
            secondNum = parseInt(number);
            secondDen = 1;
        }
        
        // Perform fraction addition: a/b + c/d = (a*d + b*c)/(b*d)
        const resultNum = firstNum * secondDen + firstDen * secondNum;
        const resultDen = firstDen * secondDen;
        
        // Simplify the result
        return this.simplifyFraction(resultNum, resultDen);
    }

    private addXTerm(expression: string, xTerm: string): string {
        // Handle adding x terms like "+x" or "+3x"
        // Examples: "2x+5" + "x" = "3x+5", "3" + "x" = "x+3"
        
        const currentXCoeff = this.getXCoefficient(expression);
        const addXCoeff = this.getXCoefficient(xTerm);
        
        const newXCoeff = currentXCoeff + addXCoeff;
        
        // Extract the constant part from the original expression
        let constantPart = '0';
        const normalizedExpr = expression.replace(/[−–]/g, '-').trim();
        // Prefer robust regex capture: x-term +/- constant (e.g., "-x - 6", "3x + 2")
        const complexMatch = normalizedExpr.match(/^([+\-]?\d*)x\s*([+\-])\s*(\d+(?:\/\d+)?|\d+(?:\.\d+)?)$/);
        if (complexMatch) {
            const op = complexMatch[2];
            const constStr = complexMatch[3];
            constantPart = op === '+' ? constStr : `-${constStr}`;
        }
        
        // Handle different expression formats
        if (constantPart !== '0') {
            // already extracted
        } else if (expression.includes('+')) {
            const parts = expression.split('+');
            if (parts[0].includes('x')) {
                // Format: "3x+5" -> constant is "5"
                constantPart = parts[1].trim();
            } else {
                // Format: "5+3x" -> constant is "5"
                constantPart = parts[0].trim();
            }
        } else if (expression.includes('-') || expression.includes('–')) {
            // Handle subtraction format like "3x-5"
            const dashMatch = expression.match(/[−–]/);
            const dashChar = dashMatch ? dashMatch[0] : '-';
            const parts = expression.split(dashChar);
            if (parts[0].includes('x')) {
                // Format: "3x-5" -> constant is "-5"
                constantPart = `-${parts[1].trim()}`;
            } else {
                // Format: "5-3x" -> constant is "5"
                constantPart = parts[0].trim();
            }
        } else if (expression === 'x') {
            constantPart = '0';
        } else if (!expression.includes('x')) {
            // Just a number
            constantPart = expression;
        }
        
        // Build the new expression
        if (newXCoeff === 0) {
            // No x term left
            return constantPart === '0' ? '0' : constantPart;
        } else if (newXCoeff === 1) {
            // Just x
            if (constantPart === '0') {
                return 'x';
            } else if (constantPart.startsWith('-')) {
                return `x - ${constantPart.substring(1)}`;
            } else {
                return `x + ${constantPart}`;
            }
        } else if (newXCoeff === -1) {
            // Negative x
            if (constantPart === '0') {
                return '-x';
            } else if (constantPart.startsWith('-')) {
                return `-x - ${constantPart.substring(1)}`;
            } else {
                return `-x + ${constantPart}`;
            }
        } else {
            // Multiple x
            if (constantPart === '0') {
                return `${newXCoeff}x`;
            } else if (constantPart.startsWith('-')) {
                return `${newXCoeff}x - ${constantPart.substring(1)}`;
            } else {
                return `${newXCoeff}x + ${constantPart}`;
            }
        }
    }

    private multiplyExpression(expression: string, number: string): string {
        // Handle multiplication for different expression types
        if (expression.includes('x')) {
            
            // Check for fraction expressions FIRST (before addition/subtraction)
            if (expression.includes('/')) {
                // For fraction expressions like "x/2 + 3" or "x/2+3", multiply to cancel the fraction
                const fractionMatch = expression.match(/^x\/(\d+)\s*([+\-–−])\s*(-?\d+(?:\.\d+)?)$/);
                if (fractionMatch) {
                    const denominator = parseInt(fractionMatch[1]);
                    const operator = fractionMatch[2];
                    const constant = parseInt(fractionMatch[3]);
                    
                    // If multiplying by the same number as the denominator, it cancels out
                    if (denominator === parseInt(number)) {
                        // x/2 + 3 × 2 = x + 6
                        const newConstant = constant * parseInt(number);
                        return `x ${operator} ${newConstant}`;
                    } else {
                        // Otherwise, multiply the denominator
                        const newDenominator = denominator * parseInt(number);
                        const newConstant = constant * parseInt(number);
                        return `x/${newDenominator} ${operator} ${newConstant}`;
                    }
                }
                
                // Handle reverse-order fraction expressions like "3 + x/4" or "3 - x/4"
                const reverseFractionMatchWithSpace = expression.match(/^(-?\d+(?:\.\d+)?)\s*([+\-–−])\s*x\/(\d+)$/);
                if (reverseFractionMatchWithSpace) {
                    const constant = parseFloat(reverseFractionMatchWithSpace[1]);
                    const operator = reverseFractionMatchWithSpace[2];
                    const denominator = parseInt(reverseFractionMatchWithSpace[3]);
                    if (denominator === parseInt(number)) {
                        const newConstant = constant * parseInt(number);
                        return `${newConstant} ${operator} x`;
                    } else {
                        const newConstant = constant * parseInt(number);
                        const newDenominator = denominator * parseInt(number);
                        return `${newConstant} ${operator} x/${newDenominator}`;
                    }
                }
                
                // Also handle fraction expressions without spaces like "x/2+3"
                const fractionMatchNoSpace = expression.match(/^x\/(\d+)([+\-–−])(-?\d+(?:\.\d+)?)$/);
                if (fractionMatchNoSpace) {
                    const denominator = parseInt(fractionMatchNoSpace[1]);
                    const operator = fractionMatchNoSpace[2];
                    const constant = parseInt(fractionMatchNoSpace[3]);
                    
                    // If multiplying by the same number as the denominator, it cancels out
                    if (denominator === parseInt(number)) {
                        // x/2+3 × 2 = x+6
                        const newConstant = constant * parseInt(number);
                        return `x${operator}${newConstant}`;
                    } else {
                        // Otherwise, multiply the denominator
                        const newDenominator = denominator * parseInt(number);
                        const newConstant = constant * parseInt(number);
                        return `x/${newDenominator}${operator}${newConstant}`;
                    }
                }
                
                // Handle fraction expressions with spaces like "x/5 - 1"
                const fractionMatchWithSpace = expression.match(/^x\/(\d+)\s*([+\-–−])\s*(-?\d+(?:\.\d+)?)$/);
                if (fractionMatchWithSpace) {
                    const denominator = parseInt(fractionMatchWithSpace[1]);
                    const operator = fractionMatchWithSpace[2];
                    const constant = parseInt(fractionMatchWithSpace[3]);
                    
                    // If multiplying by the same number as the denominator, it cancels out
                    if (denominator === parseInt(number)) {
                        // x/5 - 1 × 5 = x - 5
                        const newConstant = constant * parseInt(number);
                        return `x ${operator} ${newConstant}`;
                    } else {
                        // Otherwise, multiply the denominator
                        const newDenominator = denominator * parseInt(number);
                        const newConstant = constant * parseInt(number);
                        return `x/${newDenominator} ${operator} ${newConstant}`;
                    }
                }
                
                // Handle simple fraction expressions like "x/2"
                const simpleFractionMatch = expression.match(/^x\/(\d+)$/);
                if (simpleFractionMatch) {
                    const denominator = parseInt(simpleFractionMatch[1]);
                    
                    // If multiplying by the same number as the denominator, it cancels out
                    if (denominator === parseInt(number)) {
                        // x/2 × 2 = x
                        return 'x';
                    } else {
                        // Otherwise, multiply the denominator
                        const newDenominator = denominator * parseInt(number);
                        return `x/${newDenominator}`;
                    }
                }
                
                // Handle simple complex fraction expressions like "(x+2)/4"
                const simpleComplexFractionMatch = expression.match(/^\(([^)]+)\)\/(\d+)$/);
                if (simpleComplexFractionMatch) {
                    const numerator = simpleComplexFractionMatch[1].trim();
                    const denominator = parseInt(simpleComplexFractionMatch[2]);
                    
                    // If multiplying by the same number as the denominator, it cancels out
                    if (denominator === parseInt(number)) {
                        // (x+2)/4 × 4 = x+2
                        return numerator;
                    } else {
                        // Otherwise, multiply the denominator
                        const newDenominator = denominator * parseInt(number);
                        return `(${numerator})/${newDenominator}`;
                    }
                }
                
                // Handle complex fraction expressions like "(x + 2)/4 + 1" or "(x + 2)/4+1"
                const complexFractionMatch = expression.match(/^\(([^)]+)\)\/(\d+)\s*([+\-–−])\s*(-?\d+(?:\.\d+)?)$/);
                if (complexFractionMatch) {
                    const numerator = complexFractionMatch[1].trim();
                    const denominator = parseInt(complexFractionMatch[2]);
                    const operator = complexFractionMatch[3];
                    const constant = parseInt(complexFractionMatch[4]);
                    
                    // If multiplying by the same number as the denominator, it cancels out
                    if (denominator === parseInt(number)) {
                        // (x + 2)/4 + 1 × 4 = x + 2 + 4
                        const newConstant = constant * parseInt(number);
                        return `${numerator} ${operator} ${newConstant}`;
                    } else {
                        // Otherwise, multiply the denominator
                        const newDenominator = denominator * parseInt(number);
                        const newConstant = constant * parseInt(number);
                        return `(${numerator})/${newDenominator} ${operator} ${newConstant}`;
                    }
                }
                
                // Also handle complex fraction expressions without spaces like "(x + 2)/4+1"
                const complexFractionMatchNoSpace = expression.match(/^\(([^)]+)\)\/(\d+)([+\-–−])(-?\d+(?:\.\d+)?)$/);
                if (complexFractionMatchNoSpace) {
                    const numerator = complexFractionMatchNoSpace[1].trim();
                    const denominator = parseInt(complexFractionMatchNoSpace[2]);
                    const operator = complexFractionMatchNoSpace[3];
                    const constant = parseInt(complexFractionMatchNoSpace[4]);
                    
                    // If multiplying by the same number as the denominator, it cancels out
                    if (denominator === parseInt(number)) {
                        // (x + 2)/4+1 × 4 = x+2+4
                        const newConstant = constant * parseInt(number);
                        return `${numerator}${operator}${newConstant}`;
                    } else {
                        // Otherwise, multiply the denominator
                        const newDenominator = denominator * parseInt(number);
                        const newConstant = constant * parseInt(number);
                        return `(${numerator})/${newDenominator}${operator}${newConstant}`;
                    }
                }
                
                // If fraction match fails, try to handle it as a general expression
                // This handles cases where the expression doesn't match any specific pattern
                if (expression.includes('/')) {
                    // For expressions with fractions, try to multiply each part (both sides)
                    const parts = expression.split(/([+\-–−])/);
                    if (parts.length >= 3) {
                        const firstPart = parts[0].trim();
                        const operator = parts[1];
                        const secondPart = parts[2].trim();

                        const factor = parseInt(number);

                        // Compute new first part
                        let newFirstPart: string;
                        if (/^x\/(\d+)$/.test(firstPart)) {
                            const denom = parseInt(firstPart.split('/')[1]);
                            newFirstPart = denom === factor ? 'x' : `x/${denom * factor}`;
                        } else if (/^-?\d+(?:\.\d+)?$/.test(firstPart)) {
                            const val = parseFloat(firstPart) * factor;
                            newFirstPart = Number.isInteger(val) ? val.toString() : val.toString();
                        } else {
                            // If it's an x term without division (unlikely in this branch), scale coefficient
                            newFirstPart = firstPart;
                        }

                        // Compute new second part
                        let newSecondPart: string;
                        if (/^x\/(\d+)$/.test(secondPart)) {
                            const denom = parseInt(secondPart.split('/')[1]);
                            newSecondPart = denom === factor ? 'x' : `x/${denom * factor}`;
                        } else if (/^-?\d+(?:\.\d+)?$/.test(secondPart)) {
                            const val = parseFloat(secondPart) * factor;
                            newSecondPart = Number.isInteger(val) ? val.toString() : val.toString();
                        } else {
                            newSecondPart = secondPart;
                        }

                        return `${newFirstPart} ${operator} ${newSecondPart}`;
                    }
                }
                
                // If all else fails, treat as simple x expression
                return `${number}${expression}`;
            }
            
            // For expressions like "x + 5", multiply each term
            if (expression.includes('+')) {
                const parts = expression.split('+');
                const xPart = parts[0].trim();
                const constantPart = parts[1].trim();
                const newConstant = parseInt(constantPart) * parseInt(number);
                return `${xPart} + ${newConstant}`;
            } else if (expression.includes('-') || expression.includes('–')) {
                // Handle both regular minus and en-dash
                const parts = expression.includes('-') ? expression.split('-') : expression.split('–');
                const xPart = parts[0].trim();
                const constantPart = parts[1].trim();
                const newConstant = parseInt(constantPart) * parseInt(number);
                return `${xPart} - ${newConstant}`;
            } else if (expression.includes('÷')) {
                // For expressions like "x ÷ 8", multiply to cancel division
                const parts = expression.split('÷');
                const xPart = parts[0].trim();
                const divisor = parts[1].trim();
                
                // If multiplying by the same number as the divisor, it cancels out
                if (divisor === number) {
                    return xPart; // x ÷ 8 × 8 = x
                } else {
                    // Otherwise, multiply the divisor
                    const newDivisor = parseInt(divisor) * parseInt(number);
                    return `${xPart} ÷ ${newDivisor}`;
                }
            } else {
                // Check if there's a coefficient before "x" (like "3x")
                const xMatch = expression.match(/^(\d+)x$/);
                if (xMatch) {
                    const coefficient = parseInt(xMatch[1]);
                    const newCoefficient = coefficient * parseInt(number);
                    return `${newCoefficient}x`;
                } else {
                    // Just "x", multiply by coefficient
                    return `${number}x`;
                }
            }
        } else {
            // For numeric expressions, perform direct multiplication
            // Handle fractions properly
            if (expression.includes('/') || number.includes('/')) {
                return this.multiplyFractions(expression, number);
            } else {
                const result = parseInt(expression) * parseInt(number);
                return result.toString();
            }
        }
    }

    private multiplyFractions(expression: string, number: string): string {
        // Parse the first fraction
        let firstNum: number, firstDen: number;
        if (expression.includes('/')) {
            const [num, den] = expression.split('/').map(n => parseInt(n));
            firstNum = num;
            firstDen = den;
        } else {
            firstNum = parseInt(expression);
            firstDen = 1;
        }
        
        // Parse the second fraction
        let secondNum: number, secondDen: number;
        if (number.includes('/')) {
            const [num, den] = number.split('/').map(n => parseInt(n));
            secondNum = num;
            secondDen = den;
        } else {
            secondNum = parseInt(number);
            secondDen = 1;
        }
        
        // Perform fraction multiplication: a/b * c/d = (a*c)/(b*d)
        const resultNum = firstNum * secondNum;
        const resultDen = firstDen * secondDen;
        
        // Simplify the result
        return this.simplifyFraction(resultNum, resultDen);
    }

    private divideExpression(expression: string, number: string): string {
        // Handle division for different expression types
        if (expression.includes('x')) {
            // Check for bracket expressions first (distributive property)
            const bracketParsed = this.parseBracketExpression(expression);
            if (bracketParsed) {
                // For bracket expressions like 2(x+3), divide the coefficient
                const newCoefficient = bracketParsed.coefficient / parseInt(number);
                
                // Check if result is a whole number
                if (Number.isInteger(newCoefficient)) {
                    if (newCoefficient === 1) {
                        // 2(x+3) ÷ 2 = x+3
                        return bracketParsed.innerExpression;
                    } else {
                        // 4(x+3) ÷ 2 = 2(x+3)
                        return `${newCoefficient}(${bracketParsed.innerExpression})`;
                    }
                } else {
                    // Show as fraction
                    return `${bracketParsed.coefficient}(${bracketParsed.innerExpression}) ÷ ${number}`;
                }
            }
            
            // Check for complex expressions like "2x + 4", "-4x + 8", or "-4x - 8" first
            const complexMatch = expression.match(/^(-?\d+)x\s*([+\-–−])\s*(-?\d+)$/);
            if (complexMatch) {
                const coefficient = parseInt(complexMatch[1]);
                const operator = complexMatch[2];
                const constant = parseInt(complexMatch[3]);
                
                // Calculate the actual constant value based on the operator
                let actualConstant: number;
                if (operator === '+') {
                    actualConstant = constant;
                } else {
                    actualConstant = -constant;
                }
                
                // Divide both the coefficient and constant by the number
                const newCoefficient = coefficient / parseInt(number);
                const newConstant = actualConstant / parseInt(number);
                
                // Check if both results are whole numbers
                if (Number.isInteger(newCoefficient) && Number.isInteger(newConstant)) {
                    if (newCoefficient === 1 || newCoefficient === -1) {
                        // 2x + 4 ÷ 2 = x + 2
                        // -4x + 8 ÷ -4 = x - 2
                        // Handle the sign properly
                        if (newConstant >= 0) {
                            return `x + ${newConstant}`;
                        } else {
                            return `x - ${Math.abs(newConstant)}`;
                        }
                    } else {
                        // 4x + 8 ÷ 2 = 2x + 4
                        if (newConstant >= 0) {
                            return `${newCoefficient}x + ${newConstant}`;
                        } else {
                            return `${newCoefficient}x - ${Math.abs(newConstant)}`;
                        }
                    }
                } else {
                    // Handle non-whole number results
                    let xPart: string;
                    if (newCoefficient === 1 || newCoefficient === -1) {
                        xPart = 'x';
                    } else if (Number.isInteger(newCoefficient)) {
                        xPart = `${newCoefficient}x`;
                    } else {
                        xPart = `${coefficient}x ÷ ${number}`;
                    }
                    
                    // Handle constant part
                    let constantPart: string;
                    if (Number.isInteger(newConstant)) {
                        constantPart = newConstant.toString();
                    } else {
                        // Show as simplified fraction
                        const constantNumerator = Math.round(newConstant * parseInt(number));
                        constantPart = this.simplifyFraction(constantNumerator, parseInt(number));
                    }
                    
                    // Combine with proper operator
                    if (newConstant >= 0) {
                        return `${xPart} + ${constantPart}`;
                    } else {
                        const absConstant = Math.abs(newConstant);
                        if (Number.isInteger(absConstant)) {
                            return `${xPart} - ${absConstant}`;
                        } else {
                            const constantNumerator = Math.round(absConstant * parseInt(number));
                            const constantPart = this.simplifyFraction(constantNumerator, parseInt(number));
                            return `${xPart} - ${constantPart}`;
                        }
                    }
                }
            }
            
            // Check for expressions where constant comes before x-term like "84 + 12x"
            const reverseComplexMatch = expression.match(/^(-?\d+)\s*([+\-–−])\s*(-?\d+)x$/);
            if (reverseComplexMatch) {
                const constant = parseInt(reverseComplexMatch[1]);
                const operator = reverseComplexMatch[2];
                const coefficient = parseInt(reverseComplexMatch[3]);
                
                // Calculate the actual constant value based on the operator
                let actualConstant: number;
                if (operator === '+') {
                    actualConstant = constant;
                } else {
                    actualConstant = -constant;
                }
                
                // Divide both the constant and coefficient by the number
                const newConstant = actualConstant / parseInt(number);
                const newCoefficient = coefficient / parseInt(number);
                
                // Check if both results are whole numbers
                if (Number.isInteger(newConstant) && Number.isInteger(newCoefficient)) {
                    if (newCoefficient === 1 || newCoefficient === -1) {
                        // 84 + 12x ÷ 12 = 7 + x
                        if (newConstant >= 0) {
                            return `${newConstant} + x`;
                        } else {
                            return `${newConstant} - x`;
                        }
                    } else {
                        // 84 + 12x ÷ 6 = 14 + 2x
                        if (newConstant >= 0) {
                            return `${newConstant} + ${newCoefficient}x`;
                        } else {
                            return `${newConstant} - ${Math.abs(newCoefficient)}x`;
                        }
                    }
                } else {
                    // Handle non-whole number results
                    let xPart: string;
                    if (newCoefficient === 1 || newCoefficient === -1) {
                        xPart = 'x';
                    } else if (Number.isInteger(newCoefficient)) {
                        xPart = `${newCoefficient}x`;
                    } else {
                        xPart = `${coefficient}x ÷ ${number}`;
                    }
                    
                    // Handle constant part
                    let constantPart: string;
                    if (Number.isInteger(newConstant)) {
                        constantPart = newConstant.toString();
                    } else {
                        // Show as simplified fraction
                        const constantNumerator = Math.round(newConstant * parseInt(number));
                        constantPart = this.simplifyFraction(constantNumerator, parseInt(number));
                    }
                    
                    // Combine with proper operator
                    if (newConstant >= 0) {
                        return `${constantPart} + ${xPart}`;
                    } else {
                        const absConstant = Math.abs(newConstant);
                        if (Number.isInteger(absConstant)) {
                            return `${constantPart} - ${xPart}`;
                        } else {
                            const constantNumerator = Math.round(absConstant * parseInt(number));
                            const constantPart = this.simplifyFraction(constantNumerator, parseInt(number));
                            return `${constantPart} - ${xPart}`;
                        }
                    }
                }
            }

            // Handle expressions where constant comes before a bare x-term like "30 - x" or "7 + x"
            const reverseImplicitXMatch = expression.match(/^(-?\d+(?:\.\d+)?|\d+\/\d+)\s*([+\-–−])\s*x$/);
            if (reverseImplicitXMatch) {
                const constantStr = reverseImplicitXMatch[1];
                const operator = reverseImplicitXMatch[2];
                const divisor = parseInt(number);

                // Parse constant (supports fraction)
                let constantVal: number;
                if (constantStr.includes('/')) {
                    const [num, den] = constantStr.split('/').map(n => parseInt(n));
                    constantVal = num / den;
                } else {
                    constantVal = parseFloat(constantStr);
                }

                // Compute new constant and x coefficient after division
                const newConstant = constantVal / divisor;
                const xCoeffBefore = operator === '+' ? 1 : -1;
                const newXCoeff = xCoeffBefore / divisor;

                // Build x part string
                let xPart: string;
                if (Number.isInteger(newXCoeff)) {
                    if (newXCoeff === 1) xPart = 'x';
                    else if (newXCoeff === -1) xPart = '-x';
                    else xPart = `${newXCoeff}x`;
                } else {
                    // Keep as division to avoid decimals
                    // Represent sign by placing it in operator with constant
                    xPart = `x ÷ ${Math.abs(divisor)}`;
                }

                // Build constant part (try to keep integers when possible)
                let constantPart: string;
                if (Number.isInteger(newConstant)) {
                    constantPart = newConstant.toString();
                } else {
                    // Show as simplified fraction
                    const constNumerator = constantVal * Math.sign(divisor);
                    const denomAbs = Math.abs(divisor);
                    const constNum = Math.round(constNumerator);
                    constantPart = this.simplifyFraction(constNum, denomAbs);
                }

                // Combine with proper operator between constant and x part
                if (Number.isInteger(newXCoeff)) {
                    if (newXCoeff >= 0) {
                        return `${constantPart} + ${xPart}`;
                    } else {
                        return `${constantPart} - ${xPart.substring(1)}`; // remove leading '-'
                    }
                } else {
                    // newXCoeff not integer => sign depends on divisor sign and operator
                    if (newXCoeff >= 0) {
                        return `${constantPart} + ${xPart}`;
                    } else {
                        return `${constantPart} - ${xPart}`;
                    }
                }
            }
            
            // Handle unary x: "x" or "-x" BEFORE other checks
            const unaryX = expression.trim().match(/^(-?)x$/);
            if (unaryX) {
                const coefficient = unaryX[1] === '-' ? -1 : 1;
                const newCoefficient = coefficient / parseInt(number);
                if (Number.isInteger(newCoefficient)) {
                    if (newCoefficient === 1) return 'x';
                    if (newCoefficient === -1) return '-x';
                    return `${newCoefficient}x`;
                }
                return `${coefficient}x ÷ ${number}`;
            }

            // Check for simple multiplication expressions like "3x" or "-3x" BEFORE checking addition/subtraction
            const xMatch = expression.match(/^(-?\d+)x$/);
            if (xMatch) {
                const coefficient = parseInt(xMatch[1]);
                const newCoefficient = coefficient / parseInt(number);
                
                // Check if result is a whole number
                if (Number.isInteger(newCoefficient)) {
                    if (newCoefficient === 1 || newCoefficient === -1) {
                        return 'x'; // 3x ÷ 3 = x, -3x ÷ -3 = x, -4x ÷ -4 = x
                    }
                    return `${newCoefficient}x`;
                } else {
                    // Show as fraction
                    return `${coefficient}x ÷ ${number}`;
                }
            }
            
            // For expressions like "x + 5", divide each term
            if (expression.includes('+')) {
                const parts = expression.split('+');
                const xPart = parts[0].trim();
                const constantPart = parts[1].trim();
                const newConstant = parseInt(constantPart) / parseInt(number);
                
                // Check if result is a whole number
                if (Number.isInteger(newConstant)) {
                    if (newConstant === 0) {
                        return `${xPart} ÷ ${number}`; // x ÷ 12 + 0 = x ÷ 12
                    }
                    if (newConstant >= 0) {
                        return `${xPart} ÷ ${number} + ${newConstant}`;
                    } else {
                        return `${xPart} ÷ ${number} - ${Math.abs(newConstant)}`;
                    }
                } else {
                    // Show as fraction
                    return `${xPart} ÷ ${number} + ${constantPart} ÷ ${number}`;
                }
            } else if (expression.includes('-') || expression.includes('–') || expression.includes('−')) {
                // Handle various dash characters
                let dashChar = '-';
                if (expression.includes('−')) {
                    dashChar = '−';
                } else if (expression.includes('–')) {
                    dashChar = '–';
                }
                
                const parts = expression.split(dashChar);
                const xPart = parts[0].trim();
                const constantPart = parts[1].trim();
                const newConstant = parseInt(constantPart) / parseInt(number);
                
                // Check if result is a whole number
                if (Number.isInteger(newConstant)) {
                    if (newConstant === 0) {
                        return `${xPart} ÷ ${number}`; // x ÷ 12 - 0 = x ÷ 12
                    }
                    if (newConstant >= 0) {
                        return `${xPart} ÷ ${number} - ${newConstant}`;
                    } else {
                        return `${xPart} ÷ ${number} + ${Math.abs(newConstant)}`;
                    }
                } else {
                    // Show as fraction
                    return `${xPart} ÷ ${number} - ${constantPart} ÷ ${number}`;
                }
            } else if (expression.includes('÷')) {
                // For expressions like "x ÷ 8", divide to multiply the divisor
                const parts = expression.split('÷');
                const xPart = parts[0].trim();
                const divisor = parts[1].trim();
                
                // When dividing by a number, we multiply the divisor
                const newDivisor = parseInt(divisor) * parseInt(number);
                return `${xPart} ÷ ${newDivisor}`;
            } else {
                // Just "x", divide by coefficient
                return `x ÷ ${number}`;
            }
        } else {
            // For numeric expressions, perform direct division
            // Normalize and handle potential spaces/unicode minus (e.g., " - 33")
            const normalizedExpr = this.normalizeNumberString(expression);
            const normalizedNum = this.normalizeNumberString(number);
            
            // Handle fractions properly
            if (normalizedExpr.includes('/') || normalizedNum.includes('/')) {
                return this.divideFractions(normalizedExpr, normalizedNum);
            } else {
                const numerator = parseInt(normalizedExpr);
                const denominator = parseInt(normalizedNum);
                
                // Use the fraction simplification helper
                return this.simplifyFraction(numerator, denominator);
            }
        }
    }

    private divideFractions(expression: string, number: string): string {
        // Parse the first fraction
        let firstNum: number, firstDen: number;
        if (expression.includes('/')) {
            const [num, den] = expression.split('/').map(n => parseInt(n));
            firstNum = num;
            firstDen = den;
        } else {
            firstNum = parseInt(expression);
            firstDen = 1;
        }
        
        // Parse the second fraction
        let secondNum: number, secondDen: number;
        if (number.includes('/')) {
            const [num, den] = number.split('/').map(n => parseInt(n));
            secondNum = num;
            secondDen = den;
        } else {
            secondNum = parseInt(number);
            secondDen = 1;
        }
        
        // Perform fraction division: a/b ÷ c/d = (a*d)/(b*c)
        const resultNum = firstNum * secondDen;
        const resultDen = firstDen * secondNum;
        
        // Simplify the result
        return this.simplifyFraction(resultNum, resultDen);
    }

    private distributeExpression(expression: string): string {
        // Handle distributive property: a(b+c) = ab + ac
        // Examples: 2(x+3) -> 2x + 6, 3(x-2) -> 3x - 6, 5(2x-3) -> 10x - 15
        
        const bracketParsed = this.parseBracketExpression(expression);
        if (!bracketParsed) {
            // No brackets to distribute, return as is
            return expression;
        }
        
        const { coefficient, innerExpression } = bracketParsed;
        
        // Normalize inner expression to handle spaces and unicode minus consistently
        const normalizedInner = innerExpression.replace(/\s+/g, '').replace(/[−–]/g, '-');
        
        // Robust parse: handle optional sign and coefficient for x-term, then + or -, then constant
        // Matches: x+3, -x-7, 2x+5, -2x-4
        const innerMatch = normalizedInner.match(/^([+\-]?\d*)x([+\-])(\d+)$/);
        if (innerMatch) {
            const coeffStr = innerMatch[1];
            const op = innerMatch[2];
            const constStr = innerMatch[3];
            
            // Determine x coefficient from string
            let xCoeff: number;
            if (coeffStr === '' || coeffStr === '+') xCoeff = 1;
            else if (coeffStr === '-') xCoeff = -1;
            else xCoeff = parseInt(coeffStr);
            
            // Constant value considering operator sign
            const constValRaw = parseInt(constStr);
            const innerConstVal = op === '+' ? constValRaw : -constValRaw;
            
            // Distribute outer coefficient
            const distributedXCoeff = coefficient * xCoeff;
            const distributedConstVal = coefficient * innerConstVal;
            
            // Build x term string
            let xTerm: string;
            if (distributedXCoeff === 1) xTerm = 'x';
            else if (distributedXCoeff === -1) xTerm = '-x';
            else xTerm = `${distributedXCoeff}x`;
            
            // Build constant part with proper sign
            if (distributedConstVal >= 0) {
                return `${xTerm} + ${distributedConstVal}`;
            } else {
                return `${xTerm} - ${Math.abs(distributedConstVal)}`;
            }
        }
        
        // Parse the inner expression to get the x term and constant
        if (innerExpression.includes('+')) {
            // Format: x + 3 or 2x + 3
            const parts = innerExpression.split('+');
            const xPart = parts[0].trim();
            const constantPart = parts[1].trim();
            
            // Handle x terms with coefficients like "2x"
            let distributedX: string;
            if (xPart.includes('x')) {
                const xCoeffMatch = xPart.match(/^(-?\d+)x$/);
                if (xCoeffMatch) {
                    // Format: 2x -> multiply coefficients
                    const xCoeff = parseInt(xCoeffMatch[1]);
                    const newXCoeff = coefficient * xCoeff;
                    distributedX = `${newXCoeff}x`;
                } else if (xPart === 'x') {
                    // Format: just x
                    distributedX = `${coefficient}x`;
                } else {
                    // Fallback
                    distributedX = `${coefficient}${xPart}`;
                }
            } else {
                // Fallback
                distributedX = `${coefficient}${xPart}`;
            }
            
            const distributedConstant = coefficient * parseInt(constantPart);
            
            // Use proper operator based on the sign of the distributed constant
            if (distributedConstant >= 0) {
                return `${distributedX} + ${distributedConstant}`;
            } else {
                return `${distributedX} - ${Math.abs(distributedConstant)}`;
            }
        } else if (innerExpression.includes('-') || innerExpression.includes('–')) {
            // Format: x - 3 or 2x - 3
            const dashMatch = innerExpression.match(/[−–]/);
            const dashChar = dashMatch ? dashMatch[0] : '-';
            const parts = innerExpression.split(dashChar);
            const xPart = parts[0].trim();
            const constantPart = parts[1].trim();
            
            // Handle x terms with coefficients like "2x"
            let distributedX: string;
            if (xPart.includes('x')) {
                const xCoeffMatch = xPart.match(/^(-?\d+)x$/);
                if (xCoeffMatch) {
                    // Format: 2x -> multiply coefficients
                    const xCoeff = parseInt(xCoeffMatch[1]);
                    const newXCoeff = coefficient * xCoeff;
                    distributedX = `${newXCoeff}x`;
                } else if (xPart === 'x') {
                    // Format: just x
                    distributedX = `${coefficient}x`;
                } else {
                    // Fallback
                    distributedX = `${coefficient}${xPart}`;
                }
            } else {
                // Fallback
                distributedX = `${coefficient}${xPart}`;
            }
            
            const distributedConstant = coefficient * (-parseInt(constantPart));
            
            // Use proper operator based on the sign of the distributed constant
            if (distributedConstant >= 0) {
                return `${distributedX} + ${distributedConstant}`;
            } else {
                return `${distributedX} - ${Math.abs(distributedConstant)}`;
            }
        } else if (innerExpression === 'x') {
            // Format: just x
            return `${coefficient}x`;
        } else {
            // Check if it's just an x term with coefficient like "2x"
            const xCoeffMatch = innerExpression.match(/^(-?\d+)x$/);
            if (xCoeffMatch) {
                const xCoeff = parseInt(xCoeffMatch[1]);
                const newXCoeff = coefficient * xCoeff;
                return `${newXCoeff}x`;
            }
            
            // No recognizable pattern, return as is
            return expression;
        }
    }

    private addOperationIndicator(equation: { lhs: Phaser.GameObjects.Container; rhs: Phaser.GameObjects.Container; equals: Phaser.GameObjects.Text }, operation: string, originalLhs: string, originalRhs: string): void {
        // Get the Y position of the equation (already relative to scroll container)
        const y = equation.lhs.y;
        
        // For distribute operation, show the coefficient instead of "distribute"
        let displayOperation = operation;
        if (operation === 'distribute' || operation.toLowerCase().startsWith('distribute')) {
            // Find the bracket expression to get the coefficient
            const bracketSide = originalLhs.includes('(') ? originalLhs : originalRhs;
            const bracketParsed = this.parseBracketExpression(bracketSide);
            if (bracketParsed) {
                displayOperation = `×${bracketParsed.coefficient}`;
            }
        }
        
        // Add operation container on the left side of LHS
        const leftOperationContainer = this.createExpressionWithFractions(0, 0, displayOperation, "#0067DC", "46px", 5);
        const leftOperationWidth = this.getContainerWidth(leftOperationContainer) / this.scene.display.scale;
        const centerX = 0; // Container center is at (0,0) since we set origin to center
        
        // Add to scroll container first
        this.scrollContainer.add(leftOperationContainer);
        
        // Set position after adding to container
        leftOperationContainer.setPosition(this.scene.getScaledValue(centerX - 330 - leftOperationWidth/2), y); // 200px to the left of LHS
        leftOperationContainer.setAlpha(0);
        // Store the original expression for later use
        leftOperationContainer.setData('originalExpression', displayOperation);
        
        // For distribute operations, only show indicator on LHS side
        if (operation === 'distribute') {
            this.operationIndicators.push(leftOperationContainer);
            
            // Tween animation: fade in, then fade out after 500ms (only LHS)
            this.scene.tweens.add({
                targets: [leftOperationContainer],
                alpha: 1,
                duration: 200,
                ease: 'Power2',
                onComplete: () => {
                    this.scene.tweens.add({
                        targets: [leftOperationContainer],
                        alpha: 0.5,
                        duration: 200,
                        delay: 500,
                        ease: 'Power2',
                    });
                }
            });
        } else {
            // For non-distribute operations, show indicators on both sides
            const rightOperationContainer = this.createExpressionWithFractions(0, 0, displayOperation, "#0067DC", "46px", 5);
            const rightOperationWidth = this.getContainerWidth(rightOperationContainer) / this.scene.display.scale;
            const centerX = 0; // Container center is at (0,0) since we set origin to center
            
            // Add to scroll container first
            this.scrollContainer.add(rightOperationContainer);
            
            // Set position after adding to container
            rightOperationContainer.setPosition(this.scene.getScaledValue(centerX + 330 + rightOperationWidth/2), y); // 200px to the right of RHS
            rightOperationContainer.setAlpha(0);
            // Store the original expression for later use
            rightOperationContainer.setData('originalExpression', displayOperation);
            
            this.operationIndicators.push(leftOperationContainer, rightOperationContainer);
            
            // Tween animation: fade in, then fade out after 500ms (both sides)
            this.scene.tweens.add({
                targets: [leftOperationContainer, rightOperationContainer],
                alpha: 1,
                duration: 200,
                ease: 'Power2',
                onComplete: () => {
                    this.scene.tweens.add({
                        targets: [leftOperationContainer, rightOperationContainer],
                        alpha: 0.5,
                        duration: 200,
                        delay: 500,
                        ease: 'Power2',
                    });
                }
            });
        }
    }

    private showMascotCelebration(cb?: () => void) {
        this.scene.time.delayedCall(1000, () => {
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

    private showSuccessAnimation(isIntermediate: boolean = false): void {
        const randomSuccessKey = SUCCESS_TEXT_KEYS[Math.floor(Math.random() * SUCCESS_TEXT_KEYS.length)];

        this.scene.time.delayedCall(1000, () => {
            // For intermediate steps, don't use priority to avoid clearing the equation announcement
            this.queueA11yAnnouncement(i18n.t(`common.${randomSuccessKey}`), !isIntermediate);
        })

        // Reset alpha to 0 first
        this.successBoard.setAlpha(0);
        
        // If equation is solved, update progress and score
        if (this.isEquationSolved && !this.isInstructionMode) {
            this.analyticsHelper?.createTrial({
                questionMaxPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                achievedPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                questionText: `${this.currentQuestion.operand1} = ${this.currentQuestion.operand2}`,
                isCorrect: true,
                questionMechanic: 'default',
                gameLevelInfo: `game.algebra_trials.${this.gameSubtitle}`,
                studentResponse: this.selectedOperations.join(' → '),
                studentResponseAccuracyPercentage: '100%',
            });

            this.questionSelector.answerCorrectly();
            this.scoreHelper.answerCorrectly();
            this.previousStreak = this.scoreHelper.getCurrentStreak();

            // Update score and streak displays
            this.scoreCoins.updateScoreDisplay(true);
        }
        
        // Create animated success bar
        const width = this.scene.display.width;
        const height = 122;
        const successContainer = this.scene.add.container(this.scene.getScaledValue(this.scene.display.width / 2), this.scene.getScaledValue(this.scene.display.height + height / 2));

        // Create background rectangle
        const bgRect = this.scene.addRectangle(0, 0, width, height, 0x007E11);
        successContainer.add(bgRect);

        const bgRectTop = this.scene.addRectangle(0, -height / 2, width, 7, 0x24E13E).setOrigin(0.5, 0);
        successContainer.add(bgRectTop);

        // Create icon and text
        const icon = this.scene.addImage(0, 0, 'correct_icon').setOrigin(0.5);
        successContainer.add(icon);
        
        // Add random success text beside the icon
        const successText = this.scene.addText(0, 0, i18n.t(`common.${randomSuccessKey}`), {
            font: "700 36px Exo",
            color: "#FFFFFF",
        }).setOrigin(0.5, 0.5);
        successContainer.add(successText);
        
        // Calculate positions to center the icon and text together
        const iconWidth = icon.displayWidth;
        const textWidth = successText.displayWidth;
        const spacing = this.scene.getScaledValue(20); // Space between icon and text
        const totalWidth = iconWidth + spacing + textWidth;
        
        // Position icon and text so their combined center is at container center
        icon.setPosition(-totalWidth / 2 + iconWidth / 2, 0);
        successText.setPosition(-totalWidth / 2 + iconWidth + spacing + textWidth / 2, 0);

        this.scene.audioManager.playSoundEffect('positive-sfx');
        
        // Slide up animation
        this.scene.tweens.add({
            targets: successContainer,
            y: this.scene.getScaledValue(this.scene.display.height - height / 2),
            duration: 500,
            ease: "Power2",
            onComplete: () => {
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
                            
                            // If equation is solved, move to next question
                            if (this.isEquationSolved && !this.isInstructionMode) {
                                const progress = this.questionSelector.getTotalQuestionsAnswered() / this.totalQuestions;
                                console.log('progress', progress*100);
                                this.progressBar.updateProgress(progress*100);
                                this.loadNextQuestion();
                            }
                        }
                    });
                });
            }
        });
        
        // Tween animation: fade in to 0.6, then fade out to 0
        this.scene.tweens.add({
            targets: this.successBoard,
            alpha: 1,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                this.scene.tweens.add({
                    targets: this.successBoard,
                    alpha: 0,
                    duration: 300,
                    delay: 500,
                    ease: 'Power2'
                });
            }
        });
    }

    private showErrorAnimation(): void {
        const randomErrorKey = ERROR_TEXT_KEYS[Math.floor(Math.random() * ERROR_TEXT_KEYS.length)];

        this.scene.time.delayedCall(1000, () => {
            this.queueA11yAnnouncement(i18n.t(`common.${randomErrorKey}`), true);
        })
        // Reset alpha to 0 first
        this.errorBoard.setAlpha(0);
        
        if (!this.isInstructionMode) {
            this.analyticsHelper?.createTrial({
                questionMaxPoints: (this.scoreHelper.getCurrentMultiplier() || 1),
                achievedPoints: 0,
                questionText: `${this.currentQuestion.operand1} = ${this.currentQuestion.operand2}`,
                isCorrect: false,
                questionMechanic: 'default',
                gameLevelInfo: `game.algebra_trials.${this.gameSubtitle}`,
                studentResponse: this.selectedOperations.join(' → '),
                studentResponseAccuracyPercentage: '0%',
            });
        }
        
        // Update score and progress
        this.questionSelector.answerIncorrectly(this.currentQuestion);
        this.scoreHelper.answerIncorrectly();
        
        // Update score and streak displays
        this.scoreCoins.updateScoreDisplay(false, this.previousStreak >= 3);
        this.previousStreak = this.scoreHelper.getCurrentStreak();
        
        // Create animated error bar
        const width = this.scene.display.width;
        const height = 122;
        const errorContainer = this.scene.add.container(this.scene.getScaledValue(this.scene.display.width / 2), this.scene.getScaledValue(this.scene.display.height + height / 2));

        // Create background rectangle
        const bgRect = this.scene.addRectangle(0, 0, width, height, 0x8B0000);
        errorContainer.add(bgRect);

        const bgRectTop = this.scene.addRectangle(0, -height / 2, width, 7, 0xF40000).setOrigin(0.5, 0);
        errorContainer.add(bgRectTop);

        // Create icon and text
        const icon = this.scene.addImage(0, 0, 'incorrect_icon').setOrigin(0.5);
        errorContainer.add(icon);
        
        // Add random error text beside the icon
        const errorText = this.scene.addText(0, 0, i18n.t(`common.${randomErrorKey}`), {
            font: "700 36px Exo",
            color: "#FFFFFF",
        }).setOrigin(0.5, 0.5);
        errorContainer.add(errorText);
        
        // Calculate positions to center the icon and text together
        const iconWidth = icon.displayWidth;
        const textWidth = errorText.displayWidth;
        const spacing = this.scene.getScaledValue(20); // Space between icon and text
        const totalWidth = iconWidth + spacing + textWidth;
        
        // Position icon and text so their combined center is at container center
        icon.setPosition(-totalWidth / 2 + iconWidth / 2, 0);
        errorText.setPosition(-totalWidth / 2 + iconWidth + spacing + textWidth / 2, 0);

        this.scene.audioManager.playSoundEffect('negative-sfx');
        
        // Slide up animation
        this.scene.tweens.add({
            targets: errorContainer,
            y: this.scene.getScaledValue(this.scene.display.height - height / 2),
            duration: 500,
            ease: "Power2",
            onComplete: () => {
                // Wait for a moment and then slide down
                this.scene.time.delayedCall(500, () => {
                    this.scene.tweens.add({
                        targets: errorContainer,
                        y: this.scene.getScaledValue(this.scene.display.height + height / 2),
                        duration: 500,
                        ease: "Power2",
                        onComplete: () => {
                            this.isProcessing = false;
                            errorContainer.destroy();
                            const progress = this.questionSelector.getTotalQuestionsAnswered() / this.totalQuestions;
                            console.log('progress', progress*100);
                            this.progressBar.updateProgress(progress*100, true);
                            this.loadNextQuestion();
                        }
                    });
                });
            }
        });
        
        // Tween animation: fade in to 0.6, then fade out to 0
        this.scene.tweens.add({
            targets: this.errorBoard,
            alpha: 1,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                this.scene.tweens.add({
                    targets: this.errorBoard,
                    alpha: 0,
                    duration: 300,
                    delay: 500,
                    ease: 'Power2'
                });
            }
        });
    }

    private cleanupUI(): void {
        // Clear all equations
        this.equations.forEach(equation => {
            equation.lhs.destroy();
            equation.rhs.destroy();
            equation.equals.destroy();
        });
        this.equations = [];

        // Clear all option buttons
        this.optionButtons.forEach(button => {
            button.destroy();
        });
        this.optionButtons = [];

        this.operationIndicators.forEach(indicator => {
            indicator.destroy();
        });
        this.operationIndicators = [];
        
        // Reset scroll container position
        if (this.scrollContainer) {
            this.scrollContainer.setPosition(this.scene.getScaledValue(638.5), this.scene.getScaledValue(433.5));
        }
    }

    private gameOver() {
        this.cleanupUI();
        this.doorUtils.closeDoors(() => {
            this.scoreHelper.setPlannedTotalQuestions(this.totalQuestions);
            const finalScore = this.scoreHelper.endGame();

            // Send data to ScoreBoard scene
            this.scene.scene.start('Scoreboard', {
                totalRounds: this.scoreHelper.getTotalQuestions(),
                rounds: this.scoreHelper.getCorrectAnswers(),
                score: finalScore,
                mechanic: 'step_equations',
                level: this.level
            });
        }, false);
    }

    private resetGame() {
        // Since we're coming from ScoreBoard, we know it's a play-again
        this.questionSelector.reset(true);
        this.scoreHelper.reset();
        this.cleanupUI();
        this.selectedOperations = [];
    }

    private generateOptionsForEquation(operand1: string, operand2: string): { options: string[], correctAnswers: string[] } {
        // Parse the equation to determine what operations are needed
        const hasX = operand1.includes('x') || operand2.includes('x');
        
        if (!hasX) {
            throw new Error('Equation must contain x');
        }

        // Check if x appears on both sides (x on both sides case)
        const hasXOnBothSides = operand1.includes('x') && operand2.includes('x');
        
        if (hasXOnBothSides) {
            return this.generateOptionsForXOnBothSides(operand1, operand2);
        }

        // Check if there are brackets (distributive property case)
        const hasBrackets = operand1.includes('(') || operand2.includes('(');
        
        // Check if it's a complex fraction expression like (x+2)/4+1
        const isComplexFraction = (operand1.includes('(') && operand1.includes('/')) || 
                                  (operand2.includes('(') && operand2.includes('/'));
        
        if (hasBrackets && !isComplexFraction) {
            return this.generateOptionsForDistributive(operand1, operand2);
        }

        // Determine which side has x and which side is numeric
        const xSide = operand1.includes('x') ? operand1 : operand2;
        
        // Parse the x side to understand the structure
        const xSideParsed = this.parseExpression(xSide);
        
        let correctAnswers: string[] = [];
        let wrongOptions: string[] = [];
        
        // Generate correct answers based on equation type
        if (xSideParsed.type === 'simple') {
            // x = 5 or 5 = x - equation is already solved
            correctAnswers = ['0']; // No operation needed
        } else if (xSideParsed.type === 'addition') {
            // x + 3 = 7 -> subtract 3
            // x + 1.5 = 5.5 -> subtract 1.5
            // x + 5/2 = 13/2 -> subtract 5/2
            const constant = xSideParsed.constant;
            if (Number.isInteger(constant)) {
                correctAnswers = [`- ${constant}`];
            } else {
                // For fractional constants, we need to find the original fraction
                // Look for the fraction in the original expression (both x + fraction and fraction + x)
                const fractionMatch1 = xSide.match(/x\s*\+\s*(\d+\/\d+)/);
                const fractionMatch2 = xSide.match(/(\d+\/\d+)\s*\+\s*x/);
                if (fractionMatch1) {
                    correctAnswers = [`- ${fractionMatch1[1]}`];
                } else if (fractionMatch2) {
                    correctAnswers = [`- ${fractionMatch2[1]}`];
                } else {
                    // Fallback to decimal representation
                    correctAnswers = [`- ${constant}`];
                }
            }
        } else if (xSideParsed.type === 'subtraction') {
            // x - 3 = 7 -> add 3
            // x - 5/2 = 13/2 -> add 5/2
            const constant = xSideParsed.constant;
            if (Number.isInteger(constant)) {
                correctAnswers = [`+ ${constant}`];
            } else {
                // For fractional constants, we need to find the original fraction
                // Look for the fraction in the original expression (both x - fraction and fraction - x)
                const fractionMatch1 = xSide.match(/x\s*-\s*(\d+\/\d+)/);
                const fractionMatch2 = xSide.match(/(\d+\/\d+)\s*-\s*x/);
                if (fractionMatch1) {
                    correctAnswers = [`+ ${fractionMatch1[1]}`];
                } else if (fractionMatch2) {
                    correctAnswers = [`+ ${fractionMatch2[1]}`];
                } else {
                    // Fallback to decimal representation
                    correctAnswers = [`+ ${constant}`];
                }
            }
        } else if (xSideParsed.type === 'multiplication') {
            // 3x = 6 -> divide by 3
            correctAnswers = [`÷ ${xSideParsed.coefficient}`];
        } else if (xSideParsed.type === 'division') {
            // x ÷ 3 = 2 -> multiply by 3
            correctAnswers = [`× ${xSideParsed.divisor}`];
        } else if (xSideParsed.type === 'complex') {
            // Multi-step equations like 2x + 4 = 10 or 2x - 2 = 10
            // Can be solved in multiple ways:
            // 1. Subtract 4 first: -4 -> 2x = 6 -> ÷2 -> x = 3
            // 2. Divide by 2 first: ÷2 -> x + 2 = 5 -> -2 -> x = 3
            
            if (xSideParsed.coefficient && xSideParsed.constant) {
                // Handle the constant properly to avoid double negatives
                let constantOperation: string;
                const constant = xSideParsed.constant;
                const coeff = xSideParsed.coefficient;
                
                // Helper to convert decimal constant to a fraction string when needed
                const toFractionStr = (val: number): string => {
                    const s = val.toString();
                    if (!s.includes('.')) return Math.abs(val).toString();
                    const decimals = s.split('.')[1].length;
                    const numerator = Math.round(Math.abs(val) * Math.pow(10, decimals));
                    const denominator = Math.pow(10, decimals);
                    return this.simplifyFraction(numerator, denominator);
                };
                
                if (constant > 0) {
                    // Prefer extracting fraction text from the original xSide in any of these shapes:
                    // x + a/b, a/b + x, kx + a/b, a/b + kx
                    const f1 = xSide.match(/x\s*\+\s*(\d+\/\d+)/);
                    const f2 = xSide.match(/(\d+\/\d+)\s*\+\s*x/);
                    const f3 = xSide.match(/\d+x\s*\+\s*(\d+\/\d+)/);
                    const f4 = xSide.match(/(\d+\/\d+)\s*\+\s*\d+x/);
                    if (f1) constantOperation = `- ${f1[1]}`;
                    else if (f2) constantOperation = `- ${f2[1]}`;
                    else if (f3) constantOperation = `- ${f3[1]}`;
                    else if (f4) constantOperation = `- ${f4[1]}`;
                    else if (Number.isInteger(constant)) constantOperation = `- ${constant}`;
                    else constantOperation = `- ${toFractionStr(constant)}`;
                } else {
                    // constant <= 0
                    const absConst = Math.abs(constant);
                    const f1 = xSide.match(/x\s*-\s*(\d+\/\d+)/);
                    const f2 = xSide.match(/(\d+\/\d+)\s*-\s*x/);
                    const f3 = xSide.match(/\d+x\s*-\s*(\d+\/\d+)/);
                    const f4 = xSide.match(/(\d+\/\d+)\s*-\s*\d+x/);
                    if (f1) constantOperation = `+ ${f1[1]}`;
                    else if (f2) constantOperation = `+ ${f2[1]}`;
                    else if (f3) constantOperation = `+ ${f3[1]}`;
                    else if (f4) constantOperation = `+ ${f4[1]}`;
                    else if (Number.isInteger(absConst)) constantOperation = `+ ${absConst}`;
                    else constantOperation = `+ ${toFractionStr(absConst)}`;
                }
                
                // Only include division by coefficient when |coefficient| > 1
                correctAnswers = [constantOperation];
                if (Math.abs(coeff) > 1) {
                    correctAnswers.push(`÷ ${coeff}`);
                }
            }
        } else if (xSideParsed.type === 'fraction') {
            // Fraction equations like x/2 + 3 = 7
            // Can be solved in multiple ways:
            // 1. Subtract 3 first: -3 -> x/2 = 4 -> ×2 -> x = 8
            // 2. Multiply by 2 first: ×2 -> x + 6 = 14 -> -6 -> x = 8
            
            if (xSideParsed.fractionDenominator && xSideParsed.constant !== undefined) {
                // Handle the constant properly to avoid double negatives
                let constantOperation: string;
                // Try to extract the exact fraction string from the original xSide
                const plusFrac = xSide.match(/x\/\d+\s*\+\s*(\d+\/\d+)/) || xSide.match(/(\d+\/\d+)\s*\+\s*x\/\d+/);
                const minusFrac = xSide.match(/x\/\d+\s*-\s*(\d+\/\d+)/) || xSide.match(/(\d+\/\d+)\s*-\s*x\/\d+/);
                if (xSideParsed.constant > 0) {
                    constantOperation = plusFrac ? `- ${plusFrac[1]}` : `- ${xSideParsed.constant}`;
                } else {
                    const absConst = Math.abs(xSideParsed.constant);
                    constantOperation = minusFrac ? `+ ${minusFrac[1]}` : `+ ${absConst}`;
                }
                
                correctAnswers = [
                    constantOperation,  // Handle constant first
                    `× ${xSideParsed.fractionDenominator}` // Multiply by denominator first
                ];
            }
        } else {
            throw new Error('Unsupported equation type');
        }
        
        // Generate plausible wrong options using dynamic calculation
        const possibleWrongOptions = this.calculatePossibleWrongOptions(operand1, operand2, correctAnswers);
        
        // Take up to 4 wrong options (or fewer if not enough available)
        wrongOptions = possibleWrongOptions.slice(0, 4);

        // Keep one correct answer in tutorial mode
        if(this.isInstructionMode) {
            correctAnswers = [correctAnswers[0]];
        }
        
        // Take 2 wrong options and combine with correct answers
        const selectedWrongOptions = wrongOptions.slice(0, 2);
        
        const allOptions = [...correctAnswers, ...selectedWrongOptions];
        
        const shuffledOptions = allOptions.sort(() => Math.random() - 0.5);
        
        return {
            options: shuffledOptions,
            correctAnswers: correctAnswers
        };
    }

    private generateOptionsForXOnBothSides(operand1: string, operand2: string): { options: string[], correctAnswers: string[] } {
        // For x on both sides equations, the first step can be:
        // 1. Move x terms to one side (e.g., -x)
        // 2. Subtract constants from both sides (e.g., -5, -13)
        // Example: 3x + 5 = x + 13 -> first step can be -x, -5, or -13
        
        let correctAnswers: string[] = [];
        
        // Determine which x term to move (always move the smaller coefficient to the other side)
        const lhsXCoeff = this.getXCoefficient(operand1);
        const rhsXCoeff = this.getXCoefficient(operand2);
        
        if (lhsXCoeff === 0 && rhsXCoeff === 0) {
            // No x terms found, this shouldn't happen
            throw new Error('No x terms found in x on both sides equation');
        }
        
        // Add x term operations as correct answers
        const moveSmallerToOtherSide = () => {
            // Determine which x-term has the smaller absolute coefficient
            const moveLhs = Math.abs(lhsXCoeff) <= Math.abs(rhsXCoeff);
            const coeff = moveLhs ? lhsXCoeff : rhsXCoeff;
            if (coeff === 0) return; // nothing to move
            // To move a term across the equals, add/subtract that term on both sides with opposite sign
            if (coeff > 0) {
                // e.g., move +3x -> subtract 3x
                correctAnswers.push(`- ${coeff === 1 ? 'x' : coeff + 'x'}`);
            } else {
                // e.g., move -3x -> add 3x (this is the user's expected "+ 3x")
                correctAnswers.push(`+ ${Math.abs(coeff) === 1 ? 'x' : Math.abs(coeff) + 'x'}`);
            }
        };
        moveSmallerToOtherSide();
        
        // Extract constants from both sides and add them as correct answers
        const equationData = this.extractNumbersFromEquation(operand1, operand2);
        
        // Add constant operations as correct answers
        equationData.numbers.forEach(num => {
            // Only add constants that are not 0 or 1 (too obvious)
            if (num !== 0 && num !== 1) {
                if (num > 0) {
                    // For positive numbers, subtract them
                    correctAnswers.push(`- ${num}`);
                } else {
                    // For negative numbers, add them (which is the same as subtracting the absolute value)
                    correctAnswers.push(`+ ${Math.abs(num)}`);
                }
            }
        });
        
        // Also add fractions as correct answers if they exist
        equationData.fractions.forEach(fraction => {
            // Check if fraction is negative
            if (fraction.startsWith('-')) {
                // For negative fractions, add them
                correctAnswers.push(`+ ${fraction.substring(1)}`);
            } else {
                // For positive fractions, subtract them
                correctAnswers.push(`- ${fraction}`);
            }
        });
        
        // Generate plausible wrong options using dynamic calculation
        const possibleWrongOptions = this.calculatePossibleWrongOptions(operand1, operand2, correctAnswers);
        
        // Calculate how many wrong options we need to get exactly 4 total options
        const maxTotalOptions = 4;
        const neededWrongOptions = Math.max(0, maxTotalOptions - correctAnswers.length);
        
        // Take the needed number of wrong options
        const selectedWrongOptions = possibleWrongOptions.slice(0, neededWrongOptions);
        
        // Combine correct and wrong options, ensuring we don't exceed 4 total
        const allOptions = [...correctAnswers, ...selectedWrongOptions];
        const shuffledOptions = allOptions.sort(() => Math.random() - 0.5);
        
        return {
            options: shuffledOptions,
            correctAnswers: correctAnswers
        };
    }

    private generateOptionsForDistributive(operand1: string, operand2: string): { options: string[], correctAnswers: string[] } {
        // For distributive equations like 2(x+3) = 14, the first step can be:
        // 1. Distribute: 2(x+3) = 14 -> 2x + 6 = 14
        // 2. Divide by coefficient: 2(x+3) = 14 -> x+3 = 7
        
        // Determine which side has the brackets
        const bracketSide = operand1.includes('(') ? operand1 : operand2;
        
        // Parse the bracket expression to get the coefficient and inner expression
        const bracketParsed = this.parseBracketExpression(bracketSide);
        
        let correctAnswers: string[] = [];
        let options: string[] = [];
        if (bracketParsed) {
            // Add distribute with number labeling
            const trueCoeff = bracketParsed.coefficient;
            const correctLabel = `distribute ${trueCoeff}`;

            // Choose a wrong number: prefer a number present somewhere in the equation (including negatives)
            const { numbers, fractions } = this.extractNumbersFromEquation(operand1, operand2);
            // Include fraction numerators/denominators as candidate integers as well
            const fractionNums: number[] = [];
            fractions.forEach(f => {
                const [n, d] = f.split('/').map(v => parseInt(v));
                fractionNums.push(n, d);
            });
            const candidates = [...numbers, ...fractionNums]
                .map(n => n)
                .filter(n => n !== trueCoeff && n !== 0);
            let wrongNum: number;
            if (candidates.length > 0) {
                wrongNum = candidates[Math.floor(Math.random() * candidates.length)];
            } else {
                // random between -9..9 excluding 0 and trueCoeff
                const pool: number[] = [];
                for (let i = -9; i <= 9; i++) if (i !== 0 && i !== trueCoeff) pool.push(i);
                wrongNum = pool[Math.floor(Math.random() * pool.length)];
            }
            // Ensure wrong label isn't identical to correct label
            if (wrongNum === trueCoeff) {
                // pick a fallback different from both 0 and trueCoeff
                const pool: number[] = [];
                for (let i = -9; i <= 9; i++) if (i !== 0 && i !== trueCoeff) pool.push(i);
                wrongNum = pool[Math.floor(Math.random() * pool.length)];
            }
            const wrongLabel = `distribute ${wrongNum}`;

            // Correct answer is the distribute with true coefficient
            correctAnswers.push(correctLabel);
            options.push(correctLabel, wrongLabel);

            // Add divide by coefficient as another correct option
            correctAnswers.push(`÷ ${bracketParsed.coefficient}`);
        }
        
        // Generate other plausible wrong options (excluding duplicate distribute labels already added)
        const possibleWrongOptions = this.calculatePossibleWrongOptions(operand1, operand2, correctAnswers)
            .filter(opt => !/^distribute\s+/i.test(opt));
        const maxTotalOptions = 4;
        // Exclude the distribute-correct label from the additional correct options to avoid duplicates
        const correctLabelLower = options.find(o => /^distribute\s+/i.test(o))?.toLowerCase() || '';
        const otherCorrectOptions = correctAnswers.filter(c => c.toLowerCase() !== correctLabelLower);
        const neededWrongOptions = Math.max(0, maxTotalOptions - options.length - otherCorrectOptions.length);
        const selectedWrongOptions = possibleWrongOptions.slice(0, neededWrongOptions);
        const allOptions = [...options, ...otherCorrectOptions, ...selectedWrongOptions];
        const shuffledOptions = allOptions.sort(() => Math.random() - 0.5);
        
        return {
            options: shuffledOptions,
            correctAnswers: correctAnswers
        };
    }

    private parseBracketExpression(expression: string): { coefficient: number; innerExpression: string } | null {
        // Parse expressions like "2(x+3)", "3(x-2)", "-4(x+2)", or "-2(x-3)"
        const bracketMatch = expression.match(/^(-?\d+)\(([^)]+)\)$/);
        if (bracketMatch) {
            const coefficient = parseInt(bracketMatch[1]);
            const innerExpression = bracketMatch[2];
            return { coefficient, innerExpression };
        }
        return null;
    }

    private getXCoefficient(expression: string): number {
        // Extract the coefficient of x from an expression
        // Examples: "3x+5" -> 3, "x+5" -> 1, "-2x+3" -> -2, "5" -> 0
        
        // Normalize spaces and unicode minus
        const normalized = expression.replace(/[−–]/g, '-').replace(/\s+/g, '');

        // 1) Leading x-term like "-2x..." or "3x..."
        const leadingMatch = normalized.match(/^(-?\d*)x(?![\/])/);
        if (leadingMatch) {
            const coeffStr = leadingMatch[1];
            if (coeffStr === '' || coeffStr === '+') return 1;
            if (coeffStr === '-') return -1;
            return parseInt(coeffStr);
        }

        // 2) Anywhere x-term like "+5x" or "-3x" after constants: e.g., "4+5x", "28-3x"
        const anywhereMatch = normalized.match(/([+\-]?)(\d*)x(?![\/])/);
        if (anywhereMatch) {
            const sign = anywhereMatch[1];
            const digits = anywhereMatch[2];
            const base = digits === '' ? 1 : parseInt(digits);
            const coeff = sign === '-' ? -base : base;
            return coeff;
        }

        // 3) Handle plain 'x' present without explicit coefficient (shouldn't reach here due to above), treat as 1
        if (normalized.includes('x')) {
            return 1;
        }

        // No x term found
        return 0;
    }

    private simplifyExpression(expression: string): string {
        // Simplify expressions like "2x - 0" to "2x", "x + 0" to "x", etc.
        
        // Handle expressions with x terms
        if (expression.includes('x')) {
            // Simplify zero coefficient x
            if (/^0x$/.test(expression.trim())) {
                return '0';
            }
            // Simplify patterns like "0x + K" -> "K" and "0x - K" -> "-K"
            const zeroXWithConst = expression.match(/^0x\s*([+\-–−])\s*(-?\d+(?:\.\d+)?|\d+\/\d+)$/);
            if (zeroXWithConst) {
                const operator = zeroXWithConst[1];
                const constantStr = zeroXWithConst[2].trim();
                if (operator === '+' || operator === '–' || operator === '−') {
                    // 0x + K => K
                    return constantStr;
                } else {
                    // 0x - K => -K
                    return constantStr.startsWith('-') ? constantStr.substring(1) : `-${constantStr}`;
                }
            }
            
            // Simplify unit coefficient x: 1x -> x, -1x -> -x (including when followed by division)
            let simplified = expression
                .replace(/\b1x\b/g, 'x')
                .replace(/\b-1x\b/g, '-x')
                .replace(/\b1x(?=\/)/g, 'x')
                .replace(/\b-1x(?=\/)/g, '-x');
            if (simplified !== expression) {
                expression = simplified;
            }
            
            // Remove dangling operator at the end like "-2x + " or "x - "
            if (/\s[+\-–−]\s*$/.test(expression)) {
                expression = expression.replace(/\s[+\-–−]\s*$/, '');
            }

            // Handle fraction expressions with multiple operations
            // Pattern: x/denominator [+/-] constant1 [+/-] constant2 ...
            const fractionMultiOpMatch = expression.match(/^(x\/\d+)\s*([+\-–−])\s*(\d+(?:\/\d+)?)\s*([+\-–−])\s*(\d+(?:\/\d+)?)$/);
            if (fractionMultiOpMatch) {
                const fractionPart = fractionMultiOpMatch[1]; // "x/5"
                const op1 = fractionMultiOpMatch[2].replace(/[−–]/g, '-'); // "-"
                const const1 = fractionMultiOpMatch[3]; // "6"
                const op2 = fractionMultiOpMatch[4].replace(/[−–]/g, '-'); // "+"
                const const2 = fractionMultiOpMatch[5]; // "6"
                
                // Calculate the combined constant: op1(const1) op2 const2
                let combined: number;
                const val1 = parseFloat(const1);
                const val2 = parseFloat(const2);
                
                // First constant with its operator
                const firstValue = op1 === '-' ? -val1 : val1;
                // Second constant with its operator
                combined = op2 === '-' ? firstValue - val2 : firstValue + val2;
                                
                if (Math.abs(combined) < 0.0001) { // Handle floating point comparison
                    return fractionPart;
                } else if (combined > 0) {
                    return `${fractionPart} + ${combined}`;
                } else {
                    return `${fractionPart} - ${Math.abs(combined)}`;
                }
            }

            // Combine constants around a single x-term when present, e.g., "-6 - 9x + 6" => "-9x"
            const norm = expression.replace(/[−–]/g, '-').replace(/\s+/g, ' ').trim();
            const aroundXMatch = norm.match(/^([+\-]?\d+(?:\/\d+)?)\s*[+\-]\s*([+\-]?\d*)x\s*(?:([+\-])\s*([+\-]?\d+(?:\/\d+)?))?$/);
            if (aroundXMatch) {
                const constBefore = aroundXMatch[1];
                const coeffStr = aroundXMatch[2];
                const sign2 = aroundXMatch[3];
                const constAfter = aroundXMatch[4];

                // Build x-term string from coeff
                let coeff: number;
                if (coeffStr === '' || coeffStr === '+') coeff = 1;
                else if (coeffStr === '-') coeff = -1;
                else coeff = parseInt(coeffStr);
                const xTerm = coeff === 1 ? 'x' : (coeff === -1 ? '-x' : `${coeff}x`);

                // Sum constants (handle fractions if present)
                const sumConstants = (a: string, s: string | undefined, b?: string): string => {
                    if (!b || !s) return a;
                    if (a.includes('/') || b.includes('/')) {
                        return s === '+' ? this.addFractions(a, b) : this.subtractFractions(a, b);
                    }
                    const aNum = parseFloat(a);
                    const bNum = parseFloat(b);
                    const res = s === '+' ? aNum + bNum : aNum - bNum;
                    if (Math.abs(res) === 0) return '0';
                    return Number.isInteger(res) ? res.toString() : res.toString();
                };
                const combinedConst = sumConstants(constBefore, sign2, constAfter);

                if (combinedConst === '0') {
                    return xTerm;
                } else if (combinedConst.startsWith('-')) {
                    return `${xTerm} - ${combinedConst.substring(1)}`;
                } else {
                    return `${xTerm} + ${combinedConst}`;
                }
            }

            // Check for patterns like "2x - 0" or "x + 0"
            if (expression.includes(' - 0') || expression.includes(' + 0')) {
                // Remove the " - 0" or " + 0" part
                return expression.replace(/[\s]?[+\-][\s]?0$/, '');
            }
            
            // Check for patterns like "0 + x" or "0 - x"
            if (expression.startsWith('0 + ')) {
                return expression.substring(4); // Remove "0 + "
            }
            if (expression.startsWith('0 - ')) {
                return expression.substring(4); // Remove "0 - " (but keep the negative)
            }
            

        }
        
        // Handle numeric expressions
        if (!expression.includes('x')) {
            // Simplify "0" to "0"
            if (expression === '0') {
                return '0';
            }
        }
        
        // If expression became empty due to prior cleanup, treat as 0
        if (expression.trim() === '') {
            return '0';
        }
        
        return expression;
    }

    private simplifyFraction(numerator: number, denominator: number): string {
        // If the result is a whole number, return it as a string
        if (Number.isInteger(numerator / denominator)) {
            return (numerator / denominator).toString();
        }
        
        // Find the greatest common divisor to simplify the fraction
        const gcd = this.greatestCommonDivisor(Math.abs(numerator), Math.abs(denominator));
        const simplifiedNum = numerator / gcd;
        const simplifiedDen = denominator / gcd;
        
        // Handle negative fractions
        if (simplifiedDen < 0) {
            return `${-simplifiedNum}/${-simplifiedDen}`;
        }
        
        return `${simplifiedNum}/${simplifiedDen}`;
    }

    private greatestCommonDivisor(a: number, b: number): number {
        // Euclidean algorithm to find GCD
        while (b !== 0) {
            const temp = b;
            b = a % b;
            a = temp;
        }
        return a;
    }

    private normalizeNumberString(value: string): string {
        // Normalize unicode minus to hyphen and remove all spaces
        return value.replace(/[−–—]/g, '-').replace(/\s+/g, '').trim();
    }

    private formatExpression(expression: string): string {
        // Handle cases where expression already has proper spacing
        if (expression.includes(' + ') || expression.includes(' - ') || expression.includes(' × ') || expression.includes(' ÷ ')) {
            return expression;
        }

        let formatted = expression;
        
        // Handle specific patterns from the question banks
        
        // Pattern: x+8, x-5 -> x + 8, x - 5
        formatted = formatted.replace(/(x)([+-])(\d+)/g, '$1 $2 $3');
        
        // Pattern: 3x+4, 5x-2 -> 3x + 4, 5x - 2
        formatted = formatted.replace(/(\d+x)([+-])(\d+)/g, '$1 $2 $3');
        
        // Pattern: x/3+2, x/5-1 -> x/3 + 2, x/5 - 1
        formatted = formatted.replace(/(x\/\d+)([+-])(\d+)/g, '$1 $2 $3');
        
        // Pattern: 3(x+4), 2(x-1) -> 3(x + 4), 2(x - 1)
        formatted = formatted.replace(/(\d+\(x)([+-])(\d+\))/g, '$1 $2 $3');
        
        // Pattern: 4(3x+5), 2(3x-2) -> 4(3x + 5), 2(3x - 2)
        formatted = formatted.replace(/(\d+\(\d+x)([+-])(\d+\))/g, '$1 $2 $3');

        // New patterns: constant ± x or constant ± coeff·x -> add spaces
        // Examples: 30-x -> 30 - x, 28-3x -> 28 - 3x, 7+x -> 7 + x
        formatted = formatted.replace(/(\d+)([+-])(x)/g, '$1 $2 $3');
        formatted = formatted.replace(/(\d+)([+-])(\d+x)/g, '$1 $2 $3');
        // Fractions as constants with x on right
        formatted = formatted.replace(/(\d+\/\d+)([+-])(x)/g, '$1 $2 $3');
        formatted = formatted.replace(/(\d+\/\d+)([+-])(\d+x)/g, '$1 $2 $3');
        
        return formatted;
    }

    private formatForDisplay(expression: string): string {
        let formatted = expression;
        
        // Replace x with proper algebra symbol 𝑥
        formatted = formatted.replace(/x/g, '𝑥');
        
        // Replace operators with proper math symbols
        formatted = formatted.replace(/-/g, '–'); // en-dash for subtraction
        formatted = formatted.replace(/\*/g, '×'); // multiplication symbol
        // formatted = formatted.replace(/\//g, '÷'); // division symbol
        
        return formatted;
    }

    private getOperationTypes(correctAnswers: string[]): { hasAddSubtract: boolean; hasMultiplyDivide: boolean } {
        let hasAddSubtract = false;
        let hasMultiplyDivide = false;
        
        for (const answer of correctAnswers) {
            if (answer.startsWith('+') || answer.startsWith('-') || answer.startsWith('–')) {
                hasAddSubtract = true;
            } else if (answer.startsWith('×') || answer.startsWith('÷') || answer.startsWith('*') || answer.startsWith('/')) {
                hasMultiplyDivide = true;
            }
        }
        
        return { hasAddSubtract, hasMultiplyDivide };
    }

    private extractNumbersFromEquation(operand1: string, operand2: string): { numbers: number[], fractions: string[] } {
        const numbers: number[] = [];
        const fractions: string[] = [];
        
        // Extract numbers and fractions from both operands
        const extractFromString = (str: string) => {
            // Normalize unicode minus/en-dash to ASCII hyphen for consistent parsing
            const normalized = str.replace(/[−–]/g, '-');
            // First, extract all negative numbers with spaces (like " - 8")
            const negativeWithSpacesMatches = normalized.match(/\s*-\s*(\d+)(?!x)(?!\/\d+)/g);
            if (negativeWithSpacesMatches) {
                negativeWithSpacesMatches.forEach(match => {
                    const num = parseInt(match.replace(/\s+/g, ''));
                    numbers.push(num); // Already negative from parseInt
                });
            }
            
            // Then extract standalone negative numbers (like "-8")
            const standaloneNegativeMatches = normalized.match(/(?<!\d)-\d+(?!x)(?!\/\d+)/g);
            if (standaloneNegativeMatches) {
                standaloneNegativeMatches.forEach(match => {
                    const num = parseInt(match);
                    numbers.push(num); // Already negative
                });
            }
            
            // Finally, extract positive numbers that are not part of coefficients
            // But only if we didn't find any negative numbers with spaces
            if (negativeWithSpacesMatches === null || negativeWithSpacesMatches.length === 0) {
                const positiveMatches = normalized.match(/(?<!\s-)(?<!\d-)\d+(?!x)(?!\/\d+)/g);
                if (positiveMatches) {
                    positiveMatches.forEach(match => {
                        const num = parseInt(match);
                        numbers.push(num);
                    });
                }
            }
            
            // Extract fractions
            const fractionMatches = normalized.match(/-?\d+\/\d+/g);
            if (fractionMatches) {
                fractionMatches.forEach(match => {
                    fractions.push(match);
                    // Don't add individual numbers from fractions to avoid decimal options
                });
            }
        };
        
        extractFromString(operand1);
        extractFromString(operand2);
        
        // Filter out numbers that are part of fractions
        const fractionNumbers = new Set<number>();
        fractions.forEach(fraction => {
            const [num, den] = fraction.split('/').map(n => parseInt(n));
            fractionNumbers.add(num);
            fractionNumbers.add(den);
        });
        
        // Remove numbers that are part of fractions
        const nonFractionNumbers = numbers.filter(num => !fractionNumbers.has(num));
        
        // Remove duplicates and filter out 0 and 1 (too obvious)
        // But handle the case where we have both positive and negative versions of the same number
        const uniqueNumbers: number[] = [];
        const seen = new Set<number>();
        
        nonFractionNumbers.forEach(num => {
            const absNum = Math.abs(num);
            if (absNum !== 0 && absNum !== 1 && !seen.has(absNum)) {
                seen.add(absNum);
                // If we have both positive and negative versions, prefer the negative
                const hasNegative = nonFractionNumbers.some(n => n === -absNum);
                const hasPositive = nonFractionNumbers.some(n => n === absNum);
                if (hasNegative && hasPositive) {
                    uniqueNumbers.push(-absNum); // Prefer negative
                } else {
                    uniqueNumbers.push(num);
                }
            }
        });
        
        const uniqueFractions = [...new Set(fractions)];
        
        return { numbers: uniqueNumbers, fractions: uniqueFractions };
    }

    private calculatePossibleWrongOptions(operand1: string, operand2: string, correctAnswers: string[]): string[] {
        // Extract numbers and fractions from the equation
        const equationData = this.extractNumbersFromEquation(operand1, operand2);
        
        const possibleWrongOptions: string[] = [];
        
        // Get the operations used in correct answers to determine what operations to use for wrong options
        const { hasAddSubtract, hasMultiplyDivide } = this.getOperationTypes(correctAnswers);
        
        // Determine allowed operations for wrong options
        let allowedOperations: string[];
        if (hasAddSubtract && !hasMultiplyDivide) {
            allowedOperations = ['+', '-'];
        } else if (hasMultiplyDivide && !hasAddSubtract) {
            allowedOperations = ['×', '÷'];
        } else {
            allowedOperations = ['+', '-', '×', '÷'];
        }
        
        // Check if equation has fractions or decimals
        const hasFractions = operand1.includes('/') || operand2.includes('/');
        // const hasDecimals = operand1.includes('.') || operand2.includes('.');
        // const correctAnswersHaveFractions = correctAnswers.some(answer => answer.includes('/'));
        
        // Generate wrong options based on equation type
        if (hasFractions) {
            // Use actual fractions from the equation
            if (equationData.fractions.length > 0) {
                equationData.fractions.forEach(fraction => {
                    allowedOperations.forEach(op => {
                        const simplifiedOption = this.simplifyOperation(op, fraction);
                        if (!correctAnswers.includes(simplifiedOption)) {
                            possibleWrongOptions.push(simplifiedOption);
                        }
                    });
                });
            }
            
            // For fraction equations, only use whole numbers that are not from fractions
            // Filter out numbers that come from fraction denominators/numerators
            const fractionNumbers = new Set<number>();
            equationData.fractions.forEach(fraction => {
                const [num, den] = fraction.split('/').map(n => parseInt(n));
                fractionNumbers.add(num);
                fractionNumbers.add(den);
            });
            
            const nonFractionNumbers = equationData.numbers.filter(num => !fractionNumbers.has(num));
            if (nonFractionNumbers.length > 0) {
                nonFractionNumbers.slice(0, 3).forEach(num => {
                    allowedOperations.forEach(op => {
                        const simplifiedOption = this.simplifyOperation(op, num.toString());
                        if (!correctAnswers.includes(simplifiedOption)) {
                            possibleWrongOptions.push(simplifiedOption);
                        }
                    });
                });
            }
        } else {
            // Generate whole number wrong options
            if (equationData.numbers.length > 0) {
                equationData.numbers.slice(0, 4).forEach(num => {
                    allowedOperations.forEach(op => {
                        const simplifiedOption = this.simplifyOperation(op, num.toString());
                        if (!correctAnswers.includes(simplifiedOption)) {
                            possibleWrongOptions.push(simplifiedOption);
                        }
                    });
                });
            }
        }
        
        // Add some common wrong operations that make sense contextually
        // For example, if the correct answer is "÷ 3", wrong options could be "× 3", "÷ 2", etc.
        correctAnswers.forEach(correctAnswer => {
            if (correctAnswer.startsWith('÷')) {
                const divisor = correctAnswer.substring(2).trim();
                // Add multiplication by the same number as wrong option
                const wrongOption = `× ${divisor}`;
                if (!correctAnswers.includes(wrongOption) && !possibleWrongOptions.includes(wrongOption)) {
                    possibleWrongOptions.push(wrongOption);
                }
            } else if (correctAnswer.startsWith('×')) {
                const multiplier = correctAnswer.substring(2).trim();
                // Add division by the same number as wrong option
                const wrongOption = `÷ ${multiplier}`;
                if (!correctAnswers.includes(wrongOption) && !possibleWrongOptions.includes(wrongOption)) {
                    possibleWrongOptions.push(wrongOption);
                }
            }
        });
        
        // Filter out any decimal options to ensure only integers and fractions are used
        const filteredOptions = possibleWrongOptions.filter(option => {
            const numberPart = option.replace(/^[+\-×÷]\s*/, '').trim();
            // Disallow decimals anywhere (both integer and fraction forms allowed)
            if (numberPart.includes('.')) return false;
            return true;
        });
        
        return filteredOptions;
    }

    private parseExpression(expression: string): {
        type: 'simple' | 'addition' | 'subtraction' | 'multiplication' | 'division' | 'complex' | 'fraction';
        constant?: number;
        coefficient?: number;
        divisor?: number;
        fractionDenominator?: number;
        fractionConstant?: string; // Add this to store fractions as strings
    } {
        expression = expression.trim();
        
        // Simple x (treat "+x" as simple as well)
        if (expression === 'x' || expression === '+x') {
            return { type: 'simple' };
        }
        // Unary negative x -> treat as multiplication with coefficient -1
        if (expression === '-x') {
            return { type: 'multiplication', coefficient: -1 };
        }
        
        // Fraction expressions: x/2 + 3, x/3 - 2, etc.
        const fractionMatch = expression.match(/^x\/(\d+)\s*([+\-–−])\s*(-?\d+(?:\.\d+)?)$/);
        if (fractionMatch) {
            const denominator = parseInt(fractionMatch[1]);
            const operator = fractionMatch[2];
            const constant = parseFloat(fractionMatch[3]);
            
            return {
                type: 'fraction',
                fractionDenominator: denominator,
                constant: operator === '+' ? constant : -constant
            };
        }

        // Reverse order fraction expressions: 3 + x/4, 5 - x/2, etc.
        const reverseFractionMatch = expression.match(/^(-?\d+(?:\.\d+)?|\d+\/\d+)\s*([+\-–−])\s*x\/(\d+)$/);
        if (reverseFractionMatch) {
            const constantStr = reverseFractionMatch[1];
            const operator = reverseFractionMatch[2];
            const denominator = parseInt(reverseFractionMatch[3]);
            
            let constant: number;
            if (constantStr.includes('/')) {
                const [num, den] = constantStr.split('/').map(n => parseInt(n));
                constant = num / den;
            } else {
                constant = parseFloat(constantStr);
            }
            
            return {
                type: 'fraction',
                fractionDenominator: denominator,
                constant: operator === '+' ? constant : -constant
            };
        }
        
        // Complex fraction expressions: (x + 2)/4 + 1, (x - 3)/5 - 2, etc.
        const complexFractionMatch = expression.match(/^\(([^)]+)\)\/(\d+)\s*([+\-–−])\s*(-?\d+(?:\.\d+)?)$/);
        if (complexFractionMatch) {
            const denominator = parseInt(complexFractionMatch[2]);
            const operator = complexFractionMatch[3];
            const constant = parseFloat(complexFractionMatch[4]);
            
            return {
                type: 'fraction',
                fractionDenominator: denominator,
                constant: operator === '+' ? constant : -constant
            };
        }
        
        // Complex expressions like 2x + 4, -4x + 2, -4x - 8, -x - 7, x + 5/2
        // Allow optional explicit coefficient; treat empty or '+' as 1, '-' as -1
        const complexMatch = expression.match(/^([+\-–−]?\d*)x\s*([+\-–−])\s*(-?\d+(?:\.\d+)?|\d+\/\d+)$/);
        if (complexMatch) {
            const rawCoeffStr = complexMatch[1];
            let coefficient: number;
            if (rawCoeffStr === '' || rawCoeffStr === '+') {
                coefficient = 1;
            } else if (rawCoeffStr === '-' || rawCoeffStr === '−' || rawCoeffStr === '–') {
                coefficient = -1;
            } else {
                coefficient = parseInt(rawCoeffStr.replace(/[−–]/g, '-'));
            }
            const operator = complexMatch[2];
            const constantStr = complexMatch[3];
            
            let constant: number;
            let fractionConstant: string | undefined;
            if (constantStr.includes('/')) {
                // Handle fractions like "5/2"
                const [num, den] = constantStr.split('/').map(n => parseInt(n));
                constant = num / den;
                fractionConstant = constantStr; // Store the original fraction
            } else {
                constant = parseFloat(constantStr);
            }
            
            return {
                type: 'complex',
                coefficient: coefficient,
                constant: operator === '+' ? constant : -constant,
                fractionConstant: fractionConstant
            };
        }
        
        // Reverse complex expressions like 4 + 2x, 2 + -4x, 8 - 2x, or 5/2 + 2x
        const reverseComplexMatch = expression.match(/^(-?\d+(?:\.\d+)?|\d+\/\d+)\s*([+\-–−])\s*(-?\d+)x$/);
        if (reverseComplexMatch) {
            const constantStr = reverseComplexMatch[1];
            const operator = reverseComplexMatch[2];
            const coefficient = parseInt(reverseComplexMatch[3]);
            
            let constant: number;
            if (constantStr.includes('/')) {
                // Handle fractions like "5/2"
                const [num, den] = constantStr.split('/').map(n => parseInt(n));
                constant = num / den;
            } else {
                constant = parseFloat(constantStr);
            }
            
            return {
                type: 'complex',
                coefficient: operator === '+' ? coefficient : -coefficient,
                constant: constant
            };
        }

        // Reverse complex with implicit coefficient 1 for x: e.g., 30 - x, 7 + x, 5/2 - x
        const reverseComplexImplicitXMatch = expression.match(/^(-?\d+(?:\.\d+)?|\d+\/\d+)\s*([+\-–−])\s*x$/);
        if (reverseComplexImplicitXMatch) {
            const constantStr = reverseComplexImplicitXMatch[1];
            const operator = reverseComplexImplicitXMatch[2];
            let constant: number;
            if (constantStr.includes('/')) {
                const [num, den] = constantStr.split('/').map(n => parseInt(n));
                constant = num / den;
            } else {
                constant = parseFloat(constantStr);
            }
            // operator '+' => +x => coefficient = +1; operator '-' => -x => coefficient = -1
            const coefficient = operator === '+' ? 1 : -1;
            return {
                type: 'complex',
                coefficient: coefficient,
                constant: constant
            };
        }
        
        // Addition: x + 3, x + 1.5, or x + 5/2 (with or without spaces)
        if (expression.includes('+')) {
            const parts = expression.split('+');
            if (parts[0].trim() === 'x') {
                // Handle multiple additions like "x+2 + 4"
                if (parts.length > 2) {
                    // Sum all constants after the first part
                    let totalConstant = 0;
                    for (let i = 1; i < parts.length; i++) {
                        const constantPart = parts[i].trim();
                        if (constantPart.includes('/')) {
                            // Handle fractions like "5/2"
                            const [num, den] = constantPart.split('/').map(n => parseInt(n));
                            totalConstant += num / den;
                        } else {
                            totalConstant += parseFloat(constantPart);
                        }
                    }
                    return { 
                        type: 'addition', 
                        constant: totalConstant
                    };
                } else {
                    const constantPart = parts[1].trim();
                    if (constantPart.includes('/')) {
                        // Handle fractions like "5/2"
                        const [num, den] = constantPart.split('/').map(n => parseInt(n));
                        return { 
                            type: 'addition', 
                            constant: num / den
                        };
                    } else {
                        return { 
                            type: 'addition', 
                            constant: parseFloat(constantPart) 
                        };
                    }
                }
            } else if (parts[1] && parts[1].trim() === 'x') {
                // Handle expressions where constant comes before x like "7 + x"
                const constantPart = parts[0].trim();
                if (constantPart.includes('/')) {
                    // Handle fractions like "5/2"
                    const [num, den] = constantPart.split('/').map(n => parseInt(n));
                    return { 
                        type: 'addition', 
                        constant: num / den
                    };
                } else {
                    return { 
                        type: 'addition', 
                        constant: parseFloat(constantPart) 
                    };
                }
            }
        }
        
        // Also handle addition without spaces: x+3, x+1.5, x+5/2
        const additionMatch = expression.match(/^x\+(-?\d+(?:\.\d+)?|\d+\/\d+)$/);
        if (additionMatch) {
            const constantStr = additionMatch[1];
            if (constantStr.includes('/')) {
                // Handle fractions like "5/2"
                const [num, den] = constantStr.split('/').map(n => parseInt(n));
                return { 
                    type: 'addition', 
                    constant: num / den
                };
            } else {
                return { 
                    type: 'addition', 
                    constant: parseFloat(constantStr) 
                };
            }
        }
        
        // Complex addition: x+2 + 4, x+3 + 5, etc.
        const complexAdditionMatch = expression.match(/^x\+(\d+)\s*\+\s*(\d+)$/);
        if (complexAdditionMatch) {
            const constant1 = parseInt(complexAdditionMatch[1]);
            const constant2 = parseInt(complexAdditionMatch[2]);
            const totalConstant = constant1 + constant2;
            
            return { 
                type: 'addition', 
                constant: totalConstant
            };
        }
        
        // Subtraction: x - 3, x – 3 (en-dash), x − 3 (Unicode minus), or x - 5/2
        if (expression.includes('-') || expression.includes('–') || expression.includes('−')) {
            // Find which dash character is used
            let dashChar = '-';
            if (expression.includes('−')) {
                dashChar = '−';
            } else if (expression.includes('–')) {
                dashChar = '–';
            }
            
            const parts = expression.split(dashChar);
            if (parts[0].trim() === 'x') {
                const constantPart = parts[1].trim();
                if (constantPart.includes('/')) {
                    // Handle fractions like "5/2"
                    const [num, den] = constantPart.split('/').map(n => parseInt(n));
                    return { 
                        type: 'subtraction', 
                        constant: num / den
                    };
                } else {
                    return { 
                        type: 'subtraction', 
                        constant: parseFloat(constantPart) 
                    };
                }
            }
        }
        
        // Also handle subtraction without spaces: x-3, x-1.5, x-5/2
        const subtractionMatch = expression.match(/^x-(-?\d+(?:\.\d+)?|\d+\/\d+)$/);
        if (subtractionMatch) {
            const constantStr = subtractionMatch[1];
            if (constantStr.includes('/')) {
                // Handle fractions like "5/2"
                const [num, den] = constantStr.split('/').map(n => parseInt(n));
                return { 
                    type: 'subtraction', 
                    constant: num / den
                };
            } else {
                return { 
                    type: 'subtraction', 
                    constant: parseFloat(constantStr) 
                };
            }
        }
        
        // Multiplication: 3x or -3x
        const multiplicationMatch = expression.match(/^(-?\d+)x$/);
        if (multiplicationMatch) {
            return { 
                type: 'multiplication', 
                coefficient: parseInt(multiplicationMatch[1]) 
            };
        }
        
        // Division: x ÷ 3
        if (expression.includes('÷')) {
            const parts = expression.split('÷');
            if (parts[0].trim() === 'x') {
                return { 
                    type: 'division', 
                    divisor: parseInt(parts[1].trim()) 
                };
            }
        }
        
        // Simple fraction expressions: x/2, x/3, etc.
        const simpleFractionMatch = expression.match(/^x\/(\d+)$/);
        if (simpleFractionMatch) {
            return { 
                type: 'division', 
                divisor: parseInt(simpleFractionMatch[1]) 
            };
        }

        // Simple unary x multiplication: -x or +x
        const unaryXMatch = expression.match(/^([+-])x$/);
        if (unaryXMatch) {
            const sign = unaryXMatch[1] === '-' ? -1 : 1;
            return {
                type: 'multiplication',
                coefficient: sign
            };
        }
        
        // Simple complex fraction expressions: (x+2)/4, (x-3)/5, etc.
        const simpleComplexFractionMatch = expression.match(/^\(([^)]+)\)\/(\d+)$/);
        if (simpleComplexFractionMatch) {
            const denominator = parseInt(simpleComplexFractionMatch[2]);
            
            return { 
                type: 'division', 
                divisor: denominator
            };
        }
        
        // Handle incomplete expressions like "-22x + " (missing constant)
        const incompleteMatch = expression.match(/^(-?\d+)x\s*[+\-–−]\s*$/);
        if (incompleteMatch) {
            const coefficient = parseInt(incompleteMatch[1]);
            return {
                type: 'multiplication',
                coefficient: coefficient
            };
        }
        
        throw new Error(`Unsupported expression format: ${expression}`);
    }

    private loadNextQuestion(): void {
        let question: Question | null = null;
        if(this.isInstructionMode) {
            if(this.topic === 'grade6_topic4' && this.level === 2) {
                question = {
                    operand1: "2x",
                    operand2: "6",
                    answer: "3"
                }
            } else if(this.topic === 'grade7_topic5' && this.level === 1) {
                question = {
                    operand1: "2x + 3",
                    operand2: "11",
                    answer: "4"
                }
            } else if(this.topic === 'grade7_topic5' && this.level === 2) {
                question = {
                    operand1: "x/2 + 3",
                    operand2: "9",
                    answer: "12"
                }
            } else if(this.topic === 'grade7_topic5' && this.level === 3) {
                question = {
                    operand1: "2(x + 3)",
                    operand2: "14",
                    answer: "4"
                }
            } else if(this.topic === 'grade7_topic5' && this.level === 4) {
                question = {
                    operand1: "2x + 6",
                    operand2: "x + 14",
                    answer: "4"
                }
            } else {
                question = {
                    operand1: "x + 4",
                    operand2: "8",
                    answer: "4"
                }
            }
        } else {
            // Add accessibility overlay and announce
            this.queueA11yAnnouncement(i18n.t('stepEquations.solveForX'));
            question = this.questionSelector.getNextQuestion();
        }

        if (!question) {
            // Game over
            this.gameOver();
            return;
        }

        this.currentQuestion = question;
        this.isEquationSolved = false; // Reset the solved flag
        this.selectedOperations = []; // Reset selected operations for new question

        // Initialize current equation state
        // Handle cases where operand1 might contain the entire equation
        if (this.currentQuestion.operand1.includes('=')) {
            const parts = this.currentQuestion.operand1.split('=');
            this.currentLhs = this.formatExpression(parts[0].trim());
            this.currentRhs = this.formatExpression(parts[1].trim());
        } else {
            this.currentLhs = this.formatExpression(this.currentQuestion.operand1);
            this.currentRhs = this.formatExpression(this.currentQuestion.operand2);
        }

        // Clean up previous UI
        this.cleanupUI();

        // Create the initial equation
        const lhsContainer = this.createExpressionWithFractions(0, 0, this.currentLhs);
        const lhsWidth = this.getContainerWidth(lhsContainer) / this.scene.display.scale;
        const rhsContainer = this.createExpressionWithFractions(0, 0, this.currentRhs);
        const rhsWidth = this.getContainerWidth(rhsContainer) / this.scene.display.scale;
        
        // Position equations at the top of the scroll container with padding
        const padding = 10;
        const baseEquationHeight = 88; // Base height of each equation
        const equationY = -371/2 + padding + baseEquationHeight/2; // Start at top of scroll area with padding, accounting for equation height
        
        // Center the equation horizontally within the scroll container
        const centerX = 0; // Container center is at (0,0) since we set origin to center
        
        // Add all elements to the scroll container first
        this.scrollContainer.add(lhsContainer);
        this.scrollContainer.add(rhsContainer);
        
        const equalsText = this.scene.addText(0, 0, "=", {
            font: "700 46px Exo",
            color: "#000000",
        }).setOrigin(0.5);
        this.scrollContainer.add(equalsText);
        
        // Set positions after adding to container
        lhsContainer.setPosition(this.scene.getScaledValue(centerX - 62 - lhsWidth/2), this.scene.getScaledValue(equationY));
        rhsContainer.setPosition(this.scene.getScaledValue(centerX + 62 + rhsWidth/2), this.scene.getScaledValue(equationY));
        equalsText.setPosition(this.scene.getScaledValue(centerX - 2), this.scene.getScaledValue(equationY));
        
        // Store the initial equation
        this.equations.push({
            lhs: lhsContainer,
            rhs: rhsContainer,
            equals: equalsText
        });

        // Add accessibility overlay to the hidden text
        this.scene.time.delayedCall(100, () => {
            this.queueA11yAnnouncement(this.getReadableEquation(this.currentLhs, this.currentRhs));
        });

        // Check and adjust layout if equations are out of bounds
        this.adjustEquationLayout();

        // Generate initial options
        this.generateNewOptions();
    }

    private generateNewOptions(): void {
        // Clean up previous option buttons
        this.optionButtons.forEach(button => {
            button.destroy();
        });
        this.optionButtons = [];
        
        // Generate new options for current equation
        const { options, correctAnswers } = this.generateOptionsForEquation(this.currentLhs, this.currentRhs);
        this.currentCorrectAnswers = correctAnswers;
        
        // Select a random color for all options in this question
        const colors = ["blue", "pink", "purple", "teal"];
        this.currentOptionColor = colors[Math.floor(Math.random() * colors.length)];
        
        // Create new option buttons
        const optionWidth = 215;
        const gap = 27;
        const totalWidth = options.length * optionWidth + (options.length - 1) * gap;
        const startX = this.scene.display.width / 2 - totalWidth / 2;
        options.forEach((option: string, index: number) => {
            const x = startX + (optionWidth / 2) + index * (optionWidth + gap);
            const y = 680;
            this.createOption(x, y, option);
        });

        // In tutorial mode, only the correct option should be clickable and focusable
        if (this.isInstructionMode) {
            const normalize = (s: string) => s.replace(/[\u2212\u2013\u2014]/g, '-').trim();
            const correctSet = new Set(this.currentCorrectAnswers.map(normalize));
            // Iterate buttons and disable all non-correct ones
            this.optionButtons.forEach((btn) => {
                const opt = btn.getData('option');
                const isCorrect = opt && correctSet.has(normalize(opt));
                const overlay = (btn as any).buttonOverlay as ButtonOverlay | undefined;
                if (!isCorrect) {
                    // Disable pointer interactions
                    btn.disableInteractive();
                    // btn.setAlpha(0.6);
                    // Update accessibility: remove from tab order and mark disabled
                    if (overlay && (overlay as any).domElement?.node) {
                        const el = (overlay as any).domElement.node as HTMLElement;
                        el.setAttribute('tabindex', '-1');
                        el.setAttribute('aria-disabled', 'true');
                        el.setAttribute('aria-hidden', 'false'); // still announced if focused programmatically
                    }
                } else {
                    // Ensure the correct option remains focusable
                    if (overlay && (overlay as any).domElement?.node) {
                        const el = (overlay as any).domElement.node as HTMLElement;
                        el.setAttribute('tabindex', '0');
                        el.removeAttribute('aria-disabled');
                    }
                }
            });
            // Move focus to the correct option
            const correctBtn = this.optionButtons.find(btn => {
                const opt = btn.getData('option');
                return opt && correctSet.has(normalize(opt));
            });
            if (correctBtn) {
                const overlay = (correctBtn as any).buttonOverlay as ButtonOverlay | undefined;
                if (overlay && (overlay as any).element) {
                    try { (overlay as any).element.focus({ preventScroll: true }); } catch {}
                }
            }
        }
    }

    private createHelpButton() {
        const onKeyDown = () => {
            this.scene.audioManager.stopBackgroundMusic();
            this.scene.scene.pause();
            this.scene.scene.launch('InstructionsScene', {
                level: this.level,
                mechanic: 'step_equations',
                parentScene: 'GameScene',
            });
            this.scene.scene.bringToTop("InstructionsScene");
        }
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
            onClick: () => onKeyDown(),
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

    private createMuteButton() {
        const onKeyDown = () => {
            this.scene.audioManager.setMute(!this.scene.audioManager.getIsAllMuted());
        }
        this.muteBtn = ButtonHelper.createIconButton({
            scene: this.scene,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: this.scene.audioManager.getIsAllMuted() ? BUTTONS.MUTE_ICON.KEY : BUTTONS.UNMUTE_ICON.KEY,
            x: this.scene.display.width - 54,
            y: 142,
            label: i18n.t('common.mute'),
            ariaLive: 'off',
            raisedOffset: 3.5,
            onClick: () => onKeyDown(),
        });
    }

    private createPauseButton() {
        const onKeyDown = () => {
            this.scene.scene.pause();
            this.scene.scene.launch("PauseScene", { parentScene: "GameScene" });
            this.scene.audioManager.pauseAll();
            this.scene.scene.bringToTop("PauseScene");
        }
        ButtonHelper.createIconButton({
            scene: this.scene,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.PAUSE_ICON.KEY,
            raisedOffset: 3.5,
            x: this.scene.display.width - 54,
            y: 66,
            label: i18n.t('common.pause'),
            onClick: () => onKeyDown(),
        }).setName('pause_btn');
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


    private getReadableEquation(lhs: string, rhs: string): string {
        // Helper to read a single side of the equation
        const readSide = (expr: string): string => {
            // Handle bracketed multiplication: 3(x+2) => "three times open parenthesis x plus two close parenthesis"
            expr = expr.replace(/(\d+)\s*\(\s*([^)]+)\s*\)/g, (_match, coeff, inside) => {
                return `${parseInt(coeff)} times open parenthesis ${readSide(inside)} close parenthesis`;
            });

            // Handle terms like 3x, -2x, x (but not as multiplication)
            expr = expr.replace(/([+-]?\d*)x/g, (_match, coeff) => {
                if (coeff === '' || coeff === '+') return 'x';
                if (coeff === '-') return 'minus x';
                return `${parseInt(coeff)} x`;
            });

            // Handle fractions: (x+2)/4 or x/3
            expr = expr.replace(/\(([^)]+)\)\s*\/\s*(\d+)/g, (_match, num, den) => {
                return `open parenthesis ${readSide(num)} close parenthesis divided by ${parseInt(den)}`;
            });
            expr = expr.replace(/([a-zA-Z0-9]+)\s*\/\s*(\d+)/g, (_match, num, den) => {
                return `${num} divided by ${parseInt(den)}`;
            });

            // Replace plus and minus
            expr = expr.replace(/\+/g, ' plus ');
            expr = expr.replace(/–|−|-/g, ' minus ');

            // Replace multiplication and division symbols (not already handled)
            expr = expr.replace(/×/g, ' multiplied by ');
            expr = expr.replace(/÷/g, ' divided by ');

            // Replace x with "x" (for lone x)
            expr = expr.replace(/𝑥/g, 'x');

            // Remove extra spaces
            expr = expr.replace(/\s+/g, ' ').trim();

            return expr;
        };

        return `${readSide(lhs)} equals ${readSide(rhs)}`;
    }

    update(): void {
        // Update mute button icon
        if (this.muteBtn) {
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
}