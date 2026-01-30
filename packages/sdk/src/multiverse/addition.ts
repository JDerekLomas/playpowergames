// Addition fact generators

export type AdditionQuestionType =
  | 'number_plus_0'
  | 'number_plus_1'
  | 'number_plus_2'
  | 'doubles'
  | 'near_doubles'
  | 'make_10'
  | 'bridge_10'
  | 'number_plus_10'
  | 'sums_to_5'
  | 'sums_to_10'
  | 'teen_sums'
  | 'multiples_of_10'
  | 'two_digit_plus_one_digit'
  | 'two_digit_plus_tens'
  | 'simple_two_digit_plus_two_digit'
  | 'simple_multiple_addends';

export interface AdditionQuestion {
  operand1: number;
  operand2: number;
  answer: number;
  type: AdditionQuestionType;
}

export interface AdditionMultiAddendsQuestion {
  operands: number[];
  answer: number;
  type: 'simple_multiple_addends';
}

export interface AdditionTopicDescriptor {
  key: AdditionQuestionType;
  label: string;
  limited: boolean;
}

function createQuestion(
  operand1: number,
  operand2: number,
  type: AdditionQuestionType
): AdditionQuestion {
  return { operand1, operand2, answer: operand1 + operand2, type };
}

// Number + 0 Facts (0+1 through 0+9)
export function generateNumberPlusZeroFacts(): AdditionQuestion[] {
  const type: AdditionQuestionType = 'number_plus_0';
  const questions: AdditionQuestion[] = [];
  for (let n = 1; n <= 9; n++) {
    questions.push(createQuestion(0, n, type));
  }
  return questions;
}

// Number + 1 Facts (1+1 through 1+9)
export function generateNumberPlusOneFacts(): AdditionQuestion[] {
  const type: AdditionQuestionType = 'number_plus_1';
  const questions: AdditionQuestion[] = [];
  for (let n = 1; n <= 9; n++) {
    questions.push(createQuestion(1, n, type));
  }
  return questions;
}

// Number + 2 Facts (2+1 through 2+9)
export function generateNumberPlusTwoFacts(): AdditionQuestion[] {
  const type: AdditionQuestionType = 'number_plus_2';
  const questions: AdditionQuestion[] = [];
  for (let n = 1; n <= 9; n++) {
    questions.push(createQuestion(2, n, type));
  }
  return questions;
}

// Doubles Facts (1+1, 2+2, 3+3, ..., 9+9)
export function generateDoublesFacts(): AdditionQuestion {
  const type: AdditionQuestionType = 'doubles';
  const n = Math.floor(Math.random() * 9) + 1; // 1..9
  return createQuestion(n, n, type);
}

// Near Doubles Facts (n + (n+1)) → 1+2 through 8+9
export function generateNearDoublesFacts(): AdditionQuestion {
  const type: AdditionQuestionType = 'near_doubles';
  const n = Math.floor(Math.random() * 8) + 1; // 1..8
  return createQuestion(n, n + 1, type);
}

// Make 10 Facts (9+1, 8+2, 7+3, ..., 1+9)
export function generateMakeTenFacts(): AdditionQuestion[] {
  const type: AdditionQuestionType = 'make_10';
  const questions: AdditionQuestion[] = [];
  for (let a = 9; a >= 1; a--) {
    const b = 10 - a;
    if (b >= 1 && b <= 9) {
      questions.push(createQuestion(a, b, type));
    }
  }
  return questions;
}

// Bridge 10 Facts: single-digit addends whose sum > 10 (unique unordered pairs)
export function generateBridgeTenFacts(): AdditionQuestion[] {
  const type: AdditionQuestionType = 'bridge_10';
  const questions: AdditionQuestion[] = [];
  for (let a = 9; a >= 1; a--) {
    for (let b = a; b >= 1; b--) {
      if (a + b > 10 && a <= 9 && b <= 9) {
        questions.push(createQuestion(a, b, type));
      }
    }
  }
  return questions;
}

// Number + 10 Facts (10+1 through 10+9)
export function generateNumberPlusTenFacts(): AdditionQuestion {
  const type: AdditionQuestionType = 'number_plus_10';
  const n = Math.floor(Math.random() * 9) + 1; // 1..9
  return createQuestion(10, n, type);
}

// Sums to 5 (unique unordered pairs with positive addends)
export function generateSumsToFive(): AdditionQuestion[] {
  const type: AdditionQuestionType = 'sums_to_5';
  const questions: AdditionQuestion[] = [];
  const pairs: Array<[number, number]> = [
    [1, 4],
    [2, 3],
  ];
  for (const [a, b] of pairs) {
    questions.push(createQuestion(a, b, type));
  }
  return questions;
}

// Sums to 10 (unique unordered pairs with positive addends)
export function generateSumsToTen(): AdditionQuestion[] {
  const type: AdditionQuestionType = 'sums_to_10';
  const questions: AdditionQuestion[] = [];
  const pairs: Array<[number, number]> = [
    [1, 9],
    [2, 8],
    [3, 7],
    [4, 6],
    [5, 5],
  ];
  for (const [a, b] of pairs) {
    questions.push(createQuestion(a, b, type));
  }
  return questions;
}

// Teen Sums (unique unordered single-digit addends with sum 11..18)
export function generateTeenSums(): AdditionQuestion[] {
  const type: AdditionQuestionType = 'teen_sums';
  const questions: AdditionQuestion[] = [];
  for (let sum = 11; sum <= 18; sum++) {
    for (let a = 9; a >= 1; a--) {
      const b = sum - a;
      if (b >= 1 && b <= a && b <= 9) {
        questions.push(createQuestion(a, b, type));
      }
    }
  }
  return questions;
}

// Multiples of 10 (neighbor pairs): 10+20, 20+30, ..., 80+90
export function generateMultiplesOfTen(): AdditionQuestion {
  const type: AdditionQuestionType = 'multiples_of_10';
  const tens: number[] = Array.from({ length: 9 }, (_, i) => (i + 1) * 10); // 10..90
  const a = tens[Math.floor(Math.random() * tens.length)];
  let b = tens[Math.floor(Math.random() * tens.length)];
  if (b === a) {
    b = tens[(tens.indexOf(a) + 1) % tens.length];
  }
  return createQuestion(a, b, type);
}

// Two-Digit + One-Digit (no-carry): choose pairs where ones(a) + b < 10
export function generateTwoDigitPlusOneDigitSimple(): AdditionQuestion {
  const type: AdditionQuestionType = 'two_digit_plus_one_digit';
  // pick a random two-digit a and b such that ones(a) + b < 10
  while (true) {
    const a = Math.floor(Math.random() * 90) + 10; // 10..99
    const ones = a % 10;
    const maxB = 9 - ones - 1; // ensure ones + b < 10
    if (maxB >= 1) {
      const b = Math.floor(Math.random() * maxB) + 1; // 1..maxB
      return createQuestion(a, b, type);
    }
  }
}

// Two-Digit + Multiple of 10: curated set
export function generateTwoDigitPlusMultipleOfTen(): AdditionQuestion {
  const type: AdditionQuestionType = 'two_digit_plus_tens';
  const a = Math.floor(Math.random() * 90) + 10; // 10..99
  const b = (Math.floor(Math.random() * 9) + 1) * 10; // 10..90
  return createQuestion(a, b, type);
}

// Simple Two-Digit + Simple Two-Digit (no-carry ones)
export function generateSimpleTwoDigitPlusTwoDigit(): AdditionQuestion {
  const type: AdditionQuestionType = 'simple_two_digit_plus_two_digit';
  // create a simple no-carry pair
  const sameTens = Math.random() < 0.5;
  if (sameTens) {
    const t = Math.floor(Math.random() * 9) + 1; // 1..9
    const a = t * 10 + 5;
    const b = t * 10 + 4;
    return createQuestion(a, b, type);
  } else {
    const t = Math.floor(Math.random() * 8) + 1; // 1..8
    const a = t * 10 + 2;
    const b = (t + 1) * 10 + 3;
    return createQuestion(a, b, type);
  }
}

// Simple Multiple Addends (three addends)
export function generateSimpleMultipleAddends(): AdditionMultiAddendsQuestion {
  const type: AdditionMultiAddendsQuestion['type'] = 'simple_multiple_addends';
  if (Math.random() < 0.5) {
    const start = Math.floor(Math.random() * 6) + 1; // 1..6
    const operands = [start, start + 1, start + 2];
    const answer = operands[0] + operands[1] + operands[2];
    return { operands, answer, type };
  } else {
    const twoDigit = Math.floor(Math.random() * 20) + 10; // 10..29
    const b = Math.floor(Math.random() * 9) + 1; // 1..10
    const c = Math.floor(Math.random() * 9) + 1;
    const operands = [twoDigit, b, c];
    const answer = operands[0] + operands[1] + operands[2];
    return { operands, answer, type };
  }
}

// Export topic list with labels and whether limited or infinite
export const additionTopics: AdditionTopicDescriptor[] = [
  { key: 'number_plus_0', label: 'Number + 0 Facts', limited: true },
  { key: 'number_plus_1', label: 'Number + 1 Facts', limited: true },
  { key: 'number_plus_2', label: 'Number + 2 Facts', limited: true },
  { key: 'make_10', label: 'Make 10 Facts', limited: true },
  { key: 'bridge_10', label: 'Bridge 10 Facts', limited: true },
  { key: 'sums_to_5', label: 'Sums to 5', limited: true },
  { key: 'sums_to_10', label: 'Sums to 10', limited: true },
  { key: 'teen_sums', label: 'Teen Sums', limited: true },
  { key: 'doubles', label: 'Doubles Facts', limited: false },
  { key: 'near_doubles', label: 'Near Doubles Facts', limited: false },
  { key: 'number_plus_10', label: 'Number + 10 Facts', limited: false },
  { key: 'multiples_of_10', label: 'Multiples of 10', limited: false },
  { key: 'two_digit_plus_one_digit', label: 'Two-Digit + One-Digit', limited: false },
  { key: 'two_digit_plus_tens', label: 'Two-Digit + Multiple of 10', limited: false },
  { key: 'simple_two_digit_plus_two_digit', label: 'Simple Two-Digit + Two-Digit', limited: false },
  { key: 'simple_multiple_addends', label: 'Simple Multiple Addends', limited: false },
];


