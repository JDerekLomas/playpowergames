import { BaseScene } from "@k8-games/sdk";
import { GameMechanic } from "../GameMechanic";

export class GameScene extends BaseScene {
    private gameMechanic: GameMechanic;

    constructor() {
        super("GameScene");
        this.gameMechanic = new GameMechanic(this, false);
    }

    static _preload(scene: BaseScene) {
        GameMechanic._preload(scene);
    }

    init(data?: { reset?: boolean }) {
        this.gameMechanic.init(data);
    }

    create() {
        this.gameMechanic.create();
    }

    update(_time: number, delta: number) {
        this.gameMechanic.update(delta);
    }
}
