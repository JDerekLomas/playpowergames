import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useGameContext } from "../../context/GameContext";
import { useTranslations } from "../../hooks/useTranslations";
const emptyBars = "assets/progress_bar/empty_bars.png";
const filledBar = "assets/progress_bar/filled_bar.png";
const completedIcon = "assets/progress_bar/completed_icon.png";

interface ProgressBarProps {
    className?: string;
}

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

export const ProgressBar: React.FC<ProgressBarProps> = ({ className = "" }) => {
    const { state, setState } = useGameContext();
    const { t } = useTranslations();
    const [showTooltip, setShowTooltip] = useState<string>("");
    const timeoutRef = useRef<number | null>(null);
    // Hide on title and loading screens
    const shouldRender =
        state.currentSceneId !== "title" && state.currentSceneId !== "loading";

    // Track previous completed count for animation
    const [animatingBarIndex, setAnimatingBarIndex] = useState<number | null>(
        null
    );

    // Track badges that have fully faded out to make them disappear
    const [fullyFadedBadges, setFullyFadedBadges] = useState<string[]>([]);

    // Define the quest slots in order with their assigned positions
    const questSlots = [
        "monochord1",
        "monochord2", 
        "pebble",
        "pouring",
        "dissection",
        "ladder",
        "final",
    ];

    // Create a map for quick quest to slot index lookup
    const questToSlotIndex = questSlots.reduce((acc, questId, index) => {
        acc[questId] = index;
        return acc;
    }, {} as Record<string, number>);

    // Get newly completed quest for animation
    const newlyCompletedQuest = state.completedQuests?.find(questId => 
        questSlots.includes(questId) && !state.fadingBadges?.includes(questId)
    );

    // Handle animation when a new quest is completed
    useEffect(() => {
        if (newlyCompletedQuest) {
            const slotIndex = questToSlotIndex[newlyCompletedQuest];
            if (slotIndex !== undefined) {
                // Animate the specific slot for this quest
                setAnimatingBarIndex(slotIndex);

                // Clear animation and add to fading badges after it completes
                const timer = setTimeout(() => {
                    setAnimatingBarIndex(null);
                    setState((s) => ({
                        ...s,
                        fadingBadges: [...(s.fadingBadges || []), newlyCompletedQuest]
                    }));
                }, 2000); // Match CSS animation duration

                return () => clearTimeout(timer);
            }
        }
    }, [newlyCompletedQuest, setState, questToSlotIndex]);

    useEffect(() => {
        const fadingBadges = state.fadingBadges || [];
        const newlyFadingBadges = fadingBadges.filter(
            badge => !fullyFadedBadges.includes(badge)
        );

        if (newlyFadingBadges.length > 0) {
            const timer = setTimeout(() => {
                setFullyFadedBadges(prev => [...prev, ...newlyFadingBadges]);
            }, 500);

            return () => clearTimeout(timer);
        }
    }, [state.fadingBadges, fullyFadedBadges]);

    // Total slots is now 7
    const totalSlots = 7;

    // Refs and sizes for rendering full-width empty image and computed slot widths
    const emptyRef = useRef<HTMLImageElement | null>(null);
    const [emptyRenderedWidth, setEmptyRenderedWidth] = useState<number>(0);

    const handleTooltipClick = (qid: string) => {
        setShowTooltip(qid);
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = window.setTimeout(() => setShowTooltip(""), 5000);
    };

    useEffect(() => {
        const el = emptyRef.current;
        if (!el) return;
        const onResize = () => setEmptyRenderedWidth(el.clientWidth);
        // set rendered width
        setEmptyRenderedWidth(el.clientWidth || 0);

        // Listen for window resize to recompute
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, [emptyRef.current]);

    // Compute slot sizes based on rendered empty width - now for 7 slots
    const slotWidth = emptyRenderedWidth ? emptyRenderedWidth / totalSlots : 0;

    const filledBars = useMemo(() => {
        if (!emptyRenderedWidth || slotWidth <= 0) return null;

        return questSlots.map((questId, slotIndex) => {
            // Check if this quest is completed
            const isCompleted = state.completedQuests?.includes(questId);
            if (!isCompleted) return null;

            const left = Math.round(slotIndex * slotWidth);
            const width = Math.max(0, Math.round(slotWidth));
            const isAnimating = animatingBarIndex === slotIndex;
            const isFading = state.fadingBadges?.includes(questId);
            const isFullyFaded = fullyFadedBadges.includes(questId);

            const questName = t(`interactiveCelebration.${questId}.name`);
            const badgeAsset = getBadgeAsset(questId);

            // Individual positioning adjustments for each filled bar
            const getFilledBarAdjustment = (index: number) => {
                const adjustments = [
                    { leftMargin: 4, widthReduction: 6 },
                    { leftMargin: 5, widthReduction: 5 },
                    { leftMargin: 2, widthReduction: 4 },
                    { leftMargin: 1, widthReduction: 3 },
                    { leftMargin: 0, widthReduction: 2 },
                    { leftMargin: -1, widthReduction: 1 },
                    { leftMargin: -2, widthReduction: 0 },
                ];
                return adjustments[index] || { leftMargin: 2, widthReduction: 4 };
            };

            const adjustment = getFilledBarAdjustment(slotIndex);

            return (
                <Fragment key={`progress-bar-slot-${slotIndex}`}>
                    <img
                        key={`filled-${slotIndex}`}
                        src={filledBar}
                        alt=""
                        className={`progress-filled-img ${
                            isAnimating ? "progress-bar-animate" : ""
                        }`}
                        style={{
                            left: `${left + adjustment.leftMargin}px`,
                            width: `${width - adjustment.widthReduction}px`,
                        }}
                        draggable={false}
                        onClick={() => handleTooltipClick(questId)}
                        onFocus={() => setShowTooltip(questId)}
                        onBlur={() => setShowTooltip("")}
                        aria-label={`${questName} - ${t("common.completed")}`}
                        role="button"
                        tabIndex={0}
                    />
                    <img
                        className={`progress-badge ${
                            isAnimating ? "progress-badge-animate" : ""
                        } ${isFading ? "progress-badge-fade-out" : ""}`}
                        src={badgeAsset}
                        alt=""
                        aria-label={`${questName} ${t("interactiveCelebration.badgeAlt")}`}
                        style={{ 
                            left: `${left + width / 2 - 40}px`,
                            opacity: isFading ? 0 : 1,
                            display: isFullyFaded ? "none" : "block",
                            transition: isFading ? "opacity 0.5s ease-out" : "none"
                        }}
                        aria-hidden={isFading ? "true" : "false"}
                    />
                    {showTooltip === questId && (
                        <div
                            className="progress-tooltip-container -mb-6"
                            style={{ left: `${left + width / 2 - 111}px` }}
                        >
                            <p className="tooltip-text">{questName}</p>
                        </div>
                    )}
                    {isFullyFaded && (
                        <img
                            src={completedIcon}
                            alt=""
                            className="absolute pointer-events-none z-10"
                            style={{
                                left: `${left + width / 2}px`,
                                transform: "translateX(-50%)"
                            }}
                            aria-hidden="true"
                        />
                    )}
                </Fragment>
            );
        }).filter(Boolean); // Remove null entries for incomplete quests
    }, [
        emptyRenderedWidth,
        slotWidth,
        animatingBarIndex,
        showTooltip,
        state.completedQuests,
        state.fadingBadges,
        fullyFadedBadges,
        questSlots,
        t
    ]);

    if (!shouldRender) return null;

    const hasFilledBars = filledBars && filledBars.length > 0;

    return (
        <div className={`progress-bar-container ${className}`} role="region" aria-label={t("progressBar.label")}>
            <div className="progress-inner">
                <img
                    ref={emptyRef}
                    src={emptyBars}
                    alt=""
                    className="progress-empty-img"
                    onLoad={(e) => {
                        setEmptyRenderedWidth(e.currentTarget.clientWidth);
                    }}
                    draggable={false}
                    aria-hidden="true"
                />
                <div className="progress-filled-bars-wrapper">
                    {filledBars}
                    {!hasFilledBars && (
                        <p className="sr-only">
                            {t("progressBar.noQuestsCompleted")}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};
