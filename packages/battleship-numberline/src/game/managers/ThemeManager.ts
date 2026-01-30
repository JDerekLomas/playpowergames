import { debugLog } from '../utils/debugLogger';

export enum ThemeEnum {
    PIRATES = 'PIRATES',
    SPACE = 'SPACE',
    BLUE = 'BLUE',
    PURPLE = 'PURPLE',
    GREEN = 'GREEN',
    DEFAULT = 'DEFAULT',

    // island themes
    VOLCANO = 'VOLCANO',
    MAYAN_ELECTRIC_TEMPLE = 'MAYAN_ELECTRIC_TEMPLE',
    COLOSSEUM = 'COLOSSEUM',
    ARCTIC_DOOMSDAY = 'ARCTIC_DOOMSDAY',
    LIGHTHOUSE = 'LIGHTHOUSE',
    DESERT = 'DESERT',
}

export type ThemeName = keyof typeof ThemeEnum;

export class ThemeManager {
    private static instance: ThemeManager;
    private currentTheme: ThemeName = ThemeEnum.DEFAULT;

    public static getInstance(): ThemeManager {
        if (!ThemeManager.instance) {
            ThemeManager.instance = new ThemeManager();
        }
        return ThemeManager.instance;
    }

    setTheme(themeName?: string) {
        if (themeName && themeName in ThemeEnum) {
            this.currentTheme = themeName as ThemeName;
        } else {
            debugLog(`Failed to set theme "${themeName}", using theme "${this.currentTheme}"`);
        }
    }

    get theme() {
        return this.currentTheme;
    }
}
