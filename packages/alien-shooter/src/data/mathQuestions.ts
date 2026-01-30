import { QuestionSelectorHelper, Question, GameConfigManager } from "@k8-games/sdk"
import { FactMasteryItem, g5_g6Filter, MathFact, MultiverseQuestionSelector, parseMathFact, withinFilter, type StudentResponse } from '@k8-games/sdk/multiverse';


export interface MathQuestion {
    number: number;
    isCorrect: boolean;
}

export interface QuestionData {
    num1: number;
    num2: number;
    operator: string;
    answer: number;
    options: MathQuestion[];
}

// New type for the question result
export interface QuestionResult {
    questionData: QuestionData;
    currentQuestion: Question;
    multiverseQuestion?: MathFact;
}

function extractQuestion(question: string): any {
    // Supported operators
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
    
    return {
        operand1,
        operand2,
        operator,
        answer: answer.trim(),
    };
}


export function generateQuestionFromMultiverseSelector(
    questionSelector: MultiverseQuestionSelector,
    response?: StudentResponse
): QuestionResult | null {
    let filter = undefined;

    const gameConfigManager = GameConfigManager.getInstance();
    const topic = gameConfigManager.get('topic') || 'grade3_topic2';

    if (topic === 'grade2_topic1') {
        filter = (fm: FactMasteryItem) => withinFilter(fm, 20, 10);
    } else if (topic === 'grade2_topic3' || topic === 'grade2_topic4') {
        filter = (fm: FactMasteryItem) => withinFilter(fm, 100);
    } else if (topic === 'grade3_topic2') {
        filter = (fm: FactMasteryItem) => {
            const parsed = parseMathFact(fm.mathFact["question text"]);
            if (!parsed) return false;
            const allowedOperands = [0, 1, 2, 5, 10];
            return allowedOperands.includes(parsed.operand1) && allowedOperands.includes(parsed.operand2);
        }
    } else if (topic === 'g5_g6') {
        filter = (fm: FactMasteryItem) => g5_g6Filter(fm);
    }
    let question: MathFact | null = null;
    if (topic === 'grade2_topic1') {
        question = response ? questionSelector.getNextQuestionAddSub(response, filter) : questionSelector.getNextQuestionAddSub(undefined, filter);
    } else {
        question = response ? questionSelector.getNextQuestion(response, filter) : questionSelector.getNextQuestion(undefined, filter);
    }

    if (!question) return null;

    const { operand1, operand2, operator, answer } = extractQuestion(question['question text']);
    const correctAnswer = parseFloat(answer);

    // Helpers for decimal handling
    const countDecimals = (value: string | number) => {
        const s = String(value);
        const idx = s.indexOf('.')
        return idx >= 0 ? s.length - idx - 1 : 0;
    };
    const decimals = Math.max(countDecimals(operand1), countDecimals(operand2), countDecimals(answer));
    const roundTo = (n: number) => Number(n.toFixed(decimals));
    const randInRange = (min: number, max: number) => roundTo(min + Math.random() * (max - min));

    // Generate options based on operation type
    let optionsSet = new Set<string>();

    if (operator === '+' || operator === '-' || decimals > 0) {
        // Check if this is a true decimal (has non-zero decimal part) vs whole number with trailing zeros
        const isTrueDecimal = decimals > 0 && correctAnswer % 1 !== 0;
        
        if (isTrueDecimal) {
            // For decimal answers: generate place value distractors
            const correctStr = correctAnswer.toFixed(decimals);
            // Always include the correct answer formatted with its decimals
            optionsSet.add(correctStr);
            // String parts are no longer needed; we proceed with numeric transforms
            
            // Generate place value distractors
            const distractors = new Set<string>();

            // Shift left by 1 (÷10): e.g., 0.36 -> 0.036
            const shiftLeft1 = (correctAnswer / 10).toString();
            if (shiftLeft1 !== correctStr) distractors.add(shiftLeft1);

            // Shift left by 2 (÷100): e.g., 0.36 -> 0.0036
            const shiftLeft2 = (correctAnswer / 100).toString();
            if (shiftLeft2 !== correctStr) distractors.add(shiftLeft2);

            // Shift right by 1 (×10): e.g., 0.36 -> 3.6
            const shiftRight1 = (correctAnswer * 10).toString();
            if (shiftRight1 !== correctStr) distractors.add(shiftRight1);

            // Right shift by 1, then insert a zero after the decimal: 0.36 -> 3.6 -> 3.06
            const movedRightStr = (correctAnswer * 10).toString();
            const movedRightParts = movedRightStr.split('.');
            const movedRightInt = movedRightParts[0];
            const movedRightDec = movedRightParts[1] ?? '0';
            const rightShiftZeroInsert = `${movedRightInt}.0${movedRightDec}`;
            if (rightShiftZeroInsert !== correctStr) distractors.add(rightShiftZeroInsert);
            
            // Add valid distractors to options (excluding the correct answer and numerically equivalent values)
            const existingValues = new Set<number>();
            existingValues.add(correctAnswer);
            
            distractors.forEach(distractor => {
                if (optionsSet.size < 5 && distractor !== correctStr && !optionsSet.has(distractor)) {
                    const distractorValue = parseFloat(distractor);
                    if (!existingValues.has(distractorValue)) {
                        optionsSet.add(distractor);
                        existingValues.add(distractorValue);
                    }
                }
            });
            
            // Fill remaining slots with random decimal values
            const baseRange = Math.max(1, Math.ceil(Math.abs(correctAnswer) * 0.4));
            const min = Math.max(0, correctAnswer - baseRange);
            const max = correctAnswer + baseRange;
            
            let attempts = 0;
            const maxAttempts = 100; // Prevent infinite loop
            
            while (optionsSet.size < 5 && attempts < maxAttempts) {
                attempts++;
                const rand = randInRange(min, max);
                const randStr = rand.toFixed(decimals);
                if (randStr !== correctStr && !optionsSet.has(randStr) && !existingValues.has(rand)) {
                    optionsSet.add(randStr);
                    existingValues.add(rand);
                }
            }
            
            // If still not enough options, generate completely random decimals
            if (optionsSet.size < 5) {
                const randomDecimals = new Set<string>();
                while (randomDecimals.size < (5 - optionsSet.size)) {
                    const randomValue = Math.random() * 10; // 0 to 10 range
                    const randomStr = randomValue.toFixed(decimals);
                    if (randomStr !== correctStr && !optionsSet.has(randomStr) && !existingValues.has(randomValue)) {
                        randomDecimals.add(randomStr);
                        existingValues.add(randomValue);
                    }
                }
                randomDecimals.forEach(rand => optionsSet.add(rand));
            }
        } else {
            // Not a true decimal answer
            if (operator === '+' || operator === '-') {
                // Integer add/sub: generate integer options around the correct answer
                optionsSet.add(String(correctAnswer));
                const baseRange = Math.max(5, Math.ceil(Math.abs(correctAnswer) * 0.5));
                const min = Math.max(0, Math.floor(correctAnswer - baseRange));
                const max = Math.floor(correctAnswer + baseRange);

                while (optionsSet.size < 5) {
                    const rand = Math.floor(Math.random() * (max - min + 1)) + min;
                    if (rand !== correctAnswer) {
                        optionsSet.add(rand.toString());
                    }
                }
            } else {
                // Multiplication/Division with whole-number result: use digit-based generation
                optionsSet.add(String(correctAnswer));
                const digitCount = Math.abs(Math.trunc(correctAnswer)).toString().length;
                const min = digitCount === 1 ? 0 : Math.pow(10, digitCount - 1);
                const max = Math.pow(10, digitCount) - 1;

                while (optionsSet.size < 5) {
                    const rand = Math.floor(Math.random() * (max - min + 1)) + min;
                    if (rand !== correctAnswer) {
                        optionsSet.add(rand.toString());
                    }
                }
            }
        }
    } else {
        // For integer multiplication/division: use digit-based generation
        optionsSet.add(String(correctAnswer));
        const digitCount = Math.abs(Math.trunc(correctAnswer)).toString().length;
        const min = digitCount === 1 ? 0 : Math.pow(10, digitCount - 1);
        const max = Math.pow(10, digitCount) - 1;

        while (optionsSet.size < 5) {
            const rand = Math.floor(Math.random() * (max - min + 1)) + min;
            if (rand !== correctAnswer) {
                optionsSet.add(rand.toString());
            }
        }
    }

    // Shuffle options
    const optionsArr = Array.from(optionsSet).map((s) => Number(s));
    for (let i = optionsArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [optionsArr[i], optionsArr[j]] = [optionsArr[j], optionsArr[i]];
    }

    // Build MathQuestion array
    const mathQuestions: MathQuestion[] = optionsArr.map((num) => ({
        number: num,
        isCorrect: num === correctAnswer,
    }));
    return {
        questionData: {
            num1: parseFloat(operand1),
            num2: parseFloat(operand2),
            operator: operator,
            answer: correctAnswer,
            options: mathQuestions,
        },
        currentQuestion: {
            operand1: operand1,
            operand2: operand2,
            operator: operator,
            answer: String(correctAnswer),
            options: optionsArr.join(', '),
            fromRepeatPool: false,
        },
        multiverseQuestion: question,
    };
}

export function generateQuestionFromSelector(questionSelector: QuestionSelectorHelper): QuestionResult | null {
    const question = questionSelector.getNextQuestion();
    if (!question) {
        return null;
    }
    
    // Parse options string to number array
    const optionsArray = question.options 
        ? question.options.split(',').map((opt: string) => parseInt(opt.trim()))
        : [parseInt(question.answer)];
    
    const correctAnswer = parseInt(question.answer);
    
    // Create MathQuestion array where each option has isCorrect flag
    const mathQuestions: MathQuestion[] = optionsArray.map((option: number) => ({
        number: option,
        isCorrect: option === correctAnswer
    }));
    
    // Shuffle the answers array using Fisher-Yates algorithm
    for (let i = mathQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [mathQuestions[i], mathQuestions[j]] = [mathQuestions[j], mathQuestions[i]];
    }
    
    return {
        questionData: {
            num1: parseInt(question.operand1),
            num2: parseInt(question.operand2),
            operator: question.operator,
            answer: correctAnswer,
            options: mathQuestions
        },
        currentQuestion: question
    };
}