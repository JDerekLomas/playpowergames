import { DisplayConfig } from '@k8-games/sdk';
import { ThemeManager, ThemeEnum, ThemeName } from '../managers/ThemeManager';
import { RecursivePartial } from '../interfaces/recursivePartial';
import { mergeObjects } from '../utils/mergeDeep';
import { CommonConfig } from './CommonConfig';

// Always use ASSETS inside the function  or a block of
// code such that is executed after themeManager is initialized in LoadingScene
export class GameScreenConfig {
    private static display = DisplayConfig.getInstance();
    private static themeManager = ThemeManager.getInstance();
    private static prevAssets: typeof this.DEFAULT_ASSETS;
    private static prevTheme: ThemeName;

    static readonly GAME_LOGIC = {
        HIT_THRESHOLD: 0.05,
        NEAR_MISS_THRESHOLD: 0.1,
        TARGET_DISPLAY_TIME: 800,
        REVEL_Y_RATIO: 0.58,
    };

    static readonly CURSOR = {
        ZONE: {
            START_Y: 0.2,
            END_Y: 0.7,
        },
        OFFSET: {
            X: 24,
            Y: 24,
        },
    };

    static readonly MARKER_LINES = {
        lineHeight: 35,
        width: 4,
        color: 0xffffff,
        horizontalMargin: 100,
        fontSize: 32,
        fontColor: 0xffffff,
    };

    static readonly WATER_BUBBLE_ANIMATION = {
        FRAME_RATE: 15,
        SCALE: 0.7,
        POSITIONS: [
            { X_RATIO: 0.15, Y_RATIO: 0.6 },
            { X_RATIO: 0.3, Y_RATIO: 0.66 },
            { X_RATIO: 0.45, Y_RATIO: 0.58 },
            { X_RATIO: 0.6, Y_RATIO: 0.67 },
            { X_RATIO: 0.75, Y_RATIO: 0.59 },
            { X_RATIO: 0.9, Y_RATIO: 0.64 },
        ],
    };

    static readonly WATER_ANIMATION = [
        { x: 69, y: 462, scale: 2 / 3 },
        { x: 226, y: 470, scale: 1 },
        { x: 409, y: 446, scale: 2 / 3 },
        { x: 549, y: 498, scale: 1 },
        { x: 775, y: 456, scale: 2 / 3 },
        { x: 1000, y: 471, scale: 1 },
        { x: 1184, y: 464, scale: 2 / 3 },
    ];

    static readonly SHARK_ANIMATION = {
        FRAME_RATE: 24,
        SCALE: 0.65 * this.display.scale,
        POSITION: {
            X_RATIO: 0.35,
            Y_RATIO: this.GAME_LOGIC.REVEL_Y_RATIO,
        },
    };

    static readonly SCREEN_CLICKING_ANIMATION = {
        FRAME_RATE: 30,
    };

    static readonly SHOOT_START_ANIMATION = {
        FRAME_RATE: 30,
    };

    static readonly SHARK_ENTER_ANIMATION = {
        FRAME_RATE: 24,
        SCALE: 0.65 * this.display.scale,
        POSITION: {
            X_RATIO: 0.35,
            Y_RATIO: this.GAME_LOGIC.REVEL_Y_RATIO,
        },
    };

    static readonly BLAST_ANIMATION = {
        FRAME_RATE: 30,
        SCALE: this.display.scale,
    };

    static readonly MISS_ANIMATION = {
        FRAME_RATE: 30,
        SCALE: this.display.scale,
    };

    static readonly NEAR_MISS_ANIMATION = {
        FRAME_RATE: 30,
        SCALE: this.display.scale,
    };

    static readonly SHOOT_END_ANIMATION = {
        FRAME_RATE: 30,
    };

    static readonly TIMER = {
        DURATION: 30,
        RADIUS: 40,
        RING_WIDTH: 12,
        BACKGROUND_COLOR: 0x33a149,
        FOREGROUND_COLOR: 0x616161,
        FONT_SIZE: 28,
        FONT_COLOR: '#ffffff',
        POSITION: {
            X: 100,
            Y: -80, // Relative to bottom
        },
    };

    static readonly LEVEL_TEXT = {
        FONT_SIZE: 24,
        STROKE_COLOR: '#000000',
        STROKE_THICKNESS: 5,
        COLOR: '#ffffff',
        LETTER_SPACING: 5,
    };

    static readonly SHIP_COUNTER = {
        POSITION: {
            Y_RATIO: 0.25, // Relative to topWood height
        },
    };

    static readonly ACCURACY_BAR = {
        Y_OFFSET: 242,
        WIDTH: 418,
        HEIGHT: 105,
    };

    static readonly STAR_COUNTER = {
        POSITION: {
            X: 17,
            Y: 9,
        },
    };

    static readonly DEFAULT_ASSETS = {
        PATHS: {
            CLICK_MECHANICS: 'assets/images/click_mechanics',
            TYPING_MECHANICS: 'assets/images/typing_mechanics',
            ATLASES_BASE: 'assets/atlases',
            CURSOR: 'assets/images/click_mechanics/15_target.png',
            BACKGROUND: 'assets/images/background',
        },
        KEYS: {
            IMAGE: {
                CLICK_MECHANICS: {
                    TOP_WOOD: '01a_wood.png',
                    BOTTOM_WOOD: '01b_wood.png',
                    CURSOR: '15_target.png',
                    SCREEN_CLICKING: 'screen_clicking.png',
                    PROGRESS_BAR_EMPTY: 'progress_back.png',
                    PROGRESS_BAR_FULL: 'progress_complete.png',
                    PAUSE_BUTTON: 'pause_button.png',
                    PAUSE_BUTTON_CLICKED: 'pause_button_click.png',
                    ACCURACY_ICON: 'accuracy_icon.png',
                },
                TYPING_MECHANICS: {
                    // Typing Mechanics
                    NUMBERPAD_DEFAULT: 'numberpad_default.png',
                    NUMBERPAD_HOVER: 'numberpad_hover.png',
                    NUMBERPAD_PRESSED: 'numberpad_pressed.png',
                    FIRE_DEFAULT: 'fire_default.png',
                    FIRE_PRESSED: 'fire_pressed.png',
                    FIRE_HOVER: 'fire_hover.png',
                    TYPING_MODULE: 'typing_module.png',
                    VOLUME: 'volume.png',
                    TRANSPARENT: 'transparent.png',
                },
                BACKGROUND: {
                    BG_01: 'bg_01.png',
                    BG_02: 'bg_02.png',
                },
            },
            ATLAS: {
                BLAST: 'blast',
                MISS: 'miss',
                NEAR_MISS: 'near_miss',
                SCREEN_CLICK_MODE: 'screen_click_mode',
                SHARK_ENTER: 'shark_enter',
                SHARK_LOOP: 'shark_loop',
                SHOOT_END: 'shoot_end',
                SHOOT_START: 'shoot_start',
                WATER_BUBBLE: 'water_bubble',
            },
            SFX: {
                BOMB_DROP: 'bomb_drop',
                BOMB_BLAST: 'bomb_blast',
                BOMB_MISS: 'bomb_miss',
                BOMB_SUBMERGE: 'bomb_submerge',
                TARGET_CLICK: 'target_click',
                SCREEN_CHANGE: 'screen_change',
                FIRE_BUTTON: 'fire_button',
                NUMBERPAD_CLICK: 'number_input',
                COUNTDOWN: 'countdown',
            },
        },
    };

    static readonly PIRATES_ASSETS: RecursivePartial<typeof this.DEFAULT_ASSETS> = {
        KEYS: {
            IMAGE: {
                BACKGROUND: {
                    BG_01: 'bg_02.png',
                },
            },
        },
    };

    static readonly SPACE_ASSETS = {
        KEYS: {
            IMAGE: {
                BACKGROUND: {
                    BG_01: 'bg_03.webp',
                },
            },
        },
    };

    static readonly BLUE_THEME_ASSETS = {
        KEYS: {
            IMAGE: {
                BACKGROUND: {
                    BG_01: '01BlueBG.png',
                },
                CLICK_MECHANICS: {
                    TOP_WOOD: 'BlueFrameabove.png',
                    BOTTOM_WOOD: 'BlueFramebelow.png',
                },
            },
        },
    };

    static readonly PURPLE_THEME_ASSETS = {
        KEYS: {
            IMAGE: {
                BACKGROUND: {
                    BG_01: '01PurpleBG.png',
                },
                CLICK_MECHANICS: {
                    TOP_WOOD: 'PurpleFrameabove.png',
                    BOTTOM_WOOD: 'PurpleFramebelow.png',
                },
            },
        },
    };

    static readonly GREEN_THEME_ASSETS = {
        KEYS: {
            IMAGE: {
                BACKGROUND: {
                    BG_01: '01GreenBG.png',
                },
                CLICK_MECHANICS: {
                    TOP_WOOD: 'GreenFrameabove.png',
                    BOTTOM_WOOD: 'GreenFramebelow.png',
                },
            },
        },
    };

    static readonly VOLCANO_THEME_ASSETS = {
        KEYS: {
            IMAGE: {
                BACKGROUND: {
                    BG_01: 'volcano_bg.png',
                },
                CLICK_MECHANICS: {
                    TOP_WOOD: 'volcano_frame_above.png',
                    SCREEN_CLICKING: 'volcano_screen_clicking.png',
                },
                TYPING_MECHANICS: {
                    TYPING_MODULE: 'volcano_typing_module.png',
                },
            },
        },
    };

    static readonly MAYAN_ELECTRIC_TEMPLE_THEME_ASSETS = {
        KEYS: {
            IMAGE: {
                BACKGROUND: {
                    BG_01: 'mayan_bg.png',
                },
                CLICK_MECHANICS: {
                    TOP_WOOD: 'mayan_frame_above.png',
                    SCREEN_CLICKING: 'mayan_screen_clicking.png',
                },
                TYPING_MECHANICS: {
                    TYPING_MODULE: 'mayan_typing_module.png',
                },
            },
        },
    };

    static readonly COLOSSEUM_THEME_ASSETS = {
        KEYS: {
            IMAGE: {
                BACKGROUND: {
                    BG_01: 'colosseum_bg.png',
                },
                CLICK_MECHANICS: {
                    TOP_WOOD: 'colosseum_frame_above.png',
                    SCREEN_CLICKING: 'colosseum_screen_clicking.png',
                },
                TYPING_MECHANICS: {
                    TYPING_MODULE: 'colosseum_typing_module.png',
                },
            },
        },
    };

    static readonly ARCTIC_DOOMSDAY_THEME_ASSETS = {
        KEYS: {
            IMAGE: {
                BACKGROUND: {
                    BG_01: 'doomsday_bg.png',
                },
                CLICK_MECHANICS: {
                    TOP_WOOD: 'doomsday_frame_above.png',
                    SCREEN_CLICKING: 'doomsday_screen_clicking.png',
                },
                TYPING_MECHANICS: {
                    TYPING_MODULE: 'doomsday_typing_module.png',
                },
            },
        },
    };

    static readonly LIGHTHOUSE_THEME_ASSETS = {
        KEYS: {
            IMAGE: {
                BACKGROUND: {
                    BG_01: 'lighthouse_bg.png',
                },
                CLICK_MECHANICS: {
                    TOP_WOOD: 'lighthouse_frame_above.png',
                    SCREEN_CLICKING: 'lighthouse_screen_clicking.png',
                },
                TYPING_MECHANICS: {
                    TYPING_MODULE: 'lighthouse_typing_module.png',
                },
            },
        },
    };

    static readonly DESERT_THEME_ASSETS = {
        KEYS: {
            IMAGE: {
                BACKGROUND: {
                    BG_01: 'desert_bg.png',
                },
                CLICK_MECHANICS: {
                    TOP_WOOD: 'desert_frame_above.png',
                    SCREEN_CLICKING: 'desert_screen_clicking.png',
                },
                TYPING_MECHANICS: {
                    TYPING_MODULE: 'desert_typing_module.png',
                },
            },
        },
    };

    static get ASSETS(): typeof this.DEFAULT_ASSETS {
        let assets: RecursivePartial<typeof this.DEFAULT_ASSETS> = {};
        if (this.prevTheme !== this.themeManager.theme) {
            this.prevTheme = this.themeManager.theme;
            switch (this.themeManager.theme) {
                case ThemeEnum.PIRATES:
                    assets = this.PIRATES_ASSETS;
                    break;
                case ThemeEnum.SPACE:
                    assets = this.SPACE_ASSETS;
                    break;
                case ThemeEnum.BLUE:
                    assets = this.BLUE_THEME_ASSETS;
                    break;
                case ThemeEnum.PURPLE:
                    assets = this.PURPLE_THEME_ASSETS;
                    break;
                case ThemeEnum.GREEN:
                    assets = this.GREEN_THEME_ASSETS;
                    break;
                case ThemeEnum.VOLCANO:
                    assets = this.VOLCANO_THEME_ASSETS;
                    break;
                case ThemeEnum.MAYAN_ELECTRIC_TEMPLE:
                    assets = this.MAYAN_ELECTRIC_TEMPLE_THEME_ASSETS;
                    break;
                case ThemeEnum.COLOSSEUM:
                    assets = this.COLOSSEUM_THEME_ASSETS;
                    break;
                case ThemeEnum.ARCTIC_DOOMSDAY:
                    assets = this.ARCTIC_DOOMSDAY_THEME_ASSETS;
                    break;
                case ThemeEnum.LIGHTHOUSE:
                    assets = this.LIGHTHOUSE_THEME_ASSETS;
                    break;
                case ThemeEnum.DESERT:
                    assets = this.DESERT_THEME_ASSETS;
                    break;
            }

            const mergedAssets = mergeObjects(this.DEFAULT_ASSETS, assets);
            this.prevAssets = mergedAssets;
            return mergedAssets;
        }
        return this.prevAssets;
    }

    static getThemeForIsland(islandIndex: number): ThemeName {
        return (CommonConfig.ISLAND_NAMES[islandIndex].toUpperCase() as ThemeName) || ThemeEnum.DEFAULT;
    }

    static readonly UI = {
        WOOD: {
            SCALE: 1.35,
            ORIGIN: {
                TOP: { X: 0.5, Y: 0 },
                BOTTOM: { X: 0.5, Y: 1 },
            },
        },
        SCREEN_CLICKING: {
            ORIGIN: { X: 0.5, Y: 1 },
        },
        BACKGROUND: {
            ORIGIN: 0.489,
        },
        TARGET_TEXT: {
            FONT_SIZE: '48px',
            COLOR: 0xffffff,
            Y_OFFSET: 25, // From vertical center
            BOTTOM_Y_OFFSET: -80, // From bottom
            LINE_HEIGHT: 3,
            SPACING: 5,
        },
    };
}
