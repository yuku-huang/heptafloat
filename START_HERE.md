# Start here

Bridge continuation: app win.7 is unchanged; extension 1.0.2 restores native manual-link navigation, delivered separately with `npm run package:extension`. Read `docs/BROWSER_BRIDGE.md` for reload/version checks. Normal win.7 is now active; independent OS opening and its full card toolbar were observed. User-confirmed Discord→handoff does not prove app launch; 1.0.2 prompt/card acceptance remains pending. Platform URL policy blocks Agent input to internal extension pages. Do not repeat the old tray-Quit request for this bridge-only update.

This checkout adds Windows support to upstream HeptaFloat `f32f34f` (0.9.12).

Current version: `0.9.12-win.7`. The user explicitly replaced the old read-only/reused preview with a new complete card window per link. Editing/history/pin and recovery/retry bases are window-specific; appearance/global shortcut/startup remain app preferences. Quit the previous tray process first, or its single-instance lock keeps the older release active. Browser external launch and Discord Desktop acceptance remain unresolved; see `docs/DEEPLINK_TEST_RESULTS.md`.

Editor update: `/code` uses the native Windows caret, language selector and syntax decorations; Tab/Shift+Tab indent selected lines and Enter preserves indentation. `npm test` runs 62 focused tests; `npm run test:preview` tests full editable card windows, independent pin, targeted autosave, search/history, code language save, conflict copies and close/quit guards with mock notes only. `docs/DEEPLINK.md` covers extension loading, protocol installation and rollback; Bot integration is a separate example under `integrations/discord`.

1. Read `docs/WINDOWS.md` for portable-app usage, setup, and limits.
2. Run `npm ci`, `npm test`, and `npm run test:windows` on Windows.
3. Run `npm run start:windows` to use the real Heptabase connection.
4. Run `npm run package:windows` to create the x64 portable distribution.
5. Read `ARCHITECTURE.md` and `AGENT_CONTEXT/` before continuing development.

The workspace containing this checkout is not itself a Git repository. Keep source commits inside this nested `heptafloat` repository; do not add surrounding personal data. The original `origin` is `madeyexz/heptafloat`; verified access is read-only. Push requires a writable fork/remote.
