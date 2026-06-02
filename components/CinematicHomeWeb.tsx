// AuraLens cinematic landing — WEB ONLY.
// Adapted from the user-supplied CinematicHero pattern. GSAP-driven
// scroll-pinned timeline:
//   1. Tagline 1 fades up + de-blurs
//   2. Tagline 2 clip-path wipes left → right
//   3. Card slides up from the bottom and grows to full-screen
//   4. Aura scan mockup zooms in with parallax tilt
//   5. Floating badges + side text reveal
//   6. Hero fades out, CTAs fade in
//   7. Card shrinks back to a thumbnail then flies off
//
// All hand-written CSS — no Tailwind dependency required.

import { useEffect, useRef } from 'react';
import { router } from 'expo-router';

const INJECTED_STYLES = `
.alens-cinematic {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: transparent;
  color: #F7F3EA;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  perspective: 1500px;
}

.alens-cinematic .reveal { visibility: hidden; }

.alens-cinematic .film-grain {
  position: absolute; inset: 0;
  pointer-events: none; z-index: 60;
  opacity: 0.06; mix-blend-mode: overlay;
  background: url('data:image/svg+xml;utf8,<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23n)"/></svg>');
}
.alens-cinematic .grid-mask {
  position: absolute; inset: 0; z-index: 1;
  pointer-events: none; opacity: 0.5;
  background-size: 60px 60px;
  background-image:
    linear-gradient(to right, rgba(247,243,234,0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(247,243,234,0.05) 1px, transparent 1px);
  -webkit-mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
          mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
}

/* ── Hero text ──────────────────────────────────────────────────── */
.alens-cinematic .hero-wrap {
  position: absolute; inset: 0;
  z-index: 10;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  text-align: center; padding: 0 16px;
  will-change: transform;
}
.alens-cinematic .eyebrow {
  color: #F4C76B;
  font-size: 12px; font-weight: 600;
  letter-spacing: 3.4px; text-transform: uppercase;
  margin-bottom: 24px;
}
.alens-cinematic .h1-track {
  margin: 0; line-height: 0.95;
  font-weight: 800;
  font-size: clamp(48px, 7vw, 110px);
  letter-spacing: -0.04em;
  color: #F7F3EA;
  text-shadow:
    0 10px 30px rgba(247, 243, 234, 0.18),
    0 2px 4px rgba(247, 243, 234, 0.08);
}
.alens-cinematic .h1-days {
  margin: 0; line-height: 0.95;
  font-weight: 900;
  font-size: clamp(48px, 7vw, 110px);
  letter-spacing: -0.045em;
  background: linear-gradient(180deg, #FBE3A2 0%, rgba(244,199,107,0.5) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
          background-clip: text;
  transform: translateZ(0);
  filter:
    drop-shadow(0 10px 20px rgba(244,199,107,0.20))
    drop-shadow(0 2px 4px rgba(244,199,107,0.10));
}

/* ── CTA wrap (final scroll state) ──────────────────────────────── */
.alens-cinematic .cta-wrap {
  position: absolute; inset: 0;
  z-index: 10;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  text-align: center; padding: 0 16px;
  will-change: transform;
}
.alens-cinematic .cta-wrap h2 {
  margin: 0 0 16px;
  font-weight: 800;
  font-size: clamp(36px, 5.5vw, 80px);
  letter-spacing: -0.03em;
  line-height: 1.04;
  background: linear-gradient(180deg, #FBE3A2 0%, rgba(244,199,107,0.5) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
          background-clip: text;
  transform: translateZ(0);
}
.alens-cinematic .cta-wrap p {
  margin: 0 auto 48px;
  max-width: 580px;
  font-size: clamp(15px, 1.4vw, 19px);
  line-height: 1.55;
  color: rgba(247,243,234,0.62);
  font-weight: 400;
}
.alens-cinematic .cta-row {
  display: flex; gap: 16px;
  flex-wrap: wrap; justify-content: center;
}

/* Tactile gold + dark CTAs */
.alens-cinematic .btn-tactile {
  display: inline-flex; align-items: center; justify-content: center;
  gap: 12px;
  padding: 18px 32px;
  border-radius: 22px;
  border: 0; outline: 0;
  cursor: pointer;
  font-family: inherit; font-weight: 700;
  letter-spacing: 0.2px;
  transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
}
.alens-cinematic .btn-gold {
  background: linear-gradient(180deg, #FBE3A2 0%, #C99645 100%);
  color: #1A1305;
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.18),
    0 2px 4px rgba(0,0,0,0.20),
    0 12px 24px -4px rgba(244,199,107,0.30),
    inset 0 1px 1px rgba(255,255,255,0.95),
    inset 0 -3px 6px rgba(0,0,0,0.08);
}
.alens-cinematic .btn-gold:hover {
  transform: translateY(-3px);
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.22),
    0 6px 12px -2px rgba(244,199,107,0.35),
    0 22px 36px -6px rgba(244,199,107,0.40),
    inset 0 1px 1px rgba(255,255,255,1),
    inset 0 -3px 6px rgba(0,0,0,0.08);
}
.alens-cinematic .btn-gold:active {
  transform: translateY(1px);
  background: linear-gradient(180deg, #F4C76B 0%, #9B7D3A 100%);
}
.alens-cinematic .btn-dark {
  background: linear-gradient(180deg, #1F1B2C 0%, #0E0C16 100%);
  color: #FFFFFF;
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.10),
    0 2px 4px rgba(0,0,0,0.6),
    0 12px 24px -4px rgba(0,0,0,0.9),
    inset 0 1px 1px rgba(255,255,255,0.15),
    inset 0 -3px 6px rgba(0,0,0,0.8);
}
.alens-cinematic .btn-dark:hover {
  transform: translateY(-3px);
  background: linear-gradient(180deg, #2D2740 0%, #1A1726 100%);
}
.alens-cinematic .btn-dark:active { transform: translateY(1px); }

.alens-cinematic .btn-label-small {
  font-size: 10px; font-weight: 700;
  letter-spacing: 1.6px; text-transform: uppercase;
  opacity: 0.6;
  margin-bottom: -2px;
}
.alens-cinematic .btn-label-large {
  font-size: 20px; font-weight: 800;
  letter-spacing: -0.02em; line-height: 1;
}

/* ── Foreground card ─────────────────────────────────────────────── */
.alens-cinematic .card-stage {
  position: absolute; inset: 0;
  z-index: 20;
  display: flex; align-items: center; justify-content: center;
  pointer-events: none;
  perspective: 1500px;
}
.alens-cinematic .main-card {
  position: relative;
  pointer-events: auto;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
  width: 85vw; height: 85vh;
  border-radius: 40px;
  background: linear-gradient(145deg, #1A0E40 0%, #0A0815 100%);
  border: 1px solid rgba(255,255,255,0.04);
  box-shadow:
    0 40px 100px -20px rgba(0,0,0,0.9),
    0 20px 40px -20px rgba(0,0,0,0.8),
    inset 0 1px 2px rgba(255,255,255,0.20),
    inset 0 -2px 4px rgba(0,0,0,0.8);
}
.alens-cinematic .card-sheen {
  position: absolute; inset: 0;
  border-radius: inherit;
  pointer-events: none; z-index: 50;
  background: radial-gradient(800px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(244,199,107,0.10) 0%, transparent 40%);
  mix-blend-mode: screen;
}

.alens-cinematic .card-inner {
  position: relative;
  width: 100%; height: 100%;
  max-width: 1280px; margin: 0 auto;
  padding: 24px 16px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: space-evenly;
  z-index: 10;
}
@media (min-width: 1024px) {
  .alens-cinematic .card-inner {
    padding: 0 48px;
    display: grid; grid-template-columns: 1fr 1fr 1fr;
    gap: 32px; align-items: center;
  }
}

.alens-cinematic .card-left-text {
  text-align: center;
  width: 100%; padding: 0 16px;
  order: 3;
  z-index: 20;
}
@media (min-width: 1024px) {
  .alens-cinematic .card-left-text { text-align: left; order: 1; padding: 0; }
}
.alens-cinematic .card-left-text h3 {
  color: #FFFFFF;
  font-size: clamp(20px, 2.6vw, 36px);
  font-weight: 700; letter-spacing: -0.02em;
  margin: 0 0 16px;
}
.alens-cinematic .card-left-text p {
  display: none;
  color: rgba(220, 210, 255, 0.72);
  font-size: clamp(14px, 1.2vw, 17px);
  line-height: 1.55; max-width: 360px;
  margin: 0;
}
@media (min-width: 768px) {
  .alens-cinematic .card-left-text p { display: block; }
}

.alens-cinematic .card-right-text {
  display: flex; justify-content: center;
  order: 1;
  z-index: 20;
}
@media (min-width: 1024px) {
  .alens-cinematic .card-right-text { justify-content: flex-end; order: 3; }
}
.alens-cinematic .card-right-text h2 {
  margin: 0;
  font-size: clamp(64px, 8vw, 128px);
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: -0.05em;
  line-height: 0.92;
  background: linear-gradient(180deg, #FFFFFF 0%, #A1A1AA 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
          background-clip: text;
  transform: translateZ(0);
  filter:
    drop-shadow(0 12px 24px rgba(0,0,0,0.8))
    drop-shadow(0 4px 8px rgba(0,0,0,0.6));
}

/* ── Mockup centre column ────────────────────────────────────────── */
.alens-cinematic .mockup-wrap {
  position: relative;
  width: 100%; height: 380px;
  display: flex; align-items: center; justify-content: center;
  order: 2;
  z-index: 10;
  perspective: 1000px;
}
@media (min-width: 1024px) {
  .alens-cinematic .mockup-wrap { height: 600px; order: 2; }
}
.alens-cinematic .mockup-scale {
  position: relative;
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  transform: scale(0.65);
}
@media (min-width: 768px) { .alens-cinematic .mockup-scale { transform: scale(0.85); } }
@media (min-width: 1024px) { .alens-cinematic .mockup-scale { transform: scale(1); } }

.alens-cinematic .device {
  position: relative;
  width: 300px; height: 580px;
  border-radius: 48px;
  background-color: #111;
  box-shadow:
    inset 0 0 0 2px #52525B,
    inset 0 0 0 7px #000,
    0 40px 80px -15px rgba(0,0,0,0.9),
    0 15px 25px -5px rgba(0,0,0,0.7);
  transform-style: preserve-3d;
  display: flex; flex-direction: column;
}
.alens-cinematic .hw-btn {
  position: absolute;
  background: linear-gradient(90deg, #404040 0%, #171717 100%);
  box-shadow: -2px 0 5px rgba(0,0,0,0.8), inset -1px 0 1px rgba(255,255,255,0.15), inset 1px 0 2px rgba(0,0,0,0.8);
  border-left: 1px solid rgba(255,255,255,0.05);
}
.alens-cinematic .device-screen {
  position: absolute; inset: 7px;
  background: #050410;
  border-radius: 42px;
  overflow: hidden;
  box-shadow: inset 0 0 15px rgba(0,0,0,1);
  color: #fff;
  z-index: 10;
}
.alens-cinematic .screen-glare {
  position: absolute; inset: 0;
  z-index: 40; pointer-events: none;
  background: linear-gradient(110deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 45%);
}
.alens-cinematic .notch {
  position: absolute; top: 6px; left: 50%;
  transform: translateX(-50%);
  width: 110px; height: 30px;
  background: #000;
  border-radius: 999px;
  z-index: 50;
  display: flex; align-items: center; justify-content: flex-end;
  padding-right: 12px;
  box-shadow: inset 0 -1px 2px rgba(255,255,255,0.10);
}
.alens-cinematic .notch-dot {
  width: 7px; height: 7px;
  border-radius: 999px;
  background: #F4C76B;
  box-shadow: 0 0 10px rgba(244,199,107,0.90);
  animation: alens-pulse 1.6s ease-in-out infinite;
}
@keyframes alens-pulse {
  0%,100% { opacity: 0.4; transform: scale(1); }
  50%     { opacity: 1;   transform: scale(1.15); }
}

.alens-cinematic .app {
  position: relative;
  width: 100%; height: 100%;
  padding: 52px 20px 32px;
  display: flex; flex-direction: column;
}
.alens-cinematic .app-head {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 28px;
}
.alens-cinematic .app-head .h-small {
  font-size: 10px; color: #A1A1AA;
  text-transform: uppercase; letter-spacing: 2.4px;
  font-weight: 700; margin-bottom: 4px;
}
.alens-cinematic .app-head .h-large {
  font-size: 20px; font-weight: 800;
  letter-spacing: -0.01em; color: #fff;
}
.alens-cinematic .app-head .avatar {
  width: 36px; height: 36px;
  border-radius: 999px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.10);
  display: flex; align-items: center; justify-content: center;
  color: #DDD; font-weight: 700; font-size: 13px;
  box-shadow: 0 8px 16px rgba(0,0,0,0.5);
}

.alens-cinematic .progress-wrap {
  position: relative;
  width: 180px; height: 180px;
  margin: 0 auto 32px;
  display: flex; align-items: center; justify-content: center;
  filter: drop-shadow(0 15px 25px rgba(0,0,0,0.8));
}
.alens-cinematic .progress-ring {
  transform: rotate(-90deg);
  transform-origin: center;
  stroke-dasharray: 402;
  stroke-dashoffset: 402;
  stroke-linecap: round;
}
.alens-cinematic .progress-text {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  z-index: 10;
}
.alens-cinematic .counter-val {
  font-size: 44px; font-weight: 900;
  letter-spacing: -0.04em;
  color: #fff;
}
.alens-cinematic .counter-label {
  font-size: 9px; color: rgba(251,227,162,0.7);
  text-transform: uppercase; letter-spacing: 2px;
  font-weight: 800; margin-top: 4px;
}

.alens-cinematic .widget {
  background: linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%);
  border-radius: 18px;
  padding: 12px;
  display: flex; align-items: center; gap: 10px;
  border: 1px solid rgba(255,255,255,0.04);
  box-shadow:
    0 10px 20px rgba(0,0,0,0.3),
    inset 0 1px 1px rgba(255,255,255,0.05),
    inset 0 -1px 1px rgba(0,0,0,0.5);
  margin-bottom: 12px;
}
.alens-cinematic .widget-icon {
  width: 40px; height: 40px;
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px;
}
.alens-cinematic .widget-icon.gold {
  background: linear-gradient(135deg, rgba(244,199,107,0.22), rgba(244,199,107,0.06));
  border: 1px solid rgba(244,199,107,0.25);
}
.alens-cinematic .widget-icon.violet {
  background: linear-gradient(135deg, rgba(155,108,255,0.22), rgba(155,108,255,0.06));
  border: 1px solid rgba(155,108,255,0.25);
}
.alens-cinematic .widget-bars { flex: 1; }
.alens-cinematic .widget-bar {
  height: 8px; background: rgba(220,220,255,0.85);
  border-radius: 999px; margin-bottom: 8px;
  box-shadow: inset 0 1px 1px rgba(0,0,0,0.2);
}
.alens-cinematic .widget-bar.short { width: 56px; }
.alens-cinematic .widget-bar.med   { width: 88px; height: 6px; background: rgba(120,120,140,0.75); }
.alens-cinematic .widget-bar.long  { width: 108px; }
.alens-cinematic .home-bar {
  position: absolute; bottom: 8px; left: 50%;
  transform: translateX(-50%);
  width: 132px; height: 5px;
  background: rgba(255,255,255,0.25);
  border-radius: 999px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.5);
}

/* ── Floating badges ─────────────────────────────────────────────── */
.alens-cinematic .badge {
  position: absolute;
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.01) 100%);
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.10),
    0 25px 50px -12px rgba(0,0,0,0.80),
    inset 0 1px 1px rgba(255,255,255,0.20),
    inset 0 -1px 1px rgba(0,0,0,0.50);
  z-index: 30;
}
.alens-cinematic .badge.top    { top: 12px; left: -16px; }
.alens-cinematic .badge.bottom { bottom: 20px; right: -16px; }
@media (min-width: 1024px) {
  .alens-cinematic .badge.top    { top: 48px; left: -84px; }
  .alens-cinematic .badge.bottom { bottom: 80px; right: -84px; }
}
.alens-cinematic .badge-icon {
  width: 40px; height: 40px;
  border-radius: 999px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px;
  background: linear-gradient(180deg, rgba(244,199,107,0.20), rgba(244,199,107,0.04));
  border: 1px solid rgba(244,199,107,0.30);
  box-shadow: inset 0 1px 1px rgba(255,255,255,0.10);
}
.alens-cinematic .badge.bottom .badge-icon {
  background: linear-gradient(180deg, rgba(155,108,255,0.22), rgba(155,108,255,0.05));
  border-color: rgba(155,108,255,0.30);
}
.alens-cinematic .badge-text p {
  margin: 0;
  color: #fff; font-size: 13px; font-weight: 700;
  letter-spacing: -0.01em;
}
.alens-cinematic .badge-text span {
  display: block;
  color: rgba(220,210,255,0.55);
  font-size: 11px; font-weight: 500;
  margin-top: 2px;
}
`;

interface Props {
  /** Replace the inner block (mockup, badges) at run-time? Currently fixed. */
  enabled?: boolean;
}

export function CinematicHomeWeb({ enabled = true }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mainCardRef = useRef<HTMLDivElement | null>(null);
  const mockupRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number>(0);

  // ── Mouse-driven mockup tilt + card sheen ───────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    let gsap: any = null;
    let cleanup: Array<() => void> = [];

    (async () => {
      try {
        const mod: any = await import('gsap');
        gsap = mod.gsap ?? mod.default ?? mod;
      } catch { return; }

      const onMouseMove = (e: MouseEvent) => {
        if (window.scrollY > window.innerHeight * 2) return;
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          if (mainCardRef.current && mockupRef.current) {
            const r = mainCardRef.current.getBoundingClientRect();
            mainCardRef.current.style.setProperty('--mouse-x', `${e.clientX - r.left}px`);
            mainCardRef.current.style.setProperty('--mouse-y', `${e.clientY - r.top}px`);
            const xv = (e.clientX / window.innerWidth  - 0.5) * 2;
            const yv = (e.clientY / window.innerHeight - 0.5) * 2;
            gsap.to(mockupRef.current, {
              rotationY: xv * 10,
              rotationX: -yv * 10,
              ease: 'power3.out',
              duration: 1.2,
            });
          }
        });
      };
      window.addEventListener('mousemove', onMouseMove);
      cleanup.push(() => window.removeEventListener('mousemove', onMouseMove));
    })();

    return () => {
      cleanup.forEach((fn) => fn());
      cancelAnimationFrame(rafRef.current);
    };
  }, [enabled]);

  // ── Scroll-pinned cinematic timeline ────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    let revert: (() => void) | null = null;

    (async () => {
      try {
        const gsapMod: any = await import('gsap');
        const stMod: any = await import('gsap/ScrollTrigger');
        const gsap = gsapMod.gsap ?? gsapMod.default ?? gsapMod;
        const ScrollTrigger = stMod.ScrollTrigger ?? stMod.default ?? stMod;
        gsap.registerPlugin(ScrollTrigger);

        const isMobile = window.innerWidth < 768;

        const ctx = gsap.context(() => {
          // initial states
          gsap.set('.text-track', { autoAlpha: 0, y: 60, scale: 0.85, filter: 'blur(20px)', rotationX: -20 });
          gsap.set('.text-days',  { autoAlpha: 1, clipPath: 'inset(0 100% 0 0)' });
          gsap.set('.eyebrow',    { autoAlpha: 0, y: 14 });
          gsap.set('.main-card',  { y: window.innerHeight + 200, autoAlpha: 1 });
          gsap.set(['.card-left-text', '.card-right-text', '.mockup-wrap', '.badge', '.widget'], { autoAlpha: 0 });
          gsap.set('.cta-wrap', { autoAlpha: 0, scale: 0.8, filter: 'blur(30px)' });

          const intro = gsap.timeline({ delay: 0.2 });
          intro
            .to('.eyebrow', { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out' })
            .to('.text-track', { duration: 1.6, autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', rotationX: 0, ease: 'expo.out' }, '-=0.35')
            .to('.text-days', { duration: 1.2, clipPath: 'inset(0 0% 0 0)', ease: 'power4.inOut' }, '-=0.95');

          const scroll = gsap.timeline({
            scrollTrigger: {
              trigger: containerRef.current,
              start: 'top top',
              end: '+=6000',
              pin: true,
              scrub: 1,
              anticipatePin: 1,
            },
          });

          scroll
            .to(['.hero-wrap', '.grid-mask'], { scale: 1.15, filter: 'blur(20px)', opacity: 0.2, ease: 'power2.inOut', duration: 2 }, 0)
            .to('.main-card', { y: 0, ease: 'power3.inOut', duration: 2 }, 0)
            .to('.main-card', { width: '100%', height: '100%', borderRadius: '0px', ease: 'power3.inOut', duration: 1.5 })
            .fromTo('.mockup-wrap',
              { y: 300, z: -500, rotationX: 50, rotationY: -30, autoAlpha: 0, scale: 0.6 },
              { y: 0, z: 0, rotationX: 0, rotationY: 0, autoAlpha: 1, scale: 1, ease: 'expo.out', duration: 2.4 }, '-=0.8'
            )
            .fromTo('.widget', { y: 40, autoAlpha: 0, scale: 0.94 }, { y: 0, autoAlpha: 1, scale: 1, stagger: 0.14, ease: 'back.out(1.2)', duration: 1.3 }, '-=1.6')
            .to('.progress-ring', { strokeDashoffset: 100, duration: 1.8, ease: 'power3.inOut' }, '-=1.2')
            .to('.counter-val', { innerHTML: 76, snap: { innerHTML: 1 }, duration: 1.6, ease: 'expo.out' }, '-=1.8')
            .fromTo('.badge', { y: 100, autoAlpha: 0, scale: 0.7, rotationZ: -10 }, { y: 0, autoAlpha: 1, scale: 1, rotationZ: 0, ease: 'back.out(1.5)', duration: 1.4, stagger: 0.2 }, '-=1.6')
            .fromTo('.card-left-text',  { x: -50, autoAlpha: 0 }, { x: 0, autoAlpha: 1, ease: 'power4.out', duration: 1.3 }, '-=1.4')
            .fromTo('.card-right-text', { x: 50, autoAlpha: 0, scale: 0.85 }, { x: 0, autoAlpha: 1, scale: 1, ease: 'expo.out', duration: 1.3 }, '<')
            .to({}, { duration: 2.5 })
            .set('.hero-wrap', { autoAlpha: 0 })
            .set('.cta-wrap',  { autoAlpha: 1 })
            .to({}, { duration: 1.5 })
            .to(['.mockup-wrap', '.badge', '.card-left-text', '.card-right-text'], {
              scale: 0.9, y: -40, z: -200, autoAlpha: 0, ease: 'power3.in', duration: 1.0, stagger: 0.05,
            })
            .to('.main-card', {
              width: isMobile ? '92vw' : '85vw',
              height: isMobile ? '92vh' : '85vh',
              borderRadius: isMobile ? '32px' : '40px',
              ease: 'expo.inOut', duration: 1.6,
            }, 'pull')
            .to('.cta-wrap', { scale: 1, filter: 'blur(0px)', ease: 'expo.inOut', duration: 1.6 }, 'pull')
            .to('.main-card', { y: -window.innerHeight - 300, ease: 'power3.in', duration: 1.3 });
        }, containerRef);

        revert = () => ctx.revert();
      } catch (err) {
        // GSAP/ScrollTrigger failed — fail-safe: reveal everything statically.
        if (containerRef.current) {
          containerRef.current.querySelectorAll<HTMLElement>('.reveal').forEach((el) => {
            el.style.visibility = 'visible';
            el.style.opacity = '1';
          });
        }
      }
    })();

    return () => { if (revert) revert(); };
  }, [enabled]);

  return (
    <div ref={containerRef} className="alens-cinematic">
      <style dangerouslySetInnerHTML={{ __html: INJECTED_STYLES }} />
      <div className="film-grain" aria-hidden />
      <div className="grid-mask" aria-hidden />

      {/* Hero text */}
      <div className="hero-wrap">
        <div className="eyebrow reveal">SYMBOLIC AURA REFLECTION</div>
        <h1 className="text-track reveal h1-track">Read your aura,</h1>
        <h1 className="text-days reveal h1-days">not just your face.</h1>
      </div>

      {/* Final CTA layer */}
      <div className="cta-wrap reveal">
        <h2>Begin your reading.</h2>
        <p>One private symbolic face reading. A grounded reflection of your visual energy profile in seconds.</p>
        <div className="cta-row">
          <button className="btn-tactile btn-gold" onClick={() => router.push('/scan')} aria-label="Begin My Reading">
            <div style={{ textAlign: 'left' }}>
              <div className="btn-label-small">Start a free</div>
              <div className="btn-label-large">Aura Reading</div>
            </div>
          </button>
          <button className="btn-tactile btn-dark" onClick={() => router.push('/pricing')} aria-label="See Pricing">
            <div style={{ textAlign: 'left' }}>
              <div className="btn-label-small">Unlock</div>
              <div className="btn-label-large">Monthly Access</div>
            </div>
          </button>
        </div>
      </div>

      {/* Card stage */}
      <div className="card-stage">
        <div ref={mainCardRef} className="main-card reveal">
          <div className="card-sheen" aria-hidden />
          <div className="card-inner">

            {/* RIGHT (desktop) / TOP (mobile): Brand */}
            <div className="card-right-text reveal">
              <h2>AURALENS</h2>
            </div>

            {/* CENTRE: aura-scan device mockup */}
            <div className="mockup-wrap reveal">
              <div className="mockup-scale">
                <div ref={mockupRef} className="device">
                  <div className="hw-btn" style={{ top: 120, left: -3, width: 3, height: 25, borderRadius: '4px 0 0 4px' }} />
                  <div className="hw-btn" style={{ top: 160, left: -3, width: 3, height: 45, borderRadius: '4px 0 0 4px' }} />
                  <div className="hw-btn" style={{ top: 220, left: -3, width: 3, height: 45, borderRadius: '4px 0 0 4px' }} />
                  <div className="hw-btn" style={{ top: 170, right: -3, width: 3, height: 70, borderRadius: '0 4px 4px 0', transform: 'scaleX(-1)' }} />
                  <div className="device-screen">
                    <div className="screen-glare" aria-hidden />
                    <div className="notch"><div className="notch-dot" /></div>
                    <div className="app">
                      <div className="app-head widget">
                        <div>
                          <div className="h-small">TODAY</div>
                          <div className="h-large">Your Aura</div>
                        </div>
                        <div className="avatar">AL</div>
                      </div>
                      <div className="progress-wrap widget">
                        <svg width="180" height="180" aria-hidden>
                          <circle cx="90" cy="90" r="64" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="12" />
                          <circle className="progress-ring" cx="90" cy="90" r="64" fill="none" stroke="#F4C76B" strokeWidth="12" />
                        </svg>
                        <div className="progress-text">
                          <span className="counter-val">0</span>
                          <span className="counter-label">Aura Score</span>
                        </div>
                      </div>
                      <div className="widget">
                        <div className="widget-icon gold">✦</div>
                        <div className="widget-bars">
                          <div className="widget-bar short" />
                          <div className="widget-bar med" />
                        </div>
                      </div>
                      <div className="widget">
                        <div className="widget-icon violet">◐</div>
                        <div className="widget-bars">
                          <div className="widget-bar long" />
                          <div className="widget-bar med" />
                        </div>
                      </div>
                      <div className="home-bar" />
                    </div>
                  </div>
                </div>

                <div className="badge top reveal">
                  <div className="badge-icon">✦</div>
                  <div className="badge-text">
                    <p>Reading saved</p>
                    <span>Mien Shiang aligned</span>
                  </div>
                </div>
                <div className="badge bottom reveal">
                  <div className="badge-icon">◑</div>
                  <div className="badge-text">
                    <p>Aura signal</p>
                    <span>Violet · Gold accent</span>
                  </div>
                </div>
              </div>
            </div>

            {/* LEFT (desktop) / BOTTOM (mobile): description */}
            <div className="card-left-text reveal">
              <h3>Reading, refined.</h3>
              <p>
                <strong style={{ color: '#fff', fontWeight: 700 }}>AuraLens</strong> turns the symbolic Mien Shiang
                tradition into a private, beautiful aura-style face reading. Built on a deterministic engine.
                Zero photo upload by default.
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
