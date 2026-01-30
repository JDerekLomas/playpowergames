import { BaseScene } from "@k8-games/sdk";

export class GameOver extends BaseScene {
    constructor() {
        super('GameOver');
    }

    create() {
        const { width, height } = this.display;
        this.addImage(width / 2, height / 2, 'background').setOrigin(0.5);

        this.addText(width / 2, height / 2, 'Game Over', {
            fontFamily: 'Arial Black', fontSize: 64, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        this.input.once('pointerdown', () => {
            this.scene.start('MainMenu');
        });
    }
}
