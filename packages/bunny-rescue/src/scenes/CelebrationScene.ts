import { BaseScene, i18n, ScoreHelper, ScoreCoins, TextOverlay, ProgressBar, announceToScreenReader } from "@k8-games/sdk";
import { ASSETS_PATHS } from "../config/common";

export class CelebrationScene extends BaseScene {
    private scoreHelper!: ScoreHelper;
    private callback: () => void;
    private scoreCoins!: ScoreCoins;

    constructor() {
        super("CelebrationScene")
        this.callback = () => { };
    }

    init(data: {
        scoreHelper: ScoreHelper;
        callback: () => void;
    }) {
        this.scoreHelper = data.scoreHelper;
        this.callback = data.callback;

        ProgressBar.init(this);

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
        const bg = this.addImage(this.display.width / 2, this.display.height / 2, 'celebration_bg').setOrigin(0.5);
        bg.setDepth(-2);

        // Add score star
        this.scoreCoins = new ScoreCoins(this, this.scoreHelper, i18n, "blue");
        this.scoreCoins.create(
            this.getScaledValue(87),
            this.getScaledValue(62)
        );
        this.scoreCoins.setFrame("coin0018");
        this.scoreCoins.setComboText(`${this.scoreHelper.getCurrentMultiplier()}`, true);
        this.scoreCoins.setScore(this.scoreHelper.getTotalScore());

        // Group: "in a row" text + stars. Apply scaling once at container position only.
        const centerX = this.display.width / 2;
        const centerY = this.display.height / 2 - 250;
        const streakGroup = this.add.container(this.getScaledValue(centerX), this.getScaledValue(centerY));

        // Centered streak text as group anchor at (0,0)
        const streakCount = this.scoreHelper.getCurrentStreak();
        const inARowText = this.addText(
            0,
            0,
            i18n.t('game.inARow', { count: streakCount }),
            {
                font: "700 46px Exo",
                color: "#368000",
            }
        ).setOrigin(0.5);
        streakGroup.add(inARowText);
        new TextOverlay(this, inARowText, { label: i18n.t('game.inARow', { count: streakCount }) });

        announceToScreenReader(i18n.t('game.inARow', { count: streakCount }));

        const celebStarsContainer = this.add.container(
            this.getScaledValue(this.display.width / 2),
            this.getScaledValue(160)
        )

        // Add streak animation
        const streakAnimation = this.addSprite(this.display.width / 2, this.display.height / 2, 'streak_animation_0').setOrigin(0.5).setAlpha(0.6);
        streakAnimation.play('power_up');

        // Add mascot image
        const mascot = this.addImage(this.display.width / 2, 434, "mascot");

        this.audioManager.playSoundEffect("positive-sfx");

        // When the animation completes, remove the overlay and sprite
        this.time.delayedCall(3000, () => {
            inARowText.destroy();
            celebStarsContainer.destroy();
            streakAnimation.destroy();
            mascot.destroy();
            this.callback?.();
            this.scene.resume('GameScene');
            this.scene.stop('CelebrationScene');
        });
    }

    static _preload(scene: BaseScene) {
        ProgressBar.preload(scene);

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/celebration_screen`);
        scene.load.image("star", "star.png");
        scene.load.image("mascot", "mascot.png");
        scene.load.image("celebration_bg", "celebration_bg.png");

        scene.load.setPath(`${ASSETS_PATHS.ATLAS}/streak_animation`);
        scene.load.atlas('streak_animation_0', 'texture-0.png', 'texture-0.json');
        scene.load.atlas('streak_animation_1', 'texture-1.png', 'texture-1.json');
        scene.load.atlas('streak_animation_2', 'texture-2.png', 'texture-2.json');
    }
}
