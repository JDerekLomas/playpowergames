import React, { createContext, useContext, useState } from 'react';

export interface GameState {
  currentSceneId: string;
  activeQuest?: string;
  completedQuests: string[];
  interactiveResponses?: Record<string, any>;
  sceneDialogueStates?: Record<string, number>; // Track last dialogue index for each scene
  libraryDialogueShown?: Record<string, boolean>; // Track which library dialogues have been shown
  mapDialogueShown?: Record<string, boolean>; // Track which map dialogues have been shown
  isChoiceDoorOpen: boolean; // Whether the choice door is open
  language?: string; // Current language setting
  sfxFlags?: {
    doorsUnlockedPlayed?: boolean;
  };
  completedEvents?: string[]; // Track completed interactive events
  lastProgressIndex: number; // Track progress through main storyline
  fadingBadges?: string[]; // Track badges that should fade out after animation
}

interface GameContextType {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  setInteractiveResponses?: (updater: (prev: Record<string, any>) => Record<string, any>) => void;
}

const GameContext = createContext<GameContextType | null>(null);

export const useGameContext = () => {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('GameContext not found');
  return ctx;
};

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<GameState>({
  currentSceneId: 'loading',
    completedQuests: [],
    interactiveResponses: {},
    sceneDialogueStates: {},
    sfxFlags: { doorsUnlockedPlayed: false },
    completedEvents: [],
    isChoiceDoorOpen: false,
    lastProgressIndex: -1,
    fadingBadges: [],
  });

  const setInteractiveResponses = (updater: (prev: Record<string, any>) => Record<string, any>) => {
    setState(prevState => ({
      ...prevState,
      interactiveResponses: updater(prevState.interactiveResponses || {}),
    }));
  };

  return (
    <GameContext.Provider value={{ state, setState, setInteractiveResponses }}>
      {children}
    </GameContext.Provider>
  );
};
