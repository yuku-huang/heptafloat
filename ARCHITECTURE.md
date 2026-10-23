# Architecture

HeptaFloat shares one ProseMirror editor between the original macOS Swift host and the Windows Electron host.

```text
src/editor.js + schema/commands/menus/palette/platform
  ├─ macOS: window.webkit → Sources/main.swift → official CLI
  └─ Windows: window.heptafloat → isolated preload → validated main IPC
       ├─ BrowserWindow / Tray / globalShortcut / nativeTheme
       ├─ state.json (preferences, bounds, recent cards)
       ├─ HeptabaseService → recovery JSON → official bundled CLI
       └─ hf-file protocol → official file export → bounded memory image cache
```

The renderer owns editing, per-card save queues, polling, conflict copies, IME composition, and date rollover. `src/platform.js` maps Mod to Ctrl on Windows and Command on Mac. Windows-only chrome is injected during build; the original macOS HTML remains usable.

The Windows preload exposes only `postMessage` and a filtered event subscription. IPC validates the sender main frame and the local `hf-app://ui/index.html` URL. The renderer has no Node integration, runs sandboxed with context isolation, and uses a restrictive CSP. App protocol paths are allowlisted; no arbitrary local-file protocol is exposed. External navigation is blocked and link opening is restricted to HTTP(S) and recognized Heptabase routes. All permission requests are denied by default.

`windows/cli.cjs` discovers the official Windows shim, reads its absolute runtime/bundle paths, and calls `execFile` with an argument array, `shell:false`, `windowsHide:true`, and a 12-second timeout. Electron's Node runtime mode runs the official CLI. Note JSON is passed in a temporary file, not interpolated into a shell. No HTTP backend, Python service, database patch, or unofficial Heptabase endpoint is introduced.

`windows/service.cjs` serializes note writes. Each attempted save is backed up before invoking the CLI and uses the last verified content MD5. It returns the fresh remote version for editor reconciliation. New-note creation returns the created ID even if the subsequent fill fails, preventing the renderer from making another card on retry. Temporary paths are owned by the request; exported file paths and image MIME types are checked.

Build: `scripts/build-windows.mjs` bundles the editor and stages a small app under `build/windows/`. `scripts/package-windows.mjs` packages a Windows x64 app, embeds the ICO, creates a portable ZIP, and computes its SHA-256. Electron is an additional native host dependency; the upstream editor and macOS host are retained. No server framework was added.

See `AGENT_CONTEXT/07_DATA_SCHEMA.md` for persisted formats and `AGENT_CONTEXT/08_QA_PIPELINE.md` for verification boundaries.
