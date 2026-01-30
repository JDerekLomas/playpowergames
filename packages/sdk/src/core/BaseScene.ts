import { Scene, GameObjects } from 'phaser';
import { DisplayConfig } from '../config/DisplayConfig';
import { AudioManager } from '../utils/AudioManager';

export class BaseScene extends Scene {
    public display: DisplayConfig;
    public audioManager: AudioManager;

    constructor(config: string | Phaser.Types.Scenes.SettingsConfig) {
        super(config);
        this.display = DisplayConfig.getInstance();
        this.audioManager = AudioManager.getInstance();
    }

    public addImage(x: number, y: number, texture: string): GameObjects.Image {
        const image = this.add.image(this.display.scaleValue(x), this.display.scaleValue(y), texture);
        this.display.scaleGameObject(image);

        return image;
    }

    public addSprite(x: number, y: number, texture: string): GameObjects.Sprite {
        const sprite = this.add.sprite(this.display.scaleValue(x), this.display.scaleValue(y), texture);
        this.display.scaleGameObject(sprite);

        return sprite;
    }

    public addTileSprite(x: number, y: number, texture: string, width?: number, height?: number): GameObjects.TileSprite {
        const tileSprite = this.add.tileSprite(this.display.scaleValue(x), this.display.scaleValue(y), width ?? this.display.width, height ?? this.display.height, texture);
        this.display.scaleGameObject(tileSprite);
        return tileSprite;
    }

    public addText(
        x: number,
        y: number,
        text: string | string[],
        style?: Phaser.Types.GameObjects.Text.TextStyle,
    ): GameObjects.Text {
        const textObject = this.add.text(this.display.scaleValue(x), this.display.scaleValue(y), text, {
            ...style,
            padding: style?.padding || { top: 0, bottom: 5 },
            resolution: window.devicePixelRatio,
        });
        this.display.scaleGameObject(textObject);

        return textObject;
    }

    public addRectangle(
        x: number,
        y: number,
        width?: number,
        height?: number,
        fillColor?: number,
        fillAlpha?: number,
    ): GameObjects.Rectangle {
        const rectangle = this.add.rectangle(
            this.display.scaleValue(x),
            this.display.scaleValue(y),
            width !== undefined ? this.display.scaleValue(width) : undefined,
            height !== undefined ? this.display.scaleValue(height) : undefined,
            fillColor,
            fillAlpha,
        );
        return rectangle;
    }

    public addCircle(
        x: number,
        y: number,
        radius: number,
        fillColor?: number,
        fillAlpha?: number,
    ): GameObjects.Arc {
        const circle = this.add.circle(
            this.display.scaleValue(x),
            this.display.scaleValue(y),
            radius !== undefined ? this.display.scaleValue(radius) : undefined,
            fillColor,
            fillAlpha,
        );
        return circle;
    }

    public getScaledValue(value: number): number {
        return this.display.scaleValue(value);
    }

    public getScaledPosition(x: number, y: number): { x: number; y: number } {
        return this.display.scalePosition(x, y);
    }

    public getUnscaledPointerPosition(pointer: Phaser.Input.Pointer): {
        x: number;
        y: number;
    } {
        return {
            x: pointer.x / this.display.scale,
            y: pointer.y / this.display.scale,
        };
    }

    // Do not call this method in constructor
    public isTouchDevice(): boolean {
        return this.sys.game.device.input.touch;
    }
}
