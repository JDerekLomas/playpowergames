#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const gameName = process.argv[2];
if (!gameName) {
    console.error('Please provide a game name');
    console.log('Usage: pnpm create <game-name>');
    process.exit(1);
}

const templateDir = path.join(__dirname, '../packages/game-template');
const gameDir = path.join(__dirname, '../packages', gameName);

// Copy template to new game directory
fs.cpSync(templateDir, gameDir, { recursive: true });

// Update package.json name
const packageJsonPath = path.join(gameDir, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
packageJson.name = `@k8-games/${gameName}`;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 4));

console.log(`
Game "${gameName}" created successfully!

Next steps:
1. cd packages/${gameName}
2. pnpm install
3. pnpm dev

Happy coding! 🎮
`); 