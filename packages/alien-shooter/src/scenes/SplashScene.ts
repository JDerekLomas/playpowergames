import { AnalyticsHelper, BaseScene, ButtonHelper, GameConfigManager, i18n, ImageOverlay, setSceneBackground } from "@k8-games/sdk";
import { ASSETS_PATHS, BUTTONS, MULTIVERSE_TOPICS } from "../config/common";
import { resetCometPosition } from "../utils/helper";

export class SplashScene extends BaseScene {
    private comets: Phaser.GameObjects.Image[] = [];
    private cometAnimationTimer?: Phaser.Time.TimerEvent;

    constructor() {
        super('SplashScene')
    }

    init() {
        
        const gameConfigManager = GameConfigManager.getInstance();
        const topic = gameConfigManager.get('topic') || '2D_addition_upto_100';

        if (MULTIVERSE_TOPICS.includes(topic) && topic !== 'grade3_topic2') {
            AnalyticsHelper.createInstance('multiverse', topic, { isMultiverse: true });
        } else {
            AnalyticsHelper.createInstance('alien_shooter', topic);
        }

        if(!this.anims.exists('astrobot_fire')) {
            this.anims.create({
                key: 'astrobot_fire',
                frames: 'astrobot_splashscene_fire',
                frameRate: 24,
                repeat: -1,
            });
        }

        if(!this.anims.exists('speedlines')) {
            let frames: Phaser.Types.Animations.AnimationFrame[] = [];
            for (let i=0; i<=8; i++) {
                frames.push(...this.anims.generateFrameNames(`splash_scene_speedlines_${i}`));
            }

            this.anims.create({
                key: 'speedlines',
                frames: frames,
                frameRate: 12,
                repeat: -1,
            });
        }

        setSceneBackground('assets/images/splash_screen/splashscreen_bg.png');
        this.startCometGroupAnimation();
        this.addImage(this.display.width / 2, this.display.height / 2, 'splashscreen_bg')
            .setOrigin(0.5);
        
        const logo = this.addImage(this.display.width / 2, this.display.height / 2, 'splashscreen_gametitle')
            .setOrigin(0.5)
            .setDepth(3)
            .setAlpha(0);
        new ImageOverlay(this, logo, { label: i18n.t('common.title') })

        this.addSprite(this.display.width / 2, this.display.height / 2, 'splash_scene_speedlines_0')
            .setOrigin(0.5)
            .setScale(1.3)
            .setDepth(0)
            .play('speedlines');

        const astrobot = this.addImage(200, -100, 'astrobot_fly')
            .setOrigin(0.5)
            .setScale(1.3);

        const astrobotFire = this.addSprite(-100, 155, 'astrobot_splashscene_fire')
            .setOrigin(0.5)
            .play('astrobot_fire');

        // Create container for astrobot and fire
        const astrobotContainer = this.add.container(this.getScaledValue(this.display.width / 2), this.getScaledValue(this.display.height / 2)).setDepth(2);

        astrobotContainer.add([astrobotFire, astrobot]);
        // Add floating animation to the container
        this.tweens.add({
            targets: astrobotContainer,
            y: astrobotContainer.y - 25,
            x: astrobotContainer.x - 25,
            duration: 1500,
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
            y: this.display.height - 200,
            onClick: () => {
                this.scene.start('InstructionsScene');
            }
        }).setDepth(3).setAlpha(0);

        // Combined fade-in animation for logo and play button
        this.tweens.add({
            targets: [logo, playButton],
            alpha: 1,
            duration: 1000,
            delay: 1500,
            ease: 'Sine.easeIn',
            stagger: 500
        });

        ButtonHelper.startBreathingAnimation(playButton, {
            scale: 1.1,
            duration: 1000,
            ease: 'Sine.easeInOut'
        });

        this.audioManager.initialize(this);

        this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.destroyCometGroupAnimation();
        });
    }

    startCometGroupAnimation(): void {
        const comet1 = this.addImage(100, -100, 'comet').setOrigin(0.5).setDepth(1).setRotation(0.08).setScale(0.7);
        const comet2 = this.addImage(70, -150, 'comet').setOrigin(0.5).setDepth(1).setRotation(0.08).setScale(0.3);
        const comet3 = this.addImage(this.display.width - 130, -200, 'comet').setOrigin(0.5).setDepth(1).setRotation(0.08).setScale(0.5);
        const PAUSE_DURATION = 3000;
        const GROUP_LOOPS = 2;
        const STAGGER_DELAY = 300;

        const cometsConfig = [
            { startX: this.display.width * 2, startY: 500, endX: -(this.display.width + 100), endY: this.display.height * 3, duration: 800 },
            { startX: this.display.width * 2 + 100, startY: this.display.height / 2 - 100, endX: 100, endY: this.display.height * 2 + 100, duration: 2000 },
            { startX: this.display.width * 2 + 60, startY: -(this.display.height / 2), endX: -100, endY: this.display.height/2, duration: 1000 },
        ];

        this.comets = [comet1, comet2, comet3];
        let groupLoopCount = 0;

        const playGroup = () => {
            let finishedCount = 0;

            this.comets.forEach((comet, index) => {
                const config = cometsConfig[index];
                resetCometPosition(comet, config);

                this.tweens.add({
                    targets: comet,
                    x: config.endX,
                    y: config.endY,
                    duration: config.duration,
                    delay: index * STAGGER_DELAY,
                    ease: 'Linear',
                    onComplete: () => {
                        finishedCount++;
                        if (finishedCount === this.comets.length) {
                            groupLoopCount++;
                            if (groupLoopCount < GROUP_LOOPS) {
                                playGroup();
                            } else {
                                this.cometAnimationTimer = this.time.delayedCall(PAUSE_DURATION, () => {
                                    groupLoopCount = 0;
                                    playGroup();
                                });
                            }
                        }
                    }
                });
            });
        };

        this.cometAnimationTimer = this.time.delayedCall(PAUSE_DURATION, playGroup, [], this);
    };

    preload() { }

    static _preload(scene: BaseScene) {
        const language = i18n.getLanguage() || "en";
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/splash_screen`);
        scene.load.image('splashscreen_bg', 'splashscreen_bg.png');
        scene.load.image('splashscreen_gametitle', `splashscreen_gametitle_${language}.png`);
        scene.load.image('comet', 'comet.png');
        scene.load.image('astrobot_fly', 'astrobot_fly.png');

        scene.load.setPath(`${BUTTONS.PATH}`);
        scene.load.image(BUTTONS.BUTTON.KEY, BUTTONS.BUTTON.PATH);
        scene.load.image(BUTTONS.BUTTON_HOVER.KEY, BUTTONS.BUTTON_HOVER.PATH);
        scene.load.image(BUTTONS.BUTTON_PRESSED.KEY, BUTTONS.BUTTON_PRESSED.PATH);

        scene.load.setPath(`${ASSETS_PATHS.ATLAS}/astrobot_fire`);
        scene.load.atlas('astrobot_splashscene_fire', 'astrobot_splashscene_fire.png', 'astrobot_splashscene_fire.json');

        // Load speedlines atlas
        scene.load.setPath(`${ASSETS_PATHS.ATLAS}/speedlines`);
        for (let i=0; i<=8; i++) {
            scene.load.atlas(`splash_scene_speedlines_${i}`, `texture-${i}.png`, `texture-${i}.json`);
        }
    }

    create() {
    }

    destroyCometGroupAnimation() {
        // Clean up comet animation tweens
        if (this.comets.length > 0) {
            this.comets.forEach(comet => {
                this.tweens.killTweensOf(comet);
            });
            this.comets = [];
        }

        // Clean up comet animation timer
        if (this.cometAnimationTimer) {
            this.cometAnimationTimer.destroy();
            this.cometAnimationTimer = undefined;
        }
    }
}