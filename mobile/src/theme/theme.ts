export type ThemeMode = 'light' | 'dark';

// Shared color tokens used across the whole app.
// The design language is a light, airy mint / teal healthcare aesthetic: a soft
// mint gradient page, white rounded cards with gentle shadows, a teal accent for
// active states and small controls, and near-black pill buttons for the primary
// action on a screen. Dark mode is a secondary counterpart of the same system.
// Every key the rest of the app already reads is kept so nothing downstream breaks.
export type ThemePalette = {
  bg: string;
  bgAlt: string;
  surface: string;
  surfaceAlt: string;
  elevated: string;
  glass: string;
  text: string;
  subtext: string;
  border: string;
  hairline: string;
  primary: string;
  primaryStrong: string;
  primarySoft: string;
  buttonText: string;
  // The bold, high-contrast pill used for the main call to action on a screen.
  cta: string;
  ctaText: string;
  shadow: string;
  glow: string;
  accentPrimary: string;
  accentSecondary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  // Gradient stops, ordered from start to end. Consumed by expo-linear-gradient.
  gradientSurface: readonly [string, string];
  gradientAccent: readonly [string, string, string];
  gradientAurora: readonly [string, string, string];
};

export const themes: Record<ThemeMode, ThemePalette> = {
  light: {
    bg: '#eaf6f3',
    bgAlt: '#dcefeb',
    surface: '#ffffff',
    surfaceAlt: '#f1f8f6',
    elevated: '#e6f3ef',
    glass: 'rgba(255, 255, 255, 0.80)',
    text: '#0c1b22',
    subtext: '#6b8088',
    border: '#e3ede9',
    hairline: 'rgba(12, 40, 50, 0.08)',
    primary: '#17c0aa',
    primaryStrong: '#0fa593',
    primarySoft: '#d6f4ef',
    buttonText: '#ffffff',
    cta: '#0c1b22',
    ctaText: '#ffffff',
    shadow: 'rgba(16, 50, 64, 0.10)',
    glow: 'rgba(23, 192, 170, 0.28)',
    accentPrimary: '#17c0aa',
    accentSecondary: '#0c1b22',
    success: '#12b886',
    warning: '#e8930c',
    danger: '#fa5252',
    info: '#1ca7c4',
    gradientSurface: ['#ffffff', '#f0f9f7'],
    gradientAccent: ['#25d6c2', '#14b8a6', '#0ea59d'],
    gradientAurora: ['#a5e4d8', '#d2f0ea', '#eef9f6'],
  },
  dark: {
    bg: '#08201f',
    bgAlt: '#0b2a27',
    surface: '#0f2e2b',
    surfaceAlt: '#123330',
    elevated: '#184039',
    glass: 'rgba(15, 46, 43, 0.74)',
    text: '#eafaf6',
    subtext: '#8fb3ab',
    border: '#1f453f',
    hairline: 'rgba(234, 250, 246, 0.08)',
    primary: '#2ee6cc',
    primaryStrong: '#17c0aa',
    primarySoft: '#123330',
    buttonText: '#04201c',
    cta: '#eafaf6',
    ctaText: '#08201f',
    shadow: 'rgba(0, 0, 0, 0.45)',
    glow: 'rgba(46, 230, 204, 0.32)',
    accentPrimary: '#2ee6cc',
    accentSecondary: '#eafaf6',
    success: '#2ee6a8',
    warning: '#ffc078',
    danger: '#ff8787',
    info: '#3bc9db',
    gradientSurface: ['#0f2e2b', '#0b2624'],
    gradientAccent: ['#2ee6cc', '#17c0aa', '#0ea59d'],
    gradientAurora: ['#0b2a27', '#0c2320', '#0a1f1d'],
  },
};

// Keeps the status bar readable when the app theme changes.
export function statusBarStyle(mode: ThemeMode): 'light' | 'dark' {
  return mode === 'dark' ? 'light' : 'dark';
}

// Builds a soft, coloured "glow" elevation. React Native maps these to a real
// shadow on iOS, an elevation on Android, and boxShadow on web, so a single call
// gives every platform the same lifted, luminous treatment.
export function glowShadow(
  color: string,
  opacity = 0.5,
  radius = 24,
  offsetY = 12,
) {
  return {
    shadowColor: color,
    shadowOpacity: opacity,
    shadowRadius: radius,
    shadowOffset: { width: 0, height: offsetY },
    elevation: Math.round(radius / 2),
  };
}
