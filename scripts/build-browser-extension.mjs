import { build } from 'esbuild';
import { mkdir, copyFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('..', import.meta.url)), out = path.join(root, 'build/browser-extension');
await mkdir(out, { recursive: true });
const manifest = JSON.parse(await readFile(path.join(root, 'browser-extension/manifest.json'), 'utf8'));
await build({ entryPoints: ['background', 'handoff', 'options'].map((f) => path.join(root, `browser-extension/${f}.js`)),
  outdir: out, bundle: true, format: 'iife', target: 'chrome120', minify: true,
  define: { __BRIDGE_BUILD_VERSION__: JSON.stringify(manifest.version) } });
for (const name of ['manifest.json', 'handoff.html', 'options.html', 'style.css']) await copyFile(path.join(root, 'browser-extension', name), path.join(out, name));
await copyFile(path.join(root, 'docs/BROWSER_BRIDGE.md'), path.join(out, 'README.md'));
console.log(`Built MV3 bridge: ${out}`);
