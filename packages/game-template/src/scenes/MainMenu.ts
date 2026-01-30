import { BaseScene } from '@k8-games/sdk';

export class MainMenu extends BaseScene {
    constructor() {
        super('MainMenu');
    }

    create() {
        const { width, height } = this.display;
        this.addImage(width / 2, height / 2, 'background').setOrigin(0.5);

        this.addSprite(width / 2, height / 3, 'logo').setOrigin(0.5);

        this.addText(width / 2, height / 2, 'Main Menu', {
            fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        this.input.once('pointerdown', () => {
            this.scene.start('Game');
        });
    }
}
