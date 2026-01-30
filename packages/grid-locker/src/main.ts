import { Game } from 'phaser';
import { Boot } from './scenes/Boot';
import { ScoreboardScene } from './scenes/Scoreboard';
import { LoadingScene } from './scenes/LoadingScene';
import { SplashScene } from './scenes/SplashScene';
import { InstructionsScene } from './scenes/Instructions';
import { DisplayConfig, GameConfig, GameConfigManager, i18n, Lifecycle } from '@k8-games/sdk';
import { initializeI18n } from './utils/lang';
import { PauseScene } from './scenes/PauseScene';
import { CelebrationScene } from './scenes/CelebrationScene';
import { GameScene } from './scenes/GameScene';

const { width, height, canvasWidth, canvasHeight } = DisplayConfig.getInstance();
const GAME_CONTAINER_ID = 'game-container';
const gameConfigManager = GameConfigManager.getInstance();
const lifecycle = Lifecycle.getInstance();

const config = GameConfig.create({
    title: 'Grid Lock',
    width,
    height,
    canvasWidth,
    canvasHeight,
    parent: GAME_CONTAINER_ID,
    backgroundColor: '#000',
});
config.scene = [Boot, LoadingScene, SplashScene, InstructionsScene, ScoreboardScene, PauseScene, CelebrationScene, GameScene];

async function initializeGame() {
    await gameConfigManager.loadConfigs();

    // Initialize i18n before game starts
    initializeI18n();

    // Initialize lifecycle management
    lifecycle.initialize(GAME_CONTAINER_ID);

    // Set the title of the game
    document.title = i18n.t('common.title');

    const container = document.getElementById(GAME_CONTAINER_ID);
    if (container) {
        container.setAttribute('role', 'application');
        container.setAttribute('aria-label', i18n.t('common.titleLabel'));
        container.setAttribute('tabindex', '0');
        container.focus();
    }

    new Game(config);
}

// Start the game
initializeGame().catch(error => {
    console.error('Failed to initialize game:', error);
});