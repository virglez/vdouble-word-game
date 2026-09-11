export const BRAND = {
  purple: '#180224', orange: '#e88421', lyla: '#a26bfd', indigo: '#0177e5', white: '#F7F7F7',
} as const;

export const TEAM_COLORS = ['#a97ae1', '#459cec'] as const;
export const ROUND_COLORS = [BRAND.orange, BRAND.lyla, BRAND.indigo] as const;

const colors = {
  light: {
    text: BRAND.white, tint: BRAND.orange,
    background: BRAND.purple, foreground: BRAND.white,
    card: '#2d1440', cardForeground: BRAND.white,
    primary: BRAND.orange, primaryForeground: BRAND.purple,
    secondary: '#361d4d', secondaryForeground: '#e0dfee',
    muted: '#2d1440', mutedForeground: '#bbb4d1',
    accent: BRAND.lyla, accentForeground: BRAND.purple, heroGradient: BRAND.orange,
    destructive: BRAND.lyla, destructiveForeground: BRAND.purple,
    success: BRAND.indigo, successForeground: BRAND.purple,
    border: '#42305d', input: '#42305d',
  },
  radius: 24,
};

export default colors;