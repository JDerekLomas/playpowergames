import { Game } from 'phaser';
import { Boot } from './scenes/Boot';
import { GameScene } from './scenes/Game';
import { ScoreBoardScene } from './scenes/ScoreBoard';
import { LoadingScene } from './scenes/LoadingScene';
import { SplashScene } from './scenes/SplashScene';
import { InfoScene } from './scenes/Info';
import { DisplayConfig, GameConfig, GameConfigManager, i18n, Lifecycle } from '@k8-games/sdk';
import { initializeI18n } from './utils/lang';
import { CelebrationScene } from './scenes/CelebrationScene';
import { PauseScene } from './scenes/PauseScene';
import { FractionLabScene } from './scenes/FractionLabScene';

const { width, height, canvasWidth, canvasHeight } = DisplayConfig.getInstance();
const GAME_CONTAINER_ID = 'game-container';
const gameConfigManager = GameConfigManager.getInstance();
const lifecycle = Lifecycle.getInstance();

const config = GameConfig.create({
    title: 'Fraction Frenzy',
    width,
    height,
    canvasWidth,
    canvasHeight,
    parent: GAME_CONTAINER_ID,
    backgroundColor: '#000',
});
config.scene = [Boot, LoadingScene, SplashScene, InfoScene, GameScene, ScoreBoardScene, CelebrationScene, PauseScene, FractionLabScene];

async function initializeGame() {
    await gameConfigManager.loadConfigs();

    // Initialize i18n before game starts
    initializeI18n();

    // Initialize lifecycle management
    lifecycle.initialize(GAME_CONTAINER_ID);

    const topic = gameConfigManager.get('topic') || "compare_percents";
    // Set the title of the game
    let title = i18n.t('common.title');
    let titleLabel = i18n.t('common.titleLabel');
    if (topic === 'compare_numbers') {
        title = i18n.t('common.compareNumberTab');
        titleLabel = i18n.t('common.compareNumberLabel');
    }
    document.title = title;

    const container = document.getElementById(GAME_CONTAINER_ID);
    if (container) {
        container.setAttribute('role', 'application');
        container.setAttribute('aria-label', titleLabel);
        container.setAttribute('tabindex', '0');
        container.focus();
    }


    console.log(gameConfigManager.get('topic'));

    new Game(config);
}

// Start the game
initializeGame().catch(error => {
    console.error('Failed to initialize game:', error);
});