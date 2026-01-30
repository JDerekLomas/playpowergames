import { BaseScene, preloadBackgroundImages } from "@k8-games/sdk";
import { LoadingScene } from "./LoadingScene";

export class Boot extends BaseScene {
    constructor() {
        super("Boot");
    }

    preload() {
        //  The Boot Scene is typically used to load in any assets you require for your Preloader, such as a game logo or background.
        //  The smaller the file size of the assets, the better, as the Boot Scene itself has no preloader.
        LoadingScene._preload(this);
        const backgroundImages = [
            'assets/images/common/background.png',
            'assets/images/celebration_background.png',
            'assets/images/game-light-background.png',
            'assets/images/game-scene-background.png',
            'assets/images/start-background.png',
            'assets/images/scoreboard_bg.png',
        ];

        preloadBackgroundImages(backgroundImages).then(() => {
            console.log('All background images preloaded for CSS use');
        });
    }

    create() {
        this.scene.start("LoadingScene");
    }
}
