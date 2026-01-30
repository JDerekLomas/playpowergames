export interface TileConfig {
    color: string;
    operation: string;
    text: string;
    value: string;
}

export interface TileButtonData {
    button: Phaser.GameObjects.Container;
    count: number;
    text: Phaser.GameObjects.Text;
}

export interface DropZoneBounds {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}

export interface TileData {
    value: string;
    count: number;
}

export interface ButtonConfig extends TileConfig {
    optionIndex: number;
}

export enum TileState {
    SUCCESS = 'success',
    ERROR = 'error'
}

export const DROP_ZONE_PADDING = 290;
export const DROP_ZONE_HEIGHT = 280;
export const BUTTON_SIZE = 70;
export const TILE_COLLISION_SIZE = 130;
export const ANIMATION_DURATION = 300;
export const ANIMATION_DELAY = 300;