import { AnalyticsHelper, BaseScene, ButtonHelper, GameConfigManager, i18n, ImageOverlay, setSceneBackground } from "@k8-games/sdk";
import { ASSETS_PATHS, BUTTONS } from "../config/common";

export class SplashScene extends BaseScene {
    constructor() {
        super('SplashScene')
    }

    init() {
        setSceneBackground('assets/images/splash_screen/splashscreen_bg.png');
        this.addImage(this.display.width / 2, this.display.height / 2, 'splashscreen_bg')
            .setOrigin(0.5);
        
        const logo = this.addImage(this.display.width / 2, 24, 'splashscreen_gametitle')
            .setOrigin(0.5, 0);
        new ImageOverlay(this, logo, { label: i18n.t('common.title') })

        const bunny = this.addImage(39, 140, 'splashscreen_bunny')
            .setOrigin(0);

        this.tweens.add({
            targets: bunny,
            y: "+=" + this.getScaledValue(25),
            duration: 2000,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });

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
            y: 639,
            onClick: () => {
                this.scene.start('InstructionsScene', { parentScene: 'SplashScene' });
            }
        });

        ButtonHelper.startBreathingAnimation(playButton, {
            scale: 1.1,
            duration: 1000,
            ease: 'Sine.easeInOut'
        });

        this.audioManager.initialize(this);
    }

    preload() { }

    static _preload(scene: BaseScene) {
        const language = i18n.getLanguage() || "en";
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/splash_screen`);
        scene.load.image('splashscreen_bg', 'splashscreen_bg.png');
        scene.load.image('splashscreen_gametitle', `splashscreen_gametitle_${language}.png`);
        scene.load.image('splashscreen_bunny', 'bunny.png');

        scene.load.setPath(`${BUTTONS.PATH}`);
        scene.load.image(BUTTONS.BUTTON.KEY, BUTTONS.BUTTON.PATH);
        scene.load.image(BUTTONS.BUTTON_HOVER.KEY, BUTTONS.BUTTON_HOVER.PATH);
        scene.load.image(BUTTONS.BUTTON_PRESSED.KEY, BUTTONS.BUTTON_PRESSED.PATH);
    }

    create() {
        const gameConfigManager = GameConfigManager.getInstance();
        const topic = gameConfigManager.get('topic') || 'gradeK_topic5';

        AnalyticsHelper.createInstance('bunny_jumping', topic);
    }
}