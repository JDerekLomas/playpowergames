import { BaseScene, preloadBackgroundImages } from '@k8-games/sdk';
import { LoadingScene } from './LoadingScene';

export class Boot extends BaseScene {
    constructor() {
        super('Boot');
    }

    preload() {
        LoadingScene._preload(this);
        // Preload all background images for CSS use
        const backgroundImages = [
            'assets/images/splash_screen/splashscreen_bg.png',
            'assets/images/common/background.png',
            'assets/images/scoreboard/scoreboard_screen_bg.png',
            'assets/images/common/bg.png',
        ];

        preloadBackgroundImages(backgroundImages).then(() => {
            console.log('All background images preloaded for CSS use');
        });
    }

    create() {
        this.scene.start('LoadingScene');
    }
}