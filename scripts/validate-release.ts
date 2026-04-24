import { readFile } from 'node:fs/promises';
import path from 'node:path';

const [, , pluginName, version] = process.argv;

if (!pluginName || !version) {
  throw new Error('Usage: tsx scripts/validate-release.ts <plugin-name> <version>');
}

const metaFile = path.join(process.cwd(), 'packages', pluginName, 'userscript.meta.js');
const meta = await readFile(metaFile, 'utf8');
const declaredVersion = readMetaValue(meta, 'version');
const downloadUrl = readMetaValue(meta, 'downloadURL');
const updateUrl = readMetaValue(meta, 'updateURL');
const expectedTag = `${pluginName}@${version}`;
const encodedTag = encodeURIComponent(expectedTag);
const expectedDownloadUrl = `https://github.com/chenhui-su/web-enhancers/releases/download/${encodedTag}/${pluginName}.user.js`;
const expectedUpdateUrl = `https://raw.githubusercontent.com/chenhui-su/web-enhancers/main/packages/${pluginName}/userscript.meta.js`;

if (declaredVersion !== version) {
  throw new Error(`@version ${declaredVersion} does not match release tag version ${version}`);
}

if (downloadUrl !== expectedDownloadUrl) {
  throw new Error(`@downloadURL must be ${expectedDownloadUrl}`);
}

if (updateUrl !== expectedUpdateUrl) {
  throw new Error(`@updateURL must be ${expectedUpdateUrl}`);
}

console.info(`[release] metadata is valid for ${expectedTag}`);

function readMetaValue(metaText: string, key: string): string {
  const match = metaText.match(new RegExp(`^//\\s+@${key}\\s+(.+)$`, 'm'));

  if (!match?.[1]) {
    throw new Error(`Missing @${key} in userscript metadata`);
  }

  return match[1].trim();
}
