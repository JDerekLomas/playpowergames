import { BaseScene, LoadingScene as LoadingSceneSdk, ScoreboardHelper } from '@k8-games/sdk';
import { SplashScene } from './SplashScene';
import { GameScene } from './GameScene';
import { ScoreboardScene } from './Scoreboard';
import { PauseScene } from './PauseScene';
import { CelebrationScene } from './CelebrationScene';
import { InstructionsScene } from './Instructions';

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
        ScoreboardScene._preload(this);
        PauseScene._preload(this);
        InstructionsScene._preload(this);
        CelebrationScene._preload(this);
    }

    static _preload(scene: BaseScene) {
        LoadingSceneSdk.preload(scene);
    }

    create() { }
}
