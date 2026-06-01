// AuraLens design tokens.
// Premium · mystical · cinematic. Used by the entire UI surface.

export const theme = {
  colors: {
    obsidian: '#050507',
    obsidianElevated: '#0B0B10',
    glass: 'rgba(255,255,255,0.06)',
    glassStrong: 'rgba(255,255,255,0.10)',
    hairline: 'rgba(255,255,255,0.10)',
    hairlineStrong: 'rgba(255,255,255,0.18)',
    softWhite: '#F7F3EA',
    mute: 'rgba(247,243,234,0.62)',
    dim: 'rgba(247,243,234,0.38)',

    auraGold: '#F4C76B',
    auraGoldDeep: '#C99645',
    auraGoldLight: '#FBE3A2',

    auraViolet: '#9B6CFF',
    auraBlue: '#4DB8FF',
    auraGreen: '#66E0A3',
    auraRed: '#C4522A',
    auraIndigo: '#5B5BD6',
    auraWhite: '#F7F3EA',

    danger: '#E5594E',
    dangerDeep: '#8E2A23',
  },

  // Premium reusable gradient tuples — pass straight to <LinearGradient/>.
  gradients: {
    gold: ['#FBE3A2', '#F4C76B', '#C99645'] as const,
    goldSoft: ['rgba(251,227,162,0.18)', 'rgba(201,150,69,0.08)'] as const,
    violet: ['#B89BFF', '#9B6CFF', '#5B5BD6'] as const,
    indigo: ['#7C7CE0', '#5B5BD6', '#2D2D7A'] as const,
    glass: ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.02)'] as const,
    danger: ['#F18377', '#E5594E', '#8E2A23'] as const,
    obsidian: ['rgba(11,11,16,0)', 'rgba(11,11,16,0.96)'] as const,
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 72,
  },

  radius: {
    sm: 10,
    md: 18,
    lg: 28,
    xl: 36,
    pill: 999,
  },

  font: { display: 'System', body: 'System' },

  size: {
    h1: 40,
    h2: 28,
    h3: 22,
    body: 16,
    small: 13,
    micro: 11,
  },

  // Re-usable elevation tokens. Apply to wrapping views — never inline.
  shadow: {
    soft: {
      shadowColor: '#000',
      shadowOpacity: 0.35,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    deep: {
      shadowColor: '#000',
      shadowOpacity: 0.55,
      shadowRadius: 28,
      shadowOffset: { width: 0, height: 14 },
      elevation: 12,
    },
    glowGold: {
      shadowColor: '#F4C76B',
      shadowOpacity: 0.45,
      shadowRadius: 26,
      shadowOffset: { width: 0, height: 12 },
      elevation: 12,
    },
    glowViolet: {
      shadowColor: '#9B6CFF',
      shadowOpacity: 0.40,
      shadowRadius: 26,
      shadowOffset: { width: 0, height: 12 },
      elevation: 12,
    },
    glowDanger: {
      shadowColor: '#E5594E',
      shadowOpacity: 0.30,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
  },

  motion: {
    slow: 1200,
    normal: 600,
    quick: 280,
    press: 120,
  },
} as const;

export type AuraColourKey =
  | 'Gold'
  | 'Violet'
  | 'Blue'
  | 'Green'
  | 'Red'
  | 'Indigo'
  | 'White';

export const auraColourHex: Record<AuraColourKey, string> = {
  Gold: theme.colors.auraGold,
  Violet: theme.colors.auraViolet,
  Blue: theme.colors.auraBlue,
  Green: theme.colors.auraGreen,
  Red: theme.colors.auraRed,
  Indigo: theme.colors.auraIndigo,
  White: theme.colors.auraWhite,
};
