import { i18n, GameConfigManager } from '@k8-games/sdk';
import { eqDenoms } from '../utils/mechanics';
import { MECHANIC_DATA, TUTORIAL_MECHANIC } from '../config/difficulty';

export type MechanicRuleFn = (value: number | string) => boolean;

export interface MechanicDifficulty {
  numbers?: number[] | (number | string)[];
  obstacles: number;
  monsterCount: number;
  monsterSpeed: number;
  obstaclePositions?: [number, number][];
  numberPositions?: [number, number][];
}

export interface MechanicConfig {
  id: string;
  label?: string;
  ruleName?: string;
  labelKey?: string;
  ruleNameKey?: string;
  check: MechanicRuleFn;
  numberLimit: number;
  difficulties: MechanicDifficulty[];
  heroSpawnPoint?: [number, number];
  monsterSpawnPoint?: [number, number];
}

export class MechanicsManager {
  private mechanics: MechanicConfig[];
  constructor(mechanics?: MechanicConfig[]) {
    this.mechanics = mechanics ?? getDefaultMechanics();
  }
  getMechanicCount(): number {
    return this.mechanics.length;
  }
  getMechanic(index: number): MechanicConfig | undefined {
    if (index < 0 || index >= this.mechanics.length) return undefined;
    return this.mechanics[index];
  }
  getAll(): MechanicConfig[] {
    return [...this.mechanics];
  }
}

function getDefaultMechanics(): MechanicConfig[] {
  const translate = (m: MechanicConfig): MechanicConfig => {
    const copy: MechanicConfig = { ...m };
    if (m.labelKey) copy.label = i18n.t(m.labelKey) || m.labelKey;
    if (m.ruleNameKey) copy.ruleName = i18n.t(m.ruleNameKey) || m.ruleNameKey;
    return copy;
  };
  let base = MECHANIC_DATA;
  const gameConfigManager = GameConfigManager.getInstance();
  const topic = gameConfigManager.get('topic');
  if (topic === 'grade4_topic6')
    base = MECHANIC_DATA.filter((m) =>
      ['factors18', 'factors20', 'factors24', 'factors36', 'factors60', 'factors48', 'factors72', 'factors100', 'perfectSquares', 'eqHalf', 'eqQuarter'].includes(m.id),
    );
  if (topic === 'grade3_topic2') {
    base = MECHANIC_DATA.filter((m) => ['mult2', 'mult5', 'mult10'].includes(m.id));

    base = base.map((m) => {
      if (m.id === 'mult2') return { ...m, numberLimit: Math.min(m.numberLimit, 20) };
      if (m.id === 'mult5') return { ...m, numberLimit: Math.min(m.numberLimit, 50) };
      if (m.id === 'mult10') return { ...m, numberLimit: Math.min(m.numberLimit, 100) };
      return m;
    });
  }
  if (topic === 'grade3_topic3') {
    base = MECHANIC_DATA.filter((m) => ['mult3', 'mult4', 'mult6', 'mult7', 'mult8', 'mult9'].includes(m.id));
    
    base = base.map((m) => {
      if (m.id === 'mult3') return { ...m, numberLimit: Math.min(m.numberLimit, 30) };
      if (m.id === 'mult4') return { ...m, numberLimit: Math.min(m.numberLimit, 40) };
      if (m.id === 'mult6') return { ...m, numberLimit: Math.min(m.numberLimit, 60) };
      if (m.id === 'mult7') return { ...m, numberLimit: Math.min(m.numberLimit, 70) };
      if (m.id === 'mult8') return { ...m, numberLimit: Math.min(m.numberLimit, 80) };
      if (m.id === 'mult9') return { ...m, numberLimit: Math.min(m.numberLimit, 90) };
      return m;
    });
  }
  return base.map(translate);
}

// Fisher–Yates shuffle helper
function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Generate a set of unique numbers / fraction strings for a round.
export function generateRoundNumbers(
  mechanic: MechanicConfig,
  desiredTotal = 9,
  desiredCorrect = 4,
): (number | string)[] {
  if (mechanic.id === 'eqHalf' || mechanic.id === 'eqQuarter') {
    const universe: string[] = [];
    for (const den of eqDenoms) for (let num = 1; num < den; num++) universe.push(`${num}/${den}`);
    const validPool = universe.filter((s) => mechanic.check(s));
    const invalidPool = universe.filter((s) => !mechanic.check(s));
    const sample = <T>(pool: T[], k: number): T[] => {
      if (k <= 0) return [];
      if (pool.length <= k) return shuffle(pool).slice(0, k);
      const s = new Set<number>();
      const out: T[] = [];
      while (out.length < k && s.size < pool.length) {
        const idx = Math.floor(Math.random() * pool.length);
        if (s.has(idx)) continue;
        s.add(idx);
        out.push(pool[idx]);
      }
      return out;
    };
    let wantCorrect = Math.min(desiredCorrect, desiredTotal);
    let wantIncorrect = Math.max(0, desiredTotal - wantCorrect);
    if (validPool.length < wantCorrect) {
      wantCorrect = validPool.length;
      wantIncorrect = desiredTotal - wantCorrect;
    }
    if (invalidPool.length < wantIncorrect) {
      wantIncorrect = invalidPool.length;
      wantCorrect = Math.min(desiredTotal - wantIncorrect, validPool.length);
    }
    let picks: (number | string)[] = [...sample(validPool, wantCorrect), ...sample(invalidPool, wantIncorrect)];
    if (picks.length < desiredTotal) {
      const used = new Set(picks);
      const remaining = universe.filter((n) => !used.has(n));
      picks = picks.concat(sample(remaining, desiredTotal - picks.length));
    }
    return shuffle(picks).slice(0, desiredTotal);
  }
  // Numeric
  const limit = Math.max(0, mechanic.numberLimit);
  const universe: number[] = [];
  for (let n = 0; n <= limit; n++) universe.push(n);
  const validPool = universe.filter((n) => mechanic.check(n));
  const invalidPool = universe.filter((n) => !mechanic.check(n));
  const sample = <T>(pool: T[], k: number): T[] => {
    if (k <= 0) return [];
    if (pool.length <= k) return shuffle(pool).slice(0, k);
    const s = new Set<number>();
    const out: T[] = [];
    while (out.length < k && s.size < pool.length) {
      const idx = Math.floor(Math.random() * pool.length);
      if (s.has(idx)) continue;
      s.add(idx);
      out.push(pool[idx]);
    }
    return out;
  };
  let wantCorrect = Math.min(desiredCorrect, desiredTotal);
  let wantIncorrect = Math.max(0, desiredTotal - wantCorrect);
  if (validPool.length < wantCorrect) {
    wantCorrect = validPool.length;
    wantIncorrect = desiredTotal - wantCorrect;
  }
  if (invalidPool.length < wantIncorrect) {
    wantIncorrect = invalidPool.length;
    wantCorrect = Math.min(desiredTotal - wantIncorrect, validPool.length);
  }
  let picks: number[] = [...sample(validPool, wantCorrect), ...sample(invalidPool, wantIncorrect)];
  if (picks.length < desiredTotal) {
    const used = new Set(picks);
    const remaining = universe.filter((n) => !used.has(n));
    picks = picks.concat(sample(remaining, desiredTotal - picks.length));
  }
  return shuffle(picks).slice(0, desiredTotal);
}

export function getTutorialMechanic() {
  return TUTORIAL_MECHANIC;
}
