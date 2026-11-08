# Project overview

Bridge 1.1.0 implements the explicitly approved P2 Native Messaging path independently of app win.7. Its current-user exact-origin host is installed and an independent framed-host request opened the correct card. Source/EXE/lifecycle tests pass; actual Edge 1.1.0 currently reports host not found, so marked browser/Discord delivery is not accepted. Unmarked Discord→Edge passed earlier. See the current results matrix before continuing.

Current win.7 behavior: every deep link opens a new complete editable card window, with independent pin/history/buffers and the same toolbar/commands as the primary journal. This explicit user revision supersedes the earlier read-only/reuse preview specification. Browser/Discord external launch remains a separate unresolved acceptance item.

Windows port of MIT-licensed HeptaFloat, based on upstream `f32f34f` / macOS 0.9.12. Reuse the original rich-text editor and official Heptabase CLI. The native Windows shell is Electron; no replacement web backend is needed.

Product goal: a persistent, editable Heptabase journal/card floating above Windows applications, available from one global shortcut and the system tray.

Local versions: app `0.9.12-win.7`, extension `1.1.0`, native host `1.0.0`. Direct OS/host routing is verified separately; browser/Discord delivery remains unresolved. Start at `START_HERE.md`, `docs/NATIVE_MESSAGING.md`, `docs/DEEPLINK.md` and the test-results matrix.
