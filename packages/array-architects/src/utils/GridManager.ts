import { BaseScene } from "@k8-games/sdk";

export interface GridTile {
    fillGraphics: Phaser.GameObjects.Graphics;
    row: number;
    col: number;
    isSelected: boolean;
    numberText?: Phaser.GameObjects.Text;
    borderGraphics?: Phaser.GameObjects.Graphics;
    scaledWidth: number;
    scaledHeight: number;
    scaledRadius: number;
}

export class GridManager {
    private scene: BaseScene;
    private gridTiles: GridTile[][] = [];
    private gridRows: number = 5;
    private gridCols: number = 5;
    private tileSize: number = 66;
    private tileSpacing: number = 10;
    private gridStartX: number = 0;
    private gridStartY: number = 0;
    private totalGridWidth: number = 0;
    private totalGridHeight: number = 0;
    private gridBackground?: Phaser.GameObjects.Graphics;
    private extraYOffset: number = 0;

    constructor(scene: BaseScene, extraYOffset: number = 0) {
        this.scene = scene;
        this.extraYOffset = extraYOffset;
    }

    /**
     * Update grid size and layout based on dimensions
     */
    public updateGridForDimensions(rows: number, cols: number): void {
        this.gridRows = rows;
        this.gridCols = cols;
        
        // Calculate total grid dimensions
        this.totalGridWidth = this.gridCols * this.tileSize + (this.gridCols - 1) * this.tileSpacing;
        this.totalGridHeight = this.gridRows * this.tileSize + (this.gridRows - 1) * this.tileSpacing;
        
        // Center the grid
        this.gridStartX = this.scene.display.width / 2 - this.totalGridWidth / 2;
        this.gridStartY = this.scene.display.height / 2 - this.totalGridHeight / 2 + 50 + this.extraYOffset;
        
        // Destroy existing grid first
        this.destroyGrid();
        // Create brown background rectangle for the grid
        this.createGridBackground();
        
        // Create new grid
        this.createGrid();
    }

    /**
     * Create brown background rectangle for the grid
     */
    private createGridBackground(): void {
        // Destroy existing background if it exists
        if (this.gridBackground) {
            this.gridBackground.destroy();
            this.gridBackground = undefined;
        }
        
        // Ensure we have valid dimensions
        if (this.totalGridHeight <= 0 || this.totalGridWidth <= 0) {
            return;
        }
        
        // Add padding around the grid
        const padding = 20;
        const bgWidth = this.totalGridWidth + padding * 2;
        const bgHeight = this.totalGridHeight + padding * 2;
        const bgX = this.scene.display.width / 2;
        const bgY = this.gridStartY + bgHeight / 2 + 30;
        
        // Create brown background rectangle with rounded corners
        const borderRadius = this.scene.getScaledValue(15);
        this.gridBackground = this.scene.add.graphics();
        this.gridBackground.setPosition(this.scene.getScaledValue(bgX), this.scene.getScaledValue(bgY));
        this.gridBackground.fillStyle(0x51312A, 1.0); // Brown color with full opacity
        this.gridBackground.fillRoundedRect(
            -this.scene.getScaledValue(bgWidth) / 2,
            -this.scene.getScaledValue(bgHeight) / 2,
            this.scene.getScaledValue(bgWidth),
            this.scene.getScaledValue(bgHeight),
            borderRadius
        );
        this.gridBackground.setDepth(0); // Place behind the grid tiles
    }

    /**
     * Create the grid based on current gridRows and gridCols
     */
    private createGrid(): void {
        this.gridTiles = [];

        const borderRadius = this.scene.getScaledValue(5);
        const borderThickness = this.scene.getScaledValue(3);

        for (let row = 0; row < this.gridRows; row++) {
            this.gridTiles[row] = [];
            for (let col = 0; col < this.gridCols; col++) {
                const x = this.gridStartX + col * (this.tileSize + this.tileSpacing) + this.tileSize / 2;
                const y = this.gridStartY + row * (this.tileSize + this.tileSpacing) + this.tileSize / 2 + 50;

                const scaledX = this.scene.getScaledValue(x);
                const scaledY = this.scene.getScaledValue(y);
                const scaledSize = this.scene.getScaledValue(this.tileSize);

                // Filled rounded tile
                const fill = this.scene.add.graphics();
                fill.setPosition(scaledX, scaledY);
                fill.fillStyle(0xF8EFDC, 1);
                fill.fillRoundedRect(-scaledSize / 2, -scaledSize / 2, scaledSize, scaledSize, borderRadius);
                fill.setDepth(1);

                // Interactivity on rounded rect area
                fill.setInteractive(
                    new Phaser.Geom.Rectangle(-scaledSize / 2, -scaledSize / 2, scaledSize, scaledSize),
                    Phaser.Geom.Rectangle.Contains
                );

                // Rounded border using Graphics
                const border = this.scene.add.graphics();
                border.setPosition(scaledX, scaledY);
                border.lineStyle(borderThickness, 0xffffff, 1);
                border.strokeRoundedRect(
                    -scaledSize / 2,
                    -scaledSize / 2,
                    scaledSize,
                    scaledSize,
                    borderRadius
                );
                border.setDepth(2);

                this.gridTiles[row][col] = {
                    fillGraphics: fill,
                    row: row,
                    col: col,
                    isSelected: false,
                    borderGraphics: border,
                    scaledWidth: scaledSize,
                    scaledHeight: scaledSize,
                    scaledRadius: borderRadius
                };
            }
        }
    }

    /**
     * Destroy the current grid
     */
    public destroyGrid(): void {
        for (let row = 0; row < this.gridTiles.length; row++) {
            for (let col = 0; col < (this.gridTiles[row] ? this.gridTiles[row].length : 0); col++) {
                const tile = this.gridTiles[row][col];
                if (tile) {
                    tile.fillGraphics.destroy();
                    tile.borderGraphics?.destroy();
                    tile.numberText?.destroy();
                }
            }
        }
        this.gridTiles = [];
        
        // Destroy grid background
        if (this.gridBackground) {
            this.gridBackground.destroy();
            this.gridBackground = undefined;
        }
    }

    /**
     * Get grid tiles
     */
    public getGridTiles(): GridTile[][] {
        return this.gridTiles;
    }

    /**
     * Get grid dimensions
     */
    public getGridDimensions(): { rows: number; cols: number } {
        return { rows: this.gridRows, cols: this.gridCols };
    }

    /**
     * Get grid start position
     */
    public getGridStartPosition(): { x: number; y: number } {
        return { x: this.gridStartX, y: this.gridStartY };
    }

    /**
     * Get total grid dimensions
     */
    public getTotalGridDimensions(): { width: number; height: number } {
        return { width: this.totalGridWidth, height: this.totalGridHeight };
    }

    /**
     * Update individual tile selection
     */
    public updateTileSelection(row: number, col: number, selected: boolean, colorWhenSelected: number = 0x4a90e2): void {
        if (row < 0 || row >= this.gridRows || col < 0 || col >= this.gridCols) return;

        const tile = this.gridTiles[row][col];
        tile.isSelected = selected;
        const color = selected ? colorWhenSelected : 0xF8EFDC;
        this.redrawTileFill(tile, color);

        if (!selected && tile.numberText) {
            tile.numberText.destroy();
            tile.numberText = undefined;
        }
    }

    /**
     * Clear all selections
     */
    public clearAllSelections(): void {
        for (let row = 0; row < this.gridRows; row++) {
            for (let col = 0; col < this.gridCols; col++) {
                this.updateTileSelection(row, col, false);
                // Reset border to default white
                this.resetTileBorder(this.gridTiles[row][col]);
            }
        }
    }

    /**
     * Reset tile border to default white color
     */
    public resetTileBorder(tile: GridTile): void {
        if (tile.borderGraphics) {
            tile.borderGraphics.clear();
            const borderThickness = this.scene.getScaledValue(3);
            tile.borderGraphics.lineStyle(borderThickness, 0xffffff, 1);
            tile.borderGraphics.strokeRoundedRect(
                -tile.scaledWidth / 2,
                -tile.scaledHeight / 2,
                tile.scaledWidth,
                tile.scaledHeight,
                tile.scaledRadius
            );
        }
    }

    /**
     * Redraw tile fill
     */
    public redrawTileFill(tile: GridTile, color: number): void {
        tile.fillGraphics.clear();
        tile.fillGraphics.fillStyle(color, 1);
        tile.fillGraphics.fillRoundedRect(
            -tile.scaledWidth / 2,
            -tile.scaledHeight / 2,
            tile.scaledWidth,
            tile.scaledHeight,
            tile.scaledRadius
        );
    }

    /**
     * Get number of selected tiles
     */
    public getSelectedTileCount(): number {
        let count = 0;
        for (let row = 0; row < this.gridRows; row++) {
            for (let col = 0; col < this.gridCols; col++) {
                if (this.gridTiles[row][col].isSelected) {
                    count++;
                }
            }
        }
        return count;
    }

    /**
     * Complete selection with numbering
     */
    public completeSelection(): void {
        // Play card-flip audio when tiles are selected
        this.scene.audioManager.playSoundEffect('card-flip');

        let labelCounter = 1;
        for (let row = 0; row < this.gridRows; row++) {
            for (let col = 0; col < this.gridCols; col++) {
                const tile = this.gridTiles[row][col];
                if (tile.isSelected) {
                    this.redrawTileFill(tile, 0x8EC3FF); // Blue on completion

                    // Create numbering label
                    if (tile.numberText) {
                        tile.numberText.destroy();
                    }
                    tile.numberText = this.scene.addText(
                        tile.fillGraphics.x / this.scene.display.scale,
                        tile.fillGraphics.y / this.scene.display.scale + 3,
                        `${labelCounter++}`,
                        {
                            font: "600 40px Exo",
                            color: "#000000",
                        }
                    ).setOrigin(0.5).setDepth(3);
                }
            }
        }
    }

    /**
     * Set up grid event handlers
     */
    public setupGridEvents(
        onTilePointerDown: (row: number, col: number) => void,
        onTilePointerOver: (row: number, col: number) => void,
        onTilePointerUp: () => void
    ): void {
        for (let row = 0; row < this.gridRows; row++) {
            for (let col = 0; col < this.gridCols; col++) {
                const tile = this.gridTiles[row][col];
                tile.fillGraphics.on('pointerdown', () => onTilePointerDown(row, col));
                tile.fillGraphics.on('pointerover', () => onTilePointerOver(row, col));
                tile.fillGraphics.on('pointerup', () => onTilePointerUp());
            }
        }
    }

    /**
     * Disable grid interactions
     */
    public disableGridInteractions(): void {
        for (let row = 0; row < this.gridRows; row++) {
            for (let col = 0; col < this.gridCols; col++) {
                const tile = this.gridTiles[row][col];
                tile.fillGraphics.disableInteractive();
            }
        }
    }

    /**
     * Enable grid interactions
     */
    public enableGridInteractions(): void {
        for (let row = 0; row < this.gridRows; row++) {
            for (let col = 0; col < this.gridCols; col++) {
                const tile = this.gridTiles[row][col];
                tile.fillGraphics.setInteractive();
            }
        }
    }
}
