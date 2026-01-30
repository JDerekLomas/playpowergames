import { Game } from "phaser";
import { LoadingScene } from "./scenes/LoadingScene";
import { StartScene } from "./scenes/StartScene";
import { HowToPlay } from "./scenes/HowToPlay";
import { GameScene } from "./scenes/GameScene";
import { ScoreboardScene } from "./scenes/ScoreboardScene";
import { Boot } from "./scenes/Boot";
import { DisplayConfig, GameConfig, GameConfigManager, i18n, Lifecycle } from "@k8-games/sdk";
import { PauseScene } from "./scenes/PauseScene";
import { initializeI18n } from "./utils/lang";
import { CelebrationScene } from "./scenes/CelebrationScene";

const { width, height, canvasWidth, canvasHeight } = DisplayConfig.getInstance();
const GAME_CONTAINER_ID = 'game-container';
const gameConfigManager = GameConfigManager.getInstance();
const lifecycle = Lifecycle.getInstance();

const config = GameConfig.create({
    title: "Make Ten",
    width,
    height,
    canvasWidth,
    canvasHeight,
    parent: GAME_CONTAINER_ID,
    backgroundColor: "#000",
});

config.scene = [
    Boot,
    LoadingScene,
    StartScene,
    HowToPlay,
    GameScene,
    ScoreboardScene,
    PauseScene,
    CelebrationScene,
];

async function initializeGame() {
    await gameConfigManager.loadConfigs();

    // Initialize i18n before game starts
    initializeI18n();

    // Initialize lifecycle management
    lifecycle.initialize(GAME_CONTAINER_ID);

    const mode = gameConfigManager.get('mode') || 'make_ten';
    // Set the title of the game
    if (mode === 'make_20') {
        document.title = i18n.t('common.titleMake20');
    } else {
        document.title = i18n.t('common.title');
    }

    const container = document.getElementById(GAME_CONTAINER_ID);
    if (container) {
        container.setAttribute('role', 'application');
        if (mode === 'make_20') {
            container.setAttribute('aria-label', i18n.t('common.titleLabelMake20'));
        } else {
            container.setAttribute('aria-label', i18n.t('common.titleLabel'));
        }
        container.setAttribute('tabindex', '0');
        container.focus();
    }

    new Game(config);
}

// Start the game
initializeGame().catch(error => {
    console.error('Failed to initialize game:', error);
});
