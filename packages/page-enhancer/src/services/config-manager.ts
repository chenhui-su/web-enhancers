import type { PluginConfig } from '../../../common/src';
import { DEFAULT_CONFIG, STORAGE_KEY } from '../constants';

type ConfigListener = (config: PluginConfig) => void;

export class ConfigManager {
  private config: PluginConfig = { ...DEFAULT_CONFIG };
  private readonly listeners = new Set<ConfigListener>();

  init(): void {
    this.config = this.load();
  }

  getAll(): PluginConfig {
    return { ...this.config };
  }

  update(patch: Partial<PluginConfig>): void {
    this.config = { ...this.config, ...patch };
    this.save();
    this.listeners.forEach((listener) => listener(this.getAll()));
  }

  subscribe(listener: ConfigListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private load(): PluginConfig {
    try {
      const stored = GM_getValue<Partial<PluginConfig>>(STORAGE_KEY, {});
      return { ...DEFAULT_CONFIG, ...stored };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  private save(): void {
    try {
      GM_setValue(STORAGE_KEY, this.config);
    } catch {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    }
  }
}
