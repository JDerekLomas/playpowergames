import { BaseScene } from '../scenes/BaseScene';
import { ButtonHelper, ExpressionUtils, i18n, TextOverlay } from '@k8-games/sdk';
import { CommonConfig } from '../config/CommonConfig';
import { QuestionData } from '../interfaces/gameplay';
import { parseFractionString } from '../utils/parseFractionString';

const {
    ASSETS: {
        KEYS: {
            FONT: fontKeys,
            IMAGE: { BUTTON: buttonKeys, ICON: iconKeys },
        },
    },
    REGEX_PATTERNS: regexPatterns,
} = CommonConfig;

/**
 * Extract numerator and denominator from a fraction string (including mixed fractions)
 * @param fractionString - The fraction string to parse (e.g., "1/2", "1 2/3", "5/3")
 * @returns Object with numerator and denominator, or null if parsing fails
 */
function extractFractionParts(fractionString: string): { updatedNumerator: number; denominator: number } | null {
    // Handle mixed fractions like "1 2/3"
    const mixedFractionMatch = fractionString.match(regexPatterns.MIXED_FRACTION);
    if (mixedFractionMatch) {
        const whole = Number(mixedFractionMatch[1]);
        const fractionNumerator = Number(mixedFractionMatch[2]);
        const denominator = Number(mixedFractionMatch[3]);
        if (!isNaN(whole) && !isNaN(fractionNumerator) && !isNaN(denominator) && denominator !== 0) {
            // Convert to improper fraction: whole * denominator + numerator
            const updatedNumerator = whole * denominator + fractionNumerator;
            return { updatedNumerator, denominator };
        }
    }

    // Handle simple fractions like "2/3"
    const simpleFractionMatch = fractionString.match(regexPatterns.SIMPLE_FRACTION);
    if (simpleFractionMatch) {
        const numerator = Number(simpleFractionMatch[1]);
        const denominator = Number(simpleFractionMatch[2]);
        if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
            return { updatedNumerator: numerator, denominator };
        }
    }

    // Handle whole numbers like "3" (treat as 3/1)
    const wholeNumberMatch = fractionString.match(regexPatterns.WHOLE_NUMBER);
    if (wholeNumberMatch) {
        const numerator = Number(wholeNumberMatch[1]);
        if (!isNaN(numerator)) {
            return { updatedNumerator: numerator, denominator: 1 };
        }
    }

    return null;
}

/**
 * If the string is a mixed fraction, split into whole and fraction part
 * e.g. "1 1/3" => { whole: "1", fraction: "1/3" }
 */
function splitMixedFraction(fractionString: string): { whole: string; fraction: string } | null {
    const mixedFractionMatch = fractionString.match(regexPatterns.MIXED_FRACTION);
    if (mixedFractionMatch) {
        return { whole: mixedFractionMatch[1], fraction: mixedFractionMatch[2] };
    }
    return null;
}

export class Tutorial {
    private scene: BaseScene;
    private mainContainer: Phaser.GameObjects.Container;
    private instructionContainer: Phaser.GameObjects.Container;
    private step: number = 0;
    private rectangles: Phaser.GameObjects.Rectangle[] = [];
    private rectOffset: number = 10;
    private line?: Phaser.GameObjects.Graphics;
    private leftMarker: { line: Phaser.GameObjects.Rectangle };
    private rightMarker: { line: Phaser.GameObjects.Rectangle };
    private onDestroy?: () => void;
    private question: QuestionData;

    constructor(
        scene: BaseScene,
        leftMarker: { line: Phaser.GameObjects.Rectangle },
        rightMarker: { line: Phaser.GameObjects.Rectangle },
        question: QuestionData,
        onDestroy?: () => void,
    ) {
        this.scene = scene;
        this.leftMarker = leftMarker;
        this.rightMarker = rightMarker;
        this.question = question;
        this.mainContainer = this.scene.add.container(
            this.scene.getScaledValue(this.scene.display.width / 2),
            this.scene.getScaledValue(210),
        ).setDepth(2);
        this.onDestroy = onDestroy;
        this.createTutorial();
    }

    private createTutorial() {
        // Add instruction box
        const instructionBox = this.scene
            .addRectangle(0, 0, this.scene.display.width + 2, 100, 0x000000, 0.7)
            .setStrokeStyle(this.scene.getScaledValue(1), 0xffffff)
            .setOrigin(0.5);

        this.instructionContainer = this.scene.add.container(
            this.scene.getScaledValue(this.scene.display.width / 2),
            this.scene.getScaledValue(210),
        ).setDepth(2);

        // Add navigation buttons
        const prevButton = ButtonHelper.createIconButton({
            scene: this.scene,
            imageKeys: {
                default: buttonKeys.SQ_DEFAULT,
                hover: buttonKeys.SQ_HOVER,
                pressed: buttonKeys.SQ_PRESSED,
            },
            icon: iconKeys.LEFT_ARROW_ICON,
            label: i18n.t('tutorial.previousStep'),
            raisedOffset: 3.5,
            x: this.scene.display.width / 2 - 330,
            y: 0,
            onClick: () => this.previousStep(),
        });

        const nextButton = ButtonHelper.createIconButton({
            scene: this.scene,
            imageKeys: {
                default: buttonKeys.SQ_DEFAULT,
                hover: buttonKeys.SQ_HOVER,
                pressed: buttonKeys.SQ_PRESSED,
            },
            icon: iconKeys.RIGHT_ARROW_ICON,
            label: i18n.t('tutorial.nextStep'),
            raisedOffset: 3.5,
            x: this.scene.display.width / 2 - 255,
            y: 0,
            onClick: () => this.nextStep(),
        });

        // const skipIcon = this.scene.addImage(this.scene.display.width / 2 - 130, -1, iconKeys.SKIP_ICON);
        const skipButton = ButtonHelper.createButton({
            scene: this.scene,
            imageKeys: {
                default: buttonKeys.DEFAULT,
                hover: buttonKeys.HOVER,
                pressed: buttonKeys.PRESSED,
            },
            text: i18n.t('tutorial.skip'),
            label: i18n.t('tutorial.skipTutorial'),
            textStyle: {
                font: "700 26px Exo",
                color: '#ffffff',
            },
            imageScale: 0.7,
            raisedOffset: 3.5,
            x: this.scene.display.width / 2 - 108,
            y: 0,
            onClick: () => this.destroy(),
        });

        this.mainContainer.add([instructionBox, prevButton, nextButton, skipButton]);

        // Start with first step
        this.showStep();
    }

    private createRectangles(count: number) {
        // Clear existing rectangles
        this.rectangles.forEach((rect) => rect.destroy());
        this.rectangles = [];

        const startX = this.leftMarker.line.x / window.devicePixelRatio;
        const endX = this.rightMarker.line.x / window.devicePixelRatio;

        // For mixed fractions, we need to consider the actual range of the numberline
        // and calculate how many pieces we need based on the range and the fraction
        const start = parseFractionString(this.question.startPoint) ?? 0;
        const end = parseFractionString(this.question.endPoint) ?? 1;
        const range = end - start;

        // Calculate the number of pieces needed based on the range
        // For example, if range is 0-2 and we have 5/3, we need 6 pieces (2 * 3)
        const piecesNeeded = Math.ceil(range * count);

        const width = (endX - startX) / piecesNeeded;
        const height = 15;

        for (let i = 0; i < piecesNeeded; i++) {
            const rect = this.scene
                .addRectangle(
                    startX + width * i + width / 2,
                    this.leftMarker.line.y / window.devicePixelRatio,
                    width - 2 * this.rectOffset,
                    height,
                    0x303742,
                )
                .setStrokeStyle(this.scene.getScaledValue(1), 0xffffff)
                .setOrigin(0.5);
            this.rectangles.push(rect);
        }
    }

    private highlightRectangles(count: number) {


        this.rectangles.forEach((rect, index) => {
            rect.fillColor = index < count ? 0xFFF600 : 0x303742;
        });
    }

    private showLine() {
        if (this.line) {
            this.line.destroy();
        }

        const startX = this.leftMarker.line.x;
        const endX = this.rightMarker.line.x;
        const answer = parseFractionString(this.question.shipLocation) ?? 0;
        const start = parseFractionString(this.question.startPoint) ?? 0;
        const end = parseFractionString(this.question.endPoint) ?? 1;
        const targetX = startX + ((endX - startX) * (answer - start)) / (end - start);
        const startY = this.leftMarker.line.y - this.scene.getScaledValue(276);

        const graphics = this.scene.add.graphics();
        graphics.lineStyle(this.scene.getScaledValue(4), 0xFFF600);

        // Draw dotted vertical line
        const totalHeight = this.scene.getScaledValue(450);
        const dotHeight = this.scene.getScaledValue(30);
        const gap = this.scene.getScaledValue(10);
        let y = startY;
        while (y < startY + totalHeight) {
            graphics.beginPath();
            graphics.moveTo(targetX, y);
            graphics.lineTo(targetX, y + dotHeight);
            graphics.strokePath();
            y += dotHeight + gap;
        }

        graphics.setDepth(1);

        this.line = graphics;
    }

    private showStep() {
        // Clear previous content
        this.instructionContainer.removeAll(true);
        this.instructionContainer.setX(this.scene.getScaledValue(this.scene.display.width / 2));

        // Extract numerator and denominator using the new utility function
        const fractionParts = extractFractionParts(this.question.questionPrompt);
        if (!fractionParts) {
            return;
        }
        const { updatedNumerator, denominator } = fractionParts;

        const mixed = splitMixedFraction(this.question.questionPrompt);

        if (this.step === 0) {
            if (this.rectangles.length > 0) {
                this.rectangles.forEach((rect) => rect.destroy());
                this.rectangles = [];
            }
            const text1 = this.scene
                .addText(0, 0, i18n.t('tutorial.step1.1'), {
                    fontSize: '32px',
                    color: '#ffffff',
                    fontFamily: fontKeys.EXO,
                })
                .setOrigin(0, 0.5);

            let elements: Phaser.GameObjects.GameObject[] = [text1];
            let lastRight = text1.getBounds().right;
            if (mixed) {
                // Add whole number with space
                const wholeText = this.scene.addText(0, 0, mixed.whole, {
                    fontSize: '32px',
                    color: '#ffffff',
                    fontFamily: fontKeys.EXO,
                }).setOrigin(0, 0.5);
                wholeText.setX(lastRight + this.scene.getScaledValue(20));
                elements.push(wholeText);
                lastRight = wholeText.getBounds().right;
                // Add fraction with space
                const expr = new ExpressionUtils(this.scene, 0, 0, mixed.fraction, {
                    fontSize: '32px',
                    fontFamily: fontKeys.EXO,
                    fontColor: 0xffffff,
                    spacing: 5,
                    fractionLinePadding: 20,
                }).getContainer();
                expr.setX(lastRight + this.scene.getScaledValue(20));
                elements.push(expr);
                lastRight = expr.getBounds().right;
            } else {
                // Not a mixed fraction, render as before
                const expr = new ExpressionUtils(this.scene, 0, 0, this.question.questionPrompt, {
                    fontSize: '32px',
                    fontFamily: fontKeys.EXO,
                    fontColor: 0xffffff,
                    spacing: 5,
                    fractionLinePadding: 20,
                }).getContainer();
                expr.setX(lastRight + this.scene.getScaledValue(15));
                elements.push(expr);
                lastRight = expr.getBounds().right;
            }
            // Add trailing text
            const text2 = this.scene
                .addText(0, 0, i18n.t('tutorial.step1.2'), {
                    fontSize: '32px',
                    color: '#ffffff',
                    fontFamily: fontKeys.EXO,
                })
                .setOrigin(0, 0.5);
            text2.setX(lastRight + this.scene.getScaledValue(20));
            elements.push(text2);

            this.instructionContainer.add(elements);
            // Add overlays only to text elements (text1 and text2)
            if (text1 instanceof Phaser.GameObjects.Text) {
                new TextOverlay(this.scene, text1, { label: i18n.t('tutorial.step1.1') });
            }
            if (text2 instanceof Phaser.GameObjects.Text) {
                new TextOverlay(this.scene, text2, { label: i18n.t('tutorial.step1.2') });
            }
            const totalWidth = (elements[elements.length - 1] as Phaser.GameObjects.Container | Phaser.GameObjects.Text).getBounds().right
                - (elements[0] as Phaser.GameObjects.Container | Phaser.GameObjects.Text).getBounds().left;
            this.instructionContainer.setX(this.scene.getScaledValue(this.scene.display.width / 2) - totalWidth / 2);
        } else if (this.step == 1) {
            // Calculate the total number of pieces needed for the entire range
            const start = parseFractionString(this.question.startPoint) ?? 0;
            const end = parseFractionString(this.question.endPoint) ?? 1;
            const range = end - start;
            const totalPieces = Math.ceil(range * denominator);

            this.createRectangles(denominator);
            const text = this.scene
                .addText(0, 0, i18n.t('tutorial.step2', { denominator: totalPieces }), {
                    fontSize: '32px',
                    color: '#ffffff',
                    fontFamily: fontKeys.EXO,
                })
                .setOrigin(0.5);
            this.instructionContainer.add(text);
            new TextOverlay(this.scene, text, { label: i18n.t('tutorial.step2', { denominator: totalPieces }) });
        } else if (this.step == 2) {
            if (this.rectangles.length == 0) {
                this.createRectangles(denominator);
            }
            this.highlightRectangles(updatedNumerator);
            if (this.line) {
                this.line.destroy();
                this.line = undefined;
            }

            const piecesToCount = updatedNumerator;
            const text = this.scene
                .addText(0, 0, i18n.t('tutorial.step3', { numerator: piecesToCount }), {
                    fontSize: '32px',
                    color: '#ffffff',
                    fontFamily: fontKeys.EXO,
                })
                .setOrigin(0.5);
            this.instructionContainer.add(text);
            new TextOverlay(this.scene, text, { label: i18n.t('tutorial.step3', { numerator: piecesToCount }) });
        } else if (this.step == 3) {
            this.showLine();
            if (this.rectangles.length > 0) {
                this.rectangles.forEach((rect) => rect.destroy());
                this.rectangles = [];
            }
            const text1 = this.scene
                .addText(0, 0, i18n.t('tutorial.step4.1'), {
                    fontSize: '32px',
                    color: '#ffffff',
                    fontFamily: fontKeys.EXO,
                })
                .setOrigin(0, 0.5);
            let elements: Phaser.GameObjects.GameObject[] = [text1];
            let lastRight = text1.getBounds().right;
            if (mixed) {
                // Add whole number with space
                const wholeText = this.scene.addText(0, 0, mixed.whole, {
                    fontSize: '32px',
                    color: '#ffffff',
                    fontFamily: fontKeys.EXO,
                }).setOrigin(0, 0.5);
                wholeText.setX(lastRight + this.scene.getScaledValue(20));
                elements.push(wholeText);
                lastRight = wholeText.getBounds().right;
                // Add fraction with space
                const expr = new ExpressionUtils(this.scene, 0, 0, mixed.fraction, {
                    fontSize: '32px',
                    fontFamily: fontKeys.EXO,
                    fontColor: 0xffffff,
                    spacing: 5,
                    fractionLinePadding: 20,
                }).getContainer();
                expr.setX(lastRight + this.scene.getScaledValue(20));
                elements.push(expr);
                lastRight = expr.getBounds().right;
            } else {
                // Not a mixed fraction, render as before
                const expr = new ExpressionUtils(this.scene, 0, 0, this.question.questionPrompt, {
                    fontSize: '32px',
                    fontFamily: fontKeys.EXO,
                    fontColor: 0xffffff,
                    spacing: 5,
                    fractionLinePadding: 20,
                }).getContainer();
                expr.setX(lastRight + this.scene.getScaledValue(15));
                elements.push(expr);
                lastRight = expr.getBounds().right;
            }
            // Add trailing text
            const text2 = this.scene
                .addText(0, 0, i18n.t('tutorial.step4.2'), {
                    fontSize: '32px',
                    color: '#ffffff',
                    fontFamily: fontKeys.EXO,
                })
                .setOrigin(0, 0.5);
            text2.setX(lastRight + this.scene.getScaledValue(20));
            elements.push(text2);

            this.instructionContainer.add(elements);
            // Add overlays only to text elements (text1 and text2)
            if (text1 instanceof Phaser.GameObjects.Text) {
                new TextOverlay(this.scene, text1, { label: i18n.t('tutorial.step4.1') });
            }
            if (text2 instanceof Phaser.GameObjects.Text) {
                new TextOverlay(this.scene, text2, { label: i18n.t('tutorial.step4.2') });
            }
            const totalWidth = (elements[elements.length - 1] as Phaser.GameObjects.Container | Phaser.GameObjects.Text).getBounds().right
                - (elements[0] as Phaser.GameObjects.Container | Phaser.GameObjects.Text).getBounds().left;
            this.instructionContainer.setX(this.scene.getScaledValue(this.scene.display.width / 2) - totalWidth / 2);
        }
    }

    private nextStep() {
        if (this.step < 3) {
            this.step++;
            this.showStep();
        } else if (this.step === 3) {
            this.destroy();
        }
    }

    private previousStep() {
        if (this.step > 0) {
            this.step--;
            this.showStep();
        }
    }

    public destroy() {
        this.instructionContainer.destroy();
        this.mainContainer.destroy();
        this.rectangles.forEach((rect) => rect.destroy());
        this.rectangles = [];
        this.line?.destroy();
        this.line = undefined;
        this.onDestroy?.();
    }
}
