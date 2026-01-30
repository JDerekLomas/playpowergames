import { announceToScreenReader, BaseScene, i18n, ImageOverlay, ProgressBar, ScoreCoins, ScoreHelper, setSceneBackground, TextOverlay } from "@k8-games/sdk";
import { SUCCESS_TEXT_KEYS, ASSETS_PATHS, COMMON_ASSETS } from "../config/common";

export class CelebrationScene extends BaseScene {
    private progressBar!: ProgressBar;
    private progress: number;
    private scoreHelper!: ScoreHelper;
    private callback: () => void;
    private scoreCoins!: ScoreCoins;

    constructor() {
        super({ key: "CelebrationScene" });
        this.callback = () => { };
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

        if (!this.anims.exists('mascot_eyes_blink')) {
            this.anims.create({
                key: 'mascot_eyes_blink',
                frames: 'mascot_eyes',
                frameRate: 24,
                repeat: 1,
                hideOnComplete: true
            })
        }

        ProgressBar.init(this);
    }

    create() {
        setSceneBackground('assets/images/common/bg.png');
        this.addImage(this.display.width / 2, this.display.height / 2, COMMON_ASSETS.BACKGROUND.KEY).setOrigin(0.5);
        this.progressBar = new ProgressBar(this, 'light', i18n, { animateStreakAndStars: false });

        // Scoreboard
        this.scoreCoins = new ScoreCoins(this, this.scoreHelper, i18n, 'blue');
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
        );

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
                fontFamily: "Exo",
                fontStyle: "bold",
                fontSize: 30,
                color: "#000000",
            }
        ).setOrigin(0.5);
        new TextOverlay(this, celebText, { label: celebTextValue });

        announceToScreenReader(celebTextValue);

        const streakAnimation = this.addSprite(this.display.width / 2, this.display.height / 2, 'streak_animation_0').setOrigin(0.5).setAlpha(0.8);

        // Create the mascot sprite in the center
        const mascotImage = this.addImage(
            this.display.width / 2,
            this.display.height / 2 + 40,
            "mascot_image"
        ).setOrigin(0.5);

        new ImageOverlay(this, mascotImage, { label: i18n.t('common.characterCelebrating') });

        const mascotEyes = this.addSprite(
            this.display.width / 2 + 5,
            this.display.height / 2 - 92,
            "mascot_eyes"
        ).setOrigin(0.5);


        // Play the celebration animation
        mascotEyes.play("mascot_eyes_blink");
        streakAnimation.play("power_up");

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

    static _preload(scene: BaseScene) {
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen`);
        scene.load.image("correct_icon", "correct_icon.png");

        scene.load.setPath(`${ASSETS_PATHS.ATLAS}/scorestar`);
        scene.load.atlas("scorestar", "score_star.png", "score_star.json");

        scene.load.setPath(`${ASSETS_PATHS.ATLAS}/mascot`);
        scene.load.atlas("mascot_sprite", "mascot.png", "mascot.json");
    }
}
