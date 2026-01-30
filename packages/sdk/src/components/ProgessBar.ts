import { BaseScene } from "../core/BaseScene";
import { announceToScreenReader } from "../utils/ariaAnnouncer";
import { I18nHelper } from "../utils/languageHelper";
import { SCORE_COUNTS } from "../utils/ScoreHelper";
import { ProgressBarOverlay } from "../utils/ProgressBarOverlay";
import { TextOverlay } from "../utils/TextOverlay";

export type ProgressBarTheme = 'light' | 'dark';

const PROGRESS_BAR_TEXTURES = {
    light: {
        background: 'progress_light_bg',
        fill: {
            default: 'progress_dark_fill_yellow',
            level1: 'progress_dark_fill_green',
            level2: 'progress_dark_fill_blue',
            level3: 'progress_dark_fill_purple',
        },
        stars: 'progress',
        starsAnimation: 'progress_stars',
    },
    dark: {
        background: 'progress_dark_bg',
        fill: {
            default: 'progress_dark_fill_yellow',
            level1: 'progress_dark_fill_green',
            level2: 'progress_dark_fill_blue',
            level3: 'progress_dark_fill_purple',
        },
        stars: 'progress',
        starsAnimation: 'progress_stars',
    }
};

const SCORE_COLORS = {
    DEFAULT: 0xEBB800,
    THREE_IN_A_ROW: 0x57CC02,
    FIVE_IN_A_ROW: 0x00ADFF,
    SEVEN_IN_A_ROW: 0xC13BFF,
};

export interface ProgressBarConfig {
    streakLevels?: {
        level1: number;  // Default: 3
        level2: number;  // Default: 5
        level3: number;  // Default: 7
    };
    starsOffsetX?: number;  // Default: 110
    animationDuration?: number;  // Default: 500ms
    outlineColor?: number;  // Default: 0x000000
    outlineWidth?: number;  // Default: 2
    animateStreakAndStars?: boolean;  // Default: true
}

type InternalConfig = Required<ProgressBarConfig>;

export class ProgressBar {

    private progressBarContainer: Phaser.GameObjects.Container;
    private progressBarBg: Phaser.GameObjects.Image;
    private progressBarFill: Phaser.GameObjects.Image;
    private progressBarMask: Phaser.GameObjects.Graphics;
    private progressBarOutline: Phaser.GameObjects.Graphics;
    private progressBarWidth: number = 0;
    private progressTween: Phaser.Tweens.Tween | null = null;
    private currentProgress: number = 0;
    private scene: BaseScene;
    private x: number = 0;
    private y: number = 0;
    private progressBarStars?: Phaser.GameObjects.Sprite;
    private theme: ProgressBarTheme;
    private config: InternalConfig;
    private progressBarFlash?: Phaser.GameObjects.Sprite;
    private streakText!: Phaser.GameObjects.Text;
    private streakTextOverlay!: TextOverlay;
    private streakFire!: Phaser.GameObjects.Image;
    private streakTextContainer!: Phaser.GameObjects.Container;
    private i18n!: I18nHelper;
    private progressBarOverlay!: ProgressBarOverlay;

    constructor(scene: BaseScene, theme: ProgressBarTheme = 'light', i18n: I18nHelper, config: ProgressBarConfig = {}) {
        this.scene = scene;
        this.theme = theme;
        this.i18n = i18n;
        this.config = {
            streakLevels: config.streakLevels || { level1: 3, level2: 5, level3: 7 },
            starsOffsetX: config.starsOffsetX ?? 110,
            animationDuration: config.animationDuration ?? 500,
            outlineColor: config.outlineColor ?? 0x000000,
            outlineWidth: config.outlineWidth ?? 2,
            animateStreakAndStars: config.animateStreakAndStars ?? true,
        };
        // Initialize container and required game objects
        this.progressBarContainer = this.scene.add.container(0, 0);
        this.progressBarBg = this.scene.addImage(0, 0, PROGRESS_BAR_TEXTURES[this.theme].background);
        this.progressBarFill = this.scene.addImage(0, 0, PROGRESS_BAR_TEXTURES[this.theme].fill.default);
        this.progressBarMask = this.scene.add.graphics();
        this.progressBarOutline = this.scene.add.graphics();
    }

    static preload(scene: Phaser.Scene, theme: ProgressBarTheme = 'light') {
        scene.load.setPath('assets/components/progress_bar/images');
        const textures = PROGRESS_BAR_TEXTURES[theme];
        scene.load.image(textures.background, `${textures.background}.png`);
        scene.load.image(textures.fill.default, `${textures.fill.default}.png`);
        scene.load.image(textures.fill.level1, `${textures.fill.level1}.png`);
        scene.load.image(textures.fill.level2, `${textures.fill.level2}.png`);
        scene.load.image(textures.fill.level3, `${textures.fill.level3}.png`);
        scene.load.image('streak_fire', 'streak_fire.png');

        scene.load.setPath('assets/components/progress_bar/atlas/progress');
        scene.load.atlas('progress', 'progress.png', 'progress.json');

        // Preload the shared progress_flash atlas
        scene.load.setPath('assets/components/progress_bar/atlas/progress_flash');
        scene.load.atlas('progress_flash', 'progress_flash.png', 'progress_flash.json');

        scene.load.setPath(`assets/components/progress_bar/sounds`);
        scene.load.audio('streak_sfx', 'streak_sfx.mp3');
    }

    public static init(scene: Phaser.Scene) {
        if (!scene.anims.exists('progress_stars')) {
            scene.anims.create({
                key: 'progress_stars',
                frames: 'progress',
                frameRate: 24,
                repeat: 0,
                hideOnComplete: true
            });
        }

        if (!scene.anims.exists('progress_flash')) {
            scene.anims.create({
                key: 'progress_flash',
                frames: "progress_flash",
                frameRate: 24,
                repeat: 0,
                hideOnComplete: true
            });
        }
    }

    createStreakText(x: number, y: number) {
        this.streakTextContainer = this.scene.add.container(x, y + this.scene.getScaledValue(-45));
        this.streakText = this.scene.addText(0, 0, this.i18n.t('game.inARow', { count: 3 }) as string, {
            font: "700 24px Exo",
            color: '#' + 0xEBB800.toString(16).padStart(6, '0'),
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setVisible(false).setAlpha(0);
        const streakTextWidth = this.streakText.displayWidth / this.scene.display.scale;
        this.streakTextContainer.add(this.streakText);
        this.streakFire = this.scene.addImage((streakTextWidth / 2) + 20, 9, 'streak_fire').setVisible(false).setAlpha(0).setOrigin(0.5, 1);
        this.streakTextContainer.add(this.streakFire);

        this.streakTextOverlay = new TextOverlay(this.scene, this.streakText, { label: '', tag: 'span', announce: true });

        // Add subtle up and down animation to the fire
        this.scene.tweens.add({
            targets: this.streakFire,
            scaleY: this.scene.getScaledValue(0.8),
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    create(x: number, y: number): Phaser.GameObjects.Container {
        this.x = x;
        this.y = y;
        this.progressBarContainer.setPosition(x, y);
        this.createStreakText(x, y);

        // Add flash animation sprite behind everything
        this.progressBarFlash = this.scene.addSprite(0, -6, 'progress_flash');
        this.progressBarFlash.setOrigin(0.5);
        this.progressBarFlash.setVisible(false);
        this.progressBarContainer.addAt(this.progressBarFlash, 0); // Add at the back

        // Setup background image
        this.progressBarBg.setOrigin(0.5);
        this.progressBarContainer.add(this.progressBarBg);

        // Get dimensions from the background image
        const bgTexture = this.scene.textures.get(PROGRESS_BAR_TEXTURES[this.theme].fill.default);
        this.progressBarWidth = bgTexture.getSourceImage().width;

        // Setup fill image
        this.progressBarFill.setPosition(this.scene.getScaledValue(-this.progressBarWidth / 2), this.scene.getScaledValue(-6));
        this.progressBarFill.setOrigin(0, 0.5);
        this.progressBarContainer.add(this.progressBarFill);

        // Create animated stars sprite
        this.progressBarStars = this.scene.addSprite(-this.progressBarWidth / 2, this.scene.getScaledValue(-6), PROGRESS_BAR_TEXTURES[this.theme].stars);
        this.progressBarStars.setOrigin(0.5, 0.5);
        this.progressBarStars.setVisible(false);
        this.progressBarContainer.add(this.progressBarStars);

        // Setup mask
        this.progressBarMask.setVisible(false);

        // Apply mask to fill image
        this.progressBarFill.setMask(new Phaser.Display.Masks.GeometryMask(this.scene, this.progressBarMask));

        // Create overlay for screen reader accessibility
        this.progressBarOverlay = new ProgressBarOverlay(
            this.scene,
            this.progressBarContainer
        );

        return this.progressBarContainer;
    }

    getStreakColor(streak: number): number {
        if (streak >= SCORE_COUNTS[2]) return SCORE_COLORS.SEVEN_IN_A_ROW;
        if (streak >= SCORE_COUNTS[1]) return SCORE_COLORS.FIVE_IN_A_ROW;
        if (streak >= SCORE_COUNTS[0]) return SCORE_COLORS.THREE_IN_A_ROW;
        return SCORE_COLORS.DEFAULT;
    }

    updateStreakText(progress: number, currentStreak?: number) {
        if (!this.config.animateStreakAndStars) {
            this.streakText.setText(this.i18n.t('game.inARow', { count: currentStreak }) as string);
            const color = '#' + this.getStreakColor(currentStreak ?? 0).toString(16).padStart(6, '0');
            this.streakText.setColor(color);
            this.streakText.setVisible(true).setAlpha(1);
            this.streakFire.setVisible(true).setAlpha(1);

            const progressBarStartX = this.progressBarFill.getBounds().left;
            const progressFillEndX = (this.progressBarWidth * progress) * this.scene.display.scale;
            const finalX = progressBarStartX + progressFillEndX;
            this.streakTextContainer.setX(finalX);
            return;
        }

        if (currentStreak && currentStreak >= 3) {
            this.streakText.setText(this.i18n.t('game.inARow', { count: currentStreak }) as string);
            this.streakTextOverlay?.updateContent(this.i18n.t('game.inARow', { count: currentStreak }) as string);

            // Animate the streak text and fire
            this.animateStreakText(progress);

            if (SCORE_COUNTS.includes(currentStreak)) {
                // Animate the progress bar container up and down
                this.scene.tweens.add({
                    targets: this.progressBarContainer,
                    y: "-=10",
                    duration: 70,
                    yoyo: true,
                    ease: 'Sine.easeInOut',
                    onComplete: () => {
                        this.scene.tweens.add({
                            targets: this.progressBarContainer,
                            y: "+=10",
                            duration: 70,
                            yoyo: true,
                            ease: 'Sine.easeInOut',
                        });
                    }
                });
            }

            const color = '#' + this.getStreakColor(currentStreak).toString(16).padStart(6, '0');
            this.streakText.setColor(color);
        } else {
            this.scene.tweens.add({
                targets: this.streakTextContainer,
                scaleY: 0,
                duration: 100,
                ease: 'Sine.easeInOut',
                onComplete: () => {
                    this.streakText.setVisible(false).setAlpha(0);
                    this.streakFire.setVisible(false).setAlpha(0);
                    this.streakTextContainer.setScale(1);
                    this.streakTextOverlay?.updateContent('');
                }
            })
        }
    }

    private animateStreakText(progress: number) {
        const progressBarStartX = this.progressBarFill.getBounds().left;
        const progressFillEndX = (this.progressBarWidth * progress) * this.scene.display.scale;
        const finalX = progressBarStartX + progressFillEndX;

        if (!this.streakText.visible) {
            this.streakTextContainer.setX(finalX - this.scene.getScaledValue(100));
            this.streakText.setVisible(true).setAlpha(1);
            this.streakFire.setVisible(true).setAlpha(1);

            // Fade in the streak text and fire
            this.scene.tweens.add({
                targets: [this.streakText, this.streakFire],
                alpha: 1,
                duration: this.config.animationDuration,
                ease: 'Power2'
            });
        }

        // Move the streak text container with the progress bar
        this.scene.tweens.add({
            targets: this.streakTextContainer,
            x: finalX,
            duration: this.config.animationDuration,
            ease: 'Power2'
        });
    }

    drawProgressFill(progress: number, currentStreak: number = 0): void {
        // If there's an active tween, stop it
        if (this.progressTween) {
            this.progressTween.stop();
        }

        // Play the flash animation when streak upgrades to configured levels
        if (this.progressBarFlash && this.config.animateStreakAndStars) {
            if (SCORE_COUNTS.includes(currentStreak)) {
                this.progressBarFlash.setVisible(true);
                this.progressBarFlash.play('progress_flash', true);
                this.scene.audioManager.playSoundEffect('streak_sfx');
            } else {
                this.progressBarFlash.setVisible(false);
            }
        }

        // Update streak text
        this.updateStreakText(progress, currentStreak);

        // Only play the stars animation when streak upgrades to configured levels
        if (this.progressBarStars && PROGRESS_BAR_TEXTURES[this.theme].starsAnimation && this.config.animateStreakAndStars) {
            if (SCORE_COUNTS.includes(currentStreak)) {
                this.progressBarStars.setVisible(true);
                this.progressBarStars.play(PROGRESS_BAR_TEXTURES[this.theme].starsAnimation, true);
            } else {
                this.progressBarStars.setVisible(false);
            }
        }

        if (this.config.animateStreakAndStars) {
            // Create a tween to animate from current progress to target progress
            this.progressTween = this.scene.tweens.add({
                targets: this,
                currentProgress: progress,
                duration: this.config.animationDuration,
                ease: "Power2",
                onUpdate: () => {
                    this.renderProgressFill(this.currentProgress, currentStreak);
                },
                onComplete: () => {
                    if (this.progressBarStars) {
                        this.progressBarStars.setVisible(false);
                    }
                    if (this.progressBarFlash) {
                        this.progressBarFlash.setVisible(false);
                    }
                    const progressPercentage = Math.round(progress * 100);
                    announceToScreenReader(this.i18n?.t('game.progress', { progress: progressPercentage }) as string);
                    // Update progress bar overlay
                    if (this.progressBarOverlay) {
                        this.progressBarOverlay.updateProgress(progress, currentStreak);
                    }
                }
            });
        } else {
            // Set progress directly without animation
            this.currentProgress = progress;
            this.renderProgressFill(progress, currentStreak);
            const progressPercentage = Math.round(progress * 100);
            announceToScreenReader(this.i18n?.t('game.progress', { progress: progressPercentage }) as string);
            // Update progress bar overlay
            if (this.progressBarOverlay) {
                this.progressBarOverlay.updateProgress(progress, currentStreak);
            }
        }
    }

    private renderProgressFill(progress: number, currentStreak: number): void {
        if (progress <= 0) return;

        // Update fill texture based on streak
        const fillTexture = this.getStreakTexture(currentStreak);
        this.progressBarFill.setTexture(fillTexture);

        // Get fill image's world position and height
        const matrix = this.progressBarFill.getWorldTransformMatrix();
        const fillX = matrix.tx;
        const fillY = matrix.ty;
        const fillHeight = this.progressBarFill.displayHeight;

        // Update mask
        this.progressBarMask.clear();
        this.progressBarMask.fillStyle(0xffffff);
        this.progressBarMask.fillRect(
            fillX,
            fillY - fillHeight / 2,
            this.scene.getScaledValue(this.progressBarWidth * progress),
            fillHeight
        );

        // Update outline
        this.progressBarOutline.clear();
        // this.progressBarOutline.lineStyle(this.scene.getScaledValue(this.config.outlineWidth), this.config.outlineColor, 1);
        // this.progressBarOutline.strokeRect(
        //     fillX,
        //     fillY - fillHeight / 2,
        //     this.scene.getScaledValue(this.progressBarWidth * progress),
        //     fillHeight
        // );

        // Move the stars sprite to the right edge of the fill, with offset
        if (this.progressBarStars) {
            this.progressBarStars.x = this.scene.getScaledValue(-this.progressBarWidth / 2 + this.progressBarWidth * progress - this.config.starsOffsetX);
            this.progressBarStars.y = 0;
        }
    }

    private getStreakTexture(streak: number): string {
        const fill = PROGRESS_BAR_TEXTURES[this.theme].fill;
        if (streak >= SCORE_COUNTS[2] && fill.level3) {
            return fill.level3;
        }
        if (streak >= SCORE_COUNTS[1] && fill.level2) {
            return fill.level2;
        }
        if (streak >= SCORE_COUNTS[0] && fill.level1) {
            return fill.level1;
        }
        return fill.default;
    }

    shake(): void {
        // Create a shake animation
        this.scene.tweens.add({
            targets: this.progressBarContainer,
            x: this.progressBarContainer.x + this.scene.getScaledValue(10),
            duration: 50,
            yoyo: true,
            repeat: 3,
            ease: "Sine.easeInOut",
            onComplete: () => {
                this.progressBarContainer.setPosition(this.x, this.y);
            },
        });
    }

    getContainer(): Phaser.GameObjects.Container {
        return this.progressBarContainer;
    }
}
