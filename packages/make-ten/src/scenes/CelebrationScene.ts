import { BaseScene, ButtonHelper, i18n, ScoreHelper, ProgressBar, ScoreCoins, setSceneBackground, ImageOverlay, GameConfigManager} from "@k8-games/sdk";
import { AssetsConfig } from "../config/AssetsConfig";
import { GameSceneConfig as Config } from "../config/GameSceneConfig";
import { MuteButton } from "../components/MuteButton";
import { createWizardCelebrateAnimation } from "../animations";
import { GameLogic } from "../GameLogic";

export class CelebrationScene extends BaseScene {
    private wizard: Phaser.GameObjects.Sprite;
    private streak: number;
    private progressBar!: ProgressBar;
    private progress: number;
    private scoreCoins!: ScoreCoins;
    private scoreHelper!: ScoreHelper;

    constructor() {
        super("CelebrationScene");
    }

    init(data: { scoreHelper: ScoreHelper; gameLogic: GameLogic }) {
        this.scoreHelper = data.gameLogic.scoreHelper;
        this.streak = this.scoreHelper.getCurrentStreak();
        const currentRound = data.gameLogic.getCurrentRound();
        const totalRounds = data.gameLogic.getMaxRounds();
        this.progress = currentRound / totalRounds;
        ProgressBar.init(this);
    }

    create() {
        this.setupBackground();
        this.createScoreDisplay();
        this.createPauseButton();
        this.createMuteButton();
        this.createWizardCelebrate();
        this.progressBar = new ProgressBar(this, "dark", i18n, { animateStreakAndStars: false });
        this.progressBar.create(
            this.getScaledValue(this.display.width / 2),
            this.getScaledValue(70)
        );

        this.progressBar.drawProgressFill(this.progress, this.streak);
        // Return to game scene after animation
        this.time.delayedCall(3000, () => {
            this.scene.stop();
            this.scene.resume("GameScene");
        });
    }

    private setupBackground() {
        setSceneBackground('assets/images/celebration_background.png');
        this.cameras.main.setBackgroundColor(0x000000);
        this.addImage(
            this.display.width / 2,
            this.display.height / 2,
            AssetsConfig.KEYS.IMAGES.CELEBRATION_BACKGROUND
        )
            .setOrigin(0.5)
            .setDepth(-2)
            .setDisplaySize(this.getScaledValue(this.display.width), this.getScaledValue(this.display.height));
    }

    private createScoreDisplay() {
        this.scoreCoins = new ScoreCoins(this, this.scoreHelper, i18n, "purple");
        this.scoreCoins.create(
            this.getScaledValue(87),
            this.getScaledValue(61)
        );

        this.scoreCoins.setFrame("coin0018");
        this.scoreCoins.setComboText(
            `${this.scoreHelper.getCurrentMultiplier()}`,
            true
        );
        this.scoreCoins.setScore(this.scoreHelper.getTotalScore());
    }

    private createMuteButton() {
        new MuteButton(
            this,
            Config.MUTE_BUTTON.POSITION.X,
            Config.MUTE_BUTTON.POSITION.Y
        );
    }

    private createPauseButton() {
        ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: AssetsConfig.KEYS.BUTTONS.ICON_BTN,
                hover: AssetsConfig.KEYS.BUTTONS.ICON_BTN_HOVER,
                pressed: AssetsConfig.KEYS.BUTTONS.ICON_BTN_PRESSED,
            },
            icon: AssetsConfig.KEYS.BUTTONS.PAUSE_BTN,
            label: i18n.t("common.pause"),
            x: this.display.width - 54,
            y: 64,
            onClick: () => {
                this.scene.pause();
                this.scene.launch("PauseScene", {
                    parentScene: "CelebrationScene",
                });
                this.scene.bringToTop("PauseScene");
            },
            raisedOffset: 3.5,
        });
    }

    private createWizardCelebrate() {
        const gameConfigManager = GameConfigManager.getInstance();
        const mode = gameConfigManager.get('mode') || 'make_ten';
        this.wizard = this.addSprite(
            this.display.width / 2,
            this.display.height / 2 + (mode === 'make_20' ? 150 : 100),
            AssetsConfig.KEYS.SPRITES.WIZARD_CELEBRATE
        );

        const streakAnimation = this.addSprite(this.display.width / 2, this.display.height / 2 + (mode === 'make_20' ? 50 : 0), 'streak_animation_0').setOrigin(0.5).setDepth(-1).setAlpha(0.6);

        const wizardOverlay = new ImageOverlay(this, this.wizard, { label: i18n.t("common.wizardCelebrating") });

        this.wizard.once("destroy", () => {
            wizardOverlay.destroy();
        });

        createWizardCelebrateAnimation(this);
        streakAnimation.play("power_up");

        this.wizard.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            this.wizard.destroy();
        });

        this.wizard.play(
            AssetsConfig.KEYS.ANIMATIONS.WIZARD_CELEBRATE_ANIMATION
        );
    }
}
