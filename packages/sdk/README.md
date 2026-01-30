# K8 Games SDK

This SDK provides tools and utilities for K8 Games.

## Question Bank System

The question bank system allows you to create and use question banks in your games. Question banks are collections of questions that can be used in various educational games.

### How to Use Question Banks

1. Import the question bank functions from the SDK:

```javascript
import { getRandomQuestion, formatQuestion, isCorrectAnswer } from '@k8-games/sdk';
```

2. Use the functions in your game:

```javascript
// Get a random question from a specific bank
const question = getRandomQuestion('2D_addition_upto_100');
if (!question) {
  console.error('Failed to load question');
  return;
}

// Format the question for display
const questionText = formatQuestion(question);
console.log(questionText); // e.g., "10 + 40 = ?"

// Check if a user's answer is correct
const userAnswer = 50;
const isCorrect = isCorrectAnswer(question, userAnswer);
console.log(isCorrect); // true or false
```

### Adding New Question Banks

To add a new question bank:

1. Create a CSV file in the `packages/sdk/src/question_bank` directory with the following format:

```
Operand 1,Operand 2,Answer
10,40,50
11,89,100
...
```

2. Run the build process to generate the TypeScript files:

```bash
pnpm run build
```

This will automatically generate TypeScript files from your CSV data using a JavaScript generator script.

### Naming Conventions

The generator script handles file names intelligently:

- If your CSV file starts with a number (e.g., `2D_addition_upto_100.csv`), the generated variable will be prefixed with `bank_` (e.g., `bank_2D_addition_upto_100`)
- Special characters in file names are replaced with underscores
- The original file name is preserved in the `name` property of the question bank

For example:
- `2D_addition_upto_100.csv` → `bank_2D_addition_upto_100` (variable name)
- `multiplication-table.csv` → `multiplication_table` (variable name)

### Available Question Banks

- `2D_addition_upto_100`: Addition problems with answers up to 100

## Development

### Building the SDK

```bash
pnpm run build
```

This will:
1. Generate TypeScript files from CSV data using the JavaScript generator script
2. Compile the TypeScript code

### Development Mode

```bash
pnpm run dev
```

This will watch for changes and rebuild automatically.

### Manually Generating Question Banks

If you need to generate question banks without building the entire SDK:

```bash
pnpm run generate-question-banks
```

This will run the JavaScript generator script to create TypeScript files from your CSV data. 