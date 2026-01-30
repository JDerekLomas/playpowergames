import { BaseScene } from "../core/BaseScene";
/**
 * Style options for the mathematical expressions
 */
interface ExpressionStyleOptions {
  fontSize?: string;
  fontFamily?: string;
  font?: string;
  fontColor?: number;
  lineHeight?: number;
  spacing?: number;
  fractionLinePadding?: number;
  alignment?: 'center' | 'left';
}

/**
 * Default style settings for the expressions
 */
const DEFAULT_STYLE: ExpressionStyleOptions = {
  fontSize: "24px",
  fontFamily: "Arial",
  fontColor: 0xffffff,
  lineHeight: 3,
  spacing: 15,
  fractionLinePadding: 30,
  alignment: "center",
};

/**
 * Unified utility class for rendering mathematical expressions with fractions along with accessibility features
 */
export class ExpressionUtils {
  private container: Phaser.GameObjects.Container;
  private elements: (Phaser.GameObjects.Container | Phaser.GameObjects.Text)[] =
    [];
  private scene: BaseScene;
  private style: ExpressionStyleOptions;

  /**
   * Create a new expression container
   *
   * @param scene - The Phaser scene
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param expression - The mathematical expression string to render
   * @param styleOptions - Optional styling parameters
   * @param accessibilityOptions - Optional accessibility parameters
   */
  constructor(
    scene: BaseScene,
    x: number,
    y: number,
    expression: string,
    styleOptions: ExpressionStyleOptions = {}
  ) {
    this.scene = scene;
    this.style = { ...DEFAULT_STYLE, ...styleOptions };
    this.container = scene.add.container(
      scene.getScaledValue(x),
      scene.getScaledValue(y)
    );

    this.setExpression(expression);
  }

  /**
   * Set or update the mathematical expression
   *
   * @param expression - The expression string to parse and render
   */
  setExpression(expression: string): void {
    // Clear existing elements
    this.elements.forEach((element) => element.destroy());
    this.elements = [];
    this.container.removeAll(true);

    // Parse and create new elements
    const parsedElements = this.parseExpression(expression);
    parsedElements.forEach((element) => {
      this.container.add(element);
      this.elements.push(element);
    });

    this.updateLayout();
  }

  /**
   * Parse the expression string into visual elements
   *
   * @param input - The expression string to parse
   * @returns Array of game objects representing the expression
   */
  private parseExpression(
    input: string
  ): (Phaser.GameObjects.Container | Phaser.GameObjects.Text)[] {
    const fractionRegex = /([x𝑥\d]+)\s*(?:\s(\d+)\/(\d+)|\/(\d+))/g;
    
    const elements: (Phaser.GameObjects.Container | Phaser.GameObjects.Text)[] =
      [];
    let lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = fractionRegex.exec(input)) !== null) {
      // Add any preceding text as a text object
      if (match.index > lastIndex) {
        const text = input.substring(lastIndex, match.index);
        elements.push(this.createTextElement(text));
      }

      if (match[2] && match[3]) {
        // Mixed fraction (e.g., "1 1/4")
        elements.push(this.createTextElement(`${match[1]} `));
        elements.push(this.createFractionElement(match[2], match[3]));
      } else if (match[4]) {
        // Proper fraction (e.g., "3/4")
        elements.push(this.createFractionElement(match[1], match[4]));
      } else {
        // Improper fraction (e.g., "7/4")
        elements.push(this.createFractionElement(match[1], match[3]));
      }

      lastIndex = fractionRegex.lastIndex;
    }

    // Add any remaining text
    if (lastIndex < input.length) {
      const remainingText = input.substring(lastIndex);
      elements.push(this.createTextElement(remainingText));
    }

    return elements;
  }

  /**
   * Create a text element with current styling
   *
   * @param text - The text content
   * @returns Text game object
   */
  private createTextElement(text: string): Phaser.GameObjects.Text {
    // Format whole numbers with commas, but preserve decimals
    const formattedText = text.replace(/\b\d+\b/g, (match, offset, string) => {
      // Check if this number is part of a decimal by looking at surrounding characters
      const beforeChar = offset > 0 ? string[offset - 1] : '';
      const afterChar = offset + match.length < string.length ? string[offset + match.length] : '';
      
      // If there's a decimal point before or after this number, don't format it
      if (beforeChar === '.' || afterChar === '.') {
        return match;
      }
      
      const num = parseInt(match, 10);
      return Number.isInteger(num) ? num.toLocaleString() : match;
    });


    // Smart spacing around mathematical operators
    // Only add spaces around operators if they don't already exist
    let spacedText = formattedText;
    
    // Handle operators other than minus (+, *, /, =, ×, –, ÷)
    spacedText = spacedText
      .replace(/([+*/=×–÷])(?!\s)/g, "$1 ")  // Add space after operator if none exists
      .replace(/(?<!\s)([+*/=×–÷])/g, " $1");  // Add space before operator if none exists
    
    // Handle minus sign more carefully - only add spaces for subtraction, not negative numbers
    // Look for minus signs that are between numbers or before fractions (subtraction)
    spacedText = spacedText
      .replace(/(\d)\s*-\s*(\d)/g, "$1 - $2")  // Space around minus between numbers
      .replace(/(\d)\s*-\s*\//g, "$1 - /")  // Space around minus before fraction
      .replace(/\s*-\s*(\d)/g, " - $1");  // Space around minus before number (but not at start)
    
    // Clean up multiple spaces
    spacedText = spacedText.replace(/\s+/g, " ").trim();


    const hexColor = "#" + this.style.fontColor!.toString(16).padStart(6, "0");

    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: this.style.fontSize,
      fontFamily: this.style.fontFamily,
      color: hexColor,
    };

    if (this.style.font) {
      textStyle.font = this.style.font;
    }

    const textElement = this.scene
      .addText(0, 0, spacedText, textStyle)
      .setOrigin(0.5);

    return textElement;
  }

  /**
   * Create a fraction element with current styling
   *
   * @param numerator - The numerator text
   * @param denominator - The denominator text
   * @returns Container with fraction elements
   */
  private createFractionElement(
    numerator: string,
    denominator: string
  ): Phaser.GameObjects.Container {
    const fractionContainer = this.scene.add.container(0, 0);
    const hexColor = "#" + this.style.fontColor!.toString(16).padStart(6, "0");

    // Create text elements
    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: this.style.fontSize,
      fontFamily: this.style.fontFamily,
      color: hexColor,
    };

    if (this.style.font) {
      textStyle.font = this.style.font;
    }

    const lineHeight = this.style.lineHeight!;
    const linePadding = this.style.fractionLinePadding!;

    // Create numerator and denominator
    const numeratorText = this.scene
      .addText(0, -linePadding, numerator, textStyle)
      .setOrigin(0.5);
    const denominatorText = this.scene
      .addText(0, linePadding, denominator, textStyle)
      .setOrigin(0.5);

    // Create line between them
    const lineWidth = Math.max(numeratorText.width, denominatorText.width);
    const numeratorBottom = numeratorText.getBounds().bottom;
    const denominatorTop = denominatorText.getBounds().top;
    const lineY = (numeratorBottom + denominatorTop) / 2;

    const line = this.scene
      .addRectangle(0, lineY - lineHeight, lineWidth, lineHeight, this.style.fontColor)
      .setOrigin(0.5);

    // Add all elements to container
    fractionContainer.add([numeratorText, line, denominatorText]);

    // Manually set the container width to match the line width
    // This is needed because Container doesn't auto-calculate width
    (fractionContainer as any).width = lineWidth;
    (fractionContainer as any).height =
      linePadding * 2 + Math.max(numeratorText.height, denominatorText.height);

    // Store fraction data for potential future extraction
    (fractionContainer as any).fractionData = {
      numerator,
      denominator,
    };

    return fractionContainer;
  }

  /**
   * Updates the layout to position elements side by side
   */
  private updateLayout(): void {
    let totalWidth = 0;
    const spacing = this.scene.getScaledValue(this.style.spacing!);

    // Calculate total width
    this.elements.forEach((element) => {
      // For fractions, the width might be on the element directly
      const elementWidth = (element as any).getBounds().width ?? 0;
      totalWidth += elementWidth + spacing;
    });
    totalWidth -= spacing; // Remove extra spacing after last element

    // Position elements based on alignment
    let currentX: number;
    
    if (this.style.alignment === 'left') {
      currentX = 0;
    } else {
      // Default to center alignment
      currentX = -totalWidth / 2;
    }
    
    this.elements.forEach((element) => {
      const elementWidth = (element as any).getBounds().width ?? 0;
      element.setX(currentX + elementWidth / 2);
      currentX += elementWidth + spacing;
    });
  }

  /**
   * Set the spacing between elements
   *
   * @param spacing - The spacing value between elements
   */
  setSpacing(spacing: number): this {
    this.style.spacing = spacing;
    this.updateLayout();
    return this;
  }

  /**
   * Update style settings
   *
   * @param newStyle - New style options to apply
   */
  updateStyle(newStyle: Partial<ExpressionStyleOptions>): void {
    this.style = { ...this.style, ...newStyle };

    // Re-render with updated style if there's content
    if (this.elements.length > 0) {
      const currentExpression = this.extractCurrentExpression();
      this.setExpression(currentExpression);
    }
  }

  /**
   * Extract the current expression as a string
   * This is a best-effort function as it can't perfectly reconstruct mixed expressions
   */
  private extractCurrentExpression(): string {
    let result = "";

    this.elements.forEach((element) => {
      if (element instanceof Phaser.GameObjects.Text) {
        result += element.text;
      } else if ((element as any).fractionData) {
        const data = (element as any).fractionData;
        result += `${data.numerator}/${data.denominator}`;
      }
    });

    return result || "1 + 2/3"; // Return default if extraction failed
  }

  /**
   * Get the container holding the expression
   */
  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  /**
   * Set the position of the expression container
   */
  setPosition(x: number, y: number): this {
    this.container.setPosition(
      this.scene.getScaledValue(x),
      this.scene.getScaledValue(y)
    );

    return this;
  }

  /**
   * Set the visibility of the expression
   */
  setVisible(visible: boolean): this {
    this.container.setVisible(visible);
    return this;
  }

  /**
   * Destroy the expression and its elements
   */
  destroy(): void {
    this.elements.forEach((element) => element.destroy());
    this.elements = [];
    this.container.destroy();
  }
}
