import { BaseScene, ButtonHelper } from "@k8-games/sdk";

export interface NumberPadOptions {
    onEnter?: () => void;
}

export class NumberPad {
    private scene: BaseScene;
    private buttonContainers: Phaser.GameObjects.Container[] = [];
    private onNumberSelected: (number: number) => void;
    private onEnter?: () => void;
    private isDisabled: boolean = false;

    constructor(scene: BaseScene, onNumberSelected: (number: number) => void, options?: NumberPadOptions) {
        this.scene = scene;
        this.onNumberSelected = onNumberSelected;
        this.onEnter = options?.onEnter;
    }
    
    public getButtonContainers(): Phaser.GameObjects.Container[] {
        return this.buttonContainers;
    }

    public create(config: {
        x: number;
        y: number;
    }): void {

        // sizing and margin config
        const startX = config.x;
        const startY = config.y;
        const buttonWidth = 73; 
        const buttonHeight = 75;
        const gap = 23;
        const fontSize = 36;

        const baseX = startX - (buttonWidth / 2);
        let baseY = startY - (buttonHeight / 2);
        
        for (let i = 0; i < 10; i++) {
            let buttonX = baseX + (i * (buttonWidth + gap));
            if (i === 5) {
                baseY = startY + (buttonHeight / 2) + gap;
            }

            if (i >= 5) {
                buttonX = baseX + ((i - 5) * (buttonWidth + gap));
            }

            let buttonText = (i + 1).toString();
            if (i === 9) {
                buttonText = '0';
            }

            const handleButtonClick = () => {
                if (!this.isDisabled) {
                    const number = parseInt(buttonText);
                    this.onNumberSelected(number);
                }
            };

            const buttonContainer = ButtonHelper.createButton({
                scene: this.scene,
                imageKeys: {
                    default: 'keypad_btn',
                    hover: 'keypad_btn_hover',
                    pressed: 'keypad_btn_pressed'
                },
                text: buttonText,
                label: buttonText,
                textStyle: {
                    font: `700 ${fontSize}px Exo`,
                    color: '#000000'
                },
                imageScale: 1,
                x: buttonX,
                y: baseY,
                onClick: handleButtonClick
            });

            buttonContainer.setDepth(3);
            buttonContainer.setData('number', parseInt(buttonText));
            this.buttonContainers[i] = buttonContainer;
        }

        // Add keyboard support
        if (this.scene.input?.keyboard) {
            this.scene.input.keyboard.on('keydown', this.handleNumberKeyInput, this);
        }
    }

    private handleNumberKeyInput = (event: KeyboardEvent): void => {
        if (this.isDisabled) return;
        if (this.scene.sys.settings.key === "NumpadTutorial") return;
        const number = parseInt(event.key, 10);
        if (number >= 0 && number <= 9) {
            this.onNumberSelected(number);
        } else if (event.key === "Enter" && this.onEnter) {
            this.onEnter();
        }
    }

    disableButtons(): void {
        this.isDisabled = true;
        
        this.buttonContainers.forEach((buttonContainer) => {
            if (buttonContainer) {
                ButtonHelper.disableButton(buttonContainer);
                
                const background = buttonContainer.getAt(0) as Phaser.GameObjects.Image;
                if (background) {
                    background.setAlpha(0.5);
                }
            }
        });        

        if (this.scene.input?.keyboard) {
            this.scene.input.keyboard.off('keydown', this.handleNumberKeyInput, this);
        }
    }

    enableButtons(): void {
        this.isDisabled = false;
        
        this.buttonContainers.forEach((buttonContainer) => {
            if (buttonContainer) {
                ButtonHelper.enableButton(buttonContainer);
                const background = buttonContainer.getAt(0) as Phaser.GameObjects.Image;
                if (background) {
                    background.setAlpha(1);
                }
            }
        });

        if (this.scene.input?.keyboard) {
            this.scene.input.keyboard.on('keydown', this.handleNumberKeyInput, this);
        }
    }

    public destroy(): void {
        this.buttonContainers.forEach((buttonContainer) => {
            buttonContainer.destroy();
        });
        this.buttonContainers = [];

        if (this.scene.input?.keyboard) {
            this.scene.input.keyboard.off('keydown', this.handleNumberKeyInput, this);
        }
    }

    public highlightButton(number: number, tint: number = 0xBFFFE0): void {
        // Find the button for the given number
        let buttonIndex = -1;
        if (number >= 1 && number <= 9) {
            buttonIndex = number - 1;
        } else if (number === 0) {
            buttonIndex = 9;
        }

        const buttonContainer = this.buttonContainers[buttonIndex];
        if (buttonContainer) {
            const background = buttonContainer.getAt(0) as Phaser.GameObjects.Image;
            if (background) {
                background.setTint(tint);
            }
        }
    }

    public resetButtonHighlight(number: number): void {
        // Find the button for the given number
        let buttonIndex = -1;
        if (number >= 1 && number <= 9) {
            buttonIndex = number - 1;
        } else if (number === 0) {
            buttonIndex = 9;
        }

        const buttonContainer = this.buttonContainers[buttonIndex];
        if (buttonContainer) {
            const background = buttonContainer.getAt(0) as Phaser.GameObjects.Image;
            if (background) {
                background.clearTint();
            }
        }
    }
}
