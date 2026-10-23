import { packager } from '@electron/packager';
import { readFile, writeFile, copyFile, access } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

if (process.platform !== 'win32') throw new Error('Run this packaging script on Windows.');
const root = fileURLToPath(new URL('..', import.meta.url));
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const icon = path.join(root, 'assets', 'AppIcon.ico');
let hasIcon = false;
try { await access(icon); hasIcon = true; } catch {}
const outputs = await packager({ dir: path.join(root, 'build/windows'), out: path.join(root, 'dist'), name: 'HeptaFloat',
  platform: 'win32', arch: 'x64', electronVersion: pkg.devDependencies.electron, overwrite: true, asar: true,
  ...(hasIcon && { icon }), appVersion: pkg.version, buildVersion: '0.9.12.1',
  win32metadata: { CompanyName: 'HeptaFloat contributors', FileDescription: 'HeptaFloat for Windows', ProductName: 'HeptaFloat' } });
await copyFile(path.join(root, 'docs/WINDOWS.md'), path.join(outputs[0], 'WINDOWS.md'));
const archive = path.join(root, 'dist', `HeptaFloat-${pkg.version}-windows-x64.zip`);
// PowerShell receives only explicitly quoted, tool-owned output paths.
const quote = (s) => `'${s.replaceAll("'", "''")}'`;
execFileSync('powershell.exe', ['-NoProfile', '-Command',
  `Compress-Archive -LiteralPath ${quote(outputs[0])} -DestinationPath ${quote(archive)} -Force`], { stdio: 'inherit', windowsHide: true });
const hash = createHash('sha256');
for await (const chunk of createReadStream(archive)) hash.update(chunk);
await writeFile(`${archive}.sha256`, `${hash.digest('hex')}  ${path.basename(archive)}\n`);
console.log(`Packaged ${archive}`);
