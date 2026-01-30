export const ASSETS_PATHS = {
    IMAGES: 'assets/images',
    AUDIOS: 'assets/audios',
    ATLAS: 'assets/atlases',
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
    }
}

export const BUTTONS_YELLOW = {
    PATH: `assets/images/game_screen/yellow`,
    ICON_BTN: {
        KEY: 'icon_btn_yellow',
        PATH: 'icon_btn_default.png'
    },
    ICON_BTN_HOVER: {
        KEY: 'icon_btn_yellow_hover',
        PATH: 'icon_btn_hover.png'
    },
    ICON_BTN_PRESSED: {
        KEY: 'icon_btn_yellow_pressed',
        PATH: 'icon_btn_pressed.png'
    },
    ICON_BTN_DISABLED: {
        KEY: 'icon_btn_yellow_disabled',
        PATH: 'icon_btn_disabled.png'
    },
    LAB_ICON: {
        KEY: 'lab_icon',
        PATH: 'icon_lab.png'
    }
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
    EQUAL_BUTTON: {
        KEY: 'equal_button',
        PATH: 'equal_button.png'
    },
    GREATER_BUTTON: {
        KEY: 'greater_than_btn',
        PATH: 'greater_than_btn.png'
    },
    LESS_BUTTON: {
        KEY: 'less_than_btn',
        PATH: 'less_than_btn.png'
    },
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
    THREE_IN_A_ROW: 0x2D6600,
    FIVE_IN_A_ROW: 0x006696,
    SEVEN_IN_A_ROW: 0x5F008B,
};

export const TOPICS = {
    compare_percents: {
        SPLASH_SCREEN: {
            TITLE: 'fraction_frenzy',
            CARD: 'card_front_math_circle'
        },
        TYPE: 'fractions',
        INFO: {
            QUESTION_1: {
                NUMERATOR: 7,
                DENOMINATOR: 10,
                LABEL: '7/10',
                VISUAL: 'rectangle'
            },
            QUESTION_2: {
                NUMERATOR: 3,
                DENOMINATOR: 5,
                LABEL: '60/100',
                VISUAL: 'hundredthsGrid'
            }
        }
    },
    compare_numbers: {
        SPLASH_SCREEN: {
            TITLE: 'number_comparison',
            CARD: 'card_front_math_rectangle'
        },
        TYPE: 'numbers',
        INFO: {
            QUESTION_1: {
                NUMERATOR: 7,
                DENOMINATOR: 100,
                LABEL: '7',
                VISUAL: 'circles'
            },
            QUESTION_2: {
                NUMERATOR: 3,
                DENOMINATOR: 100,
                LABEL: '3',
                VISUAL: 'circles'
            }
        }
    },
    compare_fractions: {
        SPLASH_SCREEN: {
            TITLE: 'fraction_frenzy',
            CARD: 'card_front_math_circle'
        },
        TYPE: 'fractions',
        INFO: {
            QUESTION_1: {
                NUMERATOR: 1,
                DENOMINATOR: 2,
                LABEL: '1/2',
                VISUAL: 'pizza'
            },
            QUESTION_2: {
                NUMERATOR: 1,
                DENOMINATOR: 4,
                LABEL: '1/4',
                VISUAL: 'pizza'
            }
        }
    }
}

export function getTopicConfig(topic: string) {
    return TOPICS[topic as keyof typeof TOPICS] || TOPICS.compare_percents;
}
