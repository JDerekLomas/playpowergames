import { BaseScene, i18n, ScoreHelper, ScoreCoins, ProgressBar, setSceneBackground } from "@k8-games/sdk";
import { GameScreenConfig } from "../config/GameScreenConfig";

export class CelebrationScene extends BaseScene {
    private progressBar!: ProgressBar;
    private progress: number;
    private scoreHelper!: ScoreHelper;
    private callback: () => void;
    private scoreCoins!: ScoreCoins;
    private showSuccessCheckmark: boolean = true;

    constructor() {
        super({ key: 'CelebrationScene' });
        this.callback = () => { };
        this.progress = 0;
    }

    init(data: {
        scoreHelper: ScoreHelper;
        streakColor: number;
        callback: () => void;
        progress: number;
        showSuccessCheckmark?: boolean;
    }) {
        this.scoreHelper = data.scoreHelper;
        this.callback = data.callback;
        this.progress = data.progress;
        this.showSuccessCheckmark = data.showSuccessCheckmark ?? true;
        this.audioManager.initialize(this);

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
        setSceneBackground('assets/images/celebration_screen/background.png');
        this.addImage(this.display.width / 2, this.display.height / 2, GameScreenConfig.ASSETS.KEYS.IMAGE.BACKGROUND.BG_01).setOrigin(0.5).setDepth(-2);
        this.audioManager.playSoundEffect('celebration_music');

        // Add score star
        this.scoreCoins = new ScoreCoins(this, this.scoreHelper, i18n, 'purple');
        this.scoreCoins.create(this.getScaledValue(123), this.getScaledValue(61));

        this.scoreCoins.setFrame('coin0018');
        this.scoreCoins.setComboText(`${this.scoreHelper.getCurrentMultiplier()}`, true);
        this.scoreCoins.setScore(this.scoreHelper.getTotalScore());

        this.progressBar = new ProgressBar(this, 'dark', i18n, { animateStreakAndStars: false });
        const progressBarContainer = this.progressBar.create(this.getScaledValue(this.display.width / 2 + 51), this.getScaledValue(70));
        progressBarContainer.setSize(this.getScaledValue(904), this.getScaledValue(50));

        this.progressBar.drawProgressFill(this.progress, this.scoreHelper.getCurrentStreak());

        this.addImage(this.display.width / 2, this.display.height, 'mascot_ship').setOrigin(0.5, 1);

        // Create the mascot sprite in the center
        const mascotImage = this.addImage(
            this.display.width / 2,
            390,
            "mascot"
        ).setOrigin(0.5);

        const streakAnimation = this.addSprite(this.display.width / 2, this.display.height / 2, 'streak_animation_0').setOrigin(0.5).setDepth(-1).setAlpha(0.6);

        streakAnimation.play('power_up');

        // Show success animation only if showSuccessCheckmark is true
        if (this.showSuccessCheckmark) {
            this.showSuccessAnimation();
        }

        // When the animation completes, remove the overlay and sprite
        this.time.delayedCall(3000, () => {
            mascotImage.destroy();
            this.callback?.();
            this.scene.resume('GameScreen');
            this.scene.stop();
        });
    }

    private showSuccessAnimation() {
        const width = this.display.width;
        const height = 122;
        const successContainer = this.add.container(
            this.getScaledValue(this.display.width / 2),
            this.getScaledValue(this.display.height + height / 2)
        );

        // Create background rectangle
        const bgRect = this.addRectangle(0, 0, width, height, 0x007E11);
        successContainer.add(bgRect);

        const bgRectTop = this.addRectangle(0, -height / 2, width, 7, 0x24E13E).setOrigin(0.5, 0);
        successContainer.add(bgRectTop);

        // Create icon and text
        const icon = this.addImage(0, 0, "correct_icon").setOrigin(0.5);
        successContainer.add(icon);

        // Simple slide up animation
        this.tweens.add({
            targets: successContainer,
            y: this.getScaledValue(this.display.height - height / 2),
            duration: 500,
            ease: "Power2",
            onComplete: () => {
                // Wait for a moment and then slide down
                this.time.delayedCall(3000, () => {
                    this.tweens.add({
                        targets: successContainer,
                        y: this.getScaledValue(this.display.height + height / 2),
                        duration: 500,
                        ease: "Power2",
                        onComplete: () => {
                            successContainer.destroy();
                        }
                    });
                });
            }
        });
    }

    static _preload(scene: BaseScene) {
        scene.load.setPath('assets/images/celebration_screen');
        scene.load.image('celebration_bg', 'background.png');
        scene.load.image('correct_icon', 'correct_icon.png');
        scene.load.image('mascot', 'mascot.png');
        scene.load.image('mascot_ship', 'mascot_ship.png');
        scene.load.image('streak_star', 'streak_star.png');

        scene.load.setPath('assets/audios/sound_effects');
        scene.load.audio('celebration_music', 'celebration_music.mp3');

        scene.load.setPath('assets/atlases/streak_animation');
        scene.load.atlas('streak_animation_0', 'texture-0.png', 'texture-0.json');
        scene.load.atlas('streak_animation_1', 'texture-1.png', 'texture-1.json');
        scene.load.atlas('streak_animation_2', 'texture-2.png', 'texture-2.json');
    }
}