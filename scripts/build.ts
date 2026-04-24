import { buildPlugin } from './build-plugin';

const [, , pluginName, ...flags] = process.argv;

if (!pluginName) {
  throw new Error('Usage: tsx scripts/build.ts <plugin-name> [--watch]');
}

await buildPlugin({ pluginName, watch: flags.includes('--watch') });
