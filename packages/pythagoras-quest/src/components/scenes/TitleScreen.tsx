import React from "react";
import { preloadImages } from "../../utils/preloadImages";
import { useTranslations } from "../../hooks/useTranslations";
import { useAudioManager } from "../../context/AudioContext";
import { useSceneAnnouncement } from "../../hooks/useSceneAnnouncement";

interface TitleScreenProps {
    onStart: () => void;
}

// Extended component interface to include _preload method
interface TitleScreenComponent extends React.FC<TitleScreenProps> {
    _preload: () => Promise<void>;
}

// Static preload method for efficient asset loading (follows K8 Games pattern)
const preloadAssets = () =>
    preloadImages([
        "assets/title_bg.png",
        "assets/title_en.png",
        "assets/title_es.png",
        "assets/scroll/scroll_1.png",
        "assets/scroll/scroll_2.png",
        "assets/scroll/scroll_3.png",
        "assets/scroll/scroll_4.png",
        "assets/scroll/scroll_5.png",
        "assets/scroll/scroll_6.png",
    ]);

export const TitleScreen: TitleScreenComponent = ({ onStart }) => {
    const { t, currentLanguage } = useTranslations();
    const { playBgm } = useAudioManager();
    
    // Announce scene change to screen readers
    useSceneAnnouncement('title');

    // Animation phases: title fades in -> play scroll frames -> reveal CTA
    const [phase, setPhase] = React.useState<"title" | "scroll" | "cta">(
        "title"
    );
    const [titleVisible, setTitleVisible] = React.useState(false);
    const [scrollFrame, setScrollFrame] = React.useState<number>(0); // 0 = hidden, 1..6 show

    // Resolve localized title image
    const titleSrc =
        currentLanguage === "es"
            ? "assets/title_es.png"
            : "assets/title_en.png";

    // Preload images and drive the sequence
    React.useEffect(() => {
        let timeouts: number[] = [];
        let intervalId: number | null = null;

        // Preload title and scroll frames
        const imgs = [
            titleSrc,
            "assets/scroll/scroll_1.png",
            "assets/scroll/scroll_2.png",
            "assets/scroll/scroll_3.png",
            "assets/scroll/scroll_4.png",
            "assets/scroll/scroll_5.png",
            "assets/scroll/scroll_6.png",
        ];
        imgs.forEach((src) => {
            const i = new Image();
            i.src = src;
        });

        // Start: reveal title
        setTitleVisible(true);

        // After title fade, start scroll animation
        timeouts.push(
            window.setTimeout(() => {
                setPhase("scroll");
                let frame = 1;
                setScrollFrame(frame);
                intervalId = window.setInterval(() => {
                    frame += 1;
                    if (frame > 6) {
                        if (intervalId) window.clearInterval(intervalId);
                        // Keep final scroll visible
                        setScrollFrame(6);
                        setPhase("cta");
                    } else {
                        setScrollFrame(frame);
                    }
                }, 110); // ~660ms total
            }, 850)
        ); // title fade time (~700ms) + small hold

        return () => {
            timeouts.forEach((tid) => window.clearTimeout(tid));
            if (intervalId) window.clearInterval(intervalId);
        };
    }, [titleSrc]);

    const ctaVisible = phase === "cta";

    return (
        <div className="title-screen-wrapper">
            {/* Centered title image with fade-in */}
            <div className="title-center">
                <img
                    src={titleSrc}
                    alt={currentLanguage === "es" ? "El camino de Pitàgoras: El aprendiz de Crotona Título image" : "Pythagoras' Path: The apprentice of croton Title image"}
                    className="title-logo title-logo-large"
                    // Keep fade animation but increase rendered size while remaining responsive
                    style={{
                        opacity: titleVisible ? 1 : 0,
                        transition: "opacity 800ms ease",
                        width: "clamp(620px, 42vw, 1100px)",
                    }}
                />
            </div>

            {/* Bottom scroll layer (one-shot, stays on final frame) */}
            {phase !== "title" && scrollFrame > 0 && (
                <div className="title-scroll-layer">
                    <img
                        src={`assets/scroll/scroll_${scrollFrame}.png`}
                        alt={t("titleScreen.scrollAnimationAlt")}
                        className="title-scroll"
                    />
                    {/* Content inside the scroll */}
                    <div
                        className="scroll-content"
                        style={{
                            opacity: ctaVisible ? 1 : 0,
                            transition: "opacity 450ms ease 60ms",
                        }}
                    >
                        <p className="title-subtitle-text">
                            {t("titleScreen.subtitle")}
                        </p>
                        <button
                            className="btn-wider"
                            onClick={() => {
                                void playBgm();
                                onStart();
                            }}
                            aria-label={t("titleScreen.enterSchool")}
                        >
                            <span className="btn-label">
                                {t("titleScreen.enterSchool")}
                            </span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Assign the static _preload method (must be after component declaration)
TitleScreen._preload = preloadAssets;
