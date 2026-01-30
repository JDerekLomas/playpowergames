import { BaseScene, ButtonHelper, i18n } from "@k8-games/sdk";

export class NumberPad {
    private scene: BaseScene;
    private buttonContainers: Phaser.GameObjects.Container[][] = [];
    private onNumberSelected: (number: number) => void;
    // private theme?: "normal" | "bright";

    constructor(scene: BaseScene, onNumberSelected: (number: number) => void) {
        this.scene = scene;
        this.onNumberSelected = onNumberSelected;
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
            // buttonBottomPadding = 0,
        } = config;

        // this.theme = theme;

        for (let row = 0; row < 3; row++) {
            this.buttonContainers[row] = [];
            for (let col = 0; col < 3; col++) {
                const number = row * 3 + col + 1;
                const x = startX + col * (buttonSize + padding);
                const y = startY + row * (buttonSize + padding);

                const handleButtonClick = () => {
                    this.onNumberSelected(number);
                };

                const buttonContainer = ButtonHelper.createButton({
                    scene: this.scene,
                    imageKeys: {
                        default: theme === "normal" ? "number-pad-inactive" : "number-pad-default",
                        hover: `number-pad-hover`,
                        pressed: `number-pad-pressed`,
                    },
                    text: i18n.formatNumber(number),
                    label: i18n.formatNumber(number),
                    imageScale: theme === "normal" ? 0.7 : 1,
                    textStyle: {
                        font: `600 ${fontSize * scale}px Exo`,
                        color: "#000000",
                    },
                    x,
                    y,
                    onClick: handleButtonClick,
                    raisedOffset: 3.5,
                });

                this.buttonContainers[row][col] = buttonContainer;
            }
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
        const number = parseInt(event.key, 10); // Parse the pressed key
        if (number >= 1 && number <= 9) {
            this.onNumberSelected(number);
        }
    }

    disableButtons(): void {
        this.scene.time.delayedCall(0, () => {
            this.buttonContainers.forEach((row) => {
                row.forEach((buttonContainer) => {
                    buttonContainer.disableInteractive();
                    const overlay = (buttonContainer as any).buttonOverlay;
                    if (overlay) {
                        overlay.setDisabled(true);
                    }
                });
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
        this.buttonContainers.forEach((row) => {
            row.forEach((buttonContainer) => {
                buttonContainer.setInteractive();
                const overlay = (buttonContainer as any).buttonOverlay;
                if (overlay) {
                    overlay.setDisabled(false);
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
        const row = Math.floor((number - 1) / 3);
        const col = (number - 1) % 3;
        const buttonContainer = this.buttonContainers[row][col];

        // Get the background image and text from the container
        const background = buttonContainer.getAt(0) as Phaser.GameObjects.Image;

        if (background) {
            background.setTint(tint);
        }
    }

    public resetButtonHighlight(number: number): void {
        const row = Math.floor((number - 1) / 3);
        const col = (number - 1) % 3;
        const buttonContainer = this.buttonContainers[row][col];

        // Get the background image and text from the container
        const background = buttonContainer.getAt(0) as Phaser.GameObjects.Image;

        if (background) {
            background.clearTint();
        }
    }
}

