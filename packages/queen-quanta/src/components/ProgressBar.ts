import { BaseScene, announceToScreenReader, i18n } from "@k8-games/sdk";

/**
 * Simple Progress Bar Component
 * 
 * Usage example:
 * 
 * 
 * // In your scene's create method:
 * const progressBar = new ProgressBar(this);
 * const dotXPositions = [0, 50, 100, 150, 200, 250, 300, 350, 400, 450]; // 10 x positions
 * progressBar.create(100, dotXPositions); // y position is optional, defaults to 0
 * 
 * // Update progress (0-100):
 * progressBar.updateProgress(30); // Shows 3 dots (30%)
 * progressBar.updateProgress(70); // Shows 7 dots (70%)
 * progressBar.updateProgress(100); // Shows all 10 dots (100%)
 */

export interface ProgressBarConfig {
    dotImageKey?: string;  // Default: 'filled_dot'
    incorrectDotImageKey?: string;  // Default: 'red_dot'
    animationDuration?: number;  // Default: 300ms
    fadeInDuration?: number;  // Default: 200ms
    dotScale?: number;  // Default: 1
}

type InternalConfig = Required<ProgressBarConfig>;

export class ProgressBar {
    private dots: Phaser.GameObjects.Image[] = [];
    private scene: BaseScene;
    private config: InternalConfig;
    private dotXPositions: number[] = [210.5, 313.5, 416.5, 519.5, 622.5, 725.5, 828.5, 931.5, 1034.5, 1137.5];
    private currentProgress: number = 0;

    constructor(scene: BaseScene, config: ProgressBarConfig = {}) {
        this.scene = scene;
        this.config = {
            dotImageKey: config.dotImageKey ?? 'filled_dot',
            incorrectDotImageKey: config.incorrectDotImageKey ?? 'red_dot',
            animationDuration: config.animationDuration ?? 300,
            fadeInDuration: config.fadeInDuration ?? 200,
            dotScale: config.dotScale ?? 1,
        };
        
        // Initialize dots array
        for (let i = 0; i < 10; i++) {
            this.dots[i] = this.scene.addImage(0, 0, this.config.dotImageKey);
            this.dots[i].setOrigin(0.5);
            this.dots[i].setScale(this.config.dotScale);
            this.dots[i].setAlpha(0); // Start invisible
        }
    }

    create(y: number = 0, dotXPositions: number[] = []): void {
        if (dotXPositions.length > 0) {
            this.dotXPositions = dotXPositions;
        }

        // Position all dots initially
        for (let i = 0; i < 10; i++) {
            if (this.dotXPositions[i] !== undefined) {
                this.dots[i].x = this.scene.getScaledValue(this.dotXPositions[i]);
                this.dots[i].y = this.scene.getScaledValue(y);
            }
        }

        // Announce initial progress
        // TODO: Add i18n
        announceToScreenReader(i18n.t('progressBar.progress', { progress: 0 }));
    }

    updateProgress(progress: number, isIncorrect: boolean = false): void {
        // Ensure progress is between 0 and 100
        const clampedProgress = Math.max(0, Math.min(100, progress));
        
        // Calculate how many dots should be visible (each dot = 10%)
        const dotsToShow = Math.floor(clampedProgress / 10);
        
        // Update dots visibility
        for (let i = 0; i < 10; i++) {
            if (i < dotsToShow) {
                // Show dot with fade in animation
                if (this.dots[i].alpha === 0) {
                    // Change dot image to red if incorrect
                    if (isIncorrect) {
                        this.dots[i].setTexture(this.config.incorrectDotImageKey);
                    }
                    
                    this.scene.tweens.add({
                        targets: this.dots[i],
                        alpha: 1,
                        duration: this.config.fadeInDuration,
                        ease: 'Power2'
                    });
                }
            } else {
                // Hide dot
                this.dots[i].setAlpha(0);
            }
        }

        // Announce progress to screen reader
        announceToScreenReader(i18n.t('progressBar.progress', { progress: clampedProgress }));
        
        this.currentProgress = clampedProgress;
    }

    // Method to update progress with animation
    updateProgressAnimated(targetProgress: number): void {
        const clampedProgress = Math.max(0, Math.min(100, targetProgress));
        
        // Animate from current progress to target progress
        this.scene.tweens.add({
            targets: this,
            currentProgress: clampedProgress,
            duration: this.config.animationDuration,
            ease: "Power2",
            onUpdate: () => {
                this.updateProgress(this.currentProgress);
            },
            onComplete: () => {
                announceToScreenReader(i18n.t('progressBar.progress', { progress: clampedProgress }));
            }
        });
    }

    // Method to reset progress to 0
    reset(): void {
        for (let i = 0; i < 10; i++) {
            this.dots[i].setAlpha(0);
        }
        this.currentProgress = 0;
        announceToScreenReader(i18n.t('progressBar.progress', { progress: 0 }));
    }

    // Method to set progress immediately without animation
    setProgress(progress: number): void {
        this.updateProgress(progress);
    }

    getCurrentProgress(): number {
        return this.currentProgress;
    }
}
