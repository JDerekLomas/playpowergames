import { BaseScene } from './BaseScene';
import { UIUtils, Marker } from '../utils/UIUtils';
import { InputManager } from '../managers/InputManager';
import { GameScreenConfig } from '../config/GameScreenConfig';
import { islandState } from '../managers/IslandStateManager';
import { CommonConfig } from '../config/CommonConfig';
import { ButtonHelper, i18n, setSceneBackground } from '@k8-games/sdk';
import { GameScreen } from './GameScreen';
import { parseFractionString } from '../utils/parseFractionString';

const fontKeys = CommonConfig.ASSETS.KEYS.FONT;
const buttonKeys = CommonConfig.ASSETS.KEYS.IMAGE.BUTTON;

interface DiagnosticQuestion {
    target: number | string;
    startPoint: number | string;
    endPoint: number | string;
    markersList: string[];
    /** On correct: jump to this question index (or 'place' to finish) */
    onCorrect: number | { place: number };
    /** On incorrect: go to this question index (or 'place' to finish) */
    onIncorrect: number | { place: number };
}

const HIT_THRESHOLD = 0.1; // generous for diagnostic

const DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
    // Q0: Place 7 on 0-10
    {
        target: 7, startPoint: 0, endPoint: 10,
        markersList: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
        onCorrect: 2, // skip to Q2 (Q3 in plan, 0-indexed here)
        onIncorrect: 1,
    },
    // Q1: Place 3 on 0-10
    {
        target: 3, startPoint: 0, endPoint: 10,
        markersList: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
        onCorrect: 2,
        onIncorrect: { place: 0 },
    },
    // Q2: Place 45 on 0-100
    {
        target: 45, startPoint: 0, endPoint: 100,
        markersList: ['0', '10', '20', '30', '40', '50', '60', '70', '80', '90', '100'],
        onCorrect: 4, // skip to Q4 (Q5 in plan)
        onIncorrect: 3,
    },
    // Q3: Place 73 on 0-100
    {
        target: 73, startPoint: 0, endPoint: 100,
        markersList: ['0', '10', '20', '30', '40', '50', '60', '70', '80', '90', '100'],
        onCorrect: 4,
        onIncorrect: { place: 2 },
    },
    // Q4: Place 0.5 on 0-1
    {
        target: 0.5, startPoint: 0, endPoint: 1,
        markersList: ['0', '0.1', '0.2', '0.3', '0.4', '0.5', '0.6', '0.7', '0.8', '0.9', '1'],
        onCorrect: 6, // skip to Q6 (Q7 in plan)
        onIncorrect: 5,
    },
    // Q5: Place 0.25 on 0-1
    {
        target: 0.25, startPoint: 0, endPoint: 1,
        markersList: ['0', '0.1', '0.2', '0.3', '0.4', '0.5', '0.6', '0.7', '0.8', '0.9', '1'],
        onCorrect: 6,
        onIncorrect: { place: 3 },
    },
    // Q6: Place 1/2 on 0-1 (fraction markers)
    {
        target: 0.5, startPoint: 0, endPoint: 1,
        markersList: ['0', '1/4', '1/2', '3/4', '1'],
        onCorrect: { place: 5 },
        onIncorrect: { place: 4 },
    },
];

export class DiagnosticScene extends BaseScene {
    private currentQuestionIdx: number = 0;
    private currentMarkers: Marker[] = [];
    private leftMarker: Marker | null = null;
    private rightMarker: Marker | null = null;
    private inputManager!: InputManager;
    private headerText!: Phaser.GameObjects.Text;
    private progressText!: Phaser.GameObjects.Text;
    private isWaiting: boolean = false;
    private totalQuestionsShown: number = 0;
    private maxQuestions: number = 7;

    constructor() {
        super('DiagnosticScene');
    }

    static _preload(scene: BaseScene): void {
        GameScreen._preload(scene);
    }

    preload(): void {
        DiagnosticScene._preload(this);
    }

    init(): void {
        this.currentQuestionIdx = 0;
        this.totalQuestionsShown = 0;
        this.isWaiting = false;
        document.body.style.cursor = 'default';
    }

    create(): void {
        // Background
        setSceneBackground('assets/images/background/bg_01.png');
        const bg = UIUtils.createCoverBackground(this, 'bg_01.png', false, false).setName('background');
        bg.setDepth(-2);

        this.add.rectangle(
            this.getScaledValue(this.display.width / 2),
            this.getScaledValue(this.display.height / 2),
            this.getScaledValue(this.display.width),
            this.getScaledValue(this.display.height),
            0x000000, 0.3,
        );

        // Header
        this.headerText = this.add.text(
            this.getScaledValue(this.display.width / 2),
            this.getScaledValue(60),
            "Let's see what you know!",
            {
                font: '700 36px Exo',
                color: '#ffffff',
                align: 'center',
            },
        ).setOrigin(0.5);

        // Progress text
        this.progressText = this.add.text(
            this.getScaledValue(this.display.width / 2),
            this.getScaledValue(105),
            '',
            {
                font: '500 22px Exo',
                color: '#cccccc',
                align: 'center',
            },
        ).setOrigin(0.5);

        // Skip button
        ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: buttonKeys.DEFAULT,
                hover: buttonKeys.HOVER,
                pressed: buttonKeys.PRESSED,
            },
            text: 'Skip',
            label: 'Skip diagnostic',
            textStyle: {
                font: '700 24px Exo',
                color: '#ffffff',
            },
            x: this.display.width - 120,
            y: this.display.height - 50,
            onClick: () => this.finishDiagnostic(0),
        });

        this.showQuestion();
    }

    private showQuestion(): void {
        const q = DIAGNOSTIC_QUESTIONS[this.currentQuestionIdx];
        this.totalQuestionsShown++;

        // Update progress
        this.progressText.setText(`Question ${this.totalQuestionsShown} of ~${this.maxQuestions}`);

        // Clean up old markers
        this.currentMarkers.forEach(m => {
            m.line?.destroy();
            m.text?.destroy();
        });
        this.currentMarkers = [];
        this.leftMarker?.line?.destroy();
        this.leftMarker?.text?.destroy();
        this.rightMarker?.line?.destroy();
        this.rightMarker?.text?.destroy();

        // Create number line
        const { markers, leftMarker, rightMarker } = UIUtils.createVerticalLinesWithNumbers(this, {
            ...GameScreenConfig.MARKER_LINES,
            fontFamily: fontKeys.EUROSTILE,
            markersList: q.markersList,
            visibleMarkers: [],
            startPoint: q.startPoint,
            endPoint: q.endPoint,
            showIntermediateNumbers: true,
            a11y: {
                enabled: true,
                onActivate: (x: number) => void this.handleClick(x),
            },
        });

        this.currentMarkers = markers;
        this.leftMarker = leftMarker;
        this.rightMarker = rightMarker;

        // Setup input manager
        if (leftMarker && rightMarker) {
            this.inputManager = new InputManager(
                this,
                leftMarker.line,
                rightMarker.line,
                q.startPoint,
                q.endPoint,
            );
            this.inputManager.setupCursorZone();
        }

        // Show target prompt
        const targetDisplay = typeof q.target === 'number' ? q.target.toString() : q.target;
        this.headerText.setText(`Place ${targetDisplay} on the number line`);

        this.isWaiting = true;

        // Also handle direct pointer clicks
        this.input.off('pointerdown');
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (!this.isWaiting) return;
            if (!this.inputManager.isInCursorZone(pointer)) return;
            void this.handleClick(pointer.x);
        });
    }

    private async handleClick(x: number): Promise<void> {
        if (!this.isWaiting) return;
        this.isWaiting = false;

        const q = DIAGNOSTIC_QUESTIONS[this.currentQuestionIdx];
        const clickedNumber = this.inputManager.calculateClickedNumber(x);
        const targetValue = parseFractionString(q.target.toString()) ?? 0;
        const startValue = parseFractionString(q.startPoint.toString()) ?? 0;
        const endValue = parseFractionString(q.endPoint.toString()) ?? 1;
        const range = endValue - startValue;
        const error = Math.abs(clickedNumber - targetValue) / range;

        const isCorrect = error <= HIT_THRESHOLD;

        // Brief visual feedback
        const feedbackColor = isCorrect ? 0x00ff00 : 0xff4444;
        const feedbackCircle = this.add.circle(
            x, this.getScaledValue(this.display.height / 2), 12, feedbackColor,
        ).setDepth(100);

        this.time.delayedCall(600, () => {
            feedbackCircle.destroy();
            const next = isCorrect ? q.onCorrect : q.onIncorrect;
            if (typeof next === 'object' && 'place' in next) {
                this.finishDiagnostic(next.place);
            } else {
                this.currentQuestionIdx = next;
                this.showQuestion();
            }
        });
    }

    private finishDiagnostic(placementLevel: number): void {
        islandState.setDiagnosticCompleted();

        // Mark all levels below placement as completed
        for (let i = 1; i <= placementLevel; i++) {
            islandState.addCompletedLevel('campaign', i);
        }

        // Transition to map
        this.scene.start('MapScene', {
            topic: 'campaign',
            completedLevels: islandState.getCompletedLevels('campaign'),
        });
    }
}
