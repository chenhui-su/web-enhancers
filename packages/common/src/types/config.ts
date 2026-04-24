export type FontType = 'sans' | 'serif' | 'mono';
export type ThemeId = 'white' | 'yellow' | 'green' | 'dark';

export interface PluginConfig {
  theme: ThemeId;
  fontType: FontType;
  fontSize: number;
  maxWidth: number;
  debug: boolean;
}
