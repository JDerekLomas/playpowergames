import { AudioManager } from '../utils/AudioManager';
import { BaseScene } from '../core/BaseScene';
import { TextOverlay } from '../utils/TextOverlay';

const theme = {
    dark: {
        bgStrokeColor: 0x524A67,
        textColor: "#585858",
        sliderColor: 0x474747,
        knobColor: 0x00D319,
        sliderFillColor: 0x00D319,
        strokeColor: 0x474747,
    },
    light: {
        bgStrokeColor: 0x5622A9,
        textColor: "#474747",
        sliderColor: 0x140F35,
        knobColor: 0x00D319,
        sliderFillColor: 0x00D319,
        strokeColor: 0x2B2553,
    },
    blue: {
        bgStrokeColor: 0x5622A9,
        textColor: "#ffffff",
        sliderColor: 0x000000,
        knobColor: 0x00D319,
        sliderFillColor: 0x00D319,
        strokeColor: 0x000000,
    },
    purple: {
        bgStrokeColor: 0x5622A9,
        textColor: "#ffffff",
        sliderColor: 0x000000,
        knobColor: 0x00D319,
        sliderFillColor: 0x00D319,
        strokeColor: 0x000000,
    }
}

export class VolumeSlider {
    private container?: Phaser.GameObjects.Container;
    private bgGraphics?: Phaser.GameObjects.Graphics;
    private sliderBarGraphics?: Phaser.GameObjects.Graphics;
    private sliderFillGraphics?: Phaser.GameObjects.Graphics;
    private knob?: Phaser.GameObjects.Arc;
    private label?: Phaser.GameObjects.Text;
    private labelOverlay?: TextOverlay;
    private percentText?: Phaser.GameObjects.Text;
    private percentTextOverlay?: TextOverlay;
    private closeBtn?: Phaser.GameObjects.Image;
    private overlay?: Phaser.GameObjects.Rectangle;
    private sliderWidth: number = 200;
    private sliderHeight: number = 12;
    private knobRadius: number = 10;
    private minX: number = 0;
    private maxX: number = 0;
    private dragging: boolean = false;
    private audioManager: AudioManager;
    private scene: BaseScene;
    private bgWidth: number = 229;
    private bgHeight: number = 100;
    private currentTheme = theme.dark;
    private sceneEvents: (string | symbol)[] = [];
    private storedEventHandlers: Map<string | symbol, Function[]> = new Map();
    private keyboardStep: number = 0.01; // 1% volume change per key press
    private boundKeyDownHandler: (event: KeyboardEvent) => void;

     private focusedElement: 'close' | 'slider' | null = null;
    private focusIndicator?: Phaser.GameObjects.Graphics;

    private onOpenCb?: () => void;
    private onCloseCb?: () => void;


    constructor(scene: BaseScene) {
        this.scene = scene;
        this.audioManager = AudioManager.getInstance();
        this.sceneEvents = this.scene.input.eventNames();
        this.boundKeyDownHandler = this.handleKeyDown.bind(this);
    }

    /**
     * Creates the volume slider popup at the given position.
     * Returns the Phaser container for manual management if needed.
     * @param x X position
     * @param y Y position
     * @param themeName 'dark' | 'light' (default: 'dark')
     */
    create(x: number, y: number, themeName: 'dark' | 'light' | 'blue' | 'purple' = 'dark', text?: string) {
        this.currentTheme = theme[themeName];
        this.container = this.scene.add.container(this.scene.getScaledValue(x), this.scene.getScaledValue(y));
        this.container.setVisible(false);

        const bgKey = `volume_bg_${themeName}`;
        const bgImage = this.scene.add.image(0, 0, bgKey).setDisplaySize(this.scene.getScaledValue(this.bgWidth), this.scene.getScaledValue(this.bgHeight)).setOrigin(0.5);
        this.container.add(bgImage);

        // Label
        this.label = this.scene.addText(-this.bgWidth / 2 + 14, -this.bgHeight / 2 + 34, text || 'Volume', {
            font: "700 16px Exo",
            color: this.currentTheme.textColor
        });
        this.container.add(this.label);
        this.labelOverlay = new TextOverlay(this.scene, this.label, { label: text || 'Volume' });
        this.labelOverlay.setAriaHidden(true);

        // Percent text
        const initialVolume = Math.round(this.audioManager.getMusicVolume() * 100);
        this.percentText = this.scene.addText(-this.bgWidth / 2 + 182, -this.bgHeight / 2 + 34, `${initialVolume}%`, {
            font: "700 16px Exo",
            color: this.currentTheme.textColor
        });
        this.container.add(this.percentText);
        this.percentTextOverlay = new TextOverlay(this.scene, this.percentText, { label: `${initialVolume}%` });
        this.percentTextOverlay.setAriaHidden(true);
        
        // Slider bar (rounded rect, border radius 6)
        this.sliderBarGraphics = this.scene.add.graphics();
        this.sliderBarGraphics.lineStyle(2, this.currentTheme.strokeColor, 1);
        this.sliderBarGraphics.fillStyle(this.currentTheme.sliderColor, 1);
        this.sliderBarGraphics.fillRoundedRect(this.scene.getScaledValue(-this.sliderWidth / 2), this.scene.getScaledValue(-this.bgHeight / 2 + 65), this.scene.getScaledValue(this.sliderWidth), this.scene.getScaledValue(this.sliderHeight), this.scene.getScaledValue(6));
        this.sliderBarGraphics.strokeRoundedRect(this.scene.getScaledValue(-this.sliderWidth / 2), this.scene.getScaledValue(-this.bgHeight / 2 + 65), this.scene.getScaledValue(this.sliderWidth), this.scene.getScaledValue(this.sliderHeight), this.scene.getScaledValue(6));
        this.container.add(this.sliderBarGraphics);

        // Set up boundaries for slider
        this.minX = this.scene.getScaledValue(-this.sliderWidth / 2);
        this.maxX = this.scene.getScaledValue(this.sliderWidth / 2);

        // Slider fill (rounded rect, border radius 6)
        this.sliderFillGraphics = this.scene.add.graphics();
        this.drawSliderFill(initialVolume / 100);
        this.container.add(this.sliderFillGraphics);

        // Knob
        const knobX = this.minX + ((this.maxX - this.minX) * (initialVolume / 100));
        this.knob = this.scene.addCircle((knobX / this.scene.display.scale), -this.bgHeight / 2 + 71, this.knobRadius, this.currentTheme.knobColor, 1)
            .setStrokeStyle(3, this.currentTheme.strokeColor)
            .setInteractive({ useHandCursor: true, draggable: true });
        this.container.add(this.knob);

        // Close button
        this.closeBtn = this.scene.addImage(-this.bgWidth / 2 + 210, -this.bgHeight / 2 + 17, 'icon_x').setInteractive({ useHandCursor: true });
        this.container.add(this.closeBtn);
        this.closeBtn.on('pointerdown', () => {
            this.close();
        });

        // Create focus indicator
        this.createFocusIndicator();

        // Drag logic
        this.knob.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.dragging = true;
            // Add scene-level pointer move listener when drag starts
            this.scene.input.on('pointermove', this.handleDrag, this);
            // Add scene-level pointer up listener to handle release outside knob
            this.scene.input.once('pointerup', this.handleDragEnd, this);
        });

        // We'll still keep this for when the pointer is released over the knob
        this.knob.on('pointerup', this.handleDragEnd, this);

        return this.container;
    }

    /**
     * Creates the focus indicator graphics
     */
    private createFocusIndicator() {
        if (!this.focusIndicator && this.container) {
            this.focusIndicator = this.scene.add.graphics();
            this.focusIndicator.setDepth(1001);
            this.container.add(this.focusIndicator);
        }
    }

    /**
     * Shows focus indicator around the specified element
     */
    private showFocusIndicator(element: 'close' | 'slider') {
        if (!this.focusIndicator || !this.container) return;
        
        this.focusIndicator.clear();
        this.focusIndicator.lineStyle(3, 0xFFFFFF, 1); // White outline
        
        if (element === 'close' && this.closeBtn) {
            // Focus outline around close button
            const padding = 8;
            const btnWidth = this.closeBtn.width;
            const btnHeight = this.closeBtn.height;
            
            this.focusIndicator.strokeRoundedRect(
                this.closeBtn.x - btnWidth/2 - padding,
                this.closeBtn.y - btnHeight/2 - padding,
                btnWidth + padding * 2,
                btnHeight + padding * 2,
                5
            );
        } else if (element === 'slider') {
            // Rectangular outline around the whole slider area
            const padding = 10;
            const sliderY = this.scene.getScaledValue(-this.bgHeight / 2 + 65);
            
            this.focusIndicator.strokeRoundedRect(
                this.minX - padding,
                sliderY - padding,
                (this.maxX - this.minX) + padding * 2,
                this.scene.getScaledValue(this.sliderHeight) + padding * 2,
                8
            );
        }
    }

    /**
     * Hides focus indicator
     */
    private hideFocusIndicator() {
        if (this.focusIndicator) {
            this.focusIndicator.clear();
        }
    }

    /**
     * Sets focus to a specific element
     */
    private setFocus(element: 'close' | 'slider') {
        this.focusedElement = element;
        this.showFocusIndicator(element);
    }

    /**
     * Handles dragging logic at the scene level
     */
    private handleDrag(pointer: Phaser.Input.Pointer) {
        if (!this.dragging || !this.container) return;

        // Convert pointer to local coordinates of the container
        const local = this.container.getLocalPoint(pointer.x, pointer.y);

        let newX = Phaser.Math.Clamp(local.x, this.minX, this.maxX);
        if (this.knob) this.knob.x = newX;

        const percent = Math.round(((newX - this.minX) / (this.maxX - this.minX)) * 100);
        if (this.percentText) {
            this.percentText.setText(`${percent}%`);
            this.percentTextOverlay?.updateContent(`${percent}%`);
        }

        const volume = percent / 100;
        this.audioManager.setMusicVolume(volume);
        this.audioManager.setSfxVolume(volume);
        this.drawSliderFill(volume);
    }

    /**
     * Handles end of drag at the scene level
     */
    private handleDragEnd() {
        this.dragging = false;
        // Clean up scene-level listeners
        this.scene.input.off('pointermove', this.handleDrag, this);
    }

    /**
     * Draws the slider fill based on the current volume (0-1)
     */
    private drawSliderFill(volume: number) {
        if (!this.sliderFillGraphics) return;
        this.sliderFillGraphics.clear();
        const fillWidth = (this.maxX - this.minX) * volume;
        if (fillWidth > 0) {
            this.sliderFillGraphics.fillStyle(this.currentTheme.sliderFillColor, 1);
            this.sliderFillGraphics.fillRoundedRect(
                this.minX,
                this.scene.getScaledValue(-this.bgHeight / 2 + 65),
                fillWidth,
                this.scene.getScaledValue(this.sliderHeight),
                this.scene.getScaledValue(6)
            );
        }
    }

    /**
     * Stores all current scene event handlers
     */
    private storeSceneEvents() {
        this.storedEventHandlers.clear();
        for (const event of this.sceneEvents) {
            const handlers = this.scene.input.listeners(event);
            if (handlers.length > 0) {
                this.storedEventHandlers.set(event, handlers);
            }
        }
    }

    /**
     * Restores all previously stored scene event handlers
     */
    private restoreSceneEvents() {
        this.storedEventHandlers.forEach((handlers, event) => {
            handlers.forEach(handler => {
                this.scene.input.on(event, handler);
            });
        });
        this.storedEventHandlers.clear();
    }

    /**
     * Handles keyboard input for volume adjustment
     */
    private handleKeyDown(event: KeyboardEvent) {
        if (!this.container || !this.container.visible) return;

        let currentVolume = this.audioManager.getMusicVolume();
        let newVolume = currentVolume;

        switch (event.key) {
            case 'Tab':
                event.preventDefault();
                this.handleTabNavigation(event.shiftKey);
                break;
            case 'ArrowLeft':
            case 'ArrowDown':
                newVolume = Math.max(0, currentVolume - this.keyboardStep);
                break;
            case 'ArrowRight':
            case 'ArrowUp':
                newVolume = Math.min(1, currentVolume + this.keyboardStep);
                break;
            case 'Escape':
                this.close();
                return;
            default:
                return;
        }

        // Update volume and UI
        this.audioManager.setMusicVolume(newVolume);
        this.audioManager.setSfxVolume(newVolume);
        
        // Update knob position
        if (this.knob) {
            const newX = this.minX + ((this.maxX - this.minX) * newVolume);
            this.knob.x = newX;
        }

        // Update percentage text
        if (this.percentText) {
            this.percentText.setText(`${Math.round(newVolume * 100)}%`);
            this.percentTextOverlay?.updateContent(`${Math.round(newVolume * 100)}%`);
        }

        // Update slider fill
        this.drawSliderFill(newVolume);
    }

    /**
     * Handles tab navigation between focusable elements
     */
    private handleTabNavigation(shiftPressed: boolean) {
        if (this.focusedElement === null || this.focusedElement === 'close') {
            if (shiftPressed) {
                // Shift+Tab from close button goes to slider
                this.setFocus('slider');
            } else {
                // Tab from close button goes to slider
                this.setFocus('slider');
            }
        } else if (this.focusedElement === 'slider') {
            if (shiftPressed) {
                // Shift+Tab from slider goes to close button
                this.setFocus('close');
            } else {
                // Tab from slider goes to close button
                this.setFocus('close');
            }
        }
    }

    /**
     * Updates the slider UI to reflect the current volume from AudioManager
     */
    private updateSliderFromCurrentVolume() {
        if (!this.container || !this.knob || !this.percentText) return;

        const currentVolume = this.audioManager.getMusicVolume();
        const volumePercent = Math.round(currentVolume * 100);

        // Update knob position
        const knobX = this.minX + ((this.maxX - this.minX) * currentVolume);
        this.knob.x = knobX;

        // Update percent text
        this.percentText.setText(`${volumePercent}%`);
        this.percentTextOverlay?.updateContent(`${volumePercent}%`);

        // Update slider fill
        this.drawSliderFill(currentVolume);
    }

    /**
     * Opens (shows) the volume slider popup and overlay.
     * Brings it to the top visually.
     */
    open() {
        this.storeSceneEvents();

        for (const event of this.sceneEvents) {
            this.scene.input.off(event);
        }

        this.labelOverlay?.setAriaHidden(false);
        this.percentTextOverlay?.setAriaHidden(false);

        // Add keyboard event listener
        window.addEventListener('keydown', this.boundKeyDownHandler);

        if (this.container) {
            this.updateSliderFromCurrentVolume();

            // Add overlay if not present
            if (!this.overlay) {
                this.overlay = this.scene.addRectangle(
                    0,
                    0,
                    this.scene.display.width,
                    this.scene.display.height,
                    0x000000,
                    0.7
                ).setOrigin(0).setScrollFactor(0).setDepth(999);
                this.overlay.setInteractive();
                this.overlay.on('pointerdown', () => {
                    this.scene.time.delayedCall(100, () => {
                        this.close();
                    });
                });
                // Ensure overlay is below the container
                this.container.setDepth?.(1000);
            } else {
                this.overlay.setVisible(true);
            }
            this.container.setVisible(true);
            this.container.setDepth?.(1000);
            // Set initial focus to close button
            this.setFocus('close');
        }

        if (this.onOpenCb) this.onOpenCb();
    }

    /**
     * Closes (hides) the volume slider popup and overlay, but does not destroy them.
     */
    close() {
        // Make sure we clean up any scene-level listeners if dragging was active
        if (this.dragging) {
            this.dragging = false;
            this.scene.input.off('pointermove', this.handleDrag, this);
        }

        // Clear focus state
        this.focusedElement = null;
        this.hideFocusIndicator();

        this.labelOverlay?.setAriaHidden(true);
        this.percentTextOverlay?.setAriaHidden(true);

        // Remove keyboard event listener
        window.removeEventListener('keydown', this.boundKeyDownHandler);

        if (this.container) {
            this.container.setVisible(false);
        }
        if (this.overlay) {
            this.overlay.setVisible(false);
        }

        this.restoreSceneEvents();

        if (this.onCloseCb) this.onCloseCb();
    }

    /**
     * Toggles the visibility of the volume slider popup and overlay.
     */
    toggleControl() {
        if (this.container && this.container.visible) {
            this.close();
        } else {
            this.open();
        }
    }

    isOpen() {
        return this.container && this.container.visible;
    }

    setOnOpen(callback: () => void) {
        this.onOpenCb = callback;
    }

    setOnClose(callback: () => void) {
        this.onCloseCb = callback;
    }

    static preload(scene: Phaser.Scene, theme: 'dark' | 'light' | 'blue' | 'purple' = 'dark') {
        scene.load.setPath('assets/components/volume_slider/images');
        scene.load.image(`volume_bg_${theme}`, `volume_bg_${theme}.png`);
        scene.load.image('icon_x', 'icon_x.png');
    }
}
