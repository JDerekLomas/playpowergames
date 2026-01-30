export function parseFractionString(fractionString: string | number): number | null {
    if (typeof fractionString === 'string') {
        // Normalize dash characters: convert en dash (–) and em dash (—) to regular minus (-)
        fractionString = fractionString.replace(/[–—]/g, '-');
        
        // Handle percent strings like '25%' as 0.25
        const percentMatch = fractionString.match(/^\s*(-?\d+(?:\.\d+)?)%\s*$/);
        if (percentMatch) {
            return parseFloat(percentMatch[1]) / 100;
        }
        // Handle mixed fractions like '2 1/2'
        const mixedMatch = fractionString.match(/^\s*(-?\d+)\s+(\d+)\/(\d+)\s*$/);
        if (mixedMatch) {
            const whole = Number(mixedMatch[1]);
            const numerator = Number(mixedMatch[2]);
            const denominator = Number(mixedMatch[3]);
            if (!isNaN(whole) && !isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
                return whole + (whole >= 0 ? 1 : -1) * (numerator / denominator);
            } else {
                return null;
            }
        }
        // Handle simple fractions like '1/2'
        if (fractionString.includes('/')) {
            const [numerator, denominator] = fractionString.split('/').map(Number);
            if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
                return numerator / denominator;
            } else {
                return null;
            }
        }
        // Handle decimal or integer
        const value = parseFloat(fractionString);
        if (isNaN(value)) {
            return null;
        }
        return value;
    } else {
        // Already a number
        return typeof fractionString === 'number' ? fractionString : null;
    }
}