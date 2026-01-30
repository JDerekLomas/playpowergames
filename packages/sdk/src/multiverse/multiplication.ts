// Multiplication fact generators

export type MultiplicationQuestionType =
  | 'multiply_by_0'
  | 'multiply_by_1'
  | 'multiply_by_2'
  | 'multiply_by_3'
  | 'multiply_by_4'
  | 'multiply_by_5'
  | 'multiply_by_6'
  | 'multiply_by_7'
  | 'multiply_by_8'
  | 'multiply_by_9'
  | 'multiply_by_10'
  | 'square_numbers'
  | 'multiples_of_10'
  | 'one_digit_times_two_digit'
  | 'two_digit_times_two_digit';

export interface MultiplicationQuestion {
  operand1: number;
  operand2: number;
  answer: number;
  type: MultiplicationQuestionType;
}

export interface MultiplicationTopicDescriptor {
  key: MultiplicationQuestionType;
  label: string;
  limited: boolean;
}

function createQuestion(
  operand1: number,
  operand2: number,
  type: MultiplicationQuestionType
): MultiplicationQuestion {
  return { operand1, operand2, answer: operand1 * operand2, type };
}

// Limited question sets

export function generateMultiplyByZeroFacts(): MultiplicationQuestion[] {
  const type: MultiplicationQuestionType = 'multiply_by_0';
  const questions: MultiplicationQuestion[] = [];
  for (let n = 0; n <= 9; n++) {
    questions.push(createQuestion(0, n, type));
  }
  return questions;
}

export function generateMultiplyByOneFacts(): MultiplicationQuestion[] {
  const type: MultiplicationQuestionType = 'multiply_by_1';
  const questions: MultiplicationQuestion[] = [];
  for (let n = 1; n <= 9; n++) {
    questions.push(createQuestion(1, n, type));
  }
  return questions;
}

export function generateMultiplyByTwoFacts(): MultiplicationQuestion[] {
  const type: MultiplicationQuestionType = 'multiply_by_2';
  const questions: MultiplicationQuestion[] = [];
  for (let n = 1; n <= 9; n++) {
    questions.push(createQuestion(2, n, type));
  }
  return questions;
}

export function generateMultiplyByThreeFacts(): MultiplicationQuestion[] {
  const type: MultiplicationQuestionType = 'multiply_by_3';
  const questions: MultiplicationQuestion[] = [];
  for (let n = 1; n <= 9; n++) {
    questions.push(createQuestion(3, n, type));
  }
  return questions;
}

export function generateMultiplyByFourFacts(): MultiplicationQuestion[] {
  const type: MultiplicationQuestionType = 'multiply_by_4';
  const questions: MultiplicationQuestion[] = [];
  for (let n = 1; n <= 9; n++) {
    questions.push(createQuestion(4, n, type));
  }
  return questions;
}

export function generateMultiplyByFiveFacts(): MultiplicationQuestion[] {
  const type: MultiplicationQuestionType = 'multiply_by_5';
  const questions: MultiplicationQuestion[] = [];
  for (let n = 1; n <= 9; n++) {
    questions.push(createQuestion(5, n, type));
  }
  return questions;
}

export function generateMultiplyBySixFacts(): MultiplicationQuestion[] {
  const type: MultiplicationQuestionType = 'multiply_by_6';
  const questions: MultiplicationQuestion[] = [];
  for (let n = 1; n <= 9; n++) {
    questions.push(createQuestion(6, n, type));
  }
  return questions;
}

export function generateMultiplyBySevenFacts(): MultiplicationQuestion[] {
  const type: MultiplicationQuestionType = 'multiply_by_7';
  const questions: MultiplicationQuestion[] = [];
  for (let n = 1; n <= 9; n++) {
    questions.push(createQuestion(7, n, type));
  }
  return questions;
}

export function generateMultiplyByEightFacts(): MultiplicationQuestion[] {
  const type: MultiplicationQuestionType = 'multiply_by_8';
  const questions: MultiplicationQuestion[] = [];
  for (let n = 1; n <= 9; n++) {
    questions.push(createQuestion(8, n, type));
  }
  return questions;
}

export function generateMultiplyByNineFacts(): MultiplicationQuestion[] {
  const type: MultiplicationQuestionType = 'multiply_by_9';
  const questions: MultiplicationQuestion[] = [];
  for (let n = 1; n <= 9; n++) {
    questions.push(createQuestion(9, n, type));
  }
  return questions;
}

export function generateMultiplyByTenFacts(): MultiplicationQuestion[] {
  const type: MultiplicationQuestionType = 'multiply_by_10';
  const questions: MultiplicationQuestion[] = [];
  for (let n = 1; n <= 9; n++) {
    questions.push(createQuestion(10, n, type));
  }
  return questions;
}

export function generateSquareNumbers(): MultiplicationQuestion[] {
  const type: MultiplicationQuestionType = 'square_numbers';
  const questions: MultiplicationQuestion[] = [];
  for (let n = 1; n <= 9; n++) {
    questions.push(createQuestion(n, n, type));
  }
  return questions;
}

// Infinite generators (return a single random question)

export function generateMultiplesOfTenProduct(): MultiplicationQuestion {
  const type: MultiplicationQuestionType = 'multiples_of_10';
  const tens: number[] = Array.from({ length: 9 }, (_, i) => (i + 1) * 10); // 10..90
  const a = tens[Math.floor(Math.random() * tens.length)];
  let b = tens[Math.floor(Math.random() * tens.length)];
  if (b === a) {
    b = tens[(tens.indexOf(a) + 1) % tens.length];
  }
  return createQuestion(a, b, type);
}

export function generateOneDigitTimesTwoDigit(): MultiplicationQuestion {
  const type: MultiplicationQuestionType = 'one_digit_times_two_digit';
  const a = Math.floor(Math.random() * 9) + 1; // 1..9
  const b = Math.floor(Math.random() * 90) + 10; // 10..99
  return createQuestion(a, b, type);
}

export function generateTwoDigitTimesTwoDigit(): MultiplicationQuestion {
  const type: MultiplicationQuestionType = 'two_digit_times_two_digit';
  const a = Math.floor(Math.random() * 90) + 10; // 10..99
  const b = Math.floor(Math.random() * 90) + 10; // 10..99
  return createQuestion(a, b, type);
}

export const multiplicationTopics: MultiplicationTopicDescriptor[] = [
  { key: 'multiply_by_0', label: 'Multiply by 0', limited: true },
  { key: 'multiply_by_1', label: 'Multiply by 1', limited: true },
  { key: 'multiply_by_2', label: 'Multiply by 2', limited: true },
  { key: 'multiply_by_5', label: 'Multiply by 5', limited: true },
  { key: 'multiply_by_9', label: 'Multiply by 9', limited: true },
  { key: 'multiply_by_10', label: 'Multiply by 10', limited: true },
  { key: 'square_numbers', label: 'Square Numbers', limited: true },
  { key: 'multiply_by_3', label: 'Multiply by 3', limited: true },
  { key: 'multiply_by_4', label: 'Multiply by 4', limited: true },
  { key: 'multiply_by_6', label: 'Multiply by 6', limited: true },
  { key: 'multiply_by_7', label: 'Multiply by 7', limited: true },
  { key: 'multiply_by_8', label: 'Multiply by 8', limited: true },
  { key: 'multiples_of_10', label: 'Multiples of 10', limited: false },
  { key: 'one_digit_times_two_digit', label: 'One-Digit × Two-Digit', limited: false },
  { key: 'two_digit_times_two_digit', label: 'Two-Digit × Two-Digit', limited: false },
];


