// Server-side crisis guardrail. Run both BEFORE calling the LLM (on the user
// message) and AFTER (on the LLM reply, in case the model wandered).
//
// This module is pure ESM with no Deno or Supabase dependencies so it can be
// unit-tested with Jest from the React Native project.

export interface CrisisCheck {
  triggered: boolean;
  category?: 'self-harm' | 'harm-others' | 'abuse' | 'immediate-danger';
  matchedPattern?: string;
}

const PATTERNS: { re: RegExp; category: CrisisCheck['category'] }[] = [
  { re: /\bsuicid/i, category: 'self-harm' },
  { re: /\bkill (?:myself|me)\b/i, category: 'self-harm' },
  { re: /\bend (?:my|this) life\b/i, category: 'self-harm' },
  { re: /\bself[-\s]?harm/i, category: 'self-harm' },
  { re: /\bhurt(?:ing)? myself\b/i, category: 'self-harm' },
  { re: /\b(?:want(?:ed)? to|going to) die\b/i, category: 'self-harm' },
  { re: /\bcut(?:ting)? myself\b/i, category: 'self-harm' },
  { re: /\boverdose\b/i, category: 'self-harm' },

  { re: /\b(?:kill|hurt|stab|shoot) (?:him|her|them|someone)\b/i, category: 'harm-others' },
  { re: /\b(?:going to|want to) (?:kill|hurt) (?:him|her|them|someone)\b/i, category: 'harm-others' },

  { re: /\b(?:being|getting) abused\b/i, category: 'abuse' },
  { re: /\b(?:he|she|they) (?:hit|beat|hurt|rape)/i, category: 'abuse' },
  { re: /\bdomestic violence\b/i, category: 'abuse' },

  { re: /\b(?:i am|i'm) in danger\b/i, category: 'immediate-danger' },
  { re: /\bsomeone is going to hurt me\b/i, category: 'immediate-danger' },
];

export function detectCrisis(text: string): CrisisCheck {
  if (!text) return { triggered: false };
  for (const { re, category } of PATTERNS) {
    if (re.test(text)) {
      return { triggered: true, category, matchedPattern: re.source };
    }
  }
  return { triggered: false };
}

export function crisisResponseFor(check: CrisisCheck): string {
  const base =
    "I'm really sorry you're feeling this. This is bigger than an aura reading. " +
    'Please contact emergency services now if you are in immediate danger, ' +
    'or reach out to someone you trust and stay with them while you get support.\n\n' +
    'If you are in the UK you can call 116 123 (Samaritans). ' +
    'In the US dial or text 988. ' +
    'In Australia call 13 11 14 (Lifeline). ' +
    'Outside these regions, please contact your local emergency number.';

  if (check.category === 'harm-others') {
    return (
      "I'm not able to help with this, and I'm worried about you and others involved. " +
      'Please call your local emergency services right now, or reach out to a trusted person ' +
      'and stay safe. If you are in crisis yourself, the support lines above can also help.'
    );
  }
  if (check.category === 'abuse') {
    return (
      "I'm so sorry you're going through this. You deserve safety and support. " +
      'Please contact your local emergency services if you are in immediate danger. ' +
      'In the UK call 0808 2000 247 (National Domestic Abuse Helpline). ' +
      'In the US call 1-800-799-7233 (The Hotline). ' +
      'Outside these regions, please reach out to your local support service or someone you trust.'
    );
  }
  return base;
}
