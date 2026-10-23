# HeptaFloat for Windows

Version: `0.9.12-win.1` · Windows 10/11 x64 · based on upstream `f32f34f`.

## Run the portable app

1. Extract `HeptaFloat-0.9.12-win.1-windows-x64.zip` to a permanent folder.
2. Open `HeptaFloat-win32-x64/HeptaFloat.exe`. Keep the accompanying files beside it.
3. Keep Heptabase running and enable **Settings → AI Features → CLI**. An active Heptabase subscription is required by its CLI.
4. Press **Ctrl+Alt+J** to show/hide the floating journal. Closing the window hides it to the system tray; choose **Quit HeptaFloat** in the tray menu to exit.

The app requires no separate Node.js installation. This development build is unsigned and is not an upstream Windows release. No registry/service installation is needed. Launch at login is off by default and can be enabled explicitly in Settings after placing the app in its permanent location. Turn it off before moving/deleting that folder.

## Features and shortcuts

| Action | Windows shortcut |
| --- | --- |
| Show/hide from any application | Ctrl+Alt+J (configurable in Settings) |
| Search / recent cards / all actions | Ctrl+O / Ctrl+P / Ctrl+K |
| New card / today's journal | Ctrl+N / Ctrl+Shift+D |
| Previous / next recent card | Ctrl+[ / Ctrl+] |
| Pin current card in recents | Ctrl+. |
| Keep window on top | Ctrl+Shift+P |
| Settings | Ctrl+, |
| Open current card in Heptabase | Ctrl+Shift+O |
| Bold / italic / underline | Ctrl+B / Ctrl+I / Ctrl+U |
| Undo / redo | Ctrl+Z / Ctrl+Y |
| Text size | Ctrl+= / Ctrl+- / Ctrl+0 |
| Hide window | Esc (first closes any open menu) |

The original ProseMirror editor provides slash commands, card mentions, lists, checkboxes, headings, links, image paste/drop, 600 ms autosave, 3 s polling while visible, and local-date journal rollover. The host exports/imports supported images through the official CLI. A new empty card is only created in Heptabase after typing. Theme, size, window position, shortcut, and recent cards persist between runs.

Windows does not implement the MacBook notch, macOS updater, per-command shortcut recorder, or the optional automatic link from each new card into today's journal. Windows updates are manual: quit, extract the next build, and run it. The original macOS host/build remain present.

## Data and recovery

- Preferences/history: `%APPDATA%\HeptaFloat\state.json`.
- Before each attempted save, content and its base hash are written atomically to `%APPDATA%\HeptaFloat\recovery\`. Successful saves with successful readback remove their corresponding draft.
- **Settings → Recovery drafts** opens this folder. Each JSON contains the target `kind`, `id`, `content` (ProseMirror JSON string), and usually `md5`. Preserve the JSON, compare it with the current card, and recover deliberately; do not blindly replay an old hash. Recovery is manual, not automatic on restart.
- Autosave failures retry while the app stays open. Quit waits for saves and keeps the app open if edits remain unsaved or text composition is active. The app does not save partially composed IME text.
- Concurrent Heptabase edits use the original editor's keep-both flow. Unknown base hashes are never replaced with an unchecked current remote hash.
- Recovery covers attempted saves. A forced termination before the 600 ms autosave starts can lose the newest keystrokes. It is not a full offline notes database.
- Scratch files under `%APPDATA%\HeptaFloat\temp\` are removed when each CLI operation completes; a forced process termination may leave scratch files. The app does not modify Heptabase's database, CLI shim, or application bundle.

## Build and verify

Requires Windows, Node.js 22+, npm, and network access for the first dependency/runtime download.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-windows.ps1 -Package
```

Or run individually from the repository:

```powershell
npm ci
npm test
npm run test:windows
npm run test:windows:live
npm run start:windows
npm run package:windows
```

`test:windows` uses an isolated profile and mock CLI; it never writes real Heptabase notes. `test:windows:live` reads today's real journal through the installed CLI and tests renderer integration without writes or screenshots. Reports/images go under ignored `build/`. Unit tests use ignored `build/test-tmp/` to avoid Windows path-length issues.

Packaging produces `dist/HeptaFloat-win32-x64/HeptaFloat.exe`, a ZIP, and a SHA-256 sidecar. Extract the entire ZIP, not just the EXE. `package-lock.json` pins the Windows build; `bun.lock` remains the upstream macOS dependency lock. `build.sh` remains the macOS build entrypoint.

## Validation boundaries

Validated locally: unit coverage of CLI invocation, Unicode, conflict/offline recovery, new-card fill failure, schema preservation, and platform shortcuts; native Electron smoke coverage of rendering, autosave/new-card with mock data, Ctrl palette switching, pinning, settings, close-to-tray, and registered global shortcut; live read-only Heptabase integration.

Real note mutation/image import, physical Chinese IME interaction, multi-monitor/DPI transitions, reboot/login startup, and Windows 10 hardware acceptance still need a user acceptance pass. macOS native compilation is not available on this Windows machine. CI configuration is provided; it has not run remotely until the branch is pushed to a writable repository.

## Troubleshooting

- Connection checklist: open Heptabase, enable its CLI, and run `heptabase --version` in PowerShell. This port was verified against CLI `0.7.0`.
- CLI discovery: the official registered `%USERPROFILE%\.heptabase\bin\heptabase.cmd` or a registered shim on PATH must contain absolute `heptabaseCliRuntimePath` and `heptabaseCliScriptPath` entries. Re-register the CLI in Heptabase if installation paths change. The port invokes those paths without a shell.
- Shortcut conflict: open Settings from the tray and choose a free combination. A failed shortcut registration is reported rather than replacing another application's shortcut.
- CLI error or unsaved text: leave HeptaFloat open while reconnecting. Recovery JSON is private local content; do not commit it or upload it in a bug report.

Upstream: <https://github.com/madeyexz/heptafloat> · MIT license retained.
