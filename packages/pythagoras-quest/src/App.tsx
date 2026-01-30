
import React from 'react';
import { GameProvider, useGameContext } from './context/GameContext';
import { AudioProvider } from './context/AudioContext';
import { TitleScreen } from './components/scenes/TitleScreen';
import { LoadingScene } from './components/scenes/LoadingScene';
import { IntroScene } from './components/scenes/IntroScene';
import { MainCharacterDialogue } from './components/scenes/MainCharacterDialogue';
import { InteractiveScene } from './components/scenes/InteractiveScene';
import { LibraryScene } from './components/scenes/LibraryScene';
import { MapScene } from './components/scenes/MapScene';
import { EndingScene } from './components/scenes/EndingScene';
import { ProgressBar } from './components/ui/ProgressBar';
import AudioControls from './components/AudioControls';
import { getSceneById, getNextScene, getPreviousScene } from './config/sceneFlow';
import LetterboxViewport from './components/layouts/LetterboxViewport';

const SceneRouter: React.FC = () => {
  const { state, setState } = useGameContext();
  
  const currentScene = getSceneById(state.currentSceneId);

  // Handle library-owned and map-owned interactive scenes not present in linear flow
  if (!currentScene && (
    state.currentSceneId === 'proofs-interactive' || 
    state.currentSceneId === 'challenge-interactive' ||
    state.currentSceneId === 'monochord-interactive-1' ||
    state.currentSceneId === 'monochord-interactive-2'
  )) {
    // Library-owned interactive scenes
    if (state.currentSceneId === 'monochord-interactive-1' || state.currentSceneId === 'monochord-interactive-2') {
      const sceneConfig = getSceneById(state.currentSceneId);
      if (sceneConfig) {
        return (
          <InteractiveScene
            key={state.currentSceneId}
            onComplete={() => {
              setState(s => {
                const questId = sceneConfig.questId!;
                const completed = !s.completedQuests.includes(questId)
                  ? [...s.completedQuests, questId]
                  : s.completedQuests;
                return { ...s, completedQuests: completed, currentSceneId: 'library' };
              });
            }}
            onBack={() => setState(s => ({ ...s, currentSceneId: 'library' }))}
            dialogueKey={sceneConfig.dialogueKey!}
            title={sceneConfig.title}
            questId={sceneConfig.questId}
          />
        );
      }
    }

    // Map-owned interactive scenes
    if (state.currentSceneId === 'proofs-interactive') {
      const qid = state.activeQuest as 'pebble' | 'pouring' | 'dissection' | undefined;
      const proofKeyMap: Record<string, string> = {
        pebble: 'pebbleProof',
        pouring: 'waterProof',
        dissection: 'dissectionProof'
      };
      const proofKey = qid ? proofKeyMap[qid] : undefined;
      const dynamicDialogueKey = proofKey ? `pythagoreanTheorem.${proofKey}` : 'pythagoreanTheorem';

      return (
        <InteractiveScene
          key={`proofs-${qid}`}
          onComplete={() => {
            setState(s => {
              const active = s.activeQuest;
              const completed = active && !s.completedQuests.includes(active)
                ? [...s.completedQuests, active]
                : s.completedQuests;
              return { ...s, completedQuests: completed, currentSceneId: 'map', activeQuest: undefined };
            });
          }}
          onBack={() => setState(s => ({ ...s, currentSceneId: 'map' }))}
          dialogueKey={dynamicDialogueKey}
          questId={qid}
        />
      );
    }

  if (state.currentSceneId === 'challenge-interactive') {
      const qid = state.activeQuest as 'ladder' | 'final' | undefined;
      const keyMap: Record<string, string> = {
        ladder: 'ladderProblem',
        final: 'finalChallenge'
      };
      const k = qid ? keyMap[qid] : undefined;
      const dynamicDialogueKey = k ? `interactiveScene.${k}` : 'challenge';

      return (
        <InteractiveScene
          onComplete={() => {
            setState(s => {
              const active = s.activeQuest;
              const completed = active && !s.completedQuests.includes(active)
                ? [...s.completedQuests, active]
                : s.completedQuests;
              const allProofsDone = ['pouring','dissection','pebble'].every(id => completed.includes(id));
              const allChallengesDone = ['ladder','final'].every(id => completed.includes(id));
              const goTo = (allProofsDone && allChallengesDone) ? 'ending' : 'map';
              return { ...s, completedQuests: completed, currentSceneId: goTo, activeQuest: undefined };
            });
          }}
          onBack={() => setState(s => ({ ...s, currentSceneId: 'map' }))}
          dialogueKey={dynamicDialogueKey}
          questId={qid}
        />
      );
    }
  }
  
  const handleSceneComplete = () => {
    // If we just completed the map, jump directly to ending in the main flow.
    if (state.currentSceneId === 'map') {
      setState(s => ({ ...s, currentSceneId: 'ending' }));
      return;
    }

    // Handle quest completion for interactive scenes
    const currentScene = getSceneById(state.currentSceneId);
    if (currentScene?.type === 'interactive' && currentScene.questId) {
      const questId = currentScene.questId;
      setState(s => {
        const completed = !s.completedQuests.includes(questId)
          ? [...s.completedQuests, questId]
          : s.completedQuests;
        
        // If this is a library-owned quest, return to library instead of next scene
        if (questId === 'monochord1' || questId === 'monochord2') {
          return { ...s, completedQuests: completed, currentSceneId: 'library' };
        }
        
        const nextScene = getNextScene(s.currentSceneId);
        const nextSceneId = nextScene ? nextScene.id : 'title';
        
        return { ...s, completedQuests: completed, currentSceneId: nextSceneId };
      });
      return;
    }

    const nextScene = getNextScene(state.currentSceneId);
    if (nextScene) {
      setState(s => ({ ...s, currentSceneId: nextScene.id }));
    } else {
      // Loop back to title or handle end of game
      setState(s => ({ ...s, currentSceneId: 'title' }));
    }
  };

  const handleSceneBack = () => {
    const previousScene = getPreviousScene(state.currentSceneId);
    
    if (previousScene) {
      setState(s => ({ ...s, currentSceneId: previousScene.id }));
    }
  };

  if (!currentScene) {
    return <div>Unknown scene: {state.currentSceneId}</div>;
  }

  switch (currentScene.type) {
    case 'loading':
      return <LoadingScene />;
    case 'title':
      return <TitleScreen onStart={() => setState(s => ({ ...s, currentSceneId: 'narrator' }))} />;
    case 'narrator':
      // Check if we might be returning to show last dialogue
      const isNarratorComingFromMap = state.sceneDialogueStates?.['narrator'] !== undefined && 
                                      state.sceneDialogueStates['narrator'] > 0;
      return <IntroScene onComplete={handleSceneComplete} onBack={handleSceneBack} startFromLast={isNarratorComingFromMap} />;
    case 'mainCharacter':
      // Check if we might be returning from the map scene to show last dialogue
      const isComingFromMap = state.sceneDialogueStates?.[currentScene.id] !== undefined && 
                              state.sceneDialogueStates[currentScene.id] > 0;
      return (
        <MainCharacterDialogue 
          onComplete={handleSceneComplete}
          onBack={handleSceneBack}
          dialogueKey={currentScene.dialogueKey!}
          startFromLast={isComingFromMap}
        />
      );
    case 'interactive': {
      // Special handling for proofs interactive routed from the map
      if (currentScene.id === 'proofs-interactive') {
        const qid = state.activeQuest as 'pebble' | 'pouring' | 'dissection' | undefined;
        const proofKeyMap: Record<string, string> = {
          pebble: 'pebbleProof',
          pouring: 'waterProof',
          dissection: 'dissectionProof'
        };
        const proofKey = qid ? proofKeyMap[qid] : undefined;
        const dynamicDialogueKey = proofKey ? `pythagoreanTheorem.${proofKey}` : (currentScene.dialogueKey || 'pythagoreanTheorem');

        return (
          <InteractiveScene
            onComplete={() => {
              // Mark quest complete and return to map
              setState(s => {
                const active = s.activeQuest;
                const completed = active && !s.completedQuests.includes(active)
                  ? [...s.completedQuests, active]
                  : s.completedQuests;
                return { ...s, completedQuests: completed, currentSceneId: 'map', activeQuest: undefined };
              });
            }}
            onBack={handleSceneBack}
            dialogueKey={dynamicDialogueKey}
            title={currentScene.title}
            questId={qid}
          />
        );
      }

      if (currentScene.id === 'challenge-interactive') {
        const qid = state.activeQuest as 'ladder' | 'final' | undefined;
        const keyMap: Record<string, string> = {
          ladder: 'ladderProblem',
          final: 'finalChallenge'
        };
        const k = qid ? keyMap[qid] : undefined;
        const dynamicDialogueKey = k ? `interactiveScene.${k}` : (currentScene.dialogueKey || 'challenge');

        return (
          <InteractiveScene
            key={`challenge-${qid}`}
            onComplete={() => {
              setState(s => {
                const active = s.activeQuest;
                const completed = active && !s.completedQuests.includes(active)
                  ? [...s.completedQuests, active]
                  : s.completedQuests;
                // If final, proceed to ending after returning to map
                const goTo = active === 'final' ? 'ending' : 'map';
                return { ...s, completedQuests: completed, currentSceneId: goTo, activeQuest: undefined };
              });
            }}
            onBack={handleSceneBack}
            dialogueKey={dynamicDialogueKey}
            title={currentScene.title}
            questId={qid}
          />
        );
      }

      // Special handling for library-owned monochord interactive scenes
      if (currentScene.id === 'monochord-interactive-1' || currentScene.id === 'monochord-interactive-2') {
        return (
          <InteractiveScene 
            key={currentScene.id}
            onComplete={handleSceneComplete}
            onBack={() => setState(s => ({ ...s, currentSceneId: 'library' }))}
            dialogueKey={currentScene.dialogueKey!}
            title={currentScene.title}
            questId={currentScene.questId}
          />
        );
      }

      return (
        <InteractiveScene 
          key={currentScene.id}
          onComplete={handleSceneComplete}
          onBack={handleSceneBack}
          dialogueKey={currentScene.dialogueKey!}
          title={currentScene.title}
          questId={currentScene.questId}
        />
      );
    }
    case 'library':
      return <LibraryScene onBack={handleSceneBack} />;
    case 'map':
      return <MapScene onComplete={handleSceneComplete} />;
    case 'ending':
      return <EndingScene onComplete={handleSceneComplete} />;
    default:
      return <div>Unknown scene type: {currentScene.type}</div>;
  }
};

const BASE_W = 1500;
const BASE_H = 900;

const App: React.FC = () => (
  <GameProvider>
    <AudioProvider>
      <LetterboxViewport width={BASE_W} height={BASE_H}>
        <AudioControls />
        <SceneRouter />
        <ProgressBar />
      </LetterboxViewport>
    </AudioProvider>
  </GameProvider>
);

export default App;
