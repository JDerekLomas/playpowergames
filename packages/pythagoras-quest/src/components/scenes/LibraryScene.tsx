import React, { useState, useEffect } from "react";
import { useGameContext } from "../../context/GameContext";
import { useTranslations } from "../../hooks/useTranslations";
import { useAudioManager } from "../../context/AudioContext";
import audioConfig from "../../config/audioConfig.json";
import { MyiaSprite } from "../common/MyiaSprite";
import type { MyiaAnimationType } from "../common/MyiaSprite";
import { DialogueBox } from "../common/DialogueBox";
import { useSceneAnnouncement } from "../../hooks/useSceneAnnouncement";

// Myia spawn point configuration
const MYIA_SPAWN_POINT = {
    left: "42%",
    top: "70%",
};

interface LibrarySceneProps {
    onComplete?: () => void;
    onBack?: () => void;
}

export const LibraryScene: React.FC<LibrarySceneProps> = ({
    onComplete,
    onBack,
}) => {
    const { state, setState } = useGameContext();
    const { t, currentLanguage } = useTranslations();
    const { playDialog, pauseDialog } = useAudioManager();
    
    // Announce scene change to screen readers
    useSceneAnnouncement('library');
    
    const [myiaPosition, setMyiaPosition] = useState(MYIA_SPAWN_POINT);
    const [myiaAnimation, setMyiaAnimation] =
        useState<MyiaAnimationType>("idle");
    const [middleDoorFrame, setMiddleDoorFrame] = useState(1);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isMovingToMiddle, setIsMovingToMiddle] = useState(false);
    const [isFlipped, setIsFlipped] = useState(false);
    const [showDialogue, setShowDialogue] = useState(false);
    const [disableTransition, setDisableTransition] = useState(false);

    // Check quest completion status - unlock after visiting either door
    const hasCompletedMonochord1 = state.completedQuests.includes("monochord1");
    const hasCompletedMonochord2 = state.completedQuests.includes("monochord2");
    const hasVisitedAnyDoor = hasCompletedMonochord1 || hasCompletedMonochord2;

    // Handle dialogue when returning from quests
    const currentLibraryDialogue = state.libraryDialogueShown || {};
    const shouldShowLibraryDialogue =
        !currentLibraryDialogue["main"] && hasVisitedAnyDoor;

    // Show dialogue on return from quest
    useEffect(() => {
        if (shouldShowLibraryDialogue) {
            setShowDialogue(true);
        }
    }, [shouldShowLibraryDialogue]);

    // Animate middle door unlock when any quest is completed
    useEffect(() => {
        if (hasVisitedAnyDoor && middleDoorFrame === 1) {
            const animateMiddleDoor = async () => {
                for (let frame = 1; frame <= 4; frame++) {
                    setMiddleDoorFrame(frame);
                    await new Promise((resolve) => setTimeout(resolve, 300));
                }
            };
            animateMiddleDoor();
        }
    }, [hasVisitedAnyDoor, middleDoorFrame]);

    const handleDoorClick = (door: "left" | "middle" | "right") => {
        if (isAnimating) return;

        setIsAnimating(true);
        setMyiaAnimation("walking");

        if (door === "left") {
            // Move left - shorter distance for smoother animation
            setIsFlipped(true);
            setMyiaPosition({ left: "30%", top: myiaPosition.top }); // Shorter distance (12% difference)
            setTimeout(() => {
                setState((s) => ({
                    ...s,
                    currentSceneId: "monochord-interactive-1",
                }));
                // Reset position for return
                setMyiaPosition(MYIA_SPAWN_POINT);
                setMyiaAnimation("idle");
                setIsFlipped(false);
                setIsAnimating(false);
            }, 1000); // Increased speed from 1500ms
        } else if (door === "right") {
            // Move right - shorter distance for smoother animation
            setIsFlipped(false);
            setMyiaPosition({ left: "54%", top: myiaPosition.top }); // Shorter distance (12% difference)
            setTimeout(() => {
                setState((s) => ({
                    ...s,
                    currentSceneId: "monochord-interactive-2",
                }));
                // Reset position for return
                setMyiaPosition(MYIA_SPAWN_POINT);
                setMyiaAnimation("idle");
                setIsAnimating(false);
            }, 1000); // Increased speed from 1500ms
        } else if (door === "middle" && hasVisitedAnyDoor) {
            // Move up slightly to middle door
            setIsMovingToMiddle(true);
            setMyiaPosition({ left: myiaPosition.left, top: "65%" });
            setTimeout(() => {
                setState((s) => ({ ...s, currentSceneId: "map" }));
                // Reset position for return
                setMyiaPosition(MYIA_SPAWN_POINT);
                setMyiaAnimation("idle");
                setIsAnimating(false);
                setIsMovingToMiddle(false);
            }, 600); // Increased speed from 800ms
        } else {
            setIsAnimating(false);
            setMyiaAnimation("idle");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, door: "left" | "middle" | "right") => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleDoorClick(door);
        }
    };

    const handleDialogueComplete = () => {
        pauseDialog();
        // Disable transition temporarily to prevent animation
        setDisableTransition(true);

        // Reset Myia position to spawn point without animation
        setMyiaPosition(MYIA_SPAWN_POINT);
        setMyiaAnimation("idle");
        setIsFlipped(false);
        setIsMovingToMiddle(false);

        setState((s) => ({
            ...s,
            libraryDialogueShown: {
                ...(s.libraryDialogueShown || {}),
                main: true,
            },
        }));
        setShowDialogue(false);

        // Re-enable transition after a brief delay
        setTimeout(() => {
            setDisableTransition(false);
        }, 50);
    };

    const getAudioBase = () => {
        if (hasCompletedMonochord1 && !hasCompletedMonochord2) {
            return (audioConfig as any)?.library?.monochord1Completed ?? null;
        }
        if (hasCompletedMonochord2 && !hasCompletedMonochord1) {
            return (audioConfig as any)?.library?.monochord2Completed ?? null;
        }
        return null;
    };

    const handleTypingStart = () => {
        const audioBase = getAudioBase();
        if (audioBase) {
            void playDialog(
                `assets/audios/dialogues/${currentLanguage}/${audioBase}_0.mp3`
            );
        }
    };

    const getDialogueData = () => {
        let dialogueKey = "";
        if (hasCompletedMonochord1 && hasCompletedMonochord2) {
            dialogueKey = "library.dialogue.bothCompleted";
        } else if (hasCompletedMonochord1) {
            dialogueKey = "library.dialogue.monochord1Completed";
        } else if (hasCompletedMonochord2) {
            dialogueKey = "library.dialogue.monochord2Completed";
        } else {
            dialogueKey = "library.dialogue.welcome";
        }

        return [
            {
                speaker: "Myia",
                text: t(dialogueKey),
                avatar: "assets/myia.png",
            },
        ];
    };

    if (showDialogue) {
        return (
            <div className="main-character-scene">
                {/* Library title above - decorative background element */}
                <div className="library-title-container" aria-hidden="true">
                    <img
                        src={`assets/library/library_title_${currentLanguage}.png`}
                        alt=""
                        className="library-title"
                    />
                </div>

                {/* Left and Right doors together - decorative background elements */}
                <div className="library-side-doors" aria-hidden="true">
                    {/* Left Door - Monochord with icon */}
                    <div className="library-door-container">
                        <div className="library-square left-door disabled-interactions">
                            <img
                                src="assets/library/monochord_icon.png"
                                alt=""
                                className="door-icon"
                            />
                            {/* Show checkmark if proof is done */}
                            {state.completedQuests.includes("monochord1") && (
                                <img
                                    className="checkmark"
                                    src="assets/check.png"
                                    alt=""
                                />
                            )}
                        </div>
                    </div>

                    {/* Right Door - Figurate Numbers with icon */}
                    <div className="library-door-container">
                        <div className="library-square right-door disabled-interactions">
                            <img
                                src="assets/library/figurate_icon.png"
                                alt=""
                                className="door-icon"
                            />
                            {/* Show checkmark if proof is done */}
                            {state.completedQuests.includes("monochord2") && (
                                <img
                                    className="checkmark"
                                    src="assets/check.png"
                                    alt=""
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Library door below title - decorative background element */}
                <div className="library-middle-door-container" aria-hidden="true">
                    <div className="library-door-container middle-door">
                        <div
                            className={`library-door-frame ${
                                hasVisitedAnyDoor ? "unlocked" : "locked"
                            } disabled-interactions`}
                        >
                            <img
                                src={`assets/library/door_${middleDoorFrame}.png`}
                                alt=""
                                className="door-image"
                            />
                            {!hasVisitedAnyDoor && (
                                <img
                                    src="assets/library/lock_default.png"
                                    alt=""
                                    className="door-lock-image"
                                />
                            )}
                        </div>
                    </div>
                </div>

                <div className="main-character-dialogue-container" role="region" aria-label="Dialogue">
                    <div>
                        <DialogueBox
                            dialogues={getDialogueData()}
                            currentIndex={0}
                            onComplete={handleDialogueComplete}
                            onTypingStart={handleTypingStart}
                            disableTyping={true}
                            showOnlyCurrent={true}
                            className="narrator-minimal"
                        />
                    </div>
                    <nav className="dialogue-nav-buttons" role="navigation" aria-label={t('common.dialogueNavAria')}>
                        <button
                            className="dialogue-nav-btn next"
                            onClick={handleDialogueComplete}
                        >
                            {t("navigation.next")}
                        </button>
                    </nav>
                </div>
            </div>
        );
    }

    return (
        <div className="main-character-scene">
            {/* Independent library title - decorative background element */}
            <div className="library-title-container" aria-hidden="true">
                <img
                    src={`assets/library/library_title_${currentLanguage}.png`}
                    alt=""
                    className="library-title"
                />
            </div>

            {/* Left and Right doors together */}
            <div className="library-side-doors" role="region" aria-label="Quest Selection">
                {/* Left Door - Monochord with icon */}
                <div
                    className="library-door-container"
                    onClick={() => handleDoorClick("left")}
                    onKeyDown={(e) => handleKeyDown(e, "left")}
                    role="button"
                    tabIndex={0}
                    style={{ cursor: 'pointer' }}
                    aria-label={`${t("libraryScene.monochordAlt")}${state.completedQuests.includes("monochord1") ? `, ${t("common.completed")}` : ""}`}
                >
                    <div className="library-square left-door">
                        <img
                            src="assets/library/monochord_icon.png"
                            alt=""
                            aria-hidden="true"
                            className="door-icon"
                        />
                        {/* Show checkmark if proof is done */}
                        {state.completedQuests.includes("monochord1") && (
                            <img
                                className="checkmark"
                                src="assets/check.png"
                                alt=""
                                aria-hidden="true"
                            />
                        )}
                    </div>
                </div>

                {/* Right Door - Figurate Numbers with icon */}
                <div
                    className="library-door-container"
                    onClick={() => handleDoorClick("right")}
                    onKeyDown={(e) => handleKeyDown(e, "right")}
                    role="button"
                    tabIndex={0}
                    aria-label={`${t("libraryScene.figurateNumbersAlt")}${state.completedQuests.includes("monochord2") ? `, ${t("common.completed")}` : ""}`}
                >
                    <div className="library-square right-door">
                        <img
                            src="assets/library/figurate_icon.png"
                            alt=""
                            aria-hidden="true"
                            className="door-icon"
                        />
                        {/* Show checkmark if proof is done */}
                        {state.completedQuests.includes("monochord2") && (
                            <img
                                className="checkmark"
                                src="assets/check.png"
                                alt=""
                                aria-hidden="true"
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Middle Door - independent positioning */}
            <div className="library-middle-door-container">
                <div className="library-door-container middle-door">
                    <div
                        className={`library-door-frame ${
                            hasVisitedAnyDoor ? "unlocked" : "locked"
                        }`}
                        onClick={hasVisitedAnyDoor ? () => handleDoorClick("middle") : undefined}
                        onKeyDown={hasVisitedAnyDoor ? (e) => handleKeyDown(e, "middle") : undefined}
                        role="button"
                        tabIndex={hasVisitedAnyDoor ? 0 : -1}
                        aria-label={`${t("libraryScene.libraryDoorAlt")}${!hasVisitedAnyDoor ? `, ${t("common.locked")}` : ""}`}
                        aria-disabled={!hasVisitedAnyDoor}
                    >
                        <img
                            src={`assets/library/door_${middleDoorFrame}.png`}
                            alt=""
                            aria-hidden="true"
                            className="door-image"
                        />
                        {!hasVisitedAnyDoor && (
                            <img
                                src="assets/library/lock_default.png"
                                alt=""
                                aria-hidden="true"
                                className="door-lock-image"
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Myia character with MapScene-style movement - decorative */}
            <div
                className={`myia-container ${
                    isMovingToMiddle ? "moving-to-middle" : ""
                } ${disableTransition ? "no-transition" : ""}`}
                style={{
                    left: myiaPosition.left,
                    top: myiaPosition.top,
                    zIndex: 1,
                }}
                aria-hidden="true"
            >
                <MyiaSprite animation={myiaAnimation} flipped={isFlipped} />
            </div>

            {/* Navigation buttons */}
            <nav className="map-nav-buttons" role="navigation" aria-label="Scene Navigation">
                {onBack && (
                    <button
                        className="dialogue-nav-btn back map-back-btn"
                        onClick={onBack}
                    >
                        {t("navigation.back")}
                    </button>
                )}
                {onComplete && (
                    <button
                        className="dialogue-nav-btn next map-next-btn"
                        onClick={onComplete}
                    >
                        {t("navigation.next")}
                    </button>
                )}
            </nav>
        </div>
    );
};
