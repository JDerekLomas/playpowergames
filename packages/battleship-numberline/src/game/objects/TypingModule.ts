import { BaseScene } from '../scenes/BaseScene';
import { GameScreenConfig as GameConfig } from '../config/GameScreenConfig';
import { parseFractionString } from '../utils/parseFractionString';
import { ButtonHelper, i18n, TextOverlay, ExpressionUtils, announceToScreenReader } from '@k8-games/sdk';
export class TypingModule {
    private scene: BaseScene;
    private container: Phaser.GameObjects.Container;
    private inputDisplay: Phaser.GameObjects.Text;
    private inputOverlay?: TextOverlay; // a11y association for input
    private currentInput: string = '';
    private cursor: Phaser.GameObjects.Rectangle;
    private onSubmit: (value: number) => void;
    private typingKeys: typeof GameConfig.ASSETS.KEYS.IMAGE.TYPING_MECHANICS;
    private fireButtonKeyHandler: ((event: KeyboardEvent) => void) | null = null;

    // Guided tutorial properties
    private isGuidedMode: boolean = false;
    private isGuidedTutorialStarted: boolean = false;
    private onFireEnabled?: () => void;

    private expectedInput: string = '';
    private currentStep: number = 0;
    private numberPadButtons: Phaser.GameObjects.Container[] = [];
    private fireButton: Phaser.GameObjects.Container;
    private onFire?: () => void;
    private displaySuffix: string = '';
    private displaySuffixObj: Phaser.GameObjects.Text;
    private errorResetTimer?: number;

    // Topic-based button configuration
    private topic: string = '';
    private showDecimalButton: boolean = false;
    private showFractionButton: boolean = false;
    // Fraction display properties
    private fractionDisplay: ExpressionUtils | null = null;
    private customFractionContainer: Phaser.GameObjects.Container | null = null;
    
    private numerator: string = '';
    private denominator: string = '';
    private isTypingDenominator: boolean = false;
    
    // Input control
    private isInputEnabled: boolean = true;

    // Fraction mask and text refs for cursor placement
    private fractionMask: { numeratorDigits: number; denominatorDigits: number } | null = null;
    private numeratorTextObj?: Phaser.GameObjects.Text;
    private denominatorTextObj?: Phaser.GameObjects.Text;
    
    // Track if this is the first question/round
    private isFirstRound: boolean = true;

    private isAudioPlaying: boolean = false;
    private audioButton?: Phaser.GameObjects.Container;
    private currentPlayingSound?: Phaser.Sound.WebAudioSound;

    constructor(scene: BaseScene, onSubmit: (value: number) => void, isGuidedMode: boolean = false, displaySuffix: string = '', isMapUI: boolean = false, topic: string = '') {
        const startX = scene.display.width / 2;
        const startY = scene.display.height;
        this.scene = scene;
        this.onSubmit = onSubmit;
        this.topic = topic;
        
        // Configure button visibility based on topic
        this.configureButtonVisibility();
        
        this.container = scene.add.container(
            scene.getScaledValue(startX), 
            scene.getScaledValue(startY)
        ).setDepth(2);

        // add constants
        this.typingKeys = GameConfig.ASSETS.KEYS.IMAGE.TYPING_MECHANICS;

        // Initialize guided mode state
        this.isGuidedMode = isGuidedMode;
        this.displaySuffix = displaySuffix;
        // Add typing module background
        const background = scene.addImage(0, isMapUI ? 0 : 0, this.typingKeys.TYPING_MODULE).setOrigin(0.5, 1);
        this.container.add(background);

        if(!isGuidedMode) {
            const audioButtonX = i18n.getLanguage() === 'es' ? -240 : -210;
            this.audioButton = this.createAudioButton(audioButtonX, -175, 'spotted_at'); // adjust soundEffect name as needed
            this.container.add(this.audioButton);
        }
        
        // Add input display text
        const inputDisplayY = -175;
        const inputDisplayX = i18n.getLanguage() === 'es' ? -200 : -170;
        this.inputDisplay = scene.addText(inputDisplayX, inputDisplayY, i18n.t('gameScreen.enemySpotted', { number: '' }), {
            font: "400 30px Exo",
            align: 'left',
            })
            .setLetterSpacing(1)
            .setOrigin(0, 0.5);
        this.container.add(this.inputDisplay);

        this.inputOverlay = new TextOverlay(scene, this.inputDisplay, { label: i18n.t('gameScreen.enemySpotted', { number: '' }) });

        // Add rectangle blinking cursor in the input display
        this.cursor = scene.addRectangle(this.inputDisplay.getRightCenter().x / scene.display.scale, this.inputDisplay.y / scene.display.scale - 3, 14, 22, 0xFFFFFF, 0.5)
            .setOrigin(0, 0.5);
        this.container.add(this.cursor);

        // animate the cursor to blink continuously
        scene.tweens.add({
            targets: this.cursor,
            alpha: 0.1,
            duration: 600,
            ease: Phaser.Math.Easing.Linear,
            yoyo: true,
            repeat: -1,
        });

        if(this.displaySuffix && this.displaySuffix.length > 0) {
            this.displaySuffixObj = scene.addText(
                (this.cursor.x + this.cursor.width) / scene.display.scale + 3,
                this.inputDisplay.y / scene.display.scale,
                this.displaySuffix,
                {
                    font: "400 30px Exo",
                    align: 'left',
                }
            ).setOrigin(0, 0.5);
            this.container.add(this.displaySuffixObj);   
        }
        
        // Initialize fraction display if topic supports fractions
        if (this.showFractionButton) {
            this.initializeFractionDisplay();
        }

        // Create number pad buttons
        this.createNumberPad();

        scene.input.keyboard?.on('keydown', this.handleKeyPress, this);

        const lang = i18n.getLanguage();
        const font = lang == 'en' ? '700 20px Exo' : '700 14px Exo';
        this.fireButton = ButtonHelper.createButton({
            scene: this.scene,
            imageKeys: {
                default: this.typingKeys.FIRE_DEFAULT,
                hover: this.typingKeys.FIRE_HOVER,
                pressed: this.typingKeys.FIRE_PRESSED,
            },
            text: i18n.t('gameScreen.fire'),
            label: i18n.t('gameScreen.fire'),
            textStyle: {
                font: font,
                color: '#ffffff',
            },
            raisedOffset: 5,
            x: this.numberPadButtons[this.numberPadButtons.length - 1].x / this.scene.display.scale + 120,
            y: -70,
            onClick: () => this.handleSubmit(),
        });

        this.container.add(this.fireButton);
        const fireButtonOverlay = (this.fireButton as any).buttonOverlay;
        fireButtonOverlay.recreate();

        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            const handleFireButton = () => {
                this.scene.audioManager.playSoundEffect('button_click');
                this.handleSubmit();
            };

            this.fireButtonKeyHandler = (event: KeyboardEvent) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    handleFireButton();
                }
            };

            gameContainer.focus();
            gameContainer.addEventListener('keydown', this.fireButtonKeyHandler);
        }
    }

    // Helper to announce a translated key robustly
    private announceLocalized(key: string, params?: Record<string, any>): void {
        const tryTranslate = (): string => {
            // First pass via i18n.t
            const val = i18n.t(key, params || {});
            if (val !== key) return val;
            // Fallback: try resource store lookup (handles dot-keys without namespace init race)
            try {
                const lang = (i18n as any).getLanguage?.() || (i18n as any).language || 'en';
                const store = (i18n as any).getResourceBundle?.(lang, undefined) || (i18n as any).store?.data?.[lang];
                if (store) {
                    const parts = key.split('.');
                    let cursor: any = store;
                    for (const p of parts) {
                        if (cursor && typeof cursor === 'object' && p in cursor) cursor = cursor[p];
                        else { cursor = null; break; }
                    }
                    if (typeof cursor === 'string') return cursor;
                }
            } catch {}
            // Final hardcoded fallbacks for critical labels
            if (key.endsWith('numeratorField')) return langStartsWithEs() ? 'Campo de edición del numerador' : 'Numerator edit field';
            if (key.endsWith('denominatorField')) return langStartsWithEs() ? 'Campo de edición del denominador' : 'Denominator edit field';
            if (key.endsWith('inputCleared')) return langStartsWithEs() ? 'Entrada borrada' : 'Input cleared';
            return key;
        };

        const langStartsWithEs = () => {
            const l = (i18n as any).getLanguage?.() || (i18n as any).language || 'en';
            return String(l).toLowerCase().startsWith('es');
        };

        const initial = tryTranslate();
        // Announce immediately if translation resolved
        if (initial !== key) {
            announceToScreenReader(initial);
            return;
        }
        // Fallback retry for other keys
        setTimeout(() => {
            const retry = tryTranslate();
            announceToScreenReader(retry);
        }, 50);
    }

    private configureButtonVisibility(): void {
        // Configure which buttons to show based on topic
        switch (this.topic) {
            case 'understand_and_compare_decimals':
                this.showDecimalButton = false;
                this.showFractionButton = true;
                break;
            case 'fractions_as_numbers':
                this.showDecimalButton = false;
                this.showFractionButton = true;
                break;
            default:
                this.showDecimalButton = false;
                this.showFractionButton = false;
                break;
        }
    }

    private createAudioButton(x: number, y: number, soundEffect: string): Phaser.GameObjects.Container {
        const button = ButtonHelper.createIconButton({
            scene: this.scene,
            imageKeys: {
                default: this.typingKeys.TRANSPARENT,
                hover: this.typingKeys.TRANSPARENT,
                pressed: this.typingKeys.TRANSPARENT,
            },
            icon: this.typingKeys.VOLUME,
            label: '',
            x,
            y,
            raisedOffset: 0,
            onClick: () => {
                if (this.isAudioPlaying) return;
                this.isAudioPlaying = true;
                button.disableInteractive();
                const sound = this.scene.audioManager.playSoundEffect(soundEffect);
                this.currentPlayingSound = sound;
                this.scene.audioManager.duckBackgroundMusic();
                if (sound) {
                    sound.once(Phaser.Sound.Events.COMPLETE, () => {
                        this.isAudioPlaying = false;
                        this.currentPlayingSound = undefined;
                        if (button.scene && button.scene.sys.isActive()) {
                            this.scene.audioManager.unduckBackgroundMusic();
                            button.setInteractive();
                        }
                    });
                } else {
                    this.isAudioPlaying = false;
                    this.currentPlayingSound = undefined;
                    if (button.scene && button.scene.sys.isActive()) {
                        this.scene.audioManager.unduckBackgroundMusic();
                        button.setInteractive();
                    }
                }
            },
        });
        button.setData('aria-hidden', 'true');
        return button;
    }

    private createNumberPad(): void {
        // Build button layout based on topic configuration
        const buttonLayout = this.buildButtonLayout();

        const startX = -225;
        const startY = -102;
        const spacingX = 63;
        const spacingY = 63;

        buttonLayout.forEach((row, rowIndex) => {
            row.forEach((value, colIndex) => {
                const x = startX + colIndex * spacingX;
                const y = startY + rowIndex * spacingY;

                const button = ButtonHelper.createButton({
                    scene: this.scene,
                    imageKeys: {
                        default: this.typingKeys.NUMBERPAD_DEFAULT,
                        hover: this.typingKeys.NUMBERPAD_HOVER,
                        pressed: this.typingKeys.NUMBERPAD_PRESSED,
                    },
                    text: value,
                    label: value === '←' ? 'Delete' : value,
                    textStyle: {
                        font: '700 24px Exo',
                        color: '#000000',
                    },
                    x,
                    y,
                    padding: 0,
                    onClick: () => this.handleInput(value),
                });

                this.numberPadButtons.push(button);
                this.container.add(button);

                const buttonOverlay = (button as any).buttonOverlay;
                buttonOverlay.recreate();
            });
        });
    }

    public resetFocusToFirstButton(): void {
        // Announce numerator field only on first round (subsequent rounds announce in handleSubmit)
        if (this.showFractionButton && this.isFirstRound) {
            this.announceLocalized('common.numeratorField');
            // Delay focus shift to allow announcement to be read
            // setTimeout(() => {
            //     if (this.numberPadButtons.length > 0) {
            //         const button = this.numberPadButtons[0];
            //         const buttonOverlay = (button as any).buttonOverlay;
            //         if (buttonOverlay?.element) {
            //             buttonOverlay.element.focus({ preventScroll: true });
            //         }
            //     }
            // }, 1200); // Give screen reader time to announce the field
        } else {
            // No announcement needed on subsequent rounds, or not fraction mode - focus immediately
            // if (this.numberPadButtons.length > 0) {
            //     const button = this.numberPadButtons[0];
            //     const buttonOverlay = (button as any).buttonOverlay;
            //     if (buttonOverlay?.element) {
            //         buttonOverlay.element.focus({ preventScroll: true });
            //     }
            // }
        }
    }

    private buildButtonLayout(): string[][] {
        const firstRow = ['1', '2', '3', '4', '5'];
        const secondRow = ['6', '7', '8', '9', '0', '←'];

        // Add decimal button to first row if enabled
        if (this.showDecimalButton) {
            firstRow.push('.');
        }

        // Fractions no longer use a slash button; auto-advance based on mask
        // (Keep secondRow as-is with backspace only)

        return [firstRow, secondRow];
    }

    private initializeFractionDisplay(): void {
        // Create custom fraction display with vinculum
        this.createCustomFractionDisplay('', '');
    // Announce initial focus context for screen readers (numerator field)
    this.announceLocalized('common.numeratorField');
    }

    private createCustomFractionDisplay(numeratorText: string, denominatorText: string): void {
        // Clean up previous displays
        if (this.fractionDisplay?.getContainer()) {
            this.fractionDisplay.getContainer().destroy();
            this.fractionDisplay = null;
        }
        if (this.customFractionContainer) {
            this.customFractionContainer.destroy();
            this.customFractionContainer = null;
        }

        // Create container for the fraction
        this.customFractionContainer = this.scene.add.container(0, 0);

        // Text style for fraction elements
        const textStyle = {
            font: "400 30px Exo",
            color: '#ffffff',
        } as const;
        const placeholderStyle = {
            font: "400 30px Exo",
            color: '#aaaaaa',
        } as const;

        // Placeholder strings based on mask
        const numMaskCount = this.fractionMask?.numeratorDigits ?? 0;
        const denMaskCount = this.fractionMask?.denominatorDigits ?? 0;
        const numPlaceholderStr = numMaskCount > 0 ? '-'.repeat(numMaskCount) : '  ';
        const denPlaceholderStr = denMaskCount > 0 ? '-'.repeat(denMaskCount) : '  ';

        // Create placeholder texts (behind) and hide them if user has typed any digits
        const numPlaceholder = this.scene.addText(0, -20, numPlaceholderStr, placeholderStyle)
            .setOrigin(0.5, 0.5)
            .setAlpha(numeratorText && numeratorText.length > 0 ? 0 : 0.5);
        const denPlaceholder = this.scene.addText(0, 20, denPlaceholderStr, placeholderStyle)
            .setOrigin(0.5, 0.5)
            .setAlpha(denominatorText && denominatorText.length > 0 ? 0 : 0.5);

        // Create typed numerator/denominator (foreground)
        this.numeratorTextObj = this.scene.addText(0, -20, numeratorText, textStyle)
            .setOrigin(0.5, 0.5);
        this.denominatorTextObj = this.scene.addText(0, 20, denominatorText, textStyle)
            .setOrigin(0.5, 0.5);

        // Create vinculum line sized to max of placeholders or typed
        const lineWidth = Math.max(
            Math.max(this.numeratorTextObj.width, numPlaceholder.width),
            Math.max(this.denominatorTextObj.width, denPlaceholder.width)
        ) + 10;
        const vinculum = this.scene.addRectangle(0, -3, lineWidth, 3, 0xffffff)
            .setOrigin(0.5, 0.5);

        // Add all elements to the fraction container (placeholders behind typed)
        this.customFractionContainer.add([numPlaceholder, denPlaceholder, vinculum, this.numeratorTextObj, this.denominatorTextObj]);

        // Position the fraction after "Enemy Spotted at "
        this.container.add(this.customFractionContainer);
        
        // Calculate position to place fraction after the text
        const enemySpottedText = i18n.t('gameScreen.enemySpotted', { number: '' });
        const tempText = this.scene.add.text(0, 0, enemySpottedText, {
            font: "400 30px Exo",
            align: 'left',
        }).setLetterSpacing(1);
        const textWidth = tempText.width;
        tempText.destroy();
        
        this.customFractionContainer.setPosition(
            this.inputDisplay.x + this.scene.getScaledValue(textWidth + 40),
            this.inputDisplay.y
        );

        this.inputDisplay.setText(enemySpottedText);
        this.updateCursorPosition();
    }

    private updateCursorPosition(): void {
        if (this.showFractionButton && this.customFractionContainer && (this.numerator || this.denominator || this.isTypingDenominator)) {
            const fractionContainer = this.customFractionContainer;
            
            // Make cursor smaller for active fraction input mode and show it
            this.cursor.setSize(this.scene.getScaledValue(12), this.scene.getScaledValue(2));
            this.cursor.setVisible(true);
            
            if (this.isTypingDenominator) {
                // Position cursor in denominator area using typed text width
                const denText = this.denominatorTextObj!;
                const cursorX = this.denominator.length === 0 
                    ? fractionContainer.x + denText.x + this.scene.getScaledValue(denText.width / 2 - 22)
                    : fractionContainer.x + denText.x + this.scene.getScaledValue(denText.width / 2 + 2);
                
                this.cursor.setPosition(
                    cursorX,
                    fractionContainer.y + denText.y + this.scene.getScaledValue(8)
                );
            } else {
                // Position cursor in numerator area using typed text width
                const numText = this.numeratorTextObj!;
                const cursorX = this.numerator.length === 0 
                    ? fractionContainer.x + numText.x + this.scene.getScaledValue(numText.width / 2 - 22)
                    : fractionContainer.x + numText.x + this.scene.getScaledValue(numText.width / 2 + 2);
                
                this.cursor.setPosition(
                    cursorX,
                    fractionContainer.y + numText.y + this.scene.getScaledValue(10)
                );
            }
        } else if (this.showFractionButton && this.customFractionContainer) {
            // Fraction mode is enabled but not actively typing - show cursor in numerator position initially
            const fractionContainer = this.customFractionContainer;
            this.cursor.setSize(this.scene.getScaledValue(12), this.scene.getScaledValue(2));
            this.cursor.setVisible(true);
            
            // Position cursor in numerator area for initial state
            const numText = this.numeratorTextObj!;
            this.cursor.setPosition(
                fractionContainer.x + numText.x + this.scene.getScaledValue(numText.width / 2 - 13),
                fractionContainer.y + numText.y + this.scene.getScaledValue(12)
            );
        } else {
            // Regular cursor positioning - restore original thick cursor style
            this.cursor.setSize(this.scene.getScaledValue(14), this.scene.getScaledValue(22)); // Original thick cursor size
            this.cursor.setVisible(true);
            this.cursor.setX(this.inputDisplay.getRightCenter().x + 2);
        }
    }

    private handleInput(value: string): void {
        // Check if input is enabled before processing
        if (!this.isInputEnabled) {
            return;
        }
        
        // In guided mode, only allow the expected input after tutorial has started
        if (this.isGuidedMode) {
            if (!this.isGuidedTutorialStarted) {
                // Guided mode is active but tutorial hasn't started yet - don't update input
                return;
            }
            
            const expectedChar = this.expectedInput[this.currentStep];
            if (value === expectedChar) {
                // Correct input - proceed to next step
                if (this.showFractionButton) {
                    this.handleFractionInput(value);
                } else {
                    this.currentInput += value;
                }
                this.currentStep++;
                
                // Check if we've completed the expected input
                if (this.currentStep >= this.expectedInput.length) {
                    this.completeGuidedTutorial();
                } else {
                    // Highlight next expected button
                    this.highlightNextButton();
                }
            } else {
                // Wrong input - show visual feedback but don't add to input
                this.showWrongInputFeedback(value);
            }
        } else {
            // Normal mode - handle fraction or regular input
            if (this.showFractionButton) {
                this.handleFractionInput(value);
            } else {
                // Regular non-fraction mode
                if (value === '←') {
                    this.currentInput = this.currentInput.slice(0, -1);
                } else if (this.currentInput.length < 8 && value !== '.' && value !== '/') {
                    // Add number if it's a valid digit and we haven't exceeded length
                    const lastChar = this.currentInput[this.currentInput.length - 1];
                    if (this.currentInput.length === 0 || lastChar === '.' || !isNaN(parseInt(lastChar))) {
                        this.currentInput += value;
                    }
                }
            }
        }

        // Update display
        this.updateDisplay();
    }

    private handleFractionInput(value: string): void {
    // Track previous state to determine transitions for announcements
    const prevIsTypingDen = this.isTypingDenominator;
    const prevNumerator = this.numerator;
    const prevDenominator = this.denominator;
    const prevCurrentInput = this.currentInput;

        const maxNum = this.fractionMask?.numeratorDigits ?? 4;
        const maxDen = this.fractionMask?.denominatorDigits ?? 4;

        if (value === '←') {
            // Backspace logic
            if (this.isTypingDenominator) {
                if (this.denominator.length > 0) {
                    // Remove from denominator
                    this.denominator = this.denominator.slice(0, -1);
                } else {
                    // Denominator is empty, switch back to numerator
                    this.isTypingDenominator = false;
                }
            } else {
                // Remove from numerator
                this.numerator = this.numerator.slice(0, -1);
            }
        } else if (value !== '.' && !isNaN(parseInt(value))) {
            // Add digit to appropriate field with auto-advance
            if (!this.isTypingDenominator) {
                if (this.numerator.length < maxNum) {
                    this.numerator += value;
                }
                if (this.numerator.length >= maxNum) {
                    this.isTypingDenominator = true;
                }
            } else {
                if (this.denominator.length < maxDen) {
                    this.denominator += value;
                }
            }
        }

        // Update currentInput for compatibility with existing submit logic
        // Add a slash automatically when we switch to denominator or if denominator has digits
        if (this.denominator.length > 0) {
            this.currentInput = `${this.numerator || ''}/${this.denominator}`;
        } else if (this.isTypingDenominator && this.numerator.length > 0) {
            this.currentInput = `${this.numerator}/`;
        } else if (this.numerator.length > 0) {
            this.currentInput = `${this.numerator}`;
        } else {
            this.currentInput = '';
        }

        // Announce transitions for screen readers
        if (!prevIsTypingDen && this.isTypingDenominator) {
            // Moved from numerator to denominator
            this.announceLocalized('common.denominatorField');
        } else if (prevIsTypingDen && !this.isTypingDenominator) {
            // Moved back to numerator (likely via backspace)
            this.announceLocalized('common.numeratorField');
        }

        // Announce clear when input becomes empty
        if (prevCurrentInput.length > 0 && this.currentInput.length === 0 && (prevNumerator.length > 0 || prevDenominator.length > 0)) {
            this.announceLocalized('common.inputCleared');
        }
    }

    private handleKeyPress(event: KeyboardEvent): void {
        // Check if input is enabled before processing
        if (!this.isInputEnabled) {
            return;
        }
        
        const key = event.key;
        if (event.key.match(/[0-9]/)) {
            this.scene.audioManager.playSoundEffect('button_click')
            this.handleInput(key);
        } else if (key === '.' && this.showDecimalButton) {
            this.scene.audioManager.playSoundEffect('button_click')
            this.handleInput(key);
        } else if (key === 'Backspace') {
            this.scene.audioManager.playSoundEffect('button_click')
            this.handleInput('←');
        }
    }

    private updateDisplay(): void {
        if (this.showFractionButton) {
            const enemySpottedText = i18n.t('gameScreen.enemySpotted', { number: '' });
            
            // Build typed texts; placeholders are rendered behind based on fractionMask
            const numeratorText = this.numerator;
            const denominatorText = this.denominator;
            
            // Create custom fraction display
            this.createCustomFractionDisplay(numeratorText, denominatorText);
            
            this.inputDisplay.setText(enemySpottedText);
        } else {
            // Clean up fraction displays
            if (this.fractionDisplay?.getContainer()) {
                this.fractionDisplay.getContainer().destroy();
                this.fractionDisplay = null;
            }
            if (this.customFractionContainer) {
                this.customFractionContainer.destroy();
                this.customFractionContainer = null;
            }
            
            this.inputDisplay.setAlpha(1); // Show the regular input display
            this.inputDisplay.setText(i18n.t('gameScreen.enemySpotted', { number: this.currentInput }));
            this.cursor.setX(this.inputDisplay.getRightCenter().x + 2);
            if(this.displaySuffix && this.displaySuffix.length > 0) {
                this.displaySuffixObj.setX(this.cursor.x + this.cursor.width + 3);
            }
        }
    }

    private handleSubmit(): void {
        if (this.currentInput) {
            const value = parseFractionString(this.currentInput);
            // Detect explicit invalid fraction 0/0 (parseFractionString returns null for denominator 0 but we guard before submission)
            if (this.currentInput.trim() === '0/0') {
                this.showInvalidFractionError();
                return;
            }
            if (value !== null) {
                if (this.isGuidedMode && this.onFire) {
                    // In guided mode, call the onFire callback instead of onSubmit
                    this.onFire();
                } else {
                    this.onSubmit(value);
                }
                this.currentInput = '';
                
                // Reset fraction state
                if (this.showFractionButton) {
                    this.numerator = '';
                    this.denominator = '';
                    this.isTypingDenominator = false;
                }
                
                this.updateDisplay();
                // After resetting for next input, announce Numerator field focus
                if (this.showFractionButton) {
                    this.announceLocalized('common.numeratorField');
                }
                
                // Mark that first round is complete
                this.isFirstRound = false;
            } else {
                // If parsed value null but format looks like a fraction with denominator 0 (e.g., something/0)
                if (/^\s*\d+\s*\/\s*0\s*$/.test(this.currentInput)) {
                    this.showInvalidFractionError();
                }
            }
        }
    }

    private showInvalidFractionError(): void {
    // Show toast feedback (toast uses TextOverlay with announce=true, so no extra SR announce here)
        try {
            (this.scene as any).animationPlayer?.addToastMessage({
                message: i18n.t('common.invalidFraction'),
                duration: 1200,
                textStyle: { fontFamily: 'Exo', letterSpacing: 1 },
            });
        } catch {}
        // Programmatically associate error with the input field (aria-invalid + error message in label)
        const baseLabel = i18n.t('gameScreen.enemySpotted', { number: '' });
        const errorMessage = i18n.t('common.invalidFraction');
        if (this.inputOverlay) {
            try {
                this.inputOverlay.updateContent(`${baseLabel} ${errorMessage}`);
                this.inputOverlay.element.setAttribute('aria-invalid', 'true');
                if (this.errorResetTimer) {
                    clearTimeout(this.errorResetTimer);
                }
                this.errorResetTimer = window.setTimeout(() => {
                    // Restore the base label and validity
                    this.inputOverlay?.updateContent(baseLabel);
                    this.inputOverlay?.element.removeAttribute('aria-invalid');
                    this.errorResetTimer = undefined;
                }, 1500);
            } catch {}
        }
    }

    private showWrongInputFeedback(value: string): void {
        // Find the button that was clicked and show visual feedback
        const button = this.numberPadButtons.find(btn => {
            const buttonText = btn.list[1] as Phaser.GameObjects.Text;
            return buttonText.text === value;
        });

        if (button) {
            // Flash the button with a red color briefly
            const buttonBg = button.list[0] as Phaser.GameObjects.Image;
            
            // Create a red tint effect
            buttonBg.setTint(0xff0000);
            
            this.scene.tweens.add({
                targets: buttonBg,
                alpha: 0.5,
                duration: 200,
                yoyo: true,
                onComplete: () => {
                    buttonBg.clearTint();
                    buttonBg.setAlpha(1);
                }
            });
        }
    }

    private highlightNextButton(): void {
        // Clear all highlights first
        this.clearAllHighlights();
        
        const expectedChar = this.expectedInput[this.currentStep];
        const button = this.numberPadButtons.find(btn => {
            const buttonText = btn.list[1] as Phaser.GameObjects.Text;
            return buttonText.text === expectedChar;
        });

        if (button) {
            // Highlight the expected button with a green glow
            const buttonBg = button.list[0] as Phaser.GameObjects.Image;
            buttonBg.setTint(0x00ff00);
            
            // Add a pulsing animation
            this.scene.tweens.add({
                targets: buttonBg,
                scaleX: buttonBg.scaleX * 1.1,
                scaleY: buttonBg.scaleY * 1.1,
                duration: 500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    private clearAllHighlights(): void {
        this.numberPadButtons.forEach(button => {
            const buttonBg = button.list[0] as Phaser.GameObjects.Image;
            buttonBg.clearTint();
            buttonBg.setScale(1);
            this.scene.tweens.killTweensOf(buttonBg);
        });
    }

    private completeGuidedTutorial(): void {
        // Clear highlights
        this.clearAllHighlights();
        
        // Enable fire button
        this.fireButton.setInteractive({ useHandCursor: true });

        if (this.onFireEnabled) {
            this.onFireEnabled();
        }
        
        // Highlight fire button
        const fireButtonBg = this.fireButton.list[0] as Phaser.GameObjects.Image;
        fireButtonBg.setTint(0x00ff00);
        
        this.scene.tweens.add({
            targets: fireButtonBg,
            scaleX: fireButtonBg.scaleX * 1.1,
            scaleY: fireButtonBg.scaleY * 1.1,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    // Public methods for guided tutorial

    /**
     * Start guided tutorial mode
     * @param expectedInput The expected input sequence (e.g., "50")
     * @param onFire Callback to execute when fire button is clicked in guided mode
     */
    public startGuidedTutorial(expectedInput: string, onFire?: () => void): void {
        this.isGuidedMode = true;
        this.isGuidedTutorialStarted = true;
        this.expectedInput = expectedInput;
        this.currentStep = 0;
        this.currentInput = '';
        this.onFire = onFire;
        
        // Disable fire button initially
        this.fireButton.removeInteractive();
        
        // Clear any existing highlights
        this.clearAllHighlights();
        
        // Highlight the first expected button
        this.highlightNextButton();
        
        // Update display
        this.updateDisplay();
    }

    /**
     * Stop guided tutorial mode and return to normal operation
     */
    public stopGuidedTutorial(): void {
        this.isGuidedTutorialStarted = false;
        this.expectedInput = '';
        this.currentStep = 0;
        this.onFire = undefined;
        
        // Clear all highlights
        this.clearAllHighlights();
        
        // Re-enable fire button
        this.fireButton.setInteractive({ useHandCursor: true });
        const fireButtonBg = this.fireButton.list[0] as Phaser.GameObjects.Image;
        fireButtonBg.clearTint();
        fireButtonBg.setScale(1);
        this.scene.tweens.killTweensOf(fireButtonBg);
    }

    public setOnFireEnabled(cb: () => void): void {
        this.onFireEnabled = cb;
    }

    /**
     * Check if guided tutorial mode is active
     */
    public isInGuidedMode(): boolean {
        return this.isGuidedMode;
    }

    // Set the digit mask for the current fraction answer (provided by scene/manager)
    public setFractionMask(mask: { numeratorDigits: number; denominatorDigits: number }): void {
        this.fractionMask = mask;
        // Reset current input for new question
        this.numerator = '';
        this.denominator = '';
        this.isTypingDenominator = false;
        this.currentInput = '';
        this.updateDisplay();
    }

    public disableInput(): void {
        this.isInputEnabled = false;
    }

    public enableInput(): void {
        this.isInputEnabled = true;
    }

    public getContainer(): Phaser.GameObjects.Container {
        return this.container;
    }

    public show(): void {
        this.container.setVisible(true);
    }

    public hide(): void {
        this.container.setVisible(false);
    }

    /**
     * Stop the currently playing audio, unduck background music, and re-enable the audio button
     */
    public stopQuestionAudio(): void {
        if (!this.isAudioPlaying) {
            return;
        }

        // Stop the sound if it's playing
        if (this.currentPlayingSound && this.currentPlayingSound.isPlaying) {
            this.currentPlayingSound.stop();
            this.currentPlayingSound.off(Phaser.Sound.Events.COMPLETE);
        }

        // Unduck the background music
        this.scene.audioManager.unduckBackgroundMusic();

        // Re-enable the button if it exists
        if (this.audioButton && this.audioButton.scene && this.audioButton.scene.sys.isActive()) {
            this.audioButton.setInteractive();
        }

        // Reset flags
        this.isAudioPlaying = false;
        this.currentPlayingSound = undefined;
    }

    public destroy(): void {
        // Stop any playing audio before destroying
        this.stopQuestionAudio();
        this.container.destroy();
        this.scene.input.keyboard?.off('keydown', this.handleKeyPress, this);
        const gameContainer = document.getElementById('game-container');
        if (gameContainer && this.fireButtonKeyHandler) {
            gameContainer.removeEventListener('keydown', this.fireButtonKeyHandler);
            this.fireButtonKeyHandler = null;
        }
    }
}