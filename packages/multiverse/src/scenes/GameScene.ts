import { AdditionAdventure } from '../mechanic/AdditionAdventure';
import { BaseScene } from '@k8-games/sdk';

export class GameScene extends BaseScene {
    private additionAdventure!: AdditionAdventure;

    constructor() {
        super('GameScene');
        this.additionAdventure = new AdditionAdventure(this);
    }

    static _preload(scene: BaseScene) {
        AdditionAdventure._preload(scene);
    }

    init(data?: { reset?: boolean; parentScene?: string }) {
        this.additionAdventure.init(data);
    }

    create() {
        this.additionAdventure.create();
    }

    update() {
        if (this.additionAdventure && this.additionAdventure.update) {
            this.additionAdventure.update();
        }
    }
}
