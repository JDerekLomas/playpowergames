import { BaseScene, ButtonHelper, ButtonOverlay, i18n, VolumeSlider } from "@k8-games/sdk";
import FactoringTutorial from "../tutorial-modules/FactoringTutorial";
import InequalityTutorial from "../tutorial-modules/InequalityTutorial";
import StepEquationsTutorial from "../tutorial-modules/StepEquationsTutorial";
import CombineEquationsTutorial from "../tutorial-modules/CombineEquationsTutorial";
import { BUTTONS } from '../config/common';


export class InstructionsScene extends BaseScene {
    private stepEquationsTutorial!: StepEquationsTutorial;
    private factoringTutorial!: FactoringTutorial;
    private inequalityTutorial!: InequalityTutorial;
    private combineEquationsTutorial!: CombineEquationsTutorial;
    private mechanic: string;
    private volumeSlider!: VolumeSlider;
    private muteBtn!: Phaser.GameObjects.Container;

    constructor() {
        super("InstructionsScene");
        this.mechanic = "step_equations";
    }

    static _preload(_scene: BaseScene) {
        FactoringTutorial._preload(_scene);
        InequalityTutorial._preload(_scene);
        StepEquationsTutorial._preload(_scene);
        CombineEquationsTutorial._preload(_scene);
    }

    init(data: { parentScene: string, mechanic: string, level: number }) {
        this.mechanic = data.mechanic;

        if(this.mechanic === "step_equations") {
            this.stepEquationsTutorial = new StepEquationsTutorial(this, data.level);
            this.stepEquationsTutorial.init(data);
        } else if(this.mechanic === "factoring") {
            this.factoringTutorial = new FactoringTutorial(this, data.level);
            this.factoringTutorial.init(data);
        } else if(this.mechanic === "inequality") {
            this.inequalityTutorial = new InequalityTutorial(this, data.level);
            this.inequalityTutorial.init(data);
        } else if(this.mechanic === "combine_equations") {
            this.combineEquationsTutorial = new CombineEquationsTutorial(this, data.level);
            this.combineEquationsTutorial.init(data);
        } else {
            this.stepEquationsTutorial = new StepEquationsTutorial(this, data.level);
            this.stepEquationsTutorial.init(data);
        } 
    }

    create() {
        // Audio controls
        this.createMuteButton();
        this.createVolumeControls();

        if(this.mechanic === "step_equations") {
            this.stepEquationsTutorial.create();
        } else if(this.mechanic === "factoring") {
            this.factoringTutorial.create();
        } else if(this.mechanic === "inequality") {
            this.inequalityTutorial.create();
        } else if(this.mechanic === "combine_equations") {
            this.combineEquationsTutorial.create();
        } else {
            this.stepEquationsTutorial.create();
        }
    }

    private createMuteButton(): void {
        this.muteBtn = ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.UNMUTE_ICON.KEY,
            label: i18n.t('general.mute'),
            x: this.display.width - 54,
            y: 190,
            onClick: () => {
                this.audioManager.setMute(!this.audioManager.getIsAllMuted());
            },
        });
        this.muteBtn.setDepth(10);
    }

    private createVolumeControls(): void {
        this.volumeSlider = new VolumeSlider(this);
        this.volumeSlider.create(this.display.width - 215, 288, 'purple', i18n.t('common.volume'));
        
        const volumeBtn = ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.SETTINGS_ICON.KEY,
            label: i18n.t('common.volume'),
            x: this.display.width - 54,
            y: 280,
            onClick: () => {
                this.volumeSlider.toggleControl();
            },
        });
        volumeBtn.setDepth(10);
    }

    update(): void {
        // Update mute button icon
        const muteBtnItem = this.muteBtn.getAt(1) as Phaser.GameObjects.Sprite;
        if (this.audioManager.getIsAllMuted()) {
            muteBtnItem.setTexture(BUTTONS.MUTE_ICON.KEY);
        } else {
            muteBtnItem.setTexture(BUTTONS.UNMUTE_ICON.KEY);
        }

        // Update mute button state
        const label = this.audioManager.getIsAllMuted() ? i18n.t('common.unmute') : i18n.t('common.mute');
        const overlay = (this.muteBtn as any).buttonOverlay as ButtonOverlay;
        const muteBtnState = this.muteBtn.getData('state');
        if(muteBtnState != label) {
            this.muteBtn.setData('state', label);
            overlay.setLabel(label);
        }
    }
}
