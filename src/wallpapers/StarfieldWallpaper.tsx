import React, { useEffect, useRef } from 'react';

interface Props {
  themeColor?: string;
}

export const StarfieldWallpaper: React.FC<Props> = ({ themeColor = '#00f0ff' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const numStars = 600;
    interface Star {
      x: number;
      y: number;
      z: number;
      pz: number;
      color: string;
    }

    const colors = [themeColor, '#ffffff', '#ff007f', '#00f0ff', '#ffe600'];
    const stars: Star[] = [];

    const initStars = () => {
      stars.length = 0;
      for (let i = 0; i < numStars; i++) {
        stars.push({
          x: (Math.random() - 0.5) * width * 2,
          y: (Math.random() - 0.5) * height * 2,
          z: Math.random() * width,
          pz: Math.random() * width,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    };
    initStars();

    let speed = 4;
    let targetSpeed = 4;
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX - width / 2) * 0.15;
      mouseY = (e.clientY - height / 2) * 0.15;
    };

    const handleMouseDown = () => {
      targetSpeed = 16; // Warp speed boost!
    };
    const handleMouseUp = () => {
      targetSpeed = 4;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    let animationFrameId: number;

    const render = () => {
      speed += (targetSpeed - speed) * 0.05;

      ctx.fillStyle = 'rgba(5, 7, 15, 0.25)';
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2 + mouseX;
      const cy = height / 2 + mouseY;

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.pz = s.z;
        s.z -= speed;

        if (s.z <= 0) {
          s.z = width;
          s.pz = width;
          s.x = (Math.random() - 0.5) * width * 2;
          s.y = (Math.random() - 0.5) * height * 2;
        }

        const k = 128 / s.z;
        const px = s.x * k + cx;
        const py = s.y * k + cy;

        const pk = 128 / s.pz;
        const prevPx = s.x * pk + cx;
        const prevPy = s.y * pk + cy;

        if (px >= 0 && px < width && py >= 0 && py < height) {
          const size = Math.max(1, (1 - s.z / width) * 3);
          const alpha = (1 - s.z / width);

          ctx.strokeStyle = s.color;
          ctx.lineWidth = size;
          ctx.globalAlpha = alpha;

          ctx.beginPath();
          ctx.moveTo(prevPx, prevPy);
          ctx.lineTo(px, py);
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(px, py, size * 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1.0;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initStars();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', handleResize);
    };
  }, [themeColor]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />;
};
