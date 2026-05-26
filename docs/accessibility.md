# Accessibility

AuraLens treats VoiceOver / TalkBack as a first-class navigation surface. This document records what we've done and what we haven't yet.

## Done

### Interactive primitives
- [`PremiumButton`](../components/PremiumButton.tsx) — every variant declares `accessibilityRole="button"` (override-able), exposes `accessibilityState.disabled`, accepts `accessibilityLabel`/`accessibilityHint`/`testID` overrides, strips ornamental glyphs (e.g. `← Back` → spoken as *"Back"*), 44pt minimum hit target, `maxFontSizeMultiplier` cap so dynamic-type does not overflow the pill.
- **Timeline rows** announce as *"Rising Aura, score 74 out of 100, 25 May 2026. Double tap to open this reading."*
- **Upload slots** announce as *"Front-facing, soft light photo. Double tap to pick a photo."* and toggle `accessibilityState.selected` when a photo is chosen.
- **Compare picker chips** announce option + selected state + disabled state.
- **Buddy "See pricing"** error action carries label + hint.

### Text inputs
- Auth email input: `accessibilityLabel="Email address"`, `textContentType="emailAddress"`, `autoComplete="email"`.
- Auth password input: `accessibilityLabel="Password"`, `textContentType="password"`, `autoComplete="password"`, `secureTextEntry`.
- Buddy composer: `accessibilityLabel="Message to Aura Buddy"`, hint *"Type your message and tap Send"*.

### Decorative visuals
The aura orb and particle field are pure brand surfaces; they don't carry meaning. They are explicitly hidden:
- `<AuraOrb>` → `accessible={false}` + `importantForAccessibility="no-hide-descendants"`.
- `<ParticleField>` → same.

Screen readers skip them entirely instead of announcing dozens of view nodes.

### Live regions for dynamic state
- Processing status text uses `accessibilityLiveRegion="polite"` and announces *"Reading facial harmony… Step 1 of 4"* as each stage advances.
- Buddy typing indicator announces *"Aura Buddy is composing a reply"* when an LLM call is in flight.
- Timeline sync status announces the last sync result.

### Dynamic type
Every interactive label uses `maxFontSizeMultiplier` (1.3 for buttons, 1.4–1.5 for body / inputs) so the UI degrades gracefully at the largest OS sizes without breaking pill buttons or input rows.

### Hit targets
All `PremiumButton` variants set `minHeight: 44` and a small `hitSlop`. This matches Apple HIG and Google's Material accessibility guidance.

### Bitmap font in store screenshots
The generated store-screenshot text uses uppercase + clear letter-spacing (5×7 bitmap font scaled 10×). For real on-device screenshots, the production system font (SF Pro / Roboto) is used.

## What's still pending (not blocking submission)

- **Colour contrast audit** with WCAG AAA target on the gold-on-obsidian and violet-on-obsidian combinations. Initial check at AA passes; AAA target is aspirational.
- **Reduced motion**: respect `AccessibilityInfo.isReduceMotionEnabled()` to dampen the aura orb drift + particle field animations.
- **Reduced transparency**: detect and swap glass cards for opaque equivalents when iOS *Reduce Transparency* is on.
- **Custom actions** on the Aura Buddy bubble (long-press → *"Copy reply"*).
- **Keyboard handling** on Android — confirm composer doesn't get covered by the IME at every screen size.
- **VoiceOver order audit** — currently relies on document order; an audit on each screen would confirm the announcement sequence is sensible.

## Testing

Static a11y assertions live in [`components/__tests__/accessibility.test.ts`](../components/__tests__/accessibility.test.ts). They read the source rather than mounting components, so they run inside the existing jest-expo setup without extra deps. They guard the props above against regressions.

For a runtime audit on a real device:

### iOS
1. Settings → Accessibility → VoiceOver → on
2. Open AuraLens
3. Swipe right to walk every focusable element
4. Confirm every button announces a meaningful label and role
5. Confirm decorative orbs/particles are skipped
6. Open Aura Buddy, send a message — confirm the typing indicator announces
7. Settings → Accessibility → Display & Text Size → Larger Text → max — confirm no overflow

### Android
1. Settings → Accessibility → TalkBack → on
2. Same walkthrough
3. Settings → Display → Font size → Largest — confirm no overflow

If anything regresses, the `accessibility.test.ts` suite catches the most common offenders before the build leaves your machine.
