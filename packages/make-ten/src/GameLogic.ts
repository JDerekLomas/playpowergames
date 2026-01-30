import {
    ScoreHelper,
    SCORE_COUNTS,
    QuestionBank,
    getQuestionBankByName,
    Question,
    QuestionSelectorHelper,
    GameConfigManager,
    AnalyticsHelper,
} from "@k8-games/sdk";
import { MultiverseQuestionSelector, type MathFact, type StudentResponse } from "@k8-games/sdk/multiverse";
import { MULTIVERSE_TOPICS } from "./config/CommonConfig";

export class GameLogic {
    private firstNumber: number;
    private secondNumber: number | null;
    public scoreHelper: ScoreHelper;
    private questionSelector: QuestionSelectorHelper;
    private readonly maxRounds: number;
    private correctAnswers: number = 0;
    private currentQuestion: Question | null = null;
    private questionBank?: QuestionBank;
    private mode: string;
    public analyticsHelper: AnalyticsHelper | null = null;

    // Multiverse mode state
    private multiverseQuestionSelector: MultiverseQuestionSelector | null = null;
    private multiverseQuestion: MathFact | null = null;
    private lastStudentResponse: StudentResponse | null = null;
    private totalQuestionsAnswered: number = 0;
    private startTime: number = 0;

    constructor(firstNumber?: number, maxRounds: number = 20) {
        this.scoreHelper = new ScoreHelper(2); // Initialize with base bonus of 2
        this.maxRounds = maxRounds;
        const gameConfigManager = GameConfigManager.getInstance();
        this.mode = gameConfigManager.get('mode') || 'make_ten';
        
        if (this.mode === 'make_20') {
            this.multiverseQuestionSelector = new MultiverseQuestionSelector(['MAKE_20_FACTS']);
            this.questionSelector = (null as unknown as QuestionSelectorHelper);
        } else {
            this.questionBank = getQuestionBankByName('make_ten');
            if (!this.questionBank) {
                throw new Error("Question bank not found");
            }
            this.questionSelector = new QuestionSelectorHelper(this.questionBank, this.maxRounds);
        }

        if (firstNumber) {
            this.firstNumber = firstNumber;
            this.secondNumber = null;
            this.currentQuestion = {
                operand1: firstNumber.toString(),
                operand2: "",
                answer: ((this.mode === 'make_20' ? 20 : 10) - firstNumber).toString(),
                position: "rhs"
            };
            return;
        }
    }

    private getNextQuestion(): Question {
        if (this.mode === 'make_20') {
            const selector = this.multiverseQuestionSelector!;
            const fact = this.lastStudentResponse
                ? selector.getNextQuestion(this.lastStudentResponse)
                : selector.getNextQuestion();
            this.lastStudentResponse = null;
            if (!fact || this.getCurrentRound() >= this.maxRounds) {
                throw new Error("No more questions available");
            }
            this.multiverseQuestion = fact;
            
            const parsed = this.extractEquation(fact["question text"]);
            const a = parseInt(parsed.operand1);
            
            const expectedAnswer = parseInt(parsed.answer) - a;
            const q: Question = {
                operand1: String(a),
                operand2: "",
                operator: "+",
                answer: String(expectedAnswer),
                position: "lhs",
            } as Question;
            this.currentQuestion = q;
            this.startTime = Date.now();
            return q;
        }

        const question = this.questionSelector.getNextQuestion();
        if (!question || this.getCurrentRound() >= this.maxRounds) {
            throw new Error("No more questions available");
        }
        this.currentQuestion = question;
        return this.currentQuestion;
    }

    private extractEquation(questionText: string): { operand1: string; operand2: string; operator: string; answer: string } {
        const operator = '+';
        const [left, answer] = questionText.split('=').map(s => s.trim());
        if (!left || answer === undefined) throw new Error('Invalid question format');
        const [operand1, operand2] = left.split(operator).map(s => s.trim());
        if (operand1 === undefined || operand2 === undefined) throw new Error('Invalid operands');
        return { operand1, operand2, operator, answer };
    }

    public getFirstNumber(): number {
        return this.firstNumber;
    }

    public getSecondNumber(): number | null {
        return this.secondNumber;
    }

    public getCurrentQuestion(): Question {
        return this.currentQuestion as Question;
    }

    public setSecondNumber(number: number): void {
        this.secondNumber = number;
    }

    public getCurrentSum(): number {
        return this.firstNumber + (this.secondNumber || 0);
    }

    public isCorrect(): boolean {
        const question = this.getCurrentQuestion();
        const expectedAnswer = parseInt(question.answer);
        return this.secondNumber === expectedAnswer;
    }

    public getFilledCirclesCount(): number {
        return this.firstNumber + (this.secondNumber || 0);
    }

    public getCurrentRound(): number {
        if (this.mode === 'make_20') {
            return this.totalQuestionsAnswered;
        }
        return this.questionSelector.getTotalQuestionsAnswered();
    }

    public getMaxRounds(): number {
        return this.maxRounds;
    }

    public isGameComplete(): boolean {
        const isComplete = (this.mode === 'make_20' ? this.getCurrentRound() >= this.maxRounds : this.questionSelector.isGameCompleted() || this.getCurrentRound() >= this.maxRounds);
        if (isComplete) {
            this.scoreHelper.setPlannedTotalQuestions(this.maxRounds);
            this.scoreHelper.endGame();
        }
        return isComplete;
    }

    private handleTrialResult(correct: boolean, questionText: string) {
        const gameConfigManager = GameConfigManager.getInstance();
        const topic = gameConfigManager.get('topic') || 'make_ten';

        let gameLevelInfo = '';
        if (MULTIVERSE_TOPICS.includes(topic)) {
            gameLevelInfo = this.mode === 'make_20' ? 'game.multiverse.make_20' : 'game.multiverse.make_10';
        } else {
            gameLevelInfo = 'game.make_10.default';
        }
        this.analyticsHelper?.createTrial({
            questionMaxPoints: this.scoreHelper.getCurrentMultiplier() || 1,
            achievedPoints: correct ? (this.scoreHelper.getCurrentMultiplier() || 1) : 0,
            questionText: questionText,
            isCorrect: correct,
            questionMechanic: 'default',
            gameLevelInfo: gameLevelInfo,
            studentResponse: this.secondNumber?.toString() || '',
            studentResponseAccuracyPercentage: correct ? '100%' : '0%',
        });
    }

    public submitAnswer(): boolean {
        const correct = this.isCorrect();
        const endTime = Date.now();

        let questionText = '';
        if (this.currentQuestion) {
            const target = this.mode === 'make_20' ? 20 : 10;
            if (this.currentQuestion.position === 'lhs') {
                if (this.currentQuestion.operand1 === "") {
                    questionText = `? + ${this.firstNumber} = ${target}`;
                } else {
                    questionText = `${this.firstNumber} + ? = ${target}`;
                }
            } else {
                if (this.currentQuestion.operand1 === "") {
                    questionText = `${target} = ? + ${this.firstNumber}`;
                } else {
                    questionText = `${target} = ${this.firstNumber} + ?`;
                }
            }
        }

        if (this.mode === 'make_20') {
            if (this.multiverseQuestionSelector && this.multiverseQuestion) {
                this.lastStudentResponse = this.multiverseQuestionSelector.createStudentResponse(
                    this.multiverseQuestion,
                    Math.max(0, endTime - this.startTime),
                    correct
                );
            }
            this.totalQuestionsAnswered += 1;
            if (correct) {
                this.handleTrialResult(correct, questionText);
                this.scoreHelper.answerCorrectly();
                this.correctAnswers++;
            } else {
                this.handleTrialResult(correct, questionText);
                this.scoreHelper.answerIncorrectly();
                this.secondNumber = null;
            }
        } else {
            if (correct) {
                this.handleTrialResult(correct, questionText);
                this.questionSelector.answerCorrectly();
                this.scoreHelper.answerCorrectly();
                this.correctAnswers++;
            } else {
                this.handleTrialResult(correct, questionText);
                this.questionSelector.answerIncorrectly(this.currentQuestion!);
                this.scoreHelper.answerIncorrectly();
                this.secondNumber = null;
            }
        }
        return correct;
    }

    public wizardHappy(): boolean {
        return SCORE_COUNTS.includes(this.scoreHelper.getCurrentStreak());
    }

    public setQuestion(): void {
        const question = this.getNextQuestion();
        this.firstNumber = question.operand1 != "" ? parseInt(question.operand1) : parseInt(question.operand2);
        this.secondNumber = null;
    }

    public resetGame(): void {
        if (this.mode === 'make_20') {
            this.multiverseQuestionSelector?.reset();
            this.totalQuestionsAnswered = 0;
        } else {
            this.questionSelector.reset(true);
        }
        this.scoreHelper.reset();
        this.correctAnswers = 0;
        this.setQuestion();
    }

    public getCircleState(index: number): { color?: number; symbol?: string } {
        const sum = this.firstNumber + (this.secondNumber || 0);

        if (index < this.firstNumber) {
            return { color: 0xffd400 };
        }

        if (this.secondNumber && index < sum) {
            if (this.isCorrect()) {
                return { color: 0x00b956, symbol: "checkmark" };
            }
            return { color: 0xff0000, symbol: "cross" };
        }

        return {};
    }
}
