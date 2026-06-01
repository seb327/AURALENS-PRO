import Constants from 'expo-constants';

export const APP_DISPLAY_NAME: string =
  (Constants.expoConfig?.extra as { appDisplayName?: string } | undefined)
    ?.appDisplayName ?? 'AuraLens';

export const copy = {
  hero: {
    eyebrow: 'A SYMBOLIC AURA REFLECTION',
    title: 'Do you have a\nGood Aura\nor a Bad Aura?',
    sub: 'A calm, grounded answer in seconds — through a Mien Shiang-inspired face reflection. For wellbeing, journalling, and self-awareness.',
    cta: 'Try Now',
    trust: 'For reflection and wellbeing. Not medical or diagnostic advice.',
  },
  technology: {
    title: 'Ancient face reading,\nrebuilt for the AI age.',
    intro: `${APP_DISPLAY_NAME} maps facial landmark geometry, symmetry, expression balance, and light into seven symbolic Mien Shiang-inspired zones — turning a single moment into a calm, grounded reflection.`,
    cards: [
      { title: 'Face Zones', body: 'Seven symbolic zones inspired by Mien Shiang map energetic themes onto your face.' },
      { title: 'Landmark Geometry', body: 'Symmetry, proportion and harmony are measured from facial landmarks.' },
      { title: 'Aura Pattern Mapping', body: 'Expression tension, lighting and balance translate into a symbolic aura signature.' },
      { title: 'AI Energy Guidance', body: 'A calm, grounded AI reflects practical guidance based on your reading.' },
    ],
    privacyTitle: 'Privacy First',
    privacy: [
      'Camera and photo upload are always optional.',
      'On-device processing is used wherever possible.',
      'Cloud sync only ever runs after explicit consent.',
      'You can delete every reading and image at any time.',
      'We never sell face data and never train on your photos without explicit opt-in.',
    ],
    disclaimerTitle: 'Not Fortune Telling. Not a Diagnosis. A Reflection Tool.',
    disclaimer:
      'This reading is for reflection, spiritual wellbeing and self-awareness only. It is not medical, psychological, or diagnostic advice.',
  },
  pricing: {
    title: 'One reading,\nor a monthly companion.',
    sub: 'Honest pricing. Pay once, or unlock the full reflection practice.',
    single: {
      title: 'Instant Aura Reading',
      price: '£1.99',
      desc: 'One symbolic aura reading. Pay once, take it once.',
      features: [
        'Front-camera scan or 3-photo upload',
        'Aura label, score, and colour signature',
        'Mien Shiang zone breakdown',
        'Grounded daily guidance',
        'Saved to your reading history',
      ],
      cta: 'Unlock One Reading',
    },
    monthly: {
      title: `${APP_DISPLAY_NAME} Monthly`,
      price: '£7.99/month',
      whyMonthly: 'Track how your aura shifts across chapters of your life.',
      desc: 'Unlimited readings, the aura timeline, side-by-side comparison, and a real AI companion to keep your energy clear.',
      features: [
        'Unlimited symbolic readings',
        'Aura timeline & before/after comparison',
        'Aura Buddy — AI reflection companion',
        'Daily practices for clearer energy',
        'Releases for heavy or clouded patterns',
        'Premium cloud sync across devices',
      ],
      cta: 'Start Monthly',
    },
    cancelNote: 'Auto-renews monthly. Cancel any time in your App Store or Google Play account.',
  },
  processing: [
    'Reading facial harmony…',
    'Mapping Mien Shiang zones…',
    'Balancing aura signals…',
    'Preparing your reflection…',
  ],
  disclaimers: {
    short: 'For reflection and wellbeing only. Not medical, psychological, or diagnostic advice.',
    long: 'This symbolic reading is for reflection, spiritual wellbeing and self-awareness only. It is not medical, psychological, or diagnostic advice.',
    consent:
      `By continuing, you agree that ${APP_DISPLAY_NAME} may analyse facial landmarks, expression balance, and image quality to generate a symbolic aura reflection. This is not medical, psychological, or diagnostic advice.`,
  },
  scan: {
    title: 'Aura Scan',
    sub: 'Hold steady. Find soft, even light. Centre your face in the frame.',
    tips: 'Tip: best results in natural daylight with a relaxed expression.',
    cta: 'Begin Scan',
  },
  upload: {
    title: 'Three Photos',
    sub: 'Front-facing. Natural. From a different chapter of your life.',
    privacy: 'Photos stay on your device unless you explicitly turn on photo upload in Settings.',
    cta: 'Generate Reading',
    needMore: (n: number) => `Add ${n} more photo${n === 1 ? '' : 's'}`,
  },
  result: {
    askBuddy: 'Ask Aura Buddy about this reading',
    unlockTitle: 'Unlock Aura Buddy',
    unlockBody:
      'AuraLens Monthly includes Aura Buddy — a calm companion who reflects on your reading and offers practical daily practices.',
    unlockCta: 'See Monthly',
    share: 'Share',
    again: 'Start Another Reading',
  },
  timeline: {
    title: 'Aura Timeline',
    sub: 'Your readings, newest first.',
    emptyTitle: 'No readings yet',
    emptyBody: 'Your aura history will appear here as you take readings.',
    emptyCta: 'Take your first reading',
    syncedJustNow: (pushed: number, pulled: number) =>
      pushed === 0 && pulled === 0
        ? 'Synced — everything up to date'
        : `Synced — ${pushed} pushed, ${pulled} pulled`,
    localOnly: 'Local only — sign in to sync across devices',
  },
  buddy: {
    title: 'Aura Buddy',
    sub: 'A calm companion for clearer energy. Not a therapist. Not a doctor. Just grounded, practical reflection.',
    crisis:
      'If you are in crisis or thinking about harming yourself, please contact your local emergency services or a trusted person right now. Aura Buddy is not equipped to help in an emergency.',
    intro: (label: string, colour: string) =>
      `I can see your most recent reading came through as ${label.toLowerCase()} with a ${colour.toLowerCase()} signature. What feels most alive in your day so far?`,
    introNoReading: 'Take a reading first and I can reflect on it with you. In the meantime, what is on your mind?',
    placeholder: 'Type something honest',
    sending: 'Aura Buddy is reflecting…',
    offlineTag: 'Offline reflection — using local guidance while we reconnect',
    lockTitle: 'Aura Buddy — Monthly only',
    lockBody: 'A calm reflection companion for daily practice. Available with AuraLens Monthly.',
    lockCta: 'See Monthly',
  },
  settings: {
    accountSignIn: 'Sign in to enable cloud sync across your devices. Account is always optional.',
    cloudSyncStatusOn: 'Cloud sync on — readings backed up to your account',
    cloudSyncStatusReady: 'Cloud sync ready — toggle on to back up readings',
    cloudSyncStatusOff: 'Offline only — readings stay on this device',
  },
} as const;

export const DISCLAIMER_VERSION = '2026.05.25';
