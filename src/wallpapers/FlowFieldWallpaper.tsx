import React, { useEffect, useRef } from 'react';

interface Props {
  themeColor?: string;
}

export const FlowFieldWallpaper: React.FC<Props> = ({ themeColor = '#00f0ff' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const numParticles = 300;
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      history: { x: number; y: number }[];
      color: string;
      speed: number;
    }

    const colors = [themeColor, '#ff007f', '#ffe600', '#00ff66', '#9d00ff'];
    const particles: Particle[] = [];

    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: 0,
        vy: 0,
        history: [],
        color: colors[i % colors.length],
        speed: 1 + Math.random() * 2,
      });
    }

    let time = 0;
    let animationFrameId: number;

    const render = () => {
      ctx.fillStyle = 'rgba(5, 7, 15, 0.08)';
      ctx.fillRect(0, 0, width, height);

      time += 0.003;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.history.push({ x: p.x, y: p.y });
        if (p.history.length > 12) {
          p.history.shift();
        }

        const angle = (Math.sin(p.x * 0.003 + time) + Math.cos(p.y * 0.003 + time)) * Math.PI * 2;
        p.vx = Math.cos(angle) * p.speed;
        p.vy = Math.sin(angle) * p.speed;

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Draw trail
        if (p.history.length > 1) {
          ctx.beginPath();
          ctx.moveTo(p.history[0].x, p.history[0].y);
          for (let j = 1; j < p.history.length; j++) {
            ctx.lineTo(p.history[j].x, p.history[j].y);
          }
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.8;
          ctx.shadowBlur = 6;
          ctx.shadowColor = p.color;
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [themeColor]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />;
};
