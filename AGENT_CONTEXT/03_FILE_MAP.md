# File map

- `shared/hepta-links.cjs`, `test/hepta-links.test.mjs`: strict HTTPS/custom URI/IPC intent and marker utility.
- `windows/preview.js`, `windows/preview-smoke.cjs`: preview-only chrome and native sample-card regressions.
- `browser-extension/`: MV3 worker, pure bridge, handoff/options UI and scoped manifest; `test/browser-bridge.test.mjs` tests behavior with explicit API doubles.
- `scripts/build-browser-extension.mjs`: repeatable extension bundle; `scripts/install-windows.ps1`, `scripts/test-protocol-install.ps1`: per-user install/rollback and actual HKCU lifecycle QA.
- `docs/DEEPLINK.md`, `docs/DEEPLINK_TEST_RESULTS.md`, `integrations/discord/README.md`: operator flow, honest acceptance matrix and external-Bot patch example.

- `src/code-block.js`, `test/code-block.test.mjs`, `windows/code-language-smoke.cjs`: language NodeView/highlight decorations and pure/native regression coverage.

- `src/`: shared ProseMirror schema, editor, commands, menus, palette, platform helpers, fonts.
- `src/navigation.js`: Windows session card history, including pending navigation.
- `Sources/main.swift`, `build.sh`: upstream macOS host and build.
- `windows/main.cjs`: native window/tray/hotkey/settings, protocols and IPC.
- `windows/preload.cjs`: isolated renderer bridge.
- `windows/cli.cjs`: official Windows CLI discovery and shell-free invocation.
- `windows/service.cjs`: read/save/create/image operations and recovery drafts.
- `windows/search.cjs`: official keyword search plus paginated title-metadata cache.
- `windows/chrome.js`, `windows/windows.css`: Windows title bar and settings.
- `windows/smoke.cjs`, `test/windows.test.mjs`: isolated native smoke and unit tests.
- `windows/editor-smoke.cjs`, `test/editor-commands.test.mjs`: native `/code`/keyboard/composition/save tests and pure editing-command regressions.
- `scripts/`: repeatable setup, build, run, and packaging.
- `assets/AppIcon.ico`: Windows icon converted from the upstream PNG.
- `docs/WINDOWS.md`: operator guide and acceptance limits.
- `.github/workflows/windows.yml`: Windows CI build/test/package definition.
- `build/`, `dist/`, `node_modules/`: generated and ignored.
