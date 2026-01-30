import { AnalyticsHelper, BaseScene, ButtonHelper, GameConfigManager, i18n, ImageOverlay, setSceneBackground } from "@k8-games/sdk";
import { ASSETS_PATHS, BUTTONS, COMMON_ASSETS, getTopicConfig } from "../config/common";

export class SplashScene extends BaseScene {
    private playButton!: Phaser.GameObjects.Container;

    constructor() {
        super('SplashScene')
    }

    init() {
        const gameConfigManager = GameConfigManager.getInstance();
        const topic = gameConfigManager.get('topic') || "compare_percents";

        setSceneBackground('assets/images/splash_screen/splashscreen_bg.png');
        this.addImage(this.display.width / 2, this.display.height / 2, 'splashscreen_bg')
            .setOrigin(0.5);

        this.audioManager.initialize(this);

        // Create card fan
        const numCards = 9;
        const cards: Phaser.GameObjects.Image[] = [];
        const startAngle = -60; // Start angle in degrees
        const endAngle = 60;    // End angle in degrees
        const fanCenterX = this.display.width / 2;
        const fanCenterY = this.display.height / 2 - 50;
        let fanSound: Phaser.Sound.WebAudioSound | undefined;
        setTimeout(() => {
            fanSound = this.audioManager.playSoundEffect('card_fan');
        }, 500);

        // Create cards stacked at the same point, all at startAngle
        for (let i = 0; i < numCards; i++) {
            const isLastCard = i === numCards - 1;
            const card = this.addImage(fanCenterX, fanCenterY, isLastCard ? 'card_front_math' : 'card_back')
                .setOrigin(0.5, 1)
                .setScale(0.6)
                .setAlpha(0)
                .setAngle(startAngle)
                .setDepth(1);
            cards.push(card);
        }

        // Animate cards into fan formation (angle only, all start at startAngle)
        cards.forEach((card, index) => {
            const isLastCard = index === numCards - 1;
            const targetAngle = Phaser.Math.Linear(startAngle, endAngle, index / (numCards - 1));
            this.tweens.add({
                targets: card,
                alpha: 1,
                angle: targetAngle,
                duration: 800,
                ease: 'Back.easeOut',
                delay: 500 + index * 100, // Stagger the animations
                onComplete: () => {
                    if (isLastCard) {
                        fanSound?.stop();
                        this.tweens.add({
                            targets: this.playButton,
                            alpha: 1,
                            duration: 500,
                            delay: 500,
                            ease: 'Power2',
                            onComplete: () => {
                                ButtonHelper.startBreathingAnimation(this.playButton, {
                                    scale: 1.1,
                                    duration: 1000,
                                    ease: 'Sine.easeInOut'
                                });
                            }
                        });
                    }
                }
            });
        });


        const gameTitle = this.addImage(this.display.width / 2, (this.display.height / 2), 'splashscreen_gametitle')
            .setOrigin(0.5)
            .setAlpha(0)
            .setDepth(3);
        this.addRectangle(this.display.width / 2, (this.display.height / 2),
            (gameTitle.displayWidth / this.display.scale) + 400, gameTitle.displayHeight / this.display.scale, 0xfff8e9)
            .setOrigin(0.5)
            .setAlpha(1)
            .setDepth(2);

        this.tweens.add({
            targets: [gameTitle],
            alpha: 1,
            delay: 500,
            duration: 1000,
            ease: 'Power2'
        });

        // Set the title of the game
        let title = i18n.t('common.title');
        if (topic === 'compare_numbers') {
            title = i18n.t('common.compareNumberTab');
        }

        new ImageOverlay(this, gameTitle, { label: title });

        this.playButton = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY
            },
            text: i18n.t('common.play'),
            label: i18n.t('common.play'),
            textStyle: {
                fontFamily: "Exo",
                fontStyle: "bold",
                fontSize: 30,
                color: '#ffffff',
            },
            imageScale: 0.8,
            raisedOffset: 3.5,
            x: this.display.width / 2,
            y: (this.display.height / 2) + 240,
            onClick: () => this.handlePlayButtonClick(),
        }).setAlpha(0);
    }

    private handlePlayButtonClick() {
        this.scene.start('InfoScene', { parentScene: 'SplashScene' });
    }

    preload() { }

    static _preload(scene: BaseScene) {
        const language = i18n.getLanguage() || 'en';
        const gameConfigManager = GameConfigManager.getInstance();
        const topic = gameConfigManager.get('topic') || 'compare_percents';
        const topicConfig = getTopicConfig(topic);

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/splash_screen`);
        scene.load.image('splashscreen_bg', 'splashscreen_bg.png');
        scene.load.image('splashscreen_gametitle', `${topicConfig.SPLASH_SCREEN.TITLE}_${language}.png`);
        scene.load.image('card_front_math', `${topicConfig.SPLASH_SCREEN.CARD}.png`);

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}${COMMON_ASSETS.PATH}`);
        scene.load.image('card_front', 'card_front.png');
        scene.load.image('card_back', `card_back_${topicConfig.SPLASH_SCREEN.TITLE}_${language}.png`);

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}`);
        scene.load.audio('card_fan', 'card_fan.mp3');

        scene.load.setPath(`${BUTTONS.PATH}`);
        scene.load.image(BUTTONS.BUTTON.KEY, BUTTONS.BUTTON.PATH);
        scene.load.image(BUTTONS.BUTTON_HOVER.KEY, BUTTONS.BUTTON_HOVER.PATH);
        scene.load.image(BUTTONS.BUTTON_PRESSED.KEY, BUTTONS.BUTTON_PRESSED.PATH);
    }

    create() {
        const gameConfigManager = GameConfigManager.getInstance();
        const topic = gameConfigManager.get('topic') || 'compare_percents';
        AnalyticsHelper.createInstance('fraction_frenzy', topic);
    }
}