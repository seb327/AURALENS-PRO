import { runAuraEngine } from '../auraEngine';
import type { AuraEngineInput } from '@/types/aura';

const sample: AuraEngineInput = {
  inputType: 'camera',
  imageQuality: { lighting: 80, sharpness: 75, faceCentered: 90, confidence: 82 },
  imageHashes: ['deadbeef'],
};

describe('auraEngine', () => {
  it('is deterministic for identical inputs', () => {
    const a = runAuraEngine(sample);
    const b = runAuraEngine(sample);
    expect(a.auraResult.score).toBe(b.auraResult.score);
    expect(a.auraResult.label).toBe(b.auraResult.label);
    expect(a.auraResult.dominantColour).toBe(b.auraResult.dominantColour);
    expect(a.mienShiangZones.forehead.score).toBe(b.mienShiangZones.forehead.score);
  });

  it('produces a label and score in range', () => {
    const r = runAuraEngine(sample);
    expect(r.auraResult.score).toBeGreaterThanOrEqual(0);
    expect(r.auraResult.score).toBeLessThanOrEqual(100);
    expect(typeof r.auraResult.label).toBe('string');
  });

  it('lowers confidence for poor image quality', () => {
    const poor = runAuraEngine({
      ...sample,
      imageQuality: { lighting: 10, sharpness: 15, faceCentered: 20, confidence: 12 },
    });
    expect(poor.auraResult.confidence).toBeLessThan(40);
  });

  it('always emits a disclaimer', () => {
    const r = runAuraEngine(sample);
    expect(r.disclaimer.toLowerCase()).toContain('not medical');
  });

  it('changes output when seed changes', () => {
    const a = runAuraEngine(sample);
    const b = runAuraEngine({ ...sample, imageHashes: ['cafebabe'] });
    expect(a.readingId).not.toBe(b.readingId);
  });
});
