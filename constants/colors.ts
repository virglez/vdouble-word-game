export const BRAND = {
  navy: '#0B1B2B', yellow: '#FFD233', coral: '#FF6B6B', mint: '#02C39A', white: '#F7F7F7',
} as const;

export const ROUND_COLORS = [BRAND.yellow, BRAND.coral, BRAND.mint] as const;

const colors = {
  light: {
    text: BRAND.white, tint: BRAND.yellow,
    background: BRAND.navy, foreground: BRAND.white,
    card: '#142B40', cardForeground: BRAND.white,
    primary: BRAND.yellow, primaryForeground: BRAND.navy,
    secondary: '#1D374D', secondaryForeground: '#DFE8EE',
    muted: '#142B40', mutedForeground: '#B4C4D1',
    accent: BRAND.coral, accentForeground: BRAND.navy, heroGradient: BRAND.yellow,
    destructive: BRAND.coral, destructiveForeground: BRAND.navy,
    success: BRAND.mint, successForeground: BRAND.navy,
    border: '#30495D', input: '#30495D',
  },
  radius: 24,
};

export default colors;
