# QA pipeline

1. `npm ci`: restore pinned dependencies (Electron runtime may download on first use).
2. `npm test`: CLI shim discovery/argument safety, errors/timeouts, guarded save/readback, conflicts, offline recovery, partial create, serialization, path checks, modifiers, schema roundtrip.
3. `npm run test:windows`: real Electron with mock CLI + isolated temporary profile; checks sandbox/no Node, rendering, Unicode insertion/autosave, new notes, Ctrl palette switching, pinning, settings, and close-to-tray. Captures sample-data-only preview images and a JSON report under `build/`.
4. `npm run test:windows:live`: optional read-only real Heptabase check; never writes notes or saves private screenshots. Requires running Heptabase with CLI enabled.
5. `npm run package:windows`: portable EXE directory, ZIP, SHA-256. Run the packaged executable with `--smoke-test` and `--live-smoke` for artifact validation too.
6. Human acceptance: physical IME, external-app global hotkey, file/image writes, multi-monitor/DPI, Windows startup and Windows 10 hardware. Native macOS build requires a Mac.

The root `build/` and `dist/` are ignored. Do not run upstream `test/save-noop.js` on private journals as a routine check: it performs a real save. This project has no QA/RAG model pipeline; this file documents application QA and CLI integration boundaries.
