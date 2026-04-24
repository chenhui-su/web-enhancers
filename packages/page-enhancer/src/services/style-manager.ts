import type { PluginConfig } from '../../../common/src';
import { FONTS, PLUGIN_ID, STYLE_ID, THEMES } from '../constants';

export class StyleManager {
  private styleElement: HTMLStyleElement | undefined;

  init(): this {
    this.styleElement = (document.getElementById(STYLE_ID) as HTMLStyleElement | null) ?? undefined;

    if (!this.styleElement) {
      this.styleElement = typeof GM_addStyle === 'function' ? GM_addStyle('') : document.createElement('style');
      this.styleElement.id = STYLE_ID;

      if (!this.styleElement.parentElement) {
        document.head.append(this.styleElement);
      }
    }

    return this;
  }

  applyTheme(config: PluginConfig): void {
    const theme = THEMES[config.theme];

    if (!this.styleElement) {
      this.init();
    }

    this.styleElement!.textContent = `
:root {
  --${PLUGIN_ID}-bg: ${theme.background} !important;
  --${PLUGIN_ID}-fg: ${theme.foreground} !important;
  --${PLUGIN_ID}-accent: ${theme.accent} !important;
  --${PLUGIN_ID}-font: ${FONTS[config.fontType]} !important;
  --${PLUGIN_ID}-font-size: ${config.fontSize}px !important;
  --${PLUGIN_ID}-max-width: ${config.maxWidth}px !important;
}
body.${PLUGIN_ID}-enabled {
  background: var(--${PLUGIN_ID}-bg) !important;
  color: var(--${PLUGIN_ID}-fg) !important;
  font-family: var(--${PLUGIN_ID}-font) !important;
  font-size: var(--${PLUGIN_ID}-font-size) !important;
}
body.${PLUGIN_ID}-enabled main,
body.${PLUGIN_ID}-enabled article {
  max-width: var(--${PLUGIN_ID}-max-width) !important;
  margin-left: auto !important;
  margin-right: auto !important;
}
#${PLUGIN_ID}-panel {
  position: fixed !important;
  right: 16px !important;
  bottom: 16px !important;
  z-index: 2147483647 !important;
  display: grid !important;
  gap: 8px !important;
  padding: 12px !important;
  border: 1px solid color-mix(in srgb, var(--${PLUGIN_ID}-accent), transparent 55%) !important;
  border-radius: 12px !important;
  background: var(--${PLUGIN_ID}-bg) !important;
  color: var(--${PLUGIN_ID}-fg) !important;
  box-shadow: 0 10px 30px rgb(0 0 0 / 18%) !important;
  font: 13px/1.4 var(--${PLUGIN_ID}-font) !important;
}
#${PLUGIN_ID}-panel button,
#${PLUGIN_ID}-panel select {
  border: 1px solid var(--${PLUGIN_ID}-accent) !important;
  border-radius: 8px !important;
  background: transparent !important;
  color: inherit !important;
  padding: 6px 8px !important;
}
`;
  }

  destroy(): void {
    this.styleElement?.remove();
    this.styleElement = undefined;
  }
}
