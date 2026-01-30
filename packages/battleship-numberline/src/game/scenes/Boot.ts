import { preloadBackgroundImages } from '@k8-games/sdk';
import { BaseScene } from './BaseScene';
import { LoadingScene } from './LoadingScene';

export class Boot extends BaseScene {
    constructor() {
        super('Boot');
    }

    init() { }

    preload() {
        //  The Boot Scene is typically used to load in any assets you require for your Preloader, such as a game logo or background.
        //  The smaller the file size of the assets, the better, as the Boot Scene itself has no preloader.
        LoadingScene._preload(this);
        // Preload all background images for CSS use
        const backgroundImages = [
            'assets/images/background/bg_01.png',
            'assets/images/background/bg_02.png',
            'assets/images/splash_screen/bg.png',
            'assets/images/how_to_play/background.png',
            'assets/images/score_board/bg.png',
            'assets/images/topic_selector/bg.png',
            'assets/images/level_selector/bg.png',
            'assets/images/common/background.png',
            'assets/images/celebration_screen/background.png'
        ];

        preloadBackgroundImages(backgroundImages).then(() => {
            console.log('All background images preloaded for CSS use');
        });
    }

    create() {
        this.sound.mute = !this.gameState.isSoundEnabled();
        this.scene.start('LoadingScene');
    }
}

