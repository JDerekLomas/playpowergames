import { BaseScene, LoadingScene, setSceneBackground } from "@k8-games/sdk";
import { SplashScreen } from "./SplashScreen";
import { InfoScene } from "./InfoScene";
import { GameScene } from "./Game";
import { ScoreboardScene } from "./Scoreboard";

export class Preloader extends BaseScene {

    private loadingScene!: LoadingScene;

    constructor() {
        super('Preloader');
        this.loadingScene = LoadingScene.getInstance();
    }

    init() {
        setSceneBackground('assets/images/common/background.png');
        this.loadingScene.init(this, 'SplashScreen')
    }

    preload() {
        SplashScreen._preload(this);
        InfoScene._preload(this);
        GameScene._preload(this);
        ScoreboardScene._preload(this);
    }

    create() {
    }
}
