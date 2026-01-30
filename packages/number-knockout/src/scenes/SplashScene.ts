import { AnalyticsHelper, BaseScene, ButtonHelper, GameConfigManager, i18n, ImageOverlay, setSceneBackground } from "@k8-games/sdk";
import { ASSETS_PATHS, BUTTONS, COMMON_ASSETS } from "../config/common";

export class SplashScene extends BaseScene {
    private playButton!: Phaser.GameObjects.Container;

    constructor() {
        super('SplashScene')
    }

    init() {
        const gameConfigManager = GameConfigManager.getInstance();
        const topic = gameConfigManager.get('topic') || "compare_percents";
        const backgroundImage = topic === "grade7_topic3" ? 'splashscreen_bg_amount' : 'splashscreen_bg';
        setSceneBackground(`assets/images/splash_screen/${backgroundImage}.png`);
        this.addImage(this.display.width / 2, this.display.height / 2, backgroundImage)
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
            const cardImg = topic === "grade7_topic3" ? 'card_front_math_amount' : 'card_front_math';
            const card = this.addImage(fanCenterX, fanCenterY, isLastCard ? cardImg : 'card_back')
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

        if (topic === "grade7_topic3") {
            this.addImage(this.display.width / 2, this.display.height - 470, 'bg_patch').setOrigin(0.5, 0).setDepth(2);
        } else {
            this.addRectangle(this.display.width / 2, (this.display.height / 2),
                (gameTitle.displayWidth / this.display.scale) + 400, gameTitle.displayHeight / this.display.scale, 0xfff8e9)
                .setOrigin(0.5)
                .setAlpha(1)
                .setDepth(2);
        }


        this.tweens.add({
            targets: [gameTitle],
            alpha: 1,
            delay: 500,
            duration: 1000,
            ease: 'Power2'
        });
        new ImageOverlay(this, gameTitle, { label: i18n.t("common.title") });

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
                font: "700 36px Exo",
                color: '#ffffff',
            },
            imageScale: 0.8,
            raisedOffset: 3.5,
            x: this.display.width / 2,
            y: (this.display.height / 2) + 240,
            onClick: () => this.handlePlayButtonClick(),
        }).setAlpha(0).setDepth(3);


    }

    private handlePlayButtonClick() {
        // this.audioManager.playBackgroundMusic('bg-music');
        this.scene.start('InfoScene', { parentScene: 'SplashScene' });
    }

    preload() { }

    static _preload(scene: BaseScene) {
        const language = i18n.getLanguage() || 'en';
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/splash_screen`);
        scene.load.image('splashscreen_bg', 'splashscreen_bg.png');
        scene.load.image('bg_patch', 'bg_patch.png');
        scene.load.image('splashscreen_bg_amount', 'splashscreen_bg_amount.png');
        scene.load.image('splashscreen_gametitle', `splashscreen_gametitle_${language}.png`);
        scene.load.image('card_front_math', `card_front_${language}.png`);
        scene.load.image('card_front_math_amount', `card_front_amount_${language}.png`);
        scene.load.image('splashscreen_card_1', 'splashscreen_card_1.png');
        scene.load.image('splashscreen_card_2', 'splashscreen_card_2.png');
        scene.load.image('splashscreen_card_3', 'splashscreen_card_3.png');

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}${COMMON_ASSETS.PATH}`);
        scene.load.image('card_back', `card_back_${language}.png`);

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}`);
        scene.load.audio('card_fan', 'card_fan.mp3');

        scene.load.setPath(`${BUTTONS.PATH}`);
        scene.load.image(BUTTONS.BUTTON.KEY, BUTTONS.BUTTON.PATH);
        scene.load.image(BUTTONS.BUTTON_HOVER.KEY, BUTTONS.BUTTON_HOVER.PATH);
        scene.load.image(BUTTONS.BUTTON_PRESSED.KEY, BUTTONS.BUTTON_PRESSED.PATH);
    }

    create() {
        const gameConfigManager = GameConfigManager.getInstance();
        const topic = gameConfigManager.get('topic') || 'compare_scientific';

        AnalyticsHelper.createInstance('number_knockout', topic);
    }
}