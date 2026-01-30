import { BaseScene, ButtonHelper, i18n } from "@k8-games/sdk";
import { BUTTONS } from "../config/common";

export interface CometConfig {
    startX: number;
    startY: number;
}

export function resetCometPosition(comet: Phaser.GameObjects.Image, config: CometConfig) {
    comet.x = config.startX;
    comet.y = config.startY;
}

// Door animation helper
export interface DoorAnimationOptions {
    scene: Phaser.Scene;
    leftDoor: Phaser.GameObjects.Image;
    rightDoor: Phaser.GameObjects.Image;
    open: boolean; // true = open, false = close
    duration?: number;
    delay?: number;
    onComplete?: () => void;
    soundEffectKey?: string;
}

export function animateDoors({
    scene,
    leftDoor,
    rightDoor,
    open,
    duration = 1000,
    delay = 500,
    onComplete,
    soundEffectKey
}: DoorAnimationOptions) {
    const displayWidth = (scene as any).display?.width || scene.sys.game.config.width;
    const getScaledValue = (scene as any).getScaledValue
        ? (scene as any).getScaledValue.bind(scene)
        : (v: number) => v;
    const targetXLeft = open ? 0 : getScaledValue(displayWidth / 2);
    const targetXRight = open ? getScaledValue(displayWidth) : getScaledValue(displayWidth / 2);

    scene.tweens.add({
        targets: leftDoor,
        x: targetXLeft,
        duration,
        delay,
        ease: 'Power2'
    });
    scene.tweens.add({
        targets: rightDoor,
        x: targetXRight,
        duration,
        delay,
        ease: 'Power2',
        onStart: () => {
            if (soundEffectKey && (scene as any).audioManager) {
                (scene as any).audioManager.playSoundEffect(soundEffectKey);
            }
        },
        onComplete: () => {
            if (soundEffectKey && (scene as any).audioManager) {
                (scene as any).audioManager.stopSoundEffect(soundEffectKey);
            }
            if (onComplete) onComplete();
        }
    });
}

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
