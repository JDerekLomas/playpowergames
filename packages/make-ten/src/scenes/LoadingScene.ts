import { AssetsConfig } from "../config/AssetsConfig";
import { BaseScene, GameConfigManager, i18n, LoadingScene as LoadingSceneSdk, ScoreboardHelper, setSceneBackground } from "@k8-games/sdk";
import { GameScene } from "./GameScene";
import { DoorUtils } from "../utils/DoorUtils";

export class LoadingScene extends BaseScene {
    private loadingScene: LoadingSceneSdk;
    private mode: string;

    constructor() {
        super("LoadingScene");
        this.loadingScene = LoadingSceneSdk.getInstance();
        const gameConfigManager = GameConfigManager.getInstance();
        this.mode = gameConfigManager.get('mode') || 'make_ten';
    }

    init() {
        setSceneBackground('assets/images/common/background.png');
        this.loadingScene.init(this, "StartScene");
    }

    preload() {

        GameScene._preload(this);
        const { IMAGES, SPRITES, AUDIO, BUTTONS } = AssetsConfig.KEYS;
        const language = i18n.getLanguage() || "en";

        this.load.setPath(AssetsConfig.PATHS.BUTTONS);
        this.load.image(BUTTONS.DEFAULT, "btn_default.png");
        this.load.image(BUTTONS.HOVER, "btn_hover.png");
        this.load.image(BUTTONS.PRESSED, "btn_pressed.png");
        this.load.image(BUTTONS.DISABLED, "btn_disabled.png");
        this.load.image(BUTTONS.ICON_BTN, "icon_btn_default.png");
        this.load.image(BUTTONS.ICON_BTN_HOVER, "icon_btn_hover.png");
        this.load.image(BUTTONS.ICON_BTN_PRESSED, "icon_btn_pressed.png");
        this.load.image(BUTTONS.ICON_BTN_DISABLED, "icon_btn_disabled.png");
        this.load.image(BUTTONS.HALF_BUTTON, "half_button_default.png");
        this.load.image(BUTTONS.HALF_BUTTON_HOVER, "half_button_hover.png");
        this.load.image(BUTTONS.HALF_BUTTON_PRESSED, "half_button_pressed.png");
        this.load.image(BUTTONS.VOLUME_CONTROL_ICON, "icon_settings.png");
        this.load.image(BUTTONS.HELP_BTN, "icon_help.png");
        this.load.image(BUTTONS.MUTE_BTN, "icon_mute.png");
        this.load.image(BUTTONS.SOUND_BTN, "icon_unmute.png");
        this.load.image(BUTTONS.PAUSE_BTN, "icon_pause.png");
        this.load.image(BUTTONS.RESTART_BTN, "icon_resume.png");


        this.load.setPath(AssetsConfig.PATHS.IMAGE);
        this.load.image(IMAGES.MAKE_TEN_LOGO, this.mode === 'make_20' ? `make_20_logo_${language}.png` : `make_ten_logo_${language}.png`);
        this.load.image(IMAGES.START_BACKGROUND, this.mode === 'make_20' ? 'make_20_splash_screen.png' : "start-background.png");
        this.load.image(IMAGES.NUMBER_PAD_DEFAULT, "number-pad-default.png");
        this.load.image(IMAGES.NUMBER_PAD_PRESSED, "number-pad-pressed.png");
        this.load.image(IMAGES.NUMBER_PAD_HOVER, "number-pad-hover.png");
        this.load.image(IMAGES.NUMBER_PAD_INACTIVE, "number-pad-inactive.png");
        this.load.image(IMAGES.PLAY_BTN, "play-icon.png");
        this.load.image(
            IMAGES.GAME_SCENE_BACKGROUND,
            this.mode === 'make_20' ? 'make_20_game_bg.png' : "game-scene-background.png"
        );
        this.load.image(
            IMAGES.GAME_LIGHT_BACKGROUND,
            this.mode === 'make_20' ? 'make_20_game_bg.png' : "game-light-background.png"
        );
        this.load.image(
            IMAGES.HOW_TO_PLAY_RECTANGLE,
            "how-to-play-rectangle.png"
        );
        this.load.image(
            IMAGES.CELEBRATION_BACKGROUND,
            this.mode === 'make_20' ? 'make_20_scoreboard_bg.png' : "celebration_background.png"
        );
        this.load.image(
            IMAGES.CELEBRATION_SHINE_STAR,
            "celebration_shine_star.png"
        );
        this.load.image(IMAGES.CORRECT_ICON, "correct_icon.png");
        this.load.image(IMAGES.CHECKMARK, "checkmark.png");
        this.load.image(IMAGES.CROSS, "cross.png");
        this.load.image(IMAGES.GAME_RECTANGLE, "game-rectangle.png");
        this.load.image(IMAGES.TREASURE_BTN, "treasure-btn.png");
        this.load.image(IMAGES.STAR, "star.png");
        this.load.image(IMAGES.WIZARD_HAPPY, "wizard_happy.png");
        this.load.image('hand', 'hand.png');
        this.load.image('hand_click', 'hand_click.png');
        this.load.image('splash_scene_star', 'splash_scene_star.png');
        this.load.image('question_change_light', 'question_change_light.png');
        this.load.image('question_change_dark', 'question_change_dark.png');
        this.load.image('scoreboard_bg', this.mode === 'make_20' ? 'make_20_scoreboard_bg.png' : 'scoreboard_bg.png');
        this.load.image('clear_icon', 'clear_icon.png');
        this.load.image('continue_btn_bg', 'continue_btn_bg.png');

        this.load.setPath(AssetsConfig.PATHS.SPRITE);
        // TODO: Uncomment when the logo animation is ready
        // this.load.spritesheet(
        //     SPRITES.MAKING_TEN_LOGO,
        //     "making-ten-logo-sprite.png",
        //     SPRITE_FRAMES.MAKING_TEN_LOGO
        // );
        this.load.atlas(
            SPRITES.WIZARD_CELEBRATE,
            `${SPRITES.WIZARD_CELEBRATE}/spritesheet.png`,
            `${SPRITES.WIZARD_CELEBRATE}/spritesheet.json`
        );
        this.load.atlas('streak_animation_0', 'streak_animation/texture-0.png', 'streak_animation/texture-0.json');
        this.load.atlas('streak_animation_1', 'streak_animation/texture-1.png', 'streak_animation/texture-1.json');
        this.load.atlas('streak_animation_2', 'streak_animation/texture-2.png', 'streak_animation/texture-2.json');
        
        this.load.setPath(AssetsConfig.PATHS.AUDIO);
        this.load.audio(AUDIO.MUSIC_LOOP, this.mode === 'make_20' ? "make_20_bg_music.mp3" : "music-loop.mp3");
        this.load.audio(AUDIO.WIZARD_HAPPY, "wizard-happy.mp3");
        this.load.audio(AUDIO.WIZARD_SAD, "wizard-sad.mp3");
        this.load.audio(AUDIO.QUESTION_CHANGE, "question-change.mp3");
        this.load.audio(AUDIO.COIN_SCORECARD, "coin-and-scorecard-appear.mp3");

        this.load.setPath(`${AssetsConfig.PATHS.AUDIO}/info_screen`);
        this.load.audio('step_1', `step_1_${language}.mp3`);
        this.load.audio('step_2', `step_2_${language}.mp3`);
        this.load.audio('step_3', this.mode === 'make_20' ? `step_3_make_20_${language}.mp3` : `step_3_${language}.mp3`);
        this.load.audio('step_4', this.mode === 'make_20' ? `step_4_make_20_${language}.mp3` : `step_4_${language}.mp3`);
        this.load.audio('step_5', `step_5_${language}.mp3`);

        this.load.setPath(`${AssetsConfig.PATHS.AUDIO}/info_screen/counts`);
        for (let i = 1; i <= 18; i++) {
            this.load.audio(`count${i}`, `count${i}_${language}.mp3`);
        }
        
    }

    static _preload(scene: BaseScene) {
        LoadingSceneSdk.preload(scene);
        DoorUtils._preload(scene);
        ScoreboardHelper._preload(scene);
    }

    create() { }
}
