import React, { useEffect, useState } from "react";
import { useGameContext } from "../../context/GameContext";
import { TitleScreen } from "./TitleScreen";
import { MapScene } from "./MapScene";
import { InteractiveScene } from "./InteractiveScene";
import { preloadImages } from "../../utils/preloadImages";
import { useTranslations } from "../../hooks/useTranslations";
import { useSceneAnnouncement } from "../../hooks/useSceneAnnouncement";

// Simple asset preloader for only essential loading screen assets
const preloadEssentialAssets = () =>
    preloadImages(["assets/loading_bg.png", "assets/ppl_logo.png"], {
        tolerateErrors: false,
    });

// Critical background images that prevent black screens (loaded via CSS)
const preloadCriticalBackgrounds = () =>
    preloadImages([
        "assets/title_bg.png",
        "assets/narrator_bg.png",
        "assets/mainCharacter_bg.png",
        "assets/choice_bg.png",
        "assets/interactive_bg.png",
        "assets/monochord_bg.png",
        "assets/figurate_bg.png",
        "assets/allProofs_bg.png",
        "assets/ladder_bg.png",
        "assets/finalChallenge_bg.png",
        "assets/ending_bg.png",
    ]);

// Scene-based preloading following K8 Games pattern
const preloadSceneAssets = () =>
    Promise.all([
        TitleScreen._preload(),
        MapScene._preload(),
        InteractiveScene._preload(),
    ]).then(() => {});

// Preload common UI assets shared across scenes
const preloadCommonAssets = () =>
    preloadImages([
        "assets/myia.png",
        "assets/myia_avatar.png",
        "assets/myia_headshot.png",
        "assets/dialogue_container.png",
        "assets/dialogue_container_2.png",
        "assets/dialogue_container_3.png",
        "assets/buttons/default.png",
        "assets/buttons/hover.png",
        "assets/buttons/pressed.png",
        "assets/buttons/disabled.png",
        "assets/buttons/secondary_default.png",
        "assets/buttons/secondary_hover.png",
        "assets/buttons/secondary_pressed.png",
        "assets/buttons/secondary_disabled.png",
        "assets/buttons/wider_default.png",
        "assets/buttons/wider_hover.png",
        "assets/buttons/wider_pressed.png",
        "assets/buttons/wider_disabled.png",
        "assets/buttons/icon_default.png",
        "assets/buttons/icon_hover.png",
        "assets/buttons/icon_pressed.png",
        "assets/buttons/icon_disabled.png",
        "assets/buttons/info_default.png",
        "assets/buttons/info_hover.png",
        "assets/buttons/info_pressed.png",
        "assets/buttons/help_default.png",
        "assets/buttons/help_hover.png",
        "assets/buttons/help_pressed.png",
        "assets/buttons/large_default.png",
        "assets/buttons/large_hover.png",
        "assets/buttons/large_pressed.png",
        "assets/buttons/large_disabled.png",
        "assets/library/square_default.png",
        "assets/library/square_hover.png",
        "assets/library/square_pressed.png",
        "assets/buttons/controls/controls_bg.png",
        "assets/buttons/controls/volume_icon.png",
        "assets/buttons/controls/mute_icon.png",
        "assets/buttons/controls/settings_icon.png",
        "assets/checkbox_checked.png",
        "assets/checkbox_unchecked.png",
    ]);

interface LoadingSceneProps {
    onComplete?: () => void;
}

export const LoadingScene: React.FC<LoadingSceneProps> = ({ onComplete }) => {
    const { setState } = useGameContext();
    const { t } = useTranslations();
    const [progress, setProgress] = useState(0);
    const [isDone, setIsDone] = useState(false);
    
    // Announce scene change to screen readers
    useSceneAnnouncement('loading');

    // Normalize CSS background-image urls so they match the relative paths we preload (avoid double download & flicker)
    const normalizeCssAssetUrls = () => {
        try {
            for (const sheet of Array.from(document.styleSheets)) {
                // Might throw for cross-origin sheets
                let rules: CSSRuleList;
                try {
                    rules = sheet.cssRules;
                } catch {
                    continue;
                }
                if (!rules) continue;
                for (const rule of Array.from(rules)) {
                    if ((rule as CSSStyleRule).style) {
                        const style = (rule as CSSStyleRule).style;
                        const bg = style.backgroundImage;
                        if (
                            bg &&
                            (bg.includes('url("/assets/') ||
                                bg.includes("url('/assets/"))
                        ) {
                            style.backgroundImage = bg.replace(
                                /url\((['"])\/assets\//g,
                                "url($1assets/"
                            );
                        }
                    }
                }
            }
        } catch (e) {
            // Non-fatal; proceed without normalization
        }
    };

    useEffect(() => {
        let isMounted = true;

        (async () => {
            try {
                normalizeCssAssetUrls();
                // Step 1: Load essential assets for loading screen itself (fast)
                await preloadEssentialAssets();
                if (!isMounted) return;
                setProgress(10);

                // Step 2: CRITICAL - Load background images that prevent black screens
                await preloadCriticalBackgrounds();
                if (!isMounted) return;
                setProgress(50);

                // Step 3: Load common assets used across multiple scenes
                await preloadCommonAssets();
                if (!isMounted) return;
                setProgress(80);

                // Step 4: Load scene-specific assets (this follows the K8 Games pattern)
                await preloadSceneAssets();
                if (!isMounted) return;
                setProgress(100);

                console.log("All assets preloaded");

                setIsDone(true);

                // Small delay for UX polish
                setTimeout(() => {
                    if (!isMounted) return;
                    if (onComplete) {
                        onComplete();
                    } else {
                        // Move to title scene automatically
                        setState((s) => ({ ...s, currentSceneId: "title" }));
                    }
                }, 400);
            } catch (error) {
                console.error("Asset preloading failed:", error);
                // Continue anyway - don't block the game
                if (!isMounted) return;
                setProgress(100);
                setIsDone(true);
                setTimeout(() => {
                    if (!isMounted) return;
                    if (onComplete) {
                        onComplete();
                    } else {
                        setState((s) => ({ ...s, currentSceneId: "title" }));
                    }
                }, 400);
            }
        })();

        return () => {
            isMounted = false;
        };
    }, [onComplete, setState]);

    // Reference isDone to satisfy linter
    void isDone;

    return (
        <div className="loading-scene">
            {/* Explicit image element to ensure background asset is loaded */}
            <img
                src="assets/loading_bg.png"
                alt={t("loadingScreen.backgroundAlt")}
                className="loading-bg"
            />
            <div className="loading-center">
                <img
                    src={"assets/ppl_logo.png"}
                    alt={t("loadingScreen.logoAlt")}
                    className="loading-logo"
                />
                <div className="loading-bar-wrapper">
                    <div className="loading-bar-text">
                        {t("loadingScreen.loading")}
                    </div>
                    <div className="loading-bar-track">
                        <div
                            className="loading-bar-fill"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
