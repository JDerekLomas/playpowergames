# 🎮 Pythagoras Quest Game – Frontend Architecture (React + TypeScript)

## 📂 Project Structure

```
src/
  components/
    common/
      DialogueBox.tsx       // Reusable dialogue component
      CharacterAvatar.tsx   // Optional, for NPCs
      Button.tsx
    layouts/
      SingleView.tsx        // Dialogue-only layout
      SplitView.tsx         // Dialogue + interactive area layout
    scenes/
      TitleScreen.tsx
      IntroScene.tsx
      MapScene.tsx
      OutroScene.tsx
      quests/
        QuestContainer.tsx   // Wrapper for quest flow
        Quest1.tsx
        Quest2.tsx
        ...
  game/
    quests/
      questData.ts           // Quest config (dialogues, quest type, game comp)
      introData.ts           // Intro dialogues
      outroData.ts           // Outro dialogues
  hooks/
    useDialogue.ts           // Custom hook for dialogue progression
  context/
    GameContext.tsx          // Tracks global game state
  types/
    dialogue.ts              // Dialogue & quest-related types
  App.tsx
  index.tsx

```

---

## 🔑 Core Concepts

### 1. **Game Context**

Holds global state for navigation and progress.

```tsx
interface GameState {
  currentScene: "title" | "intro" | "map" | "quest" | "outro";
  activeQuest?: string;
  completedQuests: string[];
}

const GameContext = createContext<{
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
} | null>(null);

```

---

### 2. **Dialogue System**

A reusable dialogue box for all scenes and quests.

```tsx
interface Dialogue {
  speaker: string;
  text: string;
  avatar?: string;
}

<DialogueBox dialogues={questData.dialogues} onComplete={nextStep} />

```

Managed with `useDialogue` hook for stepping through lines.

---

### 3. **Quest Config**

Quests are defined as **data-driven configs** with optional game components.

```tsx
// questData.ts
export const quests = {
  quest1: {
    id: "quest1",
    title: "Finding the Sacred Proof",
    type: "split", // "single" | "split"
    dialogues: [...],
    gameComponent: ProofMiniGame, // optional React comp
  },
  quest2: {
    id: "quest2",
    title: "Measuring Shadows",
    type: "single",
    dialogues: [...],
  },
};

```

---

### 4. **Layouts**

- **SingleView** → Dialogue only
- **SplitView** → Dialogue + Game area

```tsx
<SplitView
  game={<ProofMiniGame />}
  dialogue={<DialogueBox dialogues={dialogues} onComplete={finishQuest} />}
/>

```

---

### 5. **Scenes Flow**

1. **TitleScreen**
2. **IntroScene**
3. **MapScene**
4. **Quest (Single or Split view)**
5. **Back to MapScene**
6. **OutroScene (after all quests complete)**

---

### 6. **Adding a New Quest**

1. Add quest config in `questData.ts`
2. Create optional mini-game component (if needed)
3. Quest automatically loads via `QuestContainer`
4. Add quest ID to `MapScene` available quests

---

## ✅ Benefits

- **Scalable** → Add quests by editing data, not core logic
- **Reusable** → Shared dialogue + layouts
- **Separation of Concerns** → Scenes vs quests vs UI components
- **Centralized State** → Easier progress tracking & navigation