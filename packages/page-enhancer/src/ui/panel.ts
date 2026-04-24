import type { PluginConfig, ThemeId } from '../../../common/src';
import { PANEL_ID, THEMES } from '../constants';
import type { ConfigManager } from '../services/config-manager';

export class SettingsPanel {
  private panel: HTMLElement | undefined;
  private removeListener: (() => void) | undefined;

  init(configManager: ConfigManager): void {
    this.destroy();

    const panel = document.createElement('section');
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <strong>Page Enhancer</strong>
      <label>Theme <select data-action="theme"></select></label>
      <button type="button" data-action="font-size">A+</button>
    `;

    const themeSelect = panel.querySelector<HTMLSelectElement>('[data-action="theme"]');
    if (themeSelect) {
      themeSelect.innerHTML = Object.keys(THEMES)
        .map((theme) => `<option value="${theme}">${theme}</option>`)
        .join('');
    }

    panel.addEventListener('change', (event) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-action="theme"]') && themeSelect) {
        configManager.update({ theme: themeSelect.value as ThemeId });
      }
    });

    panel.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-action="font-size"]')) {
        const current = configManager.getAll();
        configManager.update({ fontSize: current.fontSize >= 22 ? 14 : current.fontSize + 1 });
      }
    });

    document.body.append(panel);
    this.panel = panel;
    this.sync(configManager.getAll());
    this.removeListener = configManager.subscribe((config) => this.sync(config));
  }

  destroy(): void {
    this.removeListener?.();
    this.panel?.remove();
    this.panel = undefined;
    this.removeListener = undefined;
  }

  private sync(config: PluginConfig): void {
    const themeSelect = this.panel?.querySelector<HTMLSelectElement>('[data-action="theme"]');
    if (themeSelect) {
      themeSelect.value = config.theme;
    }
  }
}
