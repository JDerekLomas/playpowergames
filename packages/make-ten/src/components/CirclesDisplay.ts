import { DisplayConfig, i18n, ImageOverlay } from "@k8-games/sdk";
import { GameLogic } from "../GameLogic";
import { BaseScene } from "@k8-games/sdk";

export class CirclesDisplay {
    private scene: BaseScene;
    private gameLogic: GameLogic;
    private displayConfig: DisplayConfig;
    public circles: Phaser.GameObjects.Arc[] = [];
    public circleOverlays: Phaser.GameObjects.Image[] = [];
    private symbols: Phaser.GameObjects.Image[] = [];

    constructor(scene: BaseScene, gameLogic: GameLogic) {
        this.scene = scene;
        this.gameLogic = gameLogic;
        this.displayConfig = DisplayConfig.getInstance();
    }

    public create(config: {
        x: number;
        y: number;
        radius?: number;
        padding?: number;
        maxCirclesPerRow?: number;
        animate?: boolean;
        totalCircles?: number;
    }): void {
        const {
            x: startX,
            y: startY,
            radius = 37.27 / 2,
            padding = 60,
            maxCirclesPerRow = 5,
            animate = false,
            totalCircles = 10,
        } = config;
        this.clear();

        for (let i = 0; i < totalCircles; i++) {
            const isSecondRow = i >= maxCirclesPerRow;
            const x = (animate ? this.scene.display.width : startX) +
                        (isSecondRow ? (i - maxCirclesPerRow) * padding : i * padding);
            const y = isSecondRow ? startY + padding : startY;

            const { color, symbol } = this.gameLogic.getCircleState(i);

            // Create circle
            const circle = this.scene.addCircle(x, y, radius - 2, color);
            const strokeColor = color === 0xffd400 ? color : 0xffffff;
            circle.setStrokeStyle(this.scene.getScaledValue(3), strokeColor);
            this.circles.push(circle);

            if (symbol) {
                this.symbols.push(
                    this.scene.addImage(x, y, symbol).setScale(0.8)
                );
            }
        }

        if (!document.getElementById('circle-overlays')) {
            const div = document.createElement('div');
            div.id = 'circle-overlays';
            this.scene.add.dom(0, 0, div, {
                style: {
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    width: '100%',
                    height: '100%',
                },
            })
        }

        if (animate) {
            const animateAmount = this.circles[0].x - this.scene.getScaledValue(startX);
            for (let i = 0; i < this.circles.length; i++) {
                this.scene.tweens.add({
                    targets: this.circles[i],
                    x: "-=" + animateAmount,
                    duration: 500,
                    ease: 'Linear',
                    onComplete: () => {
                        this.createCircleOverlay(this.circles[i]);
                    }
                })  
            }
        } else {
            this.circles.forEach((circle) => {
                this.createCircleOverlay(circle);
            });
        }
    }

    private createCircleOverlay(circle: Phaser.GameObjects.Arc): void {
        if (!circle) return;
        
        const circleImage = this.scene.addImage(circle.x / this.scene.display.scale, circle.y / this.scene.display.scale, 'checkmark').setAlpha(0);
        circleImage.setDisplaySize(circle.radius * 2, circle.radius * 2);
        this.circleOverlays.push(circleImage);
        
        const circleIndex = this.circles.indexOf(circle);
        const isHighlighted = this.gameLogic.getCircleState(circleIndex).color === 0xffd400;
        const totalCircles = this.circles.length;
        const label = isHighlighted ? i18n.t('common.filledCircle', { number: circleIndex + 1, total: totalCircles }) : i18n.t('common.emptyCircle', { number: circleIndex + 1, total: totalCircles });
        const imageOverlay = new ImageOverlay(this.scene, circleImage, { label: label });
        const div = document.getElementById('circle-overlays');
        if (div) {
            div.appendChild(imageOverlay.element);
        }
    }

    public animateToLeft(): void {
        this.circleOverlays.forEach((circle) => circle.destroy());
        this.circleOverlays = [];
        
        this.circles.forEach((circle) => {
            this.scene.tweens.killTweensOf(circle);
        });
        
        const animateAmount = this.circles[0].x + this.scene.getScaledValue(this.scene.display.width / 2);
        for (let i = 0; i < this.circles.length; i++) {
            this.scene.tweens.add({
                targets: this.circles[i],
                x: "-=" + animateAmount,
                duration: 500,
                ease: 'Linear',
            });
        }
    }

    public clear(): void {
        this.circles.forEach((circle) => {
            this.scene.tweens.killTweensOf(circle);
            if (
                circle instanceof Phaser.GameObjects.Image ||
                circle instanceof Phaser.GameObjects.Arc
            ) {
                circle.destroy();
            }
        });
        this.circleOverlays.forEach((circleOverlay) => circleOverlay.destroy());
        this.circleOverlays = [];
        this.symbols.forEach((symbol) => {
            this.scene.tweens.killTweensOf(symbol);
            symbol.destroy();
        });
        this.circles = [];
        this.symbols = [];
    }

    public popCircle(index: number): void {
        const circle = this.circles[index];
        const number = this.scene.addText(circle.x / this.scene.display.scale, circle.y / this.scene.display.scale + 2, (index + 1).toString(), {
            font: '700 18px Exo',
            color: '#000000',
        }).setOrigin(0.5);
        // Add a tween for the pop-in animation with bounce and fade-in effects
        this.scene.tweens.add({
            targets: circle,
            scale: 1.2,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                this.scene.tweens.add({
                    targets: circle,
                    scale: 1,
                    duration: 300,
                    ease: 'Power2',
                });
            },
        });

        this.scene.tweens.add({
            targets: number,
            scale: this.scene.getScaledValue(1.2),
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                this.scene.tweens.add({
                    targets: number,
                    scale: this.scene.getScaledValue(1),
                    duration: 300,
                    ease: 'Power2',
                });
            }
        });
    }  

    public pulseCircle(index: number): void {
        const circle = this.circles[index];
        this.scene.tweens.add({
            targets: circle,
            scale: { from: 1, to: 1.2 },
            alpha: { from: 1, to: 0.8 },
            duration: 400,
            yoyo: true,
            repeat: 1,
            ease: 'Sine.easeInOut',
        });
    }

    public update(): void {
        if (this.circles.length === 0) {
            this.create({
                x: 521,
                y: 200,
            });
        } else {
            this.create({
                x: this.circles[0].x / this.displayConfig.scale,
                y: this.circles[0].y / this.displayConfig.scale,
                radius: this.circles[0].radius / this.displayConfig.scale + 2,
                totalCircles: this.circles.length,
                maxCirclesPerRow: this.circles.length / 2,
            });
        }
    }
}
