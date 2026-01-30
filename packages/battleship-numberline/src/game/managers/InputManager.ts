import { BaseScene } from '../scenes/BaseScene';
import { GameScreenConfig as GameConfig } from '../config/GameScreenConfig';
import { parseFractionString } from '../utils/parseFractionString';

export class InputManager {
    private scene: BaseScene;
    private leftMarkerLine: Phaser.GameObjects.Rectangle;
    private rightMarkerLine: Phaser.GameObjects.Rectangle;
    private startPoint: number | string;
    private endPoint: number | string;
    private gameConfig: typeof GameConfig;

    constructor(
        scene: BaseScene,
        leftMarker: Phaser.GameObjects.Rectangle,
        rightMarker: Phaser.GameObjects.Rectangle,
        startPoint: number | string,
        endPoint: number | string,
    ) {
        this.scene = scene;
        this.leftMarkerLine = leftMarker;
        this.rightMarkerLine = rightMarker;
        this.startPoint = startPoint;
        this.endPoint = endPoint;
        this.gameConfig = GameConfig;
    }

    setupCursorZone(): void {
        this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            // Check if tutorial is active
            const gameScreen = this.scene as any;
            if (gameScreen.isTutorialActive || gameScreen.isTypingMode) {
                document.body.style.cursor = 'default';
                return;
            }

            const isInCursorZone = this.isInCursorZone(pointer);
            if (isInCursorZone) {
                document.body.style.cursor = `url(${this.gameConfig.ASSETS.PATHS.CURSOR}) ${this.gameConfig.CURSOR.OFFSET.X} ${this.gameConfig.CURSOR.OFFSET.Y}, pointer`;
            } else {
                document.body.style.cursor = 'default';
            }
        });

        // Reset cursor when leaving game
        this.scene.game.events.on('blur', () => {
            document.body.style.cursor = 'default';
        });
    }

    isInCursorZone(pointer: Phaser.Input.Pointer): boolean {
        const gameHeight = this.scene.sys.game.canvas.height;
        const zoneYStart = gameHeight * this.gameConfig.CURSOR.ZONE.START_Y;
        const zoneYEnd = gameHeight * this.gameConfig.CURSOR.ZONE.END_Y;
        const zoneXStart = this.leftMarkerLine.x;
        const zoneXEnd = this.rightMarkerLine.x + this.scene.getScaledValue(10);
        const isInXZone = pointer.x >= zoneXStart && pointer.x <= zoneXEnd;
        const isInYZone = pointer.y >= zoneYStart && pointer.y <= zoneYEnd;
        return isInXZone && isInYZone;
    }

    /**
     * Calculate the number that was clicked based on the x position of the click
     * @param x - The x position of the click
     * @returns The number that was clicked based on the current range
     */
    calculateClickedNumber(x: number): number {
        const leftX = this.leftMarkerLine.x;
        const rightX = this.rightMarkerLine.x;
        const percentage = (x - leftX) / (rightX - leftX);
        const start = parseFractionString(this.startPoint);
        const end = parseFractionString(this.endPoint);
        if (start === null || end === null) return 0;
        return start + (end - start) * percentage;
    }

    getXPositionFromNumber(number: number): number {
        const leftX = this.leftMarkerLine.x;
        const rightX = this.rightMarkerLine.x;
        const start = parseFractionString(this.startPoint);
        const end = parseFractionString(this.endPoint);
        if (start === null || end === null) return leftX;
        const percentage = (number - start) / (end - start);
        return leftX + (rightX - leftX) * percentage;
    }

    updateRange(startPoint: number | string, endPoint: number | string): void {
        this.startPoint = startPoint;
        this.endPoint = endPoint;
    }
}
