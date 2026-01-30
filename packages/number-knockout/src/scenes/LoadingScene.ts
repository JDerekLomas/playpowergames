import { BaseScene, LoadingScene as LoadingSceneSdk, setSceneBackground } from '@k8-games/sdk';
import { SplashScene } from './SplashScene';
import { InfoScene } from './Info';
import { GameScene } from './Game';
import { ScoreBoardScene } from './ScoreBoard';

export class LoadingScene extends BaseScene {
    private loadingScene: LoadingSceneSdk;

    constructor() {
        super('LoadingScene');
        this.loadingScene = LoadingSceneSdk.getInstance();
    }

    init() {
        setSceneBackground('assets/images/common/background.png');
        this.loadingScene.init(this, 'SplashScene');
    }

    preload() {
        SplashScene._preload(this);
        InfoScene._preload(this);
        GameScene._preload(this);
        ScoreBoardScene._preload(this);
    }

    static _preload(scene: BaseScene) {
        LoadingSceneSdk.preload(scene);
    }

    create() { }
}
