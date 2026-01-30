export type FractionDigitMask = { numeratorDigits: number; denominatorDigits: number };

function countDigits(n: string | number): number {
  const s = String(n).trim().replace(/^[-+]/, '');
  // Treat empty or 0 as 1 digit
  if (!s || /^0+$/.test(s)) return 1;
  // Only digits count
  const digits = s.replace(/\D/g, '');
  return Math.max(1, digits.length);
}

/**
 * Compute numerator/denominator digit counts from an answer expression.
 * Accepts forms like "a/b", "-a/b", "m n/d" (mixed fraction), or numbers.
 * Returns null if a clear fraction part cannot be determined.
 */
export function computeFractionDigitMask(answer: string | number): FractionDigitMask | null {
  if (typeof answer === 'number') {
    // Cannot infer digit counts from a decimal/float reliably. Let caller fallback.
    return null;
  }

  const raw = String(answer).trim();
  if (!raw) return null;

  // Try to find a fraction part n/d (handles optional spaces)
  const fracMatch = raw.match(/(-?\d+)\s*\/\s*(\d+)/);
  if (!fracMatch) return null;

  const [, numStr, denStr] = fracMatch;
  return {
    numeratorDigits: countDigits(numStr),
    denominatorDigits: countDigits(denStr),
  };
}
