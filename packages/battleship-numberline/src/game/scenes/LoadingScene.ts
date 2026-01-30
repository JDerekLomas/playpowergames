import { BaseScene } from './BaseScene';
import { GameScreen } from './GameScreen';
import { LevelSelectorScene } from './LevelSelectorScene';
import { Preloader } from './Preloader';
import { ScoreBoardScene } from './ScoreBoardScene';
import { TopicSelectorScene } from './TopicSelectorScene';
import { extractGameParams, GameParams } from '../utils/UrlParamsUtils';
import { ThemeManager } from '../managers/ThemeManager';
import { ConfigMap, GameConfigManager, LoadingScene as LoadingSceneSdk, setSceneBackground } from '@k8-games/sdk';
import { HowToPlayScene } from './HowToPlayScene';
import { SplashScene } from './SplashScene';
import { CelebrationScene } from './CelebrationScene';
import { MapScene } from './MapScene';
import { CampaignScene } from './CampaignScene';
import { topics } from '../../resources/topics.json';

export class LoadingScene extends BaseScene {
    private loadingScene: LoadingSceneSdk;
    private gameParams: GameParams | null;

    constructor() {
        super('LoadingScene');
        this.loadingScene = LoadingSceneSdk.getInstance();
        const gameConfigManager = GameConfigManager.getInstance();
        const searchParams = gameConfigManager.getAll();
        this.redirectLevels(searchParams);
        this.gameParams = extractGameParams(searchParams);
        window.sessionStorage.setItem('isQueryParamsUsed', 'false');
        const theme = searchParams.theme?.toUpperCase();
        ThemeManager.getInstance().setTheme(theme);

        if (this.gameParams) {
            window.sessionStorage.setItem('isQueryParamsUsed', 'true');
        }
    }

    init() {
        setSceneBackground('assets/images/common/background.png');
        if (this.gameParams && this.gameParams.topic) {
            this.loadingScene.init(this, 'SplashScene', this.gameParams);
            return;
        }
        this.loadingScene.init(this, 'Preloader');
    }

    preload() {
        Preloader._preload(this);
        TopicSelectorScene._preload(this);
        LevelSelectorScene._preload(this);
        GameScreen._preload(this);
        ScoreBoardScene._preload(this);
        HowToPlayScene._preload(this);
        SplashScene._preload(this);
        CelebrationScene._preload(this);
        CampaignScene._preload(this);

         // load map assets only for topics with map levels

        if (this.gameParams?.topic && this.hasMapLevels(this.gameParams.topic)) {

            MapScene._preload(this)            

        }
    }

    static _preload(scene: BaseScene) {
        LoadingSceneSdk.preload(scene);
    }

    private hasMapLevels(topic: string): boolean {
        const topicData = topics.find((t) => t.name === topic);
        return !!(topicData?.levels && topicData.levels.length > 0);
    }

    create() { }

    private redirectLevels(searchParams: ConfigMap) {
        const level = searchParams.level;
        const topic = searchParams.topic;

        const topicMapping = [
            {
                level: 9,
                topic: 'mixed',
                questionBankTopic: 'addition_facts_within_20',
            },
            {
                level: 10,
                topic: 'mixed',
                questionBankTopic: 'subtraction_facts_within_20',
            },
            {
                level: 16,
                topic: 'mixed',
                questionBankTopic: 'multiplication_facts',
            },
            {
                level: 10,
                topic: 'fractions',
                questionBankTopic: 'equivalent_fractions',
            },
            {
                level: 11,
                topic: 'fractions',
                questionBankTopic: 'add_and_subtract_fractions',
            },
            {
                level: 36,
                topic: 'mixed',
                questionBankTopic: 'equations_and_inequalities',
            }
        ];

        if (level && topic) {
            delete searchParams.level;
            delete searchParams.topic;
            const redirectTopic = topicMapping.find((t) => t.level === Number(level) && t.topic === topic)?.questionBankTopic || topic;
            if (redirectTopic) {
                searchParams.topic = redirectTopic;
            }
        }
    }
}
