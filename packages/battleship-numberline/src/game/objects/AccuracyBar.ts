import { i18n, ImageOverlay, TextOverlay } from '@k8-games/sdk';
import { BaseScene } from '../scenes/BaseScene';

interface AccuracyBarConfig {
    x: number;
    y: number;
    width: number;
    height: number;
    iconKey: string;
    fontFamily: string;
}

export class AccuracyBar {
    private scene: BaseScene;
    private container: Phaser.GameObjects.Container;
    private background: Phaser.GameObjects.Rectangle;
    private barBg: Phaser.GameObjects.Rectangle;
    private barFill: Phaser.GameObjects.Rectangle;
    private barFillRightBorder: Phaser.GameObjects.Rectangle;
    private icon: Phaser.GameObjects.Image;
    private label: Phaser.GameObjects.Text;
    private percentText: Phaser.GameObjects.Text;
    private hideTimer?: Phaser.Time.TimerEvent;
    private width: number;
    private height: number;
    private fontFamily: string;
    private accuracyIconOverlay?: ImageOverlay;
    private accuracyLabelOverlay?: TextOverlay;
    private accuracyPercentOverlay?: TextOverlay;

    constructor(scene: BaseScene, config: AccuracyBarConfig) {
        this.scene = scene;
        this.width = config.width;
        this.height = config.height;
        this.fontFamily = config.fontFamily;

        // Background bar
        this.background = scene.addRectangle(0, 0, this.width, this.height, 0x061A1B).setOrigin(0.5);

        // Progress bar background

        const progressBar = scene.add.container(scene.getScaledValue(10), 0);

        this.barBg = scene
            .addRectangle(0, -12, 93, 22, 0xe1dfeb)
            .setOrigin(0, 0.5)
            .setStrokeStyle(scene.getScaledValue(3), 0x000000);

        // Progress bar fill
        this.barFill = scene.addRectangle(3 / 2, -12, 0, 20, 0x6bff00).setOrigin(0, 0.5);

        this.barFillRightBorder = scene.addRectangle(0, -12, 3, 20, 0x000000).setOrigin(0.5);

        progressBar.add([this.barBg, this.barFill, this.barFillRightBorder]);

        // Icon
        this.icon = scene.addImage(-180, -12, config.iconKey).setOrigin(0, 0.5);

        // Label
        this.label = scene
            .addText(-110, -12, i18n.t(`common.accuracy`), {
                font: `700 24px ${this.fontFamily}`,
            })
            .setOrigin(0, 0.5);

        // Percentage text
        this.percentText = scene
            .addText(180, -12, '0%', {
                font: `700 24px ${this.fontFamily}`,
            })
            .setOrigin(1, 0.5);

        this.container = scene.add.container(scene.getScaledValue(config.x), scene.getScaledValue(config.y), [
            this.background,
            progressBar,
            this.icon,
            this.label,
            this.percentText,
        ]);
        this.container.setDepth(1000);
        this.container.setVisible(false);

        this.accuracyIconOverlay = new ImageOverlay(scene, this.icon, { label: i18n.t('common.accuracy') + ' ' + i18n.t('common.icon') });
        this.accuracyLabelOverlay = new TextOverlay(scene, this.label, { label: i18n.t('common.accuracy') });
        this.accuracyPercentOverlay = new TextOverlay(scene, this.percentText, { label: '0%' });
        this.accuracyIconOverlay?.setAriaHidden(true);
        this.accuracyLabelOverlay?.setAriaHidden(true);
        this.accuracyPercentOverlay?.setAriaHidden(true);
    }

    show(percent: number, duration = 2000) {
        this.setValue(percent);
        this.container.setVisible(true);

        const originalY = this.container.y;
        const offScreenY = originalY + this.container.getBounds().height;

        this.accuracyIconOverlay?.setAriaHidden(false);
        this.accuracyLabelOverlay?.setAriaHidden(false);
        this.accuracyPercentOverlay?.setAriaHidden(false);
        this.container.y = offScreenY;

        this.scene.tweens.add({
            targets: this.container,
            y: originalY,
            duration: 300,
            ease: 'Cubic.easeOut',
        });
        if (this.hideTimer) this.hideTimer.remove(false);
        this.hideTimer = this.scene.time.delayedCall(duration, () => this.hide(originalY, offScreenY));
    }

    hide(originalY: number, offScreenY: number) {
        this.scene.tweens.add({
            targets: this.container,
            y: offScreenY,
            duration: 300,
            ease: 'Cubic.easeIn',
            onComplete: () => {
                this.container.setVisible(false);
                this.container.y = originalY;
                this.accuracyIconOverlay?.setAriaHidden(true);
                this.accuracyLabelOverlay?.setAriaHidden(true);
                this.accuracyPercentOverlay?.setAriaHidden(true);
            }
        });
    }

    setValue(percent: number) {
        const targetWidth = (93 * percent) / 100;

        // Set percent text immediately
        const roundedPercent = Math.round(percent);
        this.percentText.setText(`${roundedPercent}%`);
        this.accuracyPercentOverlay?.updateContent(`${roundedPercent}%`);

        // Animate only the fill width
        const dummy = { value: 0 };
        this.scene.tweens.add({
            targets: dummy,
            value: targetWidth,
            duration: 500,
            ease: 'Cubic.easeOut',
            onUpdate: () => {
                const scaledWidth = this.scene.getScaledValue(dummy.value);
                const fillColor = this.getFillColor(roundedPercent);
                this.barFill.setFillStyle(fillColor);
                this.barFill.setSize(scaledWidth, this.scene.getScaledValue(20));
                this.barFillRightBorder.setX(scaledWidth);
            },
        });
    }

    private getFillColor(percent: number) {
        let color;
        if (percent <= 20) {
            color = 0xff0000;
        } else if (percent <= 50) {
            color = 0xffff00;
        } else {
            color = 0x6bff00;
        }
        return color;
    }

    getContainer() {
        return this.container;
    }

    destroy() {
        this.container.destroy();
    }
}
