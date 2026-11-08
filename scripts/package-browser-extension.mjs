// Standalone bridge delivery; never rewrites a tested Electron distribution.
import { readFile, writeFile, copyFile, mkdir, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

if (process.platform !== 'win32') throw new Error('Run this ZIP packaging script on Windows.');
const root = fileURLToPath(new URL('..', import.meta.url));
const built = path.join(root, 'build/browser-extension');
const manifest = JSON.parse(await readFile(path.join(built, 'manifest.json'), 'utf8'));
const source = JSON.parse(await readFile(path.join(root, 'browser-extension/manifest.json'), 'utf8'));
if (!/^\d+\.\d+\.\d+$/.test(manifest.version) || manifest.version !== source.version) throw new Error('Build the current bridge before packaging.');
const files = ['manifest.json', 'background.js', 'handoff.js', 'options.js', 'handoff.html', 'options.html', 'style.css', 'README.md'];
const stage = path.join(root, 'dist/browser-extension', manifest.version, 'FlowHeptaBase-Link-Bridge');
await mkdir(stage, { recursive: true });
if ((await readdir(stage)).some((name) => !files.includes(name))) throw new Error('Unexpected files in this versioned extension output; preserve and inspect them.');
for (const file of files) await copyFile(path.join(built, file), path.join(stage, file));
const zip = path.join(root, 'dist', `FlowHeptaBase-Link-Bridge-${manifest.version}.zip`);
const quote = (value) => `'${value.replaceAll("'", "''")}'`;
execFileSync('powershell.exe', ['-NoProfile', '-Command',
  `Compress-Archive -LiteralPath ${quote(stage)} -DestinationPath ${quote(zip)} -Force`], { stdio: 'inherit', windowsHide: true });
const hash = createHash('sha256').update(await readFile(zip)).digest('hex');
await writeFile(`${zip}.sha256`, `${hash}  ${path.basename(zip)}\n`);
console.log(`Packaged bridge ${manifest.version}: ${zip}`);
