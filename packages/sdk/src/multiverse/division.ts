// Division fact generators

export type DivisionQuestionType =
  | 'divide_by_1'
  | 'divide_by_2'
  | 'divide_by_3'
  | 'divide_by_4'
  | 'divide_by_5'
  | 'divide_by_6'
  | 'divide_by_7'
  | 'divide_by_8'
  | 'divide_by_9'
  | 'divide_by_10'
  | 'division_with_remainders'
  | 'division_with_decimals';

export interface DivisionQuestion {
  dividend: number;
  divisor: number;
  answer: number; // quotient (for remainders, this is floor(dividend/divisor))
  remainder?: number; // optional remainder for remainder questions
  type: DivisionQuestionType;
}

export interface DivisionTopicDescriptor {
  key: DivisionQuestionType;
  label: string;
  limited: boolean;
}

function createQuestion(
  dividend: number,
  divisor: number,
  type: DivisionQuestionType,
  remainder?: number
): DivisionQuestion {
  const answer = Math.floor(dividend / divisor * 100) / 100; // allow decimals for decimal division
  const q: DivisionQuestion = { dividend, divisor, answer, type };
  if (typeof remainder === 'number') q.remainder = remainder;
  return q;
}

// Limited topics (arrays of all facts)

export function generateDivideByOneFacts(): DivisionQuestion[] {
  const type: DivisionQuestionType = 'divide_by_1';
  const questions: DivisionQuestion[] = [];
  for (let n = 1; n <= 9; n++) {
    questions.push(createQuestion(n, 1, type));
  }
  return questions;
}

export function generateDivideByTwoFacts(): DivisionQuestion[] {
  const type: DivisionQuestionType = 'divide_by_2';
  const questions: DivisionQuestion[] = [];
  for (let n = 2; n <= 18; n += 2) {
    questions.push(createQuestion(n, 2, type));
  }
  return questions;
}

export function generateDivideByFiveFacts(): DivisionQuestion[] {
  const type: DivisionQuestionType = 'divide_by_5';
  const questions: DivisionQuestion[] = [];
  for (let n = 5; n <= 45; n += 5) {
    questions.push(createQuestion(n, 5, type));
  }
  return questions;
}

export function generateDivideByTenFacts(): DivisionQuestion[] {
  const type: DivisionQuestionType = 'divide_by_10';
  const questions: DivisionQuestion[] = [];
  for (let n = 10; n <= 90; n += 10) {
    questions.push(createQuestion(n, 10, type));
  }
  return questions;
}

export function generateDivideByThreeFacts(): DivisionQuestion[] {
  const type: DivisionQuestionType = 'divide_by_3';
  const questions: DivisionQuestion[] = [];
  for (let n = 3; n <= 27; n += 3) {
    questions.push(createQuestion(n, 3, type));
  }
  return questions;
}

export function generateDivideByFourFacts(): DivisionQuestion[] {
  const type: DivisionQuestionType = 'divide_by_4';
  const questions: DivisionQuestion[] = [];
  for (let n = 4; n <= 36; n += 4) {
    questions.push(createQuestion(n, 4, type));
  }
  return questions;
}

export function generateDivideBySixFacts(): DivisionQuestion[] {
  const type: DivisionQuestionType = 'divide_by_6';
  const questions: DivisionQuestion[] = [];
  for (let n = 6; n <= 54; n += 6) {
    questions.push(createQuestion(n, 6, type));
  }
  return questions;
}

export function generateDivideBySevenFacts(): DivisionQuestion[] {
  const type: DivisionQuestionType = 'divide_by_7';
  const questions: DivisionQuestion[] = [];
  for (let n = 7; n <= 63; n += 7) {
    questions.push(createQuestion(n, 7, type));
  }
  return questions;
}

export function generateDivideByEightFacts(): DivisionQuestion[] {
  const type: DivisionQuestionType = 'divide_by_8';
  const questions: DivisionQuestion[] = [];
  for (let n = 8; n <= 72; n += 8) {
    questions.push(createQuestion(n, 8, type));
  }
  return questions;
}

export function generateDivideByNineFacts(): DivisionQuestion[] {
  const type: DivisionQuestionType = 'divide_by_9';
  const questions: DivisionQuestion[] = [];
  for (let n = 9; n <= 81; n += 9) {
    questions.push(createQuestion(n, 9, type));
  }
  return questions;
}

// Infinite topics (one random question)

export function generateDivisionWithRemainders(): DivisionQuestion {
  const type: DivisionQuestionType = 'division_with_remainders';
  const divisor = Math.floor(Math.random() * 8) + 2; // 2..9
  const quotient = Math.floor(Math.random() * 9) + 1; // 1..9
  let remainder = Math.floor(Math.random() * (divisor - 1)) + 1; // 1..divisor-1
  const dividend = divisor * quotient + remainder;
  return createQuestion(dividend, divisor, type, remainder);
}

export function generateDivisionWithDecimals(): DivisionQuestion {
  const type: DivisionQuestionType = 'division_with_decimals';
  const divisor = Math.floor(Math.random() * 8) + 2; // 2..9
  const dividend = Math.floor(Math.random() * 900) + 100; // 100..999
  // ensure not divisible to get decimal; if divisible, adjust by +1
  const adjustedDividend = dividend % divisor === 0 ? dividend + 1 : dividend;
  const answer = Math.round((adjustedDividend / divisor) * 100) / 100; // 2 decimals
  return { dividend: adjustedDividend, divisor, answer, type };
}

export const divisionTopics: DivisionTopicDescriptor[] = [
  { key: 'divide_by_1', label: 'Divide by 1', limited: true },
  { key: 'divide_by_2', label: 'Divide by 2', limited: true },
  { key: 'divide_by_5', label: 'Divide by 5', limited: true },
  { key: 'divide_by_10', label: 'Divide by 10', limited: true },
  { key: 'divide_by_3', label: 'Divide by 3', limited: true },
  { key: 'divide_by_4', label: 'Divide by 4', limited: true },
  { key: 'divide_by_6', label: 'Divide by 6', limited: true },
  { key: 'divide_by_7', label: 'Divide by 7', limited: true },
  { key: 'divide_by_8', label: 'Divide by 8', limited: true },
  { key: 'divide_by_9', label: 'Divide by 9', limited: true },
  { key: 'division_with_remainders', label: 'Division with Remainders', limited: false },
  { key: 'division_with_decimals', label: 'Division with Decimal Results', limited: false },
];


