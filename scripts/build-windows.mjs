import { build } from 'esbuild';
import { mkdir, copyFile, cp, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = path.join(root, 'build', 'windows');
await mkdir(path.join(output, 'ui'), { recursive: true });
await build({ entryPoints: [path.join(root, 'src/editor.js')], bundle: true, minify: true, format: 'iife',
  outfile: path.join(output, 'ui/editor.js'), target: 'chrome140' });
for (const name of ['main.cjs', 'preload.cjs', 'cli.cjs', 'service.cjs', 'search.cjs', 'smoke.cjs', 'editor-smoke.cjs', 'code-language-smoke.cjs']) {
  await copyFile(path.join(root, 'windows', name), path.join(output, name));
}
for (const name of ['chrome.js', 'windows.css']) await copyFile(path.join(root, 'windows', name), path.join(output, 'ui', name));
await cp(path.join(root, 'src/fonts'), path.join(output, 'ui/fonts'), { recursive: true });
await copyFile(path.join(root, 'assets/icon-1024.png'), path.join(output, 'icon.png'));
await copyFile(path.join(root, 'LICENSE'), path.join(output, 'LICENSE'));
const notices = [];
for (const [name, license] of [['lowlight', 'license'], ['highlight.js', 'LICENSE'], ['devlop', 'license']]) {
  notices.push(`${name}\n${await readFile(path.join(root, 'node_modules', name, license), 'utf8')}`);
}
await writeFile(path.join(output, 'THIRD_PARTY_NOTICES.txt'), notices.join('\n\n---\n\n'));
let html = await readFile(path.join(root, 'src/index.html'), 'utf8');
html = html.replace('</head>', '<title>HeptaFloat</title>\n<link rel="stylesheet" href="windows.css">\n</head>')
  .replace('<script src="editor.js">', '<script src="chrome.js"></script>\n<script src="editor.js">');
await writeFile(path.join(output, 'ui/index.html'), html);
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
await writeFile(path.join(output, 'package.json'), JSON.stringify({ name: 'heptafloat', productName: 'HeptaFloat',
  version: pkg.version, description: pkg.description, license: pkg.license, main: 'main.cjs' }, null, 2));
console.log(`Built Windows app: ${output}`);
