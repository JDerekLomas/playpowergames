import { BaseScene, i18n, ProgressBar, ScoreHelper, ScoreCoins, setSceneBackground, TextOverlay, ImageOverlay, SCORE_COUNTS, announceToScreenReader } from "@k8-games/sdk";
import { SUCCESS_TEXT_KEYS, COMMON_ASSETS } from "../config/common";

export class CelebrationScene extends BaseScene {
    private progressBar!: ProgressBar;
    private progress: number;
    private scoreHelper!: ScoreHelper;
    private callback: () => void;
    private scoreCoins!: ScoreCoins;
    private starScrollSpeed: number = 2;
    private starBackground!: Phaser.GameObjects.TileSprite;
    private planetsBackground!: Phaser.GameObjects.TileSprite;
    private previousAstronautTexture: string = 'astronaut';

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
        previousAstronautTexture?: string;
    }) {
        this.scoreHelper = data.scoreHelper;
        this.callback = data.callback;
        this.progress = data.progress;
        this.previousAstronautTexture = data.previousAstronautTexture || 'astronaut';

        ProgressBar.init(this);
    }

    create() {
        setSceneBackground('assets/images/common/bg.png');

        this.addImage(this.display.width / 2, this.display.height / 2, COMMON_ASSETS.BACKGROUND.KEY).setOrigin(0.5);
        this.starBackground = this.addTileSprite(
            this.display.width / 2,
            this.display.height / 2,
            'starpattern'
        );
        this.planetsBackground = this.addTileSprite(
            this.display.width / 2,
            this.display.height / 2,
            'planets'
        );

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
        
        // Announce celebration message
        announceToScreenReader(celebTextValue);

        // Create the streak animation sprite (initially hidden)
        const streakAnimation = this.addSprite(this.display.width / 2, this.display.height / 2, 'streak_animation_0')
            .setOrigin(0.5)
            .setVisible(false)
            .setAlpha(0.6);

        // Create the mascot sprite starting from below the screen
        const floatingContainer = this.add.container(
            this.getScaledValue(this.display.width / 2),
            this.getScaledValue(this.display.height) // Start below the screen
        ).setDepth(1);

        // Add booster animation
        const boosterPos = this.getBoosterPosition(this.previousAstronautTexture);
        const booster = this.addSprite(
            boosterPos.x,
            boosterPos.y,
            'booster_anim'
        )
            .setScale(1)
            .setOrigin(0.5);
        booster.play('booster');
        floatingContainer.add(booster);

        // Add the astronaut sprite to the container
        const mascotSprite = this.addSprite(0, 0, this.previousAstronautTexture)
            .setScale(1)
            .setOrigin(0.5);
        floatingContainer.add(mascotSprite);

        // Start the sequence
        this.startCelebrationSequence(mascotSprite, streakAnimation, celebText);
    }

    private startCelebrationSequence(
        mascotSprite: Phaser.GameObjects.Sprite,
        streakAnimation: Phaser.GameObjects.Sprite,
        celebText: Phaser.GameObjects.Text,
    ) {
        // Store original scale
        const floatingContainer = mascotSprite.parentContainer;
        const originalScale = floatingContainer.scale;
        // 1. Fly in animation
        this.tweens.add({
            targets: floatingContainer,
            y: this.getScaledValue(this.display.height * 0.5), // Position at 80% of screen height
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                // Scale down animation
                this.tweens.add({
                    targets: floatingContainer,
                    scale: 0,
                    duration: 200,
                    ease: 'Power2',
                    onComplete: () => {
                        this.updateMascot(floatingContainer);

                        // Scale up animation
                        this.tweens.add({
                            targets: floatingContainer,
                            scale: originalScale,
                            duration: 200,
                            ease: 'Back.easeOut',
                            onComplete: () => {

                                // 2. Show power-up animation
                                streakAnimation.setVisible(true);
                                streakAnimation.play('power_up');
                                new ImageOverlay(this, mascotSprite, { label: i18n.t("common.astronautCelebrating") });

                                // 3. Show success animation
                                // this.showSuccessAnimation();

                                // 4. After delay, clean up text and fly away
                                this.time.delayedCall(2000, () => {
                                    // Clean up text elements first
                                    celebText.destroy();

                                    // Hide streak animation
                                    streakAnimation.setVisible(false);

                                    // Fly away animation
                                    this.tweens.add({
                                        targets: floatingContainer,
                                        y: this.getScaledValue(-this.display.height * 0.2), // Fly up to -20% of screen height
                                        duration: 1000,
                                        ease: 'Power2',
                                        onComplete: () => {
                                            floatingContainer.destroy();
                                            this.callback?.();
                                            this.scene.resume("Shooter");
                                            this.scene.stop();
                                        }
                                    });
                                });
                            }
                        });
                    }
                });
            }
        });
    }

    private updateMascot(floatingContainer: Phaser.GameObjects.Container) {
        const currentStreak = this.scoreHelper.getCurrentStreak();
        const boosterSprite = floatingContainer.getAt(0) as Phaser.GameObjects.Sprite;
        const astronautSprite = floatingContainer.getAt(1) as Phaser.GameObjects.Sprite;
        let textureKey = 'astronaut';

        if (currentStreak >= SCORE_COUNTS[2]) {
            textureKey = 'astronaut_7';
        } else if (currentStreak >= SCORE_COUNTS[1]) {
            textureKey = 'astronaut_5';
        } else if (currentStreak >= SCORE_COUNTS[0]) {
            textureKey = 'astronaut_3';
        }

        // Update booster position using the helper method
        const boosterPos = this.getBoosterPosition(textureKey);
        boosterSprite.x = this.getScaledValue(boosterPos.x);
        boosterSprite.y = this.getScaledValue(boosterPos.y);

        astronautSprite.setTexture(textureKey).setScale(1);
        this.previousAstronautTexture = textureKey;

    }

    private getBoosterPosition(textureKey: string): { x: number; y: number } {
        switch (textureKey) {
            case 'astronaut_7':
                return { x: -80, y: 80 };
            case 'astronaut_5':
                return { x: -85, y: 60 };
            case 'astronaut_3':
                return { x: -80, y: 75 };
            default: // for 'astronaut'
                return { x: -70, y: 95 };
        }
    }

    // private showSuccessAnimation() {
    //     const height = 122;
    //     const successContainer = this.add.container(
    //         this.getScaledValue(this.display.width / 2),
    //         this.getScaledValue(this.display.height + height / 2) // Start below the screen
    //     );

    //     // Create background rectangle
    //     const bg = this.addImage(0, 0, "success_bg");
    //     successContainer.add(bg);

    //     // Create icon and text
    //     const icon = this.addImage(0, 0, "correct_icon").setOrigin(0.5);
    //     successContainer.add(icon);

    //     // Simple slide up animation
    //     this.tweens.add({
    //         targets: successContainer,
    //         y: this.getScaledValue(this.display.height - height / 2),
    //         duration: 500,
    //         ease: "Power2",
    //         onComplete: () => {
    //             new ImageOverlay(this, icon, { label: i18n.t("common.correct") + " " + i18n.t("common.icon") });
    //             // Wait for a moment and then slide down
    //             this.time.delayedCall(2000, () => {
    //                 this.tweens.add({
    //                     targets: successContainer,
    //                     y: this.getScaledValue(this.display.height + height / 2),
    //                     duration: 500,
    //                     ease: "Power2",
    //                     onComplete: () => {
    //                         successContainer.destroy();
    //                     }
    //                 });
    //             });
    //         }
    //     });
    // }

    override update() {
        if (this.starBackground) {
            this.starBackground.tilePositionY -= this.starScrollSpeed;
        }
        if (this.planetsBackground) {
            this.planetsBackground.tilePositionY -= (this.starScrollSpeed / 3);
        }
    }
}
