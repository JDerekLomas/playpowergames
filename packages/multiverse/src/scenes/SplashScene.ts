import { AnalyticsHelper, BaseScene, ButtonHelper, GameConfigManager, i18n, setSceneBackground } from '@k8-games/sdk';
import { ASSETS_PATHS, BUTTONS } from '../config/common';

export class SplashScene extends BaseScene {
    constructor() {
        super('SplashScene');
    }

    private startButton?: Phaser.GameObjects.Container;
    private splashscreenCircle?: Phaser.GameObjects.Image;

    init() {
        setSceneBackground('assets/images/splash_screen/splashscreen_bg.png');
        this.addImage(this.display.width / 2, this.display.height / 2, 'splashscreen_bg').setOrigin(0.5);

        this.createActionUI();
        this.audioManager.initialize(this);
    }

    private createActionUI(): void {
        const lang = i18n.getLanguage() || 'en';
        const titleX = lang === 'en' ? 333 : 267;
        const titleY = lang === 'en' ? 250 : 280;
        this.addImage(titleX, titleY, 'splashscreen_title').setOrigin(0).setDepth(4);
        this.startButton = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY,
            },
            text: i18n.t('common.start'),
            label: i18n.t('common.start'),
            textStyle: {
                font: '700 32px Exo',
                color: '#ffffff',
            },
            imageScale: 0.8,
            raisedOffset: 3.5,
            x: this.display.width / 2,
            y: this.display.height - 130,
            onClick: () => {
                this.startButton?.destroy();
                this.scene.start('CutScene');
            },
        }).setDepth(4);

        ButtonHelper.startBreathingAnimation(this.startButton, {
            scale: 1.1,
            duration: 1000,
            ease: 'Sine.easeInOut',
        });
    }

    static _preload(scene: BaseScene) {
        const lang = i18n.getLanguage();
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/splash_screen`);
        scene.load.image('splashscreen_bg', 'splashscreen_bg.png');
        scene.load.image('door_open', 'door_open.png');
        scene.load.image('door_closed', 'door_closed.png');
        scene.load.image('splashscreen_title', `splashscreen_title_${lang}.png`);

        scene.load.setPath('assets/images/common');
        scene.load.image('resume_icon', 'resume_icon.png');

        scene.load.setPath(`${BUTTONS.PATH}/blue`);
        scene.load.image(BUTTONS.BUTTON.KEY, BUTTONS.BUTTON.PATH);
        scene.load.image(BUTTONS.BUTTON_HOVER.KEY, BUTTONS.BUTTON_HOVER.PATH);
        scene.load.image(BUTTONS.BUTTON_PRESSED.KEY, BUTTONS.BUTTON_PRESSED.PATH);
    }

    create() {
        if (this.splashscreenCircle) {
            this.tweens.add({
                targets: this.splashscreenCircle,
                angle: 360,
                duration: 120000, // 120,000 ms (2 minutes) for a very slow rotation
                repeat: -1,
                ease: 'Linear',
            });
        }

        const gameConfigManager = GameConfigManager.getInstance();
        const topic = gameConfigManager.get('topic') || 'grade3_topic2';

        AnalyticsHelper.createInstance('multiverse', topic, { isMultiverse: true });
    }
}
