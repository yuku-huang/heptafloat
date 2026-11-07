# Current status

2026-11-08: source `0.9.12-win.4` adds 31 code-language choices and syntax colors with safe literal code rendering, per-block params, wrap/unknown-value preservation and independent undo. All 38 unit tests and the latest native mock language/IME/save-reopen run passed (02:44 local). No real note writes. Not separately packaged: the incoming Deep Link feature will carry this editor update into its final package.

2026-11-08: `0.9.12-win.3` fixes editor indentation and Windows caret behavior in `/code`. The reported Enter-then-typing issue was narrowed to code blocks; a mock UI run showed the old overlay caret moving a line after typing although the stored text had only one newline. Windows now uses its native caret. Tab/Shift+Tab indent/outdent text/code lines; code Enter keeps the current indentation. Thirty unit tests and native mock keyboard/IME/save-readback checks pass; final packaged results are in `CHANGELOG.md`. Output path: `dist/0.9.12-win.3/HeptaFloat-win32-x64/HeptaFloat.exe`.

2026-10-24: Windows `0.9.12-win.2` fixes card search and adds Alt+Left/Right session navigation. Ctrl+O opens from the toolbar/editor/picker, lists recent Heptabase cards, and combines official content search with paginated title matching. Failures now show an error/retry instead of false empty results. Unit tests cover 20 behaviors; native mock and live read-only keyboard/search/history checks pass. Packaged EXE validation is recorded in the changelog. Output: `dist/HeptaFloat-0.9.12-win.2-windows-x64.zip`.

Working branch: `codex/windows-port`; clean upstream baseline: `f32f34f`. `origin` is the upstream public repository, and the connected account reports `push:false`. Do not claim a remote push/CI/release unless verified.

The app supports floating/always-on-top windows, close-to-tray, single instance, configurable global hotkey, themes/text size, persistent recents/window position, search/new cards, official-CLI read/save and image integration, MD5 checks, and recovery drafts. Windows CLI `0.7.0` reads were verified without mutating real notes.

Large-library evidence: 6,648 metadata entries indexed successfully; the observed cold completion wait was about 66 seconds. Search now publishes partial results/progress during that background work instead of blocking or falsely reporting no matches. Cached queries remain usable during refresh.

Pending acceptance: real writes/uploads, physical IME, multi-monitor/DPI, login startup/reboot, Windows 10 hardware, and native macOS regression build. Windows updater/notch/automatic journal links are not implemented.
