import { BaseScene, ButtonHelper, i18n } from "@k8-games/sdk";
import { BUTTONS } from "../config/common";

export const continueGameAfterWrongAnswer = (scene: BaseScene, onContinue: () => void) => {
    const continueButton = ButtonHelper.createButton({
        scene,
        imageKeys: {
            default: BUTTONS.BUTTON.KEY,
            hover: BUTTONS.BUTTON_HOVER.KEY,
            pressed: BUTTONS.BUTTON_PRESSED.KEY
        },
        text: i18n.t('common.continue'),
        label: i18n.t('common.continue'),
        textStyle: {
            font: "700 24px Exo",
            color: '#FFFFFF'
        },
        imageScale: 0.8,
        x: scene.display.width / 2,
        y: (scene.display.height / 2) + 300, 
        onClick: () => {
            onContinue();
            continueButton.destroy();
        }
    });
}