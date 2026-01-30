import { BaseScene, GameConfigManager, i18n, MathExpressionHelper, TextOverlay } from "@k8-games/sdk";
import { ITEM_MAPPING } from "../config/common";

export class CardHelper {

    private static scaleContentIntoView(scene: BaseScene, content: Phaser.GameObjects.Image | Phaser.GameObjects.Container) {
        content.scaleX = scene.getScaledValue(0);
        content.scaleY = scene.getScaledValue(0);

        scene.tweens.add({
            targets: [content],
            scaleX: scene.getScaledValue(1),
            scaleY: scene.getScaledValue(1),
            duration: 200,
            ease: 'Cubic.easeIn',
        });
    }

    /**
     * Helper to add heading, content, and hit area with event handlers to a card container.
     */
    private static setupCardContentAndEvents(
        scene: BaseScene,
        card: Phaser.GameObjects.Container,
        bgImage: Phaser.GameObjects.Image,
        heading: string,
        text: string,
        cardKey: string,
        onClick?: () => void,
        onCreate?: (bgImage: Phaser.GameObjects.Image, card: Phaser.GameObjects.Container) => void
    ) {
        // Y positions
        const headingDefaultY = -(bgImage.displayHeight / scene.display.scale) / 2 + 40;
        const headingRaisedY = headingDefaultY - 4;
        const contentDefaultY = 0;
        const contentRaisedY = -4;
        const cardDefaultY = (card.getData('originalY') / scene.display.scale);
        const cardRaisedY = cardDefaultY - 4;

        // Add heading
        const headingText = scene.addText(0, headingDefaultY, heading, {
            fontFamily: 'Exo',
            fontStyle: 'bold',
            fontSize: 24 + 'px',
            color: '#000000',
            align: 'center'
        });
        headingText.setOrigin(0.5, 0);
        headingText.scaleX = scene.getScaledValue(0);
        card.add(headingText);
        // new TextOverlay(scene, headingText, { label: heading });


        // Add content
        let contentTextObj: Phaser.GameObjects.Container | Phaser.GameObjects.Text | Phaser.GameObjects.Image | null = null;
        const gameConfigManager = GameConfigManager.getInstance();
        const topic = gameConfigManager.get('topic') || "compare_percents";

        if (text.includes('/')) {
            MathExpressionHelper.createMathExpression(scene, text, `mathjax-expression-${cardKey}`, {
                width: 200,
                height: 70,
                fontSize: 16,
            }, (image) => {
                card.add(image);
                contentTextObj = image;
                // new ImageOverlay(scene, image, { label: text });

                this.scaleContentIntoView(scene, image);
            });
        } else if (text.includes('^')) {
            MathExpressionHelper.createMathExpression(scene, text, `mathjax-expression-${cardKey}`, {
                width: 200,
                height: 50,
                fontSize: 16,
            }, (image) => {
                card.add(image);
                contentTextObj = image;
                // new ImageOverlay(scene, image, { label: text });

                this.scaleContentIntoView(scene, image);
            });
        } else if (text.startsWith('√') || text.startsWith('∛')) {
            MathExpressionHelper.createMathExpression(scene, text, `mathjax-expression-${cardKey}`, {
                width: 200,
                height: 50,
                fontSize: 16,
            }, (image) => {
                card.add(image);
                contentTextObj = image;
                // new ImageOverlay(scene, image, { label: text });

                this.scaleContentIntoView(scene, image);
            });
        } else if(topic === "grade7_topic3") {
            // Right side
            if (text.includes('|')) {
                const [coins, discount, item] = text.split('|');
                const [percentage, type] = discount.split(' ');
                const contentContainer = scene.add.container(0, 0);
                card.add(contentContainer);

                // --- Yellow box at the top ---   
                const yellowBoxContainer = scene.add.container(0, 0);
                // Use image instead of rectangle for yellow box
                const yellowBox = scene.addImage(
                    1,
                    -166, // 8px padding from top, adjust as needed
                    'yellow_box'
                ).setOrigin(0.5); 
                
                // Text inside yellow box
                const value = this.calculateDiscountedValue(coins, discount);
                const valueText = scene.addText(
                    0,
                    -160, // align vertically centered in yellow box image, adjust as needed
                    i18n.t('game.valueCoins', { value }),
                    {
                        font: '700 24px Exo',
                        color: '#000000',
                        align: 'center'
                    }
                ).setOrigin(0.5);

                // Add yellowBox and valueText to their container
                yellowBoxContainer.add([yellowBox, valueText]);
                yellowBoxContainer.setAlpha(0);
                contentContainer.add(yellowBoxContainer);
                const valueTextOverlay = new TextOverlay(scene, valueText, { label: i18n.t('game.valueCoins', { value }) });
                valueTextOverlay.setAriaHidden(true);
                yellowBoxContainer.setData('valueTextOverlay', valueTextOverlay);
                
                // Item image
                const itemImage = scene.addImage(0, -70, ITEM_MAPPING[item]).setOrigin(0.5);
                contentContainer.add(itemImage);
                // new ImageOverlay(scene, itemImage, {label: i18n.t(`game.items.${ITEM_MAPPING[item]}`)});

                // Coin text
                const coinText = scene.addText(0, 40, coins, {
                    font: '700 36px Exo',
                    color: '#000000',
                    align: 'center'
                }).setOrigin(0.5);
                contentContainer.add(coinText);
                // new TextOverlay(scene, coinText, { label: coins });

                // Discount image
                const discountImage = scene.addImage(0, 130, type === 'UP' ? 'discount_text_bg_green' : 'discount_text_bg_red').setOrigin(0.5);
                contentContainer.add(discountImage);
                // new ImageOverlay(scene, discountImage, {label: percentage + ' ' + CardHelper.discountTypeConversion(type)})

                // Create a container for percentage and type
                // Add percentage text
                const arrowIcon = scene.addImage(0,0,type === 'UP' ? 'arrow_up' : 'arrow_down').setOrigin(0, 0.5).setScale(0.9);
                const percentageText = scene.addText(arrowIcon.width + 5, 0, percentage, {
                    font: '700 30px Exo',
                    color: '#ffffff',
                    align: 'center'
                }).setOrigin(0, 0.5);
                // Add type text
                const typeText = scene.addText(arrowIcon.width + 5 + percentageText.width + 5, 20, this.discountTypeConversion(type), {
                    font: '700 20px Exo',
                    color: '#ffffff',
                    align: 'center'
                }).setOrigin(0, 1);

                const totalWidth = arrowIcon.displayWidth + percentageText.displayWidth + typeText.displayWidth + scene.getScaledValue(10);
                const discountTextContainer = scene.add.container(-totalWidth / 2, scene.getScaledValue(135));

                discountTextContainer.add([arrowIcon, percentageText, typeText]);
                contentContainer.add(discountTextContainer);

                contentContainer.scaleX = 0;
                scene.tweens.add({
                    targets: [contentContainer],
                    scaleX: 1,
                    scaleY: 1,
                    duration: 200,
                    ease: 'Cubic.easeIn',
                });

                contentTextObj = contentContainer;
            } 
            // Left side
            else {
                const contentContainer = scene.add.container(0, 0);
                card.add(contentContainer);

                // Coin image
                const coinImage = scene.addImage(0, -70, 'card_coins');
                contentContainer.add(coinImage);
                // new ImageOverlay(scene, coinImage, { label: text });

                // coin text
                const coinText = scene.addText(0, 40, text, {
                    font: '700 36px Exo',
                    color: '#000000',
                    align: 'center'
                }).setOrigin(0.5)
                contentContainer.add(coinText);
                // new TextOverlay(scene, coinText, { label: text })

                contentContainer.scaleX = 0;
                scene.tweens.add({
                    targets: [contentContainer],
                    scaleX: 1,
                    scaleY: 1,
                    duration: 200,
                    ease: 'Cubic.easeIn',
                });

                contentTextObj = contentContainer;
            }
        } else {
            MathExpressionHelper.createMathExpression(scene, text, `mathjax-expression-${cardKey}`, {
                width: 200,
                height: 40,
                fontSize: 12,
            }, (image) => {
                card.add(image);
                contentTextObj = image;
                // new ImageOverlay(scene, image, { label: text });

                this.scaleContentIntoView(scene, image);
            });
        }

        onCreate?.(bgImage, card);

        scene.tweens.add({
            targets: [headingText, bgImage],
            scaleX: scene.getScaledValue(1),
            duration: 200,
            ease: 'Cubic.easeIn',
            onComplete: () => {
                // Add hit area
                const hitArea = scene.addRectangle(0, 0, bgImage.displayWidth / scene.display.scale, bgImage.displayHeight / scene.display.scale, 0xffffff, 0);
                hitArea.setInteractive();
                card.add(hitArea);

                // Always set pointer cursor for hit area
                if (hitArea.input) {
                    hitArea.input.cursor = 'pointer';
                }

                // Event handlers
                if (onClick) {
                    hitArea.on('pointerdown', onClick);
                }
                hitArea.on('pointerover', () => {
                    if (card.getData('cardState') === 'default') {
                        const hoverImg = topic === "grade7_topic3" ? 'card_front_hover_amount' : 'card_front_hover';
                        bgImage.setTexture(hoverImg);
                        headingText.y = scene.getScaledValue(headingRaisedY);
                        if (contentTextObj) (contentTextObj as any).y = scene.getScaledValue(contentRaisedY);
                        card.y = scene.getScaledValue(cardRaisedY);
                    }
                });
                hitArea.on('pointerout', () => {
                    if (card.getData('cardState') === 'default') {
                        const cardImg = topic === "grade7_topic3" ? 'card_front_amount' : 'card_front';
                        bgImage.setTexture(cardImg);
                        headingText.y = scene.getScaledValue(headingDefaultY);
                        if (contentTextObj) (contentTextObj as any).y = scene.getScaledValue(contentDefaultY);
                        card.y = scene.getScaledValue(cardDefaultY);
                    }
                });
                hitArea.on('pointerdown', () => {
                    if (card.getData('cardState') === 'default') {
                        const pressedImg = topic === "grade7_topic3" ? 'card_front_pressed_amount' : 'card_front_pressed';
                        bgImage.setTexture(pressedImg);
                        headingText.y = scene.getScaledValue(headingDefaultY);
                        if (contentTextObj) (contentTextObj as any).y = scene.getScaledValue(contentDefaultY);
                        card.y = scene.getScaledValue(cardDefaultY);
                    }
                });
            }
        });

        // CardHelper.slideOut(scene, card);
    }

    public static animateYellowBox(_scene: BaseScene, yellowBoxContainer: Phaser.GameObjects.Container) {
        yellowBoxContainer.setAlpha(1);
        yellowBoxContainer.iterate?.((child: any) => child.setAlpha?.(1));

        const valueTextOverlay = yellowBoxContainer.list[0].getData('valueTextOverlay') as TextOverlay;
        if(valueTextOverlay) {
            valueTextOverlay.setAriaHidden(false);
        }
        // Don't animate for continue button
        // scene.tweens.add({
        //     targets: yellowBoxContainer,
        //     alpha: 1,
        //     duration: 300,
        //     ease: 'Cubic.easeIn',
        //     onComplete: () => {
        //         scene.tweens.add({
        //             targets: yellowBoxContainer,
        //             alpha: 0,
        //             duration: 700,
        //             delay: 500,
        //             ease: 'Cubic.easeOut'
        //         });
        //     }
        // });
    }

    public static glowSuccess(scene: BaseScene, container: Phaser.GameObjects.Container) {
        const glowSuccess = container.list[1] as Phaser.GameObjects.Image;

        scene.tweens.add({
            targets: glowSuccess,
            alpha: 1,
            duration: 500,
            ease: 'Back.easeIn',
            onComplete: () => {
                scene.tweens.add({
                    targets: glowSuccess,
                    alpha: 0,
                    duration: 1000,
                    delay: 500,
                    ease: 'Back.easeOut',
                });
            }
        });
    }

    public static glowError(scene: BaseScene, container: Phaser.GameObjects.Container) {
        const glowError = container.list[2] as Phaser.GameObjects.Image;
        scene.tweens.add({
            targets: glowError,
            alpha: 1,
            duration: 1000,
            ease: 'Back.easeIn',
            onComplete: () => {
                scene.tweens.add({
                    targets: glowError,
                    alpha: 0,
                    duration: 1000,
                    ease: 'Back.easeOut',
                });
            }
        });
    }

    public static discountTypeConversion(type: string): string{
        if(type === 'UP') {
            return i18n.t('game.discountTypeUp');
        } else {
            return i18n.t('game.discountTypeOff');
        }
    }

    public static createCard(
        scene: BaseScene,
        x: number,
        y: number,
        cardKey: string,
        heading: string,
        text: string,
        onClick?: () => void,
        onCreate?: (bgImage: Phaser.GameObjects.Image, card: Phaser.GameObjects.Container) => void
    ): Phaser.GameObjects.Container {
        const gameConfigManager = GameConfigManager.getInstance();
        const topic = gameConfigManager.get('topic') || "compare_percents";

        // Create a container to hold all card elements
        const container = scene.add.container(scene.getScaledValue(x), scene.getScaledValue(y));
        container.setData('cardState', 'default');
        container.setData('originalX', scene.getScaledValue(x));
        container.setData('originalY', scene.getScaledValue(y));

        const backCard = scene.addImage(0, 0, 'card_back').setOrigin(0.5);
        backCard.scaleX = scene.getScaledValue(0);
        container.add(backCard);

        const glowSuccess = scene.addImage(0, 0, 'card_glow_success').setOrigin(0.5).setAlpha(0);
        container.add(glowSuccess);

        const glowError = scene.addImage(0, 0, 'card_glow_error').setOrigin(0.5).setAlpha(0);
        container.add(glowError);

        // Create the card background using an image
        const cardImg = topic === "grade7_topic3" ? 'card_front_amount' : 'card_front';
        const bgImage = scene.addImage(0, 0, cardImg).setOrigin(0.5);
        bgImage.scaleX = scene.getScaledValue(0);
        container.add(bgImage);

        // Use the helper to add heading, content, and hit area
        CardHelper.setupCardContentAndEvents(scene, container, bgImage, heading, text, cardKey, onClick, onCreate);

        return container;
    }

    public static flashCard(scene: BaseScene, card: Phaser.GameObjects.Container, isCorrect: boolean) {
        if (isCorrect) {
            CardHelper.glowSuccess(scene, card);
        } else {
            CardHelper.glowError(scene, card);
        }
    }

    /**
     * Flips the card with a 3D-like animation and updates its content.
     * @param scene The Phaser scene
     * @param card The card container to flip
     * @param newHeading The new heading text
     * @param newText The new main content text
     * @param onClick The new onClick callback
     * @param onCreate The new onCreate callback
     */
    public static flipCard(
        scene: BaseScene,
        card: Phaser.GameObjects.Container,
        cardKey: string,
        newHeading: string,
        newText: string,
        onClick?: () => void,
        onCreate?: (bgImage: Phaser.GameObjects.Image, card: Phaser.GameObjects.Container) => void
    ) {
        const backCard = card.list[0] as Phaser.GameObjects.Image;
        const bgImage = card.list[3] as Phaser.GameObjects.Image;
        const heading = card.list[4] as Phaser.GameObjects.Text;
        const content = card.list[5] as Phaser.GameObjects.Container;
        const hitArea = card.list[6] as Phaser.GameObjects.Rectangle;

        scene.audioManager.playSoundEffect('card_flip');
        scene.tweens.add({
            targets: [heading, content, bgImage],
            scaleX: scene.getScaledValue(0),
            duration: 200,
            ease: 'Cubic.easeIn',
            onComplete: () => {
                scene.tweens.add({
                    targets: backCard,
                    scaleX: scene.getScaledValue(1),
                    duration: 200,
                    ease: 'Cubic.easeIn',
                    onComplete: () => {
                        scene.audioManager.stopSoundEffect('card_flip');
                        scene.tweens.add({
                            targets: backCard,
                            scaleX: scene.getScaledValue(0),
                            duration: 200,
                            ease: 'Cubic.easeIn',
                            onComplete: () => {

                                heading.destroy();
                                content.destroy();
                                hitArea.destroy();
                                scene.audioManager.playSoundEffect('card_flip');

                                CardHelper.setupCardContentAndEvents(scene, card, bgImage, newHeading, newText, cardKey, onClick, onCreate);
                            }
                        });
                    }
                });
            }
        });
    }

    public static calculateDiscountedValue(coinsStr: string, discountStr: string): number {
    const coins = parseFloat(coinsStr);
    if (isNaN(coins)) return 0;

    const [percentStr, type] = discountStr.split(' ');
    const percent = parseFloat(percentStr.replace('%', ''));
    if (isNaN(percent) || !type) return coins;

    if (type.toUpperCase() === 'UP') {
        return coins + (coins * percent / 100);
    } else if (type.toUpperCase() === 'OFF') {
        return coins - (coins * percent / 100);
    }
    return coins;
}
}