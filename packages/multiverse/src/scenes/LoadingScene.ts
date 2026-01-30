import { BaseScene, LoadingScene as LoadingSceneSdk } from '@k8-games/sdk';
import { SplashScene } from './SplashScene';
import { ScoreboardScene } from './Scoreboard';
import { PauseScene } from './PauseScene';
import { GameScene } from './GameScene';
import { MenuScene } from './MenuScene';
import { CutScene } from './CutScene';
import { EndScene } from './EndScene';
import { SelectScene } from './SelectScene';

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
        SplashScene._preload?.(this);
        ScoreboardScene._preload?.(this);
        PauseScene._preload?.(this);
        GameScene._preload?.(this);
        MenuScene._preload?.(this);
        CutScene._preload?.(this);
        EndScene._preload?.(this);
        SelectScene._preload?.(this);
    }

    static _preload(scene: BaseScene) {
        LoadingSceneSdk.preload(scene);
    }

    create() {}
}
