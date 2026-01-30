import { BaseScene } from '../scenes/BaseScene';
import { Marker, UIUtils } from '../utils/UIUtils';
import { GameScreenConfig as GameConfig } from '../config/GameScreenConfig';
import { CommonConfig } from '../config/CommonConfig';
import { HowToPlaySceneConfig as Config } from '../config/HowToPlaySceneConfig';
import { ButtonOverlay, ExpressionUtils, i18n, TextOverlay, TweenAnimations } from '@k8-games/sdk';
import { QuestionData } from '../interfaces/gameplay';
import { GameplayManager } from '../managers/GameplayManager';
import { AnimationPlayer } from '../managers/AnimationPlayer';
import { AnimationManager } from '../managers/AnimationManager';
import { parseFractionString } from '../utils/parseFractionString';
import { formatMathExpression } from '../utils/parseExpression';

const {
    ASSETS: {
        KEYS: { FONT: fontKeys },
    },
} = CommonConfig;

export interface PlacingNumberData {
    scene: BaseScene;
    question: QuestionData;
    isFractions?: boolean;
    isDecimal?: boolean;
    topic?: string;
    level?: number;
    gameplayManager: GameplayManager;
    onComplete: () => void;
    createSkipButton?: () => Phaser.GameObjects.Container;
}

export class PlacingNumber {
    private scene: BaseScene;
    private question: QuestionData;
    private gameplayManager: GameplayManager;
    private onComplete: () => void;
    // private isDecimal: boolean;
    private topic?: string;
    private level?: number;
    private createSkipButton?: () => Phaser.GameObjects.Container;

    private numberline: { leftMarker: Marker | null; rightMarker: Marker | null; markers: Marker[] };
    private tutorialRects: Phaser.GameObjects.Rectangle[] = [];
    private guideLine?: Phaser.GameObjects.Graphics;
    private currentStep: number = 1;
    private delayedCalls: Phaser.Time.TimerEvent[] = [];
    private tutorialContainer!: Phaser.GameObjects.Container;
    private upperContainer!: Phaser.GameObjects.Container;
    private targetText!: ExpressionUtils;
    private topWoodImage!: Phaser.GameObjects.Image;
    private animationPlayer?: AnimationPlayer;
    private animationManager?: AnimationManager;
    private clickableZone?: Phaser.GameObjects.Zone;
    private pointingHand?: Phaser.GameObjects.Image;
    private nearestMarker: Marker | null = null;
    private targetNumber: number = 0;

    private instructionDiv?: HTMLElement;

    constructor(data: PlacingNumberData) {
        this.scene = data.scene;
        this.question = data.question;
        this.gameplayManager = data.gameplayManager;
        this.onComplete = data.onComplete;
        // this.isDecimal = data.isDecimal ?? false;
        this.topic = data.topic;
        this.level = data.level;
        this.createSkipButton = data.createSkipButton;
        
        // Use shipLocation as the target number
        this.targetNumber = this.question.shipLocation;
    }

    private findNearestMarker(): Marker | null {
        const markersList = this.question.visibleMarkers ?? [];
        const shipLocation = this.question.shipLocation;
        
        if (markersList.length === 0) return null;

        // Find the nearest number in markersList to shipLocation
        let nearestValue = markersList[0];
        let minDistance = Math.abs((parseFractionString(nearestValue) ?? 0) - shipLocation);

        for (const value of markersList) {
            const distance = Math.abs((parseFractionString(value) ?? 0) - shipLocation);  
            if (distance < minDistance) {
                minDistance = distance;
                nearestValue = value;
            }
        }

        // Find the corresponding marker object
        const allMarkers = [this.numberline.leftMarker, ...this.numberline.markers, this.numberline.rightMarker].filter(Boolean) as Marker[];
        return allMarkers.find(marker => marker.text?.getContainer().getData('expression') === nearestValue.toString()) ?? null;
    }

    private calculateTargetPosition(): number {
        const leftMarker = this.numberline.leftMarker;
        const rightMarker = this.numberline.rightMarker;
        
        if (!leftMarker || !rightMarker) return 0;

        const startX = leftMarker.line.x;
        const endX = rightMarker.line.x;
        const startValue = Number(this.question.startPoint);
        const endValue = Number(this.question.endPoint);

        // Calculate position based on target number's position between start and end values
        const ratio = (this.targetNumber - startValue) / (endValue - startValue);
        return startX + (endX - startX) * ratio;
    }

    create(): void {
        this.animationManager = new AnimationManager(this.scene);
        this.animationManager.createAnimations();

        const { CLICK_MECHANICS: clickMechanicsKeys } = GameConfig.ASSETS.KEYS.IMAGE;
        const isMapUI = this.level && this.level > 0;

        const bgTexture = this.gameplayManager.getBgTexture();
        const bg = UIUtils.createCoverBackground(this.scene, bgTexture, true, false).setOrigin(GameConfig.UI.BACKGROUND.ORIGIN);
        if (isMapUI) {
            bg.setScale(1).setOrigin(0.5);
            bg.y += this.scene.getScaledValue(22);
        }

        this.topWoodImage = this.scene.addImage(this.scene.display.width / 2, 0, clickMechanicsKeys.TOP_WOOD)
            .setOrigin(GameConfig.UI.WOOD.ORIGIN.TOP.X, GameConfig.UI.WOOD.ORIGIN.TOP.Y)
            .setScale(GameConfig.UI.WOOD.SCALE);

        if (isMapUI) this.topWoodImage.setScale(1);

        this.animationPlayer = new AnimationPlayer(this.scene, this.topWoodImage);

        // Add title
        const titleText = this.scene.addText(this.scene.display.width / 2, Config.TITLE.POSITION.Y, i18n.t('howToPlay.title'), {
            font: Config.TITLE.FONT,
        }).setOrigin(0.5);

        new TextOverlay(this.scene, titleText, { label: i18n.t('howToPlay.title'), tag: 'h1', role: 'heading' });

        // Create skip button from main scene
        this.createSkipButton?.();

        this.instructionDiv = document.createElement('div');
        this.instructionDiv.style.position = 'absolute';
        this.instructionDiv.style.pointerEvents = 'none';
        const instructionDomElement = this.scene.add.dom(0, 0, this.instructionDiv);
        instructionDomElement.setOrigin(0.5);

        // Create number line with appropriate margins
        this.numberline = UIUtils.createVerticalLinesWithNumbers(this.scene, {
            ...GameConfig.MARKER_LINES,
            fontFamily: fontKeys.EUROSTILE,
            startPoint: this.question.startPoint,
            endPoint: this.question.endPoint,
            markersList: this.question.markersList,
            visibleMarkers: this.question.visibleMarkers,
            showIntermediateNumbers: this.gameplayManager.getShowIntermediateNumbers(),
            animate: false,
        });

        // Find nearest marker
        this.nearestMarker = this.findNearestMarker();
        console.log('nearestMarker', this.nearestMarker);

        // Add screen clicking image
        const screenClickingContainer = this.scene.add.container(
            this.scene.getScaledValue(this.scene.display.width / 2),
            this.scene.getScaledValue(this.scene.display.height)
        );

        const screenClicking = this.scene.addImage(
            0,
            0,
            GameConfig.ASSETS.KEYS.IMAGE.CLICK_MECHANICS.SCREEN_CLICKING,
        ).setOrigin(GameConfig.UI.SCREEN_CLICKING.ORIGIN.X, GameConfig.UI.SCREEN_CLICKING.ORIGIN.Y);

        const centerY = 80;
        let fontSize = GameConfig.UI.TARGET_TEXT.FONT_SIZE;
        if (this.topic === 'add_and_subtract_decimals' && this.level === 1) {
            fontSize = '30px';
        } else if (this.topic === 'percents' && this.level === 5 && i18n.getLanguage() === 'es') {
            fontSize = '35px';
        } else if (this.topic === 'percents' && this.level === 4 && i18n.getLanguage() === 'es') {
            fontSize = '40px';
        }

        this.targetText = new ExpressionUtils(this.scene, 0, -centerY, formatMathExpression(this.question.questionPrompt), {
            fontSize,
            fontFamily: fontKeys.EUROSTILE,
            fontColor: GameConfig.UI.TARGET_TEXT.COLOR,
            lineHeight: GameConfig.UI.TARGET_TEXT.LINE_HEIGHT,
            spacing: GameConfig.UI.TARGET_TEXT.SPACING,
        });

        screenClickingContainer.add([screenClicking, this.targetText.getContainer()]);

        new TextOverlay(this.scene, this.targetText.getContainer().getAt(0) as Phaser.GameObjects.Text, { label: i18n.t('common.targetText', { number: this.question.questionPrompt }) });

        this.createUpperContainer();
        this.createTutorialContainer();

        const timer = this.scene.time.delayedCall(1000, () => {
            this.playStep1();
        });
        this.delayedCalls.push(timer);
    }

    private getAudioKey(stepNumber: string): string {
        // Check if we have topic-specific audio keys
        if (this.topic && this.level) {
            const topicLevelKey = `${stepNumber}_${this.topic}_level_${this.level}`;
            // Check if this audio key exists in the scene's cache
            if (this.scene.cache.audio.exists(topicLevelKey)) {
                return topicLevelKey;
            }
        }
        
        // Fallback to the original logic
        const baseKey = `${stepNumber}_place_numbers`;
        // if (this.isDecimal) {
        //     return baseKey.replace('numbers', 'decimals');
        // }
        return baseKey;
    }

    private createUpperContainer(): void {
        this.upperContainer = this.scene.add.container(
            this.scene.getScaledValue(this.scene.display.width / 2),
            this.scene.getScaledValue(200)
        );

        const upperRect = this.scene.addRectangle(
            0,
            0,
            Config.UPPER_CONTAINER.RECTANGLE.WIDTH,
            Config.UPPER_CONTAINER.RECTANGLE.HEIGHT,
            Config.UPPER_CONTAINER.RECTANGLE.COLOR,
            Config.UPPER_CONTAINER.RECTANGLE.ALPHA,
        );

        // Add the upper text
        const upperText = this.scene.addText(0, -40, i18n.t('howToPlay.placeNumberStep1'), {
            fontSize: Config.UPPER_CONTAINER.TEXT.INSTRUCTION.FONT_SIZE,
            fontFamily: fontKeys.EUROSTILE,
            color: Config.UPPER_CONTAINER.TEXT.INSTRUCTION.COLOR,
            align: 'center',
        }).setOrigin(0.5).setName('upperText');

        const mathText = new ExpressionUtils(
            this.scene,
            0,
            20,
            this.question.questionPrompt,
            {
                fontSize: Config.UPPER_CONTAINER.TEXT.ANSWER.FONT_SIZE,
                fontFamily: fontKeys.EUROSTILE,
                fontColor: Config.UPPER_CONTAINER.TEXT.ANSWER.COLOR,
                spacing: Config.UPPER_CONTAINER.TEXT.SPACING,
                fractionLinePadding: Config.UPPER_CONTAINER.TEXT.FRACTION_LINE_PADDING,
            },
        ).setVisible(true);

        this.upperContainer.add([upperRect, upperText, mathText.getContainer()]);

        // update the size of upperRect based on the width of upperText and mathText
        const width = this.upperContainer.getBounds().width + this.scene.getScaledValue(40);
        upperRect.setSize(width, upperRect.height);

        TweenAnimations.fadeIn(this.scene, this.upperContainer, 500);
    }

    private createTutorialContainer(): void {
        this.tutorialContainer = this.scene.add.container(
            this.scene.getScaledValue(this.scene.display.width / 2),
            this.scene.getScaledValue(210)
        );

        const backgroundRect = this.scene.addRectangle(0, 0, this.scene.display.width + 2, 100, 0x000000, 0.7)
            .setStrokeStyle(this.scene.getScaledValue(1), 0xffffff)
            .setOrigin(0.5);

        this.tutorialContainer.add([backgroundRect]).setDepth(2).setVisible(false);
    }

    private playStep1() {
        if (this.currentStep !== 1) return;

        const step1 = this.scene.audioManager.playSoundEffect('placing_step_1');

        const solveText = this.upperContainer.getByName('upperText') as Phaser.GameObjects.Text;
        const solveTextOverlay = new TextOverlay(this.scene, solveText, { label: `${solveText.text.replace('.', ': ')} ${this.question.questionPrompt}`, announce: true });
        if (this.instructionDiv) {
            this.instructionDiv.appendChild(solveTextOverlay.element);
        }

        this.pointingHand = this.createPointingHandAnimation(
            this.targetText.getContainer().getBounds().left / this.scene.display.scale - 20,
            this.targetText.getContainer().getBounds().centerY / this.scene.display.scale
        );
        TweenAnimations.pulse(this.scene, this.targetText.getContainer(), 1.1, 1000, 3);

        step1?.on('complete', () => {
            const timer = this.scene.time.delayedCall(1500, () => {
                this.currentStep++;
                this.pointingHand?.destroy();
                this.upperContainer.destroy();
                this.playPlacingStep2();
            });

            this.delayedCalls.push(timer);
        });
    }

    private playPlacingStep2() {
        this.pointingHand?.destroy();
        this.upperContainer?.destroy();
        this.tutorialContainer.setVisible(true);

        // Highlight the nearest marker with pulse animation
        if (this.nearestMarker) {
            TweenAnimations.pulse(this.scene, this.nearestMarker.line, 1.2, 1000, 3);
            if (this.nearestMarker.text !== null) {
                TweenAnimations.pulse(this.scene, this.nearestMarker.text.getContainer(), 1.2, 1000, 3);
            }
        }

        // Show gray rectangles between markers from start to nearest marker
        if (this.nearestMarker) {
            const allMarkers = [this.numberline.leftMarker, ...this.numberline.markers, this.numberline.rightMarker].filter(Boolean) as Marker[];
            const height = 15;
            
            // Find the index of the nearest marker
            const nearestMarkerIndex = allMarkers.findIndex(marker => marker === this.nearestMarker);
            
            if (nearestMarkerIndex > 0) {
                // Loop through markers from start to nearest marker (excluding the nearest marker itself)
                for (let i = 0; i < nearestMarkerIndex; i++) {
                    const currentMarker = allMarkers[i];
                    const nextMarker = allMarkers[i + 1];
                    
                    if (currentMarker && nextMarker) {
                        const currentX = currentMarker.line.x;
                        const nextX = nextMarker.line.x;
                        
                        // Create gray rectangle between current and next marker
                        const grayRect = this.scene.addRectangle(
                            ((currentX + nextX) / 2) / this.scene.display.scale,
                            currentMarker.line.y / this.scene.display.scale,
                            (Math.abs(nextX - currentX) / this.scene.display.scale) - 20,
                            height,
                            0x808080, // Gray color
                        )
                            .setStrokeStyle(this.scene.getScaledValue(1), 0xffffff)
                            .setOrigin(0.5);
                        
                        this.tutorialRects.push(grayRect);
                    }
                }
            }
        }

        this.createPlacingStep({
            audioKey: this.getAudioKey('step_2'),
            elements: [
                { type: 'text', value: i18n.t('game.tutorial.findNearest') },
                { type: 'expression', value: (this.question.csvQuestion?.answer ?? '') + '.' },
            ],
        });
    }

    private playPlacingStep3() {
        // Show yellow rectangle from nearest marker to target
        if (this.nearestMarker) {
            const targetX = this.calculateTargetPosition();
            const nearestX = this.nearestMarker.line.x;
            const height = 15;
            const width = Math.max(0, Math.abs(targetX - nearestX) / this.scene.display.scale - 20);
            
            // Create yellow rectangle from nearest marker to target
            const yellowRect = this.scene.addRectangle(
                ((nearestX + targetX) / 2) / this.scene.display.scale,
                (this.nearestMarker.line.y / this.scene.display.scale),
                width,
                height,
                0xFFF600, // Yellow color
            )
                .setStrokeStyle(this.scene.getScaledValue(1), 0xffffff)
                .setOrigin(0.5);
            
            this.tutorialRects.push(yellowRect);
        }

        this.createPlacingStep({
            audioKey: 'placing_step_3',
            elements: [
                { type: 'text', value: i18n.t('game.tutorial.countToTarget') },
            ],
        });
    }

    private playPlacingStep4() {
        const targetX = this.calculateTargetPosition();
        const startY = (this.numberline.leftMarker?.line.y ?? 0) - this.scene.getScaledValue(263);

        const markers = [this.numberline.leftMarker, this.numberline.rightMarker, ...this.numberline.markers];
        this.guideLine = (this.scene as any).createMaskedGuideline(targetX, startY, this.scene.getScaledValue(420), markers);

        this.tutorialContainer.setVisible(true);

        let text = i18n.t('game.tutorial.goesHere', { number: this.question.csvQuestion?.operand1 });

        if (this.topic === 'add_and_subtract_decimals' && this.level === 1) {
            text = i18n.t('game.tutorial.roundToNearest', { number: this.question.csvQuestion?.operand1, answer: this.question.csvQuestion?.answer });
        }

        this.createPlacingStep({
            audioKey: this.getAudioKey('step_4'),
            elements: [
                { type: 'text', value: text },
            ],
        });
    }

    private async playPlacingStep5() {
        this.tutorialContainer.destroy();
        this.tutorialRects.forEach((rect) => {
            rect.destroy();
        });
        this.tutorialRects = [];
    
        // Remove the guide line
        if (this.guideLine) {
            this.guideLine.destroy();
            this.guideLine = undefined;
        }

        this.tutorialContainer.destroy();

        const targetX = this.calculateTargetPosition();

        // Create clickable zone at target position
        this.clickableZone = this.scene.add.zone(targetX, this.scene.getScaledValue(this.scene.display.height / 2), this.scene.getScaledValue(30), this.scene.getScaledValue(30))
            .setInteractive()
            .setOrigin(0.5);

        const targetMarker = this.numberline?.markers.find(marker => {
            const expression = marker.text?.getContainer().getData('expression');
            return parseFractionString(expression ?? '') === parseFractionString(this.question.shipLocation);
        });

        let tapTextY = this.scene.display.height / 2 - 120;
        let pointingHandY = this.scene.display.height / 2 - 60;

        if (targetMarker) {
            const textContainer = targetMarker.text?.getContainer();
            pointingHandY = (textContainer?.getBounds().top ?? 0) / this.scene.display.scale - 30;
            tapTextY = pointingHandY - 60;
        }

        // Add text above the click zone
        const tapText = this.scene.addText(targetX / this.scene.display.scale, tapTextY, i18n.t('howToPlay.tapHere'), {
            fontSize: '36px',
            fontFamily: fontKeys.EXO,
            fontStyle: 'bold',
            color: '#FFF600',
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(0.5);

        const tapTextOverlay = new TextOverlay(this.scene, tapText, { label: i18n.t('howToPlay.tapHere') });
        if (this.instructionDiv) {
            this.instructionDiv.appendChild(tapTextOverlay.element);
        }

        const pointingHand = this.scene.addImage((targetX / this.scene.display.scale) - 3, pointingHandY, 'pointing_hand').setRotation(Math.PI);
        this.scene.tweens.add({
            targets: pointingHand,
            y: "-=10",
            duration: 500,
            ease: 'Sine.easeInOut',
            repeat: -1,
            yoyo: true,
        });

        // Set up cursor change when hovering over the zone
        this.clickableZone.on('pointerover', () => {
            document.body.style.cursor = `url(${GameConfig.ASSETS.PATHS.CURSOR}) ${GameConfig.CURSOR.OFFSET.X} ${GameConfig.CURSOR.OFFSET.Y}, pointer`;
        });

        this.clickableZone.on('pointerout', () => {
            document.body.style.cursor = 'default';
        });

        // Handle click
        this.clickableZone.on('pointerdown', async () => {
            if (this.clickableZone) {
                this.clickableZone.removeInteractive();
            }
            pointingHand.destroy();
            tapText.destroy();
            document.body.style.cursor = 'default';
            await this.animationPlayer?.playResultAnimations('hit', targetX, targetX);
            this.scene.time.delayedCall(1000, () => {
                this.startGameScreen();
            });
        });

        // Add accessibility overlay for clickable zone
        const a11yContainer = this.scene.add.container(
            targetX,
            this.scene.getScaledValue(this.scene.display.height / 2)
        );
        const a11yRect = this.scene.addRectangle(0, 0, this.scene.getScaledValue(GameConfig.MARKER_LINES.width), this.scene.getScaledValue(GameConfig.MARKER_LINES.lineHeight), 0x000000).setAlpha(0).setOrigin(0.5);
        a11yContainer.add(a11yRect);
        a11yContainer.setSize(this.scene.getScaledValue(GameConfig.MARKER_LINES.width), this.scene.getScaledValue(GameConfig.MARKER_LINES.lineHeight));
        const a11yButton = new ButtonOverlay(this.scene, a11yContainer, {
            label: i18n.t('howToPlay.tapHere'),
            cursor: `url(${GameConfig.ASSETS.PATHS.CURSOR}) ${GameConfig.CURSOR.OFFSET.X} ${GameConfig.CURSOR.OFFSET.Y}, pointer`,
            onKeyDown: async () => {
                if (!this.clickableZone) return;
                this.clickableZone.removeInteractive();
                pointingHand.destroy();
                tapText.destroy();
                document.body.style.cursor = 'default';
                await this.animationPlayer?.playResultAnimations('hit', targetX, targetX);
                this.scene.time.delayedCall(1000, () => {
                    this.startGameScreen();
                });
            },
        });
        (a11yContainer as any).buttonOverlay = a11yButton;
        const a11yButtonOverlay = (a11yContainer as any).buttonOverlay;
        if (this.instructionDiv && a11yButtonOverlay.element) {
            this.instructionDiv.appendChild(a11yButtonOverlay.element);
        }
        if (a11yButtonOverlay.element) {
            a11yButtonOverlay.element.focus({ preventScroll: true });
        }
        this.clickableZone.once('destroy', () => { a11yButton.cleanup(); a11yContainer.destroy(); });
    }

    private playPlacingStep(step: number) {
        this.tutorialContainer.getByName('stepContainer')?.destroy();
        this.scene.audioManager.stopAllSoundEffects();

        // Clean up clickable zone if it exists (when skipping steps)
        if (this.clickableZone) {
            this.clickableZone.destroy();
            this.clickableZone = undefined;
        }

        switch (step) {
            case 1:
                this.playStep1();
                break;
            case 2:
                this.playPlacingStep2();
                break;
            case 3:
                this.playPlacingStep3();
                break;
            case 4:
                this.playPlacingStep4();
                break;
            case 5:
                this.playPlacingStep5();
                break;
        }
    }

    private createPointingHandAnimation(x: number, y: number): Phaser.GameObjects.Image {
        // Add pointing hand animation
        const pointingHandX = x;
        const pointingHandY = y;
        const pointingHand = this.scene.addImage(
            pointingHandX,
            pointingHandY,
            'pointing_hand'
        ).setOrigin(0.5, 0).setRotation(1.5708).setScale(0.8);

        this.scene.tweens.add({
            targets: pointingHand,
            x: "-=" + this.scene.getScaledValue(10),
            duration: 500,
            yoyo: true,
            repeat: 3,
            ease: 'Sine.easeInOut',
        });

        return pointingHand;
    }

    private createPlacingStep({
        audioKey,
        elements,
    }: {
        audioKey: string;
        elements: ({ type: 'text'; value: string } | { type: 'expression'; value: string })[];
    }) {
        const stepAudio = this.scene.audioManager.playSoundEffect(audioKey);

        const positionedElements: (Phaser.GameObjects.Text | Phaser.GameObjects.Container)[] = [];

        const stepContainer = this.scene.add.container(0, 0).setName('stepContainer');

        elements.forEach((element) => {
            if (element.type === 'text') {
                const text = this.createText(0, 0, element.value, positionedElements);
                stepContainer.add(text);
            } else {
                const expression = this.createExpression(0, 0, element.value, positionedElements);
                stepContainer.add(expression);
            }
        });

        const totalWidth = positionedElements[positionedElements.length - 1].getBounds().right - positionedElements[0].getBounds().left;

        stepContainer.setX(-totalWidth / 2);

        this.tutorialContainer.add([stepContainer]);

        const textVal = elements.map(element => element.value).join(' ');
        const textOverlay = new TextOverlay(this.scene, stepContainer.getAt(0) as Phaser.GameObjects.Text, { label: textVal, announce: true });
        if (this.instructionDiv) {
            this.instructionDiv.appendChild(textOverlay.element);
        }

        stepAudio?.on('complete', () => {
            this.currentStep++;
            this.playPlacingStep(this.currentStep);
        });
    }

    private createText(x: number, y: number, text: string, tutorialElements: (Phaser.GameObjects.Text | Phaser.GameObjects.Container)[]) {
        const textElement = this.scene.addText(x, y, text, {
            fontSize: '32px',
            color: '#ffffff',
            fontFamily: fontKeys.EXO,
        })
            .setOrigin(0, 0.5);

        if (tutorialElements.length > 0) {
            const lastElement = tutorialElements[tutorialElements.length - 1];
            const bounds = lastElement.getBounds();
            textElement.setX(bounds.right + this.scene.getScaledValue(15));
        }
        tutorialElements.push(textElement);

        return textElement;
    }

    private createExpression(x: number, y: number, text: string, tutorialElements: (Phaser.GameObjects.Text | Phaser.GameObjects.Container)[]) {
        const expressionUtils = new ExpressionUtils(this.scene, x, y, text, {
            fontSize: '32px',
            fontFamily: fontKeys.EXO,
            fontColor: 0xffffff,
            spacing: 5,
            fractionLinePadding: 20,
        })

        const expressionContainer = expressionUtils.getContainer();

        if (tutorialElements.length > 0) {
            const lastElement = tutorialElements[tutorialElements.length - 1];
            const bounds = lastElement.getBounds();
            const expContainerWidth = expressionContainer.getBounds().width;
            expressionContainer.setX(bounds.right + this.scene.getScaledValue(15) + expContainerWidth / 2);
        }
        tutorialElements.push(expressionContainer);

        return expressionContainer;
    }

    private startGameScreen() {
        this.scene.audioManager.stopAllSoundEffects();
        this.destroyTimers();
        this.onComplete();
    }

    private destroyTimers() {
        // Destroy all delayed calls
        this.delayedCalls.forEach(timer => {
            if (timer) {
                timer.destroy();
            }
        });
        this.delayedCalls = [];
    }

    destroy(): void {
        this.destroyTimers();
        if (this.guideLine) this.guideLine.destroy();
        if (this.clickableZone) this.clickableZone.destroy();
        this.tutorialRects.forEach((rect) => {
            rect.destroy();
        });
        this.tutorialRects = [];
    }
}
