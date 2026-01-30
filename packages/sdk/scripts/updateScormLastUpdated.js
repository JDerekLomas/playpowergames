#!/usr/bin/env node
// /*
//  Updates packages/sdk/src/data/scorm.json 'lastUpdated' for games touched in the commit.
//  Heuristics:
//  - Find staged files under packages/*/{src,public} and map to a gameName by package folder
//  - For each scorm entry whose gameName matches the package folder, set lastUpdated to today (YYYY-MM-DD)
//  - If no matching gameName is found, no-op
//  - Re-write scorm.json with pretty formatting and stage it
// */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getRepoRoot() {
  let dir = process.cwd();
  while (dir && dir !== path.parse(dir).root) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml')) || fs.existsSync(path.join(dir, '.git'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return process.cwd();
}

function getStagedFiles() {
  try {
    const out = execSync('git diff --cached --name-only', { encoding: 'utf8' });
    return out.split(/\r?\n/).filter(Boolean);
  } catch (e) {
    return [];
  }
}

function isoUtcNow() {
  return new Date().toISOString();
}

function main() {
  console.log('[scorm] Running updateScormLastUpdated pre-commit hook...');
  const root = getRepoRoot();
  const staged = getStagedFiles();
  console.log(`[scorm] Staged files: ${staged.length}`);
  if (staged.length === 0) {
    console.log('[scorm] No staged files. Skipping.');
    return;
  }

  // Collect package folders that changed
  const pkgDirs = new Set();
  for (const f of staged) {
    const m = f.match(/^packages\/([^/]+)\//);
    if (m) {
      const pkg = m[1];
      if (pkg !== 'sdk') pkgDirs.add(pkg);
    }
  }
  if (pkgDirs.size === 0) {
    console.log('[scorm] No changed packages under packages/* (excluding sdk). Skipping.');
    return;
  }
  console.log(`[scorm] Changed packages: ${Array.from(pkgDirs).join(', ')}`);

  const scormPath = path.join(root, 'packages', 'sdk', 'src', 'data', 'scorm.json');
  if (!fs.existsSync(scormPath)) {
    console.log(`[scorm] scorm.json not found at ${scormPath}. Skipping.`);
    return;
  }

  const json = JSON.parse(fs.readFileSync(scormPath, 'utf8'));
  const updatedIso = isoUtcNow();
  let changed = false;
  const updatedIds = [];
  const matchedIds = [];
  const upToDateIds = [];

  // Map package folder names to gameName matches
  const targetGames = new Set(pkgDirs);

  for (const [id, entry] of Object.entries(json)) {
    if (!entry || typeof entry !== 'object') continue;
    const gameName = entry.gameName;
    if (gameName && targetGames.has(gameName)) {
      matchedIds.push(id);
      entry.lastUpdated = updatedIso;
      changed = true;
      updatedIds.push(id);
    }
  }

  if (changed) {
    fs.writeFileSync(scormPath, JSON.stringify(json, null, 2) + '\n', 'utf8');
  console.log(`[scorm] Updated lastUpdated to ${updatedIso} for: ${updatedIds.join(', ')}`);
    try {
      const rel = path.relative(process.cwd(), scormPath);
      execSync(`git add "${rel}"`);
      console.log(`[scorm] Wrote and staged ${rel}`);
    } catch (e) {
      console.log('[scorm] Failed to stage scorm.json:', e?.message || e);
    }
  } else {
    if (matchedIds.length > 0) {
      console.log('[scorm] Matches found but no changes were necessary (unexpected).');
    } else {
      console.log('[scorm] No matching SCORM entries to update. No changes written.');
    }
  }
}

main();
