const fs = require('fs');
const path = require('path');

const sdkComponentsPath = path.resolve(__dirname, '../src/assets/components');
const packagesDir = path.resolve(__dirname, '../../');

function copyFolderSync(src, dest) {
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyFolderSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function copyAssets() {
  const packages = fs.readdirSync(packagesDir).filter(
    (pkg) =>
      pkg !== 'sdk' &&
      pkg !== 'dashboard' &&
      pkg !== 'game-template' &&
      pkg !== 'pythagoras-quest' &&
      fs.existsSync(path.join(packagesDir, pkg, 'public', 'assets'))
  );

  for (const pkg of packages) {
    const targetComponentsPath = path.join(
      packagesDir,
      pkg,
      'public',
      'assets',
      'components'
    );
    console.log(`Replacing components in ${pkg}...`);
    copyFolderSync(sdkComponentsPath, targetComponentsPath);
  }
  console.log('All components assets replaced successfully!');
}

copyAssets(); 