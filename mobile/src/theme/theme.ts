export type ThemeMode = 'light' | 'dark';

export type ThemePalette = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  elevated: string;
  text: string;
  subtext: string;
  border: string;
  primary: string;
  primaryStrong: string;
  primarySoft: string;
  buttonText: string;
  shadow: string;
};

export const themes: Record<ThemeMode, ThemePalette> = {
  light: {
    bg: '#f4f8fc',
    surface: '#ffffff',
    surfaceAlt: '#eaf2fb',
    elevated: '#d9e8f7',
    text: '#091726',
    subtext: '#566b82',
    border: '#c8d8e9',
    primary: '#166cc2',
    primaryStrong: '#0b4b89',
    primarySoft: '#dfeeff',
    buttonText: '#ffffff',
    shadow: 'rgba(13, 44, 80, 0.12)',
  },
  dark: {
    bg: '#07111d',
    surface: '#0f1c2c',
    surfaceAlt: '#132439',
    elevated: '#18314c',
    text: '#f5f9ff',
    subtext: '#9fb6cf',
    border: '#284560',
    primary: '#4da8ff',
    primaryStrong: '#1881ea',
    primarySoft: '#d5eaff',
    buttonText: '#07111d',
    shadow: 'rgba(0, 0, 0, 0.35)',
  },
};

export function statusBarStyle(mode: ThemeMode): 'light' | 'dark' {
  return mode === 'dark' ? 'light' : 'dark';
}
