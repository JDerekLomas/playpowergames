export class HowToPlaySceneConfig {
    static readonly ASSETS = {
        PATH: 'assets/images/how_to_play',
        KEYS: {
            TARGET_POINT: 'target_point',
            HAND: 'hand',
            HAND_CLICK: 'hand_click',
            POINTING_HAND: 'pointing_hand',
        },
    };

    static readonly TITLE = {
        FONT: "700 30px Exo",
        POSITION: {
            Y: 60,
        },
    };

    static readonly UPPER_CONTAINER = {
        POSITION: {
            Y_OFFSET: -210,
        },
        RECTANGLE: {
            WIDTH: 505,
            HEIGHT: 139,
            COLOR: 0x120b27,
            ALPHA: 0.7,
        },
        TEXT: {
            INSTRUCTION: {
                FONT_SIZE: '26px',
                COLOR: '#FFFFFF',
                Y_OFFSET: -30,
            },
            SPACING: 5,
            FRACTION_LINE_PADDING: 20,
            MATH: {
                FONT_SIZE: '30px',
                COLOR: 0xffffff,
                Y_OFFSET: 30,
            },
            ANSWER: {
                FONT_SIZE: '30px',
                COLOR: 0x00ff00,
                X_OFFSET: 10,
            },
        },
    };

    static readonly LOWER_CONTAINER = {
        POSITION: {
            Y_OFFSET: 80,
        },
        RECTANGLE: {
            WIDTH: 505,
            HEIGHT: 55,
            COLOR: 0x000000,
            ALPHA: 0.7,
        },
        TEXT: {
            FONT_SIZE: '26px',
            COLOR: '#FFFFFF',
        },
    };

    static readonly TARGET_TEXT = {
        FONT_SIZE: '32px',
        COLOR: 0x37c351,
        Y_OFFSET: 25, // From vertical center
        BOTTOM_Y_OFFSET: -80, // From bottom
        LINE_HEIGHT: 3,
        SPACING: 15,
        FRACTION_LINE_PADDING: 18,
    }
}
