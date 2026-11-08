# File map

- `docs/NATIVE_MESSAGING_PROPOSAL.md`: unimplemented P2 scope, permissions, maintenance/rollback and verification; requires additional user approval before host/extension changes.
- `scripts/install-windows.ps1`: current source manager includes `Refresh`, association-change notifications and native Windows API status; `scripts/test-protocol-install.ps1` verifies refresh/idempotence/API during actual lifecycle QA. Frozen win.7 ZIP still has the prior manager.

- `shared/hepta-links.cjs`, `test/hepta-links.test.mjs`: strict HTTPS/custom URI/IPC intent and marker utility.
- `windows/chrome.js`, `windows/preview-smoke.cjs`: shared complete window chrome and native multi-window/pin/save/conflict/close regressions; old read-only preview assets removed.
- `browser-extension/`: MV3 worker/bridge/scoped manifest; `launcher.js` controls foreground/one-shot/cancel behavior; `handoff.js` leaves manual protocol anchors native. `test/browser-bridge.test.mjs` and `test/browser-launcher.test.mjs` use explicit API/DOM doubles.
- `scripts/package-browser-extension.mjs`, `docs/BROWSER_BRIDGE.md`: standalone versioned extension ZIP/update/rollback. `integrations/discord/card-link.cjs` is an optional external-Bot Markdown helper, not a deployed Bot.
- `scripts/build-browser-extension.mjs`: repeatable extension bundle; `scripts/install-windows.ps1`, `scripts/test-protocol-install.ps1`: per-user install/rollback and actual HKCU lifecycle QA.
- `scripts/observe-protocol-launch.ps1`: optional read-only, bounded process sampler; records argument presence rather than raw URI/content, preserves existing reports and does not configure handlers or terminate apps.
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
- `scripts/`: repeatable setup, build, run, and packaging. `package-windows.mjs --stage-only` freezes the runtime for QA; `--archive-only` refreshes guides/distribution files and ZIP without rebuilding that runtime.
- `assets/AppIcon.ico`: Windows icon converted from the upstream PNG.
- `docs/WINDOWS.md`: operator guide and acceptance limits.
- `.github/workflows/windows.yml`: Windows CI build/test/package definition.
- `build/`, `dist/`, `node_modules/`: generated and ignored.
