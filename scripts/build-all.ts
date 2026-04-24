import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { buildPlugin } from './build-plugin';

const packagesDir = path.join(process.cwd(), 'packages');
const entries = await readdir(packagesDir, { withFileTypes: true });
const plugins = entries
  .filter((entry) => entry.isDirectory() && entry.name !== 'common')
  .map((entry) => entry.name);

for (const plugin of plugins) {
  await buildPlugin({ pluginName: plugin });
}
