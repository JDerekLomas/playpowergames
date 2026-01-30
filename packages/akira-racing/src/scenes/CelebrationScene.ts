import { BaseScene, i18n, ProgressBar, ScoreHelper, ScoreCoins, setSceneBackground, TextOverlay, announceToScreenReader } from "@k8-games/sdk";
import { ASSETS_PATHS, SUCCESS_TEXT_KEYS } from "../config/common";

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

        const car = this.registry.get('selected_car');
        this.addImage(this.display.width / 2, this.display.height / 2, `${car}_car_bg`).setOrigin(0.5);

        this.progressBar = new ProgressBar(this, 'dark', i18n, { animateStreakAndStars: false });

        // Add score star
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
            this.display.height / 2 - 200,
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

        this.time.delayedCall(3000, () => {
            celebText.destroy();
            streakAnimation.destroy();
            this.callback?.();
            this.scene.resume("GameScene");
            this.scene.stop();
        });
    }

    static _preload(scene: BaseScene) {
        scene.load.setPath('assets/images/celebration_screen');
        scene.load.image('red_car_bg', 'red_car_bg.png');
        scene.load.image('yellow_car_bg', 'yellow_car_bg.png');
        scene.load.image('pink_car_bg', 'pink_car_bg.png');

        scene.load.setPath(`${ASSETS_PATHS.ATLAS}/streak_animation`);
        scene.load.atlas('streak_animation_0', 'texture-0.png', 'texture-0.json');
        scene.load.atlas('streak_animation_1', 'texture-1.png', 'texture-1.json');
        scene.load.atlas('streak_animation_2', 'texture-2.png', 'texture-2.json');
    }
}
