import { AssetsConfig } from "./config/AssetsConfig";
import { BaseScene } from "@k8-games/sdk";

const { ANIMATIONS, SPRITES } = AssetsConfig.KEYS;

export const createMakingTenLogoAnimation = (scene: BaseScene) => {
    if (scene.anims.exists(ANIMATIONS.MAKING_TEN_LOGO_ANIMATION)) return;

    scene.anims.create({
        key: ANIMATIONS.MAKING_TEN_LOGO_ANIMATION,
        frames: scene.anims.generateFrameNumbers(SPRITES.MAKING_TEN_LOGO, {
            start: 0,
            end: 60,
        }),
        frameRate: 24,
        repeat: -1,
    });
};

export const createWizardCelebrateAnimation = (scene: BaseScene) => {
    if (scene.anims.exists(ANIMATIONS.WIZARD_CELEBRATE_ANIMATION)) return;

    scene.anims.create({
        key: ANIMATIONS.WIZARD_CELEBRATE_ANIMATION,
        frames: AssetsConfig.KEYS.SPRITES.WIZARD_CELEBRATE,
        frameRate: 24,
        repeat: 0,
    });
};
