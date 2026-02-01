import { QuestionData } from '../interfaces/gameplay';
import { BaseScene } from '../scenes/BaseScene';
import { ButtonOverlay, ExpressionUtils, GameConfigManager, i18n, TextOverlay } from '@k8-games/sdk';
import { parseFractionString } from './parseFractionString';
import { formatMathExpression } from './parseExpression';
import { GameScreenConfig } from '../config/GameScreenConfig';
import { decimalToFraction } from './sharkAnnouncement';

export interface Marker {
    line: Phaser.GameObjects.Rectangle;
    text: ExpressionUtils | null;
}

const MARKER_ANIMATION_DURATION = 500;

export class UIUtils {
    // Counter for unlabeled markers
    private static unlabelledMarkerCounter: number = 0;
    /**
     * Creates a background image that covers the entire scene while maintaining aspect ratio
     * @param scene The scene to add the background to
     * @param textureKey The key of the background image texture
     * @returns The created background image
     */
    static createCoverBackground(scene: BaseScene, textureKey: string, stars?: boolean, clouds?: boolean): Phaser.GameObjects.Image {
        const background = scene.addImage(scene.display.width / 2, scene.display.height / 2, textureKey).setOrigin(0.5);

        // Calculate scale to cover the entire screen while maintaining aspect ratio
        const scaleX = scene.display.width / scene.textures.get(textureKey).getSourceImage().width;
        const scaleY = scene.display.height / scene.textures.get(textureKey).getSourceImage().height;
        const scale = Math.max(scaleX, scaleY);

        background.setScale(scale);

        if (stars) {
            // stars
            const stars1 = scene.addImage(scene.display.width / 2, 0, 'bg_stars_1').setOrigin(0.5, 0).setAlpha(0);
            const stars2 = scene.addImage(scene.display.width / 2, 0, 'bg_stars_2').setOrigin(0.5, 0).setAlpha(0);
        
            // Configurable values
            const fadeDuration = 1000;
            const holdDuration = 2000;
            const cycleDuration = 2 * fadeDuration + holdDuration;
        
            const fadeInOut = (image: Phaser.GameObjects.Image) => {
                scene.tweens.add({
                    targets: image,
                    alpha: 0.5,
                    duration: fadeDuration,
                    ease: 'Power2.easeOut',
                    onComplete: () => {
                        scene.time.delayedCall(holdDuration, () => {
                            scene.tweens.add({
                                targets: image,
                                alpha: 0,
                                duration: fadeDuration,
                                ease: 'Power2.easeIn',
                            });
                        });
                    },
                });
            };

            fadeInOut(stars1);
        
            let toggle = false;
        
            scene.time.addEvent({
                delay: cycleDuration,
                loop: true,
                callback: () => {
                    if (toggle) {
                        fadeInOut(stars1);
                    } else {
                        fadeInOut(stars2);
                    }
                    toggle = !toggle;
                },
            });
        }

        if (clouds) {
            const cloudTexture = scene.textures.get('bg_clouds');
            const cloudHeight = cloudTexture.getSourceImage().height;
            const cloudWidth = cloudTexture.getSourceImage().width;
            
            const cloudTileSprite = scene.addTileSprite(
                scene.display.width / 2, 
                210,
                'bg_clouds',
                scene.display.width,
                cloudHeight,
            ).setOrigin(0.5, 0.5).setAlpha(0.5);

            // Add subtle horizontal scrolling animation for the clouds
            scene.tweens.add({
                targets: cloudTileSprite,
                tilePositionX: -cloudWidth,
                duration: 60000,
                ease: 'Linear',
                repeat: -1, // Infinite repeat
            });
        }

        return background;
    }

    /**
     * Creates a single vertical line with a number on top
     * @param scene The scene to add the line to
     * @param x The x position of the line
     * @param options Configuration options for the line
     */
    static createVerticalLineWithNumber(
        scene: BaseScene,
        x: number,
        options: {
            number: number | string;
            lineWidth?: number;
            lineHeight?: number;
            lineColor?: number;
            fontSize?: number;
            fontColor?: number;
            numberOffsetY?: number;
            fontFamily?: string;
            showNumber?: boolean;
            yOffset?: number;
            animate?: boolean;
            suffix?: string;
            parentContainer?: HTMLElement;
            a11y?: {
                enabled?: boolean;
                onActivate?: (x: number) => void;
            };
        },
    ) {
        const {
            number,
            lineWidth = 4,
            lineHeight = 100,
            lineColor = 0xffffff,
            fontSize = 24,
            fontColor = 0xffffff,
            numberOffsetY = 45,
            fontFamily,
            showNumber = true,
            yOffset = 0,
            animate = true,
            suffix,
        } = options;

        const centerY = scene.display.height / 2 + yOffset;
        const startY = centerY - lineHeight / 2;

        // Create the line with initial height
        const line = scene.addRectangle(x, centerY, lineWidth, lineHeight, lineColor).setOrigin(0.5);

        if (animate) {
            // First scale down to 0
            line.setScale(1, 0);

            // Then animate scale back up
            scene.time.delayedCall(MARKER_ANIMATION_DURATION, () => {
                scene.tweens.add({
                    targets: line,
                    scaleY: 1,
                    duration: MARKER_ANIMATION_DURATION,
                    ease: 'Cubic.easeOut',
                });
            });
        }

        let text: ExpressionUtils | null = null;
        if (showNumber) {
            let numberString = formatMathExpression(number.toString());
            
            // Add suffix if provided
            if (suffix) {
                numberString = numberString + suffix;
            }
            
            text = new ExpressionUtils(scene, x, startY, numberString, {
                fontSize: `${fontSize}px`,
                fontColor,
                fontFamily,
                spacing: 5,
                fractionLinePadding: fontSize * 0.7,
            });
            // set the expression for finding the nearest marker
            text.getContainer().setData("expression", number.toString());
            if (animate) {
                text.getContainer().setScale(0);
                scene.time.delayedCall(MARKER_ANIMATION_DURATION, () => {
                    scene.tweens.add({
                        targets: text?.getContainer(),
                        scale: 1,
                        duration: MARKER_ANIMATION_DURATION,
                        ease: 'Cubic.easeOut',
                    });
                });
            }

            text.setPosition(x, startY - numberOffsetY);
            
            if (!options.a11y?.enabled) {
                const textOverlay = new TextOverlay(scene, text.getContainer().getAt(0) as Phaser.GameObjects.Text, { 
                    label: i18n.t('common.marker', { number: numberString }),
                });
                // Move overlay to parent container if provided
                if (options.parentContainer && textOverlay.element) {
                    options.parentContainer.appendChild(textOverlay.element);
                }
            }
        }

        // Create accessible button for marker
        if (options.a11y?.enabled) {
            let a11yLabel = '';
            if (showNumber) {
                a11yLabel = i18n.t('common.marker', { number: formatMathExpression(number.toString()) });
            } else {
                a11yLabel = i18n.t('common.unlabelledMarker', { number: ++UIUtils.unlabelledMarkerCounter });
            }

            const targetWidth = lineWidth;
            const targetHeight = lineHeight;
            const container = scene.add.container(
                scene.getScaledValue(x),
                scene.getScaledValue(centerY)
            );
            const sizeRect = scene.addRectangle(0, 0, targetWidth, targetHeight, 0x000000).setAlpha(0).setOrigin(0.5);
            container.add(sizeRect);
            container.setSize(targetWidth, targetHeight);

            const overlay = new ButtonOverlay(scene, container, {
                label: a11yLabel,
                cursor: `url(${GameScreenConfig.ASSETS.PATHS.CURSOR}) ${GameScreenConfig.CURSOR.OFFSET.X} ${GameScreenConfig.CURSOR.OFFSET.Y}, pointer`,
                onKeyDown: () => options.a11y?.onActivate && options.a11y.onActivate(line.x),
                onFocus: () => {
                    UIUtils.setMarkerFocus({ line, text }, true);
                },
                onBlur: () => {
                    UIUtils.setMarkerFocus({ line, text }, false);
                }
            });
            // Move overlay to parent container if provided
            if (options.parentContainer && overlay.element) {
                options.parentContainer.appendChild(overlay.element);
            }
            (container as any).buttonOverlay = overlay;
            (line as any).a11yContainer = container;
            (line as any).a11yOverlay = overlay;

            // Clean up overlay when the line is destroyed
            line.once('destroy', () => {
                overlay.cleanup();
                container.destroy();
            });
        }

        return { line, text };
    }

    /**
     * Creates vertical lines with numbers for the number line
     * @param scene The scene to add the lines to
     * @param config Configuration options for the lines
     */
    static createVerticalLinesWithNumbers(
        scene: BaseScene,
        config: {
            lineHeight: number;
            width: number;
            color: number;
            horizontalMargin: number;
            fontSize: number;
            fontColor: number;
            fontFamily: string;
            markersList?: QuestionData['markersList'];
            visibleMarkers?: QuestionData['visibleMarkers'];
            startPoint: number | string;
            endPoint: number | string;
            numberLinePadding?: number;
            showIntermediateNumbers?: boolean;
            hideIntermediateTicks?: boolean;
            yOffset?: number;
            animate?: boolean;
            suffix?: string;
            answer?: number | string;
            parentContainer?: HTMLElement;
            a11y?: {
                enabled?: boolean;
                onActivate?: (x: number) => void;
            };
        },
    ): {
        leftMarker: Marker | null;
        rightMarker: Marker | null;
        markers: Marker[];
    } {
        const { width: gameWidth } = scene.display;
        const leftX = config.horizontalMargin;
        const rightX = gameWidth - config.horizontalMargin;
        const yOffset = config.yOffset || 0;
        const centerY = scene.display.height / 2 + yOffset;
        const animate = config.animate ?? true;
        let markersList = config.markersList;
        UIUtils.unlabelledMarkerCounter = 0;
        const start = parseFractionString(config.startPoint);
        const end = parseFractionString(config.endPoint);
        const answerValue = config.answer !== undefined ? parseFractionString(config.answer.toString()) : null;

        const numberLinePadding = config.numberLinePadding || 0;
        const numberLineWidth = scene.display.width - 2 * numberLinePadding;

        const numberLine = scene
            .addRectangle(numberLinePadding, centerY, animate ? 0 : numberLineWidth, 4, 0xffffff)
            .setOrigin(0, 0.5);

        if (animate) {
            scene.tweens.add({
                targets: numberLine,
                width: scene.getScaledValue(numberLineWidth),
                duration: MARKER_ANIMATION_DURATION,
                ease: 'Cubic.easeOut',
            });
        }

        // Create left marker
        let leftMarker: Marker | null = null;
        if (config.startPoint !== undefined) {
            let showNumber = true;
            let label = config.startPoint;
            if (config.visibleMarkers && config.visibleMarkers.length > 0) {
                showNumber = config.visibleMarkers.some(marker => {
                    const parsedLabel = parseFractionString(marker);
                    const parsedValue = parseFractionString(config.startPoint.toString());
                    const doesMatch = parsedLabel === parsedValue;
                    if (doesMatch) label = marker;
                    return doesMatch;
                });
                // TODO: remove this later
                showNumber = true;
            }
			leftMarker = this.createVerticalLineWithNumber(scene, leftX, {
                lineHeight: Math.round(config.lineHeight * 1.5),
                lineColor: config.color,
                showNumber,
                number: label,
                fontSize: config.fontSize,
                fontColor: config.fontColor,
                fontFamily: config.fontFamily,
                yOffset: yOffset,
                animate: animate,
                suffix: config.suffix,
                parentContainer: config.parentContainer,
                a11y: config.a11y,
            });
        }

        // Create additional markers if markersList is provided
        const markers: { line: Phaser.GameObjects.Rectangle; text: ExpressionUtils | null }[] = [];
        if (markersList && markersList.length > 0) {
            // Filter out start and end points from markersList
            const filteredMarkersList = markersList.filter(value => 
                parseFractionString(value) !== parseFractionString(config.startPoint) &&
                parseFractionString(value) !== parseFractionString(config.endPoint)
            );
            const answerExistsAsMarker = answerValue !== null && filteredMarkersList.some(value => parseFractionString(value) === answerValue);
            let answerInserted = answerValue === null || answerExistsAsMarker || start === null || end === null || !(config.a11y?.enabled);

            filteredMarkersList.forEach((value) => {
                // calculate the x position of the marker based on value and endPoints positions and value
                const valueAsNumber = parseFractionString(value);
                const start = parseFractionString(config.startPoint);
                const end = parseFractionString(config.endPoint);
                if (valueAsNumber !== null && start !== null && end !== null) {
                    const percentage = (valueAsNumber - start) / (end - start);
                    const markerX = leftX + (rightX - leftX) * percentage;
                    // Insert invisible answer overlay before first marker greater than answer
                    if (!answerInserted && answerValue !== null && answerValue > start && answerValue < end && answerValue < valueAsNumber && config.a11y?.enabled) {
                        const answerPercentage = (answerValue - start) / (end - start);
                        const answerX = leftX + (rightX - leftX) * answerPercentage;
                        const answerMarker = this.createInvisibleAnswerOverlay(scene, answerX, centerY, config.lineHeight, config.a11y, config.answer!.toString(), markersList, config.parentContainer);
                        markers.push(answerMarker);
                        answerInserted = true;
                    }
                    // When hideIntermediateTicks is true, skip creating tick marks and labels entirely
                    if (config.hideIntermediateTicks) {
                        // Still need invisible marker for a11y/click detection if enabled
                        if (config.a11y?.enabled) {
                            const answerMarker = this.createInvisibleAnswerOverlay(scene, markerX, centerY, config.lineHeight, config.a11y, value.toString(), markersList, config.parentContainer);
                            markers.push(answerMarker);
                        }
                    } else {
                        let showNumber = config.showIntermediateNumbers ?? true;
                        let label = value;
                        if (config.visibleMarkers && config.visibleMarkers.length > 0) {
                            showNumber = config.visibleMarkers.some(marker => {
                                const parsedLabel = parseFractionString(marker);
                                const parsedValue = parseFractionString(value);
                                const doesMatch = parsedLabel === parsedValue;
                                if (doesMatch) label = marker;
                                return doesMatch;
                            });
                        }
                        const marker = this.createVerticalLineWithNumber(scene, markerX, {
                            lineHeight: config.lineHeight,
                            lineColor: config.color,
                            number: label,
                            fontSize: config.fontSize,
                            fontColor: config.fontColor,
                            fontFamily: config.fontFamily,
                            showNumber,
                            yOffset: yOffset,
                            animate: animate,
                            suffix: config.suffix,
                            parentContainer: config.parentContainer,
                            a11y: config.a11y,
                        });
                        markers.push({ line: marker.line, text: marker.text });
                    }
                }
            });
            // If answer lies after all interior markers but before right marker, insert now
            if (!answerInserted && answerValue !== null && start !== null && end !== null && answerValue > start && answerValue < end && config.a11y?.enabled) {
                const answerPercentage = (answerValue - start) / (end - start);
                const answerX = leftX + (rightX - leftX) * answerPercentage;
                const answerMarker = this.createInvisibleAnswerOverlay(scene, answerX, centerY, config.lineHeight, config.a11y, config.answer!.toString(), markersList, config.parentContainer);
                markers.push(answerMarker);
            }
        }
        // If there are no interior markers at all, still insert answer overlay between left and right if valid
        if ((!markersList || markersList.length === 0) && config.a11y?.enabled && answerValue !== null && start !== null && end !== null && answerValue > start && answerValue < end) {
            const answerPercentage = (answerValue - start) / (end - start);
            const answerX = leftX + (rightX - leftX) * answerPercentage;
            const answerMarker = this.createInvisibleAnswerOverlay(scene, answerX, centerY, config.lineHeight, config.a11y, config.answer!.toString(), markersList, config.parentContainer);
            markers.push(answerMarker);
        }

        // Create right marker
        let rightMarker: Marker | null = null;
        if (config.endPoint !== undefined) {
            let showNumber = true;
            let label = config.endPoint;
            if (config.visibleMarkers && config.visibleMarkers.length > 0) {
                showNumber = config.visibleMarkers.some(marker => {
                    const parsedLabel = parseFractionString(marker);
                    const parsedValue = parseFractionString(config.endPoint.toString());
                    const doesMatch = parsedLabel === parsedValue;
                    if (doesMatch) label = marker;
                    return doesMatch;
                });
                // TODO: remove this later
                showNumber = true;
            }
            rightMarker = this.createVerticalLineWithNumber(scene, rightX, {
                lineHeight: Math.round(config.lineHeight * 1.5),
                lineColor: config.color,
                showNumber,
                number: label,
                fontSize: config.fontSize,
                fontColor: config.fontColor,
                fontFamily: config.fontFamily,
                yOffset: yOffset,
                animate: animate,
                suffix: config.suffix,
                parentContainer: config.parentContainer,
                a11y: config.a11y,
            });
        }
        
        return {
            leftMarker,
            rightMarker,
            markers,
        };
    }

    private static setMarkerFocus(marker: Marker, focused: boolean) {
        const colorInt = focused ? 0xFFF600 : 0xffffff;
        const colorHex = focused ? '#FFF600' : '#ffffff';
    
        // Update main line if exists
        if (marker.line) {
            marker.line.setFillStyle(colorInt);
        }
    
        // Update text or fraction content
        if (marker.text) {
            const container = marker.text.getContainer();
            // Iterate through main container
            container.getAll().forEach(child => {
                // Simple text
                if (child instanceof Phaser.GameObjects.Text) {
                    child.setColor(colorHex);
                }
    
                // Fraction container
                if (child instanceof Phaser.GameObjects.Container) {
                    child.getAll().forEach(sub => {
                        if (sub instanceof Phaser.GameObjects.Text) {
                            sub.setColor(colorHex);
                        }
                        if (sub instanceof Phaser.GameObjects.Rectangle) {
                            sub.setFillStyle(colorInt);
                        }
                    });
                }
            });
        }
    }
    

    private static createInvisibleAnswerOverlay(
        scene: BaseScene,
        x: number,
        centerY: number,
        lineHeight: number,
        a11y: { enabled?: boolean; onActivate?: (x: number) => void } | undefined,
        answerText: string,
        markersList?: QuestionData['markersList'],
        parentContainer?: HTMLElement,
    ): { line: Phaser.GameObjects.Rectangle; text: ExpressionUtils | null } {
        // Check if markers list contains fractions
        let hasFractions = markersList?.some(marker => typeof marker === 'string' && marker.includes('/')) ?? false;

        const gameConfigManager = GameConfigManager.getInstance();
        const topic = gameConfigManager.get('topic');
        if (topic === 'fractions_as_numbers' || topic === 'addition_and_subtraction_of_fractions_mixed_numbers') {
            hasFractions = true;
        }

        // If markers contain fractions, convert answer to fraction format
        let formattedAnswerText = answerText;
        if (hasFractions && !answerText.includes('/')) {
            // Only convert if answer is not already a fraction
            const answerValue = parseFractionString(answerText);
            if (answerValue !== null) {
                // Extract denominators from markers list
                const denominators = new Set<number>();
                if (markersList) {
                    for (const marker of markersList) {
                        if (typeof marker === 'string' && marker.includes('/')) {
                            const parts = marker.split('/');
                            if (parts.length === 2) {
                                const denominator = Number(parts[1]);
                                if (!isNaN(denominator) && denominator > 0) {
                                    denominators.add(denominator);
                                }
                            }
                        }
                    }
                }
                
                // Try to use a denominator from markers list if numerator would be an integer
                let fraction: { numerator: number; denominator: number } | null = null;
                for (const denominator of denominators) {
                    const numerator = answerValue * denominator;
                    // Check if numerator is an integer (within floating point precision)
                    if (Math.abs(numerator - Math.round(numerator)) < 0.0001) {
                        fraction = { numerator: Math.round(numerator), denominator };
                        break;
                    }
                }
                
                // If no matching denominator found, use default conversion
                if (!fraction) {
                    fraction = decimalToFraction(answerValue, 100);
                }
                
                // Use fraction format (even for whole numbers, use n/1 if needed, but typically just n)
                if (fraction.denominator === 1) {
                    formattedAnswerText = fraction.numerator.toString();
                } else {
                    formattedAnswerText = `${fraction.numerator}/${fraction.denominator}`;
                }
            }
        }
        
        const invisibleLine = scene.addRectangle(x, centerY, 4, lineHeight, 0x000000).setOrigin(0.5).setAlpha(0);
        const a11yLabel = i18n.t('common.marker', { number: formatMathExpression(formattedAnswerText) });
        const container = scene.add.container(
            scene.getScaledValue(x),
            scene.getScaledValue(centerY)
        );
        const sizeRect = scene.addRectangle(0, 0, 4, lineHeight, 0x000000).setAlpha(0).setOrigin(0.5);
        container.add(sizeRect);
        container.setSize(scene.getScaledValue(4), scene.getScaledValue(lineHeight));
        const overlay = new ButtonOverlay(scene, container, {
            label: a11yLabel,
            cursor: `url(${GameScreenConfig.ASSETS.PATHS.CURSOR}) ${GameScreenConfig.CURSOR.OFFSET.X} ${GameScreenConfig.CURSOR.OFFSET.Y}, pointer`,
            onKeyDown: () => a11y?.onActivate && a11y.onActivate(invisibleLine.x),
            onFocus: () => {
                if (overlay && overlay.element) {
                    overlay.element.style.outline = '2px solid #FFF600';
                }
            },
            onBlur: () => {
                if (overlay && overlay.element) {
                    overlay.element.style.outline = 'none';
                }
            }
        });
        // Move overlay to parent container if provided
        if (parentContainer && overlay.element) {
            parentContainer.appendChild(overlay.element);
        }
        (container as any).buttonOverlay = overlay;
        (invisibleLine as any).a11yContainer = container;
        (invisibleLine as any).a11yOverlay = overlay;
        invisibleLine.once('destroy', () => {
            overlay.cleanup();
            container.destroy();
        });
        return { line: invisibleLine, text: null };
    }
}
