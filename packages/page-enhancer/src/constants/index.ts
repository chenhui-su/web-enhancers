import type { FontType, PluginConfig, ThemeId } from '../../../common/src';

export const PLUGIN_ID = 'page-enhancer';
export const STYLE_ID = `${PLUGIN_ID}-style`;
export const PANEL_ID = `${PLUGIN_ID}-panel`;
export const STORAGE_KEY = `${PLUGIN_ID}:config`;
export const DEBOUNCE_DELAY = 150;

export const FONTS = {
  sans: 'Inter, "Source Han Sans SC", system-ui, sans-serif',
  serif: 'Georgia, "Source Han Serif SC", serif',
  mono: '"JetBrains Mono", Consolas, monospace',
} as const satisfies Record<FontType, string>;

export const THEMES = {
  white: { background: '#ffffff', foreground: '#1f2937', accent: '#2563eb' },
  yellow: { background: '#fff7d6', foreground: '#3f3418', accent: '#b45309' },
  green: { background: '#edf7ed', foreground: '#19351f', accent: '#15803d' },
  dark: { background: '#111827', foreground: '#f9fafb', accent: '#60a5fa' },
} as const satisfies Record<ThemeId, { background: string; foreground: string; accent: string }>;

export const DEFAULT_CONFIG = {
  theme: 'white',
  fontType: 'sans',
  fontSize: 16,
  maxWidth: 960,
  debug: false,
} as const satisfies PluginConfig;
