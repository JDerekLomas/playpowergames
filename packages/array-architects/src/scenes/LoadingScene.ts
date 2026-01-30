import { BaseScene, LoadingScene as LoadingSceneSdk, ScoreboardHelper } from '@k8-games/sdk';
import { SplashScene } from './SplashScene';
import { GameScene } from './GameScene';
import { ScoreboardScene } from './Scoreboard';
import { InstructionsScene } from './Instructions';
import { PauseScene } from './PauseScene';

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
        // Preload button click audio
        this.load.setPath('assets/components/button/audios');
        this.load.audio('button_click', 'button_click.mp3');

        ScoreboardHelper._preload(this);
        SplashScene._preload(this);
        GameScene._preload(this);
        InstructionsScene._preload(this);
        ScoreboardScene._preload(this);
        PauseScene._preload(this);
    }

    static _preload(scene: BaseScene) {
        LoadingSceneSdk.preload(scene);
    }

    create() { }
}
