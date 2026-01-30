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

export interface MultiplyFractionsData {
    scene: BaseScene;
    question: QuestionData;
    gameplayManager: GameplayManager;
    onComplete: () => void;
    level?: number;
    topic?: string;
    createSkipButton?: () => Phaser.GameObjects.Container;
}

export class MultiplyFractions {
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

    private instructionDiv?: HTMLElement;

    constructor(data: MultiplyFractionsData) {
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

        // Create number line with appropriate margins
        this.numberline = UIUtils.createVerticalLinesWithNumbers(this.scene, {
            ...GameConfig.MARKER_LINES,
            fontFamily: fontKeys.EUROSTILE,
            startPoint: this.question.startPoint,
            endPoint: this.question.endPoint,
            markersList: this.question.markersList,
            showIntermediateNumbers: this.gameplayManager.getShowIntermediateNumbers(),
            visibleMarkers: this.question.visibleMarkers,
            animate: false,
        });

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
            this.playStep1();
        });
        this.delayedCalls.push(timer);
    }

    private playFractionStep(step: number) {
        this.tutorialContainer.getByName('stepContainer')?.destroy();
        this.scene.audioManager.stopAllSoundEffects();

        // Clean up rectangles like other modules
        if (this.tutorialRects.length > 0) {
            this.tutorialRects.forEach((rect) => rect.destroy());
            this.tutorialRects = [];
        }

        // Clean up guideline from previous steps
        if (this.guideLine) {
            this.guideLine.destroy();
        }

        if (this.clickableZone) {
            this.clickableZone.destroy();
            this.clickableZone = undefined;
        }

        switch (step) {
            case 1:
                this.playStep1();
                break;
            case 2:
                this.playStep2();
                break;
            case 3:
                this.playStep3();
                break;
            case 4:
                if (this.level === 2) {
                    this.playStep4Level2();
                } else {
                    // Level 1 has 3 steps, so step 4 is clickable
                    this.playClickableStep();
                }
                break;
            case 5:
                // Level 2 step 5 is clickable after showing result in step 4
                if (this.level === 2) {
                    this.playClickableStep();
                }
                break;
        }
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
        const upperText = this.scene.addText(0, -40, i18n.t('howToPlay.multiplyFractionsStep1'), {
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

    private getAudioKey(stepNumber: string): string {
        // Check if we have topic-specific audio keys matching the actual file structure
        if (this.topic && this.level) {
            // The actual audio files are named like: step_2_en.mp3 in multiply_fractions/level_1/
            // But they're loaded with keys like: step_2_multiply_fractions_level_1, step_3_multiply_fractions_level_1, etc.
            const language = i18n.getLanguage() || 'en';
            const audioKey = `${stepNumber}_${this.topic}_level_${this.level}_${language}`;
            
            // Check if this audio key exists in the scene's cache
            if (this.scene.cache.audio.exists(audioKey)) {
                return audioKey;
            }
        }
        return "";
    }

    // Step 1: Solve the problem (audio introduction with pointing hand)
    private playStep1() {
        if (this.currentStep !== 1) return;

        // Use step_2 audio for "Solve the problem" as requested
        const step1 = this.scene.audioManager.playSoundEffect(this.getAudioKey('step_2'));

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
                this.playFractionStep(this.currentStep);
            });
            this.delayedCalls.push(timer);
        });

        // Fallback timer if no audio
        if (!step1) {
            const timer = this.scene.time.delayedCall(3000, () => {
                this.currentStep++;
                this.pointingHand?.destroy();
                this.upperContainer.destroy();
                this.playFractionStep(this.currentStep);
            });
            this.delayedCalls.push(timer);
        }
    }

    // Step 2: For level 2, convert mixed number to improper fraction; for level 1, show jumps
    private playStep2() {
        if (this.currentStep !== 2) return;
        
        this.tutorialContainer.setVisible(true);
        this.pointingHand?.destroy();
        this.upperContainer?.destroy();

        const operand1 = parseInt(this.question.csvQuestion?.operand1 ?? '1');
        const operand2 = this.question.csvQuestion?.operand2 ?? '';

        if (this.level === 2) {
            // Level 2: Convert mixed number to improper fraction
            this.createMultiplyStep({
                audioKey: this.getAudioKey('step_3'),
                elements: [
                    { type: 'text', value: i18n.t('howToPlay.reduceFraction') },
                    { type: 'expression', value: operand2 },
                    { type: 'text', value: i18n.t('howToPlay.reduceFractionBecomes') },
                    { type: 'expression', value: this.reduceFraction(operand2) },
                    { type: 'text', value: '.' },
                ],
            });
        } else {
            // Level 1: Show jumps forward from 0
            const parts = this.question.markersList.length - 1;
            const leftMarker = this.numberline?.leftMarker;
            const rightMarker = this.numberline?.rightMarker;
            const startX = (leftMarker?.line.x ?? 0) / this.scene.display.scale;
            const endX = (rightMarker?.line.x ?? 0) / this.scene.display.scale;
            const width = (endX - startX) / parts;
            const height = 15;

            // Clean up existing rectangles
            if (this.tutorialRects.length > 0) {
                this.tutorialRects.forEach((rect) => rect.destroy());
                this.tutorialRects = [];
            }

            // Calculate jump size for level 1 (operand2 as fraction)
            const operand2Index = this.question.markersList.indexOf(operand2 as never);
            const jumpSizeParts = operand2Index; // Number of parts each jump covers

            // Create yellow rectangles for each jump
            for (let jump = 0; jump < operand1; jump++) {
                const jumpStartX = startX + width * (jump * jumpSizeParts);
                const jumpWidth = width * jumpSizeParts;
                
                const jumpRect = this.scene.addRectangle(
                    jumpStartX + jumpWidth / 2,
                    (leftMarker?.line.y ?? 0) / this.scene.display.scale,
                    jumpWidth - 2 * 10,
                    height,
                    0xFFF600, // Yellow color
                ).setStrokeStyle(this.scene.getScaledValue(1), 0xffffff).setOrigin(0.5);
                this.tutorialRects.push(jumpRect);
            }

            this.createMultiplyStep({
                audioKey: this.getAudioKey('step_3'),
                elements: [
                    { type: 'text', value: i18n.t('howToPlay.multiplyFractionsStartFromZero') },
                    { type: 'expression', value: operand1.toString() },
                    { type: 'text', value: i18n.t('howToPlay.multiplyFractionsJumpsForward') },
                    { type: 'expression', value: operand2 },
                    { type: 'text', value: '.' },
                ],
            });
        }
    }

    // Step 3: For level 1, show final result; for level 2, show jumps
    private playStep3() {
        if (this.currentStep !== 3) return;

        this.guideLine?.destroy();
        this.tutorialRects.forEach((rect) => rect.destroy());
        this.tutorialRects = [];

        const operand1 = parseInt(this.question.csvQuestion?.operand1 ?? '1');
        const operand2 = this.question.csvQuestion?.operand2 ?? '';
        const answer = this.question.csvQuestion?.answer ?? '';
        const parts = this.question.markersList.length - 1;
        const leftMarker = this.numberline?.leftMarker;
        const rightMarker = this.numberline?.rightMarker;
        const startX = (leftMarker?.line.x ?? 0) / this.scene.display.scale;
        const endX = (rightMarker?.line.x ?? 0) / this.scene.display.scale;
        const width = (endX - startX) / parts;
        const height = 15;

        if (this.level === 2) {
            // Level 2: Show jumps forward from 0 using improper fraction
            const improperFraction = this.reduceFraction(operand2);
            const jumpSize = this.getJumpSizeFromImproper(improperFraction, parts);
            
            // Create yellow rectangles for each jump
            for (let jump = 0; jump < operand1; jump++) {
                const jumpStartX = startX + width * (jump * jumpSize);
                const jumpWidth = width * jumpSize;
                
                const jumpRect = this.scene.addRectangle(
                    jumpStartX + jumpWidth / 2,
                    (leftMarker?.line.y ?? 0) / this.scene.display.scale,
                    jumpWidth - 2 * 10,
                    height,
                    0xFFF600, // Yellow color
                ).setStrokeStyle(this.scene.getScaledValue(1), 0xffffff).setOrigin(0.5);
                this.tutorialRects.push(jumpRect);
            }

            this.createMultiplyStep({
                audioKey: this.getAudioKey('step_4'),
                elements: [
                    { type: 'text', value: i18n.t('howToPlay.multiplyFractionsStartFromZero2') },
                    { type: 'expression', value: operand1.toString() },
                    { type: 'text', value: i18n.t('howToPlay.multiplyFractionsJumpsForward') },
                    { type: 'expression', value: improperFraction },
                    { type: 'text', value: '.' },
                ],
            });
        } else {
            // Level 1: Show final result with guideline
            const answerIndex = this.question.markersList.indexOf(answer as never);
            const answerX = startX + width * answerIndex;
            const startY = (leftMarker?.line.y ?? 0) - this.scene.getScaledValue(263);

            // Create guideline to show the answer position
            const markers = [this.numberline?.leftMarker, this.numberline?.rightMarker, ...this.numberline?.markers];
            this.guideLine = (this.scene as any).createMaskedGuideline(this.scene.getScaledValue(answerX), startY, this.scene.getScaledValue(420), markers);
            
            this.createMultiplyStep({
                audioKey: this.getAudioKey('step_4'),
                elements: [
                    { type: 'text', value: i18n.t('howToPlay.multiplyFractionsSo') },
                    { type: 'expression', value: this.question.questionPrompt },
                    { type: 'text', value: '=' },
                    { type: 'expression', value: answer },
                    { type: 'text', value: '.' },
                ],
            });
        }
    }

    // Step 4 for Level 2: Show final result
    private playStep4Level2() {
        if (this.currentStep !== 4) return;

        this.guideLine?.destroy();
        if (this.tutorialRects.length > 0) {
            this.tutorialRects.forEach((rect) => rect.destroy());
            this.tutorialRects = [];
        }
        
        const answer = this.question.csvQuestion?.answer ?? '';
        const answerIndex = this.question.markersList.indexOf(answer as never);
        const parts = this.question.markersList.length - 1;
        const leftMarker = this.numberline?.leftMarker;
        const rightMarker = this.numberline?.rightMarker;
        const startX = (leftMarker?.line.x ?? 0) / this.scene.display.scale;
        const endX = (rightMarker?.line.x ?? 0) / this.scene.display.scale;
        const width = (endX - startX) / parts;
        const answerX = startX + width * answerIndex;
        const startY = (leftMarker?.line.y ?? 0) - this.scene.getScaledValue(263);

        // Create guideline to show the answer position
        const markers = [this.numberline?.leftMarker, this.numberline?.rightMarker, ...this.numberline?.markers];
        this.guideLine = (this.scene as any).createMaskedGuideline(this.scene.getScaledValue(answerX), startY, this.scene.getScaledValue(420), markers);
        
        this.createMultiplyStep({
            audioKey: this.getAudioKey('step_5'),
            elements: [
                { type: 'text', value: i18n.t('howToPlay.multiplyFractionsSo') },
                { type: 'expression', value: this.question.questionPrompt },
                { type: 'text', value: '=' },
                { type: 'expression', value: answer },
                { type: 'text', value: '.' },
            ],
        });
    }

    // Final step: Make it clickable for user interaction
    private async playClickableStep() {
        this.guideLine?.destroy();
        this.tutorialContainer.destroy();

        const answer = this.question.shipLocation;
        const numberlineWidth = this.scene.display.width - GameConfig.MARKER_LINES.horizontalMargin * 2;
        const start = parseFractionString(this.question.startPoint) ?? 0;
        const end = parseFractionString(this.question.endPoint) ?? 1;
        const widthRatio = (answer - start) / (end - start);
        const targetPointX = GameConfig.MARKER_LINES.horizontalMargin + widthRatio * numberlineWidth;

        this.clickableZone = this.scene.add.zone(this.scene.getScaledValue(targetPointX), this.scene.getScaledValue(this.scene.display.height / 2), this.scene.getScaledValue(30), this.scene.getScaledValue(30))
            .setInteractive()
            .setOrigin(0.5);

        const targetMarker = this.numberline?.markers.find(marker => {
            const expression = marker.text?.getContainer().getData('expression');
            return parseFractionString(expression ?? '') === parseFractionString(answer);
        });

        let tapTextY = this.scene.display.height / 2 - 120;
        let pointingHandY = this.scene.display.height / 2 - 60;

        if (targetMarker) {
            const textContainer = targetMarker.text?.getContainer();
            pointingHandY = (textContainer?.getBounds().top ?? 0) / this.scene.display.scale - 30;
            tapTextY = pointingHandY - 60;
        }

        const tapText = this.scene.addText(targetPointX, tapTextY, i18n.t('howToPlay.tapHere'), {
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

        const pointingHand = this.scene.addImage(targetPointX - 3, pointingHandY, 'pointing_hand').setRotation(Math.PI);
        this.scene.tweens.add({
            targets: pointingHand,
            y: "-=10",
            duration: 500,
            ease: 'Sine.easeInOut',
            repeat: -1,
            yoyo: true,
        });

        this.clickableZone.on('pointerover', () => {
            document.body.style.cursor = `url(${GameConfig.ASSETS.PATHS.CURSOR}) ${GameConfig.CURSOR.OFFSET.X} ${GameConfig.CURSOR.OFFSET.Y}, pointer`;
        });

        this.clickableZone.on('pointerout', () => {
            document.body.style.cursor = 'default';
        });

        this.clickableZone.on('pointerdown', async () => {
            if (this.clickableZone) {
                this.clickableZone.removeInteractive();
            }
            pointingHand.destroy();
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
                pointingHand.destroy();
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

    private createPointingHandAnimation(x: number, y: number): Phaser.GameObjects.Image {
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

    private createMultiplyStep({
        audioKey,
        elements,
    }: {
        audioKey: string;
        elements: ({ type: 'text'; value: string } | { type: 'expression'; value: string })[];
    }) {
        // Only play audio if we have a valid key
        const stepAudio = audioKey ? this.scene.audioManager.playSoundEffect(audioKey) : null;
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

        // Fix text overlapping by ensuring proper width calculation
        if (positionedElements.length > 0) {
            const firstElement = positionedElements[0];
            const lastElement = positionedElements[positionedElements.length - 1];
            const totalWidth = lastElement.getBounds().right - firstElement.getBounds().left;
            stepContainer.setX(-totalWidth / 2);
            
            // Adjust for expression containers
            if (firstElement.type !== 'Text') {
                stepContainer.x += firstElement.getBounds().width / 2;
            }
        }

        this.tutorialContainer.add([stepContainer]);
        const textVal = elements.map(element => element.value).join(' ');
        const textOverlay = new TextOverlay(this.scene, stepContainer.getAt(0) as Phaser.GameObjects.Text, { label: textVal, announce: true });
        if (this.instructionDiv) {
            this.instructionDiv.appendChild(textOverlay.element);
        }

        // Use audio completion to progress steps like other modules, but only if audio exists
        if (stepAudio) {
            stepAudio.on('complete', () => {
                // Add a small pause after audio completes before advancing
                const timer = this.scene.time.delayedCall(1500, () => {
                    this.currentStep++;
                    this.playFractionStep(this.currentStep);
                });
                this.delayedCalls.push(timer);
            });
        } else {
            // If no audio, use a timer to progress
            const timer = this.scene.time.delayedCall(2000, () => {
                this.currentStep++;
                this.playFractionStep(this.currentStep);
            });
            this.delayedCalls.push(timer);
        }
    }

    private createText(x: number, y: number, text: string, tutorialElements: (Phaser.GameObjects.Text | Phaser.GameObjects.Container)[]) {
        const textElement = this.scene.addText(x, y, text, {
            fontSize: '32px',
            color: '#ffffff',
            fontFamily: fontKeys.EXO,
        }).setOrigin(0, 0.5);

        if (tutorialElements.length > 0) {
            const lastElement = tutorialElements[tutorialElements.length - 1];
            const bounds = lastElement.getBounds();
            // Increase spacing to prevent overlap
            textElement.setX(bounds.right + this.scene.getScaledValue(10));
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
        });

        const expressionContainer = expressionUtils.getContainer();

        if (tutorialElements.length > 0) {
            const lastElement = tutorialElements[tutorialElements.length - 1];
            const bounds = lastElement.getBounds();
            const expContainerWidth = expressionContainer.getBounds().width;
            // Increase spacing to prevent overlap
            expressionContainer.setX(bounds.right + expContainerWidth / 2 + this.scene.getScaledValue(10));
        }
        tutorialElements.push(expressionContainer);
        return expressionContainer;
    }

    private startGameScreen() {
        this.scene.audioManager.stopAllSoundEffects();
        this.destroyTimers();
        this.onComplete();
    }

    // private convertMixedToImproper(mixedNumber: string): string {
    //     // Convert mixed number like "1 1/3" to improper fraction "4/3"
    //     const parts = mixedNumber.trim().split(' ');
    //     if (parts.length === 2) {
    //         const whole = parseInt(parts[0]);
    //         const fractionParts = parts[1].split('/');
    //         if (fractionParts.length === 2) {
    //             const numerator = parseInt(fractionParts[0]);
    //             const denominator = parseInt(fractionParts[1]);
    //             const improperNumerator = whole * denominator + numerator;
    //             return `${improperNumerator}/${denominator}`;
    //         }
    //     }
    //     // If not a mixed number, return as is
    //     return mixedNumber;
    // }

    private reduceFraction(fraction: string): string {
        const parts = fraction.split('/');
        if (parts.length !== 2) {
            return fraction; // Not a valid fraction, return as is
        }

        const numerator = parseInt(parts[0]);
        const denominator = parseInt(parts[1]);

        if (isNaN(numerator) || isNaN(denominator) || denominator === 0) {
            return fraction; // Invalid fraction, return as is
        }

        // Find the greatest common divisor (GCD)
        const gcd = this.findGCD(Math.abs(numerator), Math.abs(denominator));
        
        // Reduce the fraction
        const reducedNumerator = numerator / gcd;
        const reducedDenominator = denominator / gcd;

        // Handle negative fractions
        if (reducedDenominator < 0) {
            return `${-reducedNumerator}/${-reducedDenominator}`;
        }

        return `${reducedNumerator}/${reducedDenominator}`;
    }

    private findGCD(a: number, b: number): number {
        while (b !== 0) {
            const temp = b;
            b = a % b;
            a = temp;
        }
        return a;
    }    

    private getJumpSizeFromImproper(improperFraction: string, totalParts: number): number {
        // Calculate how many parts one jump should cover
        const fractionParts = improperFraction.split('/');
        if (fractionParts.length === 2) {
            const numerator = parseInt(fractionParts[0]);
            const denominator = parseInt(fractionParts[1]);
            // For 4/3 on a number line with 12 parts (0 to 4), each third is 3 parts
            // So 4/3 would be 4 parts
            return Math.round((numerator / denominator) * (totalParts / this.getNumberLineRange()));
        }
        return 1;
    }

    private getNumberLineRange(): number {
        // Calculate the range of the number line (end - start)
        const start = parseFractionString(this.question.startPoint) ?? 0;
        const end = parseFractionString(this.question.endPoint) ?? 1;
        return end - start;
    }

    private destroyTimers() {
        this.delayedCalls.forEach(timer => {
            if (timer) timer.destroy();
        });
        this.delayedCalls = [];
    }

    destroy(): void {
        this.destroyTimers();
        if (this.guideLine) this.guideLine.destroy();
        if (this.clickableZone) this.clickableZone.destroy();
        this.tutorialRects.forEach((rect) => rect.destroy());
        this.tutorialRects = [];
    }
}
