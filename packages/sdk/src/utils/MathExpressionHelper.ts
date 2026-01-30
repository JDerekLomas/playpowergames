import { mathjax } from 'mathjax-full/js/mathjax.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { SVG } from 'mathjax-full/js/output/svg.js';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';
import { BaseScene } from '../core/BaseScene';

interface MathExpressionConfig {
    width?: number;
    height?: number;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    color?: string;
    backgroundColor?: string;
}

export class MathExpressionHelper {
    public static createMathExpression(scene: BaseScene, input: string, textureKey: string, config: MathExpressionConfig = {}, cb?: (image: Phaser.GameObjects.Image) => void) {
        // Set default values
        const {
            width = 800,
            height = 200,
            fontSize = 16,
            fontFamily = 'serif',
            fontWeight = 'normal',
            color = '#000000',
            backgroundColor = 'transparent',
        } = config;

        // Initialize MathJax
        const adaptor = liteAdaptor();
        RegisterHTMLHandler(adaptor);
        const html = mathjax.document('', {
            InputJax: new TeX({ packages: ['base', 'ams', 'newcommand', 'configmacros'] }),
            OutputJax: new SVG({ fontCache: 'none' })
        });

        // Convert input to LaTeX
        const latex = this.createLatex(input);

        // Render math expression with font size control
        const node = html.convert(latex, {
            display: false,
            em: fontSize,
            ex: fontSize * 0.5,
            containerWidth: width
        });
        let svgString = adaptor.outerHTML(node);

        // Clean SVG - extract content and add proper attributes with styling
        const svgMatch = svgString.match(/<svg[^>]*>(.*?)<\/svg>/s);
        if (svgMatch) {
            // Use MathJax's original viewBox but set our desired width/height
            // This preserves the coordinate system while scaling to our size
            const viewBoxMatch = svgString.match(/viewBox="([^"]*)"/);
            const viewBox = viewBoxMatch ? viewBoxMatch[1] : '';

            svgString = `<svg xmlns="http://www.w3.org/2000/svg" 
                width="${width}" height="${height}" 
                viewBox="${viewBox}"
                preserveAspectRatio="xMidYMid meet"
                style="font-family: ${fontFamily}, serif; font-weight: ${fontWeight}; color: ${color}; background-color: ${backgroundColor};">
                ${svgMatch[1]}
            </svg>`;
        }

        // Create and load image
        const imageData = new Image();

        imageData.onload = () => {
            if (scene.textures.exists(textureKey)) {
                scene.textures.get(textureKey).destroy();
            }
            scene.textures.addImage(textureKey, imageData);

            // Display math expression
            const image = scene.addImage(0, 0, textureKey)
                .setOrigin(0.5);

            cb?.(image);
        };

        imageData.onerror = console.error;
        imageData.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`;
    }

    /**
     * Converts various math input formats to LaTeX
     * @param input - Math expression in various formats
     * @returns LaTeX string
     */
    public static createLatex(input: string): string {
        let latex = input.trim();

        // 1. Handle square root: √64 → \sqrt{64}
        latex = latex.replace(/√(\d+)/g, '\\sqrt{$1}');

        // 2. Handle cube root: ∛8 → \sqrt[3]{8}
        latex = latex.replace(/∛(\d+)/g, '\\sqrt[3]{$1}');

        // 3. Handle fractions: 1/4 → \frac{1}{4}
        latex = latex.replace(/(\d+)\/(\d+)/g, '\\frac{$1}{$2}');

        // 4. Handle scientific notation: 3 x 10^4 → 3 \times 10^{4} and 3 x 10^-4 → 3 \times 10^{-4}
        latex = latex.replace(/(\d+)\s*x\s*10\^(-?\d+)/g, '$1 \\times 10^{$2}');

        // 5. Handle simple powers: 10^5 → 10^{5}
        latex = latex.replace(/(\d+)\^(\d+)/g, '$1^{$2}');

        // 6. Handle multiplication with x: 3x4 → 3 \times 4 (but not in fractions or powers)
        latex = latex.replace(/(\d+)x(\d+)/g, (match, num1, num2) => {
            // Don't replace if it's part of a fraction or power
            if (latex.includes('\\frac') || latex.includes('^{')) {
                return match;
            }
            return `${num1} \\times ${num2}`;
        });

        return latex;
    }
}