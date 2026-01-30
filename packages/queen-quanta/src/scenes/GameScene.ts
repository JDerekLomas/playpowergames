import { BaseScene, focusToGameContainer } from "@k8-games/sdk";
import { StepEquations } from "../mechanic/StepEquations";
import { Factoring } from "../mechanic/Factoring";
import { CombineEquations } from "../mechanic/CombineEquations";
import { Inequality } from "../mechanic/Inequality";
import { ASSETS_PATHS } from "../config/common";

export class GameScene extends BaseScene {
    private stepEquations!: StepEquations;
    private factoring!: Factoring;
    private mechanic: string;
    private combine!: CombineEquations;
    private inequalities!: Inequality;

    constructor() {
        super("GameScene");
        this.mechanic = "step_equations";
    }

    static _preload(scene: BaseScene) {
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen`);
        scene.load.image('game_scene_bg_1', 'game_scene_bg_1.png');
        scene.load.image('game_scene_bg_2', 'game_scene_bg_2.png');
        scene.load.image('game_scene_bg_3', 'game_scene_bg_3.png');
        scene.load.image('game_scene_bg_3_inequality', 'game_scene_bg_3_inequality.png');
        scene.load.image('game_scene_bg_4', 'game_scene_bg_4.png');

        Factoring._preload(scene);
        StepEquations._preload(scene);
        CombineEquations._preload(scene);
        Inequality._preload(scene);
    }

    init(data: { reset?: boolean; mechanic: string; level: number }) {
        this.mechanic = data.mechanic;
        
        // Define mechanic configuration
        const mechanicConfig = {
            step_equations: {
                instance: this.stepEquations,
                class: StepEquations,
                property: 'stepEquations' as keyof GameScene
            },
            factoring: {
                instance: this.factoring,
                class: Factoring,
                property: 'factoring' as keyof GameScene
            },
            combine_equations: {
                instance: this.combine,
                class: CombineEquations,
                property: 'combine' as keyof GameScene
            },
            inequality: {
                instance: this.inequalities,
                class: Inequality,
                property: 'inequalities' as keyof GameScene
            }
        };
        
        const config = mechanicConfig[this.mechanic as keyof typeof mechanicConfig] || mechanicConfig.step_equations;
        
        // Handle reset or create new instance
        if (data.reset && config.instance && config.instance.getLevel() === data.level) {
            const oldQuestionSelector = config.instance.getQuestionSelector();
            oldQuestionSelector?.reset();
            (this as any)[config.property] = new config.class(this, data.level, false, oldQuestionSelector);
        } else if (!config.instance || config.instance.getLevel() !== data.level) {
            (this as any)[config.property] = new config.class(this, data.level);
        }
        
        // Initialize the mechanic
        (this as any)[config.property].init(data);
    }

    create() {
        // Focus to game container
        focusToGameContainer();

        if (this.mechanic === "step_equations") {
            this.stepEquations.create();
        } else if (this.mechanic === "factoring") {
            this.factoring.create();
        } else if (this.mechanic === "combine_equations") {
            this.combine.create();
        } else if (this.mechanic === "inequality") {
            this.inequalities.create();
        } else {
            this.stepEquations.create();
        }
    }

    update() {
        if (this.mechanic === "step_equations") {
            this.stepEquations.update();
        } else if (this.mechanic === "factoring") {
            // this.factoring.update();
        } else if (this.mechanic === "combine_equations") {
            this.combine.update();
        } else if (this.mechanic === "inequality") {
            this.inequalities.update();
        } else {
            this.stepEquations.update();
        }
    }
}