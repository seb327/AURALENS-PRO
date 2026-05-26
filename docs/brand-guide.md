# AuraLens brand guide

> Premium spiritual technology. Calm, grounded, cinematic.
> *Ancient face reading, rebuilt for the AI age.*

## Visual direction

AuraLens looks like a piece of quiet technology that happens to be spiritual — not a horoscope app, not a medical scanner, not a chatbot. Every surface is dark, layered, and lit from within.

- **Atmosphere**: deep obsidian, slow drift, breath-rate motion
- **Hero element**: a single living aura orb — gold core, violet halo, blue outer ring
- **Surfaces**: frosted glass tiles with hairline gold borders
- **Texture**: a sparse particle field; never confetti
- **Motion**: cinematic and slow (12–18s drift, 4–5s pulse). 60fps where possible
- **Negative space**: lots of it. Premium products earn the right to whitespace.

## Colour system

| Token              | Hex                 | Use                                        |
|--------------------|---------------------|--------------------------------------------|
| Obsidian           | `#050507`           | Primary background                         |
| Obsidian Elevated  | `#0B0B10`           | Subtle gradient mid-tone                   |
| Glass              | `rgba(255,255,255,0.06)` | Default frosted card body              |
| Glass Strong       | `rgba(255,255,255,0.10)` | Pricing / hero card body               |
| Hairline           | `rgba(255,255,255,0.10)` | 1px borders                            |
| Soft White         | `#F7F3EA`           | Primary text                               |
| Mute               | `rgba(247,243,234,0.62)` | Body / secondary text                  |
| Dim                | `rgba(247,243,234,0.38)` | Disclaimers, dev panels                |
| **Aura Gold**      | `#F4C76B` (`#FBE3A2` bright) | Brand accent, ring highlights, CTAs    |
| **Aura Violet**    | `#9B6CFF`           | Orb halo, presence accent                  |
| **Aura Blue**      | `#4DB8FF`           | Outer halo, calm accent                    |
| Aura Green         | `#66E0A3`           | Positive guidance bullets                  |
| Deep Red Accent    | `#C4522A`           | Release guidance bullets, error states     |
| Aura Indigo        | `#5B5BD6`           | Lock screens, monthly-gate accents         |

Defined in [`constants/theme.ts`](../constants/theme.ts). Do not introduce new hues without amending this guide.

## Typography

Headings: **System UI / SF Pro / Roboto** at weight 300 with negative letter-spacing. Premium products lean light, not heavy.

| Role        | Size | Weight | Letter-spacing | Colour       |
|-------------|------|--------|----------------|--------------|
| H1 hero     | 40   | 300    | -0.5           | Soft White   |
| H2 page     | 28   | 300    | 0              | Soft White   |
| H3 section  | 18   | 500    | 0              | Soft White   |
| Eyebrow     | 11   | 600    | +3 (uppercase) | Aura Gold    |
| Body        | 14–16| 400    | 0              | Soft White / Mute |
| Disclaimer  | 11   | 400    | +0.5           | Dim          |

Wordmark in marketing art: `AURALENS` — uppercase, +2 letter-spacing.

## Icon direction

- A single glowing orb composed of three layers: gold core, violet halo, blue outer ring
- A hairline gold ring at roughly 1.05× the orb radius
- Optional secondary ring at 1.32× radius, lower opacity, for icon recognisability at small sizes
- Subtle top-left glint suggesting a glass surface
- No literal eyeball, no medical-scanner aesthetic, no spiritual cliché glyphs, no text inside the icon

The generator in [`scripts/generate-store-placeholders.js`](../scripts/generate-store-placeholders.js) is the source of truth for the current artwork. Final production artwork can replace `assets/icon.png` directly — keep the same composition cues so the splash/icon/screenshots stay coherent.

## Orb rules

- One hero orb per screen.
- Stays roughly central or anchored to a thirds-line — never decorative-only.
- Slow ±12px drift and ±5% scale pulse. Never bouncy.
- Orb colour reflects the user's most recent reading when one exists.

## Glass UI rules

- Two intensities only: `glass` (default) and `glassStrong` (hero / pricing).
- All cards use the same `radius.lg` (28) unless they are full-width pill buttons.
- Hairline border at `rgba(255,255,255,0.10)`. Never a solid border.
- Inner top edge gets a 30-alpha highlight to imply glass thickness.
- Cards never sit on white — only on obsidian or another card.

## Motion

- Hero orb drift: 14s, sine ease
- Hero orb pulse: 4.2s
- Particle field: deterministic seeded layout, lifetime 5–11s per dot
- Page transitions: fade only (set in `_layout.tsx`)
- Haptics: `Light` impact on every primary CTA
- No springs, no bounce, no neon strobing

## Copy tone

- **Calm, direct, premium**. Short sentences. Active voice.
- Mystical without being theatrical.
- Practical without being clinical.

Examples we use:
- *"Your aura is reading as rising with a gold signature."*
- *"Symbolically, this pattern may reflect…"*
- *"A useful practice today would be…"*
- *"This is a reflective interpretation, not a diagnosis."*

Examples we never use:
- ❌ *"Your aura is scientifically measured."*
- ❌ *"This proves your energy is negative."*
- ❌ *"You have anxiety / depression / illness."*
- ❌ *"Your face shows your destiny."*
- ❌ *"100% accurate."*
- ❌ *"This person is dangerous."*

The hero question — *"Do you have a Good Aura or a Bad Aura?"* — is allowed because it is a **question**, framing curiosity. The result page always answers with one of the six symbolic labels: **Clear / Rising / Mixed / Shielded / Clouded / Heavy** — never the literal word *bad*.

## Forbidden visual styles

- ❌ Purple + pink horoscope gradients
- ❌ Cartoon icons or emoji-heavy UI
- ❌ Mock medical dashboards (no waveforms, no vitals, no readouts pretending to be data)
- ❌ Generic AI-tool gradients (blue-pink linear ramps)
- ❌ Low-resolution spiritual stock imagery
- ❌ Lens flares, sparkles, glitter
- ❌ Hand-drawn or "doodle" iconography

## Forbidden marketing claims

- ❌ Scientifically proven aura
- ❌ 100% accurate / absolute accuracy
- ❌ Diagnosis (medical, psychological, or any other)
- ❌ Detects mental illness / depression / anxiety / personality disorder
- ❌ Biometric identity verification
- ❌ Destiny / future prediction
- ❌ Personality certainty
- ❌ Guaranteed result

`npm run verify:release` fails the build if any of these appear in app source.

## App Store-safe positioning examples

- *"AuraLens offers symbolic Mien Shiang-inspired aura reflections for spiritual wellbeing, journalling, and self-awareness."*
- *"For reflection and wellbeing only. Not medical, psychological, or diagnostic advice."*
- *"A calm, grounded reflection in seconds — not a verdict."*
- *"Track your aura across chapters of your life."*

## Six aura labels

| Label          | Score range | Tone                              |
|----------------|-------------|-----------------------------------|
| Clear Aura     | 78–100      | Open, present, unobstructed       |
| Rising Aura    | 62–77       | Forward movement, gaining clarity |
| Mixed Aura     | 48–61       | Both/and — partial guard, partial openness |
| Shielded Aura  | 36–47       | Guarded, conserving, watching     |
| Clouded Aura   | 22–35       | Foggy, noisy, in need of space    |
| Heavy Aura     | 0–21        | Tired, blocked, in need of rest   |

We never label a person — only the moment. The disclaimer is non-negotiable on every result.
