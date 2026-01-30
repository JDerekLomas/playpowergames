import { QuestionBank } from "../question_bank";

/**
 * Interface for a question in the question bank
 */
interface Question {
    operand1: string;
    operand2: string;
    answer: string;
    [key: string]: any; // Allow for additional properties
}

/**
 * QuestionSelectorHelper - A utility class for selecting questions from a question bank
 *
 * This class implements the question selection algorithm:
 * - Tracks correct and incorrect answers
 * - Maintains a repeat pool for incorrectly answered questions
 * - Selects questions based on the algorithm rules
 * - Handles edge cases like infinite wrong answers
 */
export class QuestionSelectorHelper {
    // The question bank to select questions from
    private questionBank: QuestionBank;

    // The number of correct answers required to complete the game
    private requiredCorrectAnswers: number;

    // The maximum number of questions that can be asked
    private maxQuestions: number;

    // The pool of questions to select from
    private questionPool: Question[] = [];

    // Questions that were answered incorrectly
    private repeatPool: Question[] = [];

    // Questions that were answered incorrectly from the repeat pool
    private playAgainPool: Question[] = [];

    // Total questions answered
    private totalQuestionsAnswered: number = 0;

    // Total correct answers
    private correctAnswers: number = 0;

    // Total incorrect answers
    private incorrectAnswers: number = 0;

    // Counter for questions answered since last repeat pool check
    private questionsSinceLastRepeatPoolCheck: number = 0;

    // Flag to indicate if the game is over
    private isGameOver: boolean = false;

    // Counter to track which set of questions we're currently on
    private currentSetCounter: number = 1;

    /**
     * Creates a new QuestionSelectorHelper instance
     * @param questionBank - The question bank to select questions from
     * @param requiredCorrectAnswers - The number of correct answers required to complete the game
     */
    constructor(questionBank: QuestionBank, requiredCorrectAnswers: number) {
        this.questionBank = questionBank;
        this.requiredCorrectAnswers = requiredCorrectAnswers;

        // The maximum number of questions is the number of correct answers
        this.maxQuestions = requiredCorrectAnswers;

        // Initialize the question pool with all questions from the bank, excluding play again pool questions
        this.questionPool = [...questionBank.questions];
    }

    /**
     * Filters out questions that are already in the play again pool
     * @param questions - Array of questions to filter
     * @returns Filtered array of questions
     */
    private filterOutPlayAgainQuestions(questions: Question[]): Question[] {
        return questions.filter((question) => {
            return !this.playAgainPool.some(
                (playAgainQuestion) =>
                    playAgainQuestion.operand1 === question.operand1 &&
                    playAgainQuestion.operand2 === question.operand2 &&
                    playAgainQuestion.answer === question.answer
            );
        });
    }

    /**
     * Gets the next question based on the selection algorithm
     * @returns The next question to ask, or null if the game is over
     */
    public getNextQuestion(): Question | null {
        // Check if the game is over
        if (this.isGameOver) {
            return null;
        }

        // Check if we've reached the maximum number of questions
        if (this.totalQuestionsAnswered >= this.maxQuestions) {
            this.isGameOver = true;
            return null;
        }

        // Check if we've reached the required number of correct answers
        if (this.correctAnswers >= this.requiredCorrectAnswers) {
            this.isGameOver = true;
            return null;
        }

        // Check if we need to select a question from the repeat pool (after every 2 questions)
        if (
            this.questionsSinceLastRepeatPoolCheck >= 3 &&
            this.repeatPool.length > 0
        ) {
            // Get the first question from the repeat pool
            const question = this.repeatPool[0];
            // Mark this question as being from repeat pool
            question.fromRepeatPool = true;
            this.questionsSinceLastRepeatPoolCheck = 0;

            return question;
        }

        // If the question pool is empty but repeat pool has questions, continue with repeat pool
        if (this.questionPool.length === 0 && this.repeatPool.length > 0) {
            // Get the first question from the repeat pool
            const question = this.repeatPool[0];
            // Mark this question as being from repeat pool
            question.fromRepeatPool = true;

            return question;
        }

        // If both pools are empty, end the game
        if (this.questionPool.length === 0 && this.repeatPool.length === 0) {
            this.isGameOver = true;
            return null;
        }

        // Get the first question from the question pool
        const question = this.questionPool[0];
        // Mark this question as not being from repeat pool
        question.fromRepeatPool = false;

        // Remove the question from the question pool
        this.questionPool.shift();

        return question;
    }

    /**
     * Records a correct answer
     * @param question - The question that was answered correctly
     */
    public answerCorrectly(): void {
        this.totalQuestionsAnswered++;
        this.correctAnswers++;
        if (this.repeatPool.length > 0) {
            this.questionsSinceLastRepeatPoolCheck++;
        }

        // If the question was from repeat pool, remove it now
        if (this.repeatPool.length > 0 && this.repeatPool[0].fromRepeatPool) {
            this.repeatPool.shift();
        }
    }

    /**
     * Records an incorrect answer
     * @param question - The question that was answered incorrectly
     */
    public answerIncorrectly(question: Question): void {
        this.totalQuestionsAnswered++;
        this.incorrectAnswers++;

        // Check if the question is in the repeat pool
        const repeatPoolIndex = this.repeatPool.findIndex(
            (q) =>
                q.operand1 === question.operand1 &&
                q.operand2 === question.operand2 &&
                q.answer === question.answer
        );

        if (repeatPoolIndex !== -1) {
            const removedQuestion = this.repeatPool.splice(
                repeatPoolIndex,
                1
            )[0];
            const playAgainQuestion = {
                ...removedQuestion,
                fromRepeatPool: false,
            };
            this.playAgainPool.push(playAgainQuestion);
        } else {
            // Add the question to the repeat pool
            this.repeatPool.push(question);
        }

        if (this.repeatPool.length > 0) {
            this.questionsSinceLastRepeatPoolCheck++;
        }
    }

    /**
     * Gets the total number of questions answered
     */
    public getTotalQuestionsAnswered(): number {
        return this.totalQuestionsAnswered;
    }

    /**
     * Gets the number of correct answers
     */
    public getCorrectAnswers(): number {
        return this.correctAnswers;
    }

    /**
     * Gets the number of incorrect answers
     */
    public getIncorrectAnswers(): number {
        return this.incorrectAnswers;
    }

    /**
     * Gets the number of questions remaining in the question pool
     */
    public getQuestionsRemaining(): number {
        return this.questionPool.length;
    }

    /**
     * Gets the number of questions in the repeat pool
     */
    public getRepeatPoolSize(): number {
        return this.repeatPool.length;
    }

    /**
     * Gets the number of questions in the play-again pool
     */
    public getPlayAgainPoolSize(): number {
        return this.playAgainPool.length;
    }

    /**
     * Gets the number of correct answers required to complete the game
     */
    public getRequiredCorrectAnswers(): number {
        return this.requiredCorrectAnswers;
    }

    /**
     * Gets the maximum number of questions that can be asked
     */
    public getMaxQuestions(): number {
        return this.maxQuestions;
    }

    /**
     * Gets whether the game is over
     */
    public isGameCompleted(): boolean {
        return this.isGameOver;
    }

    /**
     * Gets whether the game was completed successfully
     */
    public wasGameSuccessful(): boolean {
        return (
            this.isGameOver &&
            this.correctAnswers >= this.requiredCorrectAnswers
        );
    }

    /**
     * Resets the game state
     * @param isPlayAgain - Whether this is a play-again reset
     */
    public reset(isPlayAgain: boolean = false): void {
        // Reset the question pool first
        this.questionPool = [];

        if (isPlayAgain && this.playAgainPool.length > 0) {
            // Move questions from play-again pool to main pool (keeping their order)
            this.questionPool = [...this.playAgainPool];

            // Calculate how many more questions we need from the question bank
            const remainingQuestions =
                this.maxQuestions - this.questionPool.length;

            if (remainingQuestions > 0) {
                // Get questions from the bank, excluding play again pool questions
                const bankQuestions = [...this.questionBank.questions];

                // Calculate start and end indices for the next set of questions
                const startIndex =
                    this.currentSetCounter * this.requiredCorrectAnswers;
                const endIndex = startIndex + remainingQuestions;

                // Check if we have enough questions for a complete set
                if (endIndex > bankQuestions.length) {
                    // Reset counter and start from the beginning
                    this.currentSetCounter = 0;
                    const newStartIndex = 0;
                    const newEndIndex = this.requiredCorrectAnswers;
                    const nextSetQuestions = bankQuestions.slice(
                        newStartIndex,
                        newEndIndex
                    );
                    const additionalQuestions = nextSetQuestions.slice(
                        0,
                        remainingQuestions
                    );
                    this.questionPool.push(...additionalQuestions);
                } else {
                    // Get questions from the next set
                    const nextSetQuestions = bankQuestions.slice(
                        startIndex,
                        endIndex
                    );
                    // Take only the number we need from the next set
                    const additionalQuestions = nextSetQuestions.slice(
                        0,
                        remainingQuestions
                    );
                    // Add them to the question pool after the play-again questions
                    this.questionPool.push(...additionalQuestions);
                }

                // Increment the set counter for next time
                this.currentSetCounter++;
            }
            this.playAgainPool = [];
        } else {
            // Normal reset - use first set of questions from question bank
            const startIndex =
                this.currentSetCounter * this.requiredCorrectAnswers;
            const endIndex = startIndex + this.requiredCorrectAnswers;

            // Check if we have enough questions for a complete set
            if (endIndex > this.questionBank.questions.length) {
                // Reset counter and start from the beginning
                this.currentSetCounter = 0;
                this.questionPool = [...this.questionBank.questions].slice(
                    0,
                    this.requiredCorrectAnswers
                );
            } else {
                this.questionPool = [...this.questionBank.questions].slice(
                    startIndex,
                    endIndex
                );
            }
            this.currentSetCounter++;
        }

        this.repeatPool = [];
        this.totalQuestionsAnswered = 0;
        this.correctAnswers = 0;
        this.incorrectAnswers = 0;
        this.questionsSinceLastRepeatPoolCheck = 0;
        this.isGameOver = false;
    }

    /**
     * Gets whether there are questions available for play-again
     */
    public hasPlayAgainQuestions(): boolean {
        const hasQuestions = this.playAgainPool.length > 0;
        return hasQuestions;
    }

    /**
     * Gets the number of questions available for play-again
     */
    public getPlayAgainQuestionsCount(): number {
        return this.playAgainPool.length;
    }

    /**
     * Shuffles an array using the Fisher-Yates algorithm
     * @param array - The array to shuffle
     */
    private shuffleArray<T>(array: T[]): void {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}
