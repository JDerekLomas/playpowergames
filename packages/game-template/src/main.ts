import { Game } from 'phaser';
import { GameConfig, DisplayConfig } from '@k8-games/sdk';
import { Boot } from './scenes/Boot';
import { Preloader } from './scenes/Preloader';
import { MainMenu } from './scenes/MainMenu';
import { Game as MainGame } from './scenes/Game';
import { GameOver } from './scenes/GameOver';

const displayConfig = DisplayConfig.getInstance();
const { canvasWidth, canvasHeight, width, height } = displayConfig;

const config = GameConfig.create({
    title: 'K8 Games Template',
    width,
    height,
    canvasWidth,
    canvasHeight,
    parent: 'game-container',
    backgroundColor: '#028af8'
});

config.scene = [Boot, Preloader, MainMenu, MainGame, GameOver];

new Game(config);
