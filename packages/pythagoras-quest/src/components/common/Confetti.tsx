import { useState, useEffect } from 'react';

export default function ConfettiComponent() {
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '1000';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const shapes = Array.from({ length: 100 }, () => ({
      x: Math.random() * dimensions.width,
      y: Math.random() * dimensions.height,
      vx: -2 + Math.random() * 4,
      vy: -2 + Math.random() * 4,
      shape: Math.floor(Math.random() * 3), // 0: circle, 1: rectangle, 2: curved line
      size: 3 + Math.random() * 5, // Smaller size for circles and squares
      curveSize: 8 + Math.random() * 10, // Larger size for curved lines
      opacity: 1,
    }));

    let frame: number;
    function animate() {
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let allFaded = true;
      shapes.forEach((shape) => {
        if (shape.opacity <= 0) return;
        allFaded = false;

        shape.x += shape.vx;
        shape.y += shape.vy;
        shape.vy += 0.04; // gravity
        shape.opacity -= 0.001;

        ctx.save();
        ctx.globalAlpha = shape.opacity;

        ctx.fillStyle = 'rgba(255, 215, 0, 1)';

        if (shape.shape === 0) {
          // Circle
          ctx.beginPath();
          ctx.arc(shape.x, shape.y, shape.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (shape.shape === 1) {
          // Rectangle
          ctx.fillRect(shape.x, shape.y, shape.size, shape.size);
        } else if (shape.shape === 2) {
          // Curved line
          const curveDirection = Math.random() < 0.5 ? -1 : 1; // Randomly choose direction
          ctx.beginPath();
          ctx.moveTo(shape.x - shape.curveSize, shape.y);
          ctx.quadraticCurveTo(
            shape.x,
            shape.y - shape.curveSize * 1.5 * curveDirection,
            shape.x + shape.curveSize,
            shape.y,
          );
          ctx.strokeStyle = `rgba(255, 215, 0, ${shape.opacity})`; // Yellow color
          ctx.lineWidth = 2; // Thinner line for curved shapes
          ctx.stroke();
        }

        ctx.restore();
      });

      if (!allFaded) {
        frame = requestAnimationFrame(animate);
      } else {
        canvas.remove();
      }
    }

    animate();

    return () => {
      if (frame) {
        cancelAnimationFrame(frame);
      }
      canvas.remove();
    };
  }, [dimensions]);

  return null;
}
