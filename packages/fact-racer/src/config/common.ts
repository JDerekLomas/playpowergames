export const ASSETS_PATHS = {
    IMAGES: 'assets/images',
    AUDIOS: 'assets/audios',
    ATLAS: 'assets/atlases',
}

export const COMMON_ASSETS = {
    PATH: '/common',
    BACKGROUND: {
        KEY: 'bg',
        PATH: 'bg.png'
    },
    LOGO: {
        KEY: 'logo',
        PATH: 'logo.png'
    },

    DOOR: {
        KEY: 'door',
        PATH: 'door.png'
    },
    COUNT_DOWN: {
        KEY: 'countdown',
        PATH: 'countdown.mp3'
    }
}

export const BUTTONS = {
    PATH: `assets/components/button/images/blue`,
    BUTTON: {
        KEY: 'button',
        PATH: 'btn_default.png'
    },
    BUTTON_HOVER: {
        KEY: 'btn_hover',
        PATH: 'btn_hover.png'
    },
    BUTTON_PRESSED: {
        KEY: 'btn_pressed',
        PATH: 'btn_pressed.png'
    },
    BUTTON_DISABLED: {
        KEY: 'btn_disabled',
        PATH: 'btn_disabled.png'
    },
    ICON_BTN: {
        KEY: 'icon_btn',
        PATH: 'icon_btn_default.png'
    },
    ICON_BTN_HOVER: {
        KEY: 'icon_btn_hover',
        PATH: 'icon_btn_hover.png'
    },
    ICON_BTN_PRESSED: {
        KEY: 'icon_btn_pressed',
        PATH: 'icon_btn_pressed.png'
    },
    ICON_BTN_DISABLED: {
        KEY: 'icon_btn_disabled',
        PATH: 'icon_btn_disabled.png'
    },
    PAUSE_ICON: {
        KEY: 'pause_icon',
        PATH: 'icon_pause.png'
    },
    RESUME_ICON: {
        KEY: 'resume_icon',
        PATH: 'icon_resume.png'
    },
    MUTE_ICON: {
        KEY: 'mute_icon',
        PATH: 'icon_mute.png'
    },
    UNMUTE_ICON: {
        KEY: 'unmute_icon',
        PATH: 'icon_unmute.png'
    },
    HELP_ICON: {
        KEY: 'help_icon',
        PATH: 'icon_help.png'
    },
    SETTINGS_ICON: {
        KEY: 'settings_icon',
        PATH: 'icon_settings.png'
    },
    HALF_BUTTON: {
        KEY: 'half_button',
        PATH: 'half_button_default.png'
    },
    HALF_BUTTON_HOVER: {
        KEY: 'half_button_hover',
        PATH: 'half_button_hover.png'
    },
    HALF_BUTTON_PRESSED: {
        KEY: 'half_button_pressed',
        PATH: 'half_button_pressed.png'
    }
}

export const SKIP_BUTTON = {
    PATH: `assets/images/info_screen`,
    HALF_BUTTON: {
        KEY: 'half_button',
        PATH: 'half_button_default.png'
    },
    HALF_BUTTON_HOVER: {
        KEY: 'half_button_hover',
        PATH: 'half_button_hover.png'
    },
    HALF_BUTTON_PRESSED: {
        KEY: 'half_button_pressed',
        PATH: 'half_button_pressed.png'
    }
}

export const SUCCESS_TEXT_KEYS = [
    'greatJob',
    'awesomeWork',
    'youreAmazing',
    'keepItUp',
    'fantasticEffort',
    'wellDone'
];

export const SCORE_COLORS = {
    DEFAULT: 0xEBB800,
    THREE_IN_A_ROW: 0x57CC02,
    FIVE_IN_A_ROW: 0x00ADFF,
    SEVEN_IN_A_ROW: 0xC13BFF,
};

export const CUT_SCENE_ASSETS = {
    PATH: 'assets/images/cut_screen',
    INTRO_PART1: {
        KEY: 'intro_part1',
        PATH: 'intro_part1.png'
    },
    INTRO_PART2: {
        KEY: 'intro_part2',
        PATH: 'intro_part2.png'
    },
    INTRO_PART3: {
        KEY: 'intro_part3',
        PATH: 'intro_part3.png'
    },
    PLANET: {
        KEY: 'planet',
        PATH: 'planet.png'
    },
    PLANET_BACKGROUND: {
        KEY: 'planet_background',
        PATH: 'planet_background.png'
    },
    LIGHTS: {
        KEY: 'lights',
        PATH: 'lights.png'
    },
    NEW_BOARD: {
        KEY: 'new_board',
        PATH: 'new_board.png'
    },
    START_SCREEN: {
        KEY: 'start_screen',
        PATH: 'start_screen.png'
    },
    ASTROBOT_1: {
        KEY: 'astrobot_1',
        PATH: 'astrobot_1.png'
    }
}

export const MULTIVERSE_TOPICS =  ['grade2_topic1', 'grade3_topic3', 'grade3_topic4', 'grade4_topic2', 'grade5_topic3', 'grade6_topic1', 'g5_g6', 'g7_g8'];

export const FACT_RACER_POSITIONS = {
    // Question Container positions
    QUESTION_CONTAINER: {
        GAME_SCENE: {
            X: 640,
            Y: 530
        },
        GAME_MOBILE_SCENE: {
            X: 630,
            Y: 400
        },
        TUTORIAL_SCENE: {
            X: 640,
            Y: 530
        },
        TUTORIAL_MOBILE_SCENE: {
            X: 630,
            Y: 420
        }
    },

    // Layout for question/answer sections (unscaled units)
    LAYOUT: {
        SINGLE_DIGIT: {
            QUESTION_SECTION_WIDTH: 260,
            ANSWER_SECTION_WIDTH: 240,
            SECTION_GAP: -27,
            SECTION_OFFSET_X: 25,
            SECTION_OFFSET_Y: 9,
            DIGIT_GAP: 8
        },
        DOUBLE_DIGIT: {
            QUESTION_SECTION_WIDTH: 250,
            ANSWER_SECTION_WIDTH: 240,
            SECTION_GAP: 0,
            SECTION_OFFSET_X: 10,
            SECTION_OFFSET_Y: 12,
            DIGIT_GAP: -27 // gap between two digits inside the placeholder
        }
    },

    // Grid Lines positions and scales
    GRID_LINES: {
        GAME_SCENE: {
            X: 631,
            Y: 230,
            SCALE: undefined as number | undefined
        },
        GAME_MOBILE_SCENE: {
            X: 631,
            Y: 160,
            SCALE: undefined as number | undefined
        },
        TUTORIAL_SCENE: {
            X: 631,
            Y: 275,
            SCALE: 0.8
        },
        TUTORIAL_MOBILE_SCENE: {
            X: 631,
            Y: 220,
            SCALE: 1
        }
    },
    
    // Arrow positions & scales
    ARROWS: {
        GAME_SCENE: {
            X: 385,
            USER_Y: 180,
            ORANGE_Y: 230,
            YELLOW_Y: 280,
            PURPLE_Y: 330,
            SCALE: 0.5
        },
        GAME_MOBILE_SCENE: {
            X: 365,
            USER_Y: 127,
            ORANGE_Y: 160,
            YELLOW_Y: 193,
            PURPLE_Y: 225,
            SCALE: 0.34
        },
        TUTORIAL_SCENE: {
            X: 435,
            USER_Y: 235,
            ORANGE_Y: 275,
            YELLOW_Y: 315,
            PURPLE_Y: 355,
            SCALE: 0.4
        },
        TUTORIAL_MOBILE_SCENE: {
            X: 490,
            USER_Y: 200,
            ORANGE_Y: 220,
            YELLOW_Y: 240,
            PURPLE_Y: 260,
            SCALE: 0.22
        }
    },
    // Grid top labels (Start / Finish) offsets relative to grid center
    GRID_LABELS: {
        GAME_SCENE: { TOP_OFFSET: -120, LEFT_MARGIN: 75, RIGHT_MARGIN: 70, FONT_SIZE: 20 },
        GAME_MOBILE_SCENE: { TOP_OFFSET: -80, LEFT_MARGIN: 50, RIGHT_MARGIN: 50, FONT_SIZE: 16 },
        TUTORIAL_SCENE: { TOP_OFFSET: -120, LEFT_MARGIN: 100, RIGHT_MARGIN: 70, FONT_SIZE: 20 },
        TUTORIAL_MOBILE_SCENE: { TOP_OFFSET: -45, LEFT_MARGIN: 30, RIGHT_MARGIN: 30, FONT_SIZE: 10 }
    },
    // Arrow lane label offsets (left of arrows) and base font size per scenario (relative to arrow X; applied before scaling)
    ARROW_LABELS: {
        GAME_SCENE: { OFFSET_X: -150, FONT_SIZE: 40 },
        GAME_MOBILE_SCENE: { OFFSET_X: -150, FONT_SIZE: 40 },
        TUTORIAL_SCENE: { OFFSET_X: -150, FONT_SIZE: 40 },
        TUTORIAL_MOBILE_SCENE: { OFFSET_X: -160, FONT_SIZE: 40 }
    },
    FEEDBACK_RING: {
        GAME_SCENE: {
            X: 640,
            Y: 535
        },
        GAME_MOBILE_SCENE: {
            X: 640,
            Y: 417
        },
        TUTORIAL_SCENE: {
            X: 640,
            Y: 538
        },
        TUTORIAL_MOBILE_SCENE: {
            X: 640,
            Y: 424
        }
    }
}