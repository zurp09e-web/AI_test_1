import React, { useEffect, useRef } from 'react';

interface Props {
  themeColor?: string;
}

export const CyberCityWallpaper: React.FC<Props> = ({ themeColor = '#00f0ff' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Buildings layers
    interface Building {
      x: number;
      width: number;
      height: number;
      layer: number;
      windows: { x: number; y: number; on: boolean; color: string }[];
      antenna?: { height: number; blinkTime: number };
    }

    interface Hovercar {
      x: number;
      y: number;
      speed: number;
      color: string;
      length: number;
    }

    const buildings: Building[] = [];
    const hovercars: Hovercar[] = [];
    const rainDrops: { x: number; y: number; speed: number; len: number }[] = [];

    const initCity = () => {
      buildings.length = 0;
      hovercars.length = 0;
      rainDrops.length = 0;

      // Layer 1 (Far background silhouettes)
      let curX = 0;
      while (curX < width + 100) {
        const bWidth = 50 + Math.random() * 80;
        const bHeight = height * (0.35 + Math.random() * 0.35);
        buildings.push({
          x: curX,
          width: bWidth,
          height: bHeight,
          layer: 1,
          windows: [],
        });
        curX += bWidth - 5;
      }

      // Layer 2 (Mid-ground with detailed windows)
      curX = -20;
      while (curX < width + 100) {
        const bWidth = 60 + Math.random() * 90;
        const bHeight = height * (0.2 + Math.random() * 0.35);
        const windows = [];
        const winCols = Math.floor(bWidth / 14);
        const winRows = Math.floor(bHeight / 18);

        for (let r = 2; r < winRows - 1; r++) {
          for (let c = 1; c < winCols - 1; c++) {
            if (Math.random() > 0.45) {
              const colors = [themeColor, '#ff007f', '#ffe600', '#00ff66', '#ffffff'];
              windows.push({
                x: c * 14 + 4,
                y: r * 18 + 4,
                on: true,
                color: colors[Math.floor(Math.random() * colors.length)],
              });
            }
          }
        }

        buildings.push({
          x: curX,
          width: bWidth,
          height: bHeight,
          layer: 2,
          windows,
          antenna: Math.random() > 0.5 ? { height: 20 + Math.random() * 40, blinkTime: Math.random() * 100 } : undefined,
        });
        curX += bWidth + 10;
      }

      // Hovercars
      for (let i = 0; i < 18; i++) {
        hovercars.push({
          x: Math.random() * width,
          y: height * 0.4 + Math.random() * (height * 0.45),
          speed: (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 5),
          color: Math.random() > 0.5 ? '#00f0ff' : '#ff007f',
          length: 30 + Math.random() * 40,
        });
      }

      // Rain
      for (let i = 0; i < 180; i++) {
        rainDrops.push({
          x: Math.random() * width,
          y: Math.random() * height,
          speed: 12 + Math.random() * 10,
          len: 10 + Math.random() * 15,
        });
      }
    };

    initCity();

    let time = 0;
    let animationFrameId: number;

    const render = () => {
      time++;
      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, '#04060c');
      skyGrad.addColorStop(0.5, '#0b1022');
      skyGrad.addColorStop(0.8, '#18122b');
      skyGrad.addColorStop(1, '#05070f');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Distant giant holographic moon/orb
      ctx.strokeStyle = 'rgba(255, 0, 127, 0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(width * 0.8, height * 0.25, 70, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(0, 240, 255, 0.05)';
      ctx.beginPath();
      ctx.arc(width * 0.8, height * 0.25, 68, 0, Math.PI * 2);
      ctx.fill();

      // Draw background buildings
      buildings.filter(b => b.layer === 1).forEach(b => {
        ctx.fillStyle = '#080c18';
        ctx.fillRect(b.x, height - b.height, b.width, b.height);
      });

      // Hovercars mid-air
      hovercars.forEach(car => {
        car.x += car.speed;
        if (car.speed > 0 && car.x > width + 100) car.x = -100;
        if (car.speed < 0 && car.x < -100) car.x = width + 100;

        ctx.strokeStyle = car.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = car.color;
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.moveTo(car.x, car.y);
        ctx.lineTo(car.x - car.speed * 8, car.y);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(car.x, car.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Draw foreground buildings
      buildings.filter(b => b.layer === 2).forEach(b => {
        ctx.fillStyle = '#0c1222';
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.fillRect(b.x, height - b.height, b.width, b.height);
        ctx.strokeRect(b.x, height - b.height, b.width, b.height);

        // Antenna
        if (b.antenna) {
          ctx.strokeStyle = '#334155';
          ctx.beginPath();
          ctx.moveTo(b.x + b.width / 2, height - b.height);
          ctx.lineTo(b.x + b.width / 2, height - b.height - b.antenna.height);
          ctx.stroke();

          // Blinking red/neon light
          if (Math.sin((time + b.antenna.blinkTime) * 0.1) > 0) {
            ctx.fillStyle = '#ff0055';
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#ff0055';
            ctx.beginPath();
            ctx.arc(b.x + b.width / 2, height - b.height - b.antenna.height, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }

        // Windows
        b.windows.forEach(w => {
          ctx.fillStyle = w.color;
          ctx.shadowBlur = 3;
          ctx.shadowColor = w.color;
          ctx.fillRect(b.x + w.x, height - b.height + w.y, 6, 8);
        });
        ctx.shadowBlur = 0;
      });

      // Neon rain
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      rainDrops.forEach(r => {
        r.y += r.speed;
        r.x -= r.speed * 0.2;
        if (r.y > height) {
          r.y = -20;
          r.x = Math.random() * (width + 100);
        }
        ctx.moveTo(r.x, r.y);
        ctx.lineTo(r.x - 3, r.y + r.len);
      });
      ctx.stroke();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initCity();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [themeColor]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />;
};
