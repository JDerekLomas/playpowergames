import { BaseScene, LoadingScene } from "@k8-games/sdk";

export class Boot extends BaseScene {

    constructor() {
        super('Boot');
    }

    preload() {
        LoadingScene.preload(this);
    }

    create() {
        this.scene.start('Preloader');
    }
}
