const { spawn } = require('node:child_process');
const path = require('node:path');
const env = { ...process.env };
// IDEs may themselves be Electron processes. Do not accidentally start in Node mode.
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), [path.join(__dirname, '../build/windows'), ...process.argv.slice(2)],
  { env, stdio: 'inherit', windowsHide: true });
child.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
