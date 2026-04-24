import { createLogger } from '../../common/src';
import { DEFAULT_CONFIG, PLUGIN_ID } from './constants';
import { ContentRenderer } from './features/content-renderer';
import { ConfigManager } from './services/config-manager';
import { DomObserver } from './services/dom-observer';
import { StyleManager } from './services/style-manager';
import { SettingsPanel } from './ui/panel';

const configManager = new ConfigManager();
const styleManager = new StyleManager();
const contentRenderer = new ContentRenderer();
const observer = new DomObserver();
const settingsPanel = new SettingsPanel();
const logger = createLogger(PLUGIN_ID, () => configManager.getAll().debug);

function destroy(): void {
  observer.stop();
  settingsPanel.destroy();
  contentRenderer.destroy();
  styleManager.destroy();
}

function init(): void {
  try {
    configManager.init();
    styleManager.init().applyTheme(configManager.getAll());
    configManager.subscribe((config) => styleManager.applyTheme(config));

    contentRenderer.enhance();
    settingsPanel.init(configManager);
    observer.start(() => contentRenderer.enhance());
    window.addEventListener('beforeunload', destroy, { once: true });
    logger.info('initialized', configManager.getAll());
  } catch (error) {
    console.error(`[${PLUGIN_ID}] Critical init failed`, error, DEFAULT_CONFIG);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  window.setTimeout(init, 500);
}
