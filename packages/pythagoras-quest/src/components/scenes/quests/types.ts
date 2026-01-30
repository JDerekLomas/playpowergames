// Types for Pythagorean Theorem Proofs

export interface Pebble {
  x: number;
  y: number;
  tx: number;
  ty: number;
  color: string;
}

export interface CanvasCoordinates {
  originX: number;
  originY: number;
  angle: number;
  scale: number;
}

export interface CameraOffset {
  x: number;
  y: number;
}

export interface DragStart {
  x: number;
  y: number;
}

export interface ViewState {
  viewBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  isPanning: boolean;
  startPoint: {
    x: number;
    y: number;
  };
}

export interface Point {
  x: number;
  y: number;
}

export interface Triple {
  a: number;
  b: number;
  label: string;
  ariaLabel: string;
}

export interface Colors {
  a: string;
  b: string;
  c: string;
}

export interface PythagoreanTheoremProofsState {
  currentProof: number;
}

export interface PythagoreanTheoremProofsProps {
  questId: string;
  interaction: {
    translations: any;
  };
}

// Ladder Problem Types
export interface TheLadderProblemProps {
  interaction: {
    translations: any;
  };
}

export interface LadderProblemPayload {
  step?: number;
}
