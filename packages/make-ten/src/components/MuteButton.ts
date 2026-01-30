import { GameObjects } from "phaser";
import { BaseScene, ButtonHelper, ButtonOverlay, i18n } from "@k8-games/sdk";
import { AssetsConfig } from "../config/AssetsConfig";


export class MuteButton {
    private buttonContainer: Phaser.GameObjects.Container;
    private buttonIcon: GameObjects.Image;
    private imageKeys: { default: string; hover: string; pressed: string };

    constructor(scene: BaseScene, x: number, y: number) {

        const isMuted = scene.audioManager.getIsAllMuted();

        this.imageKeys = {
            default: isMuted ? AssetsConfig.KEYS.BUTTONS.ICON_BTN : AssetsConfig.KEYS.BUTTONS.ICON_BTN,
            hover: isMuted ? AssetsConfig.KEYS.BUTTONS.ICON_BTN_HOVER : AssetsConfig.KEYS.BUTTONS.ICON_BTN_HOVER,
            pressed: isMuted ? AssetsConfig.KEYS.BUTTONS.ICON_BTN_PRESSED : AssetsConfig.KEYS.BUTTONS.ICON_BTN_PRESSED,
        }

        // Create button using ButtonHelper
        this.buttonContainer = ButtonHelper.createIconButton({
            scene: scene,
            imageKeys: this.imageKeys,
            icon: isMuted ? AssetsConfig.KEYS.BUTTONS.MUTE_BTN : AssetsConfig.KEYS.BUTTONS.SOUND_BTN,
            label: i18n.t("common.mute"),
            ariaLive: 'off',
            x: x,
            y: y,
            onClick: () => {
                this.toggleMute(scene);
            },
            raisedOffset: 3.5,
        }).setDepth(2);

        this.buttonIcon = this.buttonContainer.getAt(1) as GameObjects.Image;
    }

    private toggleMute(scene: BaseScene) {
        scene.audioManager.setMute(!scene.audioManager.getIsAllMuted());
        this.updateIcon(scene);
    }

    /**
     * Update the button icon based on the current mute state
     */
    public updateIcon(scene: BaseScene) {
        const isMuted = scene.audioManager.getIsAllMuted();
        this.buttonIcon.setTexture(isMuted ? AssetsConfig.KEYS.BUTTONS.MUTE_BTN : AssetsConfig.KEYS.BUTTONS.SOUND_BTN);

        // Update mute button state
        const label = scene.audioManager.getIsAllMuted() ? i18n.t('common.unmute') : i18n.t('common.mute');
        const overlay = (this.buttonContainer as any).buttonOverlay as ButtonOverlay;
        const muteBtnState = this.buttonContainer.getData('state');
        if(muteBtnState != label) {
            this.buttonContainer.setData('state', label);
            overlay.setLabel(label);
        }
    }

    /**
     * Get the button container for external access
     */
    public getButtonContainer(): Phaser.GameObjects.Container {
        return this.buttonContainer;
    }
}