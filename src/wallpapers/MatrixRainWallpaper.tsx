import React, { useEffect, useRef } from 'react';

interface Props {
  themeColor?: string;
}

export const MatrixRainWallpaper: React.FC<Props> = ({ themeColor = '#00ff66' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const chars = 'ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ0123456789ABCDEF⚡⚡λΩΨ';
    const fontSize = 16;
    let columns = Math.floor(width / fontSize);
    let drops: number[] = [];
    let speeds: number[] = [];

    const initDrops = () => {
      columns = Math.floor(width / fontSize);
      drops = [];
      speeds = [];
      for (let i = 0; i < columns; i++) {
        drops[i] = Math.random() * -100;
        speeds[i] = 1 + Math.random() * 1.5;
      }
    };
    initDrops();

    let animationFrameId: number;

    const render = () => {
      // Semi-transparent black background creates fade trail
      ctx.fillStyle = 'rgba(5, 7, 15, 0.12)';
      ctx.fillRect(0, 0, width, height);

      ctx.font = `${fontSize}px "JetBrains Mono", monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Bright white/cyan head of stream
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 8;
        ctx.shadowColor = themeColor;
        ctx.fillText(text, x, y);

        // Green body
        ctx.fillStyle = themeColor;
        ctx.shadowBlur = 4;
        const prevText = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(prevText, x, y - fontSize);

        drops[i] += speeds[i];

        // Reset drop when off screen
        if (drops[i] * fontSize > height && Math.random() > 0.975) {
          drops[i] = 0;
          speeds[i] = 1 + Math.random() * 1.5;
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initDrops();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [themeColor]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />;
};
