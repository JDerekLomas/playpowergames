import {
    BaseScene,
    i18n,
    ScoreHelper,
    ScoreCoins,
    ProgressBar,
    TextOverlay,
    ImageOverlay,
    GameConfigManager,
    announceToScreenReader,
} from "@k8-games/sdk";
import { SUCCESS_TEXT_KEYS, ASSETS_PATHS } from "../config/common";
import { BackgroundHelper } from "../utils/BackgroundHelper";
import { Alien } from "../utils/Alien";

export class CelebrationScene extends BaseScene {
    private progressBar!: ProgressBar;
    private progress: number;
    private scoreHelper!: ScoreHelper;
    private callback: () => void;
    private scoreCoins!: ScoreCoins;

    constructor() {
        super({ key: "CelebrationScene" });
        this.callback = () => {};
        this.progress = 0;
    }

    init(data: {
        scoreHelper: ScoreHelper;
        callback: () => void;
        progress: number;
    }) {
        this.scoreHelper = data.scoreHelper;
        this.callback = data.callback;
        this.progress = data.progress;

        if (!this.anims.exists('power_up')) {
            let frames: Phaser.Types.Animations.AnimationFrame[] = [
                ...this.anims.generateFrameNames('streak_animation_0'),
                ...this.anims.generateFrameNames('streak_animation_1'),
                ...this.anims.generateFrameNames('streak_animation_2'),
            ]

            frames.sort((a, b) => {
                if (!a.frame || !b.frame) return 0;
                
                const aNum = Number(a.frame.toString().replace(/\D/g, ''));
                const bNum = Number(b.frame.toString().replace(/\D/g, ''));
                return aNum - bNum;
            });

            this.anims.create({
                key: 'power_up',
                frames: frames,
                frameRate: 12,
                repeat: -1,
                hideOnComplete: false
            })
        }
    }

    create() {
        // Add background
        BackgroundHelper.createBackground(this);

        this.progressBar = new ProgressBar(this, "dark", i18n, {
            animateStreakAndStars: false,
        });

        // Add score star
        this.scoreCoins = new ScoreCoins(this, this.scoreHelper, i18n, "blue");
        this.scoreCoins.create(
            this.getScaledValue(87),
            this.getScaledValue(62)
        );
        this.scoreCoins.setFrame("coin0018");
        this.scoreCoins.setComboText(
            `${this.scoreHelper.getCurrentMultiplier()}`,
            true
        );
        this.scoreCoins.setScore(this.scoreHelper.getTotalScore());

        this.progressBar?.create(
            this.getScaledValue(this.display.width / 2),
            this.getScaledValue(70)
        );

        this.progressBar?.drawProgressFill(
            this.progress,
            this.scoreHelper.getCurrentStreak()
        );

        const celebTextVal = i18n.t(
            `common.${
                SUCCESS_TEXT_KEYS[
                    Math.floor(Math.random() * SUCCESS_TEXT_KEYS.length)
                ]
            }`
        );
        const celebText = this.addText(
            this.display.width / 2,
            this.display.height / 2 - 200,
            celebTextVal,
            {
                fontFamily: "Exo",
                fontStyle: "bold",
                fontSize: 36,
                color: "#FFFFFF",
            }
        ).setOrigin(0.5);

        new TextOverlay(this, celebText, { label: celebTextVal });
        
        announceToScreenReader(celebTextVal);

        const celebStarsContainer = this.add.container(
            this.getScaledValue(this.display.width / 2),
            this.getScaledValue(this.display.height / 2 - 200)
        )

        const star1 = this.addImage(
            0 - celebText.width / 2 - 50,
            0,
            "star"
        ).setOrigin(0.5);

        const star2 = this.addImage(
            0 + celebText.width / 2 + 40,
            0 + 35,
            "star"
        ).setOrigin(0.5);

        const star3 = this.addImage(
            0 + celebText.width / 2 + 25,
            0 - 25,
            "star"
        ).setOrigin(0.5).setScale(0.64)

        celebStarsContainer.add(star1);
        celebStarsContainer.add(star2);
        celebStarsContainer.add(star3);

        const streakAnimation = this.addSprite(
            this.display.width / 2,
            this.display.height / 2,
            "streak_animation_0"
        ).setOrigin(0.5).setAlpha(0.6);

        // add shadow to mascot image
        const mascotShadow = this.addImage(
            this.display.width / 2,
            this.display.height / 2 + 285,
            "mascot_shadow"
        ).setOrigin(0.5);

        let alienContainer: Phaser.GameObjects.Container | null = null;
        const gameConfigManager = GameConfigManager.getInstance();
        const topic = gameConfigManager.get('topic') || 'G3_T1_understand_division';
        const countingTopics = ['GK_T1_count_numbers_upto_5', 'GK_T2_count_numbers_upto_10'];

        if (topic === 'G3_T1_understand_division') {
            alienContainer = new Alien(this, 1, this.display.width / 2, this.display.height / 2 + 240).alienContainer
            alienContainer.setScale(0.73);
        } else if (countingTopics.includes(topic)) {
            alienContainer = new Alien(this, 0, this.display.width / 2, this.display.height / 2 + 160).alienContainer
            alienContainer.setScale(0.73);
        } else if (topic === 'gk_t11_compose_and_decompose_numbers_11_to_19') {
            const alienX = this.getScaledValue(this.display.width / 2);
            const alienY = this.getScaledValue(this.display.height / 2 + 140);
            alienContainer = this.add.container(alienX, alienY)
            const alien = this.addImage(0, 0, "alien_default") // From ComposeDecompose
            alien.setScale(1.5);
            alienContainer.add(alien);
        } else {
            alienContainer = new Alien(this, 1, this.display.width / 2, this.display.height / 2 + 240).alienContainer
            alienContainer.setScale(0.73);
        }


        new ImageOverlay(this, alienContainer.getAt(0) as unknown as Phaser.GameObjects.Image, {
            label: i18n.t("common.characterCelebrating"),
        });

        streakAnimation.play("power_up");

        // Show success animation
        // this.showSuccessAnimation();
        this.audioManager.playSoundEffect("positive-sfx");

        // When the animation completes, remove the overlay and sprite
        this.time.delayedCall(3000, () => {
            celebText.destroy();
            celebStarsContainer.destroy();
            alienContainer.destroy();
            mascotShadow.destroy();
            this.callback?.();
            this.scene.resume('GameScene');
            this.scene.stop('CelebrationScene');
        });
    }

    // private showSuccessAnimation() {
    //     const width = this.display.width;
    //     const height = 122;
    //     const successContainer = this.add.container(
    //         this.getScaledValue(this.display.width / 2),
    //         this.getScaledValue(this.display.height + height / 2)
    //     );

    //     // Create background rectangle
    //     const bgRect = this.addRectangle(0, 0, width, height, 0x007e11);
    //     successContainer.add(bgRect);

    //     const bgRectTop = this.addRectangle(
    //         0,
    //         -height / 2,
    //         width,
    //         7,
    //         0x24e13e
    //     ).setOrigin(0.5, 0);
    //     successContainer.add(bgRectTop);

    //     // Create icon and text
    //     const icon = this.addImage(0, 0, "correct_icon").setOrigin(0.5);

    //     successContainer.add(icon);

    //     this.audioManager.playSoundEffect("positive-sfx");
    //     // Simple slide up animation
    //     this.tweens.add({
    //         targets: successContainer,
    //         y: this.getScaledValue(this.display.height - height / 2),
    //         duration: 500,
    //         ease: "Power2",
    //         onComplete: () => {
    //             new ImageOverlay(this, icon, {
    //                 label:
    //                     i18n.t("common.correct") + " " + i18n.t("common.icon"),
    //             });
    //             // Wait for a moment and then slide down
    //             this.time.delayedCall(500, () => {
    //                 this.tweens.add({
    //                     targets: successContainer,
    //                     y: this.getScaledValue(
    //                         this.display.height + height / 2
    //                     ),
    //                     duration: 500,
    //                     ease: "Power2",
    //                     onComplete: () => {
    //                         successContainer.destroy();
    //                     },
    //                 });
    //             });
    //         },
    //     });
    // }

    static _preload(scene: BaseScene) {
        BackgroundHelper.preload(scene);
        Alien.preload(scene);

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/celebration_scene`);
        scene.load.image("mascot_shadow", "mascot_shadow.png");
        scene.load.image("star", "star.png");

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen`);
        scene.load.image("correct_icon", "correct_icon.png");

        scene.load.setPath(`${ASSETS_PATHS.ATLAS}/scorestar`);
        scene.load.atlas("scorestar", "score_star.png", "score_star.json");

        scene.load.setPath(`${ASSETS_PATHS.ATLAS}/streak_animation`);
        scene.load.atlas('streak_animation_0', 'texture-0.png', 'texture-0.json');
        scene.load.atlas('streak_animation_1', 'texture-1.png', 'texture-1.json');
        scene.load.atlas('streak_animation_2', 'texture-2.png', 'texture-2.json');
    }
}
