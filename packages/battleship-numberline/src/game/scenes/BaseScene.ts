import { CommonConfig } from '../config/CommonConfig';
import { GameStateManager } from '../managers/GameStateManager';
import { BaseScene as BaseSceneSdk } from '@k8-games/sdk';

const {
    ASSETS: {
        KEYS: { MUSIC: musicKeys },
    },
} = CommonConfig;

export class BaseScene extends BaseSceneSdk {
    public gameState: GameStateManager;
    private static backgroundMusic: Phaser.Sound.BaseSound | undefined;

    constructor(config: string | Phaser.Types.Scenes.SettingsConfig) {
        super(config);
        this.gameState = GameStateManager.initialize();
    }

    protected startBackgroundMusic(): void {
        if (!BaseScene.backgroundMusic) {
            BaseScene.backgroundMusic = this.sound.add(musicKeys.GAME_THEME, {
                volume: CommonConfig.AUDIO.MUSIC.VOLUME,
                loop: true,
            });
            BaseScene.backgroundMusic.play();
        }
    }

    protected stopBackgroundMusic(): void {
        if (BaseScene.backgroundMusic) {
            BaseScene.backgroundMusic.stop();
            BaseScene.backgroundMusic.destroy();
            BaseScene.backgroundMusic = undefined;
        }
    }

    protected fadeOutBackgroundMusic(): Promise<void> {
        return new Promise((resolve) => {
            if (BaseScene.backgroundMusic) {
                this.tweens.add({
                    targets: BaseScene.backgroundMusic,
                    volume: 0,
                    duration: CommonConfig.AUDIO.MUSIC.FADE_DURATION,
                    onComplete: () => {
                        this.stopBackgroundMusic();
                        resolve();
                    },
                });
            } else {
                resolve();
            }
        });
    }
}