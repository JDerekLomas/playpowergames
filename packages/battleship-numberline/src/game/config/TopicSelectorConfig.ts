export class TopicSelectorConfig {
    static readonly ASSETS = {
        PATHS: {
            TOPIC_SELECTOR: 'assets/images/topic_selector',
        },
        KEYS: {
            IMAGE: {
                BACKGROUND: 'topic_selector_bg',
                TOPIC_BANNER: 'topic_banner',
                TOPIC_BUTTON: {
                    FRACTION: 'topic_button_fraction',
                    SHADOW: 'topic_button_shadow',
                },
            },
        },
    };

    static readonly TOPIC_BUTTON = {
        SCALE: 1,
        POSITIONS: {
            FRACTION: {
                X: 0.5, // Relative to screen width
                Y: 0.53, // Relative to screen height
            },
            WHOLE: {
                X: 0.5,
                Y: 0.5,
            },
            DECIMAL: {
                X: 0.75,
                Y: 0.5,
            },
        },
        SHADOW_OFFSET: {
            X: 7,
            Y: 9,
        },
        TINT: {
            LIGHT: 0x929292,
            DARK: 0x595454,
            RESET: 0xffffff,
            TIME: 150,
        },
    };

    static readonly BANNER = {
        POSITION: {
            X: 0.5, // Relative to screen width
            Y: 0.2, // Relative to screen height
        },
        FONT: {
            SIZE: 24.6,
            COLOR: '#FFFFFF',
            FAMILY: 'SFTransRobotics',
            STROKE_COLOR: '#000000',
            STROKE_THICKNESS: 5,
        },
    };

    static readonly TOPIC_BUTTON_TEXT = {
        POSITION: {
            Y: 160,
        },
        FONT: {
            SIZE: 24.6,
            COLOR: '#FFFFFF',
            FAMILY: 'SFTransRobotics',
            STROKE_COLOR: '#000000',
            STROKE_THICKNESS: 5,
        },
    }

    static readonly A11Y = {
        TOPIC_BUTTON: {
            LABEL: {
                FRACTION: 'Fractions',
            }
        }
    }
}
