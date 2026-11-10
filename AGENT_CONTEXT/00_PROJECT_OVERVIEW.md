# Project overview

2026-11-10 desktop win.8: Windows Ctrl+L copies the displayed card, card chips/valid card URLs navigate directly within their window, Alt+Left/Right returns/advances, and the hover dropdown has only the Heptabase action. External links entering through the browser/OS still open new complete windows. Source 80/80 and development/packaged mock-card input tests pass; actual installed activation is recorded in current status. Bridge 1.1.1/native host 1.0.0 remain unchanged.

Bridge 1.1.1 uses the approved P2 exact-origin current-user host and adds requested auto-close after native acceptance. Errors keep the handoff. Seventy-seven tests pass; the user reloaded and verified Discord/Edge opening plus page closure, independently matched by new-window/tab metadata. Edge's measured successful Google Chrome fallback key is now receipt-managed together with its primary key. Source/host/installer/human evidence remains separately recorded.

Current win.7 behavior: every deep link opens a new complete editable card window, with independent pin/history/buffers and the same toolbar/commands as the primary journal. This explicit user revision supersedes the earlier read-only/reuse preview specification. Browser/Discord external launch remains a separate unresolved acceptance item.

Windows port of MIT-licensed HeptaFloat, based on upstream `f32f34f` / macOS 0.9.12. Reuse the original rich-text editor and official Heptabase CLI. The native Windows shell is Electron; no replacement web backend is needed.

Product goal: a persistent, editable Heptabase journal/card floating above Windows applications, available from one global shortcut and the system tray.

Local versions: app `0.9.12-win.7`, extension `1.1.1`, native host `1.0.0`. Desktop/native binaries remain frozen. Chrome-browser/device regressions and the external Bot deployment are separate unfinished scopes. Start at `START_HERE.md`, `docs/NATIVE_MESSAGING.md`, `docs/DEEPLINK.md` and the test-results matrix.
