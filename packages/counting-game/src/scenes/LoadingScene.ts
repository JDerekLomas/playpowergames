import { BaseScene, LoadingScene as LoadingSceneSdk } from '@k8-games/sdk';
import { SplashScene } from './SplashScene';
import { GameScene } from './GameScene';
import { ScoreboardScene } from './Scoreboard';
import { InstructionsScene } from './Instructions';
import { PauseScene } from './PauseScene';
import { CelebrationScene } from './CelebrationScene';

export class LoadingScene extends BaseScene {
    private loadingScene: LoadingSceneSdk;

    constructor() {
        super('LoadingScene');
        this.loadingScene = LoadingSceneSdk.getInstance();
    }

    init() {
        this.loadingScene.init(this, 'SplashScene');
    }

    preload() {
        SplashScene._preload(this);
        GameScene._preload(this);
        ScoreboardScene._preload(this);
        InstructionsScene._preload(this);
        PauseScene._preload(this);
        CelebrationScene._preload(this);
    }

    static _preload(scene: BaseScene) {
        LoadingSceneSdk.preload(scene);
    }

    create() { }
}
