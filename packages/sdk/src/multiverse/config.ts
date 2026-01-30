import { FactMasteryItem } from "./MultiverseQuestionSelector";

export const mathFactTags = {
    // Addition Tags
    NUMBER_PLUS_0_FACTS: "Number + 0 Facts",
    NUMBER_PLUS_1_FACTS: "Number + 1 Facts",
    NUMBER_PLUS_2_FACTS: "Number + 2 Facts",
    DOUBLES_FACTS: "Doubles Facts",
    NEAR_DOUBLES_FACTS: "Near Doubles Facts",
    MAKE_10_FACTS: "Make 10 Facts",
    MAKE_20_FACTS: "Make 20 Facts",
    BRIDGE_10_FACTS: "Bridge 10 Facts",
    NUMBER_PLUS_10_FACTS: "Number + 10 Facts",
    SUMS_TO_5: "Sums to 5",
    SUMS_TO_10: "Sums to 10",
    SUMS_TO_20: "Sums to 20",
    TEEN_SUMS: "Teen Sums",
    ADDITION_UPTO_100: "Addition upto 100",
    MULTIDIGIT_ADDITION: "Multidigit addition",
    // Subtraction Tags
    SUBTRACT_0_FACTS: "Subtract 0 Facts",
    SUBTRACT_1_FACTS: "Subtract 1 Facts",
    SUBTRACT_2_FACTS: "Subtract 2 Facts",
    SUBTRACTING_FROM_DOUBLES: "Subtracting from Doubles",
    SUBTRACTING_FROM_10: "Subtracting from 10",
    SUBTRACTING_FROM_TEENS: "Subtracting from Teens",
    DIFFERENCES_OF_1: "Differences of 1",
    DIFFERENCES_OF_2: "Differences of 2",
    SUBTRACTION_UPTO_100: "Subtraction upto 100",
    MULTIDIGIT_SUBTRACTION: "Multidigit subtraction",
    // Multiplication Tags
    MULTIPLY_BY_0: "Multiply by 0",
    MULTIPLY_BY_1: "Multiply by 1",
    MULTIPLY_BY_2: "Multiply by 2",
    MULTIPLY_BY_3: "Multiply by 3",
    MULTIPLY_BY_4: "Multiply by 4",
    MULTIPLY_BY_5: "Multiply by 5",
    MULTIPLY_BY_6: "Multiply by 6",
    MULTIPLY_BY_7: "Multiply by 7",
    MULTIPLY_BY_8: "Multiply by 8",
    MULTIPLY_BY_9: "Multiply by 9",
    MULTIPLY_BY_10: "Multiply by 10",
    SQUARE_NUMBERS: "Square Numbers",
    MULTIDIGIT_WITH_2DIGIT_MULTIPLICATION: "Multidigit with 2digit multiplication",
    MULTIDIGIT_WITH_SINGLE_DIGIT_MULTIPLICATION: "Multidigit with single digit multiplication",
    MULTIDIGIT_MULTIPLICATION_POWERS_OF_10: "Multidigit multiplication with powers of 10",
    // Division Tags
    DIVIDE_BY_1: "Divide by 1",
    DIVIDE_BY_2: "Divide by 2",
    DIVIDE_BY_3: "Divide by 3",
    DIVIDE_BY_4: "Divide by 4",
    DIVIDE_BY_5: "Divide by 5",
    DIVIDE_BY_6: "Divide by 6",
    DIVIDE_BY_7: "Divide by 7",
    DIVIDE_BY_8: "Divide by 8",
    DIVIDE_BY_9: "Divide by 9",
    DIVIDE_BY_10: "Divide by 10",
    // Decimal Operation Tags
    DECIMAL_ADDITION: "Decimal Addition",
    DECIMAL_SUBTRACTION: "Decimal Subtraction", 
    DECIMAL_MULTIPLICATION: "Decimal Multiplication",
    DECIMAL_DIVISION: "Decimal Division",
  
    // Bonus Multiverse Tags
    ADDITION_TENS_HUNDREDS: "Addition: Tens & Hundreds",
    ADDITION_PLACE_VALUE_SHIFTS: "Addition: Place Value Shifts",
    ADDITION_CLEAN_ADDITION: "Addition: Clean Addition",
    SUBTRACTION_TENS_HUNDREDS: "Subtraction: Tens & Hundreds",
    SUBTRACTION_PLACE_VALUE_SHIFTS: "Subtraction: Place Value Shifts",
    SUBTRACTION_CLEAN_SUBTRACTION: "Subtraction: Clean Subtraction",
    SUBTRACTION_ZERO_BREAKERS: "Subtraction: Zero Breakers",
    MULTIPLICATION_BASIC_FACTS: "Multiplication: Basic Facts",
    MULTIPLICATION_SIMPLE_2_DIGIT: "Multiplication: Simple 2-Digit",
    MULTIPLICATION_PLACE_VALUE_SHIFTS: "Multiplication: Place Value Shifts",
    MULTIPLICATION_FACT_EXTENDERS_ZEROS: "Multiplication: Fact Extenders (Zeros)",
    MULTIPLICATION_SIMPLE_SPLITS: "Multiplication: Simple Splits",
    DIVISION_BASIC_FACTS: "Division: Basic Facts",
    DIVISION_PLACE_VALUE_SHIFTS: "Division: Place Value Shifts",
    DIVISION_FACT_REVERSERS_ZEROS: "Division: Fact Reversers (Zeros)",
    DIVISION_SIMPLE_SPLITS: "Division: Simple Splits",
    DIVISION_CLEAN_DIVISORS: "Division: Clean Divisors",
    ADDITION_TEAM_NEGATIVE: "Addition: Team Negative",
    ADDITION_SIGN_BATTLES: "Addition: Sign Battles",
    ADDITION_ZERO_PAIRS: "Addition: Zero Pairs",
    SUBTRACTION_DROPPING_DOWN: "Subtraction: Dropping Down",
    SUBTRACTION_GETTING_COLDER: "Subtraction: Getting Colder",
    SUBTRACTION_THE_BIG_FLIP: "Subtraction: The Big Flip",
    MULTIPLICATION_NEGATIVE_PRODUCTS: "Multiplication: Negative Products",
    MULTIPLICATION_POSITIVE_PRODUCTS: "Multiplication: Positive Products",
    DIVISION_NEGATIVE_QUOTIENTS: "Division: Negative Quotients",
    DIVISION_POSITIVE_QUOTIENTS: "Division: Positive Quotients",
  };

type MatFactTagKey = keyof typeof mathFactTags;

const additionKeys: MatFactTagKey[] = [
  "NUMBER_PLUS_0_FACTS", 
  "NUMBER_PLUS_1_FACTS", 
  "NUMBER_PLUS_2_FACTS", 
  "DOUBLES_FACTS", 
  "NEAR_DOUBLES_FACTS", 
  "MAKE_10_FACTS", 
  "MAKE_20_FACTS", 
  "BRIDGE_10_FACTS", 
  "NUMBER_PLUS_10_FACTS",
  "SUMS_TO_5",
  "SUMS_TO_10",
  "SUMS_TO_20",
  "TEEN_SUMS", 
]

const subtractionKeys: MatFactTagKey[] = [
  "SUBTRACT_0_FACTS", 
  "SUBTRACT_1_FACTS", 
  "SUBTRACT_2_FACTS", 
  "SUBTRACTING_FROM_DOUBLES", 
  "SUBTRACTING_FROM_10", 
  "SUBTRACTING_FROM_TEENS", 
  "DIFFERENCES_OF_1", 
  "DIFFERENCES_OF_2", 
]

const multiplicationKeys: MatFactTagKey[] = [ 
  "MULTIPLY_BY_0",
  "MULTIPLY_BY_1",
  "MULTIPLY_BY_2",
  "MULTIPLY_BY_3",
  "MULTIPLY_BY_4",
  "MULTIPLY_BY_5",
  "MULTIPLY_BY_6",
  "MULTIPLY_BY_7",
  "MULTIPLY_BY_8",
  "MULTIPLY_BY_9",
  "MULTIPLY_BY_10",
  "SQUARE_NUMBERS",
]

const divisionKeys: MatFactTagKey[] = [
  "DIVIDE_BY_1",
  "DIVIDE_BY_2",
  "DIVIDE_BY_3",
  "DIVIDE_BY_4",
  "DIVIDE_BY_5",
  "DIVIDE_BY_6",
  "DIVIDE_BY_7",
  "DIVIDE_BY_8",
  "DIVIDE_BY_9",
  "DIVIDE_BY_10",
]

// bonus multiverse tags
const bonusAddKeys: MatFactTagKey[] = [
  "ADDITION_TENS_HUNDREDS",
  "ADDITION_PLACE_VALUE_SHIFTS",
  "ADDITION_CLEAN_ADDITION",
];

const bonusSubtractKeys: MatFactTagKey[] = [
  "SUBTRACTION_TENS_HUNDREDS",
  "SUBTRACTION_PLACE_VALUE_SHIFTS",
  "SUBTRACTION_CLEAN_SUBTRACTION",
  "SUBTRACTION_ZERO_BREAKERS",
];

const bonusMultiplyKeys: MatFactTagKey[] = [
  "MULTIPLICATION_BASIC_FACTS",
  "MULTIPLICATION_SIMPLE_2_DIGIT",
  "MULTIPLICATION_PLACE_VALUE_SHIFTS",
  "MULTIPLICATION_FACT_EXTENDERS_ZEROS",
  "MULTIPLICATION_SIMPLE_SPLITS",
];

const bonusDivideKeys: MatFactTagKey[] = [
  "DIVISION_BASIC_FACTS",
  "DIVISION_PLACE_VALUE_SHIFTS",
  "DIVISION_FACT_REVERSERS_ZEROS",
  "DIVISION_SIMPLE_SPLITS",
  "DIVISION_CLEAN_DIVISORS",
];

const negativeAddKeys: MatFactTagKey[] = [
  "ADDITION_TEAM_NEGATIVE",
  "ADDITION_SIGN_BATTLES",
  "ADDITION_ZERO_PAIRS",
];

const negativeSubtractKeys: MatFactTagKey[] = [
  "SUBTRACTION_DROPPING_DOWN",
  "SUBTRACTION_GETTING_COLDER",
  "SUBTRACTION_THE_BIG_FLIP",
];

const negativeMultiplyKeys: MatFactTagKey[] = [
  "MULTIPLICATION_NEGATIVE_PRODUCTS",
  "MULTIPLICATION_POSITIVE_PRODUCTS",
];

const negativeDivideKeys: MatFactTagKey[] = [
  "DIVISION_NEGATIVE_QUOTIENTS",
  "DIVISION_POSITIVE_QUOTIENTS",
];


export const topicToTagsMapping: Record<string, MatFactTagKey[]> = {
  "grade2_topic1": [
    ...additionKeys.filter(key => key !== "MAKE_20_FACTS" && key !== "SUMS_TO_20"),
    ...subtractionKeys,
  ],
  "grade2_topic3": [
    "TEEN_SUMS",
    "SUMS_TO_20",
    "DOUBLES_FACTS",
    "ADDITION_UPTO_100",
  ],
  "grade2_topic4": [
    "SUBTRACTING_FROM_TEENS",
    "SUBTRACTING_FROM_DOUBLES",
    "SUBTRACTION_UPTO_100",
  ],
  "grade3_topic2": [
    ...multiplicationKeys,
  ],
  "grade3_topic3": [
    ...multiplicationKeys,
  ],
  "grade3_topic4": [
    ...multiplicationKeys.filter(key => ![
      "MULTIPLY_BY_0",
      "MULTIPLY_BY_1",
      "MULTIPLY_BY_2",
      "MULTIPLY_BY_3",
      "MULTIPLY_BY_4",
    ].includes(key)),
    ...divisionKeys.filter(key => ![
      "DIVIDE_BY_1",
      "DIVIDE_BY_2",
      "DIVIDE_BY_3",
      "DIVIDE_BY_4",
    ].includes(key)),
  ],
  "grade4_topic2": [
    "MULTIDIGIT_ADDITION",
    "MULTIDIGIT_SUBTRACTION",
  ],
  "grade5_topic3": [
    "MULTIDIGIT_MULTIPLICATION_POWERS_OF_10",
    "MULTIDIGIT_WITH_2DIGIT_MULTIPLICATION",
    "MULTIDIGIT_WITH_SINGLE_DIGIT_MULTIPLICATION",
  ],
  "grade6_topic1": [
    "DECIMAL_ADDITION",
    "DECIMAL_SUBTRACTION",
    "DECIMAL_MULTIPLICATION",
    "DECIMAL_DIVISION",
  ],
  "g5_g6": [
    ...bonusAddKeys,
    ...bonusSubtractKeys,
    ...bonusMultiplyKeys,
    ...bonusDivideKeys,
  ],
  "g7_g8": [
    ...bonusAddKeys,
    ...bonusSubtractKeys,
    ...bonusMultiplyKeys,
    ...bonusDivideKeys,
    ...negativeAddKeys,
    ...negativeSubtractKeys,
    ...negativeMultiplyKeys,
    ...negativeDivideKeys,
  ]
}

/**
 * Filters bonus multiverse tags by operation mode
 * @param topic - The topic (should be 'g5_g6' or 'g7_g8')
 * @param mode - The operation mode ('add', 'sub', 'mul', 'div')
 * @returns Filtered tag keys based on the operation
 */
export function getBonusMultiverseTagsByMode(topic: string, mode?: string): MatFactTagKey[] {
  if (!mode || (topic !== 'g5_g6' && topic !== 'g7_g8')) {
    return topicToTagsMapping[topic] || [];
  }

  const baseTags = topicToTagsMapping[topic] || [];
  
  // Filter tags based on operation mode
  switch (mode) {
    case 'add':
      return baseTags.filter(key => 
        bonusAddKeys.includes(key) || (topic === 'g7_g8' && negativeAddKeys.includes(key))
      );
    case 'sub':
      return baseTags.filter(key => 
        bonusSubtractKeys.includes(key) || (topic === 'g7_g8' && negativeSubtractKeys.includes(key))
      );
    case 'mul':
      return baseTags.filter(key => 
        bonusMultiplyKeys.includes(key) || (topic === 'g7_g8' && negativeMultiplyKeys.includes(key))
      );
    case 'div':
      return baseTags.filter(key => 
        bonusDivideKeys.includes(key) || (topic === 'g7_g8' && negativeDivideKeys.includes(key))
      );
    default:
      return baseTags;
  }
}

export function parseMathFact(questionText: string): { operand1: number; operand2: number; result: number; operation: string } | null {
  // Match patterns like "5+3=8", "12-7=5", "0×1=0", "0÷1=0", etc.
  const match = questionText.match(/^(\d+)([+\-×÷])(\d+)=(\d+)$/);
  if (!match) return null;
  
  const [_fullMatch, operand1Str, operation, operand2Str, resultStr] = match;
  return {
      operand1: parseInt(operand1Str, 10),
      operand2: parseInt(operand2Str, 10),
      result: parseInt(resultStr, 10),
      operation
  };
}

export function withinFilter(fm: FactMasteryItem, within: number, operandsLimit?: number): boolean {
  const parsed = parseMathFact(fm.mathFact["question text"]);
  if (!parsed) return false;

  if (operandsLimit) {
    return parsed.operand1 <= operandsLimit && parsed.operand2 <= operandsLimit && parsed.result <= within;
  }
  
  return parsed.result <= within;
}

export function g5_g6Filter(fm: FactMasteryItem): boolean {
  const question = fm.mathFact["question text"];
  const operators = ['+', '−', '×', '÷', '-'];

  // Split on '=' to separate question from answer
  const [left, answer] = question.split('=').map((s) => s.trim());
  if (!left || answer === undefined) throw new Error('Invalid question format');
  
  // Remove all parentheses first
  const cleaned = left.replace(/[()]/g, '');
  
  // Find the operator (skip the first character to avoid leading negative)
  let operator = null;
  let operatorIndex = -1;
  
  for (let i = 1; i < cleaned.length; i++) {
      if (operators.includes(cleaned[i])) {
          operator = cleaned[i];
          operatorIndex = i;
          break;
      }
  }
  
  if (!operator || operatorIndex === -1) throw new Error('Operator not found in question string');
  
  // Split at the operator
  const operand1 = cleaned.substring(0, operatorIndex).trim();
  const operand2 = cleaned.substring(operatorIndex + 1).trim();
  
  if (!operand1 || !operand2) throw new Error('Invalid operands');

  // < 6 digits
  const ifLessThan6Digits = Math.abs(Number(operand1)) < 100000 &&
  Math.abs(Number(operand2)) < 100000 &&
  Math.abs(Number(answer)) < 100000
  
  return ifLessThan6Digits;
}