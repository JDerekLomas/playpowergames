import i18next, { InitOptions, Resource } from 'i18next';

export interface I18nConfig {
    resources: Resource;
    fallbackLng?: string;
    debug?: boolean;
}

export class I18nHelper {
    private static instance: I18nHelper;
    private initialized = false;

    private constructor() { }

    public static getInstance(): I18nHelper {
        if (!I18nHelper.instance) {
            I18nHelper.instance = new I18nHelper();
        }
        return I18nHelper.instance;
    }

    public init(config: I18nConfig) {
        if (this.initialized) {
            console.warn('i18n already initialized');
            return;
        }

        const options: InitOptions = {
            resources: config.resources,
            fallbackLng: config.fallbackLng || 'en',
            debug: config.debug || false,
            interpolation: {
                escapeValue: false
            }
        };

        i18next.init(options);
        this.initialized = true;
    }

    public setLanguage(lang: string) {
        if (!this.initialized) {
            throw new Error('i18n not initialized');
        }

        if (Object.keys(i18next.options.resources || {}).includes(lang)) {
            i18next.changeLanguage(lang);
        } else {
            console.warn(`Language ${lang} not available`);
        }
    }

    public t(key: string, options?: any) {
        if (!this.initialized) {
            throw new Error('i18n not initialized');
        }
        return i18next.t(key, options);
    }

    public getLanguage(): string {
        return i18next.language;
    }

    public onLanguageChanged(callback: (lang: string) => void) {
        i18next.on('languageChanged', callback);
    }

    /**
   * Format a number according to the current locale
   * @param num The number to format
   * @param options Intl.NumberFormatOptions
   * @returns Formatted number string
   */
    public formatNumber(num: number, options?: Intl.NumberFormatOptions): string {
        const locale = this.getLanguage();
        const defaultOptions: Intl.NumberFormatOptions = {
            maximumFractionDigits: 2,
            minimumFractionDigits: 0
        };

        return new Intl.NumberFormat(
            locale,
            { ...defaultOptions, ...options }
        ).format(num);
    }

    /**
     * Format a number for screen reader accessibility
     * For Spanish, this provides number words for better pronunciation
     * @param num The number to format
     * @returns Formatted number string optimized for screen readers
     */
    public formatNumberForScreenReader(num: number): string {
        const locale = this.getLanguage();
        
        if (locale === 'es') {
            // Spanish number words for better screen reader pronunciation
            const spanishNumbers: { [key: number]: string } = {
                0: 'cero',
                1: 'uno',
                2: 'dos',
                3: 'tres',
                4: 'cuatro',
                5: 'cinco',
                6: 'seis',
                7: 'siete',
                8: 'ocho',
                9: 'nueve',
                10: 'diez'
            };
            
            return spanishNumbers[num] || num.toString();
        }
        
        // For other languages, use regular number formatting
        return this.formatNumber(num);
    }

    /**
     * Format a number as an ordinal
     * @param num The number to format
     * @returns Formatted ordinal string
     */
    public formatOrdinal(num: number): string {
        const locale = this.getLanguage();
        // Use a different approach for ordinals since Intl.NumberFormat doesn't support ordinal style
        const rules = new Intl.PluralRules(locale, { type: 'ordinal' });
        const suffix = rules.select(num);

        // Map common ordinal suffixes based on the plural rule
        const suffixes: Record<string, string> = {
            one: 'st',
            two: 'nd',
            few: 'rd',
            other: 'th'
        };

        return `${num}${suffixes[suffix] || suffixes.other}`;
    }

    /**
     * Format a decimal number specifically for math education context
     * @param num The number to format
     * @returns Formatted decimal string
     */
    public formatDecimal(num: number, decimals: number = 2): string {
        const locale = this.getLanguage();
        return new Intl.NumberFormat(locale, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(num);
    }

    /**
     * Format a fraction
     * @param numerator The top number
     * @param denominator The bottom number
     * @returns Formatted fraction string
     */
    public formatFraction(numerator: number, denominator: number): string {
        return `${this.formatNumber(numerator)}/${this.formatNumber(denominator)}`;
    }
}

export const i18n = I18nHelper.getInstance();