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
    PURPLE_PATH: `assets/components/button/images/purple`,
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

export const MULTIVERSE_TOPICS = ['grade2_topic1', 'grade2_topic3', 'grade2_topic4', 'grade4_topic2', 'grade5_topic3', 'grade3_topic4', 'g5_g6', 'g7_g8'];

export const SUCCESS_TEXT_KEYS = [
    'greatJob',
    'awesomeWork',
    'youreAmazing',
    'keepItUp',
    'fantasticEffort',
    'wellDone'
];

export type QuestionType = {
    operand1: string;
    operand2: string;
    operator: string;
    answer: string;
};

export enum ProjectileState {
    IDLE = 'idle',
    DRAGGING = 'dragging',
    FLYING = 'flying'
}

export interface TargetData {
    value: number;
    isCorrect: boolean;
    isHit: boolean;
    index: number;
    text: Phaser.GameObjects.Text;
    drum: Phaser.GameObjects.Image;
}