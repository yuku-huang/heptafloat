import { packager } from '@electron/packager';
import { readFile, writeFile, copyFile, access, mkdir, cp } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

if (process.platform !== 'win32') throw new Error('Run this packaging script on Windows.');
const root = fileURLToPath(new URL('..', import.meta.url));
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
// Versioned folders let users finish work in the previous release during a build.
const outputRoot = path.join(root, 'dist', pkg.version);
const executable = path.join(outputRoot, 'HeptaFloat-win32-x64', 'HeptaFloat.exe');
const stageOnly = process.argv.includes('--stage-only'), archiveOnly = process.argv.includes('--archive-only');
if (stageOnly && archiveOnly) throw new Error('Choose stage-only or archive-only, not both.');
const quote = (s) => `'${s.replaceAll("'", "''")}'`;
const running = execFileSync('powershell.exe', ['-NoProfile', '-Command',
  `$targetExe = ${quote(executable)}; @(Get-Process -Name HeptaFloat -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $targetExe }).Count`], { encoding: 'utf8', windowsHide: true });
if (Number(running.trim()) > 0) throw new Error(`Quit the running ${pkg.version} tray app before repackaging it.`);
const icon = path.join(root, 'assets', 'AppIcon.ico');
let hasIcon = false;
try { await access(icon); hasIcon = true; } catch {}
if (archiveOnly) await access(executable);
const outputs = archiveOnly ? [path.dirname(executable)] : await packager({ dir: path.join(root, 'build/windows'), out: outputRoot, name: 'HeptaFloat',
  platform: 'win32', arch: 'x64', electronVersion: pkg.devDependencies.electron, overwrite: true, asar: true,
  ...(hasIcon && { icon }), appVersion: pkg.version, buildVersion: pkg.version.replace('-win.', '.'),
  win32metadata: { CompanyName: 'HeptaFloat contributors', FileDescription: 'HeptaFloat for Windows', ProductName: 'HeptaFloat' } });
await copyFile(path.join(root, 'docs/WINDOWS.md'), path.join(outputs[0], 'WINDOWS.md'));
await mkdir(path.join(outputs[0], 'docs'), { recursive: true });
for (const name of ['DEEPLINK.md', 'DEEPLINK_TEST_RESULTS.md']) await copyFile(path.join(root, 'docs', name), path.join(outputs[0], 'docs', name));
await cp(path.join(root, 'integrations'), path.join(outputs[0], 'integrations'), { recursive: true });
await cp(path.join(root, 'shared'), path.join(outputs[0], 'shared'), { recursive: true });
await mkdir(path.join(outputs[0], 'scripts'), { recursive: true });
await copyFile(path.join(root, 'scripts/install-windows.ps1'), path.join(outputs[0], 'scripts/install-windows.ps1'));
await cp(path.join(root, 'build/browser-extension'), path.join(outputs[0], 'browser-extension'), { recursive: true });
// QA can test the exact EXE before refreshing its guides and creating the ZIP.
if (stageOnly) { console.log(`Staged ${outputs[0]}`); process.exit(0); }
const archive = path.join(root, 'dist', `HeptaFloat-${pkg.version}-windows-x64.zip`);
// PowerShell receives only explicitly quoted, tool-owned output paths.
execFileSync('powershell.exe', ['-NoProfile', '-Command',
  `Compress-Archive -LiteralPath ${quote(outputs[0])} -DestinationPath ${quote(archive)} -Force`], { stdio: 'inherit', windowsHide: true });
const hash = createHash('sha256');
for await (const chunk of createReadStream(archive)) hash.update(chunk);
await writeFile(`${archive}.sha256`, `${hash.digest('hex')}  ${path.basename(archive)}\n`);
console.log(`Packaged ${archive}`);
