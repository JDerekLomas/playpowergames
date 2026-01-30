import { BaseScene, LoadingScene as LoadingSceneSdk } from '@k8-games/sdk';
import { SplashScene } from './SplashScene';
import { ScoreboardScene } from './Scoreboard';
import { InstructionsScene } from './Instructions';
import { GameScene } from './GameScene';
import { CelebrationScene } from './CelebrationScene';
import { MenuScene } from './MenuScene';
import { DoorUtils } from '../utils/DoorUtils';

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
        ScoreboardScene._preload(this);
        InstructionsScene._preload(this);
        GameScene._preload(this);
        CelebrationScene._preload(this);
        MenuScene._preload(this);
        DoorUtils._preload(this);
    }

    static _preload(scene: BaseScene) {
        LoadingSceneSdk.preload(scene);
    }

    create() { }
}
