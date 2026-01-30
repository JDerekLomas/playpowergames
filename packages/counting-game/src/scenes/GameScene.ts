import { BaseScene } from "@k8-games/sdk";
import { Counting } from "../mechanics/counting";

export class GameScene extends BaseScene {
    private countingMechanic!: Counting;

    constructor() {
        super("GameScene");
    }

    static _preload(scene: BaseScene) {
        Counting._preload(scene);
    }

    init(data?: { reset?: boolean }) {
        // Initialize AudioManager
        this.audioManager.initialize(this);

        if (!this.countingMechanic) {
            this.countingMechanic = new Counting(this);
        }
        this.countingMechanic.init(data);
    }

    create() {
        this.countingMechanic.create();
    }

    update() {
        // Update logic if needed
    }
}
