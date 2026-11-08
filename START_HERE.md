# Start here

Current bridge: 1.1.1 adds user-requested auto-close after native acceptance; errors, unknown preferences, disabled auto-close and alternate-route choices keep the handoff. Seventy-seven source tests pass, including 30 bridge cases. The user reloaded 1.1.1 and clicked an existing Discord card: the card opened and handoff disappeared. Independent native inventory found a new window with previous windows retained, and no new handoff tab remained. This is human-assisted Edge/Discord acceptance, separate from API/DOM negative tests.

Approved P2 host 1.0.0 is installed for the exact current Edge extension ID. Edge's documented Google Chrome fallback key was the measured successful difference; both keys now share one receipt/manifest/origin, with actual install/migration/upgrade/rollback/removal tests passing. Never adopt an unknown existing fallback key. Normal win.7, native binary and tested desktop ZIP stay unchanged. Reuse/reload the current extension folder; no desktop Quit or host rebuild is needed. Tool policy still prohibits internal extension-page input. The old protocol route remains a separate unresolved browser fallback. Follow `docs/NATIVE_MESSAGING.md` and `docs/DEEPLINK_TEST_RESULTS.md`.

This checkout adds Windows support to upstream HeptaFloat `f32f34f` (0.9.12).

Current desktop version: `0.9.12-win.7`. The user explicitly replaced the old read-only/reused preview with a new complete card window per link. Editing/history/pin and recovery/retry bases are window-specific; appearance/global shortcut/startup remain app preferences. When replacing the desktop runtime, quit its prior tray process first. Native browser/Discord success does not prove the retained external protocol or every device scenario; see the results matrix.

Editor update: `/code` uses the native Windows caret, language selector and syntax decorations; Tab/Shift+Tab indent selected lines and Enter preserves indentation. `npm test` runs 77 focused tests; `npm run test:preview` tests full editable card windows, independent pin, targeted autosave, search/history, code language save, conflict copies and close/quit guards with mock notes only. `docs/DEEPLINK.md` covers extension loading, protocol installation and rollback; Bot integration is a separate example under `integrations/discord`.

1. Read `docs/WINDOWS.md` for portable-app usage, setup, and limits.
2. Run `npm ci`, `npm test`, and `npm run test:windows` on Windows.
3. Run `npm run start:windows` to use the real Heptabase connection.
4. Run `npm run package:windows` to create the x64 portable distribution.
5. Read `ARCHITECTURE.md` and `AGENT_CONTEXT/` before continuing development.

Native bridge builds need the existing Windows .NET Framework compiler: `npm run test:native-host` builds/tests before installation. Freeze that binary, then `npm run package:native-bridge`. Do not rebuild and overwrite an installed same-version host. The ZIP also contains a current-user installer; Node is only needed for source builds, not to run the delivered host.

The workspace containing this checkout is not itself a Git repository. Keep source commits inside this nested `heptafloat` repository; do not add surrounding personal data. The original `origin` is `madeyexz/heptafloat`; verified access is read-only. Push requires a writable fork/remote.
