import { BaseScene, i18n, ProgressBar, ScoreHelper, ScoreCoins, setSceneBackground, TextOverlay, ImageOverlay, announceToScreenReader } from "@k8-games/sdk";
import { ASSETS_PATHS, SUCCESS_TEXT_KEYS } from "../config/common";

export class CelebrationScene extends BaseScene {
    private progressBar!: ProgressBar;
    private progress: number;
    private scoreHelper!: ScoreHelper;
    private callback: () => void;
    private scoreCoins!: ScoreCoins;
    private showSuccessCheckmark: boolean = true;

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
        showSuccessCheckmark?: boolean;
    }) {
        this.scoreHelper = data.scoreHelper;
        this.callback = data.callback;
        this.progress = data.progress;
        this.showSuccessCheckmark = data.showSuccessCheckmark ?? true;

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

        ProgressBar.init(this);
    }

    create() {
        setSceneBackground('assets/images/common/bg.png');

        this.addImage(this.display.width / 2, this.display.height / 2, 'celebration_scene_bg').setOrigin(0.5);

        this.progressBar = new ProgressBar(this, 'dark', i18n, { animateStreakAndStars: false });

        // Add score star
        this.scoreCoins = new ScoreCoins(this, this.scoreHelper, i18n, 'purple');
        this.scoreCoins.create(
            this.getScaledValue(87),
            this.getScaledValue(62)
        );
        this.scoreCoins.setFrame('coin0018');
        this.scoreCoins.setComboText(`${this.scoreHelper.getCurrentMultiplier()}`, true);
        this.scoreCoins.setScore(this.scoreHelper.getTotalScore());

        this.progressBar.create(
            this.getScaledValue(this.display.width / 2),
            this.getScaledValue(70),
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
            this.display.height / 2 - 250,
            celebTextValue,
            {
                font: "700 30px Exo",
                color: "#ffffff",
            }
        ).setOrigin(0.5);
        new TextOverlay(this, celebText, { label: celebTextValue });
        
        announceToScreenReader(celebTextValue);

        // Create the streak animation sprite (initially hidden)
        const streakAnimation = this.addSprite(this.display.width / 2, this.display.height / 2, 'streak_animation_0').setOrigin(0.5).setAlpha(0.6);

        streakAnimation.play('power_up');

        const mascotImage = this.addImage(this.display.width / 2, this.display.height / 2 + 30, 'mascot').setOrigin(0.5);

        // Show success animation only if showSuccessCheckmark is true
        if (this.showSuccessCheckmark) {
            this.showSuccessAnimation();
        }

        this.time.delayedCall(3000, () => {
            celebText.destroy();
            streakAnimation.destroy();
            mascotImage.destroy();
            this.callback?.();
            this.scene.resume("GameScene");
            this.scene.stop();
        });
    }

    private showSuccessAnimation() {
        const height = 122;
        const successContainer = this.add.container(
            this.getScaledValue(this.display.width / 2),
            this.getScaledValue(this.display.height + height / 2) // Start below the screen
        );

        // Create background rectangle
        const bg = this.addImage(0, 0, "success_bg");
        successContainer.add(bg);

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
                new ImageOverlay(this, icon, { label: i18n.t("common.correct") + " " + i18n.t("common.icon") });
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
        scene.load.image('celebration_scene_bg', 'bg.png');
        scene.load.image('mascot', 'mascot.png');

        scene.load.setPath(`${ASSETS_PATHS.ATLAS}/streak_animation`);
        scene.load.atlas('streak_animation_0', 'texture-0.png', 'texture-0.json');
        scene.load.atlas('streak_animation_1', 'texture-1.png', 'texture-1.json');
        scene.load.atlas('streak_animation_2', 'texture-2.png', 'texture-2.json');
    }
}
