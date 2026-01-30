import React, { useMemo, useEffect } from "react";
import { useTranslations } from "../../hooks/useTranslations";
import { useAudioManager } from "../../context/AudioContext";
import ConfettiComponent from "../common/Confetti";
import { useGameContext } from "../../context/GameContext";
import { renderMathSR } from "../../utils/mathA11y";

interface InteractiveCelebrationProps {
    questId: string;
    onNext: () => void;
    onBack: () => void;
}

// Map quest IDs to their corresponding badge assets and display names
const getBadgeAsset = (questId: string): string => {
    const badgeMap: Record<string, string> = {
        monochord1: "monochord",
        monochord2: "figurate",
        pebble: "pebble_proof",
        pouring: "pouring_proof",
        dissection: "dissection_proof",
        ladder: "ladder_challenge",
        final: "final_challenge",
    };

    const badgeName = badgeMap[questId] || "monochord";
    return `assets/badges/${badgeName}.png`;
};

const getInteractiveName = (questId: string): string => {
    const nameMap: Record<string, string> = {
        monochord1: "Virtual Monochord",
        monochord2: "Even/Odd Figurate Numbers",
        pebble: "Pebble Proof",
        pouring: "Pouring Proof",
        dissection: "Dissection Proof",
        ladder: "Ladder Challenge",
        final: "Harbour Challenge",
    };

    return nameMap[questId] || questId;
};

export const InteractiveCelebration: React.FC<InteractiveCelebrationProps> = ({
    questId,
    onNext,
    onBack,
}) => {
    const { setState } = useGameContext();
    const { t } = useTranslations();
    const { playSfx } = useAudioManager();
    const [announceText, setAnnounceText] = React.useState("");

    React.useEffect(() => {
        playSfx("badge_sfx");
    }, [playSfx]);

    useMemo(() => {
        // Mark quest as completed in global state
        setState((s) => {
            const completed =
                questId && !s.completedQuests.includes(questId)
                    ? [...s.completedQuests, questId]
                    : s.completedQuests;
            return { ...s, completedQuests: completed };
        });
    }, [questId, setState]);

    // Get celebration data for this quest
    const celebrationData = t(`interactiveCelebration.${questId}`, true) as any;
    const title = celebrationData?.title || `What You Learned - ${questId}`;
    const points = celebrationData?.points || [
        "You learned important concepts",
        "You mastered new skills",
        "You discovered mathematical truths",
        "You advanced in your journey",
    ];
    const interactiveName =
        celebrationData?.name || getInteractiveName(questId);

    const badgeAsset = getBadgeAsset(questId);

    // Simple announcement when celebration scene loads
    useEffect(() => {
        const isProof = ['pebble', 'pouring', 'dissection'].includes(questId);
        const isChallenge = ['ladder', 'final'].includes(questId);
        
        const type = isProof ? t('interactiveCelebration.proof') : 
                     isChallenge ? t('interactiveCelebration.challenge') : 
                     t('interactiveCelebration.interactive');
        
        const announcement = `${t('interactiveCelebration.badgeAchievement')} ${interactiveName} ${type}`;
        
        setTimeout(() => {
            setAnnounceText(announcement);
        }, 100);
    }, [questId, interactiveName, t]);

    return (
        <div
            className="interactive-celebration"
            role="region"
            aria-label={t('interactiveCelebration.title') || 'Celebration'}
        >
            {/* Live region for screen reader announcements */}
            <div 
                role="status" 
                aria-live="polite" 
                aria-atomic="true"
                className="sr-only"
            >
                {announceText}
            </div>

            {/* Decorative confetti should be hidden from AT */}
            <div aria-hidden="true">
                <ConfettiComponent />
            </div>
            {/* Dark overlay on background */}
            <div className="celebration-background-overlay" aria-hidden="true"></div>

            <div className="celebration-container" role="none">
                {/* Dynamic Border Elements */}
                <div className="border-left" aria-hidden="true"></div>
                <div className="border-right" aria-hidden="true"></div>
                <div className="border-corner-tl" aria-hidden="true"></div>
                <div className="border-corner-tr" aria-hidden="true"></div>
                <div className="border-corner-bl" aria-hidden="true"></div>
                <div className="border-corner-br" aria-hidden="true"></div>

                {/* Badge at top center with interactive name */}
                <div className="celebration-badge">
                    <div className="badge-text">{interactiveName}</div>
                    <img
                        src={badgeAsset}
                        alt={t("interactiveCelebration.badgeAlt")}
                    />
                </div>

                {/* Content */}
                <div className="celebration-content">
                    <h2 className="celebration-title">{renderMathSR(title)}</h2>
                    <ul className="celebration-points">
                        {Array.isArray(points) &&
                            points.map((point: string, index: number) => (
                                <li key={index}>{renderMathSR(point)}</li>
                            ))}
                    </ul>
                </div>

                {/* Navigation buttons */}
                <div className="dialogue-nav-buttons">
                    <button className="dialogue-nav-btn back" onClick={onBack}>
                        {t("navigation.back")}
                    </button>
                    <button className="dialogue-nav-btn next" onClick={onNext}>
                        {t("navigation.next")}
                    </button>
                </div>
            </div>
        </div>
    );
};
