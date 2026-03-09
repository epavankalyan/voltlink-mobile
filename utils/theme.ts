export const COLORS = {
  // Dark Backgrounds
  darkPrimary: '#0a0a0a',
  darkSecondary: '#141414',
  darkTertiary: '#1e1e1e',

  // Light Backgrounds
  lightPrimary: '#f5f5f5',
  lightSecondary: '#ffffff',
  lightBg: '#f5f5f5',
  darkBg: '#0a0a0a',

  // Brand — matches web app gradient
  brandBlue: '#10a6de',
  primaryGreen: '#04eaaa',
  secondaryBlue: '#10a6de',
  gradientStart: '#04eaaa',
  gradientEnd: '#10a6de',

  // Status
  successGreen: '#04eaaa',
  alertRed: '#ef4444',
  warningOrange: '#f97316',

  // Text Dark Mode
  textPrimaryDark: 'rgba(255,255,255,0.95)',
  textSecondaryDark: 'rgba(255,255,255,0.65)',
  textMutedDark: 'rgba(255,255,255,0.40)',

  // Text Light Mode
  textPrimaryLight: '#1a1a1a',
  textSecondaryLight: 'rgba(17,17,17,0.7)',

  // Glassmorphism
  glassDark: 'rgba(255,255,255,0.06)',
  glassDarkBorder: 'rgba(255,255,255,0.12)',
  glassLight: 'rgba(255,255,255,0.95)',
  glassLightBorder: 'rgba(0,0,0,0.08)',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const TYPOGRAPHY = {
  hero: {
    fontSize: 32,
    fontWeight: '700' as const,
    fontFamily: 'System',
  },
  sectionHeader: {
    fontSize: 22,
    fontWeight: '600' as const,
    fontFamily: 'System',
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    fontFamily: 'System',
  },
  label: {
    fontSize: 12,
    fontWeight: '400' as const,
    fontFamily: 'System',
  },
};
