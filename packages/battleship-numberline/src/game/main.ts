import { Boot } from './scenes/Boot';
import { Game } from 'phaser';
import { LoadingScene } from './scenes/LoadingScene';
import { Preloader } from './scenes/Preloader';
import { GameScreen } from './scenes/GameScreen';
import { DisplayConfig, GameConfig, GameConfigManager, i18n, Lifecycle } from '@k8-games/sdk';
import { TopicSelectorScene } from './scenes/TopicSelectorScene';
import { ScoreBoardScene } from './scenes/ScoreBoardScene';
import { LevelSelectorScene } from './scenes/LevelSelectorScene';
import { MenuScene } from './scenes/MenuScene';
import { HowToPlayScene } from './scenes/HowToPlayScene';
import { initializeI18n } from './utils/lang';
import { SplashScene } from './scenes/SplashScene';
import { CelebrationScene } from './scenes/CelebrationScene';
import { MapScene } from './scenes/MapScene';
import { CampaignScene } from './scenes/CampaignScene';

const displayConfig = DisplayConfig.getInstance();
const { canvasHeight, canvasWidth, width, height } = displayConfig;
const GAME_CONTAINER_ID = 'game-container';

const gameConfigManager = GameConfigManager.getInstance();

const config = GameConfig.create({
    title: 'Battleship Numberline',
    width,
    height,
    canvasWidth,
    canvasHeight,
    parent: GAME_CONTAINER_ID,
    backgroundColor: '#000',
});

config.scene = [
    Boot,
    LoadingScene,
    Preloader,
    TopicSelectorScene,
    LevelSelectorScene,
    HowToPlayScene,
    GameScreen,
    MenuScene,
    ScoreBoardScene,
    SplashScene,
    CelebrationScene,
    MapScene,
    CampaignScene
];

let isInitialized = false;
let initPromise: Promise<void> | null = null;
let gameInstance: Phaser.Game | null = null;

const initializeGame = async () => {
    if (isInitialized) {
        return; // Already initialized
    }
    
    if (initPromise) {
        return initPromise; // Return existing promise if initialization is in progress
    }
    
    // Start initialization
    initPromise = (async () => {
        await gameConfigManager.loadConfigs();
        initializeI18n();
        
        // Initialize lifecycle management
        const lifecycle = Lifecycle.getInstance();
        lifecycle.initialize(GAME_CONTAINER_ID);
        
        isInitialized = true;
    })();
    
    return initPromise;
};

const StartGame = (parent: string) => {
    // Ensure initialization is complete
    if (!isInitialized) {
        throw new Error('Game not initialized. Call initializeGame() first.');
    }

    // Return existing game instance if it exists
    if (gameInstance) {
        return gameInstance;
    }

    // Set the title of the game
    document.title = i18n.t('common.title');

    const container = document.getElementById(GAME_CONTAINER_ID);
    if (container) {
        container.setAttribute('role', 'application');
        container.setAttribute('aria-label', i18n.t('common.titleLabel'));
        container.setAttribute('tabindex', '0');
        container.focus();
    }

    gameInstance = new Game({ ...config, parent });
    return gameInstance;
};

// Export both the initialization function and the game creation function
export { initializeGame };
export default StartGame;

