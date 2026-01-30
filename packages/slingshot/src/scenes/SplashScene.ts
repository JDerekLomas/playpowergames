import { AnalyticsHelper, BaseScene, ButtonHelper, GameConfigManager, i18n, ImageOverlay, setSceneBackground } from "@k8-games/sdk";
import { ASSETS_PATHS, BUTTONS } from "../config/common";

export class SplashScene extends BaseScene {
    constructor() {
        super('SplashScene')
    }

    static _preload(scene: BaseScene) {
        const language = i18n.getLanguage() || "en";
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/splash_screen`);
        scene.load.image('splashscreen_bg', 'splashscreen_bg.png');
        scene.load.image('splashscreen_gametitle', `splashscreen_gametitle_${language}.png`);

        scene.load.setPath(`${BUTTONS.PURPLE_PATH}`);
        scene.load.image(BUTTONS.BUTTON.KEY, BUTTONS.BUTTON.PATH);
        scene.load.image(BUTTONS.BUTTON_HOVER.KEY, BUTTONS.BUTTON_HOVER.PATH);
        scene.load.image(BUTTONS.BUTTON_PRESSED.KEY, BUTTONS.BUTTON_PRESSED.PATH);
    }

    init() {
        this.audioManager.initialize(this);
        setSceneBackground('assets/images/splash_screen/splashscreen_bg.png');
        this.addImage(this.display.width / 2, this.display.height / 2, 'splashscreen_bg')
            .setDepth(1)
            .setOrigin(0.5);
        const logo = this.addImage(this.display.width / 2, 230, 'splashscreen_gametitle')
            .setOrigin(0.5)
            .setDepth(2)
        new ImageOverlay(this, logo, { label: i18n.t('common.title') })

        const playButton = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY
            },
            text: i18n.t('common.play'),
            label: i18n.t('common.play'),
            textStyle: {
                font: "700 32px Exo",
                color: '#ffffff',
            },
            imageScale: 0.8,
            raisedOffset: 3.5,
            x: this.display.width / 2,
            y: this.display.height - 120,
            onClick: () => {
                this.scene.start('InstructionsScene');
            }
        }).setDepth(3);

        ButtonHelper.startBreathingAnimation(playButton, {
            scale: 1.1,
            duration: 1000,
            ease: 'Sine.easeInOut'
        });
    }

    create() {
        const gameConfigManager = GameConfigManager.getInstance();
        const topic = gameConfigManager.get('topic') || 'grade2_topic1';

        AnalyticsHelper.createInstance('multiverse', topic, { isMultiverse: true });
    }
}