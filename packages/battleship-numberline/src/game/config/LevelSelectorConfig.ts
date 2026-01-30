export class LevelSelectorConfig {
    static readonly ASSETS = {
        PATHS: {
            LEVEL_SELECTOR: 'assets/images/level_selector',
        },
        KEYS: {
            BACKGROUND: 'level_selector_bg',
            BANNER: 'level_banner',
            WOOD: {
                UP: 'wood_up',
                DOWN: 'wood_down',
            },
            LEVEL_BUTTON: {
                NORMAL: 'level_button',
                PRESSED: 'level_button_press',
                LOCKED: 'level_button_locked',
                SHADOW: 'button_shadow',
            },
            STAR: {
                STAR1: 'star1',
                STAR2: 'star2',
                STAR3: 'star3',
            },
        },
    };

    static readonly BANNER = {
        POSITION: {
            X: 0.5, // Relative to screen width
            Ypx: 40, // Relative to screen height
        },
        TEXT: 'FRACTIONS',
        FONT: {
            SIZE: 30,
            COLOR: '#FFFFFF',
            FAMILY: 'SFTransRobotics',
            STROKE_COLOR: '#000000',
            LETTER_SPACING: 4,
            STROKE_THICKNESS: 5,
        },
    };

    static readonly WOOD = {
        ORIGIN: {
            TOP: { X: 0.5, Y: 0 },
            BOTTOM: { X: 0.5, Y: 1 },
        },
    };

    static readonly LEVEL_BUTTON = {
        GRID: {
            COLS: 3,
            START_X: 0.25, // Relative to screen width
            START_Y: 0.3, // Relative to screen height
            SPACING_X: 0.23, // Relative to screen width
            SPACING_Y: 0.28, // Relative to screen height
        },
        SCALE: 1,
        SHADOW_OFFSET: {
            X: 5,
            Y: 5,
        },
        STARS: {
            COUNT: 3,
            SPACING: 58,
            Y_OFFSET: 42,
        },
        TEXT: {
            Y_OFFSET: -20,
            FONT: {
                SIZE: 30,
                COLOR: '#FFFFFF',
                FAMILY: 'SFTransRobotics',
                STROKE_COLOR: '#000000',
                LETTER_SPACING: 4,
                STROKE_THICKNESS: 4,
            },
        },
    };

    static readonly BACK_BUTTON = {
        POSITION: {
            X: 80,
            Y: 80,
        },
        SCALE: 1,
    };
}

