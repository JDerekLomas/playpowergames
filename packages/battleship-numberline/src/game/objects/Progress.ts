import { i18n } from '@k8-games/sdk';
import { BaseScene } from '../scenes/BaseScene';

interface ProgressConfig {
    x: number;
    y: number;
    emptyImage: string;
    fullImage: string;
    value?: number;
    fontSize?: number;
    fontColor?: string;
    fontFamily?: string;
}

// not implemented with container because of masking issue on the container child
// issue: https://github.com/phaserjs/phaser/issues/6177
export class Progress {
    private scene: BaseScene;
    private value: number;
    private progressText: Phaser.GameObjects.Text;
    private progressBarTitle: Phaser.GameObjects.Text;
    private progressBarEmpty: Phaser.GameObjects.Image;
    private progressBarFull: Phaser.GameObjects.Image;
    private maskGraphics: Phaser.GameObjects.Graphics;
    private currentMaskWidth: number = 0;

    constructor(scene: BaseScene, config: ProgressConfig) {
        this.scene = scene;
        this.value = config.value || 0;

        const x = Math.round(config.x);
        const y = Math.round(config.y);

        // Create empty progress bar (base)
        this.progressBarEmpty = scene.addImage(x, y + 10, config.emptyImage).setOrigin(0, 0.5).setScale(0.24);

        // Create full progress bar (overlay)
        this.progressBarFull = scene.addImage(x, y + 10, config.fullImage).setOrigin(0, 0.5).setScale(0.24);

        // Create mask
        this.maskGraphics = scene.add.graphics();
        const mask = this.maskGraphics.createGeometryMask();
        this.progressBarFull.setMask(mask);

        // Add title text
        this.progressBarTitle = scene
            .addText(x + 2, y - 15, i18n.t('common.averageAccuracy'), {
                fontSize: 20,
                color: config.fontColor || '#FFFFFF',
                fontFamily: config.fontFamily || 'Arial',
            })
            .setOrigin(0, 0.5);

        // Add percentage text
        this.progressText = scene
            .addText(x + 170, y + 8, `${this.value}%`, {
                fontSize: `${config.fontSize || 24}px`,
                color: config.fontColor || '#FFFFFF',
                fontFamily: config.fontFamily || 'Arial',
            })
            .setOrigin(0, 0.5);

        // Initial mask update
        this.updateMask();
    }

    setValue(value: number): void {
        const newValue = Phaser.Math.Clamp(value, 0, 100);
        const targetWidth = this.progressBarEmpty.displayWidth * (newValue / 100);

        // Create tween for smooth animation
        this.scene.tweens.add({
            targets: { width: this.currentMaskWidth },
            width: targetWidth,
            duration: 500,
            ease: 'Cubic.easeOut',
            onUpdate: (tween) => {
                this.currentMaskWidth = tween.getValue();
                this.updateMask();
            },
            onComplete: () => {
                this.value = newValue;
                this.progressText.setText(`${Math.round(this.value)}%`);
            },
        });
    }

    getValue(): number {
        return this.value;
    }

    private updateMask(): void {
        this.maskGraphics.clear();
        this.maskGraphics.fillStyle(0, 0);

        const height = this.progressBarEmpty.displayHeight;
        const x = this.progressBarEmpty.x;
        const y = this.progressBarEmpty.y;

        this.maskGraphics.fillRect(x, y - height / 2, this.currentMaskWidth, height);
    }

    destroy(): void {
        this.progressBarEmpty.destroy();
        this.progressBarFull.destroy();
        this.maskGraphics.destroy();
        this.progressBarTitle.destroy();
        this.progressText.destroy();
    }
}
