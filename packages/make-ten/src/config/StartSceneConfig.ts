export class StartSceneConfig {
    static readonly START_BACKGROUND = {
        POSITION: {
            X: 640,
            Y: 384,
        },
    };

    static readonly LOGO = {
        POSITION: {
            X: 640,
            Y: 300,
        },
    };

    static readonly PLAY_BUTTON = {
        POSITION: {
            X: 640,
            Y: 620,
        },
        ALPHA: 0,
        TEXT: {
            POSITION: {
                X: 640,
                Y: 605,
            },
            STYLE: {
                FONT: "700 36px Exo",
                COLOR: "#ffffff",
            },
        },
    };

    static readonly PLAY_BUTTON_TWEEN = {
        ALPHA: 1,
        DURATION: 200,
        EASE: "Linear",
    };

    static readonly PLAY_TEXT_TWEEN = {
        ALPHA: 1,
        DURATION: 200,
        EASE: "Linear",
    };

    static readonly PLAY_BUTTON_HIGHLIGHT = {
        SCALE: 1.05,
    };

    static readonly PLAY_BUTTON_RESET = {
        SCALE: 1.0,
    };

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
    };

    static readonly OVERLAY_TWEEN = {
        ALPHA: 0.7,
        DURATION: 300,
        EASE: "Power2",
    };

    static readonly CAMERA_ZOOM = {
        ZOOM: 1.5,
        DURATION: 300,
        EASE: "Power2",
        RESET_ZOOM: 1,
    };
}
