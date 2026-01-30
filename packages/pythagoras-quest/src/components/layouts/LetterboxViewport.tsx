import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type LetterboxViewportProps = {
  width: number; // base virtual width
  height: number; // base virtual height
  className?: string;
  children: React.ReactNode;
};

/**
 * Scales its children to a fixed virtual resolution with letterboxing (black bars),
 * behaving similar to a Phaser canvas using Scale.FIT + CENTER.
 */
export function LetterboxViewport({ width, height, className, children }: LetterboxViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ left: 0, top: 0 });

  const recompute = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    if (cw === 0 || ch === 0) return;

    const scaleX = cw / width;
    const scaleY = ch / height;
    const s = Math.min(scaleX, scaleY);
    const scaledW = width * s;
    const scaledH = height * s;
    const left = Math.floor((cw - scaledW) / 2);
    const top = Math.floor((ch - scaledH) / 2);

    setScale(s);
    setOffset({ left, top });
  }, [width, height]);

  useEffect(() => {
    recompute();
    const ro = new ResizeObserver(() => recompute());
    if (containerRef.current) ro.observe(containerRef.current);
    const onResize = () => recompute();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      ro.disconnect();
    };
  }, [recompute]);

  const innerStyle = useMemo<React.CSSProperties>(() => ({
    position: 'absolute',
    width: `${width}px`,
    height: `${height}px`,
    left: `${offset.left}px`,
    top: `${offset.top}px`,
    transformOrigin: 'top left',
    transform: `scale(${scale})`,
  }), [width, height, offset.left, offset.top, scale]);

  return (
    <div ref={containerRef} className={['letterbox-viewport', className].filter(Boolean).join(' ')}>
      <div style={innerStyle} className="letterbox-stage">
        {children}
      </div>
    </div>
  );
}

export default LetterboxViewport;
