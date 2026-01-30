import { BaseScene, ButtonHelper, i18n } from "@k8-games/sdk";
import { AssetsConfig } from "../config/AssetsConfig";

export const continueGameAfterWrongAnswer = (scene: BaseScene, onContinue: () => void) => {
    const bg = scene.addImage(scene.display.width, scene.display.height, 'continue_btn_bg')
    bg.setOrigin(1).setDepth(1000);
    const continueButton = ButtonHelper.createButton({
        scene,
        imageKeys: {
            default: AssetsConfig.KEYS.BUTTONS.DEFAULT,
            hover: AssetsConfig.KEYS.BUTTONS.HOVER,
            pressed: AssetsConfig.KEYS.BUTTONS.PRESSED
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
