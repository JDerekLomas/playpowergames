import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths relative to this script (packages/multiverse-launcher/src/scripts)
const launcherRoot = path.resolve(__dirname, '..', '..');
const repoRoot = path.resolve(launcherRoot, '..', '..');
const gamesJsonPath = path.resolve(launcherRoot, 'src', 'games.json');
const launcherPublicGamesDir = path.resolve(launcherRoot, 'public', 'games');

function readGamesList() {
  if (!fs.existsSync(gamesJsonPath)) {
    throw new Error(`games.json not found at ${gamesJsonPath}`);
  }
  const raw = fs.readFileSync(gamesJsonPath, 'utf-8');
  const data = JSON.parse(raw);
  const unique = new Set();
  for (const key of Object.keys(data)) {
    const arr = Array.isArray(data[key]) ? data[key] : [];
    for (const game of arr) unique.add(game);
  }
  return Array.from(unique);
}

function buildGame(packageName) {
  console.log(`\n=== Building ${packageName} ===`);
  // Delegate to root workspace command: `pnpm build <package>`
  execSync(`pnpm build ${packageName}`, { stdio: 'inherit', cwd: repoRoot });
}

function copyDistToLauncher(packageName) {
  const srcDist = path.resolve(repoRoot, 'packages', packageName, 'dist');
  const destDir = path.resolve(launcherPublicGamesDir, packageName);

  if (!fs.existsSync(srcDist)) {
    throw new Error(`Dist folder not found for ${packageName} at ${srcDist}. Did the build succeed?`);
  }

  fs.mkdirSync(launcherPublicGamesDir, { recursive: true });
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
  }

  fs.cpSync(srcDist, destDir, { recursive: true });
  console.log(`Copied ${srcDist} -> ${destDir}`);
}

function run() {
  const games = readGamesList();
  if (games.length === 0) {
    console.log('No games listed in games.json. Nothing to do.');
    return;
  }

  console.log(`Found ${games.length} game(s): ${games.join(', ')}`);

  for (const game of games) {
    buildGame(game);
    copyDistToLauncher(game);
  }

  console.log('\nAll games built and copied to multiverse-launcher/public/games');
}

try {
  run();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}


