import { AnalyticsHelper, BaseScene, createFocusTrap, GameConfigManager, i18n } from "@k8-games/sdk";
import { ButtonHelper } from "@k8-games/sdk";
import { AssetsConfig } from "../config/AssetsConfig";
import { MULTIVERSE_TOPICS } from "../config/CommonConfig";

export class PauseScene extends BaseScene {
    private parentScene: string;
    private isMultiverse: boolean = false;
    private continueButton!: Phaser.GameObjects.Container;
    private backToMultiverseButton!: Phaser.GameObjects.Container;
    private cleanupFocusTrap: (() => void) | null = null;

    constructor() {
        super({ key: "PauseScene" });
        this.audioManager.initialize(this);
        const gameConfigManager = GameConfigManager.getInstance();
        const topic = gameConfigManager.get('topic') || '';
        if (MULTIVERSE_TOPICS.includes(topic)) {
            this.isMultiverse = true;
        }
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
            this.scale.width,
            this.scale.height,
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
                default: AssetsConfig.KEYS.BUTTONS.ICON_BTN,
                hover: AssetsConfig.KEYS.BUTTONS.ICON_BTN_HOVER,
                pressed: AssetsConfig.KEYS.BUTTONS.ICON_BTN_PRESSED,
            },
            icon: AssetsConfig.KEYS.BUTTONS.RESTART_BTN,
            label: i18n.t("common.resume"),
            x: this.display.width - 54,
            y: 64,
            onClick: () => this.resumeGame(),
            raisedOffset: 3.5,
        });

        // Add keyboard listener for ESC
        this.input.keyboard?.on("keydown-ESC", () => {
            this.resumeGame();
        });

        if (this.isMultiverse) {
            this.continueButton = this.createContinueButton();
            this.backToMultiverseButton = this.createBackToMultiverseButton();

            const focusableElements = [resumeButton, this.continueButton, this.backToMultiverseButton];

            this.cleanupFocusTrap = createFocusTrap(focusableElements);
        } else {
            const focusableElements = [resumeButton];

            this.cleanupFocusTrap = createFocusTrap(focusableElements);
        }
    }

    private createContinueButton(): Phaser.GameObjects.Container {
        const handleContinueClick = () => {
            this.resumeGame();
        };

        const continueButton = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: AssetsConfig.KEYS.BUTTONS.DEFAULT,
                hover: AssetsConfig.KEYS.BUTTONS.HOVER,
                pressed: AssetsConfig.KEYS.BUTTONS.PRESSED,
            },
            text: i18n.t('common.resume'),
            label: i18n.t('common.resume'),
            textStyle: {
                font: '700 24px Exo',
            },
            x: this.display.width / 2,
            y: this.display.height / 2 - 70,
            onClick: () => handleContinueClick(),
        });

        return continueButton;
    }

    private createBackToMultiverseButton(): Phaser.GameObjects.Container {
        const handleBackToMultiverseClick = () => {
            ButtonHelper.disableButton(this.continueButton);
            ButtonHelper.disableButton(this.backToMultiverseButton);

            this.audioManager.stopAllSoundEffects();
            this.audioManager.stopBackgroundMusic();

            // Stop the parent scene
            this.scene.stop(this.parentScene);

            const analyticsHelper = AnalyticsHelper.getInstance();
            if (analyticsHelper) {
                analyticsHelper.endLevelSession();
            }

            if (this.registry.get('isGameCompleted') === true) {
                const gameConfigManager = GameConfigManager.getInstance();
                const mode = gameConfigManager.get('mode') || 'make_ten';
                window.parent.postMessage({ 
                    type: 'GAME_COMPLETED',
                    gameName: mode === 'make_20' ? 'make_20' : 'make_ten'
                }, '*');
            }

            window.parent.postMessage({ type: 'CLOSE_GAME' }, '*');
        };

        const backToMultiverseButton = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: AssetsConfig.KEYS.BUTTONS.DEFAULT,
                hover: AssetsConfig.KEYS.BUTTONS.HOVER,
                pressed: AssetsConfig.KEYS.BUTTONS.PRESSED,
            },
            text: i18n.t('scoreboard.backToMultiverse'),
            label: i18n.t('scoreboard.backToMultiverse'),
            textStyle: {
                font: '700 24px Exo',
            },
            x: this.display.width / 2,
            y: this.display.height / 2 + 70,
            onClick: () => handleBackToMultiverseClick(),
        });

        return backToMultiverseButton;
    }

    private resumeGame() {
        this.scene.resume(this.parentScene);
        this.scene.stop();
        this.audioManager.resumeAll();
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
