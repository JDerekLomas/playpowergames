/* Pure mechanic & difficulty data for Digit Dash.
 */
import { MechanicConfig } from '../mechanics/Mechanic';
import { isPrime, isPerfectSquare, eqHalfCheck, eqQuarterCheck, isFactorOf18, isFactorOf20, isFactorOf24, isFactorOf36, isFactorOf60, isFactorOf48, isFactorOf72, isFactorOf100 } from '../utils/mechanics';

// Shared default positions (kept as data; original sourced from Mechanic.ts)
export const DEFAULT_OBSTACLE_POSITIONS: [number, number][] = [
  [0.08, 0.17], [0.32, 0.25], [0.7, 0.24], [0.9, 0.22], [0.05, 0.47], [0.21, 0.49], [0.5, 0.45], [0.05, 0.82], [0.15, 0.76], [0.34, 0.79], [0.61, 0.63], [0.22, 0.97], [0.43, 1.37], [0.75, 0.87],
];
export const DEFAULT_NUMBER_POSITIONS: [number, number][] = [
  [0.15, 0.31], [0.53, 0.27], [0.81, 0.27], [0.35, 0.5], [0.73, 0.55], [0.9, 0.57], [0.23, 0.77], [0.5, 0.85], [0.68, 0.91],
];

// Factory helpers
const int = (v: number | string) => (typeof v === 'number' ? v : parseInt(String(v), 10));
const mkDivRule = (d: number) => (v: number | string) => { const n = int(v); return Number.isInteger(n) && n % d === 0; };

const baseDiffs = () => ([
  { obstacles: 10, monsterCount: 1, monsterSpeed: 180, obstaclePositions: DEFAULT_OBSTACLE_POSITIONS, numberPositions: DEFAULT_NUMBER_POSITIONS },
  { obstacles: 14, monsterCount: 1, monsterSpeed: 210, obstaclePositions: DEFAULT_OBSTACLE_POSITIONS, numberPositions: DEFAULT_NUMBER_POSITIONS },
  { obstacles: 14, monsterCount: 2, monsterSpeed: 210, obstaclePositions: DEFAULT_OBSTACLE_POSITIONS, numberPositions: DEFAULT_NUMBER_POSITIONS },
]);

export const MECHANIC_DATA: MechanicConfig[] = [
  { id: 'even', labelKey: 'mechanic.even.label', ruleNameKey: 'mechanic.even.rule', check: mkDivRule(2), numberLimit: 40, difficulties: baseDiffs() },
  { id: 'odd', labelKey: 'mechanic.odd.label', ruleNameKey: 'mechanic.odd.rule', check: (v)=>{ const n=int(v); return Number.isInteger(n)&& n%2===1;}, numberLimit: 40, difficulties: baseDiffs() },
  { id: 'mult2', labelKey: 'mechanic.mult2.label', ruleNameKey: 'mechanic.mult2.rule', check: mkDivRule(2), numberLimit: 40, difficulties: baseDiffs() },
  { id: 'mult3', labelKey: 'mechanic.mult3.label', ruleNameKey: 'mechanic.mult3.rule', check: mkDivRule(3), numberLimit: 100, difficulties: baseDiffs() },
  { id: 'mult4', labelKey: 'mechanic.mult4.label', ruleNameKey: 'mechanic.mult4.rule', check: mkDivRule(4), numberLimit: 100, difficulties: baseDiffs() },
  { id: 'mult5', labelKey: 'mechanic.mult5.label', ruleNameKey: 'mechanic.mult5.rule', check: mkDivRule(5), numberLimit: 100, difficulties: baseDiffs() },
  { id: 'mult6', labelKey: 'mechanic.mult6.label', ruleNameKey: 'mechanic.mult6.rule', check: mkDivRule(6), numberLimit: 100, difficulties: baseDiffs() },
  { id: 'mult7', labelKey: 'mechanic.mult7.label', ruleNameKey: 'mechanic.mult7.rule', check: mkDivRule(7), numberLimit: 100, difficulties: baseDiffs() },
  { id: 'mult8', labelKey: 'mechanic.mult8.label', ruleNameKey: 'mechanic.mult8.rule', check: mkDivRule(8), numberLimit: 100, difficulties: baseDiffs() },
  { id: 'mult9', labelKey: 'mechanic.mult9.label', ruleNameKey: 'mechanic.mult9.rule', check: mkDivRule(9), numberLimit: 100, difficulties: baseDiffs() },
  { id: 'mult10', labelKey: 'mechanic.mult10.label', ruleNameKey: 'mechanic.mult10.rule', check: mkDivRule(10), numberLimit: 100, difficulties: baseDiffs() },
  { id: 'prime', labelKey: 'mechanic.prime.label', ruleNameKey: 'mechanic.prime.rule', check: (v)=>{ const n=int(v); return Number.isInteger(n)? isPrime(n): false;}, numberLimit: 100, difficulties: baseDiffs() },
  { id: 'factors18', labelKey: 'mechanic.factors18.label', ruleNameKey: 'mechanic.factors18.rule', check: (v)=> isFactorOf18(v), numberLimit: 100, difficulties: baseDiffs() },
  { id: 'factors20', labelKey: 'mechanic.factors20.label', ruleNameKey: 'mechanic.factors20.rule', check: (v)=> isFactorOf20(v), numberLimit: 100, difficulties: baseDiffs() },
  { id: 'factors24', labelKey: 'mechanic.factors24.label', ruleNameKey: 'mechanic.factors24.rule', check: (v)=> isFactorOf24(v), numberLimit: 100, difficulties: baseDiffs() },
  { id: 'factors36', labelKey: 'mechanic.factors36.label', ruleNameKey: 'mechanic.factors36.rule', check: (v)=> isFactorOf36(v), numberLimit: 100, difficulties: baseDiffs() },
  { id: 'factors48', labelKey: 'mechanic.factors48.label', ruleNameKey: 'mechanic.factors48.rule', check: (v)=> isFactorOf48(v), numberLimit: 100, difficulties: baseDiffs() },
  { id: 'factors60', labelKey: 'mechanic.factors60.label', ruleNameKey: 'mechanic.factors60.rule', check: (v)=> isFactorOf60(v), numberLimit: 100, difficulties: baseDiffs() },
  { id: 'factors72', labelKey: 'mechanic.factors72.label', ruleNameKey: 'mechanic.factors72.rule', check: (v)=> isFactorOf72(v), numberLimit: 100, difficulties: baseDiffs() },
  { id: 'factors100', labelKey: 'mechanic.factors100.label', ruleNameKey: 'mechanic.factors100.rule', check: (v)=> isFactorOf100(v), numberLimit: 200, difficulties: baseDiffs() },
  { id: 'perfectSquares', labelKey: 'mechanic.squares.label', ruleNameKey: 'mechanic.squares.rule', check: (v)=>{ const n=int(v); return Number.isInteger(n)? isPerfectSquare(n): false;}, numberLimit: 100, difficulties: baseDiffs() },
  { id: 'eqHalf', labelKey: 'mechanic.eqHalf.label', ruleNameKey: 'mechanic.eqHalf.rule', check: eqHalfCheck, numberLimit: 100, difficulties: baseDiffs() },
  { id: 'eqQuarter', labelKey: 'mechanic.eqQuarter.label', ruleNameKey: 'mechanic.eqQuarter.rule', check: eqQuarterCheck, numberLimit: 100, difficulties: baseDiffs() },
];

export const TUTORIAL_MECHANIC: MechanicConfig = {
  id: 'tutorial',
  labelKey: 'mechanic.tutorial.label',
  ruleNameKey: 'mechanic.tutorial.rule',
  check: (v)=>{ const n=int(v); return Number.isInteger(n)&& n%2===0; },
  numberLimit: 40,
  difficulties: [
    { numbers: [4,20,16,11,15,2], obstacles: 14, monsterCount: 1, monsterSpeed: 180, obstaclePositions: [
      [0.08,0.17],[0.32,0.25],[0.7,0.24],[0.9,0.22],[0.05,0.47],[0.21,0.49],[0.38,0.43],[0.05,0.82],[0.15,0.76],[0.34,0.79],[0.22,0.97],[0.43,1.37],[0.75,0.87],
    ], numberPositions: [
      [0.53,0.61],[0.47,0.27],[0.81,0.27],[0.24,0.78],[0.73,0.55],[0.9,0.57],
    ] }
  ],
  heroSpawnPoint: [0.3,0.6],
  monsterSpawnPoint: [0.68,0.65],
};
