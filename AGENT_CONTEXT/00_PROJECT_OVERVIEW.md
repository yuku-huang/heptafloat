# Project overview

Current win.7 behavior: every deep link opens a new complete editable card window, with independent pin/history/buffers and the same toolbar/commands as the primary journal. This explicit user revision supersedes the earlier read-only/reuse preview specification. Browser/Discord external launch remains a separate unresolved acceptance item.

Windows port of MIT-licensed HeptaFloat, based on upstream `f32f34f` / macOS 0.9.12. Reuse the original rich-text editor and official Heptabase CLI. The native Windows shell is Electron; no replacement web backend is needed.

Product goal: a persistent, editable Heptabase journal/card floating above Windows applications, available from one global shortcut and the system tray.

Local version: `0.9.12-win.6`, with code-language colors, Windows Deep Link/read-only preview and an experimental MV3 bridge. Direct OS protocol routing is verified; browser external launch/Discord acceptance remain unresolved. Start at `START_HERE.md`, `docs/WINDOWS.md`, `docs/DEEPLINK.md` and the test-results matrix.
