import { BaseScene, ButtonHelper, i18n } from "@k8-games/sdk";
import { BUTTONS } from "../config/common";

export const continueGameAfterWrongAnswer = (scene: BaseScene, onContinue: () => void) => {
    const bg = scene.addImage(scene.display.width, scene.display.height, 'continue_btn_bg')
    bg.setOrigin(1).setDepth(1000);
    const continueButton = ButtonHelper.createButton({
        scene,
        imageKeys: {
            default: BUTTONS.BUTTON.KEY,
            hover: BUTTONS.BUTTON_HOVER.KEY,
            pressed: BUTTONS.BUTTON_PRESSED.KEY
        },
        text: i18n.t("common.continue"),
        label: i18n.t("common.continue"),
        textStyle: {
            font: "700 24px Exo",
            color: '#FFFFFF'
        },
        imageScale: 0.7,
        x: scene.display.width - 130,
        y: scene.display.height - 65, 
        onClick: () => {
            onContinue();
            bg.destroy();
            continueButton.destroy();
        }
    }).setDepth(1000);
}