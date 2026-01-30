import { BaseScene, i18n, ScoreHelper, ScoreCoins, ProgressBar, setSceneBackground, GameConfigManager, announceToScreenReader, focusToGameContainer } from "@k8-games/sdk";
import { SUCCESS_TEXT_KEYS, ASSETS_PATHS, COMMON_ASSETS } from "../config/common";
import { ImageOverlay } from "../ImageOverlay";
import { TextOverlay } from "../TextOverlay";

export class CelebrationScene extends BaseScene {
    private progressBar!: ProgressBar;
    private progress: number;
    private scoreHelper!: ScoreHelper;
    private callback: () => void;
    private scoreCoins!: ScoreCoins;
    private showSuccessCheckmark: boolean = true;

    constructor() {
        super({ key: "CelebrationScene" });
        this.callback = () => { };
        this.progress = 0;
    }

    init(data: {
        scoreHelper: ScoreHelper;
        callback: () => void;
        progress: number;
        showSuccessCheckmark?: boolean;
    }) {
        this.scoreHelper = data.scoreHelper;
        this.callback = data.callback;
        this.progress = data.progress;
        this.showSuccessCheckmark = data.showSuccessCheckmark ?? true;
    }

    create() {
        // focus to game container
        focusToGameContainer();
        const gameConfigManager = GameConfigManager.getInstance();
        const topic = gameConfigManager.get('topic') || "compare_percents";

        setSceneBackground('assets/images/common/bg.png');
        const backgroundImage = topic === "grade7_topic3" ? 'celebration_bg_amount' : COMMON_ASSETS.BACKGROUND.KEY;
        this.addImage(this.display.width / 2, this.display.height / 2, backgroundImage).setOrigin(0.5);

        // Add score star
        this.scoreCoins = new ScoreCoins(this, this.scoreHelper, i18n, 'blue');
        this.scoreCoins.create(
            this.getScaledValue(87),
            this.getScaledValue(62)
        );
        this.scoreCoins.setFrame('coin0018');
        this.scoreCoins.setComboText(`${this.scoreHelper.getCurrentMultiplier()}`, true);
        this.scoreCoins.setScore(this.scoreHelper.getTotalScore());

        this.progressBar = new ProgressBar(this, 'light', i18n, { animateStreakAndStars: false });
        this.progressBar.create(
            this.getScaledValue(this.display.width / 2),
            this.getScaledValue(70),
        );

        this.progressBar.drawProgressFill(this.progress, this.scoreHelper.getCurrentStreak());

        const celebTextVal = i18n.t(
            `common.${SUCCESS_TEXT_KEYS[
            Math.floor(Math.random() * SUCCESS_TEXT_KEYS.length)
            ]
            }`
        );
        const celebText = this.addText(
            this.display.width / 2,
            this.display.height / 2 - 250,
            celebTextVal,
            {
                fontFamily: "Exo",
                fontStyle: "bold",
                fontSize: 30,
                color: "#000000",
            }
        ).setOrigin(0.5);

        new TextOverlay(this, celebText, { label: celebTextVal });
        
        announceToScreenReader(celebTextVal);

        const streakAnimation = this.addSprite(this.display.width / 2, this.display.height / 2, 'streak_animation_0').setOrigin(0.5).setAlpha(0.8);

        // Create the mascot sprite in the center
        const mascotImage = this.addImage(
            this.display.width / 2,
            this.display.height / 2 + 40,
            "mascot_image"
        ).setOrigin(0.5);

        new ImageOverlay(this, mascotImage, { label: i18n.t("common.characterCelebrating") });

        const mascotEyes = this.addSprite(
            this.display.width / 2 + 5,
            this.display.height / 2 - 92,
            "mascot_eyes"
        ).setOrigin(0.5);


        // Play the celebration animation
        mascotEyes.play("mascot_eyes_blink");
        streakAnimation.play("power_up");

        // Show success animation only if showSuccessCheckmark is true
        if (this.showSuccessCheckmark) {
            this.showSuccessAnimation();
        }

        // When the animation completes, remove the overlay and sprite
        this.time.delayedCall(3000, () => {
            celebText.destroy();
            mascotEyes.destroy();
            mascotImage.destroy();
            this.callback?.();
            this.scene.resume("GameScene");
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
                new ImageOverlay(this, icon, { label: i18n.t('common.correct') + ' ' + i18n.t('common.icon') });
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
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen`);
        scene.load.image("correct_icon", "correct_icon.png");

        scene.load.setPath(`${ASSETS_PATHS.ATLAS}/scorestar`);
        scene.load.atlas("scorestar", "score_star.png", "score_star.json");
    }
}
