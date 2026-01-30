import { BaseScene } from '../scenes/BaseScene';
import { GameScreenConfig as GameConfig } from '../config/GameScreenConfig';
import fractionsQuestions from '../../resources/QuesJson/fractions_questions.json';
import decimalsQuestions from '../../resources/QuesJson/decimals_questions.json';
import { Topic, TopicName, QuestionData, Level } from '../interfaces/gameplay';
import { GameStateManager } from './GameStateManager';
import mixedQuestions from '../../resources/QuesJson/mixed_questions.json';
import campaignQuestions from '../../resources/QuesJson/campaign_questions.json';
import { AnalyticsHelper, getQuestionBankByName, i18n, Question, QuestionBank, QuestionSelectorHelper, ScoreHelper } from '@k8-games/sdk';
import { topics as questionBankTopics } from '../../resources/topics.json';
import { DoorUtils } from '../utils/DoorUtils';
import { parseFractionString } from '../utils/parseFractionString';

export const topics: Record<TopicName, Topic> = {
    fractions: fractionsQuestions as Topic,
    decimals: decimalsQuestions,
    mixed: mixedQuestions,
    campaign: campaignQuestions as Topic,
};

export class GameplayManager {
    private scene: BaseScene;
    private targetNumber: number | null = null;
    public currentQuestionIdx: number = -1;
    private totalAttempts: number = 0;
    private totalPerfectHits: number = 0;
    private isWaitingForClick: boolean = false;
    private currentLevelIdx: number = 0;
    // private averageReactionTime: number = 0;
    private totalReactionTime: number = 0;
    private questionStartTime: number = 0;
    private gameStartTime: number = 0;
    private totalGameTime: number = 0;
    private isPaused: boolean = false;
    private currentTopic?: Topic;
    private topicName: string;
    private gameState: GameStateManager;
    private gameConfig: typeof GameConfig;
    public scoreHelper: ScoreHelper;
    private useQuestionBank: boolean;
    private questionBank?: QuestionBank;
    public questionSelector?: QuestionSelectorHelper;
    private currentQuestionData?: QuestionData;
    private currentQuestion?: Question;
    private totalQuestions: number;
    private firstQuestion?: Question;
    public closenessAccuracy: number = 0;
    public isGameComplete: boolean = false;
    private mapLevel: number = 0;
    public analyticsHelper: AnalyticsHelper | null = null;
    private hitThresholdOverride?: number;
    private nearMissThresholdOverride?: number;

    constructor(scene: BaseScene, useQuestionBank: boolean, topic: string, level?: number, questionSelector?: QuestionSelectorHelper, thresholdOverrides?: { hitThreshold?: number; nearMissThreshold?: number }) {
        this.scene = scene;
        this.topicName = topic;
        this.useQuestionBank = useQuestionBank;
        if (!useQuestionBank) {
            this.currentLevelIdx = level ?? 0;
            this.currentTopic = topics[topic as TopicName];
            this.totalQuestions = this.currentLevel!.questions.length;
        } else {
            this.mapLevel = level ?? 0;
            this.totalQuestions = 10;

            const questionBank = getQuestionBankByName(topic);
            if (!questionBank) {
                throw new Error('Question bank not found');
            }

            const totalLevels = questionBankTopics.find((t) => t.name === topic)?.levels?.length;
            const totalCsvQuestions = this.totalQuestions * 3;
            if (totalLevels) {
                if (this.mapLevel <= totalLevels && questionBank.questions.length >= this.mapLevel * totalCsvQuestions) {
                    this.questionBank = {
                        name: questionBank.name,
                        questions: questionBank.questions.slice((this.mapLevel - 1) * totalCsvQuestions, this.mapLevel * totalCsvQuestions),
                    };
                } else {
                    this.questionBank = questionBank;
                }
            } else {
                this.questionBank = questionBank;
            }

            this.firstQuestion = this.questionBank.questions[0];
            if (!questionSelector) {
                this.questionSelector = new QuestionSelectorHelper(this.questionBank, this.totalQuestions);
            } else {
                this.questionSelector = questionSelector;
            }
        }
        this.gameState = GameStateManager.getInstance();
        this.gameConfig = GameConfig;
        this.gameStartTime = scene.time.now;
        this.scoreHelper = new ScoreHelper(2);
        this.hitThresholdOverride = thresholdOverrides?.hitThreshold;
        this.nearMissThresholdOverride = thresholdOverrides?.nearMissThreshold;
    }

    get currentLevel(): Level | undefined {
        return this.currentTopic?.levels[this.currentLevelIdx];
    }

    private convertMarkersList(markersList: string): string[] {
        return markersList.split(',').map((marker) => marker.trim());
    }

    private createPrompt(question: Question): string {
        if (this.topicName === 'place_value') {
            return i18n.t('gameScreen.prompt', { place: question.operand1, number: question.operand2 });
        }
        if (this.topicName === 'percents') {
            if (this.mapLevel === 5) {
                return i18n.t('gameScreen.ofOperation', { percent: question.operand1, number: question.operand2 });
            }
            if (this.mapLevel === 2 || this.mapLevel === 3 || this.mapLevel === 4) {
                return i18n.t('gameScreen.place', { number: question.operand1 });
            }
        }
        if (this.topicName === 'understand_and_compare_decimals' && this.mapLevel !== 5) {
            return i18n.t('gameScreen.plot', { number: question.operand1 });
        }
        if (this.topicName === 'add_and_subtract_fractions' && this.mapLevel === 1) {
            return i18n.t('gameScreen.plot', { number: question.operand1 });
        }
        if (this.topicName === 'add_and_subtract_decimals' && this.mapLevel === 1) {
            const language = i18n.getLanguage() || 'en';
            return language === 'es' ? `${question['questionES']}` : `${question['questionEN']}`;
        }
        return `${question.operand1} ${question.operator ?? ''} ${question.operand2}`;
    }

    startNewRound(): QuestionData {
        this.currentQuestionIdx++;

        let question: Question | null;

        if (this.useQuestionBank) {
            question = this.questionSelector?.getNextQuestion() ?? null;
            if (!question || this.currentQuestionIdx >= this.totalQuestions) {
                this.endLevel();
                this.isGameComplete = true;
                return this.emptyQuestion();
            }

            this.currentQuestion = question;
            const formattedMarkersList = this.convertMarkersList(question.markersList);
            const visibleMarkers = question.visibleMarkers?.split(',').map((m: string) => m.trim()).filter(Boolean) ?? [];

            this.currentQuestionData = {
                questionPrompt: this.createPrompt(question),
                visibleMarkers,
                markersList: formattedMarkersList,
                startPoint: formattedMarkersList[0],
                endPoint: formattedMarkersList[formattedMarkersList.length - 1],
                shipLocation: parseFractionString(question.answer) ?? 0,
                csvQuestion: question,
            };

        } else {
            const questions = this.currentLevel!.questions;
            if (this.currentQuestionIdx >= questions.length) {
                this.endLevel();
                this.isGameComplete = true;
                return this.emptyQuestion();
            }

            this.currentQuestionData = questions[this.currentQuestionIdx];
        }

        this.targetNumber = parseFractionString(this.currentQuestionData.shipLocation) ?? 0;
        this.questionStartTime = this.scene.time.now;

        this.scene.time.delayedCall(this.gameConfig.GAME_LOGIC.TARGET_DISPLAY_TIME, () => {
            this.isWaitingForClick = true;
        });

        return this.currentQuestionData;
    }

    private emptyQuestion(): QuestionData {
        return {
            questionPrompt: '',
            markersList: [],
            startPoint: 0,
            endPoint: 0,
            shipLocation: 0,
            showFeedback: false,
        };
    }

    handleClick(clickedNumber: number): 'hit' | 'nearMiss' | 'miss' {
        this.isWaitingForClick = false;
        const currentQuestion = this.currentQuestionData!;
        const targetValue = parseFractionString(currentQuestion.shipLocation) ?? 0;
        const start = parseFractionString(currentQuestion.startPoint) ?? 0;
        const end = parseFractionString(currentQuestion.endPoint) ?? 0;
        const range = Math.abs(end - start);
        const difference = Math.abs(clickedNumber - targetValue);
        this.totalAttempts++;

        this.closenessAccuracy = Math.max(0, 100 - (difference / range) * 100);

        // Calculate reaction time
        const reactionTime = (this.scene.time.now - this.questionStartTime) / 1000;
        this.totalReactionTime += reactionTime;
        // this.averageReactionTime = this.totalReactionTime / this.totalAttempts;

        // For hit/miss determination, convert difference to relative scale
        const scaledDifference = difference / range;

        const hitThreshold = this.hitThresholdOverride ?? this.gameConfig.GAME_LOGIC.HIT_THRESHOLD;
        const nearMissThreshold = this.nearMissThresholdOverride ?? this.gameConfig.GAME_LOGIC.NEAR_MISS_THRESHOLD;

        if (scaledDifference <= hitThreshold) {
            this.totalPerfectHits++;
            this.handleTrialResult(true, clickedNumber.toString());
            this.questionSelector?.answerCorrectly();
            this.scoreHelper.answerCorrectly();
            return 'hit';
        } else if (scaledDifference <= nearMissThreshold) {
            this.handleTrialResult(false, clickedNumber.toString());
            this.scoreHelper.answerIncorrectly();
            this.questionSelector?.answerIncorrectly(this.currentQuestion!);
            return 'nearMiss';
        } else {
            this.handleTrialResult(false, clickedNumber.toString());
            this.scoreHelper.answerIncorrectly();
            this.questionSelector?.answerIncorrectly(this.currentQuestion!);
            return 'miss';
        }
    }

    private handleTrialResult(correct: boolean, studentResponse: string) {
        const q = this.getCurrentQuestion();
        const markersList = q.markersList;

        const optionsDisplay = markersList.map((marker) => ({
            option: marker.toString(),
            isCorrect: parseFractionString(marker) === parseFractionString(q.shipLocation)
        }));

        const studentResponseVal = Number(parseFloat(studentResponse).toFixed(4));

        const accuracyVal = this.closenessAccuracy.toFixed(2);

        let prompt = q.questionPrompt.trim();
        if (this.getMode() === 'typing') {
            prompt = `Robot spotted at: ${prompt}`;
        }

        this.analyticsHelper?.createTrial({
            questionMaxPoints: this.scoreHelper.getCurrentMultiplier() || 1,
            achievedPoints: correct ? (this.scoreHelper.getCurrentMultiplier() || 1) : 0,
            questionText: prompt,
            isCorrect: correct,
            questionMechanic: this.getMode(),
            gameLevelInfo: `game.robo_pirates.${this.getGameLevelName()}`,
            studentResponse: studentResponseVal.toString(),
            studentResponseAccuracyPercentage: accuracyVal + '%',
            optionsDisplay: optionsDisplay,
        });
    }

    handleTimeUp(): void {
        this.totalAttempts++;
        this.totalReactionTime += this.gameConfig.TIMER.DURATION;
        // this.averageReactionTime = this.totalReactionTime / this.totalAttempts;
        this.scoreHelper.answerIncorrectly();
        if (this.useQuestionBank) {
            this.questionSelector?.answerIncorrectly(this.currentQuestion!);
        }
    }

    private endLevel(): void {
        const totalQuestions = this.totalQuestions;
        const accuracy = this.scoreHelper.getAccuracy();
        const stars = this.calculateStars(accuracy, this.totalPerfectHits / totalQuestions);
        const score = this.scoreHelper.endGame();
        this.scoreHelper.setPlannedTotalQuestions(this.totalQuestions);

        if (!this.useQuestionBank) {
            this.gameState.updateLevelProgress(this.topicName as TopicName, this.currentLevelIdx, stars);
        }

        const doorUtils = new DoorUtils(this.scene);
        doorUtils.closeDoors(() => {
            this.scene.audioManager.unduckBackgroundMusic();
            this.scene.scene.start('ScoreBoardScene', {
                score: score,
                rounds: this.totalPerfectHits,
                totalRounds: this.totalQuestions,
                accuracy: accuracy,
                totalTime: Math.floor(this.totalGameTime),
                useQuestionBank: this.useQuestionBank,
                topicHeading: this.useQuestionBank
                    ? (questionBankTopics.find((t) => t.name === this.topicName)?.displayName as string)
                    : this.topicName,
                topic: this.topicName,
                ...(this.useQuestionBank ? { level: this.mapLevel } : { level: this.currentLevelIdx }),
            });
        }, false);
    }

    private calculateStars(accuracy: number, hitRatio: number): number {
        if (accuracy >= 90 && hitRatio >= 0.8) return 3;
        if (accuracy >= 75 && hitRatio >= 0.6) return 2;
        if (accuracy >= 60 && hitRatio >= 0.4) return 1;
        return 0;
    }

    resetGame() {
        // this.questionSelector?.reset();
        this.scoreHelper.reset();
    }

    isWaiting(): boolean {
        return this.isWaitingForClick;
    }

    getTargetNumber(): number | null {
        return this.targetNumber;
    }

    isLevelComplete(): boolean {
        return this.currentQuestionIdx >= this.totalQuestions;
    }

    getTotalPerfectHits(): number {
        return this.totalPerfectHits;
    }

    // getAverageAccuracy(): number {
    //     return this.scoreHelper.getAccuracy();
    // }

    getProgress(): number {
        if (this.useQuestionBank) {
            return (this.currentQuestionIdx + 1) / this.totalQuestions;
        }
        return (this.currentQuestionIdx + 1) / this.totalQuestions;
    }

    getMode(): 'typing' | 'clicking' {
        if (this.useQuestionBank) {
            if (this.topicName === 'place_value_magnitude' && this.mapLevel === 5) {
                return 'clicking';
            }
            if (this.topicName === 'explore_numbers_to_1000' && this.mapLevel === 3) {
                return 'typing';
            }
            if (this.topicName === 'understand_and_compare_decimals' && this.mapLevel === 3) {
                return 'typing';
            }
            if (this.topicName === 'percents' && this.mapLevel === 1) {
                return 'typing';
            }
            if (this.topicName === 'fractions_as_numbers' && this.mapLevel === 2) {
                return 'typing';
            }
            return (
                (questionBankTopics.find((t) => t.name === this.topicName)?.mode as 'typing' | 'clicking') || 'clicking'
            );
        }
        return this.currentLevel?.mode || 'clicking';
    }

    getGameLevelName(): string {
        if (this.useQuestionBank && this.mapLevel > 0) {
            const topicData = questionBankTopics.find((t) => t.name === this.topicName);
            if (topicData?.levels) {
                const levelIndex = this.mapLevel - 1;
                const levelName = topicData.levels[levelIndex].name;
                const formattedLevelName = levelName.replace(/\s+/g, '_');
                return formattedLevelName;
            }
        }
        return 'default';
    }

    getBgTexture(): string {
        const bgTextures = this.gameConfig.ASSETS.KEYS.IMAGE.BACKGROUND;
        const bgKey = this.currentLevel?.bgKey ?? 'BG_01';
        return bgTextures[bgKey as keyof typeof bgTextures] ?? bgTextures.BG_01;
    }

    getFirstQuestion(): QuestionData {
        if (this.useQuestionBank) {
            const formattedMarkersList = this.convertMarkersList(this.firstQuestion!.markersList);
            this.currentQuestion = this.firstQuestion;
            return {
                questionPrompt: this.createPrompt(this.firstQuestion!),
                markersList: formattedMarkersList,
                startPoint: formattedMarkersList[0],
                endPoint: formattedMarkersList[formattedMarkersList.length - 1],
                shipLocation: parseFractionString(this.firstQuestion!.answer) ?? 0,
                csvQuestion: this.firstQuestion,
            };
        } else {
            return this.currentLevel!.questions[0];
        }
    }

    getRandomQuestion(): QuestionData {
        if (this.useQuestionBank) {
            const question = this.questionBank?.questions[Math.floor(Math.random() * this.questionBank!.questions.length)];
            if (!question) {
                return this.emptyQuestion();
            }
            const formattedMarkersList = this.convertMarkersList(question.markersList);
            return {
                questionPrompt: this.createPrompt(question),
                markersList: formattedMarkersList,
                startPoint: formattedMarkersList[0],
                endPoint: formattedMarkersList[formattedMarkersList.length - 1],
                shipLocation: parseFractionString(question.answer) ?? 0,
            };
        } else {
            return this.currentLevel!.questions[Math.floor(Math.random() * this.currentLevel!.questions.length)];
        }
    }

    public isTutorialAvailable(): boolean {
        if (this.useQuestionBank) {
            const isTutorialTopic = questionBankTopics.find((t) => t.name === this.topicName)?.showTutorial ?? false;
            return isTutorialTopic;
        }
        return false;
    }

    public getCurrentTopic(): TopicName {
        return this.topicName as TopicName;
    }

    public getCurrentQuestion(): QuestionData {
        if (!this.currentQuestionData) {
            return this.emptyQuestion();
        }
        return this.currentQuestionData;
    }

    public getShowIntermediateNumbers(): boolean {
        if (this.useQuestionBank) {
            const question = this.currentQuestion;
            if (question && question.showIntermediateNumbers !== undefined) {
                const showIntermediateNumbers = question.showIntermediateNumbers === "true";
                return showIntermediateNumbers;
            }
            return (questionBankTopics.find((t) => t.name === this.topicName)?.showIntermediateNumbers as boolean) ?? true;
        }
        return true;
    }

    public pauseGame(): void {
        this.isPaused = true;
    }

    public resumeGame(): void {
        this.isPaused = false;
        this.gameStartTime = this.scene.time.now - this.totalGameTime * 1000;
    }

    public update(): void {
        if (!this.isPaused) {
            this.totalGameTime = (this.scene.time.now - this.gameStartTime) / 1000;
        }
    }
}

