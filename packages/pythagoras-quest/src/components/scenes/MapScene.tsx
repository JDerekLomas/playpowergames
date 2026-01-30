import React, { useState, useEffect } from "react";
import { preloadImages } from "../../utils/preloadImages";
// quest titles now from locales
import { useGameContext } from "../../context/GameContext";
import { MyiaSprite } from "../common/MyiaSprite";
import type { MyiaAnimationType } from "../common/MyiaSprite";
import { useTranslations } from "../../hooks/useTranslations";
import { useAudioManager } from "../../context/AudioContext"; // Add this import
import { DialogueBox } from '../common/DialogueBox';
import audioConfig from '../../config/audioConfig.json';
import { useSceneAnnouncement } from '../../hooks/useSceneAnnouncement';
// Overlay and in-place quest components removed for challenges; now routing to interactive scene

// Overlay-based UI removed; quests route to InteractiveScene

// ===== MYIA SPAWN POINT CONFIGURATION =====
// New default spawn point - secondary position for shorter animations
const MYIA_SPAWN_POINT = {
    left: "40%",
    top: "300px", // Secondary position is now the default
};

interface MapSceneProps {
    onComplete?: () => void;
}

// Extended component interface to include _preload method
interface MapSceneComponent extends React.FC<MapSceneProps> {
    _preload: () => Promise<void>;
}

// Static preload method for MapScene assets
const preloadAssets = () =>
    preloadImages([
        "assets/narrator_bg.png",
        "assets/check.png",
        "assets/choice_door_1.png",
        "assets/choice_door_2.png",
        "assets/choice_door_3.png",
        "assets/choice_door_4.png",
        "assets/library/library_title_en.png",
        "assets/library/library_title_es.png",
    ]);

// Bottom text/scroll removed; no TypingText needed

export const MapScene: MapSceneComponent = ({}) => {
    const { state, setState } = useGameContext();
    const { t, currentLanguage } = useTranslations();
    const { playSfx, playDialog, pauseDialog } = useAudioManager(); // Add dialogue audio functions
    
    // Announce scene change to screen readers
    useSceneAnnouncement('map');
    
    const [myiaPosition, setMyiaPosition] = useState(MYIA_SPAWN_POINT);
    const [myiaAnimation, setMyiaAnimation] =
        useState<MyiaAnimationType>("idle");
    const [movementClass, setMovementClass] = useState("");
    const [isFlipped, setIsFlipped] = useState(false);
    const [doorFrameNum, setDoorFrameNum] = useState(
        state.isChoiceDoorOpen ? 4 : 1
    ); // For alternating door frames

    // Animation lock state to prevent overlapping interactions
    const [isAnimating, setIsAnimating] = useState(false);
    const [activeQuest, setActiveQuest] = useState<string | null>(null);

  // Dialogue state management
  const [showDialogue, setShowDialogue] = useState(false);
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [disableTransition, setDisableTransition] = useState(false);

  // Proof ids that count toward unlocking the doors
  const proofIds = ['pouring', 'dissection', 'pebble'];
  const anyProofDone = proofIds.some(id => state.completedQuests.includes(id));
  const challengeIds = ['ladder','final'];
  const anyChallengesDone = challengeIds.some(id => state.completedQuests.includes(id));
  // Can proceed to ending when at least one proof and one challenge are done
  const canProceed = anyProofDone && anyChallengesDone;

  // Check if we should show dialogue
  const currentMapDialogue = state.mapDialogueShown || {};
  const shouldShowInitialDialogue = !currentMapDialogue['initial'];
  const shouldShowProofCompleteDialogue = anyProofDone && !currentMapDialogue['proofCompleted'] && !shouldShowInitialDialogue;

  // Show dialogue based on state
  useEffect(() => {
    if (shouldShowInitialDialogue) {
      setShowDialogue(true);
      setDialogueIndex(0);
    } else if (shouldShowProofCompleteDialogue) {
      setShowDialogue(true);
      setDialogueIndex(0);
    }
  }, [shouldShowInitialDialogue, shouldShowProofCompleteDialogue]);

  // Dialogue handling functions
  const handleDialogueNext = () => {
    pauseDialog();
    const dialogueData = getDialogueData();
    
    if (dialogueIndex < dialogueData.length - 1) {
      // Move to next dialogue
      const newIndex = dialogueIndex + 1;
      setDialogueIndex(newIndex);
      
      // Play next audio if available
      const audioBase = shouldShowInitialDialogue ? 
        (audioConfig as any)?.map?.initial ?? null :
        (audioConfig as any)?.map?.proofCompleted ?? null;
      
      if (audioBase) {
        void playDialog(`assets/audios/dialogues/${currentLanguage}/${audioBase}_${newIndex}.mp3`);
      }
    } else {
      // Complete the dialogue sequence
      handleDialogueComplete();
    }
  };

  const handleDialogueComplete = () => {
    pauseDialog();
    // Disable transition temporarily to prevent animation
    setDisableTransition(true);
    
    // Reset Myia position to spawn point without animation
    setMyiaPosition(MYIA_SPAWN_POINT);
    setMyiaAnimation('idle');
    setIsFlipped(false);
    
    // Mark appropriate dialogue as shown
    if (shouldShowInitialDialogue) {
      setState(s => ({ 
        ...s, 
        mapDialogueShown: { 
          ...(s.mapDialogueShown || {}), 
          initial: true 
        } 
      }));
    } else if (shouldShowProofCompleteDialogue) {
      setState(s => ({ 
        ...s, 
        mapDialogueShown: { 
          ...(s.mapDialogueShown || {}), 
          proofCompleted: true 
        } 
      }));
    }
    
    setShowDialogue(false);
    setDialogueIndex(0);
    
    // Re-enable transition after a brief delay
    setTimeout(() => {
      setDisableTransition(false);
    }, 50);
  };

  const handleTypingStart = () => {
    // Get appropriate audio based on dialogue state
    const audioBase = shouldShowInitialDialogue ? 
      (audioConfig as any)?.map?.initial ?? null :
      (audioConfig as any)?.map?.proofCompleted ?? null;
    
    if (audioBase) {
      void playDialog(`assets/audios/dialogues/${currentLanguage}/${audioBase}_${dialogueIndex}.mp3`);
    }
  };

  const getDialogueData = () => {
    if (shouldShowInitialDialogue) {
      return [
        {
          speaker: 'Myia',
          text: t('map.dialogue.initial.message1'),
          avatar: 'assets/myia.png'
        },
        {
          speaker: 'Myia',
          text: t('map.dialogue.initial.message2'),
          avatar: 'assets/myia.png'
        }
      ];
    } else if (shouldShowProofCompleteDialogue) {
      return [
        {
          speaker: 'Myia',
          text: t('map.dialogue.proofCompleted'),
          avatar: 'assets/myia.png'
        }
      ];
    }
    return [];
  };

    // Play door unlock sound only once per session when doors first unlock
    useEffect(() => {
        if (anyProofDone && !state.sfxFlags?.doorsUnlockedPlayed) {
            playSfx("door_open_sfx");
            setState((s) => ({
                ...s,
                sfxFlags: { ...(s.sfxFlags || {}), doorsUnlockedPlayed: true },
            }));
        }
    }, [anyProofDone, state.sfxFlags, playSfx, setState]);

    const handleBack = () => {
        // Go back to library scene
        setState((s) => ({ ...s, currentSceneId: "library" }));
    };

    const handleNext = () => {
  if (!canProceed) return; // Guard: shouldn't happen if button disabled
  // Also guard against ongoing animations or an active quest selection
  if (isAnimating || activeQuest) return;
  setState((s) => ({ ...s, currentSceneId: "ending" }));
    };

    const startQuest = (qid: string) => {
        // Prevent multiple simultaneous animations
        if (isAnimating) return;

        setIsAnimating(true);
        setActiveQuest(qid);
        setMyiaAnimation("walking");

        // Define movement pathways for each quest - shorter animations (2-3 seconds)
        if (qid === "pouring") {
            // Path 1: Short left movement only
            setMovementClass("moving-horizontal");
            setIsFlipped(true); // Flip for leftward movement
            setMyiaPosition({
                left: "calc(40% - 150px)", // Shorter distance
                top: MYIA_SPAWN_POINT.top,
            });

            setTimeout(() => {
                setMyiaAnimation("idle");
                setMovementClass("");
                setTimeout(() => {
                    // Route to interactive scene for proofs
                    setState((s) => ({
                        ...s,
                        activeQuest: qid,
                        currentSceneId: "proofs-interactive",
                    }));
                    setMyiaPosition(MYIA_SPAWN_POINT);
                    setIsFlipped(false);
                    // Reset animation state
                    setIsAnimating(false);
                    setActiveQuest(null);
                }, 300);
            }, 1200); // Increased speed from 2000ms
        } else if (qid === "dissection") {
            // Path 2: Short downward movement
            setMovementClass("moving-down");
            setMyiaPosition({
                left: MYIA_SPAWN_POINT.left,
                top: "340px", // Short distance down
            });

            setTimeout(() => {
                setMyiaAnimation("idle");
                setMovementClass("");
                setTimeout(() => {
                    setState((s) => ({
                        ...s,
                        activeQuest: qid,
                        currentSceneId: "proofs-interactive",
                    }));
                    setMyiaPosition(MYIA_SPAWN_POINT);
                    // Reset animation state
                    setIsAnimating(false);
                    setActiveQuest(null);
                }, 300);
            }, 1200); // Increased speed from 2000ms
        } else if (qid === "pebble") {
            // Path 3: Short right movement only
            setMovementClass("moving-horizontal");
            setIsFlipped(false); // Ensure not flipped for rightward movement
            setMyiaPosition({
                left: "calc(40% + 150px)", // Shorter distance
                top: MYIA_SPAWN_POINT.top,
            });

            setTimeout(() => {
                setMyiaAnimation("idle");
                setMovementClass("");
                setTimeout(() => {
                    setState((s) => ({
                        ...s,
                        activeQuest: qid,
                        currentSceneId: "proofs-interactive",
                    }));
                    setMyiaPosition(MYIA_SPAWN_POINT);
                    setIsFlipped(false);
                    // Reset animation state
                    setIsAnimating(false);
                    setActiveQuest(null);
                }, 300);
            }, 1200); // Increased speed from 2000ms
        }
    };

    const handleProofKeyDown = (e: React.KeyboardEvent, qid: string) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            startQuest(qid);
        }
    };

    const handleChallengeKeyDown = (e: React.KeyboardEvent, qid: string) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openChallenge(qid);
        }
    };

    // finishQuest removed; completion handled by InteractiveScene onComplete -> App router

    const openChallenge = (qid: string) => {
        if (!anyProofDone || isAnimating) return; // locked until any proof is done OR if already animating

        setIsAnimating(true);
        setActiveQuest(qid);
        setMyiaAnimation("walking");

        if (qid === "ladder") {
            // Path 4: Short left movement only
            setMovementClass("moving-horizontal");
            setIsFlipped(true); // Flip for leftward movement
            setMyiaPosition({
                left: "calc(40% - 150px)", // Shorter distance
                top: MYIA_SPAWN_POINT.top,
            });

            setTimeout(() => {
                setMyiaAnimation("idle");
                setMovementClass("");
                setTimeout(() => {
                    // Route to ladder interactive
                    setState((s) => ({
                        ...s,
                        activeQuest: qid,
                        currentSceneId: "challenge-interactive",
                    }));
                    // Reset position immediately
                    setMyiaPosition(MYIA_SPAWN_POINT);
                    setIsFlipped(false);
                    // Reset animation state
                    setIsAnimating(false);
                    setActiveQuest(null);
                }, 300);
            }, 1200); // Increased speed from 2000ms
        } else if (qid === "final") {
            // Path 5: Short right movement only
            setMovementClass("moving-horizontal");
            setIsFlipped(false); // Ensure not flipped for rightward movement
            setMyiaPosition({
                left: "calc(40% + 150px)", // Shorter distance
                top: MYIA_SPAWN_POINT.top,
            });

            setTimeout(() => {
                setMyiaAnimation("idle");
                setMovementClass("");
                setTimeout(() => {
                    // Route to final challenge interactive
                    setState((s) => ({
                        ...s,
                        activeQuest: qid,
                        currentSceneId: "challenge-interactive",
                    }));
                    // Reset position immediately
                    setMyiaPosition(MYIA_SPAWN_POINT);
                    // Reset animation state
                    setIsAnimating(false);
                    setActiveQuest(null);
                }, 300);
            }, 1200); // Increased speed from 2000ms
        }
    };

    // Animate door frames if any challenge is done
    useEffect(() => {
        if (!anyProofDone || state.isChoiceDoorOpen) {
            return;
        }
        const animateDoor = async () => {
            for (let i = 1; i <= 4; i++) {
                setDoorFrameNum(i);
                await new Promise((res) => setTimeout(res, 300)); // 300ms per frame
            }
            setState((s) => ({ ...s, isChoiceDoorOpen: true })); // Mark door as open
        };
        animateDoor();
    }, [anyProofDone, setState, state.isChoiceDoorOpen]);

  if (showDialogue) {
    return (
      <div className="choice-map-wrapper">
        {/* Library title above */}
  <div className="library-title-container" aria-hidden="true">
          <img 
            src={`assets/library/library_title_${currentLanguage}.png`} 
            alt="Library" 
            className="library-title" 
          />
        </div>

  <div className="choice-layout-inner" aria-hidden="true">
          {/* Myia character - positioned below books with z-index */}
          <div 
            className={`myia-container ${movementClass}`} 
            style={{ 
              left: myiaPosition.left, 
              top: myiaPosition.top,
              zIndex: 1,
              transition: disableTransition ? 'none' : undefined
            }}
          >
            <MyiaSprite animation={myiaAnimation} flipped={isFlipped} />
          </div>

          {/* Proof book row (disabled during dialogue) */}
          <div role="region" aria-label={t('mapScene.labels.proofs') || 'Proofs'}>
            <ul className="proof-books-row">
              {proofIds.map(pid => {
                const titleKey = pid === 'pouring'
                  ? 'pythagoreanTheorem.waterProof.title'
                  : pid === 'dissection'
                  ? 'pythagoreanTheorem.dissectionProof.title'
                  : 'pythagoreanTheorem.pebbleProof.title';
                
                return (
                  <li key={pid} className="book-stand">
                    <div className="book-art disabled-interactions" />
                    <div className="label-wider disabled">
                      <span className="label-caption">{t(titleKey)}</span>
                      {state.completedQuests.includes(pid) && <img className='checkmark' src="assets/check.png" alt="Checkmark" />}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Challenge doors (disabled during dialogue) */}
          <div className="challenge-doors">
            {/* Ladder door */}
            <div className="challenge">
              <div className={`label-large ladder-label ${anyProofDone ? 'enabled' : 'disabled'}`}>
                <span className="label-caption">{t('mapScene.labels.ladderChallenge')}</span>
                {state.completedQuests.includes('ladder') && <img className='checkmark' src="assets/check.png" alt="Checkmark" />}
              </div>
              <img 
                src={`assets/choice_door_${doorFrameNum}.png`} 
                alt="Door" 
                className="choice-door ladder-door disabled-interactions" 
              />
              {!anyProofDone && <div className="door-lock" />}
            </div>

            {/* Final door */}
            <div className="challenge">
              <div className={`label-large final-label ${anyProofDone ? 'enabled' : 'disabled'}`}>
                {state.completedQuests.includes('final') && <img className='checkmark' src="assets/check.png" alt="Checkmark" />}
                <span className="label-caption">{t('mapScene.labels.finalChallenge')}</span>
              </div>
              <img 
                src={`assets/choice_door_${doorFrameNum}.png`} 
                alt="Door" 
                className="choice-door final-door disabled-interactions" 
              />
              {!anyProofDone && <div className="door-lock" />}
            </div>
          </div>
        </div>

        <div
          className="main-character-dialogue-container"
          role="dialog"
          aria-modal="true"
          aria-label="Map dialogue"
          style={{ zIndex: 1000 }}
        >
          <DialogueBox
            dialogues={getDialogueData()}
            currentIndex={dialogueIndex}
            onComplete={handleDialogueNext}
            onTypingStart={handleTypingStart}
            disableTyping={true}
            showOnlyCurrent={true}
            className="narrator-minimal"
          />
          <div className="dialogue-nav-buttons">
            <button 
              className="dialogue-nav-btn next" 
              onClick={handleDialogueNext}
            >
              { t('navigation.next')}
            </button>
          </div>
        </div>
      </div>
    );
  }

    return (
        <div className="choice-map-wrapper">
            {/* Library title above */}
            <div className="library-title-container">
                <img
                    src={`assets/library/library_title_${currentLanguage}.png`}
                    alt={t("libraryScene.libraryAlt")}
                    className="library-title"
                />
            </div>

            {/* Navigation buttons moved after content for correct reading order */}

      <div className="choice-layout-inner" role="none">
        {/* Myia character - decorative for AT */}
        <div
          className={`myia-container ${movementClass}`}
          style={{
            left: myiaPosition.left,
            top: myiaPosition.top,
            zIndex: 1, // Keep Myia below books (books should have higher z-index)
          }}
          aria-hidden="true"
        >
          <MyiaSprite animation={myiaAnimation} flipped={isFlipped} />
        </div>

        {/* Challenge doors first for reading order */}
        <div className="challenge-doors" role="region" aria-label={t('mapScene.labels.challenges') || 'Challenges'}>
          {/* Ladder door */}
          <div
            className="challenge"
            role="button"
            onClick={
              anyProofDone && (!isAnimating || activeQuest === "ladder")
                ? () => openChallenge("ladder")
                : undefined
            }
            onKeyDown={
              anyProofDone && (!isAnimating || activeQuest === "ladder")
                ? (e) => handleChallengeKeyDown(e, "ladder")
                : undefined
            }
            tabIndex={anyProofDone && (!isAnimating || activeQuest === "ladder") ? 0 : -1}
            aria-label={`${t("mapScene.labels.ladderChallenge")}${
              !anyProofDone ? `, ${t("common.locked")}` : ""
            }${state.completedQuests.includes("ladder") ? `, ${t("common.completed")}` : ""}`}
            aria-disabled={!anyProofDone}
          >
            {/* Label above door using large_* sprite */}
            <div
              className={`label-large ladder-label ${
                anyProofDone &&
                (!isAnimating || activeQuest === "ladder")
                  ? "enabled"
                  : "disabled"
              }`}
              aria-hidden="true"
            >
              <span className="label-caption">
                {t("mapScene.labels.ladderChallenge")}
              </span>
              {/* Show checkmark if proof is done */}
              {state.completedQuests.includes("ladder") && (
                <img
                  className="checkmark"
                  src="assets/check.png"
                  alt=""
                />
              )}
            </div>
            {/* <div className={`door-large ${anyProofDone ? 'unlocked' : 'locked'}`} /> */}
            <img
              src={`assets/choice_door_${doorFrameNum}.png`}
              alt=""
              aria-hidden="true"
              className={`choice-door ladder-door`}
            />
            {!anyProofDone && <div className="door-lock" aria-hidden="true" />}
          </div>

          {/* Final door */}
          <div
            className="challenge"
            role="button"
            onClick={
              anyProofDone && (!isAnimating || activeQuest === "final")
                ? () => openChallenge("final")
                : undefined
            }
            onKeyDown={
              anyProofDone && (!isAnimating || activeQuest === "final")
                ? (e) => handleChallengeKeyDown(e, "final")
                : undefined
            }
            tabIndex={anyProofDone && (!isAnimating || activeQuest === "final") ? 0 : -1}
            aria-label={`${t("mapScene.labels.finalChallenge")}${
              !anyProofDone ? `, ${t("common.locked")}` : ""
            }${state.completedQuests.includes("final") ? `, ${t("common.completed")}` : ""}`}
            aria-disabled={!anyProofDone}
          >
            <div
              className={`label-large final-label ${
                anyProofDone &&
                (!isAnimating || activeQuest === "final")
                  ? "enabled"
                  : "disabled"
              }`}
              aria-hidden="true"
            >
              {/* Show checkmark if proof is done */}
              {state.completedQuests.includes("final") && (
                <img
                  className="checkmark"
                  src="assets/check.png"
                  alt=""
                />
              )}
              <span className="label-caption">
                {t("mapScene.labels.finalChallenge")}
              </span>
            </div>
            {/* <div className={`door-large ${anyProofDone ? 'unlocked' : 'locked'}`} /> */}
            <img
              src={`assets/choice_door_${doorFrameNum}.png`}
              alt=""
              aria-hidden="true"
              className={`choice-door final-door`}
            />
            {!anyProofDone && <div className="door-lock" aria-hidden="true" />}
          </div>
        </div>

        {/* Proof book row after challenges for reading order */}
        <div role="region" aria-label={t('mapScene.labels.proofs') || 'Proofs'}>
          <ul className="proof-books-row">
                    {proofIds.map((pid) => {
                        const titleKey =
                            pid === "pouring"
                                ? "pythagoreanTheorem.waterProof.title"
                                : pid === "dissection"
                                ? "pythagoreanTheorem.dissectionProof.title"
                                : "pythagoreanTheorem.pebbleProof.title";

                        // Show disabled state if animating and this isn't the active quest
                        const isDisabled = isAnimating && activeQuest !== pid;
                        const handleClick = isDisabled
                            ? undefined
                            : () => startQuest(pid);
                        const isCompleted = state.completedQuests.includes(pid);

                        return (
                            <li 
                                key={pid} 
                                className="book-stand"
                                onClick={handleClick}
                                onKeyDown={!isDisabled ? (e) => handleProofKeyDown(e, pid) : undefined}
                                role="button"
                                tabIndex={isDisabled ? -1 : 0}
                                aria-label={`${t(titleKey)}${isCompleted ? `, ${t("common.completed")}` : ""}`}
                            >
                                <div className="book-art" aria-hidden="true" />
                                {/* Image-based label under the book using wider_* sprites */}
                                <div
                                    className={`label-wider ${
                                        isDisabled ? "disabled" : ""
                                    }`}
                                    aria-hidden="true"
                                >
                                    <span className="label-caption">
                                        {t(titleKey)}
                                    </span>
                                    {/* Show checkmark if proof is done */}
                                    {isCompleted && (
                                        <img
                                            className="checkmark"
                                            src="assets/check.png"
                                            alt=""
                                        />
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
        </div>

                {/* End of reordered content */}
            </div>

            {/* Navigation buttons in corners - moved to end for reading order */}
            <div className="map-nav-buttons" role="region" aria-label={t('mapScene.labels.navigation') || 'Map navigation'}>
                <button
                    className="dialogue-nav-btn back map-back-btn"
                    onClick={handleBack}
                >
                    {t("navigation.back")}
                </button>
                <button
                  className="dialogue-nav-btn next map-next-btn wider-button"
                  onClick={handleNext}
                  disabled={!canProceed || isAnimating || !!activeQuest}
                >
                  {t("navigation.endQuest")}
                </button>
            </div>
        </div>
    );
};

// Assign the static _preload method
MapScene._preload = preloadAssets;
