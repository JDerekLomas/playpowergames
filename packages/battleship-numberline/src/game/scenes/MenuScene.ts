import { BaseScene } from './BaseScene';
import { CommonConfig } from '../config/CommonConfig';
import { ButtonHelper, i18n, createFocusTrap, AnalyticsHelper } from '@k8-games/sdk';
import { islandState } from '../managers/IslandStateManager';

const {
    ASSETS: {
        KEYS: {
            IMAGE: { BUTTON: buttonKeys },
        },
    },
} = CommonConfig;

export class MenuScene extends BaseScene {
    private parentScene: string;
    private topic: string;
    private continueButton: Phaser.GameObjects.Container;
    private backToMapButton: Phaser.GameObjects.Container;
    private cleanupFocusTrap: (() => void) | null = null;

    constructor() {
        super({ key: 'MenuScene' });
    }

    init(data: { parentScene: string; topic?: string; }): void {
        this.parentScene = data.parentScene;
        this.topic = data.topic ?? '';

        this.events.once('shutdown', () => {
            if (this.cleanupFocusTrap) {
                this.cleanupFocusTrap();
                this.cleanupFocusTrap = null;
            }
        })
    }

    create(): void {
        // Create a dark overlay
        this.addRectangle(0, 0, this.display.width, this.display.height, 0x000000, 0.7)
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
                default: buttonKeys.DEFAULT,
                hover: buttonKeys.HOVER,
                pressed: buttonKeys.PRESSED,
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
            if (!this.topic) return;

            ButtonHelper.disableButton(this.continueButton);
            ButtonHelper.disableButton(this.backToMapButton);

            const completedLevels = islandState.getCompletedLevels(this.topic);

            this.audioManager.stopAllSoundEffects();
            this.audioManager.stopBackgroundMusic();
            
            // Store the data before starting animation
            const mapSceneData = {
                topic: this.topic,
                completedLevels: completedLevels,
                parentScene: 'MenuScene',
            };
            
            this.animateClouds(() => {
                this.scene.start('MapScene', mapSceneData);

                const analyticsHelper = AnalyticsHelper.getInstance();
                if (analyticsHelper) {
                    analyticsHelper.endLevelSession();
                }
            });
        }

        const backToMapButton = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: buttonKeys.DEFAULT,
                hover: buttonKeys.HOVER,
                pressed: buttonKeys.PRESSED,
            },
            text: i18n.t('scoreboard.backToMap'),
            label: i18n.t('scoreboard.backToMap'),
            textStyle: {
                font: "700 24px Exo"
            },
            x: this.display.width / 2,
            y: this.display.height / 2 + 70,
            onClick: () => handleBackToMapClick(),
        });

        return backToMapButton;
    }

    private animateClouds(cb: () => void) {
        const offset = 500;
        const cloud1 = this.addImage(-offset, this.display.height + offset, 'cloud').setOrigin(0.5);
        const cloud2 = this.addImage(this.display.width + offset, -offset, 'cloud').setOrigin(0.5);

        cloud1.setAlpha(0);
        cloud2.setAlpha(0);

        this.tweens.add({
            targets: [cloud1, cloud2],
            alpha: 1,
            x: this.getScaledValue(this.display.width / 2),
            y: this.getScaledValue(this.display.height / 2),
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                cb();
            }
        }); 
    }

    private resumeGame(): void {
        this.scene.resume(this.parentScene);
        this.scene.stop();
        this.audioManager.resumeAll();
        const gameScreen = this.scene.get('GameScreen');
        if (gameScreen) {
            const pauseButton = gameScreen.children.getByName('pause_btn') as Phaser.GameObjects.Container;
            if (pauseButton) {
                const overlay = (pauseButton as any).buttonOverlay;
                if (overlay && overlay.element) {
                    overlay.element.focus({ preventScroll: true });
                }
            }
        }
    }

    shutdown(): void {
        this.audioManager.stopAllSoundEffects();
    }
}
