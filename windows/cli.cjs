// Invoke the official bundled CLI directly, never interpolate note text into cmd.exe.
const { execFile } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

function parseShim(text) {
  const runtime = text.match(/^\s*set\s+"heptabaseCliRuntimePath=([^"\r\n]+)"\s*$/im)?.[1];
  const script = text.match(/^\s*set\s+"heptabaseCliScriptPath=([^"\r\n]+)"\s*$/im)?.[1];
  if (!runtime || !script || !path.win32.isAbsolute(runtime) || !path.win32.isAbsolute(script)
    || /[%!]/.test(runtime + script) || !/\.exe$/i.test(runtime) || !/\.cjs$/i.test(script)) return null;
  return { runtime, script };
}

async function discoverCli(env = process.env) {
  const home = env.USERPROFILE || os.homedir();
  const candidates = [path.join(home, '.heptabase', 'bin', 'heptabase.cmd'),
    ...(env.PATH || '').split(path.delimiter).filter(Boolean).map((p) => path.join(p, 'heptabase.cmd'))];
  for (const shim of new Set(candidates)) {
    try {
      const found = parseShim(await fs.readFile(shim, 'utf8'));
      if (!found) continue;
      await fs.access(found.runtime); await fs.access(found.script);
      return found;
    } catch { /* Try the next registered official shim. */ }
  }
  throw new Error('Heptabase CLI is off or missing. Enable CLI in Heptabase → Settings → AI Features.');
}

async function discoverApp(env = process.env) {
  try { return (await discoverCli(env)).runtime; } catch {}
  const candidates = [env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, 'Programs', 'project-meta', 'Heptabase.exe'),
    env.ProgramFiles && path.join(env.ProgramFiles, 'Heptabase', 'Heptabase.exe'),
    env.ProgramFiles && path.join(env.ProgramFiles, 'project-meta', 'Heptabase.exe')].filter(Boolean);
  for (const candidate of candidates) {
    try { await fs.access(candidate); return candidate; } catch {}
  }
  return null;
}

function friendly(raw) {
  const text = String(raw || '').trim();
  if (/md5|conflict/i.test(text)) return 'Changed in Heptabase since the last save.';
  if (/subscription/i.test(text)) return 'Heptabase CLI needs an active Heptabase subscription.';
  if (/cannot connect|not running|econnrefused/i.test(text)) return "Can't reach Heptabase — open Heptabase to keep syncing.";
  if (/trashed/i.test(text)) return "This card is in Heptabase's trash.";
  return text.slice(0, 400) || 'Heptabase returned an empty response.';
}

function parseOutput(stdout, stderr, error) {
  let result, failure;
  try { result = JSON.parse(stdout); } catch {}
  try { failure = JSON.parse(stderr); } catch {}
  if (result?.error || failure?.error) throw new Error(friendly(result?.error || failure.error));
  if (error) throw new Error(error.killed ? 'Heptabase timed out. Your draft is kept locally.' : friendly(stderr || stdout || error.message));
  if (!result || typeof result !== 'object') throw new Error('Heptabase returned invalid JSON.');
  return result;
}

class OfficialCli {
  constructor(resolve = discoverCli) { this.resolve = resolve; }
  async run(args) {
    const { runtime, script } = await this.resolve();
    return new Promise((resolve, reject) => {
      execFile(runtime, [script, ...args], {
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, windowsHide: true,
        shell: false, timeout: 12_000, maxBuffer: 16 * 1024 * 1024, encoding: 'utf8',
      }, (error, stdout, stderr) => {
        try { resolve(parseOutput(stdout, stderr, error)); } catch (e) { reject(e); }
      });
    });
  }
}
module.exports = { OfficialCli, discoverCli, discoverApp, parseShim, parseOutput, friendly };
