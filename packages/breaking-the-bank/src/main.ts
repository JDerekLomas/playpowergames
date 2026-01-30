import { Game } from 'phaser';
import { DisplayConfig, GameConfig, GameConfigManager, i18n, Lifecycle } from '@k8-games/sdk';
import { Boot } from './scenes/Boot';
import { Preloader } from './scenes/Preloader';
import { GameScene } from './scenes/Game';
import { ScoreboardScene } from './scenes/Scoreboard';
import { SplashScreen } from './scenes/SplashScreen';
import { InfoScene } from './scenes/InfoScene';
import { initializeI18n } from './utils/lang';
import { PauseScene } from './scenes/PauseScene';

const { width, height, canvasWidth, canvasHeight } = DisplayConfig.getInstance();
const GAME_CONTAINER_ID = 'game-container';
const gameConfigManager = GameConfigManager.getInstance();
const lifecycle = Lifecycle.getInstance();

const config = GameConfig.create({
    title: 'Breaking the Bank',
    width,
    height,
    canvasWidth,
    canvasHeight,
    parent: GAME_CONTAINER_ID,
    backgroundColor: '#000'
});

config.scene = [Boot, Preloader, SplashScreen, InfoScene, GameScene, PauseScene, ScoreboardScene];

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