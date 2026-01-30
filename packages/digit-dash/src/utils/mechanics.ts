// mechanic utility functions
export const eqDenoms = [2, 3, 4, 5, 6, 8, 10, 12, 100];

export function isPrime(n: number): boolean {
  if (n <= 1) return false;
  if (n <= 3) return true;
  if (n % 2 === 0) return false;
  const r = Math.floor(Math.sqrt(n));
  for (let i = 3; i <= r; i += 2) if (n % i === 0) return false;
  return true;
}

export function isPerfectSquare(n: number): boolean {
  if (n < 1) return false;
  const r = Math.floor(Math.sqrt(n));
  return r * r === n;
}

function toInt(v: number | string): number | null {
  if (typeof v === 'number') return Number.isInteger(v) ? v : null;
  const s = (v as string).trim();
  if (!/^\d+$/.test(s)) return null; // reject fraction-like strings
  const n = Number(s);
  return Number.isInteger(n) ? n : null;
}

export function isFactorOf(divisor: number) {
  return (v: number | string) => {
    const n = toInt(v);
    if (n === null) return false;
    return n > 0 && divisor % n === 0;
  };
}

export const isFactorOf18 = isFactorOf(18);
export const isFactorOf20 = isFactorOf(20);
export const isFactorOf24 = isFactorOf(24);
export const isFactorOf36 = isFactorOf(36);
export const isFactorOf60 = isFactorOf(60);
export const isFactorOf48 = isFactorOf(48);
export const isFactorOf72 = isFactorOf(72);
export const isFactorOf100 = isFactorOf(100);

export function eqHalfCheck(v: number | string): boolean {
  const n = toInt(v);
  if (n !== null) {
    for (const d of eqDenoms) {
      if (d % 2 !== 0) continue;
      if (d / 2 === n) return true;
    }
    return false;
  }
  if (typeof v !== 'string') return false;
  const parts = v.split('/');
  if (parts.length !== 2) return false;
  const num = parseInt(parts[0], 10);
  const den = parseInt(parts[1], 10);
  if (!Number.isInteger(num) || !Number.isInteger(den) || den === 0) return false;
  if (!eqDenoms.includes(den)) return false;
  return num * 2 === den;
}

export function eqQuarterCheck(v: number | string): boolean {
  const n = toInt(v);
  if (n !== null) {
    for (const d of eqDenoms) {
      if (d % 4 !== 0) continue;
      if (d / 4 === n) return true;
    }
    return false;
  }
  if (typeof v !== 'string') return false;
  const parts = v.split('/');
  if (parts.length !== 2) return false;
  const num = parseInt(parts[0], 10);
  const den = parseInt(parts[1], 10);
  if (!Number.isInteger(num) || !Number.isInteger(den) || den === 0) return false;
  if (!eqDenoms.includes(den)) return false;
  return num * 4 === den;
}

// Parse a fraction string like '3/6' or '1/2'. Returns [num, den] or null.
export function parseFraction(value: string): [number, number] | null {
  if (typeof value !== 'string') return null;
  const parts = value.split('/');
  if (parts.length !== 2) return null;
  const num = parseInt(parts[0], 10);
  const den = parseInt(parts[1], 10);
  if (!Number.isInteger(num) || !Number.isInteger(den)) return null;
  return [num, den];
}
