export interface FallbackEntry {
    type: 'replay' | 'external';
    level?: number;
    url?: string;
}

export const CAMPAIGN_FALLBACK_MAP: Record<number, FallbackEntry | null> = {
    0: null, // entry level, no fallback
    1: { type: 'replay', level: 0 },
    2: { type: 'replay', level: 0 },
    3: { type: 'external', url: '/battleship-numberline/?topic=understand_and_compare_decimals' },
    4: { type: 'external', url: '/fraction-frenzy/?topic=compare_fractions' },
    5: { type: 'replay', level: 4 },
};
