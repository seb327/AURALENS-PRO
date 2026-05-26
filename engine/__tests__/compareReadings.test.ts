import { compareReadings } from '../compareReadings';
import type { SavedReading } from '@/types/reading';

const mk = (score: number, label: SavedReading['auraResult']['label'], dom: SavedReading['auraResult']['dominantColour'], zones: number[]): SavedReading => ({
  readingId: `r-${score}`,
  timestamp: new Date().toISOString(),
  inputType: 'camera',
  imageQuality: { lighting: 70, sharpness: 70, faceCentered: 70, confidence: 70 },
  auraResult: { label, score, dominantColour: dom, secondaryColour: 'Blue', element: 'Fire', confidence: 70 },
  mienShiangZones: {
    forehead: { theme: 'x', score: zones[0]!, interpretation: '' },
    brows:    { theme: 'x', score: zones[1]!, interpretation: '' },
    eyes:     { theme: 'x', score: zones[2]!, interpretation: '' },
    nose:     { theme: 'x', score: zones[3]!, interpretation: '' },
    cheeks:   { theme: 'x', score: zones[4]!, interpretation: '' },
    mouth:    { theme: 'x', score: zones[5]!, interpretation: '' },
    chinJaw:  { theme: 'x', score: zones[6]!, interpretation: '' },
  },
  guidance: { summary: '', maintainGoodEnergy: [], reduceHeavyEnergy: [], dailyPractice: '', reflectionQuestion: '' },
  disclaimer: 'Not medical, psychological, or diagnostic advice.',
});

describe('compareReadings', () => {
  it('computes a positive score delta and surfaces strongest improvement', () => {
    const before = mk(60, 'Mixed Aura', 'Blue',  [60, 50, 55, 60, 50, 60, 55]);
    const after  = mk(75, 'Rising Aura', 'Gold', [80, 60, 70, 65, 60, 65, 70]);
    const c = compareReadings(before, after);
    expect(c.scoreDelta).toBe(15);
    expect(c.labelChanged).toBe(true);
    expect(c.dominantChanged).toBe(true);
    expect(c.strongestImprovement?.zone).toBe('forehead');
    expect(c.summary).toMatch(/lifted/i);
  });

  it('flags decline and reports the worst zone', () => {
    const before = mk(75, 'Rising Aura', 'Gold', [80, 70, 80, 70, 75, 75, 70]);
    const after  = mk(55, 'Mixed Aura',  'Gold', [70, 60, 50, 55, 50, 65, 60]);
    const c = compareReadings(before, after);
    expect(c.scoreDelta).toBe(-20);
    expect(c.largestDecline?.zone).toBe('eyes');
    expect(c.summary).toMatch(/dipped/i);
  });

  it('reports steady when score is within ±5', () => {
    const a = mk(70, 'Rising Aura', 'Gold', [70, 70, 70, 70, 70, 70, 70]);
    const b = mk(72, 'Rising Aura', 'Gold', [72, 72, 72, 72, 72, 72, 72]);
    const c = compareReadings(a, b);
    expect(c.summary).toMatch(/steady/i);
    expect(c.labelChanged).toBe(false);
  });

  it('computes zone deltas for all 7 zones', () => {
    const a = mk(60, 'Mixed Aura', 'Blue', [50, 50, 50, 50, 50, 50, 50]);
    const b = mk(70, 'Rising Aura', 'Blue', [60, 55, 50, 45, 60, 65, 55]);
    const c = compareReadings(a, b);
    expect(c.zones).toHaveLength(7);
    expect(c.zones.find((z) => z.zone === 'nose')?.delta).toBe(-5);
  });
});
