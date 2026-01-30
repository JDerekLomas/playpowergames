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

export interface EquivalentFractionData {
    scene: BaseScene;
    question: QuestionData;
    gameplayManager: GameplayManager;
    onComplete: () => void;
    level?: number;
    topic?: string;
    createSkipButton?: () => Phaser.GameObjects.Container;
}

export class EquivalentFraction {
    private scene: BaseScene;
    private question: QuestionData;
    private gameplayManager: GameplayManager;
    private onComplete: () => void;
    private level?: number;
    private topic?: string;
    private createSkipButton?: () => Phaser.GameObjects.Container;
    
    private numberline: { leftMarker: Marker | null; rightMarker: Marker | null; markers: Marker[] };
    private tutorialRects: Phaser.GameObjects.Rectangle[] = [];
    private guideLine: Phaser.GameObjects.Graphics;
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
    private leftMarker!: Marker | null;
    private rightMarker!: Marker | null;
    private markers!: Marker[];

    private instructionDiv?: HTMLElement;
    private numberLineContainer?: HTMLElement;

    constructor(data: EquivalentFractionData) {
        this.scene = data.scene;
        this.question = data.question;
        this.gameplayManager = data.gameplayManager;
        this.onComplete = data.onComplete;
        this.createSkipButton = data.createSkipButton;
        this.topic = data.topic;
        this.level = data.level;
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

        // Create a container div for number line overlays
        this.numberLineContainer = document.createElement('div');
        this.numberLineContainer.style.position = 'absolute';
        this.numberLineContainer.style.pointerEvents = 'none';
        
        const numberLineDomElement = this.scene.add.dom(0, 0, this.numberLineContainer);
        numberLineDomElement.setOrigin(0.5);

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
        
        // Initialize marker properties
        this.leftMarker = this.numberline.leftMarker;
        this.rightMarker = this.numberline.rightMarker;
        this.markers = this.numberline.markers;

        // Add screen clicking image
        const screenClickingContainer = this.scene.add.container(
            this.scene.getScaledValue(this.scene.display.width / 2),
            this.scene.getScaledValue(this.scene.display.height)
        ).setDepth(10);

        const screenClicking = this.scene.addImage(
            0,
            0,
            GameConfig.ASSETS.KEYS.IMAGE.CLICK_MECHANICS.SCREEN_CLICKING,
        ).setOrigin(GameConfig.UI.SCREEN_CLICKING.ORIGIN.X, GameConfig.UI.SCREEN_CLICKING.ORIGIN.Y);

        const centerY = 80;

        this.targetText = new ExpressionUtils(this.scene, 0, -centerY, formatMathExpression(this.question.questionPrompt), {
            fontSize: GameConfig.UI.TARGET_TEXT.FONT_SIZE,
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
            this.playEquivalentFractionStep1();
        });
        this.delayedCalls.push(timer);
    }

    private createUpperContainer(): void {
        this.upperContainer = this.scene.add.container(
            this.scene.getScaledValue(this.scene.display.width / 2),
            this.scene.getScaledValue(200)
        );

        const upperRect = this.scene.addRectangle(
            0,
            0,
            Config.UPPER_CONTAINER.RECTANGLE.WIDTH + 100,
            Config.UPPER_CONTAINER.RECTANGLE.HEIGHT,
            Config.UPPER_CONTAINER.RECTANGLE.COLOR,
            Config.UPPER_CONTAINER.RECTANGLE.ALPHA,
        );

        // Add the upper text
        const upperText = this.scene.addText(0, -40, i18n.t('howToPlay.equivalentFractionsStep1'), {
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
            const extraSpacing = 15;
            textElement.setX(bounds.right + this.scene.getScaledValue(extraSpacing));
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
            expressionContainer.setX(bounds.right + expContainerWidth / 2 + this.scene.getScaledValue(15));
        }
        tutorialElements.push(expressionContainer);

        return expressionContainer;
    }

    private createEquivalentFractionStep({
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
            this.playEquivalentFractionStep(this.currentStep);
        });
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

        return "";
    }

    private playEquivalentFractionStep1() {
        if (this.currentStep !== 1) return;

        const step1 = this.scene.audioManager.playSoundEffect(this.getAudioKey('step_1'));

        const solveText = this.upperContainer.getByName('upperText') as Phaser.GameObjects.Text;
        const solveTextOverlay = new TextOverlay(this.scene, solveText, { label: `${solveText.text.replace('.', ': ')} ${this.question.questionPrompt}`, announce: true });
        if (this.instructionDiv) {
            this.instructionDiv.appendChild(solveTextOverlay.element);
        }

        this.pointingHand = this.createPointingHandAnimation(
            this.targetText.getContainer().getBounds().right / this.scene.display.scale + 55,
            this.targetText.getContainer().getBounds().centerY / this.scene.display.scale + 25
        );
        TweenAnimations.pulse(this.scene, this.targetText.getContainer(), 1.1, 1000, 3);

        step1?.on('complete', () => {
            const timer = this.scene.time.delayedCall(1500, () => {
                this.currentStep = 2; // Go to step 2 (was step 4)
                this.pointingHand?.destroy();
                this.upperContainer.destroy();
                this.playEquivalentFractionStep2();
            });

            this.delayedCalls.push(timer);
        });
    }

    private playEquivalentFractionStep2() {
        this.pointingHand?.destroy();
        this.upperContainer?.destroy();
        this.tutorialContainer.setVisible(true);

        // Remove old gray rectangles and guideline
        if (this.guideLine) this.guideLine.destroy();
        if (this.tutorialRects.length > 0) {
            this.tutorialRects.forEach((rect) => {
                rect.destroy();
            });
            this.tutorialRects = [];
        }

        const leftMarker = this.numberline?.leftMarker;
        const rightMarker = this.numberline?.rightMarker;
        const startX = (leftMarker?.line.x ?? 0) / this.scene.display.scale;
        const endX = (rightMarker?.line.x ?? 0) / this.scene.display.scale;
        
        // Get the question fraction to determine the new number of parts
        const questionFraction = this.question.questionPrompt;
        
        // Parse the question fraction to get the denominator
        let questionParts = 2; // Default fallback
        if (questionFraction.includes('/')) {
            const parts = questionFraction.split('/');
            if (parts.length === 2) {
                questionParts = parseInt(parts[1]) || 2;
            }
        }
        
        // Update the number line markers
        this.updateMarkers(
            this.question.startPoint,
            this.question.endPoint,
            this.question.markersList,
            false,
        );
        
        const width = (endX - startX) / questionParts;
        const height = 15;

        for (let i = 0; i < questionParts; i++) {
            const rect = this.scene.addRectangle(
                startX + width * i + width / 2,
                (this.leftMarker?.line.y ?? 0) / this.scene.display.scale,
                width - 2 * 10,
                height,
                0x303742, // Yellow color for question parts
            )
            .setStrokeStyle(this.scene.getScaledValue(1), 0xffffff)
            .setOrigin(0.5);
            this.tutorialRects.push(rect);
        }

        // Gray rectangles removed - will be added in step 4

        this.createEquivalentFractionStep({
            audioKey: this.getAudioKey('step_2'),
            elements: [
                { type: 'text', value: i18n.t('tutorial.equivalent.step4.1', { denominator: questionParts }) },
            ],
        });
    }

    private playEquivalentFractionStep3() {
        // Get the question fraction numerator
        const questionFraction = this.question.questionPrompt;
        const questionValue = parseFractionString(questionFraction) ?? 0.5;
        let questionParts = 2;
        if (questionFraction.includes('/')) {
            const parts = questionFraction.split('/');
            if (parts.length === 2) {
                questionParts = parseInt(parts[0]) || 2;
            }
        }

        // Change colors one after another with gap
        let currentIndex = 0;
        const colorInterval = setInterval(() => {
            if (currentIndex < questionParts) {
                this.tutorialRects[currentIndex].setFillStyle(0xFFF600);
                currentIndex++;
            } else {
                clearInterval(colorInterval);
                
                // Show guideline after all colors are changed
                const leftMarker = this.numberline?.leftMarker;
                const rightMarker = this.numberline?.rightMarker;
                const startX = leftMarker?.line.x ?? 0;
                const endX = rightMarker?.line.x ?? 0;
                const start = parseFractionString(this.question.startPoint) ?? 0;
                const end = parseFractionString(this.question.endPoint) ?? 1;
                const targetX = startX + ((endX - startX) * (questionValue - start)) / (end - start);
                const startY = (leftMarker?.line.y ?? 0) - this.scene.getScaledValue(263);

                this.guideLine = (this.scene as any).createMaskedGuideline(targetX, startY, this.scene.getScaledValue(420), this.markers);
            }
        }, 500);

        this.createEquivalentFractionStep({
            audioKey: this.getAudioKey('step_3'),
            elements: [
                { type: 'text', value: i18n.t('tutorial.equivalent.step3', { numerator: questionParts }) },
            ],
        });
    }

    private playEquivalentFractionStep5() {
        // Clean up existing rectangles
        if (this.guideLine) this.guideLine.destroy();
        if (this.tutorialRects.length > 0) {
            this.tutorialRects.forEach((rect) => {
                rect.destroy();
            });
            this.tutorialRects = [];
        }

        // Update markers to use the same ones from step 2 (question denominator)
        const questionFraction = this.question.questionPrompt;
        let questionParts = 2; // Default fallback
        if (questionFraction.includes('/')) {
            const parts = questionFraction.split('/');
            if (parts.length === 2) {
                questionParts = parseInt(parts[1]) || 2;
            }
        }

        this.updateMarkers(
            this.question.startPoint,
            this.question.endPoint,
            this.question.markersList,
            this.gameplayManager.getShowIntermediateNumbers()
        );

        // Show both yellow and gray rectangles
        const leftMarker = this.numberline?.leftMarker;
        const rightMarker = this.numberline?.rightMarker;

        // Create guideline to show the equivalent position
        const startXScaled = leftMarker?.line.x ?? 0;
        const endXScaled = rightMarker?.line.x ?? 0;
        const answerValue = parseFractionString(this.question.shipLocation) ?? 0.5;
        const start = parseFractionString(this.question.startPoint) ?? 0;
        const end = parseFractionString(this.question.endPoint) ?? 1;
        const targetX = startXScaled + ((endXScaled - startXScaled) * (answerValue - start)) / (end - start);
        const startY = (leftMarker?.line.y ?? 0) - this.scene.getScaledValue(263);

        this.guideLine = (this.scene as any).createMaskedGuideline(targetX, startY, this.scene.getScaledValue(420), this.markers);

        this.createEquivalentFractionStep({
            audioKey: this.getAudioKey('step_5'),
            elements: [
                { type: 'text', value: i18n.t('tutorial.equivalent.step5.1') },
                { type: 'expression', value: this.question.csvQuestion?.operand1 ?? '' },
                { type: 'text', value: i18n.t('tutorial.equivalent.step5.2') },
                { type: 'expression', value: this.question.csvQuestion?.answer + '.' },
            ],
        });
    }

    private async playEquivalentFractionStep6() {
        // Clean up existing elements
        if (this.guideLine) this.guideLine.destroy();
        this.tutorialContainer.destroy();
        if (this.tutorialRects.length > 0) {
            this.tutorialRects.forEach((rect) => {
                rect.destroy();
            });
            this.tutorialRects = [];
        }

        const answer = this.question.shipLocation;
        const numberlineWidth = this.scene.display.width - GameConfig.MARKER_LINES.horizontalMargin * 2;
        const start = parseFractionString(this.question.startPoint) ?? 0;
        const end = parseFractionString(this.question.endPoint) ?? 1;
        const widthRatio = (answer - start) / (end - start);
        const targetPointX = GameConfig.MARKER_LINES.horizontalMargin + widthRatio * numberlineWidth;

        // Create clickable zone
        this.clickableZone = this.scene.add.zone(this.scene.getScaledValue(targetPointX), this.scene.getScaledValue(this.scene.display.height / 2), this.scene.getScaledValue(30), this.scene.getScaledValue(30))
            .setInteractive()
            .setOrigin(0.5);

        // Add text above the click zone
        const tapText = this.scene.addText(targetPointX, this.scene.display.height / 2 - 200, i18n.t('howToPlay.tapHere'), {
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

        this.pointingHand = this.scene.addImage(targetPointX - 3, this.scene.display.height / 2 - 130, 'pointing_hand').setRotation(Math.PI);
        this.scene.tweens.add({
            targets: this.pointingHand,
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
            this.pointingHand?.destroy();
            tapText.destroy();
            document.body.style.cursor = 'default';
            await this.animationPlayer?.playResultAnimations('hit', targetPointX * this.scene.display.scale, targetPointX * this.scene.display.scale);
            this.scene.time.delayedCall(1000, () => {
                this.startGameScreen();
            });
        });

        // Add accessibility overlay for clickable zone
        const a11yContainer = this.scene.add.container(
            this.scene.getScaledValue(targetPointX),
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
                this.pointingHand?.destroy();
                tapText.destroy();
                document.body.style.cursor = 'default';
                await this.animationPlayer?.playResultAnimations('hit', targetPointX * this.scene.display.scale, targetPointX * this.scene.display.scale);
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

    private playEquivalentFractionStep(step: number) {
        this.tutorialContainer.getByName('stepContainer')?.destroy();
        this.scene.audioManager.stopAllSoundEffects();

        // Clean up clickable zone if it exists (when skipping steps)
        if (this.clickableZone) {
            this.clickableZone.destroy();
            this.clickableZone = undefined;
        }

        switch (step) {
            case 1:
                this.playEquivalentFractionStep1();
                break;
            case 2:
                this.playEquivalentFractionStep2();
                break;
            case 3:
                this.playEquivalentFractionStep3();
                break;
            case 4:
                this.playEquivalentFractionStep5();
                break;
            case 5:
                this.playEquivalentFractionStep6();
                break;
        }
    }

    private generateFractionMarkers(denominator: number): string[] {
        const markers: string[] = [];
        for (let i = 0; i <= denominator; i++) {
            if (i === 0) {
                markers.push('0');
            } else if (i === denominator) {
                markers.push('1');
            } else {
                markers.push(`${i}/${denominator}`);
            }
        }
        return markers;
    }

    private updateMarkers(startPoint: number | string, endPoint: number | string, markersList: number[] | string[], showIntermediateNumbers: boolean) {
        const destroyMarker = (marker: Marker) => {
            if (marker.text) {
                marker.text.destroy();
            }
            if (marker.line) {
                marker.line.destroy();
            }
        }
        if (this.leftMarker) {
            destroyMarker(this.leftMarker);
            this.leftMarker = null;
        }
        if (this.rightMarker) {
            destroyMarker(this.rightMarker);
            this.rightMarker = null;
        }

        if (this.markers) {
            this.markers.forEach((marker) => {
                destroyMarker(marker);
            });
            this.markers = [];
        }

        const { markers, leftMarker, rightMarker } = UIUtils.createVerticalLinesWithNumbers(this.scene, {
            ...GameConfig.MARKER_LINES,
            fontFamily: fontKeys.EUROSTILE,
            markersList,
            visibleMarkers: this.question.visibleMarkers ?? [],
            startPoint: startPoint,
            endPoint: endPoint,
            showIntermediateNumbers,
            animate: false,
            parentContainer: this.numberLineContainer,
        });
        this.markers = markers;
        this.leftMarker = leftMarker;
        this.rightMarker = rightMarker;
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
        pointingHand.setFlipY(true);

        this.scene.tweens.add({
            targets: pointingHand,
            x: "+=" + this.scene.getScaledValue(10),
            duration: 500,
            yoyo: true,
            repeat: 3,
            ease: 'Sine.easeInOut',
        });

        return pointingHand;
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
