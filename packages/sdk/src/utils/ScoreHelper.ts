import { scormService } from '../service/ScormService';

export const SCORE_COUNTS = [3, 6, 10, 15, 20];

/**
 * ScoreHelper - A utility class for managing game scores, streaks, and combo multipliers
 * 
 * This class implements the scoring rules for math games:
 * - Base score: 1 unit/star per correct answer
 * - Streak bonus: base bonus * streak count (when streak ends)
 * - Combo multipliers: 3x, 5x, 7x for consecutive correct answers
 */
export class ScoreHelper {
    // Base score per correct answer
    private baseScore: number = 1;

    // Base bonus value for streak calculation
    private baseBonus: number;

    // Current streak count
    private currentStreak: number = 0;

    // Total score accumulated
    private totalScore: number = 0;

    // History of streaks
    private streakHistory: number[] = [];

    // Current combo multiplier
    private currentMultiplier: number = 1;

    // History of combo multipliers used
    private multiplierHistory: number[] = [];

    // Total questions answered
    private totalQuestions: number = 0;

    // Total correct answers
    private correctAnswers: number = 0;

    // Total incorrect answers
    private incorrectAnswers: number = 0;

    // Total possible score (theoretical maximum)
    private totalPossibleScore: number = 0;

    // Total number of questions planned for the game (if known)
    private plannedTotalQuestions: number | null = null;

    /**
     * Creates a new ScoreHelper instance
     * @param baseBonus - The base bonus value used for streak calculations
     */
    constructor(baseBonus: number = 1) {
        this.baseBonus = baseBonus;
    }

    /**
     * Records a correct answer and updates scores, streaks, and multipliers
     * @returns The score earned for this answer
     */
    public answerCorrectly(): number {
        this.totalQuestions++;
        this.correctAnswers++;

        // Increment streak
        this.currentStreak++;

        // Calculate score with current multiplier
        const scoreEarned = this.baseScore * this.currentMultiplier;
        this.totalScore += scoreEarned;

        // Update multiplier based on streak
        this.updateMultiplier();

        // Update SCORM score
        this.updateScormScore();

        return scoreEarned;
    }

    public showStreakAnimation(): boolean {
        const streak = this.currentStreak;
        return SCORE_COUNTS.includes(streak);
    }

    /**
     * Records an incorrect answer and resets streak and multiplier
     */
    public answerIncorrectly(): void {
        this.totalQuestions++;
        this.incorrectAnswers++;

        // If there was an active streak, add it to history and calculate bonus
        if (this.currentStreak >= 3) {
            this.streakHistory.push(this.currentStreak);
            const streakBonus = this.baseBonus * this.currentStreak;
            this.totalScore += streakBonus;
        }

        // Reset streak and multiplier
        this.currentStreak = 0;
        this.currentMultiplier = 1;

        // Update SCORM score after potential streak bonus
        this.updateScormScore();
    }

    /**
     * Updates the combo multiplier based on the current streak
     */
    private updateMultiplier(): void {
        let newMultiplier = 1;

        if (this.currentStreak >= 7) {
            newMultiplier = 7;
        } else if (this.currentStreak >= 5) {
            newMultiplier = 5;
        } else if (this.currentStreak >= 3) {
            newMultiplier = 3;
        }

        // If multiplier changed, add to history
        if (newMultiplier !== this.currentMultiplier) {
            this.multiplierHistory.push(newMultiplier);
            this.currentMultiplier = newMultiplier;
        }
    }

    /**
     * Ends the current game and finalizes scores
     * @returns The final total score
     */
    public endGame(): number {
        // If there's an active streak, add it to history and calculate bonus
        if (this.currentStreak > 0) {
            this.streakHistory.push(this.currentStreak);
            const streakBonus = this.baseBonus * this.currentStreak;
            this.totalScore += streakBonus;
        }

        // Final SCORM score update
        this.updateScormScore(true);

        return this.totalScore;
    }

    /**
     * Gets the current streak count
     */
    public getCurrentStreak(): number {
        return this.currentStreak;
    }

    /**
     * Gets the current combo multiplier
     */
    public getCurrentMultiplier(): number {
        return this.currentMultiplier;
    }

    /**
     * Gets the total score accumulated so far
     */
    public getTotalScore(): number {
        return this.totalScore;
    }

    /**
     * Gets the history of all streaks
     */
    public getStreakHistory(): number[] {
        return [...this.streakHistory];
    }

    /**
     * Gets the history of all multipliers used
     */
    public getMultiplierHistory(): number[] {
        return [...this.multiplierHistory];
    }

    /**
     * Gets the total number of questions answered
     */
    public getTotalQuestions(): number {
        return this.totalQuestions;
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
     * Gets the accuracy percentage
     */
    public getAccuracy(): number {
        if (this.totalQuestions === 0) return 0;
        return (this.correctAnswers / this.totalQuestions) * 100;
    }

    /**
     * Gets the longest streak achieved
     */
    public getLongestStreak(): number {
        if (this.streakHistory.length === 0) return this.currentStreak;
        return Math.max(...this.streakHistory, this.currentStreak);
    }

    /**
     * Gets the total possible score (theoretical maximum)
     */
    public getTotalPossibleScore(): number {
        return this.totalPossibleScore;
    }

    /**
     * Sets the planned total number of questions for the game
     * This helps calculate a more accurate total possible score
     * @param totalQuestions - The planned total number of questions
     */
    public setPlannedTotalQuestions(totalQuestions: number): void {
        this.plannedTotalQuestions = totalQuestions;
        this.updateTotalPossibleScore();
    }

    /**
     * Gets the planned total number of questions
     */
    public getPlannedTotalQuestions(): number | null {
        return this.plannedTotalQuestions;
    }

    /**
     * Calculates the theoretical maximum score for a given number of questions
     * Assumes all answers are correct and optimal multiplier usage
     * @param totalQuestions - The total number of questions
     * @returns The theoretical maximum score
     */
    public calculateMaximumScore(totalQuestions: number): number {
        if (totalQuestions <= 0) return 0;

        let maxScore = 0;
        
        // Calculate score for each question with optimal multipliers
        for (let i = 0; i < totalQuestions; i++) {
            let multiplier = 1;
            
            if (i >= 7) {
                multiplier = 7;
            } else if (i >= 5) {
                multiplier = 5;
            } else if (i >= 3) {
                multiplier = 3;
            }
            
            maxScore += this.baseScore * multiplier;
        }
        
        // Add streak bonus for the entire game (assuming all correct)
        const streakBonus = this.baseBonus * totalQuestions;
        maxScore += streakBonus;
        
        return maxScore;
    }

    /**
     * Updates the total possible score based on current game state
     * @private
     */
    private updateTotalPossibleScore(): void {
        if (this.plannedTotalQuestions !== null) {
            // If we know the total questions, calculate based on that
            this.totalPossibleScore = this.calculateMaximumScore(this.plannedTotalQuestions);
        } else {
            // Otherwise, calculate based on current questions answered
            // This assumes the game could continue optimally from current state
            const remainingOptimalScore = this.calculateRemainingOptimalScore();
            this.totalPossibleScore = this.totalScore + remainingOptimalScore;
        }
    }

    /**
     * Calculates the remaining optimal score if all future answers are correct
     * @private
     */
    private calculateRemainingOptimalScore(): number {
        // This is a basic calculation - in practice, you might want to set
        // plannedTotalQuestions for more accurate results
        return 0; // Without knowing future questions, we can't calculate remaining optimal score
    }

    /**
     * Resets all scores and statistics
     */
    public reset(): void {
        this.currentStreak = 0;
        this.totalScore = 0;
        this.streakHistory = [];
        this.currentMultiplier = 1;
        this.multiplierHistory = [];
        this.totalQuestions = 0;
        this.correctAnswers = 0;
        this.incorrectAnswers = 0;
        this.totalPossibleScore = 0;
        this.plannedTotalQuestions = null;

        // Reset SCORM score
        this.updateScormScore();
    }

    /**
     * Sets a new base bonus value
     * @param baseBonus - The new base bonus value
     */
    public setBaseBonus(baseBonus: number): void {
        this.baseBonus = baseBonus;
    }

    /**
     * Sets a new base score value
     * @param baseScore - The new base score value
     */
    public setBaseScore(baseScore: number): void {
        this.baseScore = baseScore;
    }

    /**
     * Updates the SCORM score if SCORM is enabled
     * @private
     */
    private updateScormScore(isEndGame: boolean = false): void {
        try {
            scormService.setScore(this.totalScore, 0, isEndGame ? this.totalPossibleScore : undefined);
            if (isEndGame) {
                const isMastery = Math.round((this.totalScore / this.totalPossibleScore) * 100) > 70;
                scormService.setStatus(isMastery ? 'passed' : 'failed');
            }
        } catch (error) {
            console.warn('Failed to update SCORM score:', error);
        }
    }
}
