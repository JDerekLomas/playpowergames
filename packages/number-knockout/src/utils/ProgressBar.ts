import { BaseScene } from "@k8-games/sdk";
import { SCORE_COLORS } from "../config/common";

export class ProgressBar {
    private progressBarContainer?: Phaser.GameObjects.Container;
    private progressBarFill?: Phaser.GameObjects.Graphics;
    private progressBarWidth: number = 0;
    private progressBarHeight: number = 0;
    private progressTween: Phaser.Tweens.Tween | null = null;
    private currentProgress: number = 0;
    private scene: BaseScene;

    constructor(scene: BaseScene) {
        this.scene = scene;
    }

    create(x: number, y: number, width: number, height: number) {
        this.progressBarContainer = this.scene.add.container(x, y);
        this.progressBarWidth = width;
        this.progressBarHeight = height;

        const progressBarBg = this.scene.add.graphics();
        progressBarBg.fillStyle(0x726553);     // fill color
        progressBarBg.lineStyle(4, 0x726553);  // outline color and width

        const radius = this.progressBarHeight / 2;

        // Draw the pill shape centered in the container
        progressBarBg.beginPath();
        progressBarBg.moveTo(
            -this.progressBarWidth / 2 + radius,
            -this.progressBarHeight / 2
        );
        progressBarBg.lineTo(
            this.progressBarWidth / 2 - radius,
            -this.progressBarHeight / 2
        );
        progressBarBg.arc(
            this.progressBarWidth / 2 - radius,
            0,
            radius,
            -Math.PI / 2,
            Math.PI / 2
        );
        progressBarBg.lineTo(
            -this.progressBarWidth / 2 + radius,
            this.progressBarHeight / 2
        );
        progressBarBg.arc(
            -this.progressBarWidth / 2 + radius,
            0,
            radius,
            Math.PI / 2,
            -Math.PI / 2
        );
        progressBarBg.closePath();
        progressBarBg.fill();
        progressBarBg.stroke();

        this.progressBarContainer.add(progressBarBg);

        // Create the fill graphics object
        this.progressBarFill = this.scene.add.graphics();
        this.progressBarContainer.add(this.progressBarFill);

        // Initial draw at 0%
        this.drawProgressFill(0, 0);

        return this.progressBarContainer;
    }

    drawProgressFill(progress: number, currentStreak: number) {
        if (!this.progressBarFill) return;

        // If there's an active tween, stop it
        if (this.progressTween) {
            this.progressTween.stop();
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
        });
    }

    private renderProgressFill(progress: number, currentStreak: number) {
        if (!this.progressBarFill) return;

        this.progressBarFill.clear();

        // Get color based on current streak
        const fillColor = this.getStreakColor(currentStreak);

        this.progressBarFill.fillStyle(fillColor);

        const targetWidth = this.progressBarWidth * progress;
        const radius = this.progressBarHeight / 2;

        // Only draw if there's visible progress
        if (progress > 0) {
            this.progressBarFill.beginPath();
            this.progressBarFill.moveTo(
                -this.progressBarWidth / 2 + radius,
                -this.progressBarHeight / 2
            );
            this.progressBarFill.lineTo(
                -this.progressBarWidth / 2 + targetWidth - radius,
                -this.progressBarHeight / 2
            );
            this.progressBarFill.arc(
                -this.progressBarWidth / 2 + targetWidth - radius,
                0,
                radius,
                -Math.PI / 2,
                Math.PI / 2
            );
            this.progressBarFill.lineTo(
                -this.progressBarWidth / 2 + radius,
                this.progressBarHeight / 2
            );
            this.progressBarFill.arc(
                -this.progressBarWidth / 2 + radius,
                0,
                radius,
                Math.PI / 2,
                -Math.PI / 2
            );
            this.progressBarFill.closePath();
            this.progressBarFill.fill();
            this.progressBarFill.stroke();
        }
    }

    private getStreakColor(streak: number): number {
        if (streak >= 7) return SCORE_COLORS.SEVEN_IN_A_ROW;
        if (streak >= 5) return SCORE_COLORS.FIVE_IN_A_ROW;
        if (streak >= 3) return SCORE_COLORS.THREE_IN_A_ROW;
        return SCORE_COLORS.DEFAULT;
    }

    shake() {
        if (!this.progressBarContainer) return;

        // Create a shake animation
        this.scene.tweens.add({
            targets: this.progressBarContainer,
            x: this.progressBarContainer.x + 10,
            duration: 50,
            yoyo: true,
            repeat: 3,
            ease: "Sine.easeInOut",
            onComplete: () => {
                // Reset position after shake
                this.progressBarContainer?.setPosition(
                    this.scene.getScaledValue(this.scene.display.width / 2),
                    this.scene.getScaledValue(80)
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
