import { execSync } from 'child_process';

// Get the game name from command line arguments
const gameName = process.argv[2];
const BLACKLISTED_PACKAGES = ['sdk', 'game-template', 'dashboard', 'array-architects', 'multiverse', 'bunny-rescue', 'slingshot', 'analytics-dashboard', 'analytics-infra'];

if (!gameName) {
    console.error('Please provide a game name. Usage: pnpm build <game-name>');
    process.exit(1);
}

try {
    console.log(`Building game: ${gameName}`);
    
    // Build the specific game
    execSync(`pnpm --filter=${gameName} run build`, { 
        stdio: 'inherit',
        cwd: process.cwd()
    });

    // If the game is in the blacklist, skip the SCORM build
    if (BLACKLISTED_PACKAGES.includes(gameName)) {
        console.log(`Skipping SCORM build for ${gameName}`);
        process.exit(0);
    }
    
    // Build SCORM package for the game
    execSync(`pnpm build-scorm ${gameName}`, { 
        stdio: 'inherit',
        cwd: process.cwd()
    });
    
    console.log(`Successfully built ${gameName} with SCORM package`);
} catch (error) {
    console.error(`Failed to build ${gameName}:`, error.message);
    process.exit(1);
} 