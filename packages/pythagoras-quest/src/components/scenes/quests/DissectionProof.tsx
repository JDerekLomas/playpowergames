import React, { useEffect, useRef, useState } from 'react';
import { emitEvent } from '../../../utils/eventEmitter';
import { useTranslations } from '../../../hooks/useTranslations';
import { announceToScreenReader } from '@k8-games/sdk';

interface DissectionProofProps {
  translations: any;
  currentA: number;
  currentB: number;
  onSliderChange: (type: 'a' | 'b', value: string) => void;
  onRearrange: () => void;
}

const DissectionProof: React.FC<DissectionProofProps> = ({
  translations: _translations,
  currentA,
  currentB,
  onSliderChange,
  onRearrange,
}) => {
  const { t } = useTranslations();
  const [currentState, setCurrentState] = useState<number>(1);
  // Keep track of the last non-separated state so we can revert when dialogue index changes
  const prevNonSeparatedRef = useRef<number>(1);
  const currentStateRef = useRef<number>(currentState);
  useEffect(() => {
    currentStateRef.current = currentState;
  }, [currentState]);
  // track previous state for render-time decisions (keeps previous value during render)
  const prevStateRef = useRef<number>(currentState);
  useEffect(() => {
    prevStateRef.current = currentState;
  });
  // Track dialogue-driven state switching (e.g., show separated on 3rd dialogue)
  useEffect(() => {
    const handler = (event: any) => {
      const index = event?.detail?.dialogueIndex;
      if (typeof index === 'number') {
        // Only apply separated layout on EXACT dialogue index
        // Previously 2 -> now 3 (state + 1)
        const separatedIndex = 3;
        if (index === separatedIndex) {
          // Store the previous non-separated state once
          if (currentStateRef.current !== 3) {
            prevNonSeparatedRef.current = currentStateRef.current;
          }
          if (currentStateRef.current !== 3) setCurrentState(3);
        } else {
          // Revert to previous state if we move away from that index
          if (currentStateRef.current === 3) {
            setCurrentState(prevNonSeparatedRef.current);
          }
        }
      }
    };
    window.addEventListener('dialogue_progress', handler);
    return () => window.removeEventListener('dialogue_progress', handler);
  }, []);

  // Helper function to calculate hypotenuse with proper formatting
  const calculateHypotenuse = (a: number, b: number): string => {
    const c = Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
    return c.toFixed(2);
  };

  const lineIntersection = (
    [x1, y1]: [number, number],
    [x2, y2]: [number, number],
    [x3, y3]: [number, number],
    [x4, y4]: [number, number],
  ): [number, number] | null => {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-10) return null;
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)];
  };

  const polygonToPath = (pts: [number, number][]): string => {
    if (!pts || !pts.length) return '';
    const [h, ...rest] = pts;
    return `M${h[0]},${h[1]} ${rest.map(([x, y]) => `L${x},${y}`).join(' ')} Z`;
  };

  // Small helper to animate cross-fade + slight slide/scale between groups
  const fadeStyle = (active: boolean): React.CSSProperties => ({
    opacity: active ? 1 : 0,
    transform: active ? 'translate(0px,0px) scale(1)' : 'translate(0px,8px) scale(0.985)',
    transition: 'opacity 350ms ease, transform 350ms ease',
    pointerEvents: active ? 'auto' : 'none',
  });
  // Snap style: no animation (used for separated state)
  const snapStyle = (active: boolean): React.CSSProperties => ({
    opacity: active ? 1 : 0,
    transform: 'none',
    transition: 'none',
    pointerEvents: active ? 'auto' : 'none',
  });

  // Choose style for a group (1,2,3) so that transitions involving separated state (3)
  // always use snapStyle. Smooth fade only applies between state 1 and 2.
  const styleFor = (groupState: number): React.CSSProperties => {
    const wasPrevSeparated = prevStateRef.current === 3;
    const isNowSeparated = currentState === 3;
    // If either previous or current state is the separated state, use snap (no animation)
    if (wasPrevSeparated || isNowSeparated) {
      return snapStyle(groupState === currentState);
    }
    // Otherwise (transition between 1 and 2), use fade style
    return fadeStyle(groupState === currentState);
  };

  const getState1Geometry = () => {
    const a = currentA;
    const b = currentB;
    const S = a + b;
    const TL: [number, number][] = [
      [0, 0],
      [b, 0],
      [0, a],
    ];
    const TR: [number, number][] = [
      [S, 0],
      [S - a, 0],
      [S, b],
    ];
    const BR: [number, number][] = [
      [S, S],
      [S, S - a],
      [S - b, S],
    ];
    const BL: [number, number][] = [
      [0, S],
      [a, S],
      [0, S - b],
    ];

    const V0 = lineIntersection([b, 0], [0, a], [S - a, 0], [S, b]);
    const V1 = lineIntersection([S - a, 0], [S, b], [S, S - a], [S - b, S]);
    const V2 = lineIntersection([S, S - a], [S - b, S], [a, S], [0, S - b]);
    const V3 = lineIntersection([a, S], [0, S - b], [b, 0], [0, a]);

    if (!V0 || !V1 || !V2 || !V3) return { triangles: [], diamond: [] };

    return {
      triangles: [TL, TR, BR, BL],
      diamond: [V0, V1, V2, V3],
    };
  };

  const getState2Geometry = () => {
    const a = currentA;
    const b = currentB;
    const S = a + b;
    const squareA: [number, number][] = [
      [0, b],
      [a, b],
      [a, S],
      [0, S],
    ];
    const squareB: [number, number][] = [
      [a, 0],
      [S, 0],
      [S, b],
      [a, b],
    ];

    const tri1: [number, number][] = [
      [0, 0],
      [a, 0],
      [0, b],
    ];
    const tri2: [number, number][] = [
      [a, 0],
      [a, b],
      [0, b],
    ];
    const tri3: [number, number][] = [
      [a, b],
      [S, b],
      [a, S],
    ];
    const tri4: [number, number][] = [
      [S, b],
      [S, S],
      [a, S],
    ];

    return {
      triangles: [tri1, tri2, tri3, tri4],
      squares: { a: squareA, b: squareB },
    };
  };

  const handleRearrange = () => {
    // Do not apply rearrange while in separated state
    if (currentState === 3) return;
    const newState = currentState === 1 ? 2 : 1;
    setCurrentState(newState);
    // Keep this as our last non-separated state for dialogue reversion
    prevNonSeparatedRef.current = newState;
    onRearrange();

    // Announce to screen reader
    announceToScreenReader(t('dissectionProof.rearrangeAnnouncement'));

    // Emit event when rearranging to state 2 (showing the separated squares)
    if (newState === 2) {
      emitEvent('dissection_proof_rearrange', {
        fromState: 1,
        toState: 2,
        aSquared: currentA * currentA,
        bSquared: currentB * currentB,
      });
    }
  };

  return (
    <div className="absolute top-4 left-4 right-4 bottom-4 bg-[#1F1816] overflow-hidden">
      <div className="h-full flex flex-col p-4">
        {/* Controls Section - Fixed Height */}
        <div className="flex-shrink-0 p-4">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-start">
            <div className="flex flex-1 gap-4 flex-col lg:flex-row">
              <div className="w-full">
                <label
                  htmlFor="dissection-a-slider"
                  className="block font-bold font-besley text-white bg-[#901110] px-3 py-1 rounded-md inline-block mb-2"
                >
                  a = {currentA}
                </label>
                <div className="relative">
                  <input
                    id="dissection-a-slider"
                    type="range"
                    min="50"
                    max="200"
                    value={currentA}
                    onChange={(e) => onSliderChange('a', e.target.value)}
                    className="a-slider w-full"
                    style={{
                      background: `linear-gradient(to right, #FF0200 ${
                        ((currentA - 50) / (200 - 50)) * 100
                      }%, #666666 ${((currentA - 50) / (200 - 50)) * 100}%)`,
                    }}
                    aria-label={t('dissectionProof.aSliderLabel')}
                  />
                </div>
              </div>
              <div className="w-full">
                <label
                  htmlFor="dissection-b-slider"
                  className="block font-bold font-besley text-white bg-[#0534B2] px-3 py-1 rounded-md inline-block mb-2"
                >
                  b = {currentB}
                </label>
                <div className="relative">
                  <input
                    id="dissection-b-slider"
                    type="range"
                    min="50"
                    max="200"
                    value={currentB}
                    onChange={(e) => onSliderChange('b', e.target.value)}
                    className="b-slider w-full"
                    style={{
                      background: `linear-gradient(to right, #0046FF ${
                        ((currentB - 50) / (200 - 50)) * 100
                      }%, #666666 ${((currentB - 50) / (200 - 50)) * 100}%)`,
                    }}
                    aria-label={t('dissectionProof.bSliderLabel')}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col items-center mx-auto mt-4 lg:flex-row gap-3">
            <button onClick={handleRearrange} disabled={currentState === 3} className="btn-interactive h-16">
              {t('dissectionProof.rearrange')}
            </button>
          </div>
        </div>

        {/* Visualization Section - Equal Height */}
        <div className="flex-1 mx-0 mb-2 bg-black rounded-lg relative flex items-center justify-center">
          {/* C Label - Top Right */}
          <div className="absolute top-4 right-4 font-bold font-besley text-white bg-[#006301] px-3 py-1 rounded-md z-10">
            c = {calculateHypotenuse(currentA, currentB)}
          </div>
          <div className="flex items-center justify-center">
            <svg
              width={
                currentState === 3
                  ? Math.min(820, (currentA + currentB) * 2.6 + 120)
                  : Math.min(540, currentA + currentB + 80)
              }
              height={
                currentState === 3
                  ? Math.min(360, (currentA + currentB) * 1.1 + 100)
                  : Math.min(540, currentA + currentB + 80)
              }
              viewBox={
                currentState === 3
                  ? (() => {
                      const a = currentA;
                      const b = currentB;
                      const S = a + b;
                      const c = Math.sqrt(a * a + b * b);
                      const H = S * 1.1;
                      const centerY = H / 2;
                      const gap = Math.max(20, S * 0.08);
                      const signSpace = Math.max(12, S * 0.06);
                      const aX = Math.max(10, S * 0.12);
                      const plusX = aX + a + signSpace + gap * 0.4;
                      const bX = plusX + signSpace + gap * 0.4;
                      const eqX = bX + b + signSpace + gap * 0.4;
                      const r = c / Math.SQRT2;
                      const cCX = eqX + signSpace + gap * 0.5 + r;
                      const minX = aX;
                      const maxX = cCX + r;
                      const maxHalf = Math.max(a / 2, b / 2, r);
                      const minY = centerY - maxHalf;
                      const maxY = centerY + maxHalf;
                      const margin = Math.max(24, S * 0.18); // extra margin makes it appear a bit smaller and centered
                      const vbX = minX - margin;
                      const vbY = minY - margin;
                      const vbW = maxX - minX + 2 * margin;
                      const vbH = maxY - minY + 2 * margin;
                      return `${vbX} ${vbY} ${vbW} ${vbH}`;
                    })()
                  : (() => {
                      const S = currentA + currentB;
                      // Increase top/overall margins to avoid cropping
                      return `-50 -50 ${S + 100} ${S + 100}`;
                    })()
              }
              preserveAspectRatio="xMidYMid meet"
              // style={{ border: '2px solid #E5E5E5', borderRadius: '8px', backgroundColor: 'transparent' }}
              role="img"
              aria-label={
                currentState === 1
                  ? t('dissectionProof.firstPositionAria')
                  : currentState === 2
                    ? t('dissectionProof.secondPositionAria')
                    : t('dissectionProof.separatedPositionAria')
              }
            >
              <>
                {/* Regular state (1) - stays mounted and uses conditional style */}
                <g style={styleFor(1)}>
                  {(() => {
                    const a = currentA;
                    const b = currentB;
                    const S = a + b;
                    const geo = getState1Geometry();
                    const diamondPath = polygonToPath(geo.diamond as [number, number][]);
                    const tick = 10; // corner right-angle tick length
                    // Dynamic label size inside the central diamond
                    let fontC1 = 18;
                    if (geo.diamond && (geo.diamond as [number, number][]).length) {
                      const pts = geo.diamond as [number, number][];
                      const xs = pts.map((p) => p[0]);
                      const ys = pts.map((p) => p[1]);
                      const minX = Math.min(...xs);
                      const maxX = Math.max(...xs);
                      const minY = Math.min(...ys);
                      const maxY = Math.max(...ys);
                      const minDim = Math.min(maxX - minX, maxY - minY);
                      fontC1 = Math.max(12, Math.min(28, minDim * 0.18));
                    }
                    return (
                      <>
                        {/* Outer square frame */}
                        <rect
                          x={0}
                          y={0}
                          width={S}
                          height={S}
                          fill="rgba(255,255,255,0.06)"
                          stroke="#E6E6E6"
                          strokeWidth={3}
                        />

                        {/* Corner right-angle ticks */}
                        {/* Top-left */}
                        <path d={`M0,${tick} L0,0 L${tick},0`} stroke="#E6E6E6" strokeWidth={3} fill="none" />
                        {/* Top-right */}
                        <path
                          d={`M${S - tick},0 L${S},0 L${S},${tick}`}
                          stroke="#E6E6E6"
                          strokeWidth={3}
                          fill="none"
                        />
                        {/* Bottom-right */}
                        <path
                          d={`M${S},${S - tick} L${S},${S} L${S - tick},${S}`}
                          stroke="#E6E6E6"
                          strokeWidth={3}
                          fill="none"
                        />
                        {/* Bottom-left */}
                        <path
                          d={`M${tick},${S} L0,${S} L0,${S - tick}`}
                          stroke="#E6E6E6"
                          strokeWidth={3}
                          fill="none"
                        />

                        {/* Tiny corner squares to denote right angles */}
                        {(() => {
                          const r = 10; // size of tiny squares
                          const p = 2; // pull closer to corners
                          return (
                            <>
                              <rect
                                x={p}
                                y={p}
                                width={r}
                                height={r}
                                fill="none"
                                stroke="#E6E6E6"
                                strokeWidth={2}
                              />
                              <rect
                                x={S - r - p}
                                y={p}
                                width={r}
                                height={r}
                                fill="none"
                                stroke="#E6E6E6"
                                strokeWidth={2}
                              />
                              <rect
                                x={S - r - p}
                                y={S - r - p}
                                width={r}
                                height={r}
                                fill="none"
                                stroke="#E6E6E6"
                                strokeWidth={2}
                              />
                              <rect
                                x={p}
                                y={S - r - p}
                                width={r}
                                height={r}
                                fill="none"
                                stroke="#E6E6E6"
                                strokeWidth={2}
                              />
                            </>
                          );
                        })()}

                        {/* Central diamond representing c^2 - match separated state's border color */}
                        <path d={diamondPath} fill="#0f7a20" stroke="#00BB4E" strokeWidth={3} />
                        <text
                          x={S / 2}
                          y={S / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          style={{ fontSize: `${fontC1}px`, fontWeight: 'bold', fill: '#FFFFFF' }}
                        >
                          {t('dissectionProof.areaCSquared')}
                        </text>

                        {/* Side segment labels outside the square - adjust offsets to match reference and avoid cropping */}
                        {/* Top side: a then b */}
                        <text
                          x={a / 2}
                          y={-28}
                          textAnchor="middle"
                          style={{ fontSize: '22px', fontWeight: 700, fill: '#FFFFFF' }}
                        >
                          a
                        </text>
                        <text
                          x={a + b / 2}
                          y={-28}
                          textAnchor="middle"
                          style={{ fontSize: '22px', fontWeight: 700, fill: '#FFFFFF' }}
                        >
                          b
                        </text>
                        {/* Bottom side: b then a */}
                        <text
                          x={b / 2}
                          y={S + 30}
                          textAnchor="middle"
                          style={{ fontSize: '22px', fontWeight: 700, fill: '#FFFFFF' }}
                        >
                          b
                        </text>
                        <text
                          x={b + a / 2}
                          y={S + 30}
                          textAnchor="middle"
                          style={{ fontSize: '22px', fontWeight: 700, fill: '#FFFFFF' }}
                        >
                          a
                        </text>
                        {/* Left side: b (top), a (bottom) */}
                        <text
                          x={-22}
                          y={b / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          style={{ fontSize: '22px', fontWeight: 700, fill: '#FFFFFF' }}
                        >
                          b
                        </text>
                        <text
                          x={-22}
                          y={b + a / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          style={{ fontSize: '22px', fontWeight: 700, fill: '#FFFFFF' }}
                        >
                          a
                        </text>
                        {/* Right side: a (top), b (bottom) */}
                        <text
                          x={S + 22}
                          y={a / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          style={{ fontSize: '22px', fontWeight: 700, fill: '#FFFFFF' }}
                        >
                          a
                        </text>
                        <text
                          x={S + 22}
                          y={a + b / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          style={{ fontSize: '22px', fontWeight: 700, fill: '#FFFFFF' }}
                        >
                          b
                        </text>
                      </>
                    );
                  })()}
                </g>

                {/* Rearranged state (2) - stays mounted and uses conditional style */}
                <g style={styleFor(2)}>
                  {(() => {
                    const a = currentA;
                    const b = currentB;
                    const S = a + b;
                    const { squares } = getState2Geometry();
                    const tick = 10;
                    const tiny = 10;
                    const pad = 2; // pull closer to corners
                    // Dynamic font sizes for labels inside squares
                    const fontA2 = Math.max(12, Math.min(28, a * 0.14));
                    const fontB2 = Math.max(12, Math.min(28, b * 0.14));
                    return (
                      <>
                        {/* Outer square frame with subtle fill */}
                        <rect
                          x={0}
                          y={0}
                          width={S}
                          height={S}
                          fill="rgba(255,255,255,0.06)"
                          stroke="#E6E6E6"
                          strokeWidth={3}
                        />

                        {/* Corner right-angle ticks */}
                        <path d={`M0,${tick} L0,0 L${tick},0`} stroke="#E6E6E6" strokeWidth={3} fill="none" />
                        <path
                          d={`M${S - tick},0 L${S},0 L${S},${tick}`}
                          stroke="#E6E6E6"
                          strokeWidth={3}
                          fill="none"
                        />
                        <path
                          d={`M${S},${S - tick} L${S},${S} L${S - tick},${S}`}
                          stroke="#E6E6E6"
                          strokeWidth={3}
                          fill="none"
                        />
                        <path
                          d={`M${tick},${S} L0,${S} L0,${S - tick}`}
                          stroke="#E6E6E6"
                          strokeWidth={3}
                          fill="none"
                        />

                        {/* Tiny corner squares at outer corners (exclude bottom-right to avoid extra in D) */}
                        <rect
                          x={pad}
                          y={pad}
                          width={tiny}
                          height={tiny}
                          fill="none"
                          stroke="#E6E6E6"
                          strokeWidth={2}
                        />
                        <rect
                          x={S - tiny - pad}
                          y={pad}
                          width={tiny}
                          height={tiny}
                          fill="none"
                          stroke="#E6E6E6"
                          strokeWidth={2}
                        />
                        <rect
                          x={pad}
                          y={S - tiny - pad}
                          width={tiny}
                          height={tiny}
                          fill="none"
                          stroke="#E6E6E6"
                          strokeWidth={2}
                        />

                        {/* Colored squares with consistent borders matching separated state */}
                        <path d={polygonToPath(squares.b)} fill="#1f5df0" stroke="#648EFF" strokeWidth={3} />
                        <path d={polygonToPath(squares.a)} fill="#ba1c1c" stroke="#FF4B4A" strokeWidth={3} />

                        {/* Labels inside squares */}
                        <text
                          x={a + b / 2}
                          y={b / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          style={{ fontSize: `${fontB2}px`, fontWeight: 700, fill: '#FFFFFF' }}
                        >
                          {t('dissectionProof.areaBSquared')}
                        </text>
                        <text
                          x={a / 2}
                          y={b + a / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          style={{ fontSize: `${fontA2}px`, fontWeight: 700, fill: '#FFFFFF' }}
                        >
                          {t('dissectionProof.areaASquared')}
                        </text>

                        {/* White diagonals through the empty L-shape */}
                        <path d={`M0,${b} L${a},0`} stroke="#FFFFFF" strokeWidth={3} fill="none" />
                        <path d={`M${a},${b} L${S},${S}`} stroke="#FFFFFF" strokeWidth={3} fill="none" />

                        {/* Tiny right-angle squares at opposite corners of blank-area diagonals */}
                        {/* For top-left blank area A: diagonal (0,b) -> (a,0) has opposite corners (0,0) and (a,b) */}
                        <rect
                          x={pad}
                          y={pad}
                          width={tiny}
                          height={tiny}
                          fill="none"
                          stroke="#E6E6E6"
                          strokeWidth={2}
                        />
                        <rect
                          x={a - tiny - pad}
                          y={b - tiny - pad}
                          width={tiny}
                          height={tiny}
                          fill="none"
                          stroke="#E6E6E6"
                          strokeWidth={2}
                        />
                        {/* For bottom-right blank area D: diagonal (a,b) -> (S,S) has opposite corners (S,b) and (a,S) */}
                        <rect
                          x={S - tiny - pad}
                          y={b + pad}
                          width={tiny}
                          height={tiny}
                          fill="none"
                          stroke="#E6E6E6"
                          strokeWidth={2}
                        />
                        <rect
                          x={a + pad}
                          y={S - tiny - pad}
                          width={tiny}
                          height={tiny}
                          fill="none"
                          stroke="#E6E6E6"
                          strokeWidth={2}
                        />

                        {/* Side labels for each square individually */}
                        {/* a labels: left and bottom centered on a^2 square sides */}
                        <text
                          x={-24}
                          y={b + a / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          style={{ fontSize: '22px', fontWeight: 700, fill: '#FFFFFF' }}
                        >
                          a
                        </text>
                        <text
                          x={a / 2}
                          y={S + 28}
                          textAnchor="middle"
                          style={{ fontSize: '22px', fontWeight: 700, fill: '#FFFFFF' }}
                        >
                          a
                        </text>
                        {/* b labels: top and right centered on b^2 square sides */}
                        <text
                          x={a + b / 2}
                          y={-26}
                          textAnchor="middle"
                          style={{ fontSize: '22px', fontWeight: 700, fill: '#FFFFFF' }}
                        >
                          b
                        </text>
                        <text
                          x={S + 22}
                          y={b / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          style={{ fontSize: '22px', fontWeight: 700, fill: '#FFFFFF' }}
                        >
                          b
                        </text>
                      </>
                    );
                  })()}
                </g>

                {/* Separated state (3) - snap (no animation) */}
                <g style={styleFor(3)}>
                  {(() => {
                    const a = currentA;
                    const b = currentB;
                    const S = a + b;
                    const c = Math.sqrt(a * a + b * b);
                    // Layout dimensions
                    const H = S * 1.1;
                    const centerY = H / 2;
                    const gap = Math.max(20, S * 0.08);
                    const signSpace = Math.max(12, S * 0.06); // extra space on both sides of signs
                    // Positions
                    const aX = Math.max(10, S * 0.12);
                    const aY = centerY - a / 2;
                    const plusX = aX + a + signSpace + gap * 0.4;
                    const bX = plusX + signSpace + gap * 0.4;
                    const bY = centerY - b / 2;
                    const eqX = bX + b + signSpace + gap * 0.4;
                    const cCX = eqX + signSpace + gap * 0.5 + c / Math.SQRT2; // center x for diamond
                    const cCY = centerY;
                    const r = c / Math.SQRT2; // distance from center to vertex for 45° rotated square

                    // Dynamic font sizes so labels scale with shapes
                    const fontA = Math.max(12, Math.min(28, a * 0.14));
                    const fontB = Math.max(12, Math.min(28, b * 0.14));
                    const fontC = Math.max(12, Math.min(28, c * 0.12));
                    const fontSign = Math.max(22, Math.min(34, S * 0.12));

                    return (
                      <>
                        {/* a^2 square */}
                        <rect x={aX} y={aY} width={a} height={a} fill="#ba1c1c" stroke="#FF4B4A" strokeWidth={3} />
                        <text
                          x={aX + a / 2}
                          y={aY + a / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          style={{ fontSize: `${fontA}px`, fontWeight: 700, fill: '#FFFFFF' }}
                        >
                          {t('dissectionProof.areaASquared')}
                        </text>

                        {/* Plus sign */}
                        <text
                          x={plusX}
                          y={centerY}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          style={{ fontSize: `${fontSign}px`, fontWeight: 800, fill: '#FFFFFF' }}
                        >
                          +
                        </text>

                        {/* b^2 square */}
                        <rect x={bX} y={bY} width={b} height={b} fill="#1f5df0" stroke="#648EFF" strokeWidth={3} />
                        <text
                          x={bX + b / 2}
                          y={bY + b / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          style={{ fontSize: `${fontB}px`, fontWeight: 700, fill: '#FFFFFF' }}
                        >
                          {t('dissectionProof.areaBSquared')}
                        </text>

                        {/* Equals sign */}
                        <text
                          x={eqX}
                          y={centerY}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          style={{ fontSize: `${fontSign}px`, fontWeight: 800, fill: '#FFFFFF' }}
                        >
                          =
                        </text>

                        {/* c^2 rotated square (diamond) */}
                        <path
                          d={`M ${cCX},${cCY - r} L ${cCX + r},${cCY} L ${cCX},${cCY + r} L ${cCX - r},${cCY} Z`}
                          fill="#0f7a20"
                          stroke="#00BB4E"
                          strokeWidth={3}
                        />
                        <text
                          x={cCX}
                          y={cCY}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          style={{ fontSize: `${fontC}px`, fontWeight: 700, fill: '#FFFFFF' }}
                        >
                          {t('dissectionProof.areaCSquared')}
                        </text>
                      </>
                    );
                  })()}
                </g>
              </>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DissectionProof;
