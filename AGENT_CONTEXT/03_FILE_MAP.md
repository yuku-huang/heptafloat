# File map

- `src/`: shared ProseMirror schema, editor, commands, menus, palette, platform helpers, fonts.
- `Sources/main.swift`, `build.sh`: upstream macOS host and build.
- `windows/main.cjs`: native window/tray/hotkey/settings, protocols and IPC.
- `windows/preload.cjs`: isolated renderer bridge.
- `windows/cli.cjs`: official Windows CLI discovery and shell-free invocation.
- `windows/service.cjs`: read/save/create/image operations and recovery drafts.
- `windows/chrome.js`, `windows/windows.css`: Windows title bar and settings.
- `windows/smoke.cjs`, `test/windows.test.mjs`: isolated native smoke and unit tests.
- `scripts/`: repeatable setup, build, run, and packaging.
- `assets/AppIcon.ico`: Windows icon converted from the upstream PNG.
- `docs/WINDOWS.md`: operator guide and acceptance limits.
- `.github/workflows/windows.yml`: Windows CI build/test/package definition.
- `build/`, `dist/`, `node_modules/`: generated and ignored.
