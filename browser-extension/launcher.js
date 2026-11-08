// Browser API completion is not an acknowledgement from the desktop app.
export function launchError(error) {
  return String(error?.message || '瀏覽器拒絕開啟請求。')
    .replace(/(?:https?|flowhepta|chrome-extension):\/\/[^\s"'<>]+/gi, '[連結]')
    .replace(/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}/gi, '[ID]').slice(0, 280);
}

export function createLauncher({ open, isForeground, report }) {
  let enabled = false, automaticDone = false, pending = false, sequence = 0;
  function attempt(mode) {
    if (pending) return Promise.resolve(false);
    pending = true;
    const request = ++sequence;
    report({ phase: 'requesting', mode });
    let result;
    // Dispatch the automatic attempt immediately when the page is foreground.
    try { result = open(); } catch (error) { result = Promise.reject(error); }
    return Promise.resolve(result).then(() => {
      if (request === sequence) report({ phase: 'sent', mode });
      return true;
    }, (error) => {
      if (request === sequence) report({ phase: 'error', mode, error: launchError(error) });
      return false;
    }).finally(() => { if (request === sequence) pending = false; });
  }
  function foreground() {
    if (!enabled || automaticDone || pending || !isForeground()) return Promise.resolve(false);
    automaticDone = true;
    return attempt('automatic');
  }
  return {
    enableAuto(value) { enabled = value === true; return foreground(); },
    foreground,
    manual() { automaticDone = true; return attempt('manual'); },
    pause() { enabled = false; automaticDone = true; ++sequence; pending = false; },
  };
}
