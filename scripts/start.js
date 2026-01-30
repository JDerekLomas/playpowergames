#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get game name from command line args
const gameName = process.argv[2];

if (!gameName) {
  console.error('Please provide a game name. Usage: pnpm start <game_name>');
  listAvailableGames();
  process.exit(1);
}

// Get all available games
const packagesDir = path.join(__dirname, '..', 'packages');
const allGames = fs.readdirSync(packagesDir)
  .filter(dir => 
    dir !== 'sdk' && 
    fs.statSync(path.join(packagesDir, dir)).isDirectory()
  );

// Find best match using fuzzy search
const bestMatch = findBestMatch(gameName, allGames);

if (!bestMatch) {
  console.error(`No matching game found for "${gameName}". Available games:`);
  listAvailableGames();
  process.exit(1);
}

console.log(`Starting game: ${bestMatch}`);
try {
  // Run the commands to start the game
  execSync('pnpm --filter sdk run build', { stdio: 'inherit' });
  execSync('pnpm i', { stdio: 'inherit' });
  execSync(`pnpm --filter ${bestMatch} run dev`, { stdio: 'inherit' });
} catch (error) {
  console.error(`Failed to start game: ${error.message}`);
  process.exit(1);
}

// Function to find best fuzzy match
function findBestMatch(input, options) {
  // Convert input to lowercase for case-insensitive matching
  const lowercaseInput = input.toLowerCase();
  
  // Perfect match
  const perfectMatch = options.find(opt => opt.toLowerCase() === lowercaseInput);
  if (perfectMatch) return perfectMatch;
  
  // Exact start match
  const startMatch = options.find(opt => opt.toLowerCase().startsWith(lowercaseInput));
  if (startMatch) return startMatch;
  
  // Contains match
  const containsMatch = options.find(opt => opt.toLowerCase().includes(lowercaseInput));
  if (containsMatch) return containsMatch;
  
  // Acronym match (e.g., "alsh" for "alien-shooter")
  for (const opt of options) {
    // Create acronym from option name (using first letter of each word or after hyphen)
    const words = opt.split(/[-\s_]/);
    const acronym = words.map(word => word[0].toLowerCase()).join('');
    if (acronym === lowercaseInput) return opt;
    
    // Partial acronym match
    if (acronym.includes(lowercaseInput)) return opt;
    
    // Check if input matches first N characters of acronym
    if (lowercaseInput.length < acronym.length && 
        acronym.startsWith(lowercaseInput)) {
      return opt;
    }
  }
  
  // Initials match (e.g., "as" for "alien-shooter")
  for (const opt of options) {
    const words = opt.split(/[-\s_]/);
    const initials = words.map(word => word[0].toLowerCase()).join('');
    if (initials === lowercaseInput) return opt;
  }

  // More flexible fuzzy match with consecutive characters
  for (const opt of options) {
    const lowerOpt = opt.toLowerCase();
    let inputIdx = 0;
    let optIdx = 0;
    
    // Try to find all characters of input in the option in order
    while (inputIdx < lowercaseInput.length && optIdx < lowerOpt.length) {
      if (lowercaseInput[inputIdx] === lowerOpt[optIdx]) {
        inputIdx++;
      }
      optIdx++;
    }
    
    // If we found all input characters in order
    if (inputIdx === lowercaseInput.length) {
      return opt;
    }
  }
  
  return null;
}

function listAvailableGames() {
  console.log('Available games:');
  allGames.forEach(game => {
    console.log(`- ${game}`);
  });
} 