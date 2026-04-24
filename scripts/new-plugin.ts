import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const pluginName = process.argv[2];

if (!pluginName) {
  throw new Error('Usage: tsx scripts/new-plugin.ts <plugin-name>');
}

const pluginDir = path.join(process.cwd(), 'packages', pluginName);
await mkdir(path.join(pluginDir, 'src'), { recursive: true });
await writeFile(
  path.join(pluginDir, 'userscript.meta.js'),
  `// ==UserScript==\n// @name         ${pluginName}\n// @namespace    https://github.com/your-name/web-enhancers\n// @version      0.1.0\n// @description  ${pluginName}\n// @match        https://example.com/*\n// @grant        GM_addStyle\n// @run-at       document-idle\n// ==/UserScript==\n`,
  'utf8',
);
await writeFile(path.join(pluginDir, 'src', 'index.ts'), "console.info('plugin loaded');\n", 'utf8');
console.info(`[new-plugin] created packages/${pluginName}`);
