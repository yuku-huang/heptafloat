# HeptaFloat for Windows

Version: `0.9.12-win.6` · Windows 10/11 x64 · based on upstream `f32f34f`.

## Run the portable app

1. Quit the previous HeptaFloat from its tray menu, then extract `HeptaFloat-0.9.12-win.6-windows-x64.zip` to a permanent folder.
2. Open `HeptaFloat-win32-x64/HeptaFloat.exe`. Keep the accompanying files beside it.
3. Keep Heptabase running and enable **Settings → AI Features → CLI**. An active Heptabase subscription is required by its CLI.
4. Press **Ctrl+Alt+J** to show/hide the floating journal. Closing the window hides it to the system tray; choose **Quit HeptaFloat** in the tray menu to exit.

The app requires no separate Node.js installation. This development build is unsigned and is not an upstream Windows release. Portable editing needs no registry/service installation. Optional `flowhepta` registration is explicit and per-user: see `docs/DEEPLINK.md` (included alongside this guide in the distribution). Browser/Discord bridging remains experimental; actual unresolved checks are in `DEEPLINK_TEST_RESULTS.md`. Launch at login is off by default and can be enabled explicitly in Settings after placing the app in its permanent location. Turn it off before moving/deleting that folder.

## Features and shortcuts

Each `/code` block has a language selector (31 choices, including Python, C++, Verilog and plain text). Selecting a language enables syntax colors without changing code. Undo restores the previous language separately from typing. The win.6 package includes this update.

| Action | Windows shortcut |
| --- | --- |
| Show/hide from any application | Ctrl+Alt+J (configurable in Settings) |
| Search / recent cards / all actions | Ctrl+O / Ctrl+P / Ctrl+K |
| New card / today's journal | Ctrl+N / Ctrl+Shift+D |
| Back / forward through viewed cards | Alt+Left / Alt+Right (Ctrl+[ / Ctrl+] also work) |
| Pin current card in recents | Ctrl+. |
| Keep window on top | Ctrl+Shift+P |
| Settings | Ctrl+, |
| Open current card in Heptabase | Ctrl+Shift+O |
| Bold / italic / underline | Ctrl+B / Ctrl+I / Ctrl+U |
| Undo / redo | Ctrl+Z / Ctrl+Y |
| Indent / outdent selected lines | Tab / Shift+Tab |
| New line / soft break | Enter / Shift+Enter |
| Text size | Ctrl+= / Ctrl+- / Ctrl+0 |
| Hide window | Esc (first closes any open menu) |

The original ProseMirror editor provides slash commands, card mentions, lists, checkboxes, headings, links, image paste/drop, 600 ms autosave, 3 s polling while visible, and local-date journal rollover. The host exports/imports supported images through the official CLI. A new empty card is only created in Heptabase after typing. Theme, size, window position, shortcut, and recent cards persist between runs.

### Type and indent code

Type `/code` and choose **Code block**. **Enter** inserts one newline and keeps the current line's indentation. **Tab** adds four spaces at the start of the current or selected lines; **Shift+Tab** removes one level (a tab character or up to four spaces). Selecting multiple lines changes them together; a selection ending exactly at the following line's start leaves that line alone. Undo/redo works on these edits.

Ordinary paragraphs support text indentation too. List items keep their existing structural nesting when a parent item is available. **Shift+Enter** creates a soft break in prose, and a newline inside code. Windows uses the native text caret: the old macOS caret overlay could remain one line behind after code Enter and move down when typing resumed, making one newline look like two. The code content is checked separately from the cursor display.

### Find and navigate cards

Press **Ctrl+O** while HeptaFloat is focused, or click the magnifying glass. The empty search lists 20 recently edited cards from Heptabase. Type a title or keyword, use Up/Down to select, and press Enter to open it. Ctrl+Enter opens it in Heptabase. Ctrl+P searches only cards previously opened in HeptaFloat.

Search combines the official CLI's content results with a local, in-memory title comparison. This fixes full Chinese titles with punctuation that the official keyword search can miss. Exact titles rank first; spaces separate title terms. Available matches appear immediately after keyword lookup; title matches are added automatically as metadata loads in the background. A progress count distinguishes incomplete search from a confirmed empty result. Large libraries may need a few minutes the first time; metadata is reused for five minutes and old matches remain usable during background refresh. Saves/new cards invalidate the cache. Up to 50 matches are displayed; narrow the query for more specific results. Search failures show their reason and a Retry button, rather than an empty result list. If only one search source is available, its results have a warning.

**Alt+Left / Alt+Right** follow the cards actually viewed in this app session, independent of pinned/recent ordering. Opening another card after going back discards the forward branch. Empty drafts are skipped; new saved cards join the history. Up to 100 visits are kept in memory and reset on restart. These shortcuts work from the editor, toolbar, and card picker; close Settings before using them. The macOS host retains its original Command-bracket recents navigation.

Windows does not implement the MacBook notch, macOS updater, per-command shortcut recorder, or the optional automatic link from each new card into today's journal. Windows updates are manual: quit, extract the next build, and run it. The original macOS host/build remain present.

## Data and recovery

- Preferences/recent cards: `%APPDATA%\HeptaFloat\state.json`. Title-search metadata and back/forward visits are memory-only.
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

`test:windows` uses an isolated profile and mock CLI; it never writes real Heptabase notes. `test:windows:live` reads today's real journal and an existing note, searches its full title, exercises Ctrl+O and Alt navigation, then compares content hashes without writes or screenshots. It also lists card metadata through the official CLI for title search. Reports contain only counts/booleans, not private titles or bodies. Tests use Control+Alt+Shift+F24 (mock) / F23 (live) to avoid the normal app shortcut. Reports/images go under ignored `build/`. Unit tests use ignored `build/test-tmp/` to avoid Windows path-length issues.

Packaging produces `dist/0.9.12-win.6/HeptaFloat-win32-x64/HeptaFloat.exe`, a ZIP at `dist/HeptaFloat-0.9.12-win.6-windows-x64.zip`, and a SHA-256 sidecar, including the unpacked MV3 extension, installer and Deep Link guides. Versioned output folders avoid replacing an older running app; rebuilding the same version checks for running executables first and asks you to quit that version. Extract the entire ZIP, not just the EXE. `package-lock.json` pins the Windows build; `bun.lock` remains the upstream macOS dependency lock. `build.sh` remains the macOS build entrypoint.

## Validation boundaries

Validated locally: 47 unit tests cover editing/languages, guarded official CLI access/search/history, strict links and the MV3 bridge logic. Native editor/preview smoke and actual installed-protocol results are separated in `docs/DEEPLINK_TEST_RESULTS.md`. Real-note integration checks remain read-only; simulated browser APIs do not prove Discord or browser external-launch acceptance.

Real note mutation/image import, physical Chinese IME interaction, multi-monitor/DPI transitions, reboot/login startup, and Windows 10 hardware acceptance still need a user acceptance pass. macOS native compilation is not available on this Windows machine. CI configuration is provided; it has not run remotely until the branch is pushed to a writable repository.

## Troubleshooting

- Connection checklist: open Heptabase, enable its CLI, and run `heptabase --version` in PowerShell. This port was verified against CLI `0.7.0`.
- CLI discovery: the official registered `%USERPROFILE%\.heptabase\bin\heptabase.cmd` or a registered shim on PATH must contain absolute `heptabaseCliRuntimePath` and `heptabaseCliScriptPath` entries. Re-register the CLI in Heptabase if installation paths change. The port invokes those paths without a shell.
- Shortcut conflict: open Settings from the tray and choose a free combination. A failed shortcut registration is reported rather than replacing another application's shortcut.
- CLI error or unsaved text: leave HeptaFloat open while reconnecting. Recovery JSON is private local content; do not commit it or upload it in a bug report.

Upstream: <https://github.com/madeyexz/heptafloat> · MIT license retained.
