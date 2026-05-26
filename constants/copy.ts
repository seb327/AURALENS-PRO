import Constants from 'expo-constants';

export const APP_DISPLAY_NAME: string =
  (Constants.expoConfig?.extra as { appDisplayName?: string } | undefined)
    ?.appDisplayName ?? 'AuraLens';

export const copy = {
  hero: {
    eyebrow: 'Symbolic aura reflection',
    title: 'Do you have a Good Aura\nor a Bad Aura?',
    sub: `A calm, grounded answer in seconds. Mien Shiang-inspired symbolic reflection — for wellbeing, journalling, and self-awareness.`,
    cta: 'Try Now',
    restoreCta: 'Already purchased? Restore',
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
      'Cloud analysis only ever runs after explicit consent.',
      'You can delete every reading and image at any time.',
      'We never sell face data and never train on your photos without explicit opt-in.',
    ],
    disclaimerTitle: 'Not Fortune Telling. Not Diagnosis. A Reflection Tool.',
    disclaimer:
      'This reading is for reflection, spiritual entertainment, and wellbeing guidance only. It is not medical, psychological, or diagnostic advice.',
  },
  pricing: {
    title: 'One reading,\nor a monthly companion.',
    sub: 'No tokens. No hidden credits. One price, one promise.',
    single: {
      title: 'Instant Aura Reading',
      price: '£0.99',
      desc: 'One scan. One symbolic aura reading. No confusing tokens. No hidden credit systems. Pay once, receive one reading.',
      features: [
        'Front camera or 3-photo upload',
        'Aura state result',
        'Mien Shiang-inspired face zone breakdown',
        'Energy balance summary',
        'Personal guidance snapshot',
        'Save reading to history',
      ],
      cta: 'Unlock One Reading',
    },
    monthly: {
      title: `${APP_DISPLAY_NAME} Monthly`,
      price: '£9.99/month',
      desc: 'Track your aura across time, compare photos from different chapters of your life, and receive ongoing AI guidance for maintaining clearer energy.',
      features: [
        'Fair-use unlimited aura readings',
        'Upload photos from different periods of life',
        'Aura timeline & before/after comparison',
        'AI Aura Buddy',
        'Weekly energy reflection',
        'Negative energy reduction practices',
      ],
      cta: 'Start Monthly',
    },
  },
  processing: [
    'Reading facial harmony…',
    'Mapping aura zones…',
    'Balancing Mien Shiang signals…',
    'Generating your reflection…',
  ],
  disclaimers: {
    short: 'For reflection and spiritual wellbeing only. Not medical, psychological, or diagnostic advice.',
    long: 'This symbolic reading is for reflection, spiritual entertainment and wellbeing guidance only. It is not medical, psychological or diagnostic advice.',
    consent:
      `By continuing, you agree that ${APP_DISPLAY_NAME} may analyse facial landmarks, expression balance, and image quality to generate a symbolic aura reflection. This is not medical, psychological, or diagnostic advice.`,
  },
  scan: {
    title: 'Aura Scan',
    sub: 'Hold steady. Find soft, even light. Centre your face in the frame.',
    cta: 'Begin Scan',
  },
  upload: {
    title: 'Upload Three Photos',
    sub: 'One front-facing. One natural and relaxed. One from a different chapter of your life.',
    cta: 'Generate Reading',
  },
  buddy: {
    title: 'Aura Buddy',
    sub: 'A calm companion for clearer energy. Not a therapist. Not a doctor. Just grounded, practical reflection.',
    crisis:
      'If you are in crisis or thinking about harming yourself, please contact your local emergency services or a trusted person right now. Aura Buddy is not equipped to help in an emergency.',
  },
} as const;

export const DISCLAIMER_VERSION = '2026.05.25';
