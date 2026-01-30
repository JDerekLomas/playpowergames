export class AssetsConfig {
    static readonly PATHS = {
        MAIN: "./assets",
        IMAGE: "./assets/images",
        BUTTONS: "./assets/components/button/images/purple",
        SPRITE: "./assets/sprites",
        AUDIO: "./assets/audio",
    };

    static readonly KEYS = {
        BUTTONS: {
            DEFAULT: "btn_default",
            HOVER: "btn_hover",
            PRESSED: "btn_pressed",
            DISABLED: "btn_disabled",
            ICON_BTN: "icon_btn_default",
            ICON_BTN_HOVER: "icon_btn_hover",
            ICON_BTN_PRESSED: "icon_btn_pressed",
            ICON_BTN_DISABLED: "icon_btn_disabled",
            HALF_BUTTON: "half_button_default",
            HALF_BUTTON_HOVER: "half_button_hover",
            HALF_BUTTON_PRESSED: "half_button_pressed",
            PAUSE_BTN: "icon_pause",
            RESTART_BTN: "icon_resume",
            MUTE_BTN: "icon_mute",
            SOUND_BTN: "icon_unmute",
            HELP_BTN: "icon_help",
            VOLUME_CONTROL_ICON: "icon_settings",
        },
        IMAGES: {
            GAME_BACKGROUND: "game-background",
            GAME_SCENE_BACKGROUND: "game-scene-background",
            GAME_LIGHT_BACKGROUND: "game-light-background",
            START_BACKGROUND: "start-background",
            CELEBRATION_BACKGROUND: "celebration_background",
            HOW_TO_PLAY_RECTANGLE: "how-to-play-rectangle",
            GAME_RECTANGLE: "game-rectangle",
            MAKE_TEN_LOGO: "make-ten-logo",
            CORRECT_ICON: "correct_icon",
            CELEBRATION_SHINE_STAR: "celebration_shine_star",
            CHECKMARK: "checkmark",
            CROSS: "cross",
            HELP_RED_BTN: "help-red-btn",
            HELP_RED_BTN_FADED: "help-red-btn-faded",
            TREASURE_BTN: "treasure-btn",
            STAR: "star",
            NUMBER_PAD_DEFAULT: "number-pad-default",
            NUMBER_PAD_PRESSED: "number-pad-pressed",
            NUMBER_PAD_HOVER: "number-pad-hover",
            NUMBER_PAD_INACTIVE: "number-pad-inactive",
            PLAY_BTN: "play-icon",
            WIZARD_HAPPY: "wizard_happy",
        },
        SPRITES: {
            MAKING_TEN_LOGO: "making-ten-logo-sprite",
            WIZARD_CELEBRATE: "wizard-celebrate",
        },
        AUDIO: {
            LOGO_APPEAR: "logo-appear",
            MUSIC_LOOP: "music-loop",
            WIZARD_HAPPY: "wizard-happy",
            WIZARD_SAD: "wizard-sad",
            QUESTION_CHANGE: "question-change",
            COIN_SCORECARD: "coin-scorecard",
        },
        ANIMATIONS: {
            MAKING_TEN_LOGO_ANIMATION: "making-ten-logo-animation",
            WIZARD_CELEBRATE_ANIMATION: "wizard-celebrate-animation",
            SCORE_UPDATE_ANIMATION: "score-update-animation",
            SCORE_UPGRADE_ANIMATION: "score-upgrade-animation",
        },
    };

    static readonly SPRITE_FRAMES = {
        PPL_LOGO: {
            frameWidth: 480,
            frameHeight: 200,
        },
        MAKING_TEN_LOGO: {
            frameWidth: 510,
            frameHeight: 450,
        },
        WIZARD_TUTORIAL_SCORECARD_1: {
            frameWidth: 360,
            frameHeight: 360,
        },
        WIZARD_TUTORIAL_SCORECARD_2: {
            frameWidth: 360,
            frameHeight: 360,
        },
        WIZARD_CELEBRATE_1: {
            frameWidth: 582,
            frameHeight: 702,
        },
        WIZARD_CELEBRATE_2: {
            frameWidth: 582,
            frameHeight: 702,
        },
        WIZARD_DISAPPOINTED: {
            frameWidth: 400,
            frameHeight: 360,
        },
    };
}
