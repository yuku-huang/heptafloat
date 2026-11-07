# Architecture handoff

Deep Link pipeline: strict shared URL/intent module → main initial/second-instance queue → one sandboxed read-only preview → existing CLI/editor. Main editing remains separate. MV3 exact-host/top-frame navigation → own handoff → custom URI attempt/manual anchor, with canonical HTTPS + tab/card session bypass for fallback. No server, new framework, public redirector or extra authentication. `install-windows.ps1` explicitly manages HKCU handler/versioned files, original backup and safe rollback. See `docs/DEEPLINK.md` for limits and actual-vs-mock evidence.

Shared editor (`src/`) → platform-specific bridge → official Heptabase CLI.

Windows: `windows/main.cjs` manages native app state/protocols/IPC; `preload.cjs` is the isolated bridge; `cli.cjs` discovers and invokes the official bundle without a shell; `service.cjs` handles validated reads, serialized writes, temporary files, images, and recovery. `chrome.js` and `windows.css` provide title-bar actions/settings.

macOS: `Sources/main.swift` and `build.sh` remain the original host/build. Shared shortcut helpers preserve macOS modifier behavior while enabling Ctrl on Windows.

Windows uses the Chromium native caret. The custom caret overlay is macOS-only. `commands.js` supplies code newline/indentation and text-line Tab fallback after list commands; serialization keeps the same text/block schema. Native mock editor regression checks live in `windows/editor-smoke.cjs` and pure command tests in `test/editor-commands.test.mjs`.

Search adds `windows/search.cjs`: official paginated metadata + keyword results, five-minute memory cache, three workers, explicit partial-failure warnings. Navigation adds `src/navigation.js`: up to 100 session visits, committed after display, independent of persistent recents. Ctrl+O and Alt arrows work across editor/toolbar/picker outside settings and IME composition. See architecture and data-schema docs for result shape and limits.

Detailed security/data flow: `../ARCHITECTURE.md`. No custom server, direct Heptabase storage access, or unrelated workspace changes are required.
