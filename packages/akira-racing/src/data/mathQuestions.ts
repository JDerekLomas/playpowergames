import { questionBankNames, getRandomQuestion } from "@k8-games/sdk"

export interface MathQuestion {
    number: number;
    isCorrect: boolean;
}

export function generateDoubleDigitAddition(): [number, number] {
    const question = getRandomQuestion(questionBankNames.bank_2D_addition_upto_100);
    if (!question) {
        console.error(`No question found in question bank ${questionBankNames.bank_2D_addition_upto_100}`);
        return [0, 0];
    }
    return [parseInt(question.operand1), parseInt(question.operand2)];

}

export function generateAdditionSums(num1: number, num2: number, length: number): MathQuestion[] {
    const answers = [];

    answers.push({
        number: num1 + num2,
        isCorrect: true
    });

    const generatedNumbers = new Set<number>();

    // Generate incorrect equations with two-digit numbers
    while (answers.length < length) {
        const [a, b] = generateDoubleDigitAddition();

        // Only add if the answer is not equal to the target equation
        if (a + b !== num1 + num2 && !generatedNumbers.has(a + b)) {
            answers.push({
                number: a + b,
                isCorrect: false
            });
            generatedNumbers.add(a + b)
        }
    }

    // Shuffle the answers array
    for (let i = answers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [answers[i], answers[j]] = [answers[j], answers[i]];
    }

    return answers;
}