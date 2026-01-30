import { BaseScene } from "@k8-games/sdk";
import { ArrayArchitects } from "../ArrayArchitects";

export class GameScene extends BaseScene {
    private arrayArchitects: ArrayArchitects;

    constructor() {
        super("GameScene");
        this.arrayArchitects = new ArrayArchitects(this, false);
    }

    static _preload(scene: BaseScene) {
        ArrayArchitects._preload(scene);
    }

    init(data?: { reset?: boolean }) {
        this.arrayArchitects.init(data);
    }

    create() {
        this.audioManager.initialize(this);
        this.arrayArchitects.create();

        this.events.on('resume', () => {
            this.audioManager.initialize(this);
        });
    }
}