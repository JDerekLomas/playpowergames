import archiver from 'archiver';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import fs from 'fs';
import { sync } from 'glob';
import path from 'path';
import scormConfig from '../../packages/sdk/src/data/scorm.json' with { type: 'json' };

const SCORM_DIR = 'scorm';
const SCORM_BUILD_DIR = 'scorm_build';
const DIST_DIR = 'dist';
const TEMP_SCORM_DIR = 'temp';
const PACKAGES_DIR = 'packages';

// Get list of games from packages directory
const GAMES = fs.readdirSync(PACKAGES_DIR)
    .filter(dir => {
        const packagePath = path.join(PACKAGES_DIR, dir);
        const packageJsonPath = path.join(packagePath, 'package.json');
        
        // Check if it's a directory and has a package.json
        if (!fs.statSync(packagePath).isDirectory() || !fs.existsSync(packageJsonPath)) {
            return false;
        }
        
        // Exclude non-game packages
        const excludedPackages = ['sdk', 'website', 'dashboard', 'game-template'];
        return !excludedPackages.includes(dir);
    });

// Get list of variants from scorm config
const VARIANTS = Object.keys(scormConfig);
const VARIANT_CONFIGS = scormConfig;

const GET_DIST_DIR = (gameId) => path.join(PACKAGES_DIR, gameId, DIST_DIR);
// Move SCORM build outside of dist to avoid recursive inclusion
const GET_SCORM_BUILD_ROOT = () => path.join('temp_scorm_builds');
const GET_SCORM_DIR = (variantId, lang) => path.join(GET_SCORM_BUILD_ROOT(), `${variantId}_${lang}`);

function createManifest(variantId, lang) {
    const templatePath = path.join('scripts', 'scorm', 'imsmanifest.template.xml');
    let manifestContent = fs.readFileSync(templatePath, 'utf-8');
    
    const config = VARIANT_CONFIGS[variantId];
    
    // Use language-specific title and description
    const title = lang === 'es' ? config.titleEs : config.title;
    const description = lang === 'es' ? config.descriptionEs : config.description;
    
    manifestContent = manifestContent
        .replace(/{{IDENTIFIER}}/g, `${variantId}_${lang}`)
        .replace(/{{TITLE}}/g, title)
        .replace(/{{DESCRIPTION}}/g, description)
    
    return manifestContent;
}

function updateManifest(manifestPath, tempScormDir) {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    
    const parser = new XMLParser({
        ignoreAttributes: false,
        preserveOrder: true,
    });
    
    const manifest = parser.parse(manifestContent);
    
    // Scan the temp directory instead of dist to avoid including SCORM builds
    const files = sync('**/*', {
        cwd: tempScormDir,
        nodir: true,
    });
    
    const resourceElement = manifest[1].manifest[2].resources[0].resource;
    if (resourceElement) {
        resourceElement.push(...files.map((file) => ({
            file: [],
            ':@': {
                '@_href': file,
            },
        })));
    }
    
    const builder = new XMLBuilder({
        format: true,
        preserveOrder: true,
        ignoreAttributes: false,
    });
    
    const updatedManifest = builder.build(manifest);
    fs.writeFileSync(manifestPath, updatedManifest);
}

function copyDistExcludingScorm(srcDir, destDir) {
    // Create destination directory
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }
    
    // Get all items in source directory
    const items = fs.readdirSync(srcDir);
    
    for (const item of items) {
        const srcPath = path.join(srcDir, item);
        const destPath = path.join(destDir, item);
        
        // Skip SCORM-related directories
        if (item === SCORM_BUILD_DIR || item === SCORM_DIR) {
            console.log(`Skipping ${item} directory to avoid recursive inclusion`);
            continue;
        }
        
        const stats = fs.statSync(srcPath);
        
        if (stats.isDirectory()) {
            copyDistExcludingScorm(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

function createScormPackage(variantId, lang) {
    console.log(`Creating SCORM package for variant ${variantId} (${lang})...`);
    
    const variantConfig = VARIANT_CONFIGS[variantId];
    const gameId = variantConfig.gameName || variantId;
    
    // Check if dist directory exists
    if (!fs.existsSync(GET_DIST_DIR(gameId))) {
        console.error(`Dist directory not found for game ${gameId} (variant: ${variantId}). Please build the game first.`);
        return;
    }
    
    // Create temp directory with variant and language-specific name
    const tempScormDir = `${TEMP_SCORM_DIR}_${variantId}_${lang}`;
    
    // Clean up any existing temp directory
    if (fs.existsSync(tempScormDir)) {
        fs.rmSync(tempScormDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempScormDir, { recursive: true });
    
    console.log(`Copying dist to temp scorm directory (excluding SCORM directories)...`);
    copyDistExcludingScorm(GET_DIST_DIR(gameId), tempScormDir);
    
    // Inject variant config as JSON file at the root with language setting
    if (variantConfig.configs) {
        const configWithLang = {
            ...variantConfig.configs,
            lang: lang
        };
        const configJsonPath = path.join(tempScormDir, 'config.json');
        fs.writeFileSync(configJsonPath, JSON.stringify(configWithLang, null, 2));
        console.log(`Injected config.json for variant ${variantId} with lang=${lang}`);
    } else {
        // If no configs exist, create one with just the language
        const configJsonPath = path.join(tempScormDir, 'config.json');
        fs.writeFileSync(configJsonPath, JSON.stringify({ lang: lang }, null, 2));
        console.log(`Injected config.json for variant ${variantId} with lang=${lang}`);
    }
    
    // Create scorm build directory (outside of dist)
    const scormBuildDir = GET_SCORM_DIR(variantId, lang);
    if (fs.existsSync(scormBuildDir)) {
        fs.rmSync(scormBuildDir, { recursive: true, force: true });
    }
    fs.mkdirSync(scormBuildDir, { recursive: true });
    
    console.log(`Copying temp scorm directory to scorm build directory...`);
    fs.cpSync(tempScormDir, scormBuildDir, { recursive: true });
    
    console.log(`Copying scormxsd to scorm build directory...`);
    fs.cpSync(
        path.join('scripts', 'scorm', 'scormxsd'), 
        path.join(scormBuildDir, 'scormxsd'), 
        { recursive: true }
    );
    
    // Create manifest
    const manifestContent = createManifest(variantId, lang);
    const manifestPath = path.join(scormBuildDir, 'imsmanifest.xml');
    fs.writeFileSync(manifestPath, manifestContent);
    updateManifest(manifestPath, scormBuildDir);
    
    // Create scorm output directory
    const scormOutputDir = path.join(GET_DIST_DIR(gameId), SCORM_DIR);
    if (!fs.existsSync(scormOutputDir)) {
        fs.mkdirSync(scormOutputDir, { recursive: true });
    }
    
    // Create zip package with variant and language-specific name
    const packageName = `${variantId}_${lang}.zip`;
    const outputPath = path.join(scormOutputDir, packageName);
    
    // Remove existing package if it exists
    if (fs.existsSync(outputPath)) {
        fs.rmSync(outputPath, { force: true });
    }
    
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', () => {
        const sizeInMB = (archive.pointer() / (1024 * 1024)).toFixed(2);
        console.log(`${variantId}_${lang} SCORM package created successfully (${sizeInMB} MB)`);
        
        // Clean up temp and build directories
        fs.rmSync(tempScormDir, { recursive: true, force: true });
        fs.rmSync(scormBuildDir, { recursive: true, force: true });
    });
    
    archive.on('error', (err) => {
        console.error(`Error creating ${variantId}_${lang} SCORM package:`, err);
        // Clean up on error
        fs.rmSync(tempScormDir, { recursive: true, force: true });
        fs.rmSync(scormBuildDir, { recursive: true, force: true });
        throw err;
    });
    
    archive.pipe(output);
    archive.directory(scormBuildDir, false);
    archive.finalize();
}

function validateGameId(gameId) {
    return GAMES.includes(gameId);
}

function cleanupScormBuilds() {
    const scormBuildRoot = GET_SCORM_BUILD_ROOT();
    if (fs.existsSync(scormBuildRoot)) {
        console.log('Cleaning up temporary SCORM build directories...');
        fs.rmSync(scormBuildRoot, { recursive: true, force: true });
    }
}

// Main execution
const targetId = process.argv[2];

if (targetId === 'launcher') {
    console.log('Skipping scorm build for launcher');
    process.exit(0);
}

// Clean up any existing SCORM build directories
cleanupScormBuilds();

if (targetId) {
    // Then check if it's a game ID to build all variants for that game
    if (validateGameId(targetId)) {
        const gameVariants = VARIANTS.filter(variantId => {
            const config = VARIANT_CONFIGS[variantId];
            return config.gameName === targetId || (!config.gameName && variantId === targetId);
        });
        
        if (gameVariants.length > 0) {
            console.log(`Building SCORM packages for all variants of game ${targetId}: ${gameVariants.join(', ')}`);
            gameVariants.forEach(variantId => {
                // Create packages for both English and Spanish
                createScormPackage(variantId, 'en');
                createScormPackage(variantId, 'es');
            });
        } else {
            console.log(`No variants found for game ${targetId}. Creating default packages...`);
            createScormPackage(targetId, 'en');
            createScormPackage(targetId, 'es');
        }
    } 
    else {
        console.error(`Invalid target ID: ${targetId}. Valid variants are: ${VARIANTS.join(', ')}`);
        console.error(`Valid games are: ${GAMES.join(', ')}`);
        process.exit(1);
    }
} else {
    console.log(`Building SCORM packages for all variants: ${VARIANTS.join(', ')}`);
    VARIANTS.forEach(variantId => {
        // Create packages for both English and Spanish
        createScormPackage(variantId, 'en');
        createScormPackage(variantId, 'es');
    });
}

// Final cleanup
process.on('exit', cleanupScormBuilds);
process.on('SIGINT', () => {
    cleanupScormBuilds();
    process.exit(0);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
    cleanupScormBuilds();
    process.exit(1);
});
