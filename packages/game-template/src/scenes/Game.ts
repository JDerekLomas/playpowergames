import { BaseScene } from "@k8-games/sdk";

export class Game extends BaseScene {
    constructor() {
        super('Game');
    }

    create() {
        const { width, height } = this.display;
        this.addImage(width / 2, height / 2, 'background').setOrigin(0.5);

        this.addText(width / 2, height / 2, 'Make something fun!\nand share it with us:\nsupport@phaser.io', {
            fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        this.input.once('pointerdown', () => {

            this.scene.start('GameOver');

        });
    }
}
