import { BaseScene, focusToGameContainer, GameConfigManager } from "@k8-games/sdk";
import { ASSETS_PATHS } from "../config/common";
import { DistributeItems } from "../mechanics/DistributeItems";
import { CountItems } from "../mechanics/CountItems";
import { SliceItems } from "../mechanics/SliceItems";
import { ComposeDecompose } from "../mechanics/ComposeDecompose";

export class GameScene extends BaseScene {
    private gameConfigManager!: GameConfigManager;
    private distributeMechanic!: DistributeItems;
    private countMechanic!: CountItems;
    private sliceMechanic!: SliceItems;
    private composeMechanic!: ComposeDecompose;
    private resetData: { reset?: boolean } = {};
    private topic: string;
    private countingTopics: string[] = ['GK_T1_count_numbers_upto_5', 'GK_T2_count_numbers_upto_10'];

    constructor() {
        super("GameScene");
        this.gameConfigManager = GameConfigManager.getInstance();
        this.topic = this.gameConfigManager.get('topic') || 'G3_T1_understand_division';

        if (this.topic === 'G3_T1_understand_division') {
            this.distributeMechanic = new DistributeItems(this);
        } else if (this.countingTopics.includes(this.topic)) {
            this.countMechanic = new CountItems(this);
        } else if (this.topic === 'g1_t11_equal_shares_and_time') {
            this.sliceMechanic = new SliceItems(this);
        } else if (this.topic === 'gk_t11_compose_and_decompose_numbers_11_to_19') {
            this.composeMechanic = new ComposeDecompose(this);
        } else {
            // default to distribute items
            this.distributeMechanic = new DistributeItems(this);
        }
    }

    static _preload(scene: BaseScene) {
        const gameConfigManager = GameConfigManager.getInstance();
        const topic = gameConfigManager.get('topic') || 'G3_T1_understand_division';
        const gkTopics = ['GK_T1_count_numbers_upto_5', 'GK_T2_count_numbers_upto_10', 'gk_t11_compose_and_decompose_numbers_11_to_19'];

        // Load background music
        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}`);
        if(gkTopics.includes(topic)) {
            scene.load.audio("bg-music", "bg-music-gk.mp3");
        } else {
            scene.load.audio("bg-music", "bg-music.mp3");
        }
    }

    init(data?: { reset?: boolean }) {
        // Initialize AudioManager
        this.audioManager.initialize(this);

        // Store reset data
        if (data) {
            this.resetData = data;
        }

        if (this.topic === 'G3_T1_understand_division') {
            DistributeItems.init(this);
        } else if (this.countingTopics.includes(this.topic)) {
            CountItems.init(this);
        } else if (this.topic === 'g1_t11_equal_shares_and_time') {
            SliceItems.init(this);
        } else if (this.topic === 'gk_t11_compose_and_decompose_numbers_11_to_19') {
            ComposeDecompose.init(this);
        } else {
            // default to distribute items
            DistributeItems.init(this);
        }
    }

    create() {
        // Focus to game container
        focusToGameContainer();

        if (this.topic === 'G3_T1_understand_division') {
            this.distributeMechanic.create("game", this.resetData.reset);
        } else if (this.countingTopics.includes(this.topic)) {
            this.countMechanic.create("game", this.resetData.reset);
        } else if (this.topic === 'g1_t11_equal_shares_and_time') {
            this.sliceMechanic.create("game", this.resetData.reset);
        } else if (this.topic === 'gk_t11_compose_and_decompose_numbers_11_to_19') {
            this.composeMechanic.create("game", this.resetData.reset);
        } else {
            // default to distribute items
            this.distributeMechanic.create("game", this.resetData.reset);
        }
    }
}
