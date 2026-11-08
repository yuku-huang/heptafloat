// Copy the already-tested native binary. Packaging must not rebuild a released host.
import { readFile, writeFile, copyFile, mkdir, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

if (process.platform !== 'win32') throw new Error('Package this Windows bridge on Windows.');
const root = fileURLToPath(new URL('..', import.meta.url));
const built = path.join(root, 'build/browser-extension');
const manifest = JSON.parse(await readFile(path.join(built, 'manifest.json'), 'utf8'));
const source = JSON.parse(await readFile(path.join(root, 'browser-extension/manifest.json'), 'utf8'));
if (!/^\d+\.\d+\.\d+$/.test(manifest.version) || manifest.version !== source.version) throw new Error('Build the current extension first.');
const nativeVersion = '1.0.0';
const nativeSource = path.join(root, 'build/native-host', nativeVersion);
const metadata = JSON.parse(await readFile(path.join(nativeSource, 'host-version.json'), 'utf8'));
const nativeBytes = await readFile(path.join(nativeSource, 'HeptaFloat.NativeHost.exe'));
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
if (metadata.version !== nativeVersion || digest(nativeBytes) !== metadata.sha256) throw new Error('The tested native host and metadata do not match.');

const files = new Map();
for (const file of ['manifest.json', 'background.js', 'handoff.js', 'options.js', 'handoff.html', 'options.html', 'style.css', 'README.md']) files.set(`browser-extension/${file}`, path.join(built, file));
for (const file of ['HeptaFloat.NativeHost.exe', 'host-version.json']) files.set(`native-host/${nativeVersion}/${file}`, path.join(nativeSource, file));
for (const file of ['install-native-host.ps1', 'diagnose-native-host.ps1', 'edge-native-diagnostics.ps1', 'edge-native-diagnostics.cmd']) files.set(`scripts/${file}`, path.join(root, 'scripts', file));
for (const file of ['NATIVE_MESSAGING.md', 'BROWSER_BRIDGE.md', 'DEEPLINK_TEST_RESULTS.md']) files.set(`docs/${file}`, path.join(root, 'docs', file));
const stage = path.join(root, 'dist/native-bridge', manifest.version, 'FlowHeptaBase-Native-Bridge');
await mkdir(stage, { recursive: true });
async function inspect(directory, prefix = '') {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const relative = `${prefix}${item.name}`;
    if (item.isDirectory() && [...files.keys()].some((name) => name.startsWith(`${relative}/`))) await inspect(path.join(directory, item.name), `${relative}/`);
    else if (!item.isFile() || (relative !== 'README.md' && !files.has(relative))) throw new Error('Unexpected files in this bundle output; preserve and inspect them.');
  }
}
await inspect(stage);
for (const [relative, sourceFile] of files) {
  const destination = path.join(stage, relative);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(sourceFile, destination);
}
await writeFile(path.join(stage, 'README.md'), `# Flow HeptaBase Native Bridge ${manifest.version} — Windows x64

本包包含 Edge 插件及本機橋接，不包含桌面程式。請先安裝受管理的 HeptaFloat win.7。

1. 解壓縮至會保留的位置，在 Edge 開發人員模式「載入解壓縮」選取本包的 browser-extension 資料夾，複製實際的 32 字元插件 ID。
2. 在本包根目錄以目前 Windows 帳號執行：

\`\`\`powershell
powershell.exe -NoProfile -File .\\scripts\\install-native-host.ps1 -Action Install -ExtensionId '你的32字元插件ID'
\`\`\`

安裝僅寫目前帳號的 Edge NativeMessagingHosts 及其官方 Google Chrome 備援 key，兩者指向同一份 host manifest，只允許這個 ID 傳遞合法 space/card UUID。沒有網路服務，不更改 HTTP(S) 預設、不讀取卡片內容。Chrome 瀏覽器／插件尚未獨立實測。

更新時沿用同一個插件資料夾並重新載入；新增的 nativeMessaging 權限可能要求重新啟用。換資料夾可能改變插件 ID，請依 docs/NATIVE_MESSAGING.md 重新安裝 host。

預設只有 flowhepta=1 標記連結進入橋接，未標記連結仍開網頁。每次開啟使用完整桌面卡片新窗。Host 接受請求不等於卡片已顯示，實際驗收界線見 docs/DEEPLINK_TEST_RESULTS.md。

成功送出開卡請求後預設自動關閉中繼頁；失敗時保留頁面與重試。可在橋接設定關閉自動關頁，保留可用的 host 與桌面程式。

\`\`\`powershell
powershell.exe -NoProfile -File .\\scripts\\install-native-host.ps1 -Action Status
powershell.exe -NoProfile -File .\\scripts\\install-native-host.ps1 -Action Rollback
powershell.exe -NoProfile -File .\\scripts\\install-native-host.ps1 -Action Uninstall
\`\`\`

回退／移除保留 HeptaFloat、設定、recovery 與筆記。停用插件即可恢復一般 HTTPS。詳見 docs/NATIVE_MESSAGING.md。
`, 'utf8');
const zip = path.join(root, 'dist', `FlowHeptaBase-Native-Bridge-${manifest.version}-windows-x64.zip`);
const quote = (value) => `'${value.replaceAll("'", "''")}'`;
execFileSync('powershell.exe', ['-NoProfile', '-Command', `Compress-Archive -LiteralPath ${quote(stage)} -DestinationPath ${quote(zip)} -Force`], { stdio: 'inherit', windowsHide: true });
await writeFile(`${zip}.sha256`, `${digest(await readFile(zip))}  ${path.basename(zip)}\n`);
console.log(`Packaged native bridge ${manifest.version} with frozen host ${nativeVersion}: ${zip}`);
