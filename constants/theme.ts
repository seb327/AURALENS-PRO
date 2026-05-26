export const theme = {
  colors: {
    obsidian: '#050507',
    obsidianElevated: '#0B0B10',
    glass: 'rgba(255,255,255,0.06)',
    glassStrong: 'rgba(255,255,255,0.10)',
    hairline: 'rgba(255,255,255,0.10)',
    softWhite: '#F7F3EA',
    mute: 'rgba(247,243,234,0.62)',
    dim: 'rgba(247,243,234,0.38)',
    auraGold: '#F4C76B',
    auraViolet: '#9B6CFF',
    auraBlue: '#4DB8FF',
    auraGreen: '#66E0A3',
    auraRed: '#C4522A',
    auraIndigo: '#5B5BD6',
    auraWhite: '#F7F3EA',
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
  font: {
    display: 'System',
    body: 'System',
  },
  size: {
    h1: 40,
    h2: 28,
    h3: 22,
    body: 16,
    small: 13,
    micro: 11,
  },
  motion: {
    slow: 1200,
    normal: 600,
    quick: 280,
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
