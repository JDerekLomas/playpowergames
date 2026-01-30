import { BaseScene, GameConfigManager, LoadingScene as LoadingSceneSdk } from "@k8-games/sdk";
import { SplashScene } from "./SplashScene";
import { GameScene } from "./GameScene";
import { ScoreboardScene } from "./Scoreboard";
// import { InstructionsScene } from "./Instructions";
import { NumpadTutorial } from "./NumpadTutorial";
import { DistributeItemsTutorial } from "./DistributeItemsTutorial";
import { CountItemsTutorial } from "./CountItemsTutorial";
import { PauseScene } from "./PauseScene";
import { CelebrationScene } from "./CelebrationScene";
import { SliceItemsTutorial } from "./SliceItemsTutorial";
import { ComposeDecomposeTutorial } from "./ComposeDecomposeTutorial";

export class LoadingScene extends BaseScene {
    private loadingScene: LoadingSceneSdk;

    constructor() {
        super("LoadingScene");
        this.loadingScene = LoadingSceneSdk.getInstance();
    }

    init() {
        this.loadingScene.init(this, "SplashScene");
    }

    preload() {
        SplashScene._preload(this);
        GameScene._preload(this);
        ScoreboardScene._preload(this);
        // InstructionsScene._preload(this);
        CelebrationScene._preload(this);
        PauseScene._preload(this);

        const gameConfigManager = GameConfigManager.getInstance();
        const topic = gameConfigManager.get('topic') || 'G3_T1_understand_division';
        const countingTopics = ['GK_T1_count_numbers_upto_5', 'GK_T2_count_numbers_upto_10'];

        if (topic === 'G3_T1_understand_division') {
            NumpadTutorial._preload(this);
            DistributeItemsTutorial._preload(this);
        } else if (countingTopics.includes(topic)) {
            CountItemsTutorial._preload(this);
        } else if (topic === 'g1_t11_equal_shares_and_time') {
            SliceItemsTutorial._preload(this);
        } else if (topic === 'gk_t11_compose_and_decompose_numbers_11_to_19') {
            ComposeDecomposeTutorial._preload(this);
        } else {
            NumpadTutorial._preload(this);
            DistributeItemsTutorial._preload(this);
        }
    }

    static _preload(scene: BaseScene) {
        LoadingSceneSdk.preload(scene);
    }

    create() {}
}
