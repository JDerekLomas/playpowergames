import { BaseScene } from "@k8-games/sdk";

export class ExpressionHelper {
    /**
     * Creates a formatted mathematical expression with proper superscripts
     * @param scene The base scene
     * @param x X coordinate
     * @param y Y coordinate
     * @param expression Expression like "2x10^2"
     * @param config Text configuration
     * @returns Container with the formatted expression
     */
    public static createExpression(
        scene: BaseScene,
        x: number,
        y: number,
        expression: string,
        config: {
            fontSize?: number;
            color?: string;
            fontFamily?: string;
            fontStyle?: string;
        } = {}
    ) {
        const container = scene.add.container(x, y);

        // Default configuration
        const fontSize = config.fontSize || 32;
        const color = config.color || '#000000';
        const fontFamily = config.fontFamily || 'Arial';
        const fontStyle = config.fontStyle || 'normal';

        // Split the expression into parts (base and exponent)
        const parts = expression.split('^');
        const baseText = parts[0];
        const exponent = parts[1];

        // Create the base text
        const baseTextObj = scene.addText(0, 0, baseText, {
            fontSize: fontSize + 'px',
            color: color,
            fontFamily: fontFamily,
            fontStyle: fontStyle,
        });
        baseTextObj.setOrigin(0, 0.5);
        container.add(baseTextObj);

        // If there's an exponent, add it as superscript
        if (exponent) {
            const superscriptSize = fontSize * 0.7; // Make superscript smaller
            const superscriptObj = scene.addText(
                baseTextObj.width + 2,
                -fontSize * 0.3, // Move up by 30% of fontSize
                exponent,
                {
                    fontSize: superscriptSize + 'px',
                    color: color,
                    fontFamily: fontFamily,
                    fontStyle: fontStyle
                }
            );
            superscriptObj.setOrigin(0, 0.5);
            container.add(superscriptObj);
        }

        // Center the container on its registration point
        const bounds = container.getBounds();
        container.setPosition(
            x - bounds.width / 2,
            y
        );

        return container;
    }

    /**
     * Creates a formatted fraction display
     * @param scene The base scene
     * @param x X coordinate
     * @param y Y coordinate
     * @param numerator Numerator of the fraction
     * @param denominator Denominator of the fraction
     * @param config Text configuration
     * @returns Container with the formatted fraction
     */
    public static createFraction(
        scene: BaseScene,
        x: number,
        y: number,
        numerator: string,
        denominator: string,
        config: {
            fontSize?: number;
            color?: string;
            fontFamily?: string;
            fontStyle?: string;
        } = {}
    ) {
        const container = scene.add.container(scene.getScaledValue(x), scene.getScaledValue(y));

        // Default configuration
        const fontSize = config.fontSize || 40;
        const color = config.color || '#000000';
        const fontFamily = config.fontFamily || 'Arial';
        const fontStyle = config.fontStyle || 'normal';

        // Create numerator text
        const numeratorText = scene.addText(0, -fontSize * 0.7, numerator, {
            fontSize: fontSize + 'px',
            color: color,
            fontFamily: fontFamily,
            fontStyle: fontStyle
        });
        numeratorText.setOrigin(0.5);
        container.add(numeratorText);

        // Create denominator text
        const denominatorText = scene.addText(0, fontSize * 0.7, denominator, {
            fontSize: fontSize + 'px',
            color: color,
            fontFamily: fontFamily,
            fontStyle: fontStyle
        });
        denominatorText.setOrigin(0.5);
        container.add(denominatorText);

        // Create fraction line
        const lineWidth = Math.max(numeratorText.width, denominatorText.width) * 1.2;
        const lineHeight = fontSize * 0.08; // Line thickness relative to font size
        const line = scene.addRectangle(0, -fontSize * 0.1, lineWidth, lineHeight, parseInt(color.replace('#', '0x'))).setOrigin(0.5);
        container.add(line);

        return container;
    }
}
