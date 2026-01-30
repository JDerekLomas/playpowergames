// Subtraction fact generators

export type SubtractionQuestionType =
  | 'subtract_0'
  | 'subtract_1'
  | 'subtract_2'
  | 'subtracting_from_doubles'
  | 'subtract_from_10'
  | 'subtract_from_teens'
  | 'difference_of_1'
  | 'difference_of_2'
  | 'two_digit_minus_one_digit'
  | 'two_digit_minus_tens'
  | 'simple_two_digit_minus_two_digit'
  | 'across_zero';

export interface SubtractionQuestion {
  minuend: number;
  subtrahend: number;
  answer: number;
  type: SubtractionQuestionType;
}

export interface SubtractionTopicDescriptor {
  key: SubtractionQuestionType;
  label: string;
  limited: boolean;
}

function createQuestion(
  minuend: number,
  subtrahend: number,
  type: SubtractionQuestionType
): SubtractionQuestion {
  return { minuend, subtrahend, answer: minuend - subtrahend, type };
}

// Subtract 0 Facts (1-0 through 9-0)
export function generateSubtractZeroFacts(): SubtractionQuestion[] {
  const type: SubtractionQuestionType = 'subtract_0';
  const questions: SubtractionQuestion[] = [];
  for (let n = 1; n <= 9; n++) {
    questions.push(createQuestion(n, 0, type));
  }
  return questions;
}

// Subtract 1 Facts (1-1 through 10-1)
export function generateSubtractOneFacts(): SubtractionQuestion[] {
  const type: SubtractionQuestionType = 'subtract_1';
  const questions: SubtractionQuestion[] = [];
  for (let n = 1; n <= 10; n++) {
    questions.push(createQuestion(n, 1, type));
  }
  return questions;
}

// Subtract 2 Facts (3-2 through 11-2)
export function generateSubtractTwoFacts(): SubtractionQuestion[] {
  const type: SubtractionQuestionType = 'subtract_2';
  const questions: SubtractionQuestion[] = [];
  for (let n = 3; n <= 11; n++) {
    questions.push(createQuestion(n, 2, type));
  }
  return questions;
}

// Subtracting from Doubles: (2n) - n for n = 2..9 → 4-2 .. 18-9
export function generateSubtractingFromDoubles(): SubtractionQuestion[] {
  const type: SubtractionQuestionType = 'subtracting_from_doubles';
  const questions: SubtractionQuestion[] = [];
  for (let n = 2; n <= 9; n++) {
    questions.push(createQuestion(2 * n, n, type));
  }
  return questions;
}

// Subtracting from 10 (10-1 through 10-9)
export function generateSubtractingFromTen(): SubtractionQuestion[] {
  const type: SubtractionQuestionType = 'subtract_from_10';
  const questions: SubtractionQuestion[] = [];
  for (let n = 1; n <= 9; n++) {
    questions.push(createQuestion(10, n, type));
  }
  return questions;
}

// Subtracting from Teens - curated set
export function generateSubtractingFromTeens(): SubtractionQuestion[] {
  const type: SubtractionQuestionType = 'subtract_from_teens';
  const questions: SubtractionQuestion[] = [];
  const oddTeenSubs = [2, 5, 7];
  const evenTeenSubs = [3, 6, 8];
  for (let t = 11; t <= 19; t += 2) {
    for (const s of oddTeenSubs) {
      questions.push(createQuestion(t, s, type));
    }
  }
  for (let t = 12; t <= 18; t += 2) {
    for (const s of evenTeenSubs) {
      questions.push(createQuestion(t, s, type));
    }
  }
  return questions;
}

// Differences of 1: (n+1) - n for n = 1..19 → 2-1 .. 20-19
export function generateDifferencesOfOne(): SubtractionQuestion[] {
  const type: SubtractionQuestionType = 'difference_of_1';
  const questions: SubtractionQuestion[] = [];
  for (let n = 1; n <= 19; n++) {
    questions.push(createQuestion(n + 1, n, type));
  }
  return questions;
}

// Differences of 2: (n+2) - n for n = 1..18 → 3-1 .. 20-18
export function generateDifferencesOfTwo(): SubtractionQuestion[] {
  const type: SubtractionQuestionType = 'difference_of_2';
  const questions: SubtractionQuestion[] = [];
  for (let n = 1; n <= 18; n++) {
    questions.push(createQuestion(n + 2, n, type));
  }
  return questions;
}

// Two-Digit minus One-Digit: pick a single-digit subtrahend ≤ ones(minuend)
export function generateTwoDigitMinusOneDigitSimple(): SubtractionQuestion {
  const type: SubtractionQuestionType = 'two_digit_minus_one_digit';
  while (true) {
    const a = Math.floor(Math.random() * 90) + 10; // 10..99
    const ones = a % 10;
    if (ones >= 1) {
      const s = Math.floor(Math.random() * ones) + 1; // 1..ones
      return createQuestion(a, s, type);
    }
  }
}

// Two-Digit minus Multiple of 10: curated pairs
export function generateTwoDigitMinusMultipleOfTen(): SubtractionQuestion {
  const type: SubtractionQuestionType = 'two_digit_minus_tens';
  const b = (Math.floor(Math.random() * 9) + 1) * 10; // 10..90
  const a = Math.floor(Math.random() * 90) + 10; // 10..99
  const minuend = a > b ? a : b + Math.floor(Math.random() * 10) + 1; // ensure a > b
  return createQuestion(minuend, b, type);
}

// Simple Two-Digit minus Simple Two-Digit
export function generateSimpleTwoDigitMinusTwoDigit(): SubtractionQuestion {
  const type: SubtractionQuestionType = 'simple_two_digit_minus_two_digit';
  if (Math.random() < 0.5) {
    const t = Math.floor(Math.random() * 8) + 2; // 2..9
    const a = t * 10 + 8;
    const b = t * 10 + 3;
    return createQuestion(a, b, type);
  } else {
    const t = Math.floor(Math.random() * 7) + 3; // 3..9
    const a = t * 10 + 5;
    const b = (t - 2) * 10;
    return createQuestion(a, b, type);
  }
}

// Across-Zero Subtraction: borrowing across zeros (30-7, 100-25, ...)
export function generateAcrossZeroSubtraction(): SubtractionQuestion {
  const type: SubtractionQuestionType = 'across_zero';
  if (Math.random() < 0.6) {
    const tens: number[] = [20, 30, 40, 50, 60, 70, 80, 90];
    const a = tens[Math.floor(Math.random() * tens.length)];
    const s = [7, 9][Math.floor(Math.random() * 2)];
    return createQuestion(a, s, type);
  } else {
    const hundreds = [100, 200, 300];
    const a = hundreds[Math.floor(Math.random() * hundreds.length)];
    const s = Math.floor(Math.random() * 150) + 1; // random cross-zero
    return createQuestion(a, s, type);
  }
}

// Export topic list with labels and whether limited or infinite
export const subtractionTopics: SubtractionTopicDescriptor[] = [
  { key: 'subtract_0', label: 'Subtract 0 Facts', limited: true },
  { key: 'subtract_1', label: 'Subtract 1 Facts', limited: true },
  { key: 'subtract_2', label: 'Subtract 2 Facts', limited: true },
  { key: 'subtracting_from_doubles', label: 'Subtracting from Doubles', limited: true },
  { key: 'subtract_from_10', label: 'Subtracting from 10', limited: true },
  { key: 'subtract_from_teens', label: 'Subtracting from Teens', limited: true },
  { key: 'difference_of_1', label: 'Differences of 1', limited: true },
  { key: 'difference_of_2', label: 'Differences of 2', limited: true },
  { key: 'two_digit_minus_one_digit', label: 'Two-Digit minus One-Digit', limited: false },
  { key: 'two_digit_minus_tens', label: 'Two-Digit minus Multiple of 10', limited: false },
  { key: 'simple_two_digit_minus_two_digit', label: 'Simple Two-Digit minus Two-Digit', limited: false },
  { key: 'across_zero', label: 'Across-Zero Subtraction', limited: false },
];


