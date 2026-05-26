import type { MienShiangZoneKey } from '@/types/aura';

export const ZONE_THEMES: Record<MienShiangZoneKey, string> = {
  forehead: 'vision / planning / mental clarity',
  brows: 'drive / decision energy',
  eyes: 'presence / emotional signal',
  nose: 'willpower / material flow',
  cheeks: 'social force / expression',
  mouth: 'communication / emotional release',
  chinJaw: 'grounding / endurance',
};

const HIGH: Record<MienShiangZoneKey, string[]> = {
  forehead: [
    'Your mental field reads as clear and forward-aimed.',
    'Vision feels organised; thoughts have room to move.',
  ],
  brows: [
    'Decision energy looks strong — you are moving with intent.',
    'Drive sits steady, without strain.',
  ],
  eyes: [
    'Presence is open. You are letting the world see you.',
    'Your emotional signal reads as alive and steady.',
  ],
  nose: [
    'Willpower runs cleanly through the centre line.',
    'Material flow feels unblocked.',
  ],
  cheeks: [
    'Social warmth is reaching outward without effort.',
    'Expressive force is generous and balanced.',
  ],
  mouth: [
    'Communication is open. Words and feelings move freely.',
    'Emotional release looks unobstructed.',
  ],
  chinJaw: [
    'Grounding feels strong. You are rooted in your stance.',
    'Endurance reads as patient and quietly held.',
  ],
};

const MID: Record<MienShiangZoneKey, string[]> = {
  forehead: ['Mental clarity is present but a little crowded.', 'Vision is forming — give it space.'],
  brows: ['Drive is workable, slightly held back.', 'Decision energy is balanced but cautious.'],
  eyes: ['Presence is moderate — partial guard, partial openness.', 'Your gaze reads as observing more than transmitting.'],
  nose: ['Willpower flows in pulses rather than steadily.', 'Material flow has moments of pause.'],
  cheeks: ['Social warmth is reserved but genuine.', 'Expressive force is quiet today.'],
  mouth: ['Communication is measured.', 'Emotional release is partly held back.'],
  chinJaw: ['Grounding is mostly steady, with light tension.', 'Endurance is conserved rather than offered.'],
};

const LOW: Record<MienShiangZoneKey, string[]> = {
  forehead: ['Mental field looks crowded — clarity is asking for rest.', 'Vision is clouded by short-term noise — give it space.'],
  brows: ['Drive is holding tension rather than moving with it.', 'Decision energy feels heavy today.'],
  eyes: ['Presence is shielded — soften your gaze when you can.', 'Emotional signal is muted — give yourself gentleness.'],
  nose: ['Willpower runs in pulses; the centre line is wavering.', 'Material flow is partially blocked — slow down.'],
  cheeks: ['Social warmth is turned inward — that is allowed.', 'Expressive force is dim — recovery may be needed.'],
  mouth: ['Communication is filtered — words want more breath behind them.', 'Emotional release is being held — find a safe outlet.'],
  chinJaw: ['Grounding is strained — root into something small and steady.', 'Endurance is running on reserves — refill, do not push.'],
};

export function interpretZone(zone: MienShiangZoneKey, score: number): string {
  const bucket = score >= 70 ? HIGH : score >= 45 ? MID : LOW;
  const list = bucket[zone];
  // deterministic pick by score, not random
  const idx = Math.abs(Math.floor(score)) % list.length;
  return list[idx] ?? '';
}
