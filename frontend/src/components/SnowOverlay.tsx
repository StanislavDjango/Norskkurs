import React, { useEffect, useRef } from "react";

type Flake = {
  x: number;
  y: number;
  r: number;
  vy: number;
  vx: number;
  alpha: number;
};

const prefersReducedMotion = () => {
  if (typeof window === "undefined") return true;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
};

const isMobileViewport = () => {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(max-width: 768px)")?.matches ?? window.innerWidth <= 768;
};

const rand = (min: number, max: number) => min + Math.random() * (max - min);

const SnowOverlay: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const flakesRef = useRef<Flake[]>([]);

  useEffect(() => {
    if (prefersReducedMotion()) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const width = Math.max(1, window.innerWidth);
      const height = Math.max(1, window.innerHeight);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const maxFlakes = isMobileViewport() ? 45 : 90;
      const targetCount = Math.min(maxFlakes, Math.floor((width * height) / 22000));
      const current = flakesRef.current;
      if (current.length > targetCount) {
        flakesRef.current = current.slice(0, targetCount);
        return;
      }
      while (flakesRef.current.length < targetCount) {
        flakesRef.current.push({
          x: rand(0, width),
          y: rand(0, height),
          r: rand(0.9, 2.4),
          vy: rand(16, 42),
          vx: rand(-10, 10),
          alpha: rand(0.25, 0.85),
        });
      }
    };

    resize();
    window.addEventListener("resize", resize);

    let lastTs = performance.now();
    const tick = (ts: number) => {
      const dt = Math.min(0.05, Math.max(0, (ts - lastTs) / 1000));
      lastTs = ts;

      const width = window.innerWidth;
      const height = window.innerHeight;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#38bdf8";

      for (const flake of flakesRef.current) {
        flake.y += flake.vy * dt;
        flake.x += flake.vx * dt;

        if (flake.y - flake.r > height) {
          flake.y = -flake.r - rand(0, 40);
          flake.x = rand(0, width);
        }
        if (flake.x < -20) flake.x = width + 20;
        if (flake.x > width + 20) flake.x = -20;

        ctx.globalAlpha = flake.alpha;
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, []);

  return <canvas ref={canvasRef} className="snow-overlay" aria-hidden="true" />;
};

export default SnowOverlay;
