// AuraLens landing — Relume-PATTERN sections.
//
// Not literal @relume_io/relume-ui (incompatible with Expo React Native +
// react-native-web). Instead, applies Relume's STRUCTURE principles —
// proper section padding, max-width containers, responsive grid, clean
// hierarchy, mobile stacking — using our existing CSS-injection pattern.
//
// Sits BELOW the existing hero. Inherits the WebGL shader background and
// the liquid-glass button system already on every PremiumButton call.
//
// Sections:
//   - How It Works  (3 steps)
//   - Features      (4 cards)
//   - PricingTeaser (single CTA card)
//   - FAQ           (4 collapsible items, all open in the rendered state)
//   - Footer

import { useEffect } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';

const SECTIONS_CSS = `
.al-section {
  position: relative;
  width: 100%;
  padding: clamp(64px, 8vw, 120px) clamp(20px, 4vw, 48px);
  z-index: 2;
  /* Subtle banding so each section reads as its own surface even though
     the shader runs underneath everything. */
}
.al-section--soft {
  background: linear-gradient(180deg, rgba(8,8,14,0.0) 0%, rgba(8,8,14,0.32) 50%, rgba(8,8,14,0.0) 100%);
}
.al-section__inner {
  max-width: 1200px;
  margin: 0 auto;
}

/* Headings & copy ---------------------------------------------------------- */
.al-eyebrow {
  color: #F4C76B;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 3.2px;
  text-transform: uppercase;
  margin: 0 0 16px;
}
.al-h2 {
  color: #F7F3EA;
  font-family: 'Inter', system-ui, sans-serif;
  font-weight: 800;
  font-size: clamp(32px, 4.5vw, 56px);
  line-height: 1.04;
  letter-spacing: -0.04em;
  margin: 0 0 16px;
  max-width: 760px;
}
.al-lede {
  color: rgba(247, 243, 234, 0.62);
  font-family: 'Inter', system-ui, sans-serif;
  font-weight: 400;
  font-size: clamp(15px, 1.4vw, 19px);
  line-height: 1.55;
  margin: 0 0 48px;
  max-width: 620px;
}

/* How It Works ------------------------------------------------------------- */
.al-steps {
  display: grid;
  gap: 24px;
  grid-template-columns: 1fr;
}
@media (min-width: 880px) {
  .al-steps { grid-template-columns: repeat(3, 1fr); gap: 32px; }
}
.al-step {
  position: relative;
  padding: 32px 28px;
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.015) 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  box-shadow:
    0 24px 48px -12px rgba(0,0,0,0.45),
    inset 0 1px 1px rgba(255,255,255,0.08);
}
.al-step__num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px; height: 40px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(244,199,107,0.20), rgba(244,199,107,0.05));
  border: 1px solid rgba(244,199,107,0.40);
  color: #FBE3A2;
  font-family: 'Inter', system-ui, sans-serif;
  font-weight: 700; font-size: 14px;
  margin-bottom: 18px;
}
.al-step__title {
  color: #F7F3EA;
  font-family: 'Inter', system-ui, sans-serif;
  font-weight: 700;
  font-size: 19px;
  letter-spacing: -0.01em;
  margin: 0 0 10px;
}
.al-step__body {
  color: rgba(247, 243, 234, 0.62);
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.55;
  margin: 0;
}

/* Features grid ------------------------------------------------------------ */
.al-features {
  display: grid;
  gap: 20px;
  grid-template-columns: 1fr;
}
@media (min-width: 720px) {
  .al-features { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 1080px) {
  .al-features { grid-template-columns: repeat(2, 1fr); gap: 28px; }
}
.al-feature {
  position: relative;
  padding: 28px;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(16px) saturate(140%);
  -webkit-backdrop-filter: blur(16px) saturate(140%);
  box-shadow: 0 18px 36px -12px rgba(0,0,0,0.4);
  transition: transform 240ms ease, border-color 240ms ease;
}
.al-feature:hover {
  transform: translateY(-2px);
  border-color: rgba(244,199,107,0.25);
}
.al-feature__glyph {
  width: 44px; height: 44px;
  border-radius: 14px;
  display: inline-flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, rgba(155,108,255,0.22), rgba(155,108,255,0.04));
  border: 1px solid rgba(155,108,255,0.28);
  color: #DCC9FF; font-size: 20px;
  margin-bottom: 16px;
}
.al-feature--gold .al-feature__glyph {
  background: linear-gradient(135deg, rgba(244,199,107,0.22), rgba(244,199,107,0.04));
  border-color: rgba(244,199,107,0.30);
  color: #FBE3A2;
}
.al-feature__title {
  color: #F7F3EA;
  font-family: 'Inter', system-ui, sans-serif;
  font-weight: 700; font-size: 18px;
  letter-spacing: -0.01em;
  margin: 0 0 8px;
}
.al-feature__body {
  color: rgba(247, 243, 234, 0.62);
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 14px; line-height: 1.55;
  margin: 0;
}

/* Pricing teaser ----------------------------------------------------------- */
.al-pricing {
  position: relative;
  padding: clamp(40px, 5vw, 64px);
  border-radius: 32px;
  background:
    radial-gradient(at 100% 0%, rgba(155,108,255,0.18) 0%, transparent 50%),
    radial-gradient(at 0% 100%, rgba(244,199,107,0.16) 0%, transparent 50%),
    linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 100%);
  border: 1px solid rgba(244,199,107,0.20);
  box-shadow:
    0 40px 80px -20px rgba(0,0,0,0.55),
    inset 0 1px 1px rgba(255,255,255,0.10);
  display: flex; flex-direction: column;
  align-items: flex-start; gap: 16px;
}
@media (min-width: 880px) {
  .al-pricing {
    flex-direction: row; align-items: center;
    justify-content: space-between; gap: 40px;
  }
}
.al-pricing__copy { flex: 1; min-width: 0; }
.al-pricing__title {
  color: #F7F3EA;
  font-family: 'Inter', system-ui, sans-serif;
  font-weight: 800;
  font-size: clamp(28px, 3.2vw, 40px);
  letter-spacing: -0.025em;
  margin: 0 0 8px;
}
.al-pricing__sub {
  color: rgba(247, 243, 234, 0.62);
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 15px; line-height: 1.55;
  margin: 0; max-width: 480px;
}
.al-pricing__price {
  color: #FBE3A2;
  font-family: 'Inter', system-ui, sans-serif;
  font-weight: 800;
  font-size: clamp(36px, 4vw, 56px);
  letter-spacing: -0.02em;
  margin: 0 0 4px;
}
.al-pricing__pricelabel {
  color: rgba(247, 243, 234, 0.45);
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 12px;
  letter-spacing: 2px; text-transform: uppercase;
  margin: 0 0 18px;
}

/* FAQ ---------------------------------------------------------------------- */
.al-faq { display: grid; gap: 12px; max-width: 820px; }
.al-faq__item {
  border-radius: 18px;
  padding: 22px 26px;
  background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
  border: 1px solid rgba(255,255,255,0.06);
  backdrop-filter: blur(14px) saturate(135%);
  -webkit-backdrop-filter: blur(14px) saturate(135%);
}
.al-faq__q {
  color: #F7F3EA;
  font-family: 'Inter', system-ui, sans-serif;
  font-weight: 600; font-size: 16px;
  letter-spacing: -0.005em;
  margin: 0 0 8px;
}
.al-faq__a {
  color: rgba(247, 243, 234, 0.62);
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 14px; line-height: 1.55;
  margin: 0;
}

/* Footer ------------------------------------------------------------------- */
.al-footer {
  padding: 48px clamp(20px, 4vw, 48px) 36px;
  border-top: 1px solid rgba(255,255,255,0.06);
  margin-top: 64px;
}
.al-footer__inner {
  max-width: 1200px; margin: 0 auto;
  display: flex; flex-direction: column;
  gap: 18px; align-items: flex-start;
}
@media (min-width: 720px) {
  .al-footer__inner { flex-direction: row; align-items: center; justify-content: space-between; }
}
.al-footer__brand {
  color: rgba(247,243,234,0.95);
  font-family: 'Inter', system-ui, sans-serif;
  font-weight: 700; font-size: 13px;
  letter-spacing: 3.6px;
}
.al-footer__brand small {
  color: rgba(247,243,234,0.40);
  font-weight: 400; font-size: 11px;
  letter-spacing: 1.6px; margin-left: 8px;
}
.al-footer__nav { display: flex; gap: 24px; flex-wrap: wrap; }
.al-footer__nav a {
  color: rgba(247,243,234,0.55);
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 11px; letter-spacing: 1.6px;
  text-transform: uppercase;
  text-decoration: none; cursor: pointer;
  transition: color 200ms ease;
}
.al-footer__nav a:hover { color: #F4C76B; }
.al-footer__legal {
  color: rgba(247,243,234,0.32);
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 11px; line-height: 1.55;
  margin: 16px 0 0;
}
`;

let _cssInjected = false;
function ensureCss(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (_cssInjected || document.getElementById('al-sections-css')) return;
  const s = document.createElement('style');
  s.id = 'al-sections-css';
  s.textContent = SECTIONS_CSS;
  document.head.appendChild(s);
  _cssInjected = true;
}

// ─── How It Works ───────────────────────────────────────────────────────────

const STEPS = [
  {
    n: '01',
    title: 'Frame or upload',
    body: 'Use your camera or pick three portraits — front, soft natural light. We process locally first.',
  },
  {
    n: '02',
    title: 'Engine reads your zones',
    body: 'A symbolic Mien Shiang-inspired engine scores forehead, eyes, cheeks, mouth and chin in seconds.',
  },
  {
    n: '03',
    title: 'Your visual energy profile',
    body: 'You get an aura tier, dominant + secondary colour signature, and grounded reflection guidance.',
  },
];

function HowItWorks() {
  return (
    <section className="al-section al-section--soft">
      <div className="al-section__inner">
        <p className="al-eyebrow">HOW IT WORKS</p>
        <h2 className="al-h2">A reading in three quiet steps.</h2>
        <p className="al-lede">
          A private symbolic process. Nothing is uploaded by default.
          The engine is deterministic — the same image always returns the same reading.
        </p>
        <div className="al-steps">
          {STEPS.map((s) => (
            <div key={s.n} className="al-step">
              <span className="al-step__num">{s.n}</span>
              <h3 className="al-step__title">{s.title}</h3>
              <p className="al-step__body">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Features ───────────────────────────────────────────────────────────────

const FEATURES = [
  { glyph: '✦', gold: true,  title: 'Symbolic face reading', body: 'Six aura tiers — Clear, Rising, Mixed, Shielded, Clouded, Heavy — drawn from facial zone scoring.' },
  { glyph: '◐', gold: false, title: 'Visual energy profile', body: 'Dominant + secondary colour signature, elemental balance, and a confidence weighting per reading.' },
  { glyph: '◯', gold: true,  title: 'Private by default', body: 'Camera and photos are processed locally first. Cloud sync is opt-in, photo upload is double opt-in.' },
  { glyph: '⟡', gold: false, title: 'Timeline of readings', body: 'Quietly track how your aura shifts across chapters of your life. Compare side-by-side, anytime.' },
];

function Features() {
  return (
    <section className="al-section">
      <div className="al-section__inner">
        <p className="al-eyebrow">WHAT YOU GET</p>
        <h2 className="al-h2">Aura insight, refined for daily reflection.</h2>
        <p className="al-lede">
          Built on a deterministic symbolic engine. No medical claims, no health predictions —
          a calm, grounded mirror you can return to.
        </p>
        <div className="al-features">
          {FEATURES.map((f) => (
            <div key={f.title} className={`al-feature ${f.gold ? 'al-feature--gold' : ''}`}>
              <span className="al-feature__glyph">{f.glyph}</span>
              <h3 className="al-feature__title">{f.title}</h3>
              <p className="al-feature__body">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Pricing teaser ────────────────────────────────────────────────────────

function PricingTeaser() {
  return (
    <section className="al-section al-section--soft">
      <div className="al-section__inner">
        <div className="al-pricing">
          <div className="al-pricing__copy">
            <p className="al-eyebrow">UNLOCK MORE</p>
            <h3 className="al-pricing__title">Unlimited readings, your full aura timeline.</h3>
            <p className="al-pricing__sub">
              One reading is free on first visit. Unlock unlimited symbolic readings,
              the aura timeline, side-by-side comparison and the AI Aura Buddy with monthly access.
            </p>
          </div>
          <div>
            <p className="al-pricing__price">£7.99<span style={{ fontSize: '0.45em', opacity: 0.55 }}>/mo</span></p>
            <p className="al-pricing__pricelabel">Or £1.99 one-off</p>
            <button
              className="auralens-liquid auralens-liquid--gold"
              onClick={() => router.push('/pricing')}
              aria-label="See pricing"
            >
              <span className="auralens-liquid__face">
                <span className="auralens-liquid__glyph" aria-hidden>✦</span>
                <span className="auralens-liquid__label">See Pricing</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ───────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'Is this a medical or diagnostic tool?',
    a: 'No. AuraLens is for reflection and wellbeing only. It does not diagnose, predict health, or replace professional advice.',
  },
  {
    q: 'How does the reading actually work?',
    a: 'A deterministic engine scores facial zones using Mien Shiang-inspired symbolism, then maps the result to a symbolic aura tier with colour and elemental signature.',
  },
  {
    q: 'What happens to my photos?',
    a: 'By default, nothing leaves your device. The reading is computed locally. Cloud sync is opt-in. Photo upload is double opt-in and signed-URL only.',
  },
  {
    q: 'Will the same photo give the same reading?',
    a: 'Yes. The engine is deterministic by design — the same image always returns the same aura tier, colour and zone scores. That stability is the point.',
  },
];

function FAQ() {
  return (
    <section className="al-section">
      <div className="al-section__inner">
        <p className="al-eyebrow">CALM ANSWERS</p>
        <h2 className="al-h2">Questions, gently answered.</h2>
        <div className="al-faq">
          {FAQS.map((f) => (
            <div key={f.q} className="al-faq__item">
              <p className="al-faq__q">{f.q}</p>
              <p className="al-faq__a">{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Footer ────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="al-footer">
      <div className="al-footer__inner">
        <div className="al-footer__brand">
          AURALENS<small>by Vybstak</small>
        </div>
        <nav className="al-footer__nav" aria-label="Footer">
          <a onClick={() => router.push('/pricing')}>Pricing</a>
          <a onClick={() => router.push('/technology')}>Technology</a>
          <a onClick={() => router.push('/auth')}>Sign In</a>
          <a onClick={() => router.push('/settings')}>Settings</a>
          <a onClick={() => router.push('/privacy')}>Privacy</a>
        </nav>
      </div>
      <p className="al-footer__legal" style={{ maxWidth: 1200, margin: '24px auto 0' }}>
        For reflection and wellbeing only. Not medical, psychological, or diagnostic advice.
        © {new Date().getFullYear()} Vybstak.
      </p>
    </footer>
  );
}

// ─── Exported composite ────────────────────────────────────────────────────

export function AuralensLandingSections() {
  useEffect(() => { ensureCss(); }, []);
  if (Platform.OS !== 'web') return null;
  return (
    <>
      <HowItWorks />
      <Features />
      <PricingTeaser />
      <FAQ />
      <Footer />
    </>
  );
}
