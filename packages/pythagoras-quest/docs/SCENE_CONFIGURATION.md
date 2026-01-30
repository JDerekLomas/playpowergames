# Scene Flow and Dialogue Configuration Guide

This guide explains how to configure scenes and dialogues in the Pythagoras Quest game.

## Architecture Overview

The game uses a configurable scene flow system that separates scene types from their specific instances and dialogue content. This prevents dialogue merging between scenes of the same type.

### Key Files

1. **`/src/config/sceneFlow.ts`** - Main scene flow configuration
2. **`/public/locales/en.json`** - English translations
3. **`/public/locales/es.json`** - Spanish translations
4. **`/src/App.tsx`** - Scene router that uses the configuration

## Scene Flow Configuration

### `/src/config/sceneFlow.ts`

This file defines the order and properties of all scenes in the game:

```typescript
export const gameFlow: GameFlow = {
  scenes: [
    {
      id: 'title',
      type: 'title'
    },
    {
      id: 'intro-dialogue',
      type: 'mainCharacter',
      dialogueKey: 'mainCharacterDialogue.intro'
    },
    {
      id: 'monochord-interactive',
      type: 'interactive',
      dialogueKey: 'interactiveScene',
      title: 'Virtual Monochord',
      questId: 'monochord'
    },
    {
      id: 'geometry-dialogue',
      type: 'mainCharacter',
      dialogueKey: 'mainCharacterDialogue.geometry'
    }
  ]
};
```

### Scene Configuration Properties

- **`id`**: Unique identifier for the scene instance
- **`type`**: Scene component type (`title`, `narrator`, `mainCharacter`, `interactive`, `map`, `ending`)
- **`dialogueKey`**: Path to dialogue content in translation files (for scenes with dialogues)
- **`title`**: Display title (for interactive scenes)
- **`questId`**: Quest identifier (for interactive scenes)

## Translation Structure

### Main Character Dialogue Structure

```json
{
  "mainCharacterDialogue": {
    "intro": {
      "myia": {
        "name": "Myia",
        "dialogues": [
          "First dialogue text...",
          "Second dialogue text...",
          "Third dialogue text..."
        ]
      }
    },
    "geometry": {
      "myia": {
        "name": "Myia",
        "dialogues": [
          "Geometry introduction dialogue..."
        ]
      }
    }
  }
}
```

### Interactive Scene Structure

```json
{
  "interactiveScene": {
    "title": "Virtual Monochord",
    "myia": {
      "name": "Myia",
      "dialogues": [
        "Interactive dialogue 1...",
        "Interactive dialogue 2...",
        "Interactive dialogue 3..."
      ]
    }
  }
}
```

## Adding New Scenes and Dialogues

### 1. Add Scene to Flow Configuration

Edit `/src/config/sceneFlow.ts`:

```typescript
export const gameFlow: GameFlow = {
  scenes: [
    // ... existing scenes ...
    {
      id: 'new-dialogue-scene',
      type: 'mainCharacter',
      dialogueKey: 'mainCharacterDialogue.newTopic'
    },
    {
      id: 'new-interactive-scene',
      type: 'interactive',
      dialogueKey: 'newInteractiveScene',
      title: 'New Interactive Activity',
      questId: 'newQuest'
    }
  ]
};
```

### 2. Add Translations

#### English (`/public/locales/en.json`):

```json
{
  "mainCharacterDialogue": {
    "newTopic": {
      "myia": {
        "name": "Myia",
        "dialogues": [
          "New topic introduction...",
          "Additional explanation..."
        ]
      }
    }
  },
  "newInteractiveScene": {
    "title": "New Interactive Activity",
    "myia": {
      "name": "Myia",
      "dialogues": [
        "Try this new activity...",
        "Observe what happens..."
      ]
    }
  }
}
```

#### Spanish (`/public/locales/es.json`):

```json
{
  "mainCharacterDialogue": {
    "newTopic": {
      "myia": {
        "name": "Myia",
        "dialogues": [
          "Introducción al nuevo tema...",
          "Explicación adicional..."
        ]
      }
    }
  },
  "newInteractiveScene": {
    "title": "Nueva Actividad Interactiva",
    "myia": {
      "name": "Myia",
      "dialogues": [
        "Prueba esta nueva actividad...",
        "Observa lo que sucede..."
      ]
    }
  }
}
```

## Scene Types

### Main Character Dialogue (`mainCharacter`)
- Displays Myia character on left, dialogue on right
- Requires `dialogueKey` pointing to dialogue content
- Supports multiple dialogue instances with different keys

### Interactive Scene (`interactive`)
- Split layout with interactive component on left, dialogue on right
- Requires `dialogueKey`, `title`, and `questId`
- Fixed title position at top center of left panel

### Other Scene Types
- `title`: Title screen (no configuration needed)
- `narrator`: Intro scene (no configuration needed)
- `map`: Map scene (no configuration needed)
- `ending`: Ending scene (no configuration needed)

## Benefits of This System

1. **No Dialogue Merging**: Each scene instance has its own dialogue key
2. **Configurable Flow**: Easy to reorder scenes or add new ones
3. **Multilingual Support**: Automatic language switching based on selected locale
4. **Type Safety**: TypeScript interfaces ensure correct configuration
5. **Reusable Components**: Same component types can be used multiple times with different content

## Example: Adding a Third Main Character Scene

1. **Update scene flow**:
```typescript
{
  id: 'final-wisdom',
  type: 'mainCharacter',
  dialogueKey: 'mainCharacterDialogue.conclusion'
}
```

2. **Add English translations**:
```json
"mainCharacterDialogue": {
  "conclusion": {
    "myia": {
      "name": "Myia",
      "dialogues": [
        "You have learned much, apprentice...",
        "Remember these lessons..."
      ]
    }
  }
}
```

3. **Add Spanish translations**:
```json
"mainCharacterDialogue": {
  "conclusion": {
    "myia": {
      "name": "Myia",
      "dialogues": [
        "Has aprendido mucho, aprendiz...",
        "Recuerda estas lecciones..."
      ]
    }
  }
}
```

The system will automatically handle the new scene without any code changes to the components themselves.
