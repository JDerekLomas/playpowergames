import { BaseScene } from '../scenes/BaseScene';

interface TimerConfig {
    x: number;
    y: number;
    radius?: number;
    ringWidth?: number;
    backgroundColor?: number;
    foregroundColor?: number;
    fontSize?: number;
    fontColor?: string;
    fontFamily?: string;
    onComplete?: () => void;
}

export class Timer {
    private scene: BaseScene;
    private x: number;
    private y: number;
    private radius: number;
    private ringWidth: number;
    private backgroundColor: number;
    private foregroundColor: number;
    private seconds: number;
    private timerText: Phaser.GameObjects.Text;
    private timeEvent: Phaser.Time.TimerEvent;
    private ring: Phaser.GameObjects.Graphics;
    private counter: Phaser.Tweens.Tween;
    private onComplete?: () => void;

    constructor(scene: BaseScene, config: TimerConfig) {
        this.scene = scene;
        this.x = Math.round(scene.getScaledValue(config.x));
        this.y = Math.round(scene.getScaledValue(config.y));
        this.radius = scene.getScaledValue(config.radius || 50);
        this.ringWidth = scene.getScaledValue(config.ringWidth || 8);
        this.backgroundColor = config.backgroundColor || 0x000000;
        this.foregroundColor = config.foregroundColor || 0xfe0101;
        this.seconds = 30;
        this.onComplete = config.onComplete;

        // Create the ring graphics
        this.ring = this.scene.add.graphics();
        this.drawRing();

        // Create timer text
        this.timerText = scene
            .addText(config.x, config.y, this.seconds.toString(), {
                fontSize: `${config.fontSize || 32}px`,
                color: config.fontColor || '#fe0101',
                fontFamily: config.fontFamily || 'Arial',
            })
            .setOrigin(0.5);

        // Create timer event
        this.timeEvent = this.scene.time.addEvent({
            delay: 1000,
            callback: () => void this.timeEventCallback(),
            callbackScope: this,
            loop: true,
            paused: true,
        });
    }

    private drawRing(progress: number = 0): void {
        this.ring.clear();

        // Draw background ring (gray)
        this.ring.lineStyle(this.ringWidth, this.backgroundColor, 1);
        this.ring.beginPath();
        this.ring.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        this.ring.strokePath();

        if (progress > 0) {
            // Draw foreground ring (progress)
            this.ring.lineStyle(this.ringWidth, this.foregroundColor, 1);
            this.ring.beginPath();

            // Start from top (270 degrees) and draw anticlockwise
            const startAngle = Phaser.Math.DegToRad(270);
            const endAngle = Phaser.Math.DegToRad(270 - progress);

            this.ring.arc(this.x, this.y, this.radius, startAngle, endAngle, true);
            this.ring.strokePath();
        }
    }

    private timeEventCallback(): void {
        this.seconds--;
        this.timerText.setText(this.seconds >= 10 ? this.seconds.toString() : `0${this.seconds}`);

        if (this.seconds === 0) {
            this.stop();
            this.onComplete?.();
        }
    }

    start(seconds: number): void {
        this.stop();
        this.seconds = seconds;
        this.timerText.setText(this.seconds.toString());
        this.timeEvent.paused = false;

        // Create progress tween
        this.counter = this.scene.tweens.addCounter({
            from: 0,
            to: 359,
            duration: seconds * 1000,
            ease: 'Linear',
            onUpdate: (tween) => {
                this.drawRing(tween.getValue());
            },
        });
    }

    stop(): void {
        this.timeEvent.paused = true;
        if (this.counter) {
            this.counter.stop();
        }
        this.seconds = 30;
        this.drawRing(0);
    }

    pause(): void {
        this.timeEvent.paused = true;
        if (this.counter) {
            this.counter.pause();
        }
    }

    resume(): void {
        this.timeEvent.paused = false;
        if (this.counter) {
            this.counter.resume();
        }
    }

    destroy(): void {
        this.timeEvent.destroy();
        if (this.counter) {
            this.counter.stop();
        }
        this.ring.destroy();
        this.timerText.destroy();
    }
}
