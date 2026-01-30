import { BaseScene, i18n, ScoreHelper, ScoreCoins, setSceneBackground, TextOverlay, ImageOverlay, announceToScreenReader } from "@k8-games/sdk";
import { SUCCESS_TEXT_KEYS } from "../config/common";

export class CelebrationScene extends BaseScene {
    private scoreHelper!: ScoreHelper;
    private callback: () => void;
    private scoreCoins!: ScoreCoins;
    private showSuccessCheckmark: boolean = true;

    constructor() {
        super("CelebrationScene");
        this.callback = () => { };
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
        this.showSuccessCheckmark = data.showSuccessCheckmark ?? true;

        // Create power_up animation if it doesn't exist
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

        this.addImage(this.display.width / 2, this.display.height / 2, 'celebration_scene_bg').setOrigin(0.5);

        // Add score star
        this.scoreCoins = new ScoreCoins(this, this.scoreHelper, i18n, 'blue');
        this.scoreCoins.create(
            this.getScaledValue(87),
            this.getScaledValue(62)
        );
        this.scoreCoins.setFrame('coin0018');
        this.scoreCoins.setComboText(`${this.scoreHelper.getCurrentMultiplier()}`, true);
        this.scoreCoins.setScore(this.scoreHelper.getTotalScore());

        // Group: "in a row" text + stars. Apply scaling once at container position only.
        const centerX = this.display.width / 2;
        const centerY = this.display.height / 2 - 140;
        const streakGroup = this.add.container(this.getScaledValue(centerX), this.getScaledValue(centerY));

        // Centered streak text as group anchor at (0,0)
        const streakCount = this.scoreHelper.getCurrentStreak();
        const inARowText = this.addText(
            0,
            0,
            i18n.t('game.inARow', { count: streakCount }),
            {
                font: "700 46px Exo",
                color: "#6BFF01",
            }
        ).setOrigin(0.5);
        streakGroup.add(inARowText);
        new TextOverlay(this, inARowText, { label: i18n.t('game.inARow', { count: streakCount }) });

        announceToScreenReader(i18n.t('game.inARow', { count: streakCount }));

        // Stars positioned relative to unscaled text bounds; no extra getScaledValue here.
        const star1 = this.addImage(
            -inARowText.width / 2 - 50,
            0,
            "celebration_shine_star"
        ).setOrigin(0.5).setScale(1.0);

        const star2 = this.addImage(
            inARowText.width / 2 + 50,
            -30,
            "celebration_shine_star"
        ).setOrigin(0.5).setScale(1.1);

        const star3 = this.addImage(
            inARowText.width / 2 + 30,
            40,
            "celebration_shine_star"
        ).setOrigin(0.5).setScale(0.9);

        streakGroup.add([star1, star2, star3]);

        // Add twinkling animation to stars
        this.tweens.add({
            targets: [star1, star2, star3],
            alpha: 0.3,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            delay: (_target: any, index: number) => index * 200 // Stagger the animations
        });

        // Create the streak animation sprite (initially hidden)
        const streakAnimation = this.addSprite(this.display.width / 2, this.display.height / 2, 'streak_animation_0').setOrigin(0.5).setAlpha(0.6);

        streakAnimation.play('power_up');

        // Show success animation only if showSuccessCheckmark is true
        if (this.showSuccessCheckmark) {
            this.showSuccessAnimation();
        }

        this.time.delayedCall(3000, () => {
            streakGroup.destroy();
            streakAnimation.destroy();
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
        
        // Add text beside the icon
        const successTextValue = i18n.t(
            `common.${SUCCESS_TEXT_KEYS[
            Math.floor(Math.random() * SUCCESS_TEXT_KEYS.length)
            ]
            }`
        );
        const successText = this.addText(0, 0, successTextValue, {
            font: "700 32px Exo",
            color: "#FFFFFF",
        }).setOrigin(0.5);

        // Position icon and text side by side
        const gap = this.getScaledValue(10);
        const iconWidth = icon.getBounds().width;
        const textWidth = successText.getBounds().width;
        const totalWidth = iconWidth + gap + textWidth;

        icon.setPosition(-totalWidth / 2 + iconWidth / 2, 0);
        successText.setPosition(-totalWidth / 2 + iconWidth + gap + textWidth / 2, 0);

        successContainer.add([icon, successText]);

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
        scene.load.image('correct_icon', 'correct_icon.png');
        scene.load.image('celebration_shine_star', 'celebration_shine_star.png');
        scene.load.setPath('assets/images/common');
        scene.load.image('success_bg', 'success_bg.png');
        
        scene.load.setPath('assets/atlases/streak_animation');
        scene.load.atlas('streak_animation_0', 'texture-0.png', 'texture-0.json');
        scene.load.atlas('streak_animation_1', 'texture-1.png', 'texture-1.json');
        scene.load.atlas('streak_animation_2', 'texture-2.png', 'texture-2.json');
    }
}
