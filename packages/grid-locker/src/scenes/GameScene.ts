import { BaseScene, focusToGameContainer, GameConfigManager } from "@k8-games/sdk";
import { FourQuadrant } from "../mechanic/FourQuadrant";
import { FirstQuadrant } from "../mechanic/FirstQuadrant";
import { LinearEquation } from "../mechanic/LinearEquation";
import { MultiLinearEquation } from "../mechanic/MultiLinearEquation";

export class GameScene extends BaseScene {
    private fourQuadrant!: FourQuadrant;
    private firstQuadrant!: FirstQuadrant;
    private linearEquation!: LinearEquation;
    private multiLinearEquation!: MultiLinearEquation;
    private topic: string;
    private gameConfigManager!: GameConfigManager;

    constructor() {
        super("GameScene");
        this.gameConfigManager = GameConfigManager.getInstance();
        this.topic = this.gameConfigManager.get('topic') || "g6_t2_integers_and_coordinate";
        if (this.topic === "g6_t2_integers_and_coordinate") {
            this.fourQuadrant = new FourQuadrant(this);
        } else if (this.topic === "g5_t10_numbers_and_coordinate") {
            this.firstQuadrant = new FirstQuadrant(this);
        } else if(this.topic === "g8_t2_linear_equation") {
            this.linearEquation = new LinearEquation(this);
        } else if(this.topic === "g8_t5") {
            this.multiLinearEquation = new MultiLinearEquation(this);
        } else {
            this.fourQuadrant = new FourQuadrant(this);
        }
    }

    static _preload(scene: BaseScene) {
        FourQuadrant._preload(scene);
        FirstQuadrant._preload(scene);
        LinearEquation._preload(scene);
        MultiLinearEquation._preload(scene);
    }

    init(data?: { reset?: boolean }) {
        if (this.topic === "g6_t2_integers_and_coordinate") {
            this.fourQuadrant.init(data);
        } else if (this.topic === "g5_t10_numbers_and_coordinate") {
            this.firstQuadrant.init(data);
        } else if (this.topic === "g8_t2_linear_equation") {
            this.linearEquation.init(data);
        } else if(this.topic === 'g8_t5') {
            this.multiLinearEquation.init(data);
        } else {
            this.fourQuadrant.init(data);
        }
    }

    create() {
        // Focus to game container
        focusToGameContainer();

        if (this.topic === "g6_t2_integers_and_coordinate") {
            this.fourQuadrant.create();
        } else if (this.topic === "g5_t10_numbers_and_coordinate") {
            this.firstQuadrant.create();
        } else if (this.topic === "g8_t2_linear_equation") {
            this.linearEquation.create();
        } else if(this.topic === 'g8_t5') {
            this.multiLinearEquation.create();
        } else {
            this.fourQuadrant.create();
        }
    }

    override update(): void {
        if (this.topic === "g6_t2_integers_and_coordinate") {
            this.fourQuadrant.update();
        } else if (this.topic === "g5_t10_numbers_and_coordinate") {
            this.firstQuadrant.update();
        } else if(this.topic === "g8_t2_linear_equation") {
            this.linearEquation.update();
        } else if(this.topic === 'g8_t5') {
            this.multiLinearEquation.update();
        } else {
            this.fourQuadrant.update();
        }
    }
}