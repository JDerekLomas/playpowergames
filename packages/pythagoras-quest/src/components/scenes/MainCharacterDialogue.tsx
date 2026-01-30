import React, { useState } from "react";
import { DialogueBox } from "../common/DialogueBox";
import { useTranslations } from "../../hooks/useTranslations";
import { useAudioManager } from "../../context/AudioContext";
import audioConfig from "../../config/audioConfig.json";
import { useGameContext } from "../../context/GameContext";
import { useSceneAnnouncement } from "../../hooks/useSceneAnnouncement";

interface MainCharacterDialogueProps {
    onComplete: () => void;
    onBack?: () => void;
    dialogueKey: string; // Key to look up dialogues in translation files
    startFromLast?: boolean; // Whether to start from the last dialogue when coming back
}

export const MainCharacterDialogue: React.FC<MainCharacterDialogueProps> = ({
    onComplete,
    onBack,
    dialogueKey,
    startFromLast = false,
}) => {
    const { t, currentLanguage } = useTranslations();
    const { state, setState } = useGameContext();
    const { playDialog, pauseDialog } = useAudioManager();
    
    // Announce scene change to screen readers
    useSceneAnnouncement('mainCharacter');

    // Check quest completion status - unlock after visiting either door
    const hasCompletedMonochord1 = state.completedQuests.includes("monochord1");
    const hasCompletedMonochord2 = state.completedQuests.includes("monochord2");
    const hasVisitedAnyDoor = hasCompletedMonochord1 || hasCompletedMonochord2;

    // Initialize dialogue index from saved state or 0
    const savedIndex = state.sceneDialogueStates?.[state.currentSceneId] || 0;
    const initialIndex = startFromLast ? savedIndex : 0;
    const [dialogueIndex, setDialogueIndex] = useState(initialIndex);

    // Get dialogues using the provided key
    const dialoguesData = t(dialogueKey, true) as any;
    const speaker = dialoguesData?.myia?.name || "Myia";
    const dialogueTexts = dialoguesData?.myia?.dialogues || [];

    const dialogues = dialogueTexts.map((text: string) => ({
        speaker,
        text: text || "Loading dialogue...",
        avatar: "assets/myia.png",
    }));

    const handleNext = () => {
        pauseDialog();
        if (dialogueIndex < dialogues.length - 1) {
            const newIndex = dialogueIndex + 1;
            setDialogueIndex(newIndex);
            // Save current dialogue state
            setState((s) => ({
                ...s,
                sceneDialogueStates: {
                    ...s.sceneDialogueStates,
                    [s.currentSceneId]: newIndex,
                },
            }));
        } else {
            // Clear dialogue state when completing scene
            setState((s) => ({
                ...s,
                sceneDialogueStates: {
                    ...s.sceneDialogueStates,
                    [s.currentSceneId]: 0,
                },
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
            setState((s) => ({
                ...s,
                sceneDialogueStates: {
                    ...s.sceneDialogueStates,
                    [s.currentSceneId]: newIndex,
                },
            }));

            void playDialog(
                `assets/audios/dialogues/${currentLanguage}/${audioBase}_${newIndex}.mp3`
            );
        } else if (onBack) {
            // Reset dialogue state to start from beginning when going back
            setState((s) => ({
                ...s,
                sceneDialogueStates: {
                    ...s.sceneDialogueStates,
                    [s.currentSceneId]: 0,
                },
            }));
            // Go back to previous scene if at first dialogue
            onBack();
        }
    };

    const isFirstDialogue = dialogueIndex === 0;

    const audioBase =
        (audioConfig as any)?.mainCharacterDialogue?.[dialogueKey.split(".")[1]]
            ?.myia_dialogues ??
        `${dialogueKey.replace(/\./g, "_")}_myia_dialogues`;

    const handleTypingStart = () => {
        void playDialog(
            `assets/audios/dialogues/${currentLanguage}/${audioBase}_${dialogueIndex}.mp3`
        );
    };

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
                            src="assets/library/door_1.png"
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
                        dialogues={dialogues}
                        currentIndex={dialogueIndex}
                        onComplete={onComplete}
                        onTypingStart={handleTypingStart}
                        disableTyping={true}
                        showOnlyCurrent={true}
                        className="narrator-minimal"
                    />
                </div>
                <nav className="dialogue-nav-buttons" role="navigation" aria-label={t('common.dialogueNavAria')}>
                    <button
                        className="dialogue-nav-btn back"
                        onClick={handleBack}
                        disabled={isFirstDialogue && !onBack}
                    >
                        {t("navigation.back")}
                    </button>
                    <button
                        className="dialogue-nav-btn next"
                        onClick={handleNext}
                    >
                        {t("navigation.next")}
                    </button>
                </nav>
            </div>
        </div>
    );
};
