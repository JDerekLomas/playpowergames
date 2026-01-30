# K8 Games

A collection of games built with Phaser.js and Vite, sharing a common SDK for game development.

## Project Structure

```
k8-games/
├── packages/
│   ├── sdk/              # Shared game development SDK
│   │   ├── src/
│   │   │   ├── core/     # Core game classes
│   │   │   └── utils/    # Utility classes
│   │   └── package.json
│   └── game-template/    # Template for new games
│       ├── src/
│       │   ├── scenes/   # Game scenes
│       │   ├── assets/   # Game assets
│       │   └── main.ts   # Game entry point
│       └── package.json
└── package.json
```

## Features

- Shared SDK with common game elements:
  - Base game scene class
  - Asset loading utilities
  - Input management
  - Audio management
  - Common game configuration

- Game template with:
  - Vite setup for fast development
  - TypeScript support
  - Hot module replacement
  - Asset handling
  - Basic game structure

## Getting Started

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Create a new game:
   ```bash
   cp -r packages/game-template packages/my-game
   cd packages/my-game
   ```

3. Update the game configuration in `src/main.ts`

4. Start development:
   ```bash
   pnpm dev
   ```

## Development

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm lint` - Run linter

## SDK Usage

The SDK provides several utilities for game development:

### GameScene
Base scene class with common functionality:
```typescript
import { GameScene } from '@k8-games/sdk';

export class MyScene extends GameScene {
  create() {
    // Your scene code
  }
}
```

### AssetLoader
Load game assets easily:
```typescript
const loader = new AssetLoader(this);
loader.loadAssets([
  {
    key: 'player',
    path: '/assets/player.png',
    type: 'image'
  }
]);
```

### InputManager
Handle keyboard input:
```typescript
const input = new InputManager(this);
input.setupInputs([
  {
    key: 'jump',
    keys: ['SPACE'],
    onPress: () => {
      // Handle jump
    }
  }
]);
```

### AudioManager
Manage game audio:
```typescript
const audio = new AudioManager(this);
audio.play({
  key: 'background',
  volume: 0.5,
  loop: true
});
``` 