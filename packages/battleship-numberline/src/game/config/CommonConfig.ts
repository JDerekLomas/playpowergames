export class CommonConfig {
    static readonly ASSETS = {
        PATHS: {
            FONT_BASE: 'assets/fonts',
            MUSIC_BASE: 'assets/audios/music',
            SFX_BASE: 'assets/audios/sound_effects',
            MENU_IMAGE_BASE: 'assets/images/menu',
            BUTTON_IMAGE_BASE: 'assets/images/buttons',
        },
        KEYS: {
            FONT: {
                EUROSTILE: 'eurostile',
                SF_TRANS_ROBOTIC: 'SFTransRobotics',
                EXO: 'exo',
            },
            MUSIC: {
                GAME_THEME: 'LOOP_GameThemeMusic',
            },
            SFX: {
                CLICK: 'button_click',
            },
            IMAGE: {
                BUTTON: {
                    DEFAULT: 'btn_default',
                    HOVER: 'btn_hover',
                    PRESSED: 'btn_pressed',
                    SQ_DEFAULT: 'icon_btn_default',
                    SQ_HOVER: 'icon_btn_hover',
                    SQ_PRESSED: 'icon_btn_pressed',
                    SQ_INACTIVE: 'icon_btn_disabled',
                },
                ICON: {
                    PAUSE_ICON: 'icon_pause',
                    PLAY_ICON: 'icon_resume',
                    RESTART_ICON: 'restart_icon',
                    MUTE_ICON: 'icon_mute',
                    SOUND_ICON: 'icon_unmute',
                    HELP_ICON: 'icon_help',
                    LEVELS_ICON: 'levels_icon',
                    NEXT_ICON: 'next_icon',
                    VOLUME_CONTROL_ICON: 'icon_settings',
                    LEFT_ARROW_ICON: 'left_arrow',
                    RIGHT_ARROW_ICON: 'right_arrow',
                    SKIP_ICON: 'skip_icon',
                },
            },
        },
    };

    static readonly AUDIO = {
        MUSIC: {
            VOLUME: 0.3,
            FADE_DURATION: 1000,
        },
        SFX: {
            VOLUME: 0.5,
            BOMB_DROP: {
                VOLUME: 0.4,
            },
            BOMB_BLAST: {
                VOLUME: 0.5,
            },
            BOMB_MISS: {
                VOLUME: 0.4,
            },
            BOMB_SUBMERGE: {
                VOLUME: 0.4,
            },
        },
    };

    static readonly STREAK_COLORS = {
        DEFAULT: 0xebb800,
        THREE_IN_A_ROW: 0x57cc02,
        FIVE_IN_A_ROW: 0x00adff,
        SEVEN_IN_A_ROW: 0xc13bff,
    };

    static readonly ISLAND_NAMES = ['volcano', 'mayan_electric_temple', 'colosseum', 'lighthouse', 'desert', 'arctic_doomsday'];

    static readonly REGEX_PATTERNS = {
        MIXED_FRACTION: /^\s*(-?\d+)\s+(\d+)\/(\d+)\s*$/,
        SIMPLE_FRACTION: /^\s*(\d+)\/(\d+)\s*$/,
        WHOLE_NUMBER: /^\s*(\d+)\s*$/,
    };
}
