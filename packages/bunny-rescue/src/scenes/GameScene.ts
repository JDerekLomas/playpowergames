import { BaseScene } from "@k8-games/sdk";
import { BunnyRescue } from "../mechanics/BunnyRescue";

export class GameScene extends BaseScene {
    private bunnyRescueMechanic!: BunnyRescue;

    constructor() {
        super("GameScene");
    }

    static _preload(scene: BaseScene) {
        BunnyRescue._preload(scene);
    }

    init(data?: { reset?: boolean }) {
        // Initialize AudioManager
        this.audioManager.initialize(this);

        if (!this.bunnyRescueMechanic) {
            this.bunnyRescueMechanic = new BunnyRescue(this);
        }
        this.bunnyRescueMechanic.init(data);
    }

    create() {
        this.bunnyRescueMechanic.create();
    }

    update() {
        // Update logic if needed
    }
}
