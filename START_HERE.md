# Start here

This checkout adds Windows support to upstream HeptaFloat `f32f34f` (0.9.12).

Current version: `0.9.12-win.6`. Includes per-code-block language selection/colors, `flowhepta` protocol, a reused read-only preview, optional per-user install and an experimental MV3 bridge. Direct installed Windows protocol routing was verified in win.5. Edge handoff works, but browser external launch and Discord Desktop end-to-end acceptance remain unresolved; read `docs/DEEPLINK_TEST_RESULTS.md` before claiming completion.

Editor update: `/code` uses the native Windows caret, language selector and syntax decorations; Tab/Shift+Tab indent selected lines and Enter preserves indentation. `npm test` runs 47 focused tests; native editor and preview smoke use sample data only. `docs/DEEPLINK.md` covers extension loading, protocol installation and rollback; Bot integration is a separate example under `integrations/discord`.

1. Read `docs/WINDOWS.md` for portable-app usage, setup, and limits.
2. Run `npm ci`, `npm test`, and `npm run test:windows` on Windows.
3. Run `npm run start:windows` to use the real Heptabase connection.
4. Run `npm run package:windows` to create the x64 portable distribution.
5. Read `ARCHITECTURE.md` and `AGENT_CONTEXT/` before continuing development.

The workspace containing this checkout is not itself a Git repository. Keep source commits inside this nested `heptafloat` repository; do not add surrounding personal data. The original `origin` is `madeyexz/heptafloat`; verified access is read-only. Push requires a writable fork/remote.
