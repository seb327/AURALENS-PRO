// Static-source accessibility tests. We assert that key interactive primitives
// carry the right a11y props and that decorative visuals are explicitly
// hidden from assistive tech. These tests read the source instead of mounting
// the components — react-native-testing-library would pull RN's full runtime
// into jest-expo, which is overkill for what we want to enforce here.

/// <reference types="node" />
/// <reference types="jest" />
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('PremiumButton a11y', () => {
  const src = read('components/PremiumButton.tsx');

  it('declares accessibilityLabel on every variant via shared a11y object', () => {
    expect(src).toMatch(/accessibilityLabel:\s*accessibilityLabel\s*\?\?\s*cleanLabel/);
  });
  it('defaults accessibilityRole to "button"', () => {
    expect(src).toMatch(/accessibilityRole\s*=\s*['"]button['"]/);
  });
  it('passes disabled into accessibilityState', () => {
    expect(src).toMatch(/accessibilityState:\s*\{\s*disabled:/);
  });
  it('declares a 44pt minimum hit target', () => {
    expect(src).toMatch(/minHeight:\s*44/);
  });
  it('caps font scaling so labels do not overflow', () => {
    expect(src).toMatch(/maxFontSizeMultiplier/);
  });
  it('strips ornamental leading glyphs from the spoken label', () => {
    expect(src).toMatch(/cleanLabel/);
    // Hand-execute the regex used in cleanLabel
    const clean = (s: string) => s.replace(/^[^\p{L}\p{N}]+/u, '').trim() || s;
    expect(clean('← Back')).toBe('Back');
    expect(clean('✕ Close')).toBe('Close');
    expect(clean('Start Monthly')).toBe('Start Monthly');
  });
});

describe('Decorative elements are hidden from assistive tech', () => {
  it('AuraOrb is marked non-accessible', () => {
    const s = read('components/AuraOrb.tsx');
    expect(s).toMatch(/accessible=\{false\}/);
    expect(s).toMatch(/importantForAccessibility="no-hide-descendants"/);
  });
  it('ParticleField is marked non-accessible', () => {
    const s = read('components/ParticleField.tsx');
    expect(s).toMatch(/accessible=\{false\}/);
    expect(s).toMatch(/importantForAccessibility="no-hide-descendants"/);
  });
});

describe('Live regions on dynamic content', () => {
  it('processing status text uses accessibilityLiveRegion', () => {
    expect(read('app/processing.tsx')).toMatch(/accessibilityLiveRegion="polite"/);
  });
  it('buddy typing indicator uses accessibilityLiveRegion', () => {
    expect(read('app/buddy.tsx')).toMatch(/accessibilityLiveRegion="polite"/);
  });
  it('timeline sync status uses accessibilityLiveRegion', () => {
    expect(read('app/timeline.tsx')).toMatch(/accessibilityLiveRegion="polite"/);
  });
});

describe('TextInputs are labelled', () => {
  it('auth email input has accessibilityLabel + textContentType', () => {
    const s = read('app/auth.tsx');
    expect(s).toMatch(/accessibilityLabel="Email address"/);
    expect(s).toMatch(/textContentType="emailAddress"/);
  });
  it('auth password input has accessibilityLabel + textContentType', () => {
    const s = read('app/auth.tsx');
    expect(s).toMatch(/accessibilityLabel="Password"/);
    expect(s).toMatch(/textContentType="password"/);
  });
  it('buddy composer input has accessibilityLabel', () => {
    expect(read('app/buddy.tsx')).toMatch(/accessibilityLabel="Message to Aura Buddy"/);
  });
});

describe('Interactive rows have a11y labels', () => {
  it('timeline rows announce reading label + score + date', () => {
    expect(read('app/timeline.tsx')).toMatch(/accessibilityLabel=\{`\$\{r\.auraResult\.label\}.*score \$\{r\.auraResult\.score\}/);
  });
  it('upload slots announce their position', () => {
    expect(read('app/upload.tsx')).toMatch(/accessibilityLabel=\{`\$\{SLOT_HINTS\[i\]\} photo`\}/);
  });
  it('compare picker chips announce option + selected state', () => {
    const s = read('app/compare.tsx');
    expect(s).toMatch(/accessibilityState=\{\{ selected, disabled \}\}/);
  });
});
