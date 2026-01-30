import { BaseScene, i18n, ScoreHelper, ScoreCoins, setSceneBackground, TextOverlay, ProgressBar, announceToScreenReader } from "@k8-games/sdk";
import { SUCCESS_TEXT_KEYS } from "../config/common";

export class CelebrationScene extends BaseScene {
    private progressBar!: ProgressBar;
    private progress: number;
    private scoreHelper!: ScoreHelper;
    private callback: () => void;
    private scoreCoins!: ScoreCoins;

    constructor() {
        super("CelebrationScene");
        this.callback = () => { };
        this.progress = 0;
    }

    init(data: {
        scoreHelper: ScoreHelper;
        streakColor: number;
        callback: () => void;
        progress: number;
    }) {
        this.scoreHelper = data.scoreHelper;
        this.callback = data.callback;
        this.progress = data.progress;

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
        setSceneBackground('assets/images/common/bg.png');

        this.addImage(this.display.width / 2, this.display.height / 2, 'game_scene_bg').setOrigin(0.5);

        this.progressBar = new ProgressBar(this, 'light', i18n, { animateStreakAndStars: false });

        // Add score star
        this.scoreCoins = new ScoreCoins(this, this.scoreHelper, i18n, 'blue');
        this.scoreCoins.create(
            this.getScaledValue(87),
            this.getScaledValue(58)
        );
        this.scoreCoins.setFrame('coin0018');
        this.scoreCoins.setComboText(`${this.scoreHelper.getCurrentMultiplier()}`, true);
        this.scoreCoins.setScore(this.scoreHelper.getTotalScore());

        this.progressBar.create(
            this.getScaledValue(this.display.width / 2),
            this.getScaledValue(63),
        ).setDepth(2);

        this.progressBar.drawProgressFill(this.progress, this.scoreHelper.getCurrentStreak());

        const celebTextValue = i18n.t(
            `common.${SUCCESS_TEXT_KEYS[
            Math.floor(Math.random() * SUCCESS_TEXT_KEYS.length)
            ]
            }`
        );
        const celebText = this.addText(
            this.display.width / 2,
            this.display.height / 2 - 225,
            celebTextValue,
            {
                font: "700 30px Exo",
                color: "#000000",
            }
        ).setOrigin(0.5);
        new TextOverlay(this, celebText, { label: celebTextValue });

        announceToScreenReader(celebTextValue);

        // Create the streak animation sprite (initially hidden)
        const streakAnimation = this.addSprite(this.display.width / 2, this.display.height / 2, 'streak_animation_0').setOrigin(0.5).setAlpha(0.6);

        streakAnimation.play('power_up');

        const mascotImage = this.addImage(this.display.width / 2, this.display.height / 2 + 34, 'mascot').setOrigin(0.5);

        this.time.delayedCall(3000, () => {
            celebText.destroy();
            streakAnimation.destroy();
            mascotImage.destroy();
            this.callback?.();
            this.scene.resume("GameScene");
            this.scene.stop();
        });
    }

    static _preload(scene: BaseScene) {
        scene.load.setPath('assets/images/celebration_screen');
        scene.load.image('mascot', 'mascot.png');
    }
}
