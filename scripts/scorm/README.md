# SCORM Package Builder

This directory contains the SCORM 1.2 package builder for K8 Games. The system automatically generates SCORM-compliant packages for educational games that can be deployed to Learning Management Systems (LMS).

## Overview

The SCORM builder creates packages that include:
- Game files from the `dist` directory
- SCORM 1.2 manifest (`imsmanifest.xml`)
- Required XSD schema files
- Compressed ZIP package ready for LMS upload

## Files

- `build-scorm.js` - Main build script
- `scorm.json` - Game configuration file with titles, descriptions, and identifiers
- `imsmanifest.template.xml` - SCORM manifest template
- `scormxsd/` - Required SCORM 1.2 schema files

## Usage

### Build SCORM package for a specific game:
```bash
npm run build-scorm <game-name>
```

Example:
```bash
npm run build-scorm battleship-numberline
```

### Build SCORM packages for all games:
```bash
npm run build-scorm
```

## Prerequisites

1. The game must be built first (have a `dist` directory)
2. The game must be listed in the `packages/` directory
3. The game should have a configuration in `scorm.json` (optional - defaults will be generated)

## Output

SCORM packages are created in:
```
packages/<game-name>/dist/scorm/package.zip
```

## Configuration

Add game configurations to `scorm.json`:

```json
{
  "game-name": {
    "identifier": "unique-scorm-identifier",
    "title": "Display Title",
    "description": "Game description for LMS"
  }
}
```

If no configuration is provided, defaults are generated based on the game name.

## Automated Deployment

SCORM packages are automatically built during CI/CD deployment:

- **Production**: Triggered on push to `main` branch
- **Staging**: Triggered on push to `development` branch
- **Manual**: Can be triggered manually via GitHub Actions

The build process:
1. Builds the game
2. Generates SCORM package
3. Uploads both game and SCORM package to S3
4. Invalidates CloudFront cache

## SCORM 1.2 Compliance

The generated packages are compliant with SCORM 1.2 specification and include:
- Proper manifest structure
- Required metadata
- File references for all game assets
- SCO (Shareable Content Object) configuration

## Troubleshooting

### "Dist directory not found"
Make sure to build the game first:
```bash
cd packages/<game-name>
npm run build
```

### "Invalid game ID"
Ensure the game exists in the `packages/` directory and is not in the excluded list (sdk, website, dashboard).

### Module import errors
The project uses ES modules. Ensure `"type": "module"` is set in the root `package.json`. 