import { AnalyticsHelper, BaseScene, createFocusTrap, i18n } from "@k8-games/sdk";
import { ButtonHelper } from "@k8-games/sdk";
import { BUTTONS } from "../config/common";

export class PauseScene extends BaseScene {
    private parentScene?: string;
    private continueButton!: Phaser.GameObjects.Container;
    private backToMapButton!: Phaser.GameObjects.Container;
    private cleanupFocusTrap: (() => void) | null = null;

    constructor() {
        super("PauseScene");
    }

    init(data: { parentScene: string }) {
        this.parentScene = data.parentScene;

        this.events.once('shutdown', () => {
            if (this.cleanupFocusTrap) {
                this.cleanupFocusTrap();
                this.cleanupFocusTrap = null;
            }
        })
    }

    create() {
        // Create a dark overlay
        this.addRectangle(0, 0, this.display.width, this.display.height, 0x000000, 0.8)
            .setOrigin(0)
            .setInteractive()
            .on('pointerup', (pointer: Phaser.Input.Pointer) => {
                this.resumeGame();
                pointer.event.stopPropagation();
            });

        this.continueButton = this.createContinueButton();
        this.backToMapButton = this.createBackToMapButton();

        // Add keyboard listener for ESC to resume
        this.input.keyboard?.on('keydown-ESC', () => {
            this.resumeGame();
        });

        // Create focus trap with continue and back to map buttons
        const focusableElements = [this.continueButton, this.backToMapButton];
        
        this.cleanupFocusTrap = createFocusTrap(focusableElements);
    }

    private createContinueButton(): Phaser.GameObjects.Container {
        const handleContinueClick = () => {
            this.resumeGame();
        }

        const continueButton = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY
            },
            text: i18n.t('common.resume'),
            label: i18n.t('common.resume'),
            textStyle: {
                font: "700 24px Exo"
            },
            x: this.display.width / 2,
            y: this.display.height / 2 - 70,
            onClick: () => handleContinueClick(),
        });

        return continueButton;
    }

    private createBackToMapButton(): Phaser.GameObjects.Container {
        const handleBackToMapClick = () => {
            ButtonHelper.disableButton(this.continueButton);
            ButtonHelper.disableButton(this.backToMapButton);

            this.audioManager.stopAllSoundEffects();
            this.audioManager.stopBackgroundMusic();

            // Stop the parent scene
            this.scene.stop(this.parentScene);
            
            this.scene.start('MenuScene');

            const analyticsHelper = AnalyticsHelper.getInstance();
            if (analyticsHelper) {
                analyticsHelper.endLevelSession();
            }
        }

        const backToMapButton = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY
            },
            text: i18n.t('common.backToMap'),
            label: i18n.t('common.backToMap'),
            textStyle: {
                font: "700 24px Exo"
            },
            x: this.display.width / 2,
            y: this.display.height / 2 + 70,
            onClick: () => handleBackToMapClick(),
        });

        return backToMapButton;
    }

    private resumeGame() {
        this.scene.stop();
        this.audioManager.resumeAll();
        this.scene.resume(this.parentScene);
        const gameScene = this.scene.get(this.parentScene as string);
        if (gameScene) {
            const pauseButton = gameScene.children.getByName('pause_btn') as Phaser.GameObjects.Container;
            if (pauseButton) {
                const overlay = (pauseButton as any).buttonOverlay;
                if (overlay && overlay.element) {
                    overlay.element.focus({ preventScroll: true });
                }
            }
        }
    }
}