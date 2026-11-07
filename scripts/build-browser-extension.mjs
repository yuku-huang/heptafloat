import { build } from 'esbuild';
import { mkdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('..', import.meta.url)), out = path.join(root, 'build/browser-extension');
await mkdir(out, { recursive: true });
await build({ entryPoints: ['background', 'handoff', 'options'].map((f) => path.join(root, `browser-extension/${f}.js`)),
  outdir: out, bundle: true, format: 'iife', target: 'chrome120', minify: true });
for (const name of ['manifest.json', 'handoff.html', 'options.html', 'style.css']) await copyFile(path.join(root, 'browser-extension', name), path.join(out, name));
console.log(`Built MV3 bridge: ${out}`);
