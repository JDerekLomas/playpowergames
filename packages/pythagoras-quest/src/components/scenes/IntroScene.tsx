import React, { useState } from 'react';
import { DialogueBox } from '../common/DialogueBox';
import { SceneTransition } from '../common/SceneTransition';
import { useTranslations } from '../../hooks/useTranslations';
import { useAudioManager } from '../../context/AudioContext';
import audioConfig from '../../config/audioConfig.json';
import { useGameContext } from '../../context/GameContext';
import { useSceneAnnouncement } from '../../hooks/useSceneAnnouncement';

interface IntroSceneProps {
  onComplete: () => void;
  onBack?: () => void;
  startFromLast?: boolean;
}

export const IntroScene: React.FC<IntroSceneProps> = ({ onComplete, onBack, startFromLast = false }) => {
  const { t, currentLanguage } = useTranslations();
  const { state, setState } = useGameContext();
  const { playDialog, pauseDialog } = useAudioManager();
  
  // Announce scene change to screen readers
  useSceneAnnouncement('intro');
  
  // Initialize dialogue index from saved state or 0
  const savedIndex = state.sceneDialogueStates?.[state.currentSceneId] || 0;
  const initialIndex = startFromLast ? savedIndex : 0;
  const [dialogueIndex, setDialogueIndex] = useState(initialIndex);

  const narratorData = t('narratorScene', true) as any;
  const narratorDialogues = narratorData?.dialogues || [];
  
  const dialogues = narratorDialogues.map((text: string) => ({
    speaker: 'Narrator',
    text: text
  }));

  const handleNext = () => {
    pauseDialog();
    if (dialogueIndex < dialogues.length - 1) {
      const newIndex = dialogueIndex + 1;
      setDialogueIndex(newIndex);
      // Save current dialogue state
      setState(s => ({
        ...s,
        sceneDialogueStates: {
          ...s.sceneDialogueStates,
          [s.currentSceneId]: newIndex
        }
      }));
    } else {
      // Clear dialogue state when completing scene
      setState(s => ({
        ...s,
        sceneDialogueStates: {
          ...s.sceneDialogueStates,
          [s.currentSceneId]: 0
        }
      }));
      onComplete();
    }
  };

  const handleBack = () => {
    pauseDialog();
    if (dialogueIndex > 0) {
      const newIndex = dialogueIndex - 1;
      setDialogueIndex(newIndex);
      // Save current dialogue state
      setState(s => ({
        ...s,
        sceneDialogueStates: {
          ...s.sceneDialogueStates,
          [s.currentSceneId]: newIndex
        }
      }));
    } else if (onBack) {
      // Reset dialogue state to start from beginning when going back
      setState(s => ({
        ...s,
        sceneDialogueStates: {
          ...s.sceneDialogueStates,
          [s.currentSceneId]: 0
        }
      }));
      // Go back to previous scene if at first dialogue
      onBack();
    }
  };

  const isFirstDialogue = dialogueIndex === 0;

  const audioBase = (audioConfig as any)?.narratorScene?.dialogues ?? 'narratorScene_dialogues';

  const handleTypingStart = () => {
    // Don't start audio for first dialogue - handleContentPhaseStart will handle it
    if (audioBase && dialogueIndex > 0) {
      void playDialog(`assets/audios/dialogues/${currentLanguage}/${audioBase}_${dialogueIndex}.mp3`);
    }
  };

  const handleContentPhaseStart = () => {
    // Start audio when content phase begins (good for first dialogue)
    if (dialogueIndex === 0 && audioBase) {
      void playDialog(`assets/audios/dialogues/${currentLanguage}/${audioBase}_${dialogueIndex}.mp3`);
    }
  };

  return (
    <SceneTransition 
      sceneType="intro"
      className="narrator-scene"
      onContentPhaseStart={handleContentPhaseStart}
    >
      <div className="narrator-dialogue-container">
        <div style={{ width: '100%' }}>
          <DialogueBox
            dialogues={dialogues}
            currentIndex={dialogueIndex}
            onComplete={onComplete}
            onTypingStart={handleTypingStart}
            disableTyping={true}
            className="narrator-minimal"
            speakerHeadingLevel={1}
          />
        </div>
        <div className="dialogue-nav-buttons">
          <button 
            className="dialogue-nav-btn back" 
            onClick={handleBack}
            disabled={isFirstDialogue && !onBack}
          >
            {t('navigation.back')}
          </button>
          <button 
            className="dialogue-nav-btn next" 
            onClick={handleNext}
          >
            {t('navigation.next')}
          </button>
        </div>
      </div>
    </SceneTransition>
  );
};
