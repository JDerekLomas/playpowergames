import { BaseScene, GameConfigManager, ImageOverlay, MathExpressionHelper, TextOverlay } from "@k8-games/sdk";
import { FractionVisualHelper } from "./FractionVisualHelper";

export type VisualType = "hundredthsGrid" | "pizza" | "rectangle" | "circles";

export class CardHelper {
    private static getVisualType(denominator: number): VisualType {
        if (denominator <= 5) return "pizza";
        else if (denominator > 5 && denominator <= 10) return "rectangle";
        else return "hundredthsGrid";
    }

    private static scaleContentIntoView(scene: BaseScene, content: Phaser.GameObjects.Image) {
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
     * Helper to add content and hit area with event handlers to a card container.
     */
    private static async setupCardContentAndEvents(
        scene: BaseScene,
        card: Phaser.GameObjects.Container,
        bgImage: Phaser.GameObjects.Image,
        cardKey: string,
        text: string,
        maxValue?: number,
        onClick?: () => void,
        onCreate?: (bgImage: Phaser.GameObjects.Image, card: Phaser.GameObjects.Container) => void,
        onEnd?: () => void,
    ) {
        // Y positions
        // const contentDefaultY = 0;
        // const contentRaisedY = -4;
        const cardDefaultY = (card.getData('originalY') / scene.display.scale);
        const cardRaisedY = cardDefaultY - 4;


        // Add content
        const { content: contentTextObj, type: contentType } = await this.createCardContent(scene, card, text, cardKey, bgImage, maxValue);
        card.add(contentTextObj);
        card.setData('type', contentType);
        const originalContentScale = (contentTextObj as Phaser.GameObjects.Container).scale;
        (contentTextObj as Phaser.GameObjects.Container).scaleX = scene.getScaledValue(0);

        onCreate?.(bgImage, card);
        onEnd?.();

        scene.tweens.add({
            targets: [contentTextObj],
            scaleX: originalContentScale,
            duration: 200,
            ease: 'Cubic.easeIn',
        });

        scene.tweens.add({
            targets: [bgImage],
            scaleX: scene.getScaledValue(1),
            scaleY: scene.getScaledValue(1),
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
                        bgImage.setTexture('card_front_hover');
                        // if (contentTextObj) (contentTextObj as any).y = scene.getScaledValue(contentRaisedY);
                        card.y = scene.getScaledValue(cardRaisedY);
                    }
                });
                hitArea.on('pointerout', () => {
                    if (card.getData('cardState') === 'default') {
                        bgImage.setTexture('card_front');
                        // if (contentTextObj) (contentTextObj as any).y = scene.getScaledValue(contentDefaultY);
                        card.y = scene.getScaledValue(cardDefaultY);
                    }
                });
                hitArea.on('pointerdown', () => {
                    if (card.getData('cardState') === 'default') {
                        bgImage.setTexture('card_front_pressed');
                        // if (contentTextObj) (contentTextObj as any).y = scene.getScaledValue(contentDefaultY);
                        card.y = scene.getScaledValue(cardDefaultY);
                    }
                });
            }
        });


    }

    private static createCardContent(
        scene: BaseScene,
        card: Phaser.GameObjects.Container,
        text: string,
        cardKey: string,
        bgImage: Phaser.GameObjects.Image,
        maxValue?: number
    ): Promise<{ content: Phaser.GameObjects.GameObject; type: string }> {
        return new Promise((resolve) => {
            if (text.includes('/')) {
                const [numerator, denominator] = text.split('/');
                const visual = this.getVisualType(maxValue || parseInt(denominator));
                const visualRep = FractionVisualHelper.createVisual(
                    scene,
                    { numerator: parseInt(numerator), denominator: parseInt(denominator) },
                    visual,
                    0,
                    -25
                );

                MathExpressionHelper.createMathExpression(scene, text, `mathjax-expression-${cardKey}`, {
                    width: 200,
                    height: 40,
                    fontSize: 16,
                }, (image) => {
                    card.add(image);
                    image.y += scene.getScaledValue(140);
                    this.scaleContentIntoView(scene, image);
                    return resolve({ content: visualRep, type: 'fraction' })
                });
            } else if (/^-?\d+$/.test(text)) {
                const numerator = parseInt(text);
                const compareNum = maxValue || numerator;
                let denominator = 0;
                if (compareNum <= 5) denominator = 5;
                else if (compareNum > 5 && compareNum <= 10) denominator = 10;
                else denominator = 100;

                const gameConfigManager = GameConfigManager.getInstance();
                const topic = gameConfigManager.get('topic') || "compare_percents";
                if (topic === "compare_fractions") denominator = numerator;

                let visual = this.getVisualType(denominator);
                if (topic === "compare_numbers") {
                    visual = "circles";
                    const visualRep = FractionVisualHelper.createVisual(
                        scene,
                        { numerator, denominator },
                        visual,
                        0,
                        -25,
                        cardKey
                    );

                    MathExpressionHelper.createMathExpression(scene, text, `mathjax-expression-${cardKey}`, {
                        width: 150,
                        height: 30,
                        fontSize: 14,
                    },
                        (image) => {
                            card.add(image);
                            image.y = scene.getScaledValue(140);
                            this.scaleContentIntoView(scene, image);
                            return resolve({ content: visualRep, type: 'fraction' });
                        }
                    )
                } else {
                    const visualRep = FractionVisualHelper.createVisual(
                        scene,
                        { numerator, denominator },
                        visual,
                        0,
                        -25
                    );

                    MathExpressionHelper.createMathExpression(scene, text, `mathjax-expression-${cardKey}`, {
                        width: 200,
                        height: 40,
                        fontSize: 16,
                    }, (image) => {
                        card.add(image);
                        image.y += scene.getScaledValue(140);
                        new ImageOverlay(scene, image, { label: text });
                        this.scaleContentIntoView(scene, image);
                        return resolve({ content: visualRep, type: 'fraction' });
                    });
                }
            } else {
                const mainText = scene.addText(0, 0, text, {
                    fontSize: 40,
                    color: '#000000',
                    fontFamily: 'Exo',
                    fontStyle: 'bold',
                    align: 'center',
                    wordWrap: { width: bgImage.displayWidth - 40 }
                });
                mainText.setOrigin(0.5, 0.5);
                new TextOverlay(scene, mainText, { label: text });
                return resolve({ content: mainText, type: 'text' });
            }
        })
    }

    public static async createCard(
        scene: BaseScene,
        x: number,
        y: number,
        cardKey: string,
        text: string,
        maxValue?: number,
        onClick?: () => void,
        onCreate?: (bgImage: Phaser.GameObjects.Image, card: Phaser.GameObjects.Container) => void,
        onEnd?: () => void
    ): Promise<Phaser.GameObjects.Container> {
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

        const bgImage = scene.add.image(0, 0, 'card_front').setOrigin(0.5);
        bgImage.scaleX = scene.getScaledValue(0);
        container.add(bgImage);

        await CardHelper.setupCardContentAndEvents(scene, container, bgImage, cardKey, text, maxValue, onClick, onCreate, onEnd);

        return container;
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
     * @param newText The new main content text
     * @param onClick The new onClick callback
     * @param onCreate The new onCreate callback
     * @param onEnd The new onEnd callback
     */
    public static flipCard(
        scene: BaseScene,
        card: Phaser.GameObjects.Container,
        cardKey: string,
        newText: string,
        maxValue?: number,
        onClick?: () => void,
        onCreate?: (bgImage: Phaser.GameObjects.Image, card: Phaser.GameObjects.Container) => void,
        onEnd?: () => void
    ) {
        const backCard = card.list[0] as Phaser.GameObjects.Image;
        const bgImage = card.list[3] as Phaser.GameObjects.Image;
        const content = card.list[4] as Phaser.GameObjects.GameObject;
        const contentType = card.getData('type');

        let mathJax: Phaser.GameObjects.Image | null = null;
        let hitArea: Phaser.GameObjects.Rectangle;

        if (contentType === 'fraction') {
            // For fraction content: content[4], mathJax[5], hitArea[6]
            mathJax = card.list[5] as Phaser.GameObjects.Image;
            hitArea = card.list[6] as Phaser.GameObjects.Rectangle;
        } else {
            // For text content: content[4], hitArea[5] (no mathJax)
            hitArea = card.list[5] as Phaser.GameObjects.Rectangle;
        }

        scene.audioManager.playSoundEffect('card_flip');

        // Create targets array based on content type
        const targets = [content, bgImage];
        if (mathJax) {
            targets.push(mathJax);
        }

        scene.tweens.add({
            targets: targets,
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
                                // Destroy objects based on content type
                                if (mathJax) {
                                    mathJax.destroy();
                                }
                                content.destroy();
                                hitArea.destroy();
                                scene.audioManager.playSoundEffect('card_flip');

                                CardHelper.setupCardContentAndEvents(scene, card, bgImage, cardKey, newText, maxValue, onClick, onCreate, onEnd);
                            }
                        });
                    }
                });
            }
        });
    }
}