import { BaseScene } from "@k8-games/sdk";
import { BunnyJumping } from "../BunnyJumping";

export class GameScene extends BaseScene {
    private bunnyJumping: BunnyJumping;

    constructor() {
        super("GameScene");
        this.bunnyJumping = new BunnyJumping(this, false);
    }

    static _preload(scene: BaseScene) {
        BunnyJumping._preload(scene);
    }

    init(data?: { reset?: boolean }) {
        this.bunnyJumping.init(data);
    }

    create() {
        this.audioManager.initialize(this);
        this.bunnyJumping.create();

        this.events.on('resume', () => {
            this.audioManager.initialize(this);
        });
    }

    update() {
        this.bunnyJumping.update();
    }
}
