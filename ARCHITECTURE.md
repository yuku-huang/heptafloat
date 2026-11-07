# Architecture

HeptaFloat shares one ProseMirror editor between the original macOS Swift host and the Windows Electron host.

Code blocks use `src/code-block.js`: a NodeView with a non-editable language selector and a lowlight decoration plugin. Existing `attrs.params` carries `[!]<language>[:displayMode]`; unknown values and the wrap flag are preserved. Highlighting never changes text/marks or serializes spans, caches immutable nodes, and skips code over 100,000 UTF-16 units. Pinned lowlight/highlight.js dependencies include their license notices in both build paths. Language changes form a separate undo step.

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

Editing commands in `src/commands.js` handle code Enter as a single newline transaction with the current indentation. Tab/Shift+Tab first try list nesting, then add/remove four leading spaces for text/code lines; no new block attributes are persisted. Shift+Enter creates an inline break in prose. Only the macOS WebKit host uses `caretPlugin`; Windows Chromium uses its native caret to keep code newlines and IME cursor display in sync. `windows/editor-smoke.cjs` drives the real slash picker and native input paths using mock cards only.

The Windows preload exposes only `postMessage` and a filtered event subscription. IPC validates the sender main frame and the local `hf-app://ui/index.html` URL. The renderer has no Node integration, runs sandboxed with context isolation, and uses a restrictive CSP. App protocol paths are allowlisted; no arbitrary local-file protocol is exposed. External navigation is blocked and link opening is restricted to HTTP(S) and recognized Heptabase routes. All permission requests are denied by default.

`windows/cli.cjs` discovers the official Windows shim, reads its absolute runtime/bundle paths, and calls `execFile` with an argument array, `shell:false`, `windowsHide:true`, and a 12-second timeout. Electron's Node runtime mode runs the official CLI. Note JSON is passed in a temporary file, not interpolated into a shell. No HTTP backend, Python service, database patch, or unofficial Heptabase endpoint is introduced.

`windows/service.cjs` serializes note writes. Each attempted save is backed up before invoking the CLI and uses the last verified content MD5. It returns the fresh remote version for editor reconciliation. New-note creation returns the created ID even if the subsequent fill fails, preventing the renderer from making another card on retry. Temporary paths are owned by the request; exported file paths and image MIME types are checked.

Build: `scripts/build-windows.mjs` bundles the editor and stages a small app under `build/windows/`. `scripts/package-windows.mjs` packages a Windows x64 app under `dist/<version>/`, embeds the ICO, creates a portable ZIP, and computes its SHA-256. It checks for a running executable at the target path before replacing a same-version output. Older running versions stay in separate folders. Electron is an additional native host dependency; the upstream editor and macOS host are retained. No server framework was added.

Windows search: `service.cjs` delegates to `search.cjs`, which combines official keyword search with metadata title matching (NFKC normalization, case folding, all whitespace-separated terms). Metadata uses `card list --limit 100 --offset N`, all official card types, three page workers, a shared in-flight promise, and a five-minute memory cache. Each completed page is available to queries immediately. The palette refreshes incomplete results every second while preserving the selected card; native keyword results are cached for ten seconds (at most 100 queries). Background indexing schedules work for at most 180 seconds; each active CLI process retains its 12-second bound. Queries do not wait for the full index. Failed/partial sources are surfaced, and indexing progress cannot masquerade as a confirmed empty result. Empty search lists 20 recently edited cards and warms the index. Saves/creates invalidate caches; no private titles or bodies are persisted by search. Results deduplicate by id, rank exact titles first, and cap at 50.

`src/navigation.js` tracks up to 100 session visits for Windows. The renderer commits history only after displaying a card; failed/stale navigation cannot move the cursor. New visits discard forward history. Ctrl+O and Alt+Left/Right are handled at document level outside modal settings and IME composition. macOS retains its recents-based navigation. The palette invalidates delayed results on close/mode changes and distinguishes loading, errors, warnings and successful empty results.

See `AGENT_CONTEXT/07_DATA_SCHEMA.md` for persisted formats and `AGENT_CONTEXT/08_QA_PIPELINE.md` for verification boundaries.
