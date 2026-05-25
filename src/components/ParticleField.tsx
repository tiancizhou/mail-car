"use client";

import { useEffect, useRef } from "react";

const TWO_PI = Math.PI * 2;
const STAR_COUNT = 400;

interface Planet {
  name: string;
  radius: number;
  size: number;
  speed: number;
  color: string;
  glow: string;
  angle: number;
  hasRing?: boolean;
  ringColor?: string;
  eccentricity: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

const PLANET_CONFIGS: Omit<Planet, "angle">[] = [
  { name: "Mercury", radius: 60, size: 2, speed: 0.008, color: "180,170,160", glow: "rgba(180,170,160,0.15)", eccentricity: 0.03 },
  { name: "Venus", radius: 90, size: 3, speed: 0.005, color: "230,200,130", glow: "rgba(230,200,130,0.12)", eccentricity: 0.02 },
  { name: "Earth", radius: 130, size: 3.2, speed: 0.004, color: "80,160,255", glow: "rgba(80,160,255,0.15)", eccentricity: 0.02 },
  { name: "Mars", radius: 170, size: 2.5, speed: 0.003, color: "220,100,60", glow: "rgba(220,100,60,0.12)", eccentricity: 0.04 },
  { name: "Jupiter", radius: 240, size: 7, speed: 0.0015, color: "210,170,120", glow: "rgba(210,170,120,0.1)", eccentricity: 0.02 },
  { name: "Saturn", radius: 310, size: 5.5, speed: 0.001, color: "220,200,150", glow: "rgba(220,200,150,0.08)", eccentricity: 0.02, hasRing: true, ringColor: "rgba(220,200,150,0.12)" },
  { name: "Uranus", radius: 370, size: 4, speed: 0.0007, color: "130,210,230", glow: "rgba(130,210,230,0.06)", eccentricity: 0.01 },
  { name: "Neptune", radius: 430, size: 3.8, speed: 0.0005, color: "70,100,230", glow: "rgba(70,100,230,0.06)", eccentricity: 0.01 },
];

function createStars(): Star[] {
  return Array.from({ length: STAR_COUNT }, () => ({
    x: Math.random() * 4000,
    y: Math.random() * 3000,
    size: Math.random() * 1.6 + 0.2,
    alpha: Math.random() * 0.5 + 0.15,
    twinkleSpeed: Math.random() * 0.015 + 0.003,
    twinklePhase: Math.random() * TWO_PI,
  }));
}

function createPlanets(): Planet[] {
  return PLANET_CONFIGS.map((planet) => ({
    ...planet,
    angle: Math.random() * TWO_PI,
  }));
}

function renderNebula(width: number, height: number): HTMLCanvasElement {
  const offscreen = document.createElement("canvas");
  offscreen.width = width;
  offscreen.height = height;
  const ctx = offscreen.getContext("2d");

  if (!ctx) return offscreen;

  const nebulae = [
    { x: width * 0.15, y: height * 0.3, r: 300, c: "0,240,255", a: 0.025 },
    { x: width * 0.8, y: height * 0.7, r: 350, c: "255,45,120", a: 0.018 },
    { x: width * 0.5, y: height * 0.1, r: 250, c: "160,120,255", a: 0.02 },
    { x: width * 0.9, y: height * 0.2, r: 200, c: "0,200,255", a: 0.015 },
    { x: width * 0.3, y: height * 0.85, r: 280, c: "70,100,230", a: 0.02 },
  ];

  for (const n of nebulae) {
    const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
    grad.addColorStop(0, `rgba(${n.c},${n.a})`);
    grad.addColorStop(0.5, `rgba(${n.c},${n.a * 0.4})`);
    grad.addColorStop(1, `rgba(${n.c},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  return offscreen;
}

function drawStars(ctx: CanvasRenderingContext2D, stars: Star[], width: number, height: number, time: number) {
  for (const star of stars) {
    const sx = star.x % width;
    const sy = star.y % height;
    const twinkle = 0.5 + 0.5 * Math.sin(time * star.twinkleSpeed + star.twinklePhase);
    const alpha = star.alpha * (0.4 + twinkle * 0.6);

    ctx.beginPath();
    ctx.arc(sx, sy, star.size, 0, TWO_PI);
    ctx.fillStyle = `rgba(220,225,255,${alpha})`;
    ctx.fill();

    if (star.size > 1.3 && twinkle > 0.75) {
      const flare = star.size * 3;
      ctx.strokeStyle = `rgba(220,225,255,${alpha * 0.3})`;
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(sx - flare, sy);
      ctx.lineTo(sx + flare, sy);
      ctx.moveTo(sx, sy - flare);
      ctx.lineTo(sx, sy + flare);
      ctx.stroke();
    }
  }
}

function drawSolarSystem(ctx: CanvasRenderingContext2D, planets: Planet[], centerX: number, centerY: number, scale: number) {
  ctx.strokeStyle = "rgba(255,255,255,0.03)";
  ctx.lineWidth = 0.5;

  for (const planet of planets) {
    const rx = planet.radius * scale;
    const ry = rx * (1 - planet.eccentricity);
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, rx, ry, 0, 0, TWO_PI);
    ctx.stroke();
  }

  drawSun(ctx, centerX, centerY, scale);
  drawPlanets(ctx, planets, centerX, centerY, scale);
}

function drawSun(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  const radius = 18 * scale;

  for (let i = 3; i >= 0; i--) {
    const glowRadius = radius * (3 + i * 2);
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
    gradient.addColorStop(0, `rgba(255,200,80,${0.03 - i * 0.005})`);
    gradient.addColorStop(1, "rgba(255,200,80,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, glowRadius, 0, TWO_PI);
    ctx.fill();
  }

  const sunGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  sunGradient.addColorStop(0, "rgba(255,240,200,0.9)");
  sunGradient.addColorStop(0.5, "rgba(255,180,60,0.6)");
  sunGradient.addColorStop(1, "rgba(255,120,20,0.2)");
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TWO_PI);
  ctx.fillStyle = sunGradient;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, radius * 0.4, 0, TWO_PI);
  ctx.fillStyle = "rgba(255,255,240,0.8)";
  ctx.fill();
}

function drawPlanets(ctx: CanvasRenderingContext2D, planets: Planet[], centerX: number, centerY: number, scale: number) {
  for (const planet of planets) {
    planet.angle += planet.speed;

    const rx = planet.radius * scale;
    const ry = rx * (1 - planet.eccentricity);
    const x = centerX + Math.cos(planet.angle) * rx;
    const y = centerY + Math.sin(planet.angle) * ry;
    const size = planet.size * scale;

    const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 5);
    glow.addColorStop(0, planet.glow);
    glow.addColorStop(1, `rgba(${planet.color},0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, size * 5, 0, TWO_PI);
    ctx.fill();

    if (planet.hasRing) {
      ctx.beginPath();
      ctx.ellipse(x, y, size * 2.5, size * 0.7, -0.3, 0, TWO_PI);
      ctx.strokeStyle = planet.ringColor || "rgba(220,200,150,0.15)";
      ctx.lineWidth = size * 0.6;
      ctx.stroke();
    }

    const body = ctx.createRadialGradient(x - size * 0.3, y - size * 0.3, 0, x, y, size);
    body.addColorStop(0, `rgba(${planet.color},1)`);
    body.addColorStop(1, `rgba(${planet.color},0.6)`);
    ctx.beginPath();
    ctx.arc(x, y, Math.max(size, 1), 0, TWO_PI);
    ctx.fillStyle = body;
    ctx.fill();
  }
}

export default function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stars = useRef<Star[]>([]);
  const planets = useRef<Planet[]>([]);
  const raf = useRef<number>(0);
  const nebulaCache = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = window.innerWidth;
    let height = window.innerHeight;
    let time = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      nebulaCache.current = null;
    };

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      time++;

      const scale = Math.min(width, height) / 1000;

      if (!nebulaCache.current) {
        nebulaCache.current = renderNebula(width, height);
      }

      ctx.drawImage(nebulaCache.current, 0, 0);
      drawStars(ctx, stars.current, width, height, time);
      drawSolarSystem(ctx, planets.current, width * 0.2, height * 0.5, scale);

      raf.current = requestAnimationFrame(draw);
    };

    stars.current = createStars();
    planets.current = createPlanets();
    resize();
    window.addEventListener("resize", resize);
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
