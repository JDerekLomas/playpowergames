import { BaseScene, i18n, ScoreHelper, ScoreCoins, TextOverlay, announceToScreenReader } from "@k8-games/sdk";
import { ASSETS_PATHS, SUCCESS_TEXT_KEYS } from "../config/common";

export class CelebrationScene extends BaseScene {
    private scoreHelper!: ScoreHelper;
    private callback: () => void;
    private scoreCoins!: ScoreCoins;

    constructor() {
        super("CelebrationScene");
        this.callback = () => { };
    }

    init(data: {
        scoreHelper: ScoreHelper;
        streakColor: number;
        callback: () => void;
    }) {
        this.scoreHelper = data.scoreHelper;
        this.callback = data.callback;

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
        this.addImage(this.display.width / 2, this.display.height / 2, 'celebration_scene_bg').setOrigin(0.5);

        // Add score star
        this.scoreCoins = new ScoreCoins(this, this.scoreHelper, i18n, 'purple');
        this.scoreCoins.create(
            this.getScaledValue(108),
            this.getScaledValue(70)
        );
        this.scoreCoins.setFrame('coin0018');
        this.scoreCoins.setComboText(`${this.scoreHelper.getCurrentMultiplier()}`, true);
        this.scoreCoins.setScore(this.scoreHelper.getTotalScore());

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
                font: "700 46px Exo",
                color: "#6BFF00",
            }
        ).setOrigin(0.5);
        new TextOverlay(this, celebText, { label: celebTextValue });

        announceToScreenReader(celebTextValue);

        // Create the streak animation sprite (initially hidden)
        const streakAnimation = this.addSprite(this.display.width / 2, this.display.height / 2, 'streak_animation_0').setOrigin(0.5).setAlpha(0.6);

        streakAnimation.play('power_up');

        const mascotImage = this.addImage(this.display.width / 2, this.display.height / 2 + 125, 'mascot').setOrigin(0.5);

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
        scene.load.image('celebration_scene_bg', 'bg.png');
        scene.load.image('mascot', 'mascot.png');

        scene.load.setPath(`${ASSETS_PATHS.ATLAS}/streak_animation`);
        scene.load.atlas('streak_animation_0', 'texture-0.png', 'texture-0.json');
        scene.load.atlas('streak_animation_1', 'texture-1.png', 'texture-1.json');
        scene.load.atlas('streak_animation_2', 'texture-2.png', 'texture-2.json');
    }
}
