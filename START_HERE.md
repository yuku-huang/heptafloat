# Start here

Current P2: the user approved development, installation and real testing of Native Messaging. Extension 1.1.0 adds that permission and calls a constrained stdio host; host 1.0.0 is installed for the current user's exact Edge extension ID. Source tests (67), six actual EXE test groups and the task-owned HKCU lifecycle pass. A separate installed-host probe opened the right card; this is not browser evidence. Follow `docs/NATIVE_MESSAGING.md` and `docs/DEEPLINK_TEST_RESULTS.md` for setup and remaining acceptance.

Normal win.7 and its tested ZIP are unchanged. Reuse the current extension folder, reload/enable 1.1.0 and its approved permission manually, then test a fresh marked HTTPS link without concurrent CLI/OS probes. Tool policy still prohibits internal extension-page input. Do not repeat the old tray-Quit/restart requests. The 1.0.2 protocol route really failed with “no registered handler” even after refresh and a confirmed Edge restart; it remains an explicit fallback, not a claimed repair.

This checkout adds Windows support to upstream HeptaFloat `f32f34f` (0.9.12).

Current version: `0.9.12-win.7`. The user explicitly replaced the old read-only/reused preview with a new complete card window per link. Editing/history/pin and recovery/retry bases are window-specific; appearance/global shortcut/startup remain app preferences. Quit the previous tray process first, or its single-instance lock keeps the older release active. Browser external launch and Discord Desktop acceptance remain unresolved; see `docs/DEEPLINK_TEST_RESULTS.md`.

Editor update: `/code` uses the native Windows caret, language selector and syntax decorations; Tab/Shift+Tab indent selected lines and Enter preserves indentation. `npm test` runs 67 focused tests; `npm run test:preview` tests full editable card windows, independent pin, targeted autosave, search/history, code language save, conflict copies and close/quit guards with mock notes only. `docs/DEEPLINK.md` covers extension loading, protocol installation and rollback; Bot integration is a separate example under `integrations/discord`.

1. Read `docs/WINDOWS.md` for portable-app usage, setup, and limits.
2. Run `npm ci`, `npm test`, and `npm run test:windows` on Windows.
3. Run `npm run start:windows` to use the real Heptabase connection.
4. Run `npm run package:windows` to create the x64 portable distribution.
5. Read `ARCHITECTURE.md` and `AGENT_CONTEXT/` before continuing development.

Native bridge builds need the existing Windows .NET Framework compiler: `npm run test:native-host` builds/tests before installation. Freeze that binary, then `npm run package:native-bridge`. Do not rebuild and overwrite an installed same-version host. The ZIP also contains a current-user installer; Node is only needed for source builds, not to run the delivered host.

The workspace containing this checkout is not itself a Git repository. Keep source commits inside this nested `heptafloat` repository; do not add surrounding personal data. The original `origin` is `madeyexz/heptafloat`; verified access is read-only. Push requires a writable fork/remote.
