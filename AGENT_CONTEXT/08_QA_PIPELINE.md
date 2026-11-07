# QA pipeline

Language update: 38 unit tests now include params/aliases/wrap/unknown values, block identity, every bundled grammar, Unicode/literal HTML, decoration updates and the large-code guard. `windows/code-language-smoke.cjs` checks keyboard and mouse selection, independent undo, Python/C++/Verilog colors, highlighted code Enter/IME, mock save/reopen and literal HTML safety. `build/windows-code-language.png` contains sample data only.

Editor regression coverage (2026-11-08): `npm test` runs 30 tests across `test/windows.test.mjs` and `test/editor-commands.test.mjs`. The mock UI includes `windows/editor-smoke.cjs`: real `/code` conversion, native Windows caret, Enter followed by English/Chinese text, Chromium composition, single-/multi-line Tab and Shift+Tab, undo/redo, Shift+Enter, and persisted-code readback. Autosave waits for another mock write, not an old Saved label. Assertions and screenshots use sample data only; real card writes and physical Windows IME remain separate acceptance items.

Chromium composition is sent through Electron's [debugger API](https://www.electronjs.org/docs/latest/api/debugger) using the official [Input protocol](https://github.com/ChromeDevTools/devtools-protocol/blob/master/json/browser_protocol.json). The mock-only window is briefly shown for current compositor frames; no debugger is attached during normal use or live-private-note validation.

1. `npm ci`: restore pinned dependencies (Electron runtime may download on first use).
2. `npm test`: CLI shim discovery/argument safety, errors/timeouts, guarded save/readback, conflicts, offline recovery, partial create, serialization, path checks, modifiers, schema roundtrip.
3. `npm run test:windows`: real Electron with mock CLI + isolated temporary profile; checks sandbox/no Node, rendering, Unicode insertion/autosave, new notes, Ctrl palette switching, pinning, settings, and close-to-tray. Captures sample-data-only preview images and a JSON report under `build/`.
4. `npm run test:windows:live`: optional read-only real Heptabase check; never writes notes or saves private screenshots. Requires running Heptabase with CLI enabled.
5. `npm run package:windows`: portable EXE directory, ZIP, SHA-256. Run the packaged executable with `--smoke-test` and `--live-smoke` for artifact validation too.
6. Human acceptance: physical IME, external-app global hotkey, file/image writes, multi-monitor/DPI, Windows startup and Windows 10 hardware. Native macOS build requires a Mac.

The root `build/` and `dist/` are ignored. Do not run upstream `test/save-noop.js` on private journals as a routine check: it performs a real save. This project has no QA/RAG model pipeline; this file documents application QA and CLI integration boundaries.

Large-library check: a deferred metadata page must yield `indexing:true` without blocking initial matches, then make its title findable when loaded. Live smoke waits for index completion and reports only card count/completion duration; this distinguishes native-only fallback from a functioning full title index.

Search/navigation regression checks: 20 unit tests now include page-two/full-width Chinese title matching, native-content merge, index reuse/invalidation/concurrency, failure/retry, and actual visit history (rapid/failing navigation and empty drafts). Mock UI uses Ctrl+O from toolbar focus, opens two cards by full title, traverses Alt arrows, verifies forward truncation, error/retry and stale-search suppression, then rechecks autosave/new-note history. Live UI reads/searches an existing note and traverses journal/note history, comparing pre/post MD5s. Logs contain no private titles or bodies. QA hotkeys are separate from Control+Alt+J; mock/live should still run sequentially when rebuilding the shared staging directory.
