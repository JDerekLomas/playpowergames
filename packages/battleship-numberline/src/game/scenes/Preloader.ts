import { BaseScene } from './BaseScene';
import { PreloadConfig } from '../config/PreloadConfig';
import { CommonConfig } from '../config/CommonConfig';
import { ButtonHelper, i18n, ImageOverlay } from '@k8-games/sdk';

const {
    ASSETS: { KEYS: AssetsKeys },
    A11Y,
} = PreloadConfig;

const {
    ASSETS: {
        KEYS: {
            FONT: fontKeys,
            MUSIC: musicKeys,
            SFX: sfxKeys,
            IMAGE: { BUTTON: ButtonImageKeys, ICON: IconImageKeys },
        },
        PATHS: { MUSIC_BASE, SFX_BASE },
    },
} = CommonConfig;

export class Preloader extends BaseScene {
    constructor() {
        super('Preloader');
        this.audioManager.initialize(this);
    }

    private handlePlayButtonPointerDown() {
        const params = new URLSearchParams(window.location.search);
        const targetScene = params.get('mode') === 'campaign' ? 'CampaignScene' : 'TopicSelectorScene';
        this.time.delayedCall(100, () => this.scene.start(targetScene));
    }

    init() {
        // Background
        this.addImage(this.display.width / 2, this.display.height / 2, AssetsKeys.IMAGE.BACKGROUND).setScale(1.07);

        // Play button

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
            onClick: () => this.handlePlayButtonPointerDown(),
        });

        ButtonHelper.startBreathingAnimation(playButtonContainer, {
            scale: 1.1,
            duration: 1000,
            ease: 'Sine.easeInOut'
        });

        // Logo
        const logo = this.addImage(
            this.display.width / 2,
            this.display.height / 2 - 150,
            AssetsKeys.IMAGE.LOGO,
        ).setOrigin(0.5);

        new ImageOverlay(this, logo, { label: i18n.t('common.title') });
    }

    preload() { }

    static _preload(scene: BaseScene) {
        console.log('Preloading assets...');
        //  Load the assets for the game

        const language = i18n.getLanguage() || 'en';

        scene.load.setPath(PreloadConfig.ASSETS.PATHS.SPLASH_SCREEN_IMAGES);
        scene.load.image(PreloadConfig.ASSETS.KEYS.IMAGE.BACKGROUND, 'bg.png');
        scene.load.image(PreloadConfig.ASSETS.KEYS.IMAGE.LOGO, `bsnl_${language}.png`);

        // Music
        scene.load.setPath(MUSIC_BASE);
        Object.values(musicKeys).forEach((key) => {
            scene.load.audio(key, `${key}.wav`);
        });

        // Sound Effects
        scene.load.setPath(SFX_BASE);
        Object.values(sfxKeys).forEach((key) => {
            scene.load.audio(key, `${key}.wav`);
        });

        // Button Images
        scene.load.setPath(CommonConfig.ASSETS.PATHS.BUTTON_IMAGE_BASE);
        Object.values(ButtonImageKeys).forEach((key) => {
            scene.load.image(key, `${key}.png`);
        });
        Object.values(IconImageKeys).forEach((key) => {
            scene.load.image(key, `${key}.png`);
        });
    }

    create() {
        //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
        //  For example, you can define global animations here, so we can use them in other scenes.
        //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
        // this.scene.start('GameScreen');
    }

    shutdown(): void {
        this.audioManager.stopAllSoundEffects();
    }
}
