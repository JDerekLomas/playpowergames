export class GameSceneConfig {
    // setupBackground
    static readonly GAME_LIGHT_BACKGROUND = {
        POSITION: {
            X: 640,
            Y: 384,
        },
        SCALE: 1.01,
    };

    static readonly GAME_RECTANGLE = {
        POSITION: {
            X: 640,
            Y: 232,
        },
        CROP: {
            X: 0,
            Y: 134,
            WIDTH: 1280,
            HEIGHT: 250,
        },
        TINT: 0x1a1a2e,
    };

    static readonly RECTANGLE = {
        POSITION: {
            X: 640,
            Y: 232,
        },
        SIZE: {
            WIDTH: 1280,
            HEIGHT: 270,
        },
    };

    // createCirclesDisplay
    static readonly CIRCLES_DISPLAY = {
        POSITION: {
            X: 521,
            Y: 145,
        },
        RADIUS: 22,
    };

    // createMuteButton
    static readonly MUTE_BUTTON = {
        POSITION: {
            X: 1226,
            Y: 142,
        },
    };

    // renderQuestion
    static readonly PREV_QUESTION_TWEEN_1 = {
        X: 20,
        DURATION: 100,
        EASE: "Linear",
    };

    static readonly PREV_QUESTION_TWEEN_2 = {
        DURATION: 500,
        EASE: "Linear",
    };

    static readonly QUESTION_CONFIG = {
        FONT_FAMILY: "Exo",
        FONT_SIZE: 28,
        COLOR: "#fff",
        ALIGN: "center",
        FONT_STYLE: "300",
    };

    static readonly EQ_CONFIG = {
        FONT_SIZE: 38,
        FONT_STYLE: "bold",
    };

    static readonly INPUT_BOX = {
        STROKE: {
            COLOR: 0xffffff,
        },
    };

    static readonly QUESTION_TEXTS = {
        POSITION: {
            X: 1280,
            Y: 337,
        },
        SPACING: 40,
    };

    static readonly NEXT_QUESTION_TWEEN = {
        WIDTH_RATIO: 0.5,
        DURATION: 500,
        EASE: "Power2",
    };

    // createNumberPad

    static readonly NUMBER_PAD = {
        POSITION: {
            X: 542,
            Y: 410,
        },
        PADDING: 30,
        THEME: "bright" as "bright",
        FONT_SIZE: 42,
        BUTTON_BOTTOM_PADDING: 5,
    };

    static readonly NUMBER_PAD_TWEEN = {
        ZOOM: 2,
        DURATION: 300,
        EASE: "Power2",
        RESET_ZOOM: 1,
    };

    // createWizardCelebrate
    static readonly WIZARD_CELEBRATE = {
        POSITION: {
            X: 250,
            Y: 600,
        },
    };

    // createWizardDisappointed
    static readonly WIZARD_DISAPPOINTED = {
        POSITION: {
            X: 250,
            Y: 615,
        },
    };

    // createScoreDisplay
    static readonly COIN_BG = {
        POSITION: {
            X: 110,
            Y: 62,
        },
    };

    static readonly COIN = {
        POSITION: {
            X: 74,
            Y: 125,
        },
    };

    static readonly SCORE_DISPLAY = {
        POSITION: {
            X: 145,
            Y: 65,
        },
        FONT: "700 24px Exo",
        COLOR: "#000",
    };

    static readonly COMBO_MULTIPLIER = {
        POSITION: {
            X: 74,
            Y: 65,
        },
        FONT: "700 24px Exo",
        COLOR: "#fff",
        STROKE: {
            COLOR: "#000",
            WIDTH: 3,
        },
    };

    static readonly QUESTION_PROGRESS = {
        POSITION: {
            X: 640,
            Y: 48,
        },
    };
}
