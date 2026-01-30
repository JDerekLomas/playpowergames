export class ScoreboardSceneConfig {
    // setupBackground
    static readonly BACKGROUND = {
        POSITION: {
            X: 640,
            Y: 384,
        },
        SCALE: 1.01,
    };

    // createMuteButton
    static readonly MUTE_BUTTON = {
        POSITION: {
            X: 1210,
            Y: 90,
        },
    };

    static readonly FEEDBACK_TEXT = {
        POSITION: {
            Y: 100,
        },
        FONT: "700 46px Exo",
        COLOR: "#ffffff",
        STROKE: "#000000",
        STROKE_THICKNESS: 7,
    };

    // setupScoreBar
    static readonly SCORE_BAR = {
        POSITION: {
            X: 640,
            Y: 407,
        },
        FULL_Y: 13,
        TEXT_Y: 12,
        HELP_BTN_Y: 5,
        HELP_BTN_X: 152,
        TEXT: {
            FONT: "600 42px Exo",
            STROKE_THICKNESS: 6,
            STROKE: "#000000",
            COLOR: "#ffffff",
        },
    };

    // setupPointsBar
    static readonly POINTS_BAR = {
        POSITION: {
            X: 640,
            Y: 475,
        },
        TEXT: {
            POSITION: {
                X: 640,
                Y: 463,
            },
            FONT: "600 42px Exo",
            STROKE_THICKNESS: 6,
            STROKE: "#000000",
            COLOR: "#ffffff",
        },
    };

    static readonly TREASURE_BTN = {
        POSITION: {
            X: 488,
            Y: 470,
        },
    };

    // setupPlayAgainButton
    static readonly PLAY_AGAIN_BUTTON = {
        POSITION: {
            X: 640,
            Y: 625,
        },
        TEXT_Y: 15,
        TEXT: {
            FONT: "700 36px Exo",
            COLOR: "#ffffff"
        },
    };

    // createWizard
    static readonly WIZARD = {
        POSITION: {
            X: 257,
            Y: 634,
        },
    };
}
