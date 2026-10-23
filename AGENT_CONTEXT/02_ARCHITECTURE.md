# Architecture handoff

Shared editor (`src/`) → platform-specific bridge → official Heptabase CLI.

Windows: `windows/main.cjs` manages native app state/protocols/IPC; `preload.cjs` is the isolated bridge; `cli.cjs` discovers and invokes the official bundle without a shell; `service.cjs` handles validated reads, serialized writes, temporary files, images, and recovery. `chrome.js` and `windows.css` provide title-bar actions/settings.

macOS: `Sources/main.swift` and `build.sh` remain the original host/build. Shared shortcut helpers preserve macOS modifier behavior while enabling Ctrl on Windows.

Search adds `windows/search.cjs`: official paginated metadata + keyword results, five-minute memory cache, three workers, explicit partial-failure warnings. Navigation adds `src/navigation.js`: up to 100 session visits, committed after display, independent of persistent recents. Ctrl+O and Alt arrows work across editor/toolbar/picker outside settings and IME composition. See architecture and data-schema docs for result shape and limits.

Detailed security/data flow: `../ARCHITECTURE.md`. No custom server, direct Heptabase storage access, or unrelated workspace changes are required.
