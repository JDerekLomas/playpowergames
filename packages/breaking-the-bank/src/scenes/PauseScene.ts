import { BaseScene, createFocusTrap, i18n } from "@k8-games/sdk";
import { ButtonHelper } from "@k8-games/sdk";
import { BUTTONS } from "../config/common";

export class PauseScene extends BaseScene {
    private parentScene?: string;
    private resumeButton!: Phaser.GameObjects.Container;
    private resumeButtonTween!: Phaser.Tweens.Tween;
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
        // Create dark overlay
        this.addRectangle(
            0,
            0,
            this.display.width,
            this.display.height,
            0x000000,
            0.7
        )
            .setOrigin(0)
            .setScrollFactor(0)
            .setInteractive()
            .on("pointerup", () => {
                this.resumeGame();
            });

        // Add resume button
        this.resumeButton = ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.RESUME_ICON.KEY,
            label: i18n.t('common.resume'),
            x: this.display.width - 54,
            y: 64,
            onClick: () => this.resumeGame(),
        });

        this.resumeButtonTween = ButtonHelper.startBreathingAnimation(this.resumeButton, {
            scale: 1.1,
            duration: 1000,
            ease: 'Sine.easeInOut'
        });

        // Add keyboard listener for ESC
        this.input.keyboard?.on("keydown-ESC", () => {
            this.resumeGame();
            ButtonHelper.stopBreathingAnimation(this.resumeButtonTween, this.resumeButton);
        });

        const focusableElements = [this.resumeButton];

        this.cleanupFocusTrap = createFocusTrap(focusableElements);
    }

    private resumeGame() {
        this.scene.stop();
        this.scene.resume(this.parentScene);
        this.audioManager.resumeAll();
        ButtonHelper.stopBreathingAnimation(this.resumeButtonTween, this.resumeButton);

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