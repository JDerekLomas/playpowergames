import { BaseScene, i18n, ScoreHelper, ScoreCoins, TextOverlay, announceToScreenReader } from "@k8-games/sdk";
import { SUCCESS_TEXT_KEYS, ASSETS_PATHS } from "../config/common";

export class CelebrationScene extends BaseScene {
    private scoreHelper!: ScoreHelper;
    private callback: () => void;
    private scoreCoins!: ScoreCoins;

    constructor() {
        super("CelebrationScene")
        this.callback = () => {};
    }

    init(data: {
        scoreHelper: ScoreHelper;
        callback: () => void;
        progress: number;
    }) {
        this.scoreHelper = data.scoreHelper;
        this.callback = data.callback;
    }

    create() {
        // Add background
        const bg = this.addImage(this.display.width / 2, this.display.height / 2, 'bg').setOrigin(0.5);
        bg.setDepth(-2);

        // Add score star
        this.scoreCoins = new ScoreCoins(this, this.scoreHelper, i18n, "blue");
        this.scoreCoins.create(
            this.getScaledValue(87),
            this.getScaledValue(62)
        );
        this.scoreCoins.setFrame("coin0018");
        this.scoreCoins.setComboText(
            `${this.scoreHelper.getCurrentMultiplier()}`,
            true
        );
        this.scoreCoins.setScore(this.scoreHelper.getTotalScore());

        const celebTextVal = i18n.t(
            `common.${
                SUCCESS_TEXT_KEYS[
                    Math.floor(Math.random() * SUCCESS_TEXT_KEYS.length)
                ]
            }`
        );
        const celebText = this.addText(this.display.width / 2, 75, celebTextVal, {
                font: "700 46px Exo",
                color: "#013570",
            }
        ).setOrigin(0.5);

        new TextOverlay(this, celebText, { label: celebTextVal });

        announceToScreenReader(celebTextVal);

        const celebStarsContainer = this.add.container(
            this.getScaledValue(this.display.width / 2),
            this.getScaledValue(75)
        )

        const star1 = this.addImage(
            0 - celebText.width / 2 - 50,
            0,
            "star"
        ).setOrigin(0.5);

        const star2 = this.addImage(
            0 + celebText.width / 2 + 40,
            0 + 35,
            "star"
        ).setOrigin(0.5);

        const star3 = this.addImage(
            0 + celebText.width / 2 + 25,
            0 - 25,
            "star"
        ).setOrigin(0.5).setScale(0.64)

        celebStarsContainer.add(star1);
        celebStarsContainer.add(star2);
        celebStarsContainer.add(star3);

        // Add mascot image
        const mascot = this.addImage(this.display.width / 2 + 150, this.display.height / 2, "mascot");

        this.audioManager.playSoundEffect("positive-sfx");

        // When the animation completes, remove the overlay and sprite
        this.time.delayedCall(3000, () => {
            celebText.destroy();
            celebStarsContainer.destroy();
            mascot.destroy();
            this.callback?.();
            this.scene.resume('GameScene');
            this.scene.stop('CelebrationScene');
        });
    }

    static _preload(scene: BaseScene) {
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/celebration_screen`);
        scene.load.image("star", "star.png");
        scene.load.image("mascot", "mascot.png");
    }
}
