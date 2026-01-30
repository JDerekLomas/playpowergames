import { BaseScene } from '@k8-games/sdk';
import { LoadingScene } from './LoadingScene';

export class Boot extends BaseScene {
    constructor() {
        super('Boot');
    }

    preload() {
        LoadingScene._preload(this);
    }

    create() {
        this.scene.start('LoadingScene');
    }
}


