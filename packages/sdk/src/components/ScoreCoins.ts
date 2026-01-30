import { BaseScene } from "../core/BaseScene";
import { ImageOverlay } from "../utils/ImageOverlay";
import { I18nHelper } from "../utils/languageHelper";
import { ScoreHelper } from "../utils/ScoreHelper";
import { TextOverlay } from "../utils/TextOverlay";

export type ScoreCoinsTheme = 'light' | 'dark' | 'blue' | 'purple';

const SCORE_COINS_TEXTURES = {
    light: {
        background: 'coin_bg_light',
        star: 'scorestar',
    },
    dark: {
        background: 'coin_bg_dark',
        star: 'scorestar',
    },
    blue: {
        background: 'coin_bg_blue',
        star: 'scorestar',
    },
    purple: {
        background: 'coin_bg_purple',
        star: 'scorestar',
    }
};

export interface ScoreCoinsConfig {
    starOffsetX?: number;  // Default: -36
    starOffsetY?: number;  // Default: 62
    comboOffsetX?: number; // Default: -34
    comboOffsetY?: number; // Default: 2
    scoreOffsetX?: number; // Default: 38
    scoreOffsetY?: number; // Default: 4
}

type InternalConfig = Required<ScoreCoinsConfig>;

export class ScoreCoins {
    private scoreCoinsContainer!: Phaser.GameObjects.Container;
    private backgroundImage!: Phaser.GameObjects.Image;
    private scoreStar!: Phaser.GameObjects.Sprite;
    private comboText!: Phaser.GameObjects.Text;
    private scoreText!: Phaser.GameObjects.Text;
    private scene: BaseScene;
    private scoreHelper: ScoreHelper;
    private theme: ScoreCoinsTheme;
    private config: InternalConfig;
    private i18n: I18nHelper;
    private scoreOverlay?: TextOverlay;
    private comboOverlay?: TextOverlay;

    constructor(scene: BaseScene, scoreHelper: ScoreHelper, i18n: I18nHelper, theme: ScoreCoinsTheme = 'light', config: ScoreCoinsConfig = {}) {
        this.scene = scene;
        this.scoreHelper = scoreHelper;
        this.i18n = i18n;
        this.theme = theme;
        this.config = {
            starOffsetX: config.starOffsetX ?? -38,
            starOffsetY: config.starOffsetY ?? 62,
            comboOffsetX: config.comboOffsetX ?? -36,
            comboOffsetY: config.comboOffsetY ?? 2,
            scoreOffsetX: config.scoreOffsetX ?? 34,
            scoreOffsetY: config.scoreOffsetY ?? 4,
        };
    }

    public static preload(scene: Phaser.Scene, theme: ScoreCoinsTheme = 'light') {
        scene.load.setPath('assets/components/score_coins/images');
        scene.load.image(`coin_bg_${theme}`, `coin_bg_${theme}.png`);
        scene.load.setPath('assets/components/score_coins/atlas/scorestar');
        scene.load.atlas('scorestar', 'score_star.png', 'score_star.json');

        scene.load.setPath(`assets/components/score_coins/sounds`);
        scene.load.audio('coin_single', 'coin_single.mp3');
        scene.load.audio('coin_multiple', 'coin_multiple.mp3');
    }

    public static init(scene: Phaser.Scene) {
        if (!scene.anims.exists('scoreupdate')) {
            // Create frames array dynamically
            const scoreUpdateFrames = [];
            for (let i = 0; i <= 16; i++) {
                scoreUpdateFrames.push({ key: 'scorestar', frame: `coin${i.toString().padStart(4, '0')}` });
            }

            scene.anims.create({
                key: 'scoreupdate',
                frames: scoreUpdateFrames,
                frameRate: 24,
                repeat: 0,
                hideOnComplete: false
            });
        }

        if (!scene.anims.exists('scoreupgrade')) {
            // Create frames array dynamically
            const otherFrames = [];
            for (let i = 18; i <= 45; i++) {
                otherFrames.push({ key: 'scorestar', frame: `coin${i.toString().padStart(4, '0')}` });
            }

            scene.anims.create({
                key: 'scoreupgrade',
                frames: otherFrames,
                frameRate: 24,
                repeat: 0,
                hideOnComplete: false
            });
        }
    }

    create(x: number, y: number): Phaser.GameObjects.Container {
        this.scoreCoinsContainer = this.scene.add.container(x, y);

        // Add background
        this.backgroundImage = this.scene.addImage(0, 0, SCORE_COINS_TEXTURES[this.theme].background).setOrigin(0.5);
        this.scoreCoinsContainer.add(this.backgroundImage);

        // Add score star
        this.scoreStar = this.scene.addSprite(
            this.config.starOffsetX,
            this.config.starOffsetY,
            SCORE_COINS_TEXTURES[this.theme].star
        ).setOrigin(0.5);
        this.scoreCoinsContainer.add(this.scoreStar);

        // Add combo text
        this.comboText = this.scene.addText(
            this.config.comboOffsetX,
            this.config.comboOffsetY,
            '',
            {
                font: "700 20px Exo",
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5);
        this.scoreCoinsContainer.add(this.comboText);

        // Add score text
        this.scoreText = this.scene.addText(
            this.config.scoreOffsetX,
            this.config.scoreOffsetY,
            `${this.i18n.formatNumber(0)}`,
            {
                font: "700 26px Exo",
                color: '#ffffff',
            }
        ).setOrigin(0.5);
        this.scoreCoinsContainer.add(this.scoreText);

        new ImageOverlay(this.scene, this.backgroundImage, { label: "Score coins background" });
        const lang = this.i18n.getLanguage();
        let comboOverlayText = "Score multiplier: " + 1 + "\u00D7";
        if (lang === 'es') {
            comboOverlayText = "Multiplicador de puntuación: " + 1 + "\u00D7";
        }
        this.comboOverlay = new TextOverlay(this.scene, this.comboText, { label: comboOverlayText, tag: 'span', role: 'status' });
        this.scoreOverlay = new TextOverlay(this.scene, this.scoreText, { label: this.i18n.t('game.scoreValue', { value: this.i18n.formatNumber(0) }) as string });

        return this.scoreCoinsContainer;
    }

    private flashRedTint() {
        // Flash animation for background
        this.scene.tweens.add({
            targets: this.backgroundImage,
            tint: 0xff0000,
            duration: 200,
            yoyo: true,
            repeat: 2,
            onComplete: () => {
                this.backgroundImage.clearTint();
            }
        });

        // Flash animation for star
        this.scene.tweens.add({
            targets: this.scoreStar,
            tint: 0xff0000,
            duration: 200,
            yoyo: true,
            repeat: 2,
            onComplete: () => {
                this.scoreStar.clearTint();
                this.scoreStar.setFrame('coin0000');
            }
        });
    }

    updateScoreDisplay(isCorrect?: boolean, hasStreakBroken?: boolean) {
        if (this.scoreText) {
            const score = this.scoreHelper.getTotalScore();
            this.scoreText.setText(`${this.i18n.formatNumber(score)}`);
            this.scoreOverlay?.updateContent(this.i18n.t('game.scoreValue', { value: this.i18n.formatNumber(score) }) as string);
            const currentStreak = this.scoreHelper.getCurrentStreak();

            if ((currentStreak === 3 || currentStreak === 5 || currentStreak === 7)) {
                this.comboText.setVisible(false);
                this.scene.audioManager.playSoundEffect('coin_multiple');
                this.scoreStar.play('scoreupgrade');
            } else if (hasStreakBroken) {
                this.flashRedTint();
            } else if (isCorrect) {
                this.scene.audioManager.playSoundEffect('coin_single');
                this.scoreStar.play('scoreupdate');
            }

            const currentMultiplier = this.scoreHelper.getCurrentMultiplier();
            const lang = this.i18n.getLanguage();
            let comboOverlayText = "Score multiplier: " + currentMultiplier + "\u00D7";
            if (lang === 'es') {
                comboOverlayText = "Multiplicador de puntuación: " + currentMultiplier + "\u00D7";
            }
            if (currentMultiplier > 1) {
                this.comboText.setText(`${currentMultiplier}\u00D7`);
            } else {
                this.comboText.setText('');
            }
            this.comboOverlay?.updateContent(comboOverlayText);

            // Add a one-time listener for when the animation completes
            this.scoreStar.once('animationcomplete', () => {
                // Set the sprite back to the first frame
                if (currentMultiplier > 1) {
                    this.setFrame('coin0018');
                } else {
                    this.setFrame('coin0000');
                }
                this.comboText.setVisible(true);
            });
        }
    }

    public setFrame(frame: string): void {
        if (this.scoreStar) {
            this.scoreStar.setFrame(frame);
        }
    }

    public setComboText(text: string, visible: boolean = true): void {
        if (this.comboText) {
            this.comboText.setText(`${text}\u00D7`);
            this.comboText.setVisible(visible);
        }
    }

    public setScore(score: number): void {
        if (this.scoreText) {
            this.scoreText.setText(this.i18n.formatNumber(score));
        }
    }
} 