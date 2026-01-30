import { AnalyticsHelper, BaseScene, createFocusTrap, i18n } from "@k8-games/sdk";
import { ButtonHelper } from "@k8-games/sdk";
import { BUTTONS } from "../config/common";

export class PauseScene extends BaseScene {
    private parentScene?: string;
    private continueButton!: Phaser.GameObjects.Container;
    private backToMultiverseButton!: Phaser.GameObjects.Container;
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
        const resumeButton = ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.RESUME_ICON.KEY,
            label: i18n.t("common.resume"),
            x: this.display.width - 54,
            y: 75,
            onClick: () => this.resumeGame(),
        });

        // Add keyboard listener for ESC
        this.input.keyboard?.on("keydown-ESC", () => {
            this.resumeGame();
        });

        this.createBackToMultiverseUI();

        // Create focus trap with continue and back to map buttons
        const focusableElements = [resumeButton, this.continueButton, this.backToMultiverseButton];

        this.cleanupFocusTrap = createFocusTrap(focusableElements);
    }

    private createBackToMultiverseUI() {
        const baseY = this.display.height / 2 + 10;
        const gap = 130;

        this.continueButton = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY
            },
            text: i18n.t('common.resume'),
            label: i18n.t('common.resume'),
            textStyle: {
                font: '700 24px Exo',
                color: '#ffffff',
            },
            x: this.display.width / 2,
            y: baseY,
            onClick: () => {
                this.resumeGame();
            }
        });

        const handleClick = () => {
            this.audioManager.stopAllSoundEffects();
            this.audioManager.stopBackgroundMusic();
            this.scene.stop('PauseScene');

            const analyticsHelper = AnalyticsHelper.getInstance();
            if (analyticsHelper) {
                analyticsHelper.endLevelSession();
            }

            if (this.registry.get('isGameCompleted') === true) {
                window.parent.postMessage({ 
                    type: 'GAME_COMPLETED',
                    gameName: 'array_architects'
                }, '*');
            }

            window.parent.postMessage({ type: 'CLOSE_GAME' }, '*');
        };

        this.backToMultiverseButton = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY
            },
            imageScale: 1,
            text: 'Back to Multiverse',
            label: 'Back to Multiverse',
            textStyle: {
                font: '700 24px Exo',
                color: '#ffffff',
            },
            x: this.display.width / 2,
            y: baseY + gap,
            onClick: handleClick,
        });
    }

    static _preload(scene: BaseScene) {
        scene.load.setPath(`${BUTTONS.PATH}`);
        scene.load.image(BUTTONS.RESUME_ICON.KEY, BUTTONS.RESUME_ICON.PATH);
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