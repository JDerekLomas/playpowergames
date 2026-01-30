import { StartSceneConfig as Config } from "../config/StartSceneConfig";
import { AssetsConfig } from "../config/AssetsConfig";
import { AnalyticsHelper, BaseScene, ButtonHelper, GameConfigManager, i18n, ImageOverlay, setSceneBackground } from "@k8-games/sdk";
import { MULTIVERSE_TOPICS } from "../config/CommonConfig";

export class StartScene extends BaseScene {
    // private logo: Phaser.GameObjects.Sprite;
    private logo: Phaser.GameObjects.Image;
    private playButton: Phaser.GameObjects.Image;
    private playText: Phaser.GameObjects.Text;

    constructor() {
        super("StartScene");
        this.audioManager.initialize(this);
    }

    create() {
        setSceneBackground('assets/images/start-background.png');
        this.addImage(
            Config.START_BACKGROUND.POSITION.X,
            Config.START_BACKGROUND.POSITION.Y,
            AssetsConfig.KEYS.IMAGES.START_BACKGROUND
        ).setOrigin(0.5);

        this.logo = this.addImage(
            Config.LOGO.POSITION.X,
            Config.LOGO.POSITION.Y,
            AssetsConfig.KEYS.IMAGES.MAKE_TEN_LOGO
        );

        const gameConfigManager = GameConfigManager.getInstance();
        const topic = gameConfigManager.get('topic') || 'make_ten';
        const mode = gameConfigManager.get('mode') || 'make_ten';
        if (mode === 'make_20') {
            new ImageOverlay(this, this.logo, { label: i18n.t('common.titleMake20') });
        } else {
            new ImageOverlay(this, this.logo, { label: i18n.t('common.title') });
        }

        if (MULTIVERSE_TOPICS.includes(topic)) {
            AnalyticsHelper.createInstance('multiverse', topic, { isMultiverse: true });
        } else {
            AnalyticsHelper.createInstance('make_10', topic);
        }

        // TODO: Use sprite when the animation is ready

        // Add game logo
        // this.logo = this.addSprite(
        //     Config.LOGO.POSITION.X,
        //     Config.LOGO.POSITION.Y,
        //     AssetsConfig.KEYS.SPRITES.MAKING_TEN_LOGO
        // ).setOrigin(0.5);

        // new ImageOverlay(this, this.logo, {
        //     label: "Making Ten Game Logo",
        // });

        // createMakingTenLogoAnimation(this);

        // this.logo.play(AssetsConfig.KEYS.ANIMATIONS.MAKING_TEN_LOGO_ANIMATION);

        this.createStarsAnimation();

        // Add play button

        const playButtonContainer = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: AssetsConfig.KEYS.BUTTONS.DEFAULT,
                hover: AssetsConfig.KEYS.BUTTONS.HOVER,
                pressed: AssetsConfig.KEYS.BUTTONS.PRESSED,
            },
            text: i18n.t("common.play"),
            label: i18n.t("common.play"),
            textStyle: {
                font: Config.PLAY_BUTTON.TEXT.STYLE.FONT,
                color: Config.PLAY_BUTTON.TEXT.STYLE.COLOR,
            },
            x: Config.PLAY_BUTTON.POSITION.X,
            y: Config.PLAY_BUTTON.POSITION.Y,
            imageScale: 0.8,
            onClick: () => {
                this.startGame();
            },
            raisedOffset: 3.5,
        });

        ButtonHelper.startBreathingAnimation(playButtonContainer, {
            scale: 1.1,
            duration: 1000,
            ease: 'Sine.easeInOut'
        });

        this.playButton = playButtonContainer.getAt(0) as Phaser.GameObjects.Image;
        this.playText = playButtonContainer.getAt(1) as Phaser.GameObjects.Text;

        this.time.delayedCall(800, () => {
            this.tweens.add({
                targets: this.playButton,
                alpha: Config.PLAY_BUTTON_TWEEN.ALPHA,
                duration: Config.PLAY_BUTTON_TWEEN.DURATION,
                ease: Config.PLAY_BUTTON_TWEEN.EASE,
            });

            this.tweens.add({
                targets: this.playText,
                alpha: Config.PLAY_TEXT_TWEEN.ALPHA,
                duration: Config.PLAY_TEXT_TWEEN.DURATION,
                ease: Config.PLAY_TEXT_TWEEN.EASE,
            });
        });
    }

    private createStarsAnimation() {
        const stars = [
            { x: 330, y: 105 },
            { x: 250, y: 335 },
            { x: 1030, y: 80 },
            { x: 820, y: 480 },
        ];

        for (const star of stars) {
            const scaleDiff = Math.random() * 0.3 + 0.3;
            const delay = Math.random() * 100;
            const duration = Math.random() * 100 + 600;
            const starImg = this.addImage(star.x, star.y, "splash_scene_star").setOrigin(0.5).setScale(scaleDiff);
            this.tweens.add({
                targets: starImg,
                scale: 1 + scaleDiff,
                duration: duration,
                delay: delay,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1,
            })
        }
    }

    private startGame() {
        const overlay = this.addRectangle(
            Config.OVERLAY.POSITION.X,
            Config.OVERLAY.POSITION.Y,
            Config.OVERLAY.SIZE.WIDTH,
            Config.OVERLAY.SIZE.HEIGHT,
            Config.OVERLAY.COLOR
        )
            .setOrigin(Config.OVERLAY.ORIGIN.X, Config.OVERLAY.ORIGIN.Y)
            .setAlpha(Config.OVERLAY.ALPHA);

        this.tweens.add({
            targets: overlay,
            alpha: Config.OVERLAY_TWEEN.ALPHA,
            duration: Config.OVERLAY_TWEEN.DURATION,
            ease: Config.OVERLAY_TWEEN.EASE,
        });

        // Animate the camera zoom in
        this.tweens.add({
            targets: this.cameras.main,
            zoom: Config.CAMERA_ZOOM.ZOOM,
            duration: Config.CAMERA_ZOOM.DURATION,
            ease: Config.CAMERA_ZOOM.EASE,
            onComplete: () => {
                this.playButton.destroy();
                this.scene.start("HowToPlay", { parentScene: "StartScene" });
                this.cameras.main.setZoom(Config.CAMERA_ZOOM.RESET_ZOOM);
                overlay.destroy();
            },
        });
    }

    shutdown() {
        this.audioManager.stopAllSoundEffects();
    }
}
