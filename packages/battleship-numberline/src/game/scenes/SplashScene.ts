import { AnalyticsHelper, ButtonHelper, GameConfigManager, i18n, ImageOverlay, setSceneBackground } from "@k8-games/sdk";
import { SplashSceneConfig as Config } from "../config/SplashSceneConfig";
import { BaseScene } from "./BaseScene";
import { CommonConfig } from "../config/CommonConfig";
import { GameParams } from "../utils/UrlParamsUtils";
import { islandState } from "../managers/IslandStateManager";
import { topics } from "../../resources/topics.json";

export class SplashScene extends BaseScene {
    private gameParams: GameParams

    constructor() {
        super('SplashScene');
    }

    init(gameParams: GameParams): void {
        this.gameParams = gameParams;

        if (!this.anims.exists('logo_shine_animation')) {
            this.anims.create({
                key: 'logo_shine_animation',
                frames: 'logo_shine',
                frameRate: 20,
                repeat: -1,
                repeatDelay: 1500,
                hideOnComplete: false
            });
        }

        // Background
        setSceneBackground('assets/images/splash_screen/bg.png');
        this.addImage(this.display.width / 2, this.display.height / 2, Config.ASSETS.KEYS.IMAGE.BACKGROUND).setOrigin(0.5);

        // Logo
        const logo = this.addImage(
            this.display.width / 2,
            this.display.height / 2 - 150,
            Config.ASSETS.KEYS.IMAGE.LOGO,
        ).setScale(0.95);

        new ImageOverlay(this, logo, { label: i18n.t('common.title') });

        const logoShine = this.addSprite(
            this.display.width / 2,
            this.display.height / 2 - 157,
            'logo_shine'
        ).setScale(0.95)
            .setAlpha(0.5);

        logoShine.play('logo_shine_animation');

        // Play Button
        const playButtonContainer = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: CommonConfig.ASSETS.KEYS.IMAGE.BUTTON.DEFAULT,
                hover: CommonConfig.ASSETS.KEYS.IMAGE.BUTTON.HOVER,
                pressed: CommonConfig.ASSETS.KEYS.IMAGE.BUTTON.PRESSED,
            },
            text: i18n.t('common.play'),
            label: i18n.t('common.play'),
            textStyle: {
                fontSize: '36px',
                fontFamily: CommonConfig.ASSETS.KEYS.FONT.EXO,
                fontStyle: 'bold',
                color: '#ffffff',
            },
            imageScale: 0.8,
            raisedOffset: 3.5,
            x: this.display.width / 2,
            y: this.display.height - 98.5,
            onClick: () => {
                islandState.clearCompletedLevels(this.gameParams.topic);
                const levelsData = topics.find((t) => t.name === this.gameParams.topic)?.levels ?? [];
                const totalLevels = levelsData.length;
                
                if (totalLevels === 0) {
                    this.scene.start("HowToPlayScene", {
                        useQuestionBank: true,
                        topic: this.gameParams.topic,
                        mapLevel: 0,
                        parentScene: "SplashScene",
                    });
                } else {
                    this.scene.start("MapScene", {
                        topic: this.gameParams.topic,
                        completedLevels: [],
                        parentScene: "SplashScene",
                    });
                }
            },
        })

        ButtonHelper.startBreathingAnimation(playButtonContainer, {
            scale: 1.1,
            duration: 1000,
            ease: 'Sine.easeInOut'
        });
    }

    create() {
        const gameConfigManager = GameConfigManager.getInstance();
        const topic = gameConfigManager.get('topic') || 'battleship_numberline';

        AnalyticsHelper.createInstance('robo_pirates', topic);
    }

    static _preload(scene: BaseScene) {
        scene.load.setPath(Config.ASSETS.PATHS.SPLASH_SCREEN_IMAGES);
        scene.load.image(Config.ASSETS.KEYS.IMAGE.BACKGROUND, 'bg.png');
        scene.load.image(Config.ASSETS.KEYS.IMAGE.LOGO, 'bsnl-logo.png');

        scene.load.setPath('assets/atlases/logo_shine');
        scene.load.atlas('logo_shine', 'spritesheet.png', 'spritesheet.json');
    }
}
