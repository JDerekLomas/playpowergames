export interface SceneConfig {
  id: string;
  type: 'loading' | 'title' | 'narrator' | 'mainCharacter' | 'interactive' | 'library' | 'map' | 'ending';
  dialogueKey?: string; // Key to look up dialogues in translation files
  title?: string; // For interactive scenes
  questId?: string; // For interactive scenes
}

export interface GameFlow {
  scenes: SceneConfig[];
}

// Main game flow configuration
export const gameFlow: GameFlow = {
  scenes: [
    {
      id: 'loading',
      type: 'loading'
    },
    {
      id: 'title',
      type: 'title'
    },
    {
      id: 'narrator',
      type: 'narrator'
    },
    {
      id: 'intro-dialogue',
      type: 'mainCharacter',
      dialogueKey: 'mainCharacterDialogue.intro'
    },
    {
      id: 'library',
      type: 'library'
    },
    {
      id: 'monochord-interactive-1',
      type: 'interactive',
      dialogueKey: 'interactiveScene.monochord1',
      title: 'Virtual Monochord',
      questId: 'monochord1'
    },
    {
      id: 'monochord-interactive-2',
      type: 'interactive',
      dialogueKey: 'interactiveScene.monochord2',
      title: 'Even and Odd Figurate Numbers',
      questId: 'monochord2'
    },
    {
      id: 'map',
      type: 'map'
    },
    {
      id: 'ending',
      type: 'ending'
    }
  ]
};

// Helper function to get scene by ID
export const getSceneById = (id: string): SceneConfig | undefined => {
  const scene = gameFlow.scenes.find(scene => scene.id === id);
  return scene;
};

// Helper function to get next scene
export const getNextScene = (currentSceneId: string): SceneConfig | undefined => {
  const currentIndex = gameFlow.scenes.findIndex(scene => scene.id === currentSceneId);
  const nextScene = currentIndex !== -1 && currentIndex < gameFlow.scenes.length - 1 
    ? gameFlow.scenes[currentIndex + 1] 
    : undefined;
  
  return nextScene;
};

// Helper function to get previous scene
export const getPreviousScene = (currentSceneId: string): SceneConfig | undefined => {
  const currentIndex = gameFlow.scenes.findIndex(scene => scene.id === currentSceneId);
  const previousScene = currentIndex > 0 
    ? gameFlow.scenes[currentIndex - 1] 
    : undefined;
  
  return previousScene;
};

// Helper function to get scene index
export const getSceneIndex = (sceneId: string): number => {
  return gameFlow.scenes.findIndex(scene => scene.id === sceneId);
};
