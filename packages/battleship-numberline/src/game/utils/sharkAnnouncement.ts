import { i18n } from '@k8-games/sdk';
import { parseFractionString } from './parseFractionString';

/**
 * Reduces a fraction (e.g., 10/100 → 1/10)
 * @param numerator
 * @param denominator
 * @returns { numerator: number, denominator: number }
 */
export function reduceFraction(numerator: number, denominator: number): { numerator: number; denominator: number } {
	// Euclidean algorithm for GCD
	const gcd = (a: number, b: number): number => b === 0 ? Math.abs(a) : gcd(b, a % b);

	const divisor = gcd(numerator, denominator);
	return {
		numerator: numerator / divisor,
		denominator: denominator / divisor
	};
}

/**
 * Convert a decimal to a fraction with a reasonable denominator limit
 * This helps avoid fractions like 333/1000 when 1/3 is more appropriate
 */
export function decimalToFraction(decimal: number, maxDenominator: number = 100): { numerator: number; denominator: number } {
	// Handle whole numbers
	if (Number.isInteger(decimal)) {
		return { numerator: decimal, denominator: 1 };
	}
	
	// Use continued fractions algorithm for better approximation
	let bestNumerator = 0;
	let bestDenominator = 1;
	let minError = Math.abs(decimal);
	
	for (let denominator = 1; denominator <= maxDenominator; denominator++) {
		const numerator = Math.round(decimal * denominator);
		const error = Math.abs(decimal - numerator / denominator);
		
		if (error < minError) {
			minError = error;
			bestNumerator = numerator;
			bestDenominator = denominator;
			
			// If we found an exact match, use it
			if (error < 0.0001) {
				break;
			}
		}
	}
	
	return reduceFraction(bestNumerator, bestDenominator);
}

/**
 * Format a number for screen reader announcement
 * Handles whole numbers, decimals, and fractions
 */
function formatNumberForAnnouncement(value: number | string): string {
	if (typeof value === 'number') {
		return i18n.formatNumberForScreenReader(value);
	}
	
	const stringValue = value.toString().trim();
	
	// Handle fractions like "1/2"
	if (stringValue.includes('/')) {
		const parsed = parseFractionString(stringValue);
		if (parsed !== null) {
			return i18n.formatNumberForScreenReader(parsed);
		}
	}
	
	// Handle regular numbers
	const parsed = parseFloat(stringValue);
	if (!isNaN(parsed)) {
		return i18n.formatNumberForScreenReader(parsed);
	}
	
	return stringValue;
}

export function getSharkAnnouncement(
	topic: string,
	targetNumber: number,
	startPoint: number | string,
	endPoint: number | string,
): string {
	// Parse start and end points to numbers
	const start = typeof startPoint === 'number' ? startPoint : parseFractionString(startPoint) ?? 0;
	const end = typeof endPoint === 'number' ? endPoint : parseFractionString(endPoint) ?? 1;
	
	// Format the start and end for announcement
	const startFormatted = formatNumberForAnnouncement(startPoint);
	const endFormatted = formatNumberForAnnouncement(endPoint);
	
	// Special handling for percents topic
	if (topic === 'percents') {
		// For percents, always use 100 divisions for consistency
		const positionOrdinal = i18n.formatOrdinal(targetNumber);
		const divisionsWord = i18n.formatNumberForScreenReader(100);
		
		return i18n.t('game.sharkAnnouncement', { 
			position: positionOrdinal, 
			divisions: divisionsWord,
			start: startFormatted,
			end: endFormatted
		});
	}
	
	// Calculate position as a fraction of the total range
	const range = end - start;
	const position = targetNumber - start;
	
	// Always use 100 divisions for consistency
	const positionRatio = position / range;
	const positionOut100 = Math.round(positionRatio * 100);
	
	// Get ordinal for the position (e.g., "first", "second")
	const positionOrdinal = i18n.formatOrdinal(positionOut100);
	
	// Always use 100 as divisions
	const divisionsWord = i18n.formatNumberForScreenReader(100);
	
	return i18n.t('game.sharkAnnouncement', { 
		position: positionOrdinal, 
		divisions: divisionsWord,
		start: startFormatted,
		end: endFormatted
	});
}