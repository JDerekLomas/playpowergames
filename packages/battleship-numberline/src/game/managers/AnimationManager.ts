import { BaseScene } from '../scenes/BaseScene';
import { GameScreenConfig as GameConfig } from '../config/GameScreenConfig';

export class AnimationManager {
    private scene: BaseScene;
    private atlasConstants: typeof GameConfig.ASSETS.KEYS.ATLAS;

    constructor(scene: BaseScene) {
        this.scene = scene;
        this.atlasConstants = GameConfig.ASSETS.KEYS.ATLAS;
    }

    createAnimations(): void {
        this.createWaterAnimation();
        this.createSharkAnimations();
        this.createShootAnimations();
        this.createResultAnimations();
    }

    private createWaterAnimation(): void {
        if (!this.scene.anims.exists(`${this.atlasConstants.WATER_BUBBLE}_animation`)) {
            this.scene.anims.create({
                key: `${this.atlasConstants.WATER_BUBBLE}_animation`,
                frames: this.atlasConstants.WATER_BUBBLE,
                frameRate: GameConfig.WATER_BUBBLE_ANIMATION.FRAME_RATE,
                repeat: -1,
            });
        }
    }

    private createSharkAnimations(): void {
        // Shark loop animation
        if (!this.scene.anims.exists(`${this.atlasConstants.SHARK_LOOP}_animation`)) {
            this.scene.anims.create({
                key: `${this.atlasConstants.SHARK_LOOP}_animation`,
                frames: this.atlasConstants.SHARK_LOOP,
                frameRate: GameConfig.SHARK_ANIMATION.FRAME_RATE,
                repeat: -1,
            });
        }

        // Shark enter animation
        if (!this.scene.anims.exists(`${this.atlasConstants.SHARK_ENTER}_animation`)) {
            this.scene.anims.create({
                key: `${this.atlasConstants.SHARK_ENTER}_animation`,
                frames: this.atlasConstants.SHARK_ENTER,
                frameRate: GameConfig.SHARK_ENTER_ANIMATION.FRAME_RATE,
                repeat: 0,
            });
        }
    }

    private createShootAnimations(): void {
        // Shoot start animation
        if (!this.scene.anims.exists(`${this.atlasConstants.SHOOT_START}_animation`)) {
            this.scene.anims.create({
                key: `${this.atlasConstants.SHOOT_START}_animation`,
                frames: this.atlasConstants.SHOOT_START,
                frameRate: GameConfig.SHOOT_START_ANIMATION.FRAME_RATE,
                repeat: 0,
                hideOnComplete: true,
            });
        }

        // Shoot end animation
        if (!this.scene.anims.exists(`${this.atlasConstants.SHOOT_END}_animation`)) {
            this.scene.anims.create({
                key: `${this.atlasConstants.SHOOT_END}_animation`,
                frames: this.atlasConstants.SHOOT_END,
                frameRate: GameConfig.SHOOT_END_ANIMATION.FRAME_RATE,
                repeat: 0,
                hideOnComplete: true,
            });
        }
    }

    private createResultAnimations(): void {
        // Screen clicking animation
        if (!this.scene.anims.exists(`${this.atlasConstants.SCREEN_CLICK_MODE}_animation`)) {
            this.scene.anims.create({
                key: `${this.atlasConstants.SCREEN_CLICK_MODE}_animation`,
                frames: this.atlasConstants.SCREEN_CLICK_MODE,
                frameRate: GameConfig.SCREEN_CLICKING_ANIMATION.FRAME_RATE,
                repeat: 0,
                hideOnComplete: true,
            });
        }

        // Blast animation
        if (!this.scene.anims.exists(`${this.atlasConstants.BLAST}_animation`)) {
            this.scene.anims.create({
                key: `${this.atlasConstants.BLAST}_animation`,
                frames: this.atlasConstants.BLAST,
                frameRate: GameConfig.BLAST_ANIMATION.FRAME_RATE,
                repeat: 0,
                hideOnComplete: true,
            });
        }

        // Miss animation
        if (!this.scene.anims.exists(`${this.atlasConstants.MISS}_animation`)) {
            this.scene.anims.create({
                key: `${this.atlasConstants.MISS}_animation`,
                frames: this.atlasConstants.MISS,
                frameRate: GameConfig.MISS_ANIMATION.FRAME_RATE,
                repeat: 0,
                hideOnComplete: true,
            });
        }

        // Near miss animation
        if (!this.scene.anims.exists(`${this.atlasConstants.NEAR_MISS}_animation`)) {
            this.scene.anims.create({
                key: `${this.atlasConstants.NEAR_MISS}_animation`,
                frames: this.atlasConstants.NEAR_MISS,
                frameRate: GameConfig.NEAR_MISS_ANIMATION.FRAME_RATE,
                repeat: 0,
                hideOnComplete: true,
            });
        }
    }
}
