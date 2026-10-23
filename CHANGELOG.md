### [2026-10-24 00:09] - Add Windows portable desktop application
* **修改檔案**：`windows/`, `src/editor.js`, `src/menus.js`, `src/palette.js`, `src/platform.js`, `scripts/`, `test/windows.test.mjs`, `assets/AppIcon.ico`, `package.json`, `package-lock.json`, `.gitignore`, `.github/workflows/windows.yml`, `README.md`, `ARCHITECTURE.md`, `START_HERE.md`, `docs/WINDOWS.md`, `docs/WORKSPACE_HANDOFF.md`, `AGENT_CONTEXT/00_PROJECT_OVERVIEW.md` through `08_QA_PIPELINE.md`
* **變更細節**：
  * created `codex/windows-port` from clean upstream `f32f34f`; retained the original macOS host/build and shared ProseMirror editor
  * added an Electron Windows x64 shell with always-on-top window, close-to-tray, single-instance behavior, configurable global hotkey, themes, text size, recent cards, settings and optional launch at login
  * integrated the official Windows Heptabase CLI using executable/argument arrays, UTF-8 content files, bounded subprocesses, MD5 guards, and local recovery drafts; onboarding can locate the desktop app before CLI registration
  * corrected Command/Ctrl shortcut differences, including macOS Ctrl+P menu navigation intercepting the Windows recent-card command
  * added repeatable setup, portable packaging, SHA-256 generation, and Windows CI; built `dist/HeptaFloat-win32-x64/HeptaFloat.exe` and the versioned ZIP
  * verification: 13 unit tests passed; native mock UI smoke passed; packaged EXE mock smoke and live read-only Heptabase integration passed on Windows x64 (10.0.26200), Electron 45.0.0, installed CLI 0.7.0
  * mock smoke includes Unicode/autosave, new card, Ctrl palette switching, pinning, settings, sandbox/no Node and native close-to-tray; no real note mutations were used for validation
  * local screenshot QA inspected sample editor/settings; test captures now briefly show mock data to avoid stale Chromium frames from hidden windows
  * source/docs/tests/scripts/icon/lockfile are versioned; build/dist/dependencies and private runtime data are ignored; surrounding workspace files are not imported into Git
  * upstream `origin` is read-only (`push:false`); no remote push or remote CI run is claimed
  * skill review: no installed skill update needed; durable port-specific rules are recorded in project conventions and tests
* **下一步建議 (Next Steps)**：
  * run user acceptance for real writes/images, physical IME, multi-monitor/DPI and login startup; run native macOS regression build on a Mac
  * connect a writable fork/remote, push the task branch, and run Windows CI before any signed/public release
