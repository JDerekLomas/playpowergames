import { DisplayConfig } from '@k8-games/sdk';

export class ScoreBoardConfig {
    private static displayConfig = DisplayConfig.getInstance();

    static readonly ASSETS = {
        PATHS: {
            SCORE_BOARD: 'assets/images/score_board',
        },
        KEYS: {
            IMAGE: {
                BACKGROUND: 'bg.png',
            }
        },
    };

    static readonly UI = {
        TITLE: {
            FONT_SIZE: 38,
            COLOR: '#FFDD00',
            Y_OFFSET: -250,
            LETTER_SPACING: 2,
        },
        CUPS: {
            Y_OFFSET: 220,
            X_OFFSET: 260,
        },
        STATS: {
            CARD: {
                WIDTH: 163,
                HEIGHT: 199,
                RADIUS: 20,
                COLORS: {
                    ACCURACY: 0x285F00,
                    TIME: 0x4E00C6,
                    STARS: 0x7E3000,
                },
                TEXT: {
                    HEADING: {
                        FONT_SIZE: 26,
                        Y_OFFSET: -124,
                    },
                    VALUE: {
                        FONT_SIZE: 40,
                        Y_OFFSET: 50,
                    },
                },
                ICON: {
                    Y_OFFSET: -40,
                },
                X_OFFSETS: {
                    ACCURACY: -209,
                    TIME: 0,
                    STARS: 209,
                },
            },
        },
        BUTTONS: {
            Y_OFFSET: 270,
            SPACING: 203,
            SCALE: 1,
            TWEEN: {
                DURATION: 200,
            },
        },
    };

    static readonly TIME = {
        FORMAT: {
            MINUTES_PADDING: 2,
            SECONDS_PADDING: 2,
        },
    };
}
