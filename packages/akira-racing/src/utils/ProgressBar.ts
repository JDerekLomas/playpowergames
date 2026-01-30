import { BaseScene } from "@k8-games/sdk";

export class ProgressBar {
    private progressBarContainer?: Phaser.GameObjects.Container;
    private progressBarBg?: Phaser.GameObjects.Image;
    private progressBarFill?: Phaser.GameObjects.Image;
    private progressBarMask?: Phaser.GameObjects.Graphics;
    private progressBarOutline?: Phaser.GameObjects.Graphics;
    private progressBarWidth: number = 0;
    private progressBarHeight: number = 0;
    private progressTween: Phaser.Tweens.Tween | null = null;
    private currentProgress: number = 0;
    private scene: BaseScene;
    private x: number = 0;
    private y: number = 0;
    private progressBarStars?: Phaser.GameObjects.Sprite;
    private starsOffsetX: number = 110;

    constructor(scene: BaseScene) {
        this.scene = scene;
    }

    create(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.progressBarContainer = this.scene.add.container(x, y);

        // Create background image
        this.progressBarBg = this.scene.addImage(0, 0, 'progress_light_bg');
        this.progressBarBg.setOrigin(0.5);
        this.progressBarContainer.add(this.progressBarBg);

        // Get dimensions from the background image
        const bgTexture = this.scene.textures.get('progress_light_bg');
        this.progressBarWidth = bgTexture.getSourceImage().width;
        this.progressBarHeight = bgTexture.getSourceImage().height;

        // Create fill image
        this.progressBarFill = this.scene.addImage(-this.progressBarWidth / 2, 0, 'progress_light_fill_yellow');
        this.progressBarFill.setOrigin(0, 0.5);
        this.progressBarContainer.add(this.progressBarFill);

        // Create animated stars sprite (initially hidden)
        this.progressBarStars = this.scene.addSprite(-this.progressBarWidth / 2, 0, 'progress');
        this.progressBarStars.setOrigin(0.5, 0.5);
        this.progressBarStars.setVisible(false);
        this.progressBarContainer.add(this.progressBarStars);

        // Create mask
        this.progressBarMask = this.scene.add.graphics();
        this.progressBarMask.setVisible(false);
        // Create outline
        this.progressBarOutline = this.scene.add.graphics();
        // Do NOT add the mask or outline to the container, they should not be visible as display objects

        // Apply mask to fill image
        this.progressBarFill.setMask(new Phaser.Display.Masks.GeometryMask(this.scene, this.progressBarMask));

        // Initial draw at 0%
        this.drawProgressFill(0, 0);

        return this.progressBarContainer;
    }

    drawProgressFill(progress: number, currentStreak: number) {
        console.log('drawProgressFill', progress, currentStreak);
        if (!this.progressBarFill || !this.progressBarMask) return;

        // If there's an active tween, stop it
        if (this.progressTween) {
            this.progressTween.stop();
        }

        // Only play the stars animation when streak upgrades to 3, 5, or 7
        if (this.progressBarStars) {
            if (currentStreak === 3 || currentStreak === 5 || currentStreak === 7) {
                this.progressBarStars.setVisible(true);
                this.progressBarStars.play('progress_stars', true);
            } else {
                this.progressBarStars.setVisible(false);
            }
        }

        // Create a tween to animate from current progress to target progress
        this.progressTween = this.scene.tweens.add({
            targets: this,
            currentProgress: progress,
            duration: 500, // Animation duration in milliseconds
            ease: "Power2", // Easing function for smooth animation
            onUpdate: () => {
                // This function is called on each frame of the tween
                this.renderProgressFill(this.currentProgress, currentStreak);
            },
            onComplete: () => {
                // Hide the stars sprite when animation is done
                if (this.progressBarStars) {
                    this.progressBarStars.setVisible(false);
                }
            }
        });
    }

    private renderProgressFill(progress: number, currentStreak: number) {
        if (!this.progressBarFill || !this.progressBarMask) return;

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
        if (this.progressBarOutline) {
            this.progressBarOutline.clear();
            this.progressBarOutline.lineStyle(2, 0x000000, 1);
            this.progressBarOutline.strokeRect(
                fillX,
                fillY - fillHeight / 2,
                this.scene.getScaledValue(this.progressBarWidth * progress),
                fillHeight
            );
        }
        // Move the stars sprite to the right edge of the fill, with offset
        if (this.progressBarStars) {
            this.progressBarStars.x = this.scene.getScaledValue(-this.progressBarWidth / 2 + this.progressBarWidth * progress - this.starsOffsetX);
            this.progressBarStars.y = 0;
        }
    }

    private getStreakTexture(streak: number): string {
        if (streak >= 7) return 'progress_light_fill_purple';
        if (streak >= 5) return 'progress_light_fill_blue';
        if (streak >= 3) return 'progress_light_fill_green';
        return 'progress_light_fill_yellow';
    }

    shake() {
        if (!this.progressBarContainer) return;

        // Create a shake animation
        this.scene.tweens.add({
            targets: this.progressBarContainer,
            x: this.progressBarContainer.x + this.scene.getScaledValue(10),
            duration: 50,
            yoyo: true,
            repeat: 3,
            ease: "Sine.easeInOut",
            onComplete: () => {
                // Reset position after shake
                this.progressBarContainer?.setPosition(
                    this.x,
                    this.y
                );
            },
        });

        // Add a flash effect
        const flash = this.scene.add.rectangle(
            this.progressBarContainer.x,
            this.progressBarContainer.y,
            this.progressBarWidth,
            this.progressBarHeight,
            0xffffff,
            0.7
        );
        flash.setOrigin(0.5);

        // Flash animation
        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 300,
            ease: "Power2",
            onComplete: () => {
                flash.destroy();
            },
        });
    }
}
