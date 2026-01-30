import React, { useRef, useEffect, useCallback } from 'react';
import type { Pebble, CanvasCoordinates, CameraOffset, DragStart, Triple } from './types';
import { useTranslations } from '../../../hooks/useTranslations';
import { emitEvent } from '../../../utils/eventEmitter';
import { announceToScreenReader } from '@k8-games/sdk';

interface PebbleProofProps {
  translations: any;
  currentA: number;
  currentB: number;
  currentC: number;
  onTripleSelect: (a: number, b: number) => void;
  onAnimate: () => void;
  onReset: () => void;
  isAnimating: boolean;
  hasAnimatedProof: boolean;
  startAnimation?: () => void;
}

const PebbleProof: React.FC<PebbleProofProps> = ({
  translations: _translations,
  currentA,
  currentB,
  currentC,
  onTripleSelect,
  onAnimate,
  onReset,
  isAnimating,
  hasAnimatedProof,
}) => {
  const { t } = useTranslations();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const pebblesRef = useRef<Pebble[]>([]);
  const cameraOffsetRef = useRef<CameraOffset>({ x: 0, y: 0 });
  const cameraZoomRef = useRef<number>(1);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<DragStart>({ x: 0, y: 0 });

  // Constants
  const PEBBLE_RADIUS = 3.5;
  const PEBBLE_A_COLOR = 'rgba(255, 2, 0)';
  const PEBBLE_B_COLOR = 'rgba(11, 153, 255)';

  // Zoom levels for different triples
  const getZoomLevel = (a: number, b: number): number => {
    if (a === 3 && b === 4) return 1.2; // 3-4-5 triple
    if (a === 6 && b === 8) return 0.8; // 6-8-10 triple - needs more zoom out
    if (a === 5 && b === 12) return 0.6; // 5-12-13 triple - needs even more zoom out
    return 1; // default
  };

  const getCanvasCoordinates = useCallback((a: number, b: number): CanvasCoordinates => {
    const canvas = canvasRef.current;
    if (!canvas) return { originX: 0, originY: 0, angle: 0, scale: 20 };

    const scale = 20;
    const originX = canvas.width / 2 - (b * scale) / 2;
    const originY = canvas.height / 2 + (a * scale) / 2;
    const angle = Math.atan2(a, b);
    return { originX, originY, angle, scale };
  }, []);

  const applyTransforms = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(cameraZoomRef.current, cameraZoomRef.current);
    ctx.translate(-canvas.width / 2 + cameraOffsetRef.current.x, -canvas.height / 2 + cameraOffsetRef.current.y);
  }, []);

  const drawPebble = useCallback((pebble: Pebble) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.arc(pebble.x, pebble.y, PEBBLE_RADIUS, 0, 2 * Math.PI);
    ctx.fillStyle = pebble.color;
    ctx.fill();
  }, []);

  const drawBackground = useCallback(
    (a: number, b: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const c = Math.sqrt(a * a + b * b);
      const { originX, originY, angle, scale } = getCanvasCoordinates(a, b);

      // Set consistent outline thickness for squares (slightly thinner)
      const squareLineWidth = 3 / Math.max(0.5, cameraZoomRef.current);

      // Draw A square (red outline)
      ctx.lineWidth = squareLineWidth;
      ctx.strokeStyle = '#FF0200'; // Updated red
      ctx.strokeRect(originX - a * scale, originY - a * scale, a * scale, a * scale);
      // Draw B square (blue outline)
      ctx.lineWidth = squareLineWidth;
      ctx.strokeStyle = '#0B99FF'; // Updated blue
      ctx.strokeRect(originX, originY, b * scale, b * scale);

      // Draw semi-transparent right triangle fill between squares
      ctx.beginPath();
      ctx.moveTo(originX, originY); // right angle corner
      ctx.lineTo(originX, originY - a * scale); // up side a
      ctx.lineTo(originX + b * scale, originY); // right side b
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; // #FFFFFF at 15%
      ctx.fill();

      // Draw rotated c square (green outline) above the triangle fill
      ctx.save();
      ctx.translate(originX, originY - a * scale);
      ctx.rotate(angle);
      ctx.lineWidth = squareLineWidth;
      ctx.strokeStyle = '#00FF6A'; // Updated green
      ctx.strokeRect(0, -c * scale, c * scale, c * scale);
      ctx.restore();

      // Draw text labels using default UI font (to match buttons/top text)
      ctx.font = `bold ${
        a === 3 ? 16 : a === 5 ? 32 : 24
      }px Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Text for square A (red)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(
        `a² = ${a * a}`,
        originX - (a === 3 ? 60 : a === 5 ? 120 : 115) - (a * scale) / 2,
        originY - (a * scale) / 2,
      );

      // Text for square B (blue)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(
        `b² = ${b * b}`,
        originX + (a === 3 ? 74 : currentA === 5 ? 200 : 130) + (b * scale) / 2,
        originY + (b * scale) / 2,
      );

      // Text for square C (green) - counter-rotated to stay upright
      ctx.save();
      ctx.translate(originX, originY - a * scale);
      ctx.rotate(angle);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(
        `c² = ${c * c}`,
        a === 3 ? 50 : a === 5 ? 120 : 100,
        (-c * scale) / 2 + (a === 3 ? -65 : a === 5 ? -150 : -115),
      );
      ctx.restore();
      // // Draw right-angle L-shaped marker at the origin corner
      // const bracketSize = Math.max(8, 0.15 * scale);
      // const bracketLine = 2 / Math.max(0.5, cameraZoomRef.current);
      // ctx.lineWidth = bracketLine;
      // ctx.strokeStyle = "#FFFFFF";
      // ctx.beginPath();
      // // Draw the right-angle marker inside the triangle area
      // const insetAmount = Math.min(8, 0.1 * scale);
      // const startX = originX + insetAmount;
      // const startY = originY - insetAmount;
      // // Horizontal short segment to the right
      // ctx.moveTo(startX, startY);
      // ctx.lineTo(startX + bracketSize, startY);
      // // Vertical short segment upward
      // ctx.moveTo(startX, startY);
      // ctx.lineTo(startX, startY - bracketSize);
      // ctx.stroke();

      // ctx.lineWidth = 1;
    },
    [getCanvasCoordinates, currentA],
  );

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    applyTransforms();
    drawBackground(currentA, currentB);

    let allInPlace = true;
    pebblesRef.current.forEach((p) => {
      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      if (Math.sqrt(dx * dx + dy * dy) > 1) {
        allInPlace = false;
        p.x += dx * 0.08;
        p.y += dy * 0.08;
      } else {
        p.x = p.tx;
        p.y = p.ty;
      }
      drawPebble(p);
    });

    ctx.restore();

    if (!allInPlace) {
      animationFrameIdRef.current = requestAnimationFrame(animate);
    } else {
      // Animation complete, reset animation state
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    }
  }, [currentA, currentB, applyTransforms, drawBackground, drawPebble, getCanvasCoordinates]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    applyTransforms();
    drawBackground(currentA, currentB);

    // Draw existing pebbles at their current positions
    pebblesRef.current.forEach((pebble) => {
      drawPebble(pebble);
    });

    ctx.restore();
  }, [currentA, currentB, applyTransforms, drawBackground, drawPebble]);

  const drawStaticState = useCallback(() => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    applyTransforms();
    drawBackground(currentA, currentB);

    const { originX, originY, scale } = getCanvasCoordinates(currentA, currentB);

    // Initialize pebbles array
    pebblesRef.current = [];

    // Draw A square pebbles
    for (let i = 0; i < currentA; i++) {
      for (let j = 0; j < currentA; j++) {
        const x = originX - currentA * scale + (i + 0.5) * scale;
        const y = originY - currentA * scale + (j + 0.5) * scale;
        const pebble = { x, y, tx: x, ty: y, color: PEBBLE_A_COLOR };
        pebblesRef.current.push(pebble);
        drawPebble(pebble);
      }
    }

    // Draw B square pebbles
    for (let i = 0; i < currentB; i++) {
      for (let j = 0; j < currentB; j++) {
        const x = originX + (i + 0.5) * scale;
        const y = originY + (j + 0.5) * scale;
        const pebble = { x, y, tx: x, ty: y, color: PEBBLE_B_COLOR };
        pebblesRef.current.push(pebble);
        drawPebble(pebble);
      }
    }

    ctx.restore();
  }, [currentA, currentB, applyTransforms, drawBackground, drawPebble, getCanvasCoordinates]);

  const setupAnimation = useCallback(() => {
    const { originX, originY, scale } = getCanvasCoordinates(currentA, currentB);
    const c = Math.sqrt(currentA * currentA + currentB * currentB);

    // Calculate positions for square C (rotated)
    const angle = Math.atan2(currentA, currentB);
    let pebbleIndex = 0;

    // Rearrange pebbles from A and B squares to fill square C
    for (let i = 0; i < c; i++) {
      for (let j = 0; j < c; j++) {
        if (pebbleIndex < pebblesRef.current.length) {
          // Calculate position in rotated square C
          const localX = (i + 0.5) * scale;
          const localY = -(j + 0.5) * scale;

          // Apply rotation transformation
          const rotatedX = localX * Math.cos(angle) - localY * Math.sin(angle);
          const rotatedY = localX * Math.sin(angle) + localY * Math.cos(angle);

          // Position relative to square C origin
          const targetX = originX + rotatedX;
          const targetY = originY - currentA * scale + rotatedY;

          pebblesRef.current[pebbleIndex].tx = targetX;
          pebblesRef.current[pebbleIndex].ty = targetY;
          pebbleIndex++;
        }
      }
    }
  }, [currentA, currentB, getCanvasCoordinates]);

  const startAnimation = useCallback(() => {
    setupAnimation();
    animate();
  }, [setupAnimation, animate]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    dragStartRef.current.x = (e.clientX - rect.left) / cameraZoomRef.current - cameraOffsetRef.current.x;
    dragStartRef.current.y = (e.clientY - rect.top) / cameraZoomRef.current - cameraOffsetRef.current.y;
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isDraggingRef.current) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        cameraOffsetRef.current.x = (e.clientX - rect.left) / cameraZoomRef.current - dragStartRef.current.x;
        cameraOffsetRef.current.y = (e.clientY - rect.top) / cameraZoomRef.current - dragStartRef.current.y;
        redraw();
      }
    },
    [redraw],
  );

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const step = 20; // pixels to move per key press
    let moved = false;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        cameraOffsetRef.current.y -= step;
        moved = true;
        break;
      case 'ArrowDown':
        e.preventDefault();
        cameraOffsetRef.current.y += step;
        moved = true;
        break;
      case 'ArrowLeft':
        e.preventDefault();
        cameraOffsetRef.current.x -= step;
        moved = true;
        break;
      case 'ArrowRight':
        e.preventDefault();
        cameraOffsetRef.current.x += step;
        moved = true;
        break;
    }

    if (moved) {
      redraw();
    }
  }, [redraw]);

  const initializeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const container = canvas.parentElement;
    if (!container) return;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    cameraZoomRef.current = getZoomLevel(currentA, currentB);
    cameraOffsetRef.current = { x: 0, y: 0 };

    drawStaticState();
  }, [drawStaticState, currentA, currentB]);

  useEffect(() => {
    initializeCanvas();
    const handleResize = () => initializeCanvas();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [initializeCanvas]);

  useEffect(() => {
    drawStaticState();
  }, [currentA, currentB, drawStaticState]);

  const triples: Triple[] = [
    {
      a: 3,
      b: 4,
      label: t('pebbleProof.triple345Label'),
      ariaLabel: t('pebbleProof.triple345Aria'),
    },
    {
      a: 6,
      b: 8,
      label: t('pebbleProof.triple6810Label'),
      ariaLabel: t('pebbleProof.triple6810Aria'),
    },
    {
      a: 5,
      b: 12,
      label: t('pebbleProof.triple51213Label'),
      ariaLabel: t('pebbleProof.triple51213Aria'),
    },
  ];

  return (
    <div className="absolute top-4 left-4 right-4 bottom-4 bg-[#1F1816] overflow-hidden">
      <div className="h-full flex flex-col p-4">
        {/* Controls Section - Fixed Height */}
        <div className="flex-shrink-0 p-4">
          {/* Perfect Triples - Group Label */}
          <p id="perfect-triple-group-label" className="text-left font-medium text-lg mb-3 text-white">
            {t('pebbleProof.selectTriple')}
          </p>

          {/* Radio Button Group with proper ARIA grouping */}
          <div 
            className="pebble-radio-group mb-4" 
            role="radiogroup" 
            aria-labelledby="perfect-triple-group-label"
            aria-required="true"
          >
            {triples.map(({ a, b, label, ariaLabel }) => {
              const isSelected = currentA === a && currentB === b;
              const radioId = `triple-${a}-${b}`;
              return (
                <div key={label} className="pebble-radio-item">
                  <input
                    type="radio"
                    id={radioId}
                    name="perfectTriple"
                    className="pebble-radio-input"
                    checked={isSelected}
                    onChange={() => {
                      // Emit event when user changes to a different triplet
                      // Check if this is different from the current selection
                      if (currentA !== a || currentB !== b) {
                        emitEvent('change_triplet', {
                          fromA: currentA,
                          fromB: currentB,
                          fromC: currentC,
                          toA: a,
                          toB: b,
                          toC: Math.sqrt(a * a + b * b),
                          tripleLabel: label,
                        });
                      }
                      onTripleSelect(a, b);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (currentA !== a || currentB !== b) {
                          emitEvent('change_triplet', {
                            fromA: currentA,
                            fromB: currentB,
                            fromC: currentC,
                            toA: a,
                            toB: b,
                            toC: Math.sqrt(a * a + b * b),
                            tripleLabel: label,
                          });
                        }
                        onTripleSelect(a, b);
                      }
                    }}
                    aria-checked={isSelected}
                    aria-label={ariaLabel}
                  />
                  <label htmlFor={radioId} className="pebble-radio-label" aria-hidden="true">
                    <div className="pebble-radio-circle" aria-hidden="true"></div>
                    <span>{label}</span>
                  </label>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <button
              onClick={() => {
                // Emit event when animate button is clicked
                emitEvent('click_animate_button', {
                  currentA,
                  currentB,
                  currentC,
                  aSquared: currentA * currentA,
                  bSquared: currentB * currentB,
                  cSquared: currentC * currentC,
                });
                
                // Announce to screen reader
                announceToScreenReader(t('pebbleProof.animateAnnouncement'));
                
                onAnimate();
                startAnimation();
              }}
              disabled={isAnimating || hasAnimatedProof}
              className="btn-interactive"
            >
              {t('pebbleProof.animateProof')}
            </button>
            <button
              onClick={() => {
                // Announce to screen reader
                announceToScreenReader(t('pebbleProof.resetAnnouncement'));
                
                onReset();
                drawStaticState();
              }}
              className="btn-interactive"
            >
              {t('pebbleProof.reset')}
            </button>
          </div>

          <div className="flex flex-wrap gap-2 justify-between items-center mt-2">
            {/* Current Triple Display */}
            <p className="sr-only">
              {t('pebbleProof.currentValues')
                .replace('{a}', currentA.toString())
                .replace('{b}', currentB.toString())
                .replace('{c}', currentC.toString())
                .replace('{aSquared}', (currentA * currentA).toString())
                .replace('{bSquared}', (currentB * currentB).toString())
                .replace('{cSquared}', (currentC * currentC).toString())}
            </p>
          </div>
        </div>

        {/* Visualization Section - Equal Height */}
        <div className="flex-1 mx-0 bg-black rounded-lg relative flex items-center justify-center">
          {/* Labels - Top Center */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
            <div className="flex justify-center items-center font-besley space-x-4">
              <div className="font-bold text-xl text-white bg-[#901110] px-3 py-1 rounded-md">a = {currentA}</div>
              <div className="font-bold text-xl text-white bg-[#0534B2] px-3 py-1 rounded-md">b = {currentB}</div>
              <div className="font-bold text-xl text-white bg-[#006301] px-3 py-1 rounded-md">c = {currentC}</div>
            </div>
          </div>
          <canvas
            ref={canvasRef}
            className="cursor-grab active:cursor-grabbing"
            style={{ width: '800px', height: '500px', aspectRatio: '1 / 1' }}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onMouseMove={handleMouseMove}
            onWheel={handleWheel}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="img"
            aria-label={
              !isAnimating
                ? hasAnimatedProof
                  ? ''
                  : t('pebbleProof.canvasAriaStatic')
                      .replace('{aSquared}', (currentA * currentA).toString())
                      .replace('{bSquared}', (currentB * currentB).toString())
                : t('pebbleProof.canvasAriaAnimating')
                    .replace('{aSquared}', (currentA * currentA).toString())
                    .replace('{bSquared}', (currentB * currentB).toString())
                    .replace('{cSquared}', (currentC * currentC).toString())
            }
          />
        </div>
      </div>
    </div>
  );
};

export default PebbleProof;
