import { BaseScene } from '../core/BaseScene';
import { ImageOverlay } from '../utils/ImageOverlay';
import { TextOverlay } from '../utils/TextOverlay';

// Import i18n type (assuming it's available in the project)
type I18nInstance = {
    t: (key: string, params?: Record<string, any>) => string;
};

export interface SliderConfig {
    // Position and size
    x: number;
    y: number;
    width?: number;
    height?: number;

    // Value configuration
    min: number;
    max: number;
    initialValue: number;
    step: number; // Support both integer and decimal steps

    // Visual configuration
    backgroundTexture?: string;
    fillTexture?: string;
    knobTexture?: string;
    valueBgTexture?: string;
    fillColor?: number;
    textColor?: string;
    textFont?: string;

    // Labels and accessibility
    label?: string;
    valueLabel?: string;
    knobLabel?: string;

    // Callbacks
    onChange?: (value: number) => void;
    onDragStart?: (value: number) => void;
    onDragEnd?: (value: number) => void;

    // Layout configuration
    showValueDisplay?: boolean;
    valueDisplayOffset?: { x: number; y: number };
    orientation?: 'horizontal' | 'vertical';

    // Accessibility
    ariaLabel?: string;
    description?: string;
    
    // Keyboard accessibility
    enableKeyboard?: boolean; // Default: true
    keyboardStep?: number; // Step size for keyboard navigation (defaults to config.step)
    
    // Internationalization
    i18n?: I18nInstance;
}

export class CustomSlider {
    private scene: BaseScene;
    private config: SliderConfig;

    // Visual elements
    private container!: Phaser.GameObjects.Container;
    private background?: Phaser.GameObjects.Image;
    private fill?: Phaser.GameObjects.Image;
    private knob?: Phaser.GameObjects.Image;
    private valueBackground?: Phaser.GameObjects.Image;
    private valueText?: Phaser.GameObjects.Text;

    // Overlays for accessibility
    private knobOverlay?: ImageOverlay;
    private valueTextOverlay?: TextOverlay;

    // State
    private currentValue: number;
    private isDragging: boolean = false;
    private isEnabled: boolean = true;

    // Computed properties
    private sliderStart: number;
    private sliderEnd: number;
    private sliderLength: number;

        // Event handlers for cleanup
    private dragHandler?: Function;
    private dragStartHandler?: Function;
    private dragEndHandler?: Function;
    
    // Keyboard accessibility
    private boundKeyDownHandler: (event: KeyboardEvent) => void;
    private hasFocus: boolean = false;
    private keyboardStep: number;




    constructor(scene: BaseScene, config: SliderConfig) {
        this.scene = scene;
        this.config = {
            width: 308, // Default width from LinearEquation
            height: 16, // Default height
            backgroundTexture: 'slider_bg',
            fillTexture: 'slider_fill_blue',
            knobTexture: 'slider_knob_blue',
            valueBgTexture: 'slider_value_bg',
            textColor: '#00FFBF',
            textFont: '700 24px Exo',
            showValueDisplay: true,
            valueDisplayOffset: { x: 450, y: -13 }, // Default offset for value display
            orientation: 'horizontal',
            enableKeyboard: true, // Default keyboard enabled
            ...config,
        };

        this.currentValue = this.config.initialValue;
        this.sliderStart = 0;
        this.sliderEnd = 0;
        this.sliderLength = 0;
        
        // Initialize keyboard properties
        this.keyboardStep = this.config.keyboardStep || this.config.step;
        this.boundKeyDownHandler = this.handleKeyDown.bind(this);
        
        this.create();
    }

    private create(): void {
        // Create container for the slider
        const { x, y } = this.scene.getScaledPosition(this.config.x, this.config.y);
        this.container = this.scene.add.container(x, y);

        // Create background
        if (this.config.backgroundTexture) {
            this.background = this.scene.addImage(0, 0, this.config.backgroundTexture).setOrigin(0);
            this.container.add(this.background);

            // Calculate slider boundaries based on background
            this.sliderStart = this.background.x;
            this.sliderEnd = this.background.x + this.background.displayWidth;
            this.sliderLength = this.sliderEnd - this.sliderStart;
        } else {
            // If no texture, use width from config
            this.sliderStart = 0;
            this.sliderEnd = this.config.width!;
            this.sliderLength = this.config.width!;
        }

        // Create fill
        if (this.config.fillTexture) {
            this.fill = this.scene.addImage(0, 0, this.config.fillTexture).setOrigin(0);
            this.container.add(this.fill);
        } else if (this.config.fillColor !== undefined) {
            // Create a graphics fill if no texture provided
            const fillGraphics = this.scene.add.graphics();
            fillGraphics.fillStyle(this.config.fillColor);
            fillGraphics.fillRect(0, 0, this.sliderLength, this.config.height || 16);
            this.container.add(fillGraphics);
        }

        // Create knob
        if (this.config.knobTexture) {
            this.knob = this.scene.addImage(0, 5, this.config.knobTexture).setOrigin(0.5);
            this.container.add(this.knob);

            // Make knob interactive
            this.knob.setInteractive({ cursor: 'pointer' });
            this.scene.input.setDraggable(this.knob);

            // Create knob overlay for accessibility
            this.knobOverlay = new ImageOverlay(this.scene, this.knob, {
                label: this.config.knobLabel || this.config.ariaLabel || 'Slider knob',
                cursor: 'pointer',
                style: {
                    outline: 'revert'
                }
            });

            // Add focus and blur event handlers for keyboard navigation
            if (this.config.enableKeyboard && this.knobOverlay) {
                this.setupFocusHandlers();
            }
        }

        // Create value display if enabled
        if (this.config.showValueDisplay) {
            // Value background
            if (this.config.valueBgTexture) {
                this.valueBackground = this.scene
                    .addImage(
                        this.config.valueDisplayOffset!.x,
                        this.config.valueDisplayOffset!.y,
                        this.config.valueBgTexture,
                    )
                    .setOrigin(0);
                this.container.add(this.valueBackground);
            }

            // Value text
            this.valueText = this.scene
                .addText(
                    this.config.valueDisplayOffset!.x + (this.valueBackground?.width || 50) / 2,
                    this.config.valueDisplayOffset!.y + (this.valueBackground?.height || 20) / 2 + 4,
                    this.formatValue(this.currentValue),
                    {
                        font: this.config.textFont!,
                        color: this.config.textColor!,
                    },
                )
                .setOrigin(0.5);
            this.container.add(this.valueText);

            // Create value text overlay for accessibility
            if (this.valueText) {
                this.valueTextOverlay = new TextOverlay(this.scene, this.valueText, {
                    label:
                        this.config.valueLabel ||
                        `${this.config.label || 'Value'}: ${this.formatValue(this.currentValue)}`,
                    ariaLive: 'off',
                });
            }
        }

        // Set up event handlers
        this.setupEventHandlers();

        // Initialize slider position
        this.updateSliderVisuals();
    }

    private setupEventHandlers(): void {
        if (!this.knob) return;

        // Drag handler
        this.dragHandler = (
            _pointer: Phaser.Input.Pointer,
            gameObject: Phaser.GameObjects.GameObject,
            dragX: number,
            dragY: number,
        ) => {
            if (gameObject === this.knob && this.isEnabled) {
                let clampedPosition: number;

                if (this.config.orientation === 'horizontal') {
                    clampedPosition = Math.max(this.sliderStart, Math.min(this.sliderEnd, dragX));
                } else {
                    clampedPosition = Math.max(this.sliderStart, Math.min(this.sliderEnd, dragY));
                }

                // Calculate value from position first
                const progress = (clampedPosition - this.sliderStart) / this.sliderLength;
                const rawValue = this.config.min + progress * (this.config.max - this.config.min);
                
                // Apply step rounding to get the stepped value
                const steppedValue = Math.round(rawValue / this.config.step) * this.config.step;
                const clampedValue = Math.max(this.config.min, Math.min(this.config.max, steppedValue));
                
                // Calculate the position for the stepped value
                const steppedProgress = (clampedValue - this.config.min) / (this.config.max - this.config.min);
                let steppedPosition: number;
                
                if (this.config.orientation === 'horizontal') {
                    steppedPosition = this.sliderStart + steppedProgress * this.sliderLength;
                    this.knob.setX(steppedPosition);
                } else {
                    steppedPosition = this.sliderStart + steppedProgress * this.sliderLength;
                    this.knob.setY(steppedPosition);
                }
                
                // Update value (this will update visuals and callbacks)
                this.setValue(clampedValue, true); // true indicates this is from drag
            }
        };

        // Drag start handler
        this.dragStartHandler = (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
            if (gameObject === this.knob && this.isEnabled) {
                this.isDragging = true;
                if (this.config.onDragStart) {
                    this.config.onDragStart(this.currentValue);
                }
            }
        };

        // Drag end handler
        this.dragEndHandler = (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
            if (gameObject === this.knob && this.isEnabled) {
                this.isDragging = false;
                if (this.config.onDragEnd) {
                    this.config.onDragEnd(this.currentValue);
                }
                // Update accessibility overlays
                this.updateAccessibilityOverlays();
                // Ensure overlay position is synced after drag
                this.syncOverlayPosition();
            }
        };

        // Register event handlers
        this.scene.input.on('drag', this.dragHandler);
        this.scene.input.on('dragstart', this.dragStartHandler);
        this.scene.input.on('dragend', this.dragEndHandler);
    }

    /**
     * Sets up focus and blur handlers for keyboard navigation
     */
    private setupFocusHandlers(): void {
        if (!this.knobOverlay) return;

        // Access the DOM element from the ImageOverlay
        const domElement = (this.knobOverlay as any).domElement;
        if (!domElement?.node) return;

        const htmlElement = domElement.node as HTMLElement;
        
        // Make element focusable
        htmlElement.setAttribute('tabindex', '0');
        htmlElement.setAttribute('role', 'slider');
        htmlElement.setAttribute('aria-valuemin', this.config.min.toString());
        htmlElement.setAttribute('aria-valuemax', this.config.max.toString());
        htmlElement.setAttribute('aria-valuenow', this.currentValue.toString());
        htmlElement.setAttribute('aria-valuetext', this.formatValue(this.currentValue));
        htmlElement.setAttribute('aria-orientation', this.config.orientation || 'horizontal');
        
        // Add comprehensive aria-label with instructions
        const instructions = this.config.i18n?.t('common.sliderInstructions', { value: this.formatValue(this.currentValue) }) 
            || `Use left and right arrow keys to adjust value. Current value: ${this.formatValue(this.currentValue)}`;
        const fullLabel = `${this.config.knobLabel || this.config.ariaLabel || 'Slider'}. ${instructions}`;
        htmlElement.setAttribute('aria-label', fullLabel);
        htmlElement.setAttribute('aria-describedby', this.createAriaDescription());

        // Remove existing listeners to prevent duplicates
        htmlElement.removeEventListener('focus', this.onFocus);
        htmlElement.removeEventListener('blur', this.onBlur);

        // Add focus event listener
        htmlElement.addEventListener('focus', this.onFocus);

        // Add blur event listener  
        htmlElement.addEventListener('blur', this.onBlur);
    }

    /**
     * Bound focus handler to maintain proper context
     */
    private onFocus = () => {
        this.setFocus();
    }

    /**
     * Bound blur handler to maintain proper context
     */
    private onBlur = () => {
        this.removeFocus();
    }

    /**
     * Creates an invisible element with instructions for screen readers
     */
    private createAriaDescription(): string {
        const descId = `slider-desc-${Math.random().toString(36).substr(2, 9)}`;
        
        // Create invisible description element
        const descElement = document.createElement('div');
        descElement.id = descId;
        const descriptionText = this.config.i18n?.t('common.sliderDescription', { min: this.config.min, max: this.config.max }) 
            || `Use left and right arrow keys to change value between ${this.config.min} and ${this.config.max}. Press Home for minimum, End for maximum.`;
        descElement.textContent = descriptionText;
        descElement.style.position = 'absolute';
        descElement.style.left = '-10000px';
        descElement.style.width = '1px';
        descElement.style.height = '1px';
        descElement.style.overflow = 'hidden';
        descElement.setAttribute('aria-hidden', 'true');
        
        document.body.appendChild(descElement);
        
        // Store reference for cleanup
        (this as any).descriptionElement = descElement;
        
        return descId;
    }

    /**
     * Announces value changes to screen readers
     */
    private announceValueChange(type?: 'minimum' | 'maximum'): void {
        // Update ARIA attributes first
        this.updateAriaAttributes();
        
        // Create announcement text
        let announcement = '';
        if (type === 'minimum') {
            announcement = this.config.i18n?.t('common.sliderMinimumValue', { value: this.formatValue(this.currentValue) }) 
                || `Minimum value: ${this.formatValue(this.currentValue)}`;
        } else if (type === 'maximum') {
            announcement = this.config.i18n?.t('common.sliderMaximumValue', { value: this.formatValue(this.currentValue) }) 
                || `Maximum value: ${this.formatValue(this.currentValue)}`;
        } else {
            announcement = `${this.formatValue(this.currentValue)}`;
        }
        
        // Announce to screen reader using aria-live region
        this.createLiveAnnouncement(announcement);
    }

    /**
     * Creates a live announcement for screen readers
     */
    private createLiveAnnouncement(message: string): void {
        // Create or get existing live region
        let liveRegion = document.getElementById('slider-live-region');
        if (!liveRegion) {
            liveRegion = document.createElement('div');
            liveRegion.id = 'slider-live-region';
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            liveRegion.style.position = 'absolute';
            liveRegion.style.left = '-10000px';
            liveRegion.style.width = '1px';
            liveRegion.style.height = '1px';
            liveRegion.style.overflow = 'hidden';
            document.body.appendChild(liveRegion);
        }
        
        // Clear and set new message
        liveRegion.textContent = '';
        setTimeout(() => {
            liveRegion!.textContent = message;
        }, 100);
    }

    /**
     * Synchronizes the overlay position with the knob position
     */
    private syncOverlayPosition(): void {
        if (!this.knobOverlay) return;
        
        // Update overlay position
        this.updateOverlayPosition();
        
        // Ensure focus handlers are maintained if keyboard is enabled
        if (this.config.enableKeyboard) {
            // Use a small delay to ensure the overlay has repositioned
            this.scene.time.delayedCall(50, () => {
                this.setupFocusHandlers();
            });
        }
    }

    /**
     * Sets the slider value programmatically
     * @param value The new value
     * @param fromDrag Whether this update is from a drag operation
     */
    public setValue(value: number, fromDrag: boolean = false): void {
        // Apply step rounding
        const roundedValue = Math.round(value / this.config.step) * this.config.step;
        const clampedValue = Math.max(this.config.min, Math.min(this.config.max, roundedValue));

        // Only update if value actually changed
        if (Math.abs(this.currentValue - clampedValue) < Number.EPSILON) return;

        this.currentValue = clampedValue;

        // Update visuals only if not from drag (drag already updated knob position)
        if (!fromDrag) {
            this.updateSliderVisuals();
        } else {
                // Still need to update fill and text during drag
                this.updateFill();
                this.updateValueText();
                this.updateOverlayPosition();
        }

        // Call onChange callback
        if (this.config.onChange) {
            this.config.onChange(this.currentValue);
        }
    }

    /**
     * Gets the current slider value
     */
    public getValue(): number {
        return this.currentValue;
    }

    /**
     * Updates all slider visuals based on current value
     */
    private updateSliderVisuals(): void {
        if (!this.knob) return;

        const progress = (this.currentValue - this.config.min) / (this.config.max - this.config.min);

        if (this.config.orientation === 'horizontal') {
            const knobX = this.sliderStart + progress * this.sliderLength;
            this.knob.setX(knobX);
        } else {
            const knobY = this.sliderStart + progress * this.sliderLength;
            this.knob.setY(knobY);
        }

        this.updateFill();
        this.updateValueText();
        this.updateOverlayPosition();
    }

    /**
     * Updates the fill visual based on current progress
     */
    private updateFill(): void {
        if (!this.fill) return;

        const progress = (this.currentValue - this.config.min) / (this.config.max - this.config.min);

        if (this.config.orientation === 'horizontal') {
            const fillWidth = progress * this.sliderLength;
            this.fill.setDisplaySize(fillWidth, this.fill.displayHeight);
        } else {
            const fillHeight = progress * this.sliderLength;
            this.fill.setDisplaySize(this.fill.displayWidth, fillHeight);
        }
    }

    /**
     * Updates the value text display
     */
    private updateValueText(): void {
        if (!this.valueText) return;

        this.valueText.setText(this.formatValue(this.currentValue));
    }

    /**
     * Formats the value for display (handles integer vs decimal display)
     */
    private formatValue(value: number): string {
        // If step is integer, show as integer. Otherwise, show with appropriate decimal places
        if (this.config.step >= 1) {
            return Math.round(value).toString();
        } else {
            // Calculate decimal places based on step size
            const decimalPlaces = Math.max(0, -Math.floor(Math.log10(this.config.step)));
            return value.toFixed(decimalPlaces);
        }
    }

    /**
     * Updates accessibility overlays with current values
     */
    private updateAccessibilityOverlays(): void {
        if (this.valueTextOverlay) {
            const label =
                this.config.valueLabel || `${this.config.label || 'Value'}: ${this.formatValue(this.currentValue)}`;
            this.valueTextOverlay.updateContent(label);
        }

        if (this.knobOverlay) {
            // Update the label instead of recreating the entire overlay
            const newLabel = this.config.knobLabel || this.config.ariaLabel || 'Slider knob';
            this.knobOverlay.updateLabel(newLabel);
        }

        // Update ARIA attributes for keyboard accessibility
        this.updateAriaAttributes();
    }

    /**
     * Updates ARIA attributes for the knob element
     */
    private updateAriaAttributes(): void {
        if (!this.knobOverlay) return;

        const domElement = (this.knobOverlay as any).domElement;
        if (!domElement?.node) return;

        const htmlElement = domElement.node as HTMLElement;
        htmlElement.setAttribute('aria-valuenow', this.currentValue.toString());
        htmlElement.setAttribute('aria-valuetext', this.formatValue(this.currentValue));
    }

    /**
     * Enables or disables the slider
     */
    public setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;

        if (this.knob) {
            if (enabled) {
                this.knob.setInteractive({ cursor: 'pointer' });
                this.knob.setAlpha(1);
            } else {
                this.knob.disableInteractive();
                this.knob.setAlpha(0.5);
            }
        }

        if (this.container) {
            this.container.setAlpha(enabled ? 1 : 0.5);
        }
    }

    /**
     * Sets the slider's visibility
     */
    public setVisible(visible: boolean): void {
        this.container.setVisible(visible);
    }

    /**
     * Gets the Phaser container for this slider
     */
    public getContainer(): Phaser.GameObjects.Container {
        return this.container;
    }

    /**
     * Updates the slider configuration
     */
    public updateConfig(newConfig: Partial<SliderConfig>): void {
        this.config = { ...this.config, ...newConfig };

        // If min, max, or step changed, validate current value
        if (newConfig.min !== undefined || newConfig.max !== undefined || newConfig.step !== undefined) {
            this.setValue(this.currentValue);
        }

        // Update visuals if color/texture properties changed
        if (newConfig.textColor && this.valueText) {
            this.valueText.setColor(newConfig.textColor);
        }
    }

    /**
     * Increments the value by one step
     */
    public increment(): void {
        this.setValue(this.currentValue + this.config.step);
    }

    /**
     * Decrements the value by one step
     */
    public decrement(): void {
        this.setValue(this.currentValue - this.config.step);
    }

    /**
     * Sets the value to minimum
     */
    public setToMin(): void {
        this.setValue(this.config.min);
    }

    /**
     * Sets the value to maximum
     */
    public setToMax(): void {
        this.setValue(this.config.max);
    }

    /**
     * Sets focus on the slider (for keyboard navigation)
     */
    public setFocus(): void {
        if (!this.config.enableKeyboard || !this.knob) return;
        
        this.hasFocus = true;
        
        // Add keyboard event listener
        window.addEventListener('keydown', this.boundKeyDownHandler);
    }

    /**
     * Removes focus from the slider
     */
    public removeFocus(): void {
        if (!this.config.enableKeyboard) return;
        
        this.hasFocus = false;
        
        // Remove keyboard event listener
        window.removeEventListener('keydown', this.boundKeyDownHandler);
    }

    /**
     * Updates the HTML overlay element position when knob moves
     */
    private updateOverlayPosition(): void {
        if (!this.knobOverlay || !this.knob) return;
        
        const domElement = (this.knobOverlay as any).domElement;
        if (!domElement) return;
        
        // Get the world position of the knob
        const matrix = this.knob.getWorldTransformMatrix();
        const worldX = matrix.tx;
        const worldY = matrix.ty;
        
        // Update the DOM element position
        domElement.setPosition(worldX, worldY);
    }

    /**
     * Handles keyboard input for slider navigation
     */
    private handleKeyDown(event: KeyboardEvent): void {
        if (!this.hasFocus || !this.isEnabled) return;

        let handled = false;

        switch (event.key) {
            case 'ArrowLeft':
                this.setValue(this.currentValue - this.keyboardStep);
                this.announceValueChange();
                this.updateAccessibilityOverlays();
                handled = true;
                break;
            case 'ArrowRight':
                this.setValue(this.currentValue + this.keyboardStep);
                this.announceValueChange();
                this.updateAccessibilityOverlays();
                handled = true;
                break;
            case 'Home':
                this.setToMin();
                this.announceValueChange('minimum');
                this.updateAccessibilityOverlays();
                handled = true;
                break;
            case 'End':
                this.setToMax();
                this.announceValueChange('maximum');
                this.updateAccessibilityOverlays();
                handled = true;
                break;
        }

        if (handled) {
            event.preventDefault();
            event.stopPropagation();
            this.updateOverlayPosition();
        }
    }

    /**
     * Destroys the slider and cleans up event listeners
     */
    public destroy(): void {
        // Remove keyboard focus if active
        this.removeFocus();

        // Clean up ARIA description element
        const descElement = (this as any).descriptionElement;
        if (descElement && descElement.parentNode) {
            descElement.parentNode.removeChild(descElement);
        }

        // Remove event listeners
        if (this.dragHandler) {
            this.scene.input.off('drag', this.dragHandler);
        }
        if (this.dragStartHandler) {
            this.scene.input.off('dragstart', this.dragStartHandler);
        }
        if (this.dragEndHandler) {
            this.scene.input.off('dragend', this.dragEndHandler);
        }

        // Destroy overlays
        this.knobOverlay?.destroy();
        this.valueTextOverlay?.destroy();

        // Destroy container (this will destroy all children)
        this.container.destroy();
    }

    /**
     * Gets the progress as a percentage (0-1)
     */
    public getProgress(): number {
        return (this.currentValue - this.config.min) / (this.config.max - this.config.min);
    }

    /**
     * Sets the slider value based on a progress percentage (0-1)
     */
    public setProgress(progress: number): void {
        const clampedProgress = Math.max(0, Math.min(1, progress));
        const value = this.config.min + clampedProgress * (this.config.max - this.config.min);
        this.setValue(value);
    }

    public getKnobOverlay(): ImageOverlay | undefined {
        return this.knobOverlay;
    }
}

// Usage Examples:

/*
// Example 1: X-axis slider (slope) with decimal steps
const xSlider = new CustomSlider(this.scene, {
    x: 444,
    y: 652,
    min: -10,
    max: 10,
    initialValue: 1,
    step: 0.1, // Decimal steps for slope
    label: 'Slope (m)',
    knobLabel: 'X Slider Knob',
    valueLabel: 'Slope Value',
    fillTexture: 'slider_fill_blue',
    textColor: '#00FFBF',
    onChange: (value: number) => {
        // Update your equation with new slope value
        console.log('Slope changed to:', value);
    },
    onDragStart: (value: number) => {
        // Play sound, show instructions, etc.
    },
    onDragEnd: (value: number) => {
        // Update accessibility overlays, check correctness
    }
});

// Example 2: Y-axis slider (y-intercept) with integer steps
const ySlider = new CustomSlider(this.scene, {
    x: 444,
    y: 711,
    min: -10,
    max: 10,
    initialValue: 0,
    step: 1, // Integer steps for y-intercept
    label: 'Y-Intercept (b)',
    knobLabel: 'Y Slider Knob',
    valueLabel: 'Y-Intercept Value',
    fillTexture: 'slider_fill_orange',
    textColor: '#FF5900',
    onChange: (value: number) => {
        // Update your equation with new y-intercept value
        console.log('Y-Intercept changed to:', value);
    }
});

// Example 3: Custom range slider with specific question data
const createSliderFromQuestion = (question: Question, isXSlider: boolean) => {
    const config = isXSlider ? {
        min: question.slopeMin,
        max: question.slopeMax,
        step: question.slopeStep,
        initialValue: 1,
        fillTexture: 'slider_fill_blue',
        textColor: '#00FFBF'
    } : {
        min: question.yInterceptMin,
        max: question.yInterceptMax,
        step: question.yInterceptStep,
        initialValue: 0,
        fillTexture: 'slider_fill_orange',
        textColor: '#FF5900'
    };

    return new CustomSlider(this.scene, {
        x: 444,
        y: isXSlider ? 652 : 711,
        ...config,
        onChange: (value: number) => {
            // Handle value change
            if (isXSlider) {
                this.xCord = value;
            } else {
                this.yCord = value;
            }
            this.updateIntercepts();
            this.updateEquationDisplay();
        }
    });
};

// Methods you can call on the slider instances:
// xSlider.setValue(2.5);           // Set to specific value
// xSlider.increment();             // Increase by one step
// xSlider.decrement();             // Decrease by one step
// xSlider.setToMin();              // Set to minimum value
// xSlider.setToMax();              // Set to maximum value
// xSlider.setEnabled(false);       // Disable the slider
// xSlider.setVisible(false);       // Hide the slider
// const value = xSlider.getValue(); // Get current value
// const progress = xSlider.getProgress(); // Get 0-1 progress
// xSlider.destroy();               // Clean up when done
*/
