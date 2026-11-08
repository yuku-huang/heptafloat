# File map

- `browser-extension/bridge.js`, `handoff.js`, `options.js/html`: 1.1.1 accepted-request auto-close preference and strict same-handoff sender/tab removal. Bridge/launcher tests cover native failure retention, stale cancellation, setting persistence and arbitrary-tab refusal.

- `native-host/Program.cs`: bounded exact-origin stdio host, receipt-owned fixed EXE launch and child-handle isolation.
- `scripts/build-native-host.ps1`, `test/native-host.test.mjs`: built-in C# compiler and six actual host-EXE regression groups using fake desktop applications.
- `scripts/install-native-host.ps1`, `scripts/test-native-host-install.ps1`: current-user immutable host versions, exact extension origin and actual HKCU lifecycle QA.
- `scripts/package-native-bridge.mjs`, `docs/NATIVE_MESSAGING.md`: combined native-host/extension delivery, setup, status, rollback and removal. `docs/NATIVE_MESSAGING_PROPOSAL.md` preserves the approved original P2 plan.
- `scripts/probe-native-host-discovery.ps1`: temporary owned Chromium-fallback comparison for Edge discovery; restore after testing, never writes browser policies or HKLM.
- `scripts/diagnose-native-host.ps1`: read-only owned native registry/manifest/binary report. `scripts/edge-native-diagnostics.{cmd,ps1}`: manual existing-profile logging launcher with active-browser guard; no remote debugging, internal-page control or forced termination.
- `scripts/install-windows.ps1`: current source manager includes `Refresh`, association-change notifications and native Windows API status; `scripts/test-protocol-install.ps1` verifies refresh/idempotence/API during actual lifecycle QA. Frozen win.7 ZIP still has the prior manager.

- `shared/hepta-links.cjs`, `test/hepta-links.test.mjs`: strict HTTPS/custom URI/IPC intent and marker utility.
- `windows/chrome.js`, `windows/preview-smoke.cjs`: shared complete window chrome and native multi-window/pin/save/conflict/close regressions; old read-only preview assets removed.
- `browser-extension/`: MV3 worker/bridge/scoped manifest; `native.js` sends UUID-only requests to the fixed host; `launcher.js` controls foreground/one-shot/coalesce/cancel behavior. `handoff.js` uses native messaging first and retains a separate native protocol anchor. `test/browser-bridge.test.mjs` and `test/browser-launcher.test.mjs` use explicit API/DOM doubles.
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
