import { BaseScene } from "../core/BaseScene";
import { ButtonOverlay } from "./ButtonOverlay";
import { ExpressionUtils } from "./ExpressionUtils";

/**
 * A helper to create a button with hover, default and pressed states
 */
export class ButtonHelper {
    private static disabledButtons: WeakMap<Phaser.GameObjects.Container, boolean> = new WeakMap();
    /**
     * Start a Clash Royale style breathing animation on a button
     * @param button The button container to animate
     * @param options Configuration options for the breathing animation
     * @returns The tween object that can be used to stop the animation
     */
    public static startBreathingAnimation(
        button: Phaser.GameObjects.Container,
        options: {
            scale?: number;
            duration?: number;
            ease?: string;
            moveUpAmount?: number;
        } = {}
    ): Phaser.Tweens.Tween {
        const duration = options.duration ?? 2000;
        const moveUpAmount = options.moveUpAmount ?? 5;

        const originalY = button.y;
        const originalScale = button.scale;

        (button as any).originalY = originalY;
        (button as any).originalScale = originalScale;

        // Create a sequence of tweens
        const tween = button.scene.tweens.add({
            targets: button,
            y: originalY - moveUpAmount,
            duration: duration * 0.7,
            ease: 'Sine.easeOut',
            yoyo: true,
            repeat: -1,
            hold: duration * 0.3,
            yoyoDelay: duration * 0.3,
        });

        return tween as unknown as Phaser.Tweens.Tween;
    }

    /**
     * Stop the breathing animation on a button
     * @param tween The tween object to stop
     * @param button The button container to reset
     */
    public static stopBreathingAnimation(tween: Phaser.Tweens.Tween, button: Phaser.GameObjects.Container) {
        if (tween) {
            tween.stop();
            // Reset position and scale to original
            button.setScale((button as any).originalScale);
            button.y = (button as any).originalY;
        }
    }

    /**
     * Creates a Clash Royale style button press animation
     * @param target The game object to animate
     * @param duration Duration of the animation in milliseconds
     * @param scaleDownAmount How much to scale down (0.9 means 90% of original size)
     */
    private static scaleDownUp(target: Phaser.GameObjects.Container, duration: number = 100, scaleDownAmount: number = 0.9) {
        const originalScale = target.scale;

        // Create a quick scale down and up effect
        target.scene.tweens.add({
            targets: target,
            scaleX: originalScale * scaleDownAmount,
            scaleY: originalScale * scaleDownAmount,
            duration: duration / 2,
            ease: 'Power2',
            yoyo: true,
            onComplete: () => {
                target.setScale(originalScale);
            }
        });
    }

    public static getContainerHeight(container: Phaser.GameObjects.Container): number {
        // Calculate the height of a container by getting the bounds of all its children
        let maxY = 0;
        let minY = 0;
        
        container.each((child: any) => {
            if (child.getBounds) {
                const bounds = child.getBounds();
                maxY = Math.max(maxY, bounds.bottom);
                minY = Math.min(minY, bounds.top);
            }
        });
        
        return maxY - minY;
    }

    /**
     * Fade in a game object
     * @param scene The current scene
     * @param imageKeys The asset keys for the button images
     * @param imageScale The scale of the button image
     * @param text The text to display on the button
     * @param textStyle The style of the text
     * @param  x, y The position of the button
     * @param onClick The callback to execute when the button is clicked
     * @param padding Optional padding around text
     * @returns The button container
     */
    public static createButton(params: {
        scene: BaseScene;
        imageKeys: {
            default: string;
            hover: string;
            pressed: string;
            disabled?: string;
        };
        imageScale?: number;
        text: string;
        textStyle: Phaser.Types.GameObjects.Text.TextStyle;
        x: number;
        y: number;
        onClick?: () => void;
        padding?: number;
        isDisabled?: boolean;
        raisedOffset?: number;
        label?: string;
        ariaLive?: 'off' | 'polite' | 'assertive';
        icon?: {
            key: string;
            position?: 'left' | 'right';
            gap?: number;
        }
    }): Phaser.GameObjects.Container {
        const { scene, imageKeys, imageScale, text, textStyle, x, y, onClick, padding = 15, isDisabled = false, raisedOffset = 3.5, label, ariaLive, icon } = params;
        scene.audioManager.initialize(scene);
        const button = scene.add.container(
            scene.getScaledValue(x),
            scene.getScaledValue(y)
        );

        // Check if text contains fractions
        const fractionRegex = /[x𝑥\d]+\/\d+/g;
        const hasFractions = fractionRegex.test(text);

        let textElement: Phaser.GameObjects.Text | Phaser.GameObjects.Container;
        let iconElement: Phaser.GameObjects.Image | null = null;
        let requiredWidth: number;
        let requiredHeight: number;

        if (hasFractions) {
            // Use ExpressionUtils for fractions
            const color = typeof textStyle.color === 'string' ? textStyle.color : "#000000";
            const expressionUtils = new ExpressionUtils(scene, 0, -2, text, {
                font: textStyle.font || "700 26px Exo",
                fontColor: parseInt(color.replace('#', '0x')),
                lineHeight: 3,
                spacing: 15,
                fractionLinePadding: 20,
            });
            
            textElement = expressionUtils.getContainer();
            const containerWidth = (textElement as any).width || 0;
            const containerHeight = ButtonHelper.getContainerHeight(textElement as Phaser.GameObjects.Container) / scene.display.scale;
            requiredWidth = containerWidth + (padding * 2);
            requiredHeight = containerHeight + (padding * 2);
        } else {
            // Use regular text
            textElement = scene.addText(0, -2, text, textStyle).setOrigin(0.5);
            requiredWidth = textElement.width + (padding * 2);
            requiredHeight = textElement.height + (padding * 2);
        }

        if (icon) {
            iconElement = scene.addImage(0, -2, icon.key).setOrigin(0.5);
            const gap = icon.gap || 0;
            if (icon.position === 'left') {
                textElement.setX(scene.getScaledValue(iconElement.width + gap) / 2);
                iconElement.setX(-scene.getScaledValue(textElement.width + gap) / 2);
            } else {
                textElement.setX(-scene.getScaledValue(iconElement.width + gap) / 2);
                iconElement.setX(scene.getScaledValue(textElement.width + gap) / 2);
            }
            requiredWidth += iconElement.width + gap;
        }

        // Create background with calculated dimensions
        let buttonBg: Phaser.GameObjects.Image;
        if (isDisabled) {
            buttonBg = scene.addImage(0, 0, imageKeys.disabled || imageKeys.default).setOrigin(0.5);
        } else {
            buttonBg = scene.addImage(0, 0, imageKeys.default).setOrigin(0.5);
        }

        // Calculate scale based on required dimensions
        const scaleX = requiredWidth / buttonBg.width;
        const scaleY = requiredHeight / buttonBg.height;
        const finalScaleX = Math.max(scaleX * (imageScale || 1), (imageScale || 1));
        const finalScaleY = Math.max(scaleY * (imageScale || 1), (imageScale || 1));

        buttonBg.setScale(finalScaleX, finalScaleY);
        button.add(buttonBg);
        button.add(textElement);
        if (iconElement) {
            button.add(iconElement);
        }

        button
            .setSize(
                buttonBg.width * buttonBg.scaleX,
                buttonBg.height * buttonBg.scaleY
            )
        if (!isDisabled) {
            button.setInteractive({ useHandCursor: true });
        }

        const buttonTxtNormalY = textElement.y;
        const buttonTxtRaisedY = textElement.y - scene.getScaledValue(raisedOffset * (imageScale || 1));


        const pointerOver = () => {
            if (ButtonHelper.disabledButtons.get(button)) return;
            buttonBg.setTexture(imageKeys.hover);
            textElement.y = buttonTxtRaisedY;
            if (iconElement) {
                iconElement.y = buttonTxtRaisedY;
            }
        }

        const pointerOut = () => {
            if (ButtonHelper.disabledButtons.get(button)) return;
            buttonBg.setTexture(imageKeys.default);
            textElement.y = buttonTxtNormalY;
            if (iconElement) {
                iconElement.y = buttonTxtNormalY;
            }
        }

        const pointerDown = () => {
            if (ButtonHelper.disabledButtons.get(button)) return;
            textElement.y = buttonTxtNormalY;
            buttonBg.setTexture(imageKeys.pressed);
            scene.audioManager.playSoundEffect('button_click');
            ButtonHelper.scaleDownUp(button);
            if (iconElement) {
                iconElement.y = buttonTxtNormalY;
            }
        }

        const pointerUp = () => {
            if (ButtonHelper.disabledButtons.get(button)) return;
            buttonBg.setTexture(imageKeys.default);
            textElement.y = buttonTxtNormalY;
            onClick?.();
            if (iconElement) {
                iconElement.y = buttonTxtNormalY;
            }
        }


        if (isDisabled) {
            if (label) {
                const overlay = new ButtonOverlay(scene, button, { label, ariaLive });
                overlay.setDisabled(true);
                (button as any).buttonOverlay = overlay;
            }
            return button;
        } else {
            if (label) {
                const overlay = new ButtonOverlay(scene, button, { label, ariaLive, onKeyDown: pointerDown, onKeyUp: pointerUp, onFocus: pointerOver, onBlur: pointerOut });
                (button as any).buttonOverlay = overlay;
            }
        }

        // Add hover and pressed state handlers
        button.on("pointerover", pointerOver);
        button.on("pointerout", pointerOut);
        button.on("pointerdown", pointerDown);
        button.on("pointerup", pointerUp);

        return button;
    }

    public static setButtonText(button: Phaser.GameObjects.Container, text: string) {
        const textElement = button.list[1] as Phaser.GameObjects.Text | Phaser.GameObjects.Container;
        if (textElement) {
            if (textElement instanceof Phaser.GameObjects.Text) {
                textElement.setText(text);
            }
            // For containers (ExpressionUtils), we would need to recreate the container
            // This is a limitation - containers can't be easily updated
            const overlay = (button as any).buttonOverlay;
            if (overlay) overlay.setLabel(text);
        }

        // update button size
        const padding = 15;
        let textWidth = 0;
        let textHeight = 0;
        
        if (textElement instanceof Phaser.GameObjects.Text) {
            textWidth = textElement.width;
            textHeight = textElement.height;
        } else if (textElement) {
            // For containers, try to get width/height from the container
            textWidth = (textElement as any).width || 0;
            textHeight = (textElement as any).height || 0;
        }
        
        const requiredWidth = textWidth + (padding * 2);
        const requiredHeight = textHeight + (padding * 2);

        const buttonBg = button.list[0] as Phaser.GameObjects.Image;
        const scaleX = requiredWidth / buttonBg.width;
        const scaleY = requiredHeight / buttonBg.height;
        const finalScaleX = Math.max(scaleX, 1);
        const finalScaleY = Math.max(scaleY, 1);

        buttonBg.setScale(finalScaleX, finalScaleY);
        button.setSize(buttonBg.getBounds().width, buttonBg.getBounds().height);
        // set hit area to the button container
        button.input?.hitArea.setTo(
            0,
            0,
            buttonBg.getBounds().width,
            buttonBg.getBounds().height
        );
    }

    /**
     * Fade in a game object
     * @param scene The current scene
     * @param imageKeys The asset keys for the button images
     * @param imageScale The scale of the button image
     * @param icon The icon to display on the button
     * @param iconScale The scale of the icon
     * @param  x, y The position of the button
     * @param onClick The callback to execute when the button is clicked
     * @returns The button container
     */
    public static createIconButton(params: {
        scene: BaseScene;
        imageKeys: {
            default: string;
            hover: string;
            pressed: string;
        };
        imageScale?: number;
        icon: string;
        iconScale?: number;
        x: number;
        y: number;
        onClick: () => void;
        raisedOffset?: number;
        label?: string;
        ariaLive?: 'off' | 'polite' | 'assertive';
    }): Phaser.GameObjects.Container {
        const { scene, imageKeys, imageScale, icon, iconScale = 0.8, x, y, onClick, raisedOffset = 3.5, label, ariaLive } =
            params;
        scene.audioManager.initialize(scene);
        const button = scene.add.container(
            scene.getScaledValue(x),
            scene.getScaledValue(y)
        );
        const buttonBg = scene.addImage(0, 0, imageKeys.default).setOrigin(0.5);
        if (imageScale) {
            buttonBg.setScale(imageScale);
        }

        const buttonIcon = scene.addImage(0, -2, icon).setOrigin(0.5);
        if (iconScale) {
            buttonIcon.setScale(iconScale);
        }
        button.add(buttonBg);
        button.add(buttonIcon);

        button
            .setSize(
                buttonBg.width * buttonBg.scaleX,
                buttonBg.height * buttonBg.scaleY
            )
            .setInteractive({ useHandCursor: true });

        const buttonIconNormalY = buttonIcon.y;
        const buttonIconRaisedY = buttonIcon.y - scene.getScaledValue(raisedOffset * (iconScale || 1));

        const pointerOver = () => {
            if (ButtonHelper.disabledButtons.get(button)) return;
            buttonBg.setTexture(imageKeys.hover);
            buttonIcon.y = buttonIconRaisedY;
            if (imageScale) {
                buttonBg.setScale(imageScale);
                buttonIcon.setScale(iconScale);
            }
        }

        const pointerOut = () => {
            if (ButtonHelper.disabledButtons.get(button)) return;
            buttonBg.setTexture(imageKeys.default);
            buttonIcon.y = buttonIconNormalY;
            if (imageScale) {
                buttonBg.setScale(imageScale);
                buttonIcon.setScale(iconScale);
            }
        }

        const pointerDown = () => {
            if (ButtonHelper.disabledButtons.get(button)) return;
            buttonBg.setTexture(imageKeys.pressed);
            buttonIcon.y = buttonIconNormalY;
            scene.audioManager.playSoundEffect('button_click');
            ButtonHelper.scaleDownUp(button);
            if (imageScale) {
                buttonBg.setScale(imageScale);
                buttonIcon.setScale(iconScale);
            }
        }

        const pointerUp = () => {
            if (ButtonHelper.disabledButtons.get(button)) return;
            buttonBg.setTexture(imageKeys.default);
            buttonIcon.y = buttonIconNormalY;
            if (imageScale) {
                buttonBg.setScale(imageScale);
                buttonIcon.setScale(iconScale);
            }
            onClick();
        }

        button.on("pointerover", pointerOver);
        button.on("pointerout", pointerOut);
        button.on("pointerdown", pointerDown);
        button.on("pointerup", pointerUp);

        if (label) {
            const overlay = new ButtonOverlay(scene, button, { label, ariaLive, onKeyDown: pointerDown, onKeyUp: pointerUp, onFocus: pointerOver, onBlur: pointerOut });
            (button as any).buttonOverlay = overlay;
        }

        return button;
    }

    /**
     * Disable a button - removes interactivity and changes visual appearance
     * @param button The button container to disable
     * @param disabledTexture Optional texture to use when disabled
     * @param alpha Optional alpha value for disabled state (default: 0.5)
     */
    public static disableButton(button: Phaser.GameObjects.Container): void {
        // Store disabled state in a WeakMap to avoid type issues
        if (!ButtonHelper.disabledButtons) {
            ButtonHelper.disabledButtons = new WeakMap();
        }
        ButtonHelper.disabledButtons.set(button, true);
        const overlay = (button as any).buttonOverlay as ButtonOverlay;
        if (overlay) {
            overlay.setDisabled(true);
        }
    }

    /**
     * Enable a button - restores interactivity and visual appearance
     * @param button The button container to enable
     */
    public static enableButton(button: Phaser.GameObjects.Container): void {
        // Clear disabled flag
        ButtonHelper.disabledButtons.delete(button);
        const overlay = (button as any).buttonOverlay as ButtonOverlay;
        if (overlay) {
            overlay.setDisabled(false);
        }
    }
} 