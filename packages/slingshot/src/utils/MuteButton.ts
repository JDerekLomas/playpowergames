import { GameObjects } from "phaser";
import { BaseScene, ButtonHelper, ButtonOverlay, i18n } from "@k8-games/sdk";
import { BUTTONS } from "../config/common";

export class MuteButton {
    private buttonContainer: Phaser.GameObjects.Container;
    private buttonIcon: GameObjects.Image;
    private imageKeys: { default: string; hover: string; pressed: string };

    constructor(scene: BaseScene, x: number, y: number) {
        const isMuted = scene.audioManager.getIsAllMuted();

        this.imageKeys = {
            default: BUTTONS.ICON_BTN.KEY,
            hover: BUTTONS.ICON_BTN_HOVER.KEY,
            pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
        }

        // Create button using ButtonHelper
        this.buttonContainer = ButtonHelper.createIconButton({
            scene: scene,
            imageKeys: this.imageKeys,
            icon: isMuted ? BUTTONS.MUTE_ICON.KEY : BUTTONS.UNMUTE_ICON.KEY,
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
        this.buttonIcon.setTexture(isMuted ? BUTTONS.MUTE_ICON.KEY : BUTTONS.UNMUTE_ICON.KEY);

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
