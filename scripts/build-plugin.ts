import { context, type BuildOptions, type BuildResult, type Plugin } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface BuildPluginOptions {
  pluginName: string;
  watch?: boolean;
}

export async function buildPlugin({ pluginName, watch = false }: BuildPluginOptions): Promise<void> {
  const rootDir = process.cwd();
  const pluginDir = path.join(rootDir, 'packages', pluginName);
  const entry = path.join(pluginDir, 'src', 'index.ts');
  const metaFile = path.join(pluginDir, 'userscript.meta.js');
  const distDir = path.join(pluginDir, 'dist');
  const outputFile = path.join(distDir, `${pluginName}.user.js`);

  await mkdir(distDir, { recursive: true });

  const meta = await readFile(metaFile, 'utf8');
  const options: BuildOptions = {
    entryPoints: [entry],
    bundle: true,
    format: 'iife',
    target: 'es2020',
    minify: !watch,
    sourcemap: 'external',
    outfile: outputFile,
    write: false,
    logLevel: 'info',
    legalComments: 'none',
  };

  if (watch) {
    const ctx = await context({
      ...options,
      plugins: [userscriptMetaPlugin(meta, outputFile)],
    });
    await ctx.watch();
    console.info(`[build] watching ${pluginName}`);
    return;
  }

  const ctx = await context(options);
  const result = await ctx.rebuild();
  await ctx.dispose();
  await writeOutputs(meta, outputFile, result.outputFiles ?? []);
  console.info(`[build] wrote ${path.relative(rootDir, outputFile)}`);
}

function userscriptMetaPlugin(meta: string, outFile: string): Plugin {
  return {
    name: 'userscript-meta',
    setup(buildApi) {
      buildApi.onEnd(async (result) => {
        if (result.errors.length > 0) {
          return;
        }

        await writeOutputs(meta, outFile, result.outputFiles ?? []);
      });
    },
  };
}

async function writeOutputs(
  meta: string,
  outFile: string,
  outputFiles: NonNullable<BuildResult['outputFiles']>,
): Promise<void> {
  const jsOutput = outputFiles.find((file) => file.path.endsWith('.js'));
  const mapOutput = outputFiles.find((file) => file.path.endsWith('.js.map'));

  if (!jsOutput) {
    throw new Error('esbuild did not return a JavaScript output file');
  }

  await writeFile(outFile, `${meta.trim()}\n${jsOutput.text}`, 'utf8');

  if (mapOutput) {
    await writeFile(`${outFile}.map`, mapOutput.text, 'utf8');
  }
}
