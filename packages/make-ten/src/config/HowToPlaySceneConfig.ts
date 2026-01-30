export class HowToPlaySceneConfig {
    // setupBackground
    static readonly GAME_SCENE_BACKGROUND = {
        POSITION: {
            X: 640,
            Y: 384,
        },
        SCALE: 1.01,
    };

    static readonly HOW_TO_PLAY_RECTANGLE = {
        POSITION: {
            X: 640,
            Y: 400,
        },
        TINT: 0x1a1a2e,
    };

    static readonly RECTANGLE = {
        POSITION: {
            X: 640,
            Y: 410,
        },
        SIZE: {
            WIDTH: 1280,
            HEIGHT: 539,
        }
    };

    static readonly CAMERA = {
        BACKGROUND_COLOR: "#1a1a2e",
    };

    // createTitleAndSubtitle
    static readonly TITLE = {
        POSITION: {
            X: 640,
            Y: 36,
        },
        STYLE: {
            FONT_FAMILY: "Exo",
            FONT_SIZE: "30px",
            COLOR: "#ffffff",
            ALIGN: "center",
        },
    };

    static readonly SUBTITLE = {
        POSITION: {
            X: 640,
            Y: 98,
        },
        STYLE: {
            FONT_FAMILY: "Exo",
            FONT_SIZE: "30px",
            COLOR: "#ffffff",
            ALIGN: "center",
        }
    };

    // createExample
    static readonly EXAMPLE = {
        POSITION: {
            X: 364,
            Y: 159,
        },
        STYLE: {
            FONT_FAMILY: "Exo",
            FONT_SIZE: "30px",
            COLOR: "#ffffff",
        },
    };

    // createMuteButton
    static readonly MUTE_BUTTON = {
        POSITION: {
            X: 1226,
            Y: 168,
        },
    };

    // createCirclesDisplay
    static readonly CIRCLES_DISPLAY = {
        POSITION: {
            X: 521,
            Y: 177,
        },
    };

    // createEquation
    static readonly EQUATION = {
        POSITION: {
            X: 580,
            Y: 310,
        },
        STYLE: {
            FONT_FAMILY: "Exo",
            FONT_SIZE: "30px",
            COLOR: "#FFFFFF",
            ALIGN: "center",
            FONT_STYLE: "bold",
        },
    };

    static readonly NORMAL_TEXT = {
        POSITION: {
            X: 670,
            Y: 325,
        },
        STYLE: {
            FONT_FAMILY: "Exo",
            FONT_SIZE: "30px",
            COLOR: "#FFFFFF",
            ALIGN: "center",
            FONT_STYLE: "bold",
        },
        ORIGIN: {
            X: 0,
            Y: 0.5,
        }
    }

    // createNumberPad
    static readonly NUMBER_PAD = {
        POSITION: {
            X: 570,
            Y: 385,
        },
        PADDING: 0,
        BUTTON_BOTTOM_PADDING: 3,
    };

    // createWizard
    static readonly WIZARD = {
        POSITION: {
            X: 280,
            Y: 612,
        }
    }

    // createPlayButton
    static readonly PLAY_BUTTON = {
        POSITION: {
            X: 646,
            Y: 680,
        },
        SCALE: {
            OVER: 1.05,
            OUT: 1,
        }
    };

    // createPlayButtonText
    static readonly PLAY_TEXT = {
        POSITION: {
            X: 640,
            Y: 678,
        },
        STYLE: {
            FONT: "700 36px Exo",
            COLOR: "#ffffff",
        },
    };

    // startGame
    static readonly OVERLAY = {
        POSITION: {
            X: 0,
            Y: 0,
        },
        SIZE: {
            WIDTH: 1280,
            HEIGHT: 768,
        },
        COLOR: 0x000000,
        ORIGIN: {
            X: 0,
            Y: 0,
        },
        ALPHA: 0,
    }

    static readonly OVERLAY_TWEEN = {
        ALPHA: 0.7,
        DURATION: 300,
        EASE: "Power2",
    };

    static readonly CAMERA_TWEEN = {
        ZOOM: 1.5,
        ALPHA: 0.2,
        DURATION: 300,
        EASE: "Power2",
        RESET_ZOOM: 1,
    };
}
