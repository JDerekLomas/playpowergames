import { Types } from 'phaser';
import { DisplayConfig } from '../config/DisplayConfig';

export interface GameConfigOptions {
    title: string;
    width: number;
    height: number;
    canvasWidth: number;
    canvasHeight: number;
    backgroundColor?: string;
    parent?: string;
    scale?: Types.Core.ScaleConfig;
    physics?: Types.Core.PhysicsConfig;
}

export class GameConfig {
    static create(options: GameConfigOptions): Types.Core.GameConfig {
        return {
            title: options.title,
            type: DisplayConfig.getInstance().rendererType,
            width: options.canvasWidth,
            height: options.canvasHeight,
            canvasStyle: `width: ${options.width}px; height: ${options.height}px;`,
            backgroundColor: options.backgroundColor || '#000000',
            parent: options.parent,
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH,
                ...options.scale
            },
            dom: {
                createContainer: true,
            },
            input: {
                mouse: {
                    target: options.parent,
                },
                touch: {
                    target: options.parent,
                },
            },
            scene: []
        };
    }
} 