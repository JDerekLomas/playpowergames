import React, { useState, useRef, useEffect, useCallback } from 'react';
import { preloadImages } from '../../utils/preloadImages';
import { DialogueBox } from '../common/DialogueBox';
import { SceneTransition } from '../common/SceneTransition';
import { Modal } from '../common/Modal';
import TheVirtualMonochord from './quests/TheVirtualMonochord';
import EvenOddFigurate from './quests/EvenOddFigurate';
import LadderProblem from './quests/the-ladder-problem';
import TheFinalChallenge from './quests/the-final-challenge';
import PythagoreanTheoremProofs from './quests/PythagoreanTheoremProofs';
import { InteractiveCelebration } from './InteractiveCelebration';
import { useTranslations } from '../../hooks/useTranslations';
import { useInteractiveEventListener } from '../../hooks/useInteractiveEventListener';
import { getRequiredEvents, areAllEventsCompleted } from '../../utils/eventEmitter';
import type { Dialogue } from '../../types/dialogue';
import { useAudioManager } from '../../context/AudioContext';
import audioConfig from '../../config/audioConfig.json';
import { useSceneAnnouncement } from '../../hooks/useSceneAnnouncement';

interface InteractiveSceneProps {
  onComplete: () => void;
  onBack?: () => void;
  dialogueKey: string;
  title?: string;
  questId?: string;
}

// Extended component interface to include _preload method
interface InteractiveSceneComponent extends React.FC<InteractiveSceneProps> {
  _preload: () => Promise<void>;
}

// Static preload method for InteractiveScene assets
const preloadAssets = () =>
  preloadImages([
    'assets/interactive_bg.png',
    'assets/figurate_bg.png',
    'assets/monochord_bg.png',
    'assets/allProofs_bg.png',
    'assets/ladder_bg.png',
    'assets/finalChallenge_bg.png',
    'assets/myia.png',
    'assets/myia_avatar.png',
    'assets/buttons/disabled.png',
  ]);

export const InteractiveScene: InteractiveSceneComponent = ({
  onComplete,
  onBack,
  dialogueKey,
  title = 'Interactive Scene',
  questId = 'monochord',
}) => {
  const { t, currentLanguage } = useTranslations();
  const { playDialog, pauseDialog } = useAudioManager();
  
  // Announce scene change to screen readers
  useSceneAnnouncement('interactive');
  
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [questionStates, setQuestionStates] = useState<
    Record<number, { answer: string | number; isCorrect: boolean }>
  >({});
  const [hasAnswers, setHasAnswers] = useState<Record<number, boolean>>({});

  // Initialize event listener to track interactive events
  const { completedEvents } = useInteractiveEventListener();
  let dialoguesData: any;
  let speaker = 'Myia';
  let dialogueTexts: string[] = [];
  let sceneTitle = title;

  // Try to get the nested translation data

  try {
    // Use the updated t function with returnObject parameter
    const translationData = t(dialogueKey, true) as any;

    if (translationData && typeof translationData === 'object' && translationData.myia?.dialogues) {
      dialoguesData = translationData;
      speaker = dialoguesData?.myia?.name || 'Myia';
      dialogueTexts = dialoguesData?.myia?.dialogues || [];
      sceneTitle = dialoguesData?.title || title;
    } else {
      // Translation lookup failed
    }
  } catch (error) {
    // Translation lookup error
  }

  // Build dialogues according to key type; proofs use dedicated keys
  let dialogues: Dialogue[];
  if (dialogueTexts.length > 0) {
    dialogues = dialogueTexts.map((text: string, index: number) => {
      const dialogue: Dialogue = {
        speaker,
        text,
        avatar: 'assets/myia.png',
      };

      // Check if this dialogue has questions in the translation data
      if (dialoguesData?.myia?.questions && dialoguesData.myia.questions[index]) {
        dialogue.question = dialoguesData.myia.questions[index];
      }

      return dialogue;
    });
  } else if (dialogueKey.startsWith('pythagoreanTheorem.')) {
    const parts = dialogueKey.split('.');
    const proofKey = parts[1];
    const base = t(`pythagoreanTheorem.${proofKey}`, true) as any;
    const titleFromLocale = base?.title || sceneTitle;
    sceneTitle = titleFromLocale;
    const desc = base?.description || 'Learn this proof.';
    dialogues = [{ speaker: 'Myia', text: desc, avatar: 'assets/myia.png' }];
  } else {
    dialogues = [
      {
        speaker: 'Myia',
        text: 'Interactive dialogue 1',
        avatar: 'assets/myia.png',
      },
      {
        speaker: 'Myia',
        text: 'Interactive dialogue 2',
        avatar: 'assets/myia.png',
      },
    ];
  }

  // --- Dynamic stacking state ---
  const refsMap = useRef<Record<number, HTMLDivElement | null>>({});
  const [offsets, setOffsets] = useState<number[]>([]);
  const [dynamicGap, setDynamicGap] = useState<number>(12);
  const rightPanelRef = useRef<HTMLDivElement | null>(null);
  const measuringRef = useRef<boolean>(false);
  const lastPanelHeightRef = useRef<number>(0);
  const lastViewportHeightRef = useRef<number>(window.innerHeight);

  // Navigation handlers (restored)
  const handleNext = () => {
    // Check if current dialogue has a question that needs to be answered correctly
    const currentDialogue = dialogues[dialogueIndex];
    if (currentDialogue?.question) {
      const questionState = questionStates[dialogueIndex];
      if (!questionState || !questionState.isCorrect) {
        // Don't proceed if question is not answered correctly
        return;
      }
    }

    pauseDialog();
    if (dialogueIndex < dialogues.length - 1) {
      const newIndex = dialogueIndex + 1;
      setDialogueIndex(newIndex);

      // Dispatch dialogue progression event for components to listen to
      window.dispatchEvent(
        new CustomEvent('dialogue_progress', {
          detail: {
            dialogueIndex: newIndex,
            questId: questId,
            dialogueKey: dialogueKey,
          },
        }),
      );
    } else {
      setShowCelebration(true);
    }
  };

  const handleQuestionAnswer = (_: number, answer: string | number, isCorrect: boolean) => {
    // Since we're passing single-dialogue arrays to DialogueBox, the dialogueIdx will be 0
    // We need to map it back to the actual dialogue index
    setQuestionStates((prev) => ({
      ...prev,
      [dialogueIndex]: { answer, isCorrect },
    }));

    // Auto-advance if answer is correct
    if (isCorrect) {
      setTimeout(() => {
        if (dialogueIndex < dialogues.length - 1) {
          const newIndex = dialogueIndex + 1;
          setDialogueIndex(newIndex);

          // Dispatch dialogue progression event
          window.dispatchEvent(
            new CustomEvent('dialogue_progress', {
              detail: {
                dialogueIndex: newIndex,
                questId: questId,
                dialogueKey: dialogueKey,
              },
            }),
          );
        } else {
          setShowCelebration(true);
        }
      }, 1000); // Give user time to see the check mark
    }
  };

  const handleAnswerChange = (_: number, hasAnswer: boolean) => {
    // Since we're passing single-dialogue arrays, dialogueIdx will be 0
    // Map it back to the actual dialogue index
    setHasAnswers((prev) => ({
      ...prev,
      [dialogueIndex]: hasAnswer,
    }));

    // If user starts typing a new answer after an incorrect submission, clear the previous question state
    // This allows them to resubmit
    const currentQuestionState = questionStates[dialogueIndex];
    if (currentQuestionState && !currentQuestionState.isCorrect && hasAnswer) {
      // Clear the previous incorrect submission state so they can try again
      setQuestionStates((prev) => {
        const newState = { ...prev };
        delete newState[dialogueIndex];
        return newState;
      });
    }
  };

  const handleSubmitAnswer = () => {
    // Trigger the submit on the currently active question
    if ((window as any).triggerQuestionSubmit) {
      (window as any).triggerQuestionSubmit();
    }
  };
  const handleBack = () => {
    pauseDialog();
    if (dialogueIndex > 0) {
      setDialogueIndex((d) => {
        const newIndex = d - 1;
        void playDialog(`assets/audios/dialogues/${currentLanguage}/${audioBase}_${newIndex}.mp3`);

        // Dispatch dialogue progression event for backward navigation
        window.dispatchEvent(
          new CustomEvent('dialogue_progress', {
            detail: {
              dialogueIndex: newIndex,
              questId: questId,
              dialogueKey: dialogueKey,
            },
          }),
        );

        return newIndex;
      });
    } else if (onBack) {
      onBack();
    }
  };
  const handleCelebrationNext = () => onComplete();
  const handleCelebrationBack = () => {
    setShowCelebration(false);
    refsMap.current = {};
  };
  const isFirstDialogue = dialogueIndex === 0;

  const audioBase = (() => {
    const section = dialogueKey.split('.')[1];
    const fromConfig = (audioConfig as any)?.interactiveScene?.[section]?.myia_dialogues;
    if (typeof fromConfig === 'string') return fromConfig;
    if (dialogueKey.startsWith('pythagoreanTheorem.')) {
      const proofKey = dialogueKey.split('.')[1];
      return `pythagoreanTheorem_${proofKey}_M_D`;
    }
    return `${dialogueKey.replace(/\./g, '_')}_myia_dialogues`;
  })();

  const handleTypingStart = () => {
    // Don't start audio for first dialogue - handleContentPhaseStart will handle it
    if (dialogueIndex > 0) {
      void playDialog(`assets/audios/dialogues/${currentLanguage}/${audioBase}_${dialogueIndex}.mp3`);
    }
  };

  // Handle automatic triggers when dialogue advances (for monochord final challenge)
  useEffect(() => {
    const dialoguesData = t(dialogueKey, true) as any;
    const events = dialoguesData?.myia?.events;

    if (events && events[dialogueIndex.toString()]) {
      const eventId = events[dialogueIndex.toString()];

      // Special handling for final challenge - trigger automatically when dialogue audio finishes
      if (eventId === 'monochord1_challenge_completed') {
        // This event means the dialogue is waiting for challenge completion
        // Trigger the challenge start automatically
        const triggerChallenge = () => {
          window.dispatchEvent(
            new CustomEvent('monochord_dialogue_action', {
              detail: {
                action: 'start_final_challenge',
                delay: 100, // Minimal delay
              },
            }),
          );
        };

        // Trigger after dialogue audio finishes - MUCH longer delay
        const timer = setTimeout(triggerChallenge, 8000); // 8 seconds to ensure dialogue is completely done

        return () => clearTimeout(timer);
      }
    }
  }, [dialogueIndex, dialogueKey, t]);

  // Dispatch initial dialogue state on component mount
  useEffect(() => {
    // Dispatch initial dialogue progression event
    window.dispatchEvent(
      new CustomEvent('dialogue_progress', {
        detail: {
          dialogueIndex: dialogueIndex,
          questId: questId,
          dialogueKey: dialogueKey,
        },
      }),
    );
  }, []); // Only run once on mount

  const handleContentPhaseStart = () => {
    // Start audio when content phase begins (good for first dialogue)
    if (dialogueIndex === 0) {
      void playDialog(`assets/audios/dialogues/${currentLanguage}/${audioBase}_${dialogueIndex}.mp3`);
    }
  };

  const measure = useCallback(() => {
    if (measuringRef.current) return;
    measuringRef.current = true;

    const count = dialogueIndex + 1;
    const heights: number[] = [];
    for (let i = 0; i < count; i++) {
      const idx = dialogueIndex - i; // newest first
      const el = refsMap.current[idx];
      heights.push(el ? el.getBoundingClientRect().height : 0);
    }

    const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize || '16');
    const baseBottomPx = 2 * rootFont; // keep a consistent bottom baseline
    const panelHeight = rightPanelRef.current?.getBoundingClientRect().height || window.innerHeight;
    const panelWidth = rightPanelRef.current?.getBoundingClientRect().width || window.innerWidth;
    // Gap grows MUCH more aggressively as height shrinks (reference 900)
    // At 900px -> 10px gap, at 650px -> 85px gap, at 500px -> 130px gap
    const referenceHeight = 900;
    const baseGap = 0;
    const heightDiff = Math.max(0, referenceHeight - panelHeight);
    let computedGap = baseGap + heightDiff * 0.3; // Much more aggressive scaling
    // Mild width modulation (narrow screens little bigger gap)
    if (panelWidth < 900) computedGap *= 1.1;
    else if (panelWidth > 1400) computedGap *= 0.9;
    computedGap = Math.min(200, Math.max(15, computedGap));
    // Round to whole numbers for cleaner logs
    computedGap = Math.round(computedGap);
    const gapForLayout = computedGap + 5; // use computed gap directly for immediate layout

    // Always log on resize when viewport height changed or gap changed
    const viewportChanged = Math.abs(window.innerHeight - lastViewportHeightRef.current) > 0.5;
    if (dynamicGap !== computedGap || viewportChanged) {
      lastViewportHeightRef.current = window.innerHeight;
    }

    const newOffsets: number[] = [];
    let cumulative = baseBottomPx;
    for (let i = 0; i < heights.length; i++) {
      newOffsets.push(cumulative);
      cumulative += heights[i] + (i < heights.length - 1 ? gapForLayout : 0);
    }
    const mapped: number[] = new Array(dialogueIndex + 1).fill(0);
    for (let i = 0; i < newOffsets.length; i++) {
      const idx = dialogueIndex - i; // map back to original indices
      mapped[idx] = newOffsets[i];
    }
    setOffsets(mapped);

    // Update state after offsets are set to trigger re-render with new gap
    if (dynamicGap !== computedGap) {
      setDynamicGap(computedGap);
    }

    const panelHeightChanged = Math.abs(panelHeight - lastPanelHeightRef.current) > 0.5;
    if (panelHeightChanged) {
      lastPanelHeightRef.current = panelHeight;
    }

    measuringRef.current = false;
    // Re-measure on next frame if any zero heights (late rendering)
    if (heights.some((h) => h === 0)) {
      requestAnimationFrame(() => {
        measuringRef.current = false;
        measure();
      });
    }
  }, [dialogueIndex, dynamicGap]);

  // Unified effect for measurement + resize observers
  useEffect(() => {
    measure();
    const ro = new ResizeObserver(() => {
      measuringRef.current = false;
      measure();
    });
    if (rightPanelRef.current) ro.observe(rightPanelRef.current);
    Object.values(refsMap.current).forEach((el) => {
      if (el) ro.observe(el);
    });
    const onResize = () => {
      measuringRef.current = false;
      setTimeout(() => measure(), 16); // Delay measure to allow layout to settle
    };
    window.addEventListener('resize', onResize);
    const raf = requestAnimationFrame(() => measure());
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
    };
  }, [dialogueIndex, showCelebration, measure]);

  // Background selection: proofs use allProofs background, monochord uses specific ones
  const isProof = questId === 'pebble' || questId === 'pouring' || questId === 'dissection';
  const isLadder = questId === 'ladder';
  const isFinal = questId === 'final';
  const bgClass = isProof
    ? 'interactive-scene proofs-bg'
    : isLadder
    ? 'interactive-scene ladder-bg'
    : isFinal
    ? 'interactive-scene final-bg'
    : questId === 'monochord2'
    ? 'interactive-scene figurate-bg'
    : questId === 'monochord1'
    ? 'interactive-scene monochord-bg'
    : 'interactive-scene';

  // Show celebration screen if dialogue is complete
  if (showCelebration) {
    return (
      <SceneTransition
        sceneType="interactive"
        className="interactive-scene"
        backgroundClassName={bgClass.replace('interactive-scene', '').trim()}
      >
        <InteractiveCelebration questId={questId} onNext={handleCelebrationNext} onBack={handleCelebrationBack} />
      </SceneTransition>
    );
  }

  return (
    <SceneTransition
      sceneType="interactive"
      className="interactive-scene"
      backgroundClassName={bgClass.replace('interactive-scene', '').trim()}
      onContentPhaseStart={handleContentPhaseStart}
    >
      <div className="interactive-split-container">
        <div className="interactive-left" role="region" aria-label="Interactive Content">
          <div className="interactive-left-title">
            <div className="title-section">
              <h1>{sceneTitle}</h1>
            </div>
            <div className="help-info-section">
              <button
                className="help-btn"
                onClick={() => setShowHelpModal(true)}
                aria-label={t('interactiveScene.helpAria')}
              />
              <button
                className="info-btn"
                onClick={() => setShowInfoModal(true)}
                aria-label={t('interactiveScene.infoAria')}
              />
            </div>
          </div>
          {/* Render appropriate interactive content */}
          <div className="interactive-left-body">
            {isProof ? (
              <PythagoreanTheoremProofs
                questId={questId}
                interaction={{
                  translations: {
                    pebbleProof: t('pythagoreanTheorem.pebbleProof', true),
                    waterProof: t('pythagoreanTheorem.waterProof', true),
                    dissectionProof: t('pythagoreanTheorem.dissectionProof', true),
                  },
                }}
              />
            ) : questId === 'monochord2' ? (
              <EvenOddFigurate />
            ) : isLadder ? (
              <LadderProblem />
            ) : isFinal ? (
              <TheFinalChallenge />
            ) : (
              <TheVirtualMonochord questId={questId} interaction={{ translations: t }} />
            )}
          </div>
        </div>
        <div className="interactive-right" style={{ position: 'relative' }} ref={rightPanelRef} role="region" aria-label="Dialogue">
          {/* Dynamic stacking: measure each dialogue's height and compute bottom offsets so newest stays at bottom */}
          {/* refsMap stores DOM refs for each dialogue index */}
          {/* computeOffsets stores calculated bottom offsets in px */}
          {Array.from({ length: dialogueIndex + 1 }, (_, i) => {
            const index = dialogueIndex - i; // newest first
            const bottomPx =
              offsets[index] ?? 2 * parseFloat(getComputedStyle(document.documentElement).fontSize || '16');
            return (
              <div
                key={index}
                ref={(el) => {
                  refsMap.current[index] = el;
                }}
                className={`interactive-bottom-container ${index !== dialogueIndex ? 'non-current' : ''}`}
                style={{
                  position: 'absolute',
                  bottom: `${bottomPx}px`,
                  left: '45%',
                  transform: 'translateX(-50%)',
                  maxWidth: 'min(560px, calc(100% - 60px))',
                  minHeight: index === dialogueIndex ? '140px' : '0px',
                }}
                role="article"
                aria-label={`Dialogue ${index + 1}`}
                aria-hidden={index !== dialogueIndex}
                tabIndex={index === dialogueIndex ? undefined : -1}
              >
                {/* Dynamic Border Elements - Hidden from screen readers */}
                <div className="border-left" aria-hidden="true"></div>
                <div className="border-right" aria-hidden="true"></div>
                <div className="border-corner-tl" aria-hidden="true"></div>
                <div className="border-corner-tr" aria-hidden="true"></div>
                <div className="border-corner-bl" aria-hidden="true"></div>
                <div className="border-corner-br" aria-hidden="true"></div>

                <div className="interactive-header">
                  <img src="assets/myia_avatar.png" alt="" aria-hidden="true" className="interactive-avatar" />
                  <h3 className="interactive-character-name">Myia</h3>
                </div>
                <div className="interactive-bottom-content">
                  <DialogueBox
                    dialogues={[dialogues[index]]}
                    currentIndex={0}
                    onComplete={onComplete}
                    onTypingStart={handleTypingStart}
                    disableTyping={true}
                    showOnlyCurrent={true}
                    className="narrator-minimal interactive-dialogue-only"
                    onQuestionAnswer={handleQuestionAnswer}
                    questionStates={{ 0: questionStates[index] }}
                    onAnswerChange={handleAnswerChange}
                  />
                </div>
                {/* Only show navigation buttons on the current (newest) dialogue container */}
                {index === dialogueIndex && (
                  <nav className="dialogue-nav-buttons" role="navigation" aria-label={t('common.dialogueNavAria')}>
                    <button
                      className="dialogue-nav-btn back"
                      onClick={handleBack}
                      disabled={isFirstDialogue && !onBack}
                    >
                      {t('navigation.back')}
                    </button>
                    {(() => {
                      const currentDialogue = dialogues[dialogueIndex];
                      const hasQuestion = currentDialogue?.question;
                      const questionState = questionStates[dialogueIndex];
                      const isQuestionAnsweredCorrectly = questionState?.isCorrect === true;
                      const hasUserAnswer = hasAnswers[dialogueIndex] === true;

                      // Check if this dialogue requires events to be completed first
                      // Compute required events for this dialogue index
                      let requiredEvents = getRequiredEvents(dialoguesData?.myia?.events, dialogueIndex);
                      // For ladder quest, gate each of the first 6 dialogue indices on quiz step completion
                      if (questId === 'ladder' && dialogueIndex >= 0 && dialogueIndex <= 5) {
                        requiredEvents = [...requiredEvents, `ladder_step_${dialogueIndex}_completed`];
                      }
                      const allEventsCompleted = areAllEventsCompleted(completedEvents, requiredEvents);

                      // If events are required but not completed, show disabled button
                      if (requiredEvents.length > 0 && !allEventsCompleted) {
                        return (
                          <button
                            className="dialogue-nav-btn next disabled"
                            disabled={true}
                            title={`Complete the required interactions first`}
                            style={{
                              backgroundImage: "url('assets/buttons/disabled.png')",
                              backgroundRepeat: 'no-repeat',
                              cursor: 'not-allowed',
                            }}
                          >
                            {t('navigation.next')}
                          </button>
                        );
                      }

                      if (hasQuestion) {
                        if (isQuestionAnsweredCorrectly) {
                          // Question has been answered correctly - show Next button
                          return (
                            <button className="dialogue-nav-btn next" onClick={handleNext}>
                              {t('navigation.next')}
                            </button>
                          );
                        } else {
                          // Question not answered correctly yet - show Submit button
                          return (
                            <button
                              className={`dialogue-nav-btn next ${!hasUserAnswer ? 'disabled' : ''}`}
                              disabled={!hasUserAnswer}
                              onClick={handleSubmitAnswer}
                            >
                              {t('navigation.submit')}
                            </button>
                          );
                        }
                      } else {
                        // No question - show regular Next button
                        return (
                          <button className="dialogue-nav-btn next" onClick={handleNext}>
                            {t('navigation.next')}
                          </button>
                        );
                      }
                    })()}
                  </nav>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Help and Info Modals */}
      <Modal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        title={t(`interactive.${questId}.help.title`)}
        content={t(`interactive.${questId}.help.content`)}
        type="help"
      />
      <Modal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        title={t(`interactive.${questId}.info.title`)}
        content={t(`interactive.${questId}.info.content`)}
        type="info"
      />
    </SceneTransition>
  );
};

// Assign the static _preload method
InteractiveScene._preload = preloadAssets;
