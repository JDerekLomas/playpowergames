import { AnalyticsHelper, BaseScene, ButtonHelper, GameConfigManager, i18n, ImageOverlay, setSceneBackground } from '@k8-games/sdk';
import { ASSETS_PATHS, BUTTONS, COMMON_ASSETS } from '../config/common';

export class SplashScreen extends BaseScene {
    constructor() {
        super('SplashScreen');
    }

    static _preload(scene: BaseScene) {
        const language = i18n.getLanguage() || 'en';

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/splash_screen`);
        scene.load.image('splash_screen_bg', 'splash_screen_bg.png');
        scene.load.image('game_title', `game_title_${language}.png`);

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}${COMMON_ASSETS.PATH}`);
        scene.load.image(COMMON_ASSETS.QUARTER.KEY, COMMON_ASSETS.QUARTER.PATH);

        scene.load.setPath(`${BUTTONS.PATH}`);
        scene.load.image(BUTTONS.BUTTON.KEY, BUTTONS.BUTTON.PATH);
        scene.load.image(BUTTONS.BUTTON_HOVER.KEY, BUTTONS.BUTTON_HOVER.PATH);
        scene.load.image(BUTTONS.BUTTON_PRESSED.KEY, BUTTONS.BUTTON_PRESSED.PATH);
        scene.load.image(BUTTONS.BUTTON_DISABLED.KEY, BUTTONS.BUTTON_DISABLED.PATH);

        // scene.load.setPath(`${ASSETS_PATHS.ATLAS}/coin_shine`);
        // scene.load.atlas('coin_shine', 'spritesheet.png', 'spritesheet.json');
    }

    init() {
        // if (!this.anims.exists('coin_shine_animation')) {
        //     this.anims.create({
        //         key: 'coin_shine_animation',
        //         frames: 'coin_shine',
        //         frameRate: 16,
        //         repeat: 0,
        //         hideOnComplete: false
        //     });
        // }
    }

    create() {
        const gameConfigManager = GameConfigManager.getInstance();
        const topic = gameConfigManager.get('topic') || 'coin_couting';

        AnalyticsHelper.createInstance('mini_banker', topic);

        setSceneBackground('assets/images/splash_screen/splash_screen_bg.png');
        this.addImage(this.display.width / 2, this.display.height / 2, 'splash_screen_bg').setOrigin(0.5);
        const title = this.addImage(this.display.width / 3, this.display.height / 3, 'game_title').setOrigin(0.5);
        new ImageOverlay(this, title, { label: i18n.t('common.title') });

        // TODO: change this coin animation to a better one
        
        // const coin1 = this.add.container(this.getScaledValue(this.display.width / 3 + 190), this.getScaledValue(this.display.height / 3 - 60));
        // coin1.add(this.addImage(0, 0, COMMON_ASSETS.QUARTER.KEY).setOrigin(0.5).setScale(0.5));
        // const coinShine = this.addSprite(0, -5, 'coin_shine').setOrigin(0.5).setScale(0.45).setAlpha(0.5);
        // coin1.add(coinShine);

        // const coin2 = this.add.container(this.getScaledValue(this.display.width / 3 - 195), this.getScaledValue(this.display.height / 3 - 60));
        // coin2.add(this.addImage(0, 0, COMMON_ASSETS.QUARTER.KEY).setOrigin(0.5).setScale(0.5));
        // const coinShine2 = this.addSprite(0, -5, 'coin_shine').setOrigin(0.5).setScale(0.45).setAlpha(0.5);
        // coin2.add(coinShine2);

        // coinShine.play('coin_shine_animation');
        // coinShine2.play('coin_shine_animation');

        // // Add animation complete event listeners
        // coinShine.on('animationcomplete', () => {
        //     setTimeout(() => {
        //         coinShine?.play('coin_shine_animation');
        //     }, 2000);
        // });

        // coinShine2.on('animationcomplete', () => {
        //     setTimeout(() => {
        //         coinShine2?.play('coin_shine_animation');
        //     }, 2000);
        // });

        const playButton = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY
            },
            text: i18n.t('common.start'),
            label: i18n.t('common.start'),
            textStyle: {
                font: "700 32px Exo",
                color: '#ffffff',
            },
            imageScale: 0.8,
            x: this.display.width / 2,
            y: this.display.height - 128.5,
            onClick: () => {
                this.scene.start('InfoScene');
            }
        });

        ButtonHelper.startBreathingAnimation(playButton, {
            scale: 1.05,
            duration: 1000,
            ease: 'Sine.easeInOut'
        });
    }
}