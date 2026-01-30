import { BaseScene, LoadingScene, preloadBackgroundImages } from "@k8-games/sdk";

export class Boot extends BaseScene {

    constructor() {
        super('Boot');
    }

    preload() {
        LoadingScene.preload(this);
        // Preload all background images for CSS use
        const backgroundImages = [
            'assets/images/common/background.png',
        ];

        preloadBackgroundImages(backgroundImages).then(() => {
            console.log('All background images preloaded for CSS use');
        });
    }

    create() {
        this.scene.start('Preloader');
    }
}
