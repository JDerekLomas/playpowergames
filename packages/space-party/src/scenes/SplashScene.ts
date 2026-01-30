import { AnalyticsHelper, BaseScene, ButtonHelper, GameConfigManager, i18n, ImageOverlay, setSceneBackground } from "@k8-games/sdk";
import { ASSETS_PATHS, BUTTONS } from "../config/common";

export class SplashScene extends BaseScene {
    private topic: string;

    constructor() {
        super('SplashScene')
        const gameConfigManager = GameConfigManager.getInstance();
        this.topic = gameConfigManager.get('topic') || 'G3_T1_understand_division';
    }

    init() {

        setSceneBackground('assets/images/splash_screen/splashscreen_bg.png');
        this.startSpaceShipsGroupAnimation();
        this.addImage(this.display.width / 2, this.display.height / 2, 'splashscreen_bg')
            .setOrigin(0.5);
        
        const logo = this.addImage(this.display.width / 2, (this.display.height / 2) - 100, 'splashscreen_gametitle')
            .setOrigin(0.5)
            .setDepth(2);
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
            y: this.display.height - 200,
            onClick: () => {
                const countingTopics = ['GK_T1_count_numbers_upto_5', 'GK_T2_count_numbers_upto_10'];

                if(this.topic === "G3_T1_understand_division"){
                    this.scene.start('NumpadTutorial');
                }
                else if (countingTopics.includes(this.topic)) {
                    this.scene.start('CountItemsTutorial', {
                        mechanicType: 'feed'
                    });
                } 
                else if (this.topic === 'g1_t11_equal_shares_and_time') {
                    this.scene.start('SliceItemsTutorial');
                }
                else if (this.topic === 'gk_t11_compose_and_decompose_numbers_11_to_19') {
                    this.scene.start('ComposeDecomposeTutorial', {
                        mechanicType: 'decompose'
                    });
                }
                else {
                    // default to numpad layout
                    this.scene.start('NumpadTutorial');
                }
            }
        });

        ButtonHelper.startBreathingAnimation(playButton, {
            scale: 1.1,
            duration: 1000,
            ease: 'Sine.easeInOut'
        });

        this.audioManager.initialize(this);
    }

    startSpaceShipsGroupAnimation(): void {
        // spaceship_main (large, bottom left)
        let mainShipX = this.getScaledValue(220);
        let mainShipY = this.getScaledValue(this.display.height - 180);
        let mainShipScale = 0.7;
        if(this.topic === 'gk_t11_compose_and_decompose_numbers_11_to_19') {
            mainShipX = this.getScaledValue(166);
            mainShipY = this.getScaledValue(this.display.height - 278);
            mainShipScale = 1;
        }
        const mainShip = this.add.container(mainShipX, mainShipY);
        const mainSprite = this.addImage(0, 0, 'spaceship_main').setScale(mainShipScale);
        mainShip.add(mainSprite);
        mainShip.setDepth(2);
        this.tweens.add({
            targets: mainShip,
            y: mainShip.y - this.getScaledValue(15),
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // spaceship_1 (bottom right, with beam)
        const ship1 = this.add.container(this.getScaledValue(this.display.width - 200), this.getScaledValue(this.display.height - 100));
        const sprite1 = this.addImage(0, 0, 'spaceship_1').setScale(0.7);
        ship1.add(sprite1);
        ship1.setDepth(1);
        this.tweens.add({
            targets: ship1,
            y: ship1.y - this.getScaledValue(12),
            duration: 1700,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // spaceship_2 (middle right)
        const ship2 = this.add.container(this.getScaledValue(this.display.width - 20), this.getScaledValue(this.display.height / 2));
        const sprite2 = this.addImage(0, 0, 'spaceship_2');
        ship2.add(sprite2);
        ship2.setDepth(1);
        this.tweens.add({
            targets: ship2,
            y: ship2.y - this.getScaledValue(18),
            duration: 2100,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // spaceship_3 (top right with beam)
        const ship3 = this.add.container(this.getScaledValue(this.display.width - 180), this.getScaledValue(100));
        const sprite3 = this.addImage(0, 0, 'spaceship_3');
        ship3.add(sprite3);
        ship3.setDepth(1);
        this.tweens.add({
            targets: ship3,
            y: ship3.y + this.getScaledValue(20),
            duration: 1800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // spaceship_4 (top right)
        const ship4 = this.add.container(this.getScaledValue(this.display.width - 380), this.getScaledValue(80));
        const sprite4 = this.addImage(0, 0, 'spaceship_4').setScale(0.7);
        ship4.add(sprite4);
        ship4.setDepth(1);
        this.tweens.add({
            targets: ship4,
            y: ship4.y + this.getScaledValue(15),
            duration: 1900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    preload() { }

    static _preload(scene: BaseScene) {
        const language = i18n.getLanguage() || "en";
        const gameConfigManager = GameConfigManager.getInstance();
        const topic = gameConfigManager.get('topic') || 'G3_T1_understand_division';

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/splash_screen`);
        scene.load.image('splashscreen_bg', 'splashscreen_bg.png');
        scene.load.image('splashscreen_gametitle', `splashscreen_gametitle_${language}.png`);
        scene.load.image('spaceship_1', 'spaceship_1.png');
        scene.load.image('spaceship_2', 'spaceship_2.png');
        scene.load.image('spaceship_3', 'spaceship_3.png');
        scene.load.image('spaceship_4', 'spaceship_4.png');

        if(topic === 'gk_t11_compose_and_decompose_numbers_11_to_19') {
            scene.load.image('spaceship_main', 'spaceship_compose_decompose.png');
        } else {
            scene.load.image('spaceship_main', 'spaceship_main.png');
        }

        scene.load.setPath(`${BUTTONS.PATH}`);
        scene.load.image(BUTTONS.BUTTON.KEY, BUTTONS.BUTTON.PATH);
        scene.load.image(BUTTONS.BUTTON_HOVER.KEY, BUTTONS.BUTTON_HOVER.PATH);
        scene.load.image(BUTTONS.BUTTON_PRESSED.KEY, BUTTONS.BUTTON_PRESSED.PATH);
    }

    create() {
        AnalyticsHelper.createInstance('space_party', this.topic);
    }
}