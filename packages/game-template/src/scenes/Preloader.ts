import { BaseScene, LoadingScene } from "@k8-games/sdk";
export class Preloader extends BaseScene {

    private loadingScene: LoadingScene;

    constructor() {
        super('Preloader');
        this.loadingScene = LoadingScene.getInstance();
    }

    init() {
        this.loadingScene.init(this, 'MainMenu');
    }

    preload() {
    }

    create() {
    }
}
