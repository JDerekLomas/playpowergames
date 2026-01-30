import { BaseScene, ButtonHelper, i18n } from "@k8-games/sdk";
import { AssetsConfig } from "../config/AssetsConfig";

export class NumberPad {
    private scene: BaseScene;
    private buttonContainers: Phaser.GameObjects.Container[][] = [];
    private onNumberSelected: (number: number) => void;
    private onBackspace?: () => void;
    private theme?: "normal" | "bright";
    private isDisabled: boolean = false; // Add disabled state

    constructor(scene: BaseScene, onNumberSelected: (number: number) => void, onBackspace?: () => void) {
        this.scene = scene;
        this.onNumberSelected = onNumberSelected;
        this.onBackspace = onBackspace;
    }

    public create(config: {
        x: number;
        y: number;
        padding?: number;
        buttonSize?: number;
        theme?: "normal" | "bright";
        scale?: number;
        fontSize?: number;
        buttonBottomPadding?: number;
    }): void {
        const {
            x: startX,
            y: startY,
            padding = 17.78,
            buttonSize = 70,
            theme = "normal",
            scale = 1,
            fontSize = 32,
        } = config;

        this.theme = theme;

        for (let row = 0; row < 3; row++) {
            this.buttonContainers[row] = [];
            for (let col = 0; col < 3; col++) {
                const number = row * 3 + col + 1;
                const x = startX + col * (buttonSize + padding);
                const y = startY + row * (buttonSize + padding);

                const handleButtonClick = () => {
                    // Check if buttons are disabled before executing
                    if (!this.isDisabled) {
                        this.onNumberSelected(number);
                    }
                };

                const buttonContainer = ButtonHelper.createButton({
                    scene: this.scene,
                    imageKeys: {
                        default: theme === "normal" ? AssetsConfig.KEYS.IMAGES.NUMBER_PAD_INACTIVE : AssetsConfig.KEYS.IMAGES.NUMBER_PAD_DEFAULT,
                        hover: AssetsConfig.KEYS.IMAGES.NUMBER_PAD_HOVER,
                        pressed: AssetsConfig.KEYS.IMAGES.NUMBER_PAD_PRESSED,
                    },
                    text: i18n.formatNumber(number),
                    label: i18n.formatNumberForScreenReader(number),
                    imageScale: theme === "normal" ? 0.6 : 0.9,
                    textStyle: {
                        font: `600 ${fontSize * scale}px Exo`,
                        color: "#000000",
                    },
                    x,
                    y,
                    onClick: handleButtonClick,
                    raisedOffset: 3.5,
                });

                buttonContainer.setName(`number_pad_${number}`);
                this.buttonContainers[row][col] = buttonContainer;
            }
        }

        // Add the "0" button in the fourth row
        this.buttonContainers[3] = [];
        const zeroX = startX + buttonSize + padding; // Center position
        const zeroY = startY + 3 * (buttonSize + padding);

        const handleZeroClick = () => {
            // Check if buttons are disabled before executing
            if (!this.isDisabled) {
                this.onNumberSelected(0);
            }
        };

        const zeroButtonContainer = ButtonHelper.createButton({
            scene: this.scene,
            imageKeys: {
                default: theme === "normal" ? AssetsConfig.KEYS.IMAGES.NUMBER_PAD_INACTIVE : AssetsConfig.KEYS.IMAGES.NUMBER_PAD_DEFAULT,
                hover: AssetsConfig.KEYS.IMAGES.NUMBER_PAD_HOVER,
                pressed: AssetsConfig.KEYS.IMAGES.NUMBER_PAD_PRESSED,
            },
            text: i18n.formatNumber(0),
            label: i18n.formatNumberForScreenReader(0),
            imageScale: theme === "normal" ? 0.6 : 0.9,
            textStyle: {
                font: `600 ${fontSize * scale}px Exo`,
                color: "#000000",
            },
            x: zeroX,
            y: zeroY,
            onClick: handleZeroClick,
            raisedOffset: 3.5,
        });

        zeroButtonContainer.setName('number_pad_0');
        this.buttonContainers[3][1] = zeroButtonContainer;

        if (this.onBackspace) {
            const backspaceButtonContainer = ButtonHelper.createIconButton({
                scene: this.scene,
                imageKeys: {
                    default: theme === "normal" ? AssetsConfig.KEYS.IMAGES.NUMBER_PAD_INACTIVE : AssetsConfig.KEYS.IMAGES.NUMBER_PAD_DEFAULT,
                    hover: AssetsConfig.KEYS.IMAGES.NUMBER_PAD_HOVER,
                    pressed: AssetsConfig.KEYS.IMAGES.NUMBER_PAD_PRESSED,
                },
                label: i18n.t('common.backspace'),
                imageScale: theme === "normal" ? 0.6 : 0.9,
                icon: 'clear_icon',
                iconScale: theme === "normal" ? 0.6 : 0.9,
                x: startX + 2 * (buttonSize + padding),
                y: startY + 3 * (buttonSize + padding),
                onClick: this.onBackspace
            });

            this.buttonContainers[3][2] = backspaceButtonContainer;
        }

        if (this.scene.input?.keyboard) {
            this.scene.input.keyboard.on(
                "keydown",
                this.handleNumberKeyInput,
                this
            );
        }
    }

    private handleNumberKeyInput(event: KeyboardEvent): void {
        // Backspace handling
        if (event.key === 'Backspace') {
            if (!this.isDisabled && this.onBackspace) {
                this.onBackspace();
            }
            return;
        }

        // Check if buttons are disabled before executing
        if (!this.isDisabled) {
            const number = parseInt(event.key, 10); // Parse the pressed key
            if (number >= 0 && number <= 9) {
                this.onNumberSelected(number);
            }
        }
    }

    disableButtons(): void {
        this.isDisabled = true; // Set disabled state
        
        this.buttonContainers.forEach((row) => {
            row.forEach((buttonContainer) => {
                // Disable the button (handles event blocking)
                ButtonHelper.disableButton(buttonContainer);
                
                // Handle visual changes specific to NumberPad
                const background = buttonContainer.getAt(0) as Phaser.GameObjects.Image;
                if (background) {
                    background.setTexture(AssetsConfig.KEYS.IMAGES.NUMBER_PAD_INACTIVE);
                    background.setAlpha(0.5); // Make it semi-transparent
                }
                
                const overlay = (buttonContainer as any).buttonOverlay;
                if (overlay) {
                    overlay.setDisabled(true);
                }
            });
        });        

        if (this.scene.input?.keyboard) {
            this.scene.input.keyboard.off(
                "keydown",
                this.handleNumberKeyInput,
                this
            );
        }
    }

    enableButtons(): void {
        this.isDisabled = false; // Clear disabled state
        
        this.buttonContainers.forEach((row) => {
            row.forEach((buttonContainer) => {
                // Enable the button (handles event restoration)
                ButtonHelper.enableButton(buttonContainer);
                
                // Handle visual changes specific to NumberPad
                const background = buttonContainer.getAt(0) as Phaser.GameObjects.Image;
                if (background) {
                    const defaultTexture = this.theme === "normal" ? AssetsConfig.KEYS.IMAGES.NUMBER_PAD_INACTIVE : AssetsConfig.KEYS.IMAGES.NUMBER_PAD_DEFAULT;
                    background.setTexture(defaultTexture);
                    background.setAlpha(1); // Make it fully opaque
                }
                
                const overlay = (buttonContainer as any).buttonOverlay;
                if (overlay) {
                    overlay.setDisabled(false);
                }

                if (buttonContainer.name === 'number_pad_1') {
                    overlay?.focus();
                }
            });
        });

        if (this.scene.input?.keyboard) {
            this.scene.input.keyboard.on(
                "keydown",
                this.handleNumberKeyInput,
                this
            );
        }
    }

    public destroy(): void {
        this.buttonContainers.forEach((row) => {
            row.forEach((buttonContainer) => {
                buttonContainer.destroy();
            });
        });
        this.buttonContainers = [];

        if (this.scene.input?.keyboard) {
            this.scene.input.keyboard.off(
                "keydown",
                this.handleNumberKeyInput,
                this
            );
        }
    }

    public highlightButton(number: number, tint: number = 0xBFFFE0): void {
        const buttonContainer = this.getButtonContainer(number);
        if (!buttonContainer) {
            return;
        }

        const background = buttonContainer.getAt(0) as Phaser.GameObjects.Image;
        
        if (background) {
            background.setTint(tint);
        }
    }

    public resetButtonHighlight(number: number): void {
        const buttonContainer = this.getButtonContainer(number);
        if (!buttonContainer) {
            return;
        }
        
        // Get the background image and text from the container
        const background = buttonContainer.getAt(0) as Phaser.GameObjects.Image;

        if (background) {
            background.clearTint();
        }
    }

    public getButtonContainer(number: number): Phaser.GameObjects.Container | null {
        const buttonContainer = this.scene.children.getByName(`number_pad_${number}`);
        if (buttonContainer) {
            return buttonContainer as Phaser.GameObjects.Container;
        }
        return null;
    }
}
