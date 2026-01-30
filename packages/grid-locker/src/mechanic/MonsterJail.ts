import { BaseScene } from '@k8-games/sdk';
import { GameObjects } from 'phaser';

export type CapturedMonsters = {
    monster: Phaser.GameObjects.Image;
    x: number;
    y: number;
};

export class MonsterJail {
    private scene: BaseScene;
    private container!: GameObjects.Container;
    private containerImage!: GameObjects.Image;
    private mask!: GameObjects.Graphics;
    private position: { x: number; y: number };
    private capturedMonsters: CapturedMonsters[] = [];

    constructor(scene: BaseScene) {
        this.scene = scene;
        this.position = {
            x: -20,
            y: this.scene.display.height / 2 - 25,
        };
    }

    static preload(scene: BaseScene) {
        // Load the container image
        scene.load.setPath('assets/images/game_screen');
        scene.load.image('container', 'container.png');
    }

    create() {
        // Create the main container
        this.container = this.scene.add
            .container(this.scene.getScaledValue(this.position.x), this.scene.getScaledValue(this.position.y))
            .setScale(this.scene.getScaledValue(0.5));

        // Add the container image
        this.containerImage = this.scene.add.image(0, 0, 'container').setOrigin(0, 0.5).setDepth(1);
        this.container.add(this.containerImage);

        // Create mask for the center area of the container
        this.createContainerMask();

        this.container.setAlpha(1);

        return this;
    }

    private createContainerMask() {
        // Get container bounds to calculate mask area
        const maskWidth = this.scene.getScaledValue(140); // Use 80% of container width
        const maskHeight = this.scene.getScaledValue(200); // Use 30% of container height (center area)

        // Create graphics object for mask
        this.mask = this.scene.add.graphics();

        // Convert container position to world coordinates for mask positioning
        const maskX = this.scene.getScaledValue(20); // Center horizontally
        const maskY = this.scene.getScaledValue(240); // Center vertically

        // Draw rectangle mask
        this.mask.fillStyle(0xffffff, 0);
        this.mask.fillRect(maskX, maskY, maskWidth, maskHeight);

        // Create the actual mask
        const geometryMask = this.mask.createGeometryMask();

        // Store mask reference for applying to monsters
        this.container.setData('geometryMask', geometryMask);
    }

    animateMonsterToJail(monsters: Phaser.GameObjects.Image[], onComplete: () => void) {
        if (!monsters || monsters.length === 0 || !this.container) {
            onComplete();
            return;
        }

        const noOfMonsters = monsters.length;
        let completedAnimations = 0;

        // Destroy original monsters and create copies inside container
        monsters.forEach((monster, index) => {
            if (monster && monster.scene) {
                // Destroy original monster immediately
                monster.destroy();

                // Add delay for staggered effect
                const delay = index * 200;

                this.scene.time.delayedCall(delay, () => {
                    this.createAndAnimateMonsterCopy(monster, () => {
                        completedAnimations++;
                        if (completedAnimations === noOfMonsters) {
                            onComplete();
                        }
                    });
                });
            }
        });
    }

    private createAndAnimateMonsterCopy(originalMonster: Phaser.GameObjects.Image, onComplete: () => void) {
        // Get container bounds for positioning
        const containerBounds = this.container.getBounds();

        // Calculate starting position (top of container)
        const startX = containerBounds.centerX + this.getRandomXOffset();
        const startY = containerBounds.top - this.scene.getScaledValue(20); // Start above container

        // Create monster copy at starting position
        const monsterCopy = this.scene.add
            .image(startX, startY, originalMonster.texture.key)
            .setScale(this.scene.getScaledValue(0.3))
            .setAlpha(1)
            .setDepth(2); // Above container but below other UI

        // Apply mask to monster so it's only visible in container center
        const geometryMask = this.container.getData('geometryMask');
        if (geometryMask) {
            monsterCopy.setMask(geometryMask);
        }

        // Calculate final position (random position in center area)
        const { x: finalX, y: finalY } = this.getRandomCenterPosition();

        // Store in captured monsters array
        this.capturedMonsters.push({
            monster: monsterCopy,
            x: finalX,
            y: finalY,
        });

        // Animate sliding down from top to center
        this.scene.tweens.add({
            targets: monsterCopy,
            y: containerBounds.centerY + finalY,
            x: containerBounds.centerX + finalX,
            duration: 1200,
            ease: 'Power2.easeOut',
            onComplete: () => {
                // Start floating animation
                this.addFloatingAnimation(monsterCopy);
                onComplete();
            },
        });
    }

    private getRandomXOffset(): number {
        // Random horizontal offset for starting position
        const maxOffset = this.scene.getScaledValue(30);
        return (Math.random() * 2 - 1) * maxOffset;
    }

    private getRandomCenterPosition(): { x: number; y: number } {
        // Generate random position within the masked center area
        const xRange = this.scene.getScaledValue(40);
        const yRange = this.scene.getScaledValue(30);

        const x = (Math.random() * 2 - 1) * xRange;
        const y = (Math.random() * 2 - 1) * yRange;

        return { x, y };
    }

    private addFloatingAnimation(monster: Phaser.GameObjects.Image) {
        // Create gentle floating motion
        this.scene.tweens.add({
            targets: monster,
            y: `+=${this.scene.getScaledValue(8)}`,
            duration: 1500 + Math.random() * 1000, // Varied duration for natural look
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
        });

        // Add slight horizontal sway
        this.scene.tweens.add({
            targets: monster,
            x: `+=${this.scene.getScaledValue(5)}`,
            duration: 2000 + Math.random() * 1000,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
        });
    }

    // Method to destroy the container when no longer needed
    destroy() {
        this.capturedMonsters.forEach(({ monster }) => {
            this.scene.tweens.killTweensOf(monster);
            monster.destroy();
        });

        this.capturedMonsters = [];

        if (this.mask) {
            this.mask.destroy();
            this.mask = null!;
        }

        if (this.container) {
            this.scene.tweens.killTweensOf(this.container);
            this.container.destroy();
        }

        this.container = null!;
        this.containerImage = null!;
    }
}
