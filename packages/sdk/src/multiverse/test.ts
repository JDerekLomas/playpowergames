import {
  generateNumberPlusZeroFacts,
  generateNumberPlusOneFacts,
  generateNumberPlusTwoFacts,
  generateDoublesFacts,
  generateNearDoublesFacts,
  generateMakeTenFacts,
  generateBridgeTenFacts,
  generateNumberPlusTenFacts,
  generateSumsToFive,
  generateSumsToTen,
  generateTeenSums,
  generateMultiplesOfTen,
  generateTwoDigitPlusOneDigitSimple,
  generateTwoDigitPlusMultipleOfTen,
  generateSimpleTwoDigitPlusTwoDigit,
  generateSimpleMultipleAddends,
} from './addition';
import {
  generateSubtractZeroFacts,
  generateSubtractOneFacts,
  generateSubtractTwoFacts,
  generateSubtractingFromDoubles,
  generateSubtractingFromTen,
  generateSubtractingFromTeens,
  generateDifferencesOfOne,
  generateDifferencesOfTwo,
  generateTwoDigitMinusOneDigitSimple,
  generateTwoDigitMinusMultipleOfTen,
  generateSimpleTwoDigitMinusTwoDigit,
  generateAcrossZeroSubtraction,
} from './subtraction';

type AdditionBinary = { operand1: number; operand2: number; answer: number; type: string };
type SubtractionBinary = { minuend: number; subtrahend: number; answer: number; type: string };
type Binary = AdditionBinary | SubtractionBinary;

type FnResult = Binary | Binary[];
type Group = [label: string, fn: () => FnResult];

const groups: Group[] = [
  ['Number + 0 Facts', generateNumberPlusZeroFacts],
  ['Number + 1 Facts', generateNumberPlusOneFacts],
  ['Number + 2 Facts', generateNumberPlusTwoFacts],
  ['Doubles Facts', generateDoublesFacts],
  ['Near Doubles Facts', generateNearDoublesFacts],
  ['Make 10 Facts', generateMakeTenFacts],
  ['Bridge 10 Facts', generateBridgeTenFacts],
  ['Number + 10 Facts', generateNumberPlusTenFacts],
  ['Sums to 5', generateSumsToFive],
  ['Sums to 10', generateSumsToTen],
  ['Teen Sums', generateTeenSums],
  ['Multiples of 10', generateMultiplesOfTen],
  ['Two-Digit + One-Digit (simple)', generateTwoDigitPlusOneDigitSimple],
  ['Two-Digit + Multiple of 10', generateTwoDigitPlusMultipleOfTen],
  ['Simple Two-Digit + Two-Digit', generateSimpleTwoDigitPlusTwoDigit],
  // Subtraction groups below
  ['Subtract 0 Facts', generateSubtractZeroFacts],
  ['Subtract 1 Facts', generateSubtractOneFacts],
  ['Subtract 2 Facts', generateSubtractTwoFacts],
  ['Subtracting from Doubles', generateSubtractingFromDoubles],
  ['Subtracting from 10', generateSubtractingFromTen],
  ['Subtracting from Teens', generateSubtractingFromTeens],
  ['Differences of 1', generateDifferencesOfOne],
  ['Differences of 2', generateDifferencesOfTwo],
  ['Two-Digit minus One-Digit', generateTwoDigitMinusOneDigitSimple],
  ['Two-Digit minus Multiple of 10', generateTwoDigitMinusMultipleOfTen],
  ['Simple Two-Digit minus Two-Digit', generateSimpleTwoDigitMinusTwoDigit],
  ['Across-Zero Subtraction', generateAcrossZeroSubtraction],
];

for (const [label, fn] of groups) {
  const result = fn();
  const questions = Array.isArray(result) ? result : [result];
  // eslint-disable-next-line no-console
  console.log(`\n=== ${label} (${questions.length}) ===`);
  for (const q of questions as Binary[]) {
    // eslint-disable-next-line no-console
    if ('operand1' in q && 'operand2' in q) {
      console.log(`${q.operand1} + ${q.operand2} = ${q.answer} [${q.type}]`);
    } else if ('minuend' in q && 'subtrahend' in q) {
      console.log(`${q.minuend} - ${q.subtrahend} = ${q.answer} [${q.type}]`);
    }
  }
}

// Multi-addends group
{
  const label = 'Simple Multiple Addends';
  const res = generateSimpleMultipleAddends();
  const questions = Array.isArray(res) ? res : [res];
  // eslint-disable-next-line no-console
  console.log(`\n=== ${label} (${questions.length}) ===`);
  for (const q of questions) {
    const expr = q.operands.join(' + ');
    // eslint-disable-next-line no-console
    console.log(`${expr} = ${q.answer} [${q.type}]`);
  }
}

// npx ts-node --compiler-options '{"module":"commonjs"}' /Users/talmeez/Desktop/Dev/k8-games/packages/sdk/src/multiverse/test.ts


