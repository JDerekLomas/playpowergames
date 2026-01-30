import { BaseScene } from '../scenes/BaseScene';
import { Marker, UIUtils } from '../utils/UIUtils';
import { GameScreenConfig as GameConfig } from '../config/GameScreenConfig';
import { CommonConfig } from '../config/CommonConfig';
import { HowToPlaySceneConfig as Config } from '../config/HowToPlaySceneConfig';
import { i18n, TextOverlay, announceToScreenReader, ImageOverlay, focusToGameContainer } from '@k8-games/sdk';
import { QuestionData } from '../interfaces/gameplay';
import { GameplayManager } from '../managers/GameplayManager';
import { AnimationPlayer } from '../managers/AnimationPlayer';
import { AnimationManager } from '../managers/AnimationManager';
import { TypingModule } from '../objects/TypingModule';
import { parseFractionString } from '../utils/parseFractionString';
import { computeFractionDigitMask } from '../utils/fractionMask';
import { getSharkAnnouncement } from '../utils/sharkAnnouncement';

const {
    ASSETS: {
        KEYS: { FONT: fontKeys },
    },
} = CommonConfig;

export interface TypingHowToPlayData {
    scene: BaseScene;
    question: QuestionData;
    gameplayManager: GameplayManager;
    parentScene: string;
    topic: string;
    level?: number;
    onComplete: () => void;
    createSkipButton?: () => Phaser.GameObjects.Container;
}

export class TypingHowToPlay {
    private scene: BaseScene;
    private question: QuestionData;
    private gameplayManager: GameplayManager;
    private parentScene: string;
    private topic: string;
    private level?: number;
    private onComplete: () => void;
    private createSkipButton?: () => Phaser.GameObjects.Container;
    
    private instructionContainer!: Phaser.GameObjects.Container;
    private delayedCalls: Phaser.Time.TimerEvent[] = [];
    private topWoodImage!: Phaser.GameObjects.Image;
    private animationPlayer?: AnimationPlayer;
    private animationManager?: AnimationManager;
    private typingModule?: TypingModule;
    private targetPointX!: number;
    private sharkSprite?: Phaser.GameObjects.Sprite;
    private stepTextContainer!: Phaser.GameObjects.Container;
    private numberlineZoomMarkers!: {
        zoomLevel: number;
        markersList: (number[] | string[])[];
    };
    private currentStep: number = 1;
    private totalSteps: number = 4;
    private leftMarker!: Marker | null;
    private rightMarker!: Marker | null;
    private markers!: Marker[];
    private pointingHand!: Phaser.GameObjects.Image | null;
    private rects: Phaser.GameObjects.Rectangle[] = [];
    private level2Markers: Phaser.GameObjects.Rectangle[] = [];
    private announcementQueue: { message: string; ariaLive?: 'off' | 'polite' | 'assertive' }[] = [];
    private isAnnouncing: boolean = false;

    private instructionDiv?: HTMLElement;
    private numberLineContainer?: HTMLElement;

    constructor(data: TypingHowToPlayData) {
        this.scene = data.scene;
        this.question = data.question;
        this.gameplayManager = data.gameplayManager;
        this.parentScene = data.parentScene;
        this.topic = data.topic;
        this.level = data.level;
        this.onComplete = data.onComplete;
        this.createSkipButton = data.createSkipButton;
    }

    create(): void {
        if (this.parentScene === 'GameScreen') {
            focusToGameContainer();
            this.scene.time.delayedCall(1000, () => {
                this.queueAnnouncement(i18n.t('howToPlay.helpPage'));
            })
        }

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
        this.updateMarkers(this.question.startPoint, this.question.endPoint, this.question.markersList, this.gameplayManager.getShowIntermediateNumbers());

        const answer = parseFractionString(this.question.shipLocation) ?? 0;
        const start = parseFractionString(this.question.startPoint) ?? 0;
        const end = parseFractionString(this.question.endPoint) ?? 1;
        this.targetPointX = this.findSharkX(start, end, answer);

        this.animationPlayer?.playSharkLoopAnimation(
            this.scene.getScaledValue(this.targetPointX),
            0,
            'hit'
        ).then((shark) => {
            this.sharkSprite = shark;
            const sharkOverlay = new ImageOverlay(this.scene, this.sharkSprite, { label: i18n.t('game.sharkIsHere') });
            if (this.numberLineContainer && sharkOverlay.element) {
                this.numberLineContainer.appendChild(sharkOverlay.element);
            }
            // Announce shark position for screen readers
            focusToGameContainer();
            this.scene.time.delayedCall(1000, () => {
                this.queueAnnouncement(getSharkAnnouncement(
                    this.topic,
                    answer,
                    this.question.startPoint,
                    this.question.endPoint,
                ));
            });
            this.scene.time.delayedCall(1500, () => {
                this.playStep(this.currentStep);
            });
        });

        // Add typing module
        this.typingModule = new TypingModule(this.scene, (value) => {
            console.log(value);
        }, true, this.topic === 'percents' ? '%' : '', Boolean(isMapUI), this.topic);
        
        this.createInstructionContainer();

        this.numberlineZoomMarkers = this.getNumberLineZoomMarkers({
            startPoint: start,
            endPoint: end,
            answer: answer,
        });

        // Calculate total steps based on zoom level
        this.calculateTotalSteps();
    }

    private parseAnswer(value: number | string): number {
        if (typeof value === "number") return value;
        if (value.includes("/")) {
            const [num, den] = value.split("/").map(Number);
            return num / den;
        }
        return parseFloat(value);
    }

    private generateMarkers(start: number, end: number, parts: number): number[] {
        const step = (end - start) / parts;
        return Array.from({ length: parts + 1 }, (_, i) =>
            parseFloat((start + i * step).toFixed(5))
        );
    }

    private getNumberLineZoomMarkers({
        startPoint,
        endPoint,
        answer,
    }: {
        startPoint: number;
        endPoint: number;
        answer: number | string;
    }): {
        zoomLevel: 1 | 2;
        markersList: (number[] | string[])[];
    } {
        const location = this.parseAnswer(answer);
        const simpleSplits = [2, 5, 10];
        
        // Check if this is a percent question by looking for % in the question prompt
        const isPercentQuestion = this.question.questionPrompt.includes('%');

        for (const split of simpleSplits) {
            const markers = this.generateMarkers(startPoint, endPoint, split);
            for (let i = 0; i < markers.length - 1; i++) {
                if (location === markers[i]) {
                    // Format markers as percent strings if this is a percent question
                    const formattedMarkers = isPercentQuestion 
                        ? markers.map(marker => `${100 * marker}%`)
                        : markers;
                    
                    return {
                        zoomLevel: 1,
                        markersList: [formattedMarkers],
                    };
                }
            }
        }

        // 2-zoom level
        const zoom1Markers = this.generateMarkers(startPoint, endPoint, 10);
        let secondStart = startPoint;
        let secondEnd = endPoint;

        for (let i = 0; i < zoom1Markers.length - 1; i++) {
            if (location > zoom1Markers[i] && location <= zoom1Markers[i + 1]) {
                secondStart = zoom1Markers[i];
                secondEnd = zoom1Markers[i + 1];
                break;
            }
        }

        // When initial division is 10 parts, restrict further division to only 2 parts
        const zoom2Markers = this.generateMarkers(secondStart, secondEnd, 2);

        // Format markers as percent strings if this is a percent question
        const formattedZoom1Markers = isPercentQuestion 
            ? zoom1Markers.map(marker => `${100 * marker}%`)
            : zoom1Markers;
        const formattedZoom2Markers = isPercentQuestion 
            ? zoom2Markers.map(marker => `${100 * marker}%`)
            : zoom2Markers;

        return {
            zoomLevel: 2,
            markersList: [formattedZoom1Markers, formattedZoom2Markers],
        };
    }

    private findSharkX(startPoint: number, endPoint: number, answer: number) {
        const horizontalMargin = GameConfig.MARKER_LINES.horizontalMargin;
        const numberlineWidth = this.scene.display.width - horizontalMargin * 2;
        const widthRatio = (answer - startPoint) / (endPoint - startPoint);
        return horizontalMargin + widthRatio * numberlineWidth;
    }

    private calculateTotalSteps(): void {
        // Always 4 steps, but step 3 will be skipped based on zoom level
        this.totalSteps = 4;
    }

    private shouldSkipStep(step: number): boolean {
        const isZoomLevel1 = this.numberlineZoomMarkers.zoomLevel === 1;
        
        // For place_value_magnitude topic, skip steps 2 and 3
        if (this.topic === 'place_value_magnitude' && (step === 2 || step === 3)) {
            return true;
        }
        
        switch (step) {
            case 3:
                // Skip step 3 for percents topic
                if (this.topic === 'percents') {
                    return true;
                }
                // Skip step 3 (split further) if zoom level 1
                return isZoomLevel1;
            default:
                return false;
        }
    }

    private getNextStep(currentStep: number): number {
        let nextStep = currentStep + 1;
        while (nextStep <= this.totalSteps && this.shouldSkipStep(nextStep)) {
            nextStep++;
        }
        return nextStep;
    }

    // Commented out as it is not used
    // private getPreviousStep(currentStep: number): number {
    //     let prevStep = currentStep - 1;
    //     while (prevStep >= 1 && this.shouldSkipStep(prevStep)) {
    //         prevStep--;
    //     }
    //     return prevStep;
    // }

    private createInstructionContainer() {
        this.instructionContainer = this.scene.add.container(
            this.scene.getScaledValue(this.scene.display.width / 2),
            this.scene.getScaledValue(210),
        ).setDepth(1);

        const backgroundRect = this.scene.addRectangle(0, 0, this.scene.display.width + 2, 100, 0x000000, 0.7)
            .setStrokeStyle(this.scene.getScaledValue(1), 0xffffff)
            .setOrigin(0.5);

        this.stepTextContainer = this.scene.add.container(0, 0);

        this.instructionContainer.add([backgroundRect, this.stepTextContainer]);
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
            suffix: this.topic === 'percents' && this.level === 1 ? '%' : undefined,
            parentContainer: this.numberLineContainer,
        });
        this.markers = markers;
        this.leftMarker = leftMarker;
        this.rightMarker = rightMarker;
    }

    private createPointingHandAnimation(x: number, y: number, destroy: boolean = true): Phaser.GameObjects.Image {
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
            onComplete: () => {
                if (pointingHand && destroy) {
                    pointingHand.destroy();
                }
            }
        });

        return pointingHand;
    }

    private playStep(step: number) {
        // Check if this step should be skipped
        if (this.shouldSkipStep(step)) {
            // If current step should be skipped, move to next valid step
            const nextStep = this.getNextStep(step);
            if (nextStep <= this.totalSteps) {
                this.currentStep = nextStep;
                this.playStep(this.currentStep);
            } else {
                // If no more valid steps, start guided tutorial
                this.startGuidedTutorial();
            }
            return;
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
                this.playStep4();
                break;
        }
    }

    private playStep1() {
        this.sharkSprite?.setVisible(true);
        
        const sharkX = this.sharkSprite?.x || 0;
        const sharkY = this.sharkSprite?.y || 0;
        
        this.pointingHand = this.createPointingHandAnimation(
            sharkX / this.scene.display.scale - 50,
            sharkY / this.scene.display.scale - 10,
            false
        );

        if (this.rects) {
            this.rects.forEach((rect) => {
                rect.destroy();
            });
            this.rects = [];
        }
        
        this.updateMarkers(
            this.question.startPoint, 
            this.question.endPoint, 
            this.question.markersList, 
            this.gameplayManager.getShowIntermediateNumbers());
        this.stepTextContainer.removeAll(true);
        const step1Text = this.scene.addText(0, 0, i18n.t('howToPlay.typingStep1Text'), {
            fontSize: 26,
            fontFamily: 'Exo'
        }).setOrigin(0.5);
        this.stepTextContainer.add([step1Text]);
        const step1TextOverlay = new TextOverlay(this.scene, step1Text, { label: i18n.t('howToPlay.typingStep1Text'), announce: true });
        if (this.instructionDiv) {
            this.instructionDiv.appendChild(step1TextOverlay.element);
        }

        // Play step 1 audio
        const step1Audio = this.scene.audioManager.playSoundEffect('step_1_typing');
        step1Audio?.on('complete', () => {
            const timer = this.scene.time.delayedCall(1000, () => {
                this.currentStep = this.getNextStep(this.currentStep);
                this.playStep(this.currentStep);
            });
            this.delayedCalls.push(timer);
        });
    }

    private playStep2() {
        if (this.pointingHand) {
            this.pointingHand.destroy();
            this.pointingHand = null;
        }

        if (this.level2Markers) {
            this.level2Markers.forEach((rect) => {
                rect.destroy();
            });
            this.level2Markers = [];
        }

        if (this.rects) {
            this.rects.forEach((rect) => {
                rect.destroy();
            });
            this.rects = [];
        }

        this.stepTextContainer.removeAll(true);
        let step2Text: any;
        let parts = this.numberlineZoomMarkers.markersList[0].length - 1;
        if (this.topic === 'explore_numbers_to_1000') {
            parts = this.question.markersList.length - 1;
            const markersList = this.numberlineZoomMarkers.markersList[0];
            const rangeStart = markersList[1];
            const rangeEnd = markersList[2];
            step2Text = this.scene.addText(0, 0, i18n.t('howToPlay.exploreNumbersStep2', { rangeStart, rangeEnd }), {
                fontSize: 26,
                fontFamily: 'Exo'
            }).setOrigin(0.5);
        } else {
            step2Text = this.scene.addText(0, 0, i18n.t('howToPlay.typingStep2Text', { parts }), {
                fontSize: 26,
                fontFamily: 'Exo'
            }).setOrigin(0.5);
        }
        

        if (this.topic !== 'explore_numbers_to_1000') {
            const markersList = this.numberlineZoomMarkers.markersList[0];
            this.updateMarkers(
                markersList[0],
                markersList[markersList.length - 1],
                markersList,
                this.gameplayManager.getShowIntermediateNumbers()
            );
        }

        const startX = (this.leftMarker?.line.x ?? 0) / this.scene.display.scale;
        const endX = (this.rightMarker?.line.x ?? 0) / this.scene.display.scale;
        const width = (endX - startX) / parts;
        const height = 15;

        for (let i = 0; i < parts; i++) {
            const rect = this.scene.addRectangle(
                startX + width * i + width / 2,
                (this.leftMarker?.line.y ?? 0) / this.scene.display.scale,
                width - 2 * 10,
                height,
                0xFFF600,
            )
            .setStrokeStyle(this.scene.getScaledValue(1), 0xffffff)
            .setOrigin(0.5);
            this.rects.push(rect);
        }
        
        this.stepTextContainer.add([step2Text]);
        const step2TextOverlay = new TextOverlay(this.scene, step2Text, { label: step2Text.text, announce: true });
        if (this.instructionDiv) {
            this.instructionDiv.appendChild(step2TextOverlay.element);
        }

        // Play step 2 audio based on parts
        let audioKey = 'step_2_1_typing'; // Default for 2 parts
        if (parts === 5) {
            audioKey = 'step_2_2_typing';
        } else if (parts === 10) {
            if(this.topic === 'explore_numbers_to_1000') {
                audioKey = 'step_2_explore_typing';
            } else {
                audioKey = 'step_2_3_typing';
            }
        }

        const step2Audio = this.scene.audioManager.playSoundEffect(audioKey);
        step2Audio?.on('complete', () => {
            const timer = this.scene.time.delayedCall(1000, () => {
                this.currentStep = this.getNextStep(this.currentStep);
                this.playStep(this.currentStep);
            });
            this.delayedCalls.push(timer);
        });
    }

    private playStep3() {
        this.stepTextContainer.removeAll(true);
        let parts = this.numberlineZoomMarkers.markersList[1].length - 1;
        let step3Text : any;
        if (this.topic === 'explore_numbers_to_1000') {
            console.log('this.numberlineZoomMarkers: ', parts);
            const markersList = this.numberlineZoomMarkers.markersList[0];
            const rangeStart = markersList[1];
            const rangeEnd = markersList[2];
            step3Text = this.scene.addText(0, 0, i18n.t('howToPlay.exploreNumbersStep3', { rangeStart, rangeEnd }), {
                fontSize: 26,
                fontFamily: 'Exo'
            }).setOrigin(0.5);
        } else {
            step3Text = this.scene.addText(0, 0, i18n.t('howToPlay.typingStep3Text', { parts }), {
                fontSize: 26,
                fontFamily: 'Exo'
            }).setOrigin(0.5);
        }
        const markersList = this.numberlineZoomMarkers.markersList[1];

        // create custom markers with black lines without numbers 
        const numberlineWidth = this.scene.display.width - GameConfig.MARKER_LINES.horizontalMargin * 2;
        const start = parseFractionString(this.question.startPoint) ?? 0;
        const end = parseFractionString(this.question.endPoint) ?? 1;
        
        // Extract numeric values from markers for calculations
        const firstMarkerValue = typeof markersList[0] === 'string' 
            ? parseFractionString(markersList[0]) ?? 0 
            : markersList[0] as number;
        const lastMarkerValue = typeof markersList[markersList.length - 1] === 'string' 
            ? parseFractionString(markersList[markersList.length - 1]) ?? 0 
            : markersList[markersList.length - 1] as number;

        const startPoint = (firstMarkerValue - start) / (end - start) * numberlineWidth + GameConfig.MARKER_LINES.horizontalMargin;
        const endPoint = (lastMarkerValue - start) / (end - start) * numberlineWidth + GameConfig.MARKER_LINES.horizontalMargin;
        const gap = (endPoint - startPoint) / parts;

        for (let i = 0; i <= parts; i++) {
            const rect = this.scene.addRectangle(
                startPoint + gap * i,
                (this.leftMarker?.line.y ?? 0) / this.scene.display.scale, 
                4,
                35,
                0xFFFFFF,
            )
            .setOrigin(0.5)
            this.level2Markers.push(rect);
        }
        
        this.stepTextContainer.add([step3Text]);
        const step3TextOverlay = new TextOverlay(this.scene, step3Text, { label: step3Text.text, announce: true });
        if (this.instructionDiv) {
            this.instructionDiv.appendChild(step3TextOverlay.element);
        }

        // Play step 3 audio based on parts
        let audioKey = 'step_3_1_typing'; // Default for 2 parts
        if(parts === 2 && this.topic === 'explore_numbers_to_1000') {
            audioKey = 'step_3_explore_typing';
        }
        if (parts === 5) {
            audioKey = 'step_3_2_typing';
        } else if (parts === 10) {
            audioKey = 'step_3_3_typing';
        }

        const step3Audio = this.scene.audioManager.playSoundEffect(audioKey);
        step3Audio?.on('complete', () => {
            const timer = this.scene.time.delayedCall(1000, () => {
                this.currentStep = this.getNextStep(this.currentStep);
                this.playStep(this.currentStep);
            });
            this.delayedCalls.push(timer);
        });
    }

    private playStep4() {
        if (this.pointingHand) {
            this.pointingHand.destroy();
            this.pointingHand = null;
        }

        this.stepTextContainer.removeAll(true);
        const step4Text = this.scene.addText(0, 0,this.topic === 'understand_and_compare_decimals'? i18n.t('howToPlay.typingStep4TextFractions'): i18n.t('howToPlay.typingStep4Text'), {
            fontSize: 26,
            fontFamily: 'Exo'
        }).setOrigin(0.5);

        this.pointingHand = this.createPointingHandAnimation(
            370,
            this.scene.display.height - 110
        )

        this.pointingHand.setDepth(10);

        this.stepTextContainer.add([step4Text]);
        const step4TextOverlay = new TextOverlay(this.scene, step4Text, { label: step4Text.text, announce: true });
        if (this.instructionDiv) {
            this.instructionDiv.appendChild(step4TextOverlay.element);
        }

        // Play step 4 audio
        const step4Audio = this.scene.audioManager.playSoundEffect('step_4_typing');
        step4Audio?.on('complete', () => {
            // For explore_numbers_to_1000, show the hint after 0.5 second
            if (this.topic === 'explore_numbers_to_1000') {
                this.stepTextContainer.removeAll(true);
                const robotPosition = this.question.questionPrompt;
                this.scene.time.delayedCall(500, () => {
                    const step4Hint = this.scene.addText(0, 0, i18n.t('howToPlay.exploreNumbersStep4Hint', { robotPosition }), {
                        fontSize: 26,
                        fontFamily: 'Exo'
                    }).setOrigin(0.5);
                    this.stepTextContainer.add([step4Hint]);
                    const step4HintOverlay = new TextOverlay(this.scene, step4Hint, { label: step4Hint.text, announce: true });
                    if (this.instructionDiv) {
                        this.instructionDiv.appendChild(step4HintOverlay.element);
                    }
                    const step4Audio = this.scene.audioManager.playSoundEffect('step_4_explore_typing');
                    step4Audio?.on('complete', () => {
                        this.startGuidedTutorial();
                    });
                });
                
                return;
            }
            this.startGuidedTutorial();
        });
    }

    private startGuidedTutorial() {
        if (this.typingModule) {
            let answer: string;
            this.typingModule.setOnFireEnabled(() => {
                this.stepTextContainer.removeAll(true);
                const step4Text = this.scene.addText(0, 0, i18n.t('howToPlay.typingFireStep'), {
                    fontSize: 26,
                    fontFamily: 'Exo'
                }).setOrigin(0.5);
                this.stepTextContainer.add([step4Text]);
                const step4TextOverlay = new TextOverlay(this.scene, step4Text, { label: step4Text.text, announce: true });
                if (this.instructionDiv) {
                    this.instructionDiv.appendChild(step4TextOverlay.element);
                }

                this.scene.audioManager.playSoundEffect('step_fire');
            });

            if (this.topic === 'understand_and_compare_decimals' || this.topic === 'fractions_as_numbers') {
                const answerStr = this.question.csvQuestion?.answer || '';
                // Apply mask so placeholders show and auto-switching works
                const mask = computeFractionDigitMask(answerStr);
                if (mask) this.typingModule.setFractionMask(mask);
                // Remove '/' from expected input to avoid a non-existent slash step
                const expected = answerStr.replace(/\//g, '');
                this.typingModule.startGuidedTutorial(expected, () => {
                    this.scene.audioManager.stopSoundEffect('step_fire');
                    this.typingModule?.stopGuidedTutorial();
                    this.instructionContainer.destroy();
                    this.playFireButtonClick(() => {
                        this.scene.time.delayedCall(1000, () => {
                            this.startGameScreen();
                        });
                    });
                });
                return;
            } else {
                let numericAnswer = this.question.shipLocation;
                if (this.question.questionPrompt.includes("%")) {
                    numericAnswer *= 100;
                }
                answer = numericAnswer.toString();
            }
            this.typingModule.startGuidedTutorial(answer, () => {
                this.scene.audioManager.stopSoundEffect('step_fire');
                this.typingModule?.stopGuidedTutorial();
                this.instructionContainer.destroy();
                this.playFireButtonClick(() => {
                    this.scene.time.delayedCall(1000, () => {
                        this.startGameScreen();
                    });
                });
            });
        }
    }

    private startGameScreen() {
        this.scene.audioManager.stopAllSoundEffects();
        this.destroyTimers();
        this.onComplete();
    }

    private async playFireButtonClick(cb?: () => void) {
        const timer = this.scene.time.delayedCall(400, async () => {
            const timer2 = this.scene.time.delayedCall(500, () => {
                this.sharkSprite?.setVisible(false);
            });
            this.delayedCalls.push(timer2);
            await this.animationPlayer?.playResultAnimations(
                'hit',
                this.scene.getScaledValue(this.targetPointX),
                this.scene.getScaledValue(this.targetPointX),
                true
            );

            cb?.();
        });
        this.delayedCalls.push(timer);
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

    // Add this method to handle queued announcements
    private queueAnnouncement(message: string, ariaLive?: 'off' | 'polite' | 'assertive') {
        this.announcementQueue.push({ message, ariaLive });
        this.processAnnouncementQueue();
    }

    private processAnnouncementQueue() {
        if (this.isAnnouncing || this.announcementQueue.length === 0) return;
        this.isAnnouncing = true;
        const next = this.announcementQueue.shift()!;
        announceToScreenReader(next.message.toString(), next.ariaLive);
        // Estimate the duration of the announcement and wait before processing next
        const words = next.message.split(' ').length;
        const estimatedDuration = (words / 2.5) * 1000; // 2.5 words per second
        const delay = Math.max(estimatedDuration + 500, 2000); // Minimum 2 seconds

        this.scene.time.delayedCall(delay, () => {
            this.isAnnouncing = false;
            this.processAnnouncementQueue();
        });
    }

    destroy(): void {
        this.scene.audioManager.stopAllSoundEffects();
        this.destroyTimers();
    }
}