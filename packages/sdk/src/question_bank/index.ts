// Define the structure of a question
export interface Question {
    operand1: string;
    operand2: string;
    answer: string;
    [key: string]: any;
}

// Define the structure of a question bank
export interface QuestionBank {
    name: string;
    questions: Question[];
}

// Import generated question banks
import { questionBanks } from './generated';

// Function to get a specific question bank by name
export function getQuestionBankByName(name: string): QuestionBank | undefined {
    return questionBanks.find(bank => bank.name === name);
}

// Function to get a sliced question bank based on level
export function getQuestionBankByLevel(name: string, level: number, questionsPerLevel: number = 30): QuestionBank | undefined {
    const questionBank = getQuestionBankByName(name);
    if (!questionBank) {
        return undefined;
    }

    // Calculate the start and end indices for the level
    const startIndex = (level - 1) * questionsPerLevel;
    const endIndex = level * questionsPerLevel;

    // Check if the level has enough questions
    if (startIndex >= questionBank.questions.length) {
        return undefined;
    }

    // Slice the questions for the specific level
    const levelQuestions = questionBank.questions.slice(startIndex, Math.min(endIndex, questionBank.questions.length));

    return {
        name: questionBank.name,
        questions: levelQuestions
    };
}

// Function to get a random question from a specific bank
export function getRandomQuestion(bankName: string): Question | undefined {
    const bank = getQuestionBankByName(bankName);
    if (!bank || bank.questions.length === 0) {
        return undefined;
    }

    const randomIndex = Math.floor(Math.random() * bank.questions.length);
    return bank.questions[randomIndex];
}

// Export question bank names
export { questionBankNames } from './generated';