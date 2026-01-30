import { BaseScene, LoadingScene as LoadingSceneSdk } from '@k8-games/sdk';
import { SplashScene } from './SplashScene';
import { Shooter } from './Shooter';
import { ScoreboardScene } from './Scoreboard';
import { InstructionsScene } from './Instructions';
import { PauseScene } from './PauseScene';
import { CutScene } from './CutScene';

export class LoadingScene extends BaseScene {
    private loadingScene: LoadingSceneSdk;

    constructor() {
        super('LoadingScene');
        this.loadingScene = LoadingSceneSdk.getInstance();
    }

    init() {
        this.loadingScene.init(this, 'CutScene');
    }

    preload() {
        SplashScene._preload(this);
        Shooter._preload(this);
        ScoreboardScene._preload(this);
        InstructionsScene._preload(this);
        PauseScene._preload(this);
        CutScene._preload(this);
    }

    static _preload(scene: BaseScene) {
        LoadingSceneSdk.preload(scene);
    }

    create() { }
}
