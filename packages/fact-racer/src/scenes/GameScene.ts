import { BaseScene } from "@k8-games/sdk";
import { FactRacerMechanic } from "../mechanic/FactRacer";

export class GameScene extends BaseScene {
    private mechanic!: FactRacerMechanic;

    constructor() {
        super("GameScene");
        
        this.mecanicSetup();
    }

    private mecanicSetup() {
        this.mechanic = new FactRacerMechanic(this, { mode: 'game' });
    }

    static _preload(scene: BaseScene) {
    FactRacerMechanic._preload(scene);
    }

    init(data?: { reset?: boolean; skipTutorial?: boolean }) {
        const tutorialSeen = this.registry.get('factRacerTutorialSeen');
        // Auto-launch tutorial (InstructionsScene) on first entry unless explicitly skipped
        if (!tutorialSeen && !data?.skipTutorial) {
            // Start instructions scene and pass return target
            this.scene.start('InstructionsScene', { returnTo: 'GameScene', fromSplashScene: false });
            return; // Defer mechanic init until real game start
        }
        this.mechanic.init(data?.reset);
    }

    create() { this.mechanic.create(); }

    override update(): void { this.mechanic.update(); }
}