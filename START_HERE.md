# Start here

This checkout adds Windows support to upstream HeptaFloat `f32f34f` (0.9.12).

Current Windows build: `0.9.12-win.2`. Ctrl+O searches all cards with Chinese-title fallback; Alt+Left/Right follow session history. Quit the old tray app before running the updated portable EXE.

1. Read `docs/WINDOWS.md` for portable-app usage, setup, and limits.
2. Run `npm ci`, `npm test`, and `npm run test:windows` on Windows.
3. Run `npm run start:windows` to use the real Heptabase connection.
4. Run `npm run package:windows` to create the x64 portable distribution.
5. Read `ARCHITECTURE.md` and `AGENT_CONTEXT/` before continuing development.

The workspace containing this checkout is not itself a Git repository. Keep source commits inside this nested `heptafloat` repository; do not add surrounding personal data. The original `origin` is `madeyexz/heptafloat`; verified access is read-only. Push requires a writable fork/remote.
