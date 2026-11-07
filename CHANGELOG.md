### [2026-11-08 01:16] - Fix code-block caret and indentation on Windows

* **修改檔案**：`src/commands.js`, `src/editor.js`, `windows/windows.css`, `windows/smoke.cjs`, `windows/editor-smoke.cjs`, `test/editor-commands.test.mjs`, `scripts/build-windows.mjs`, `package.json`, `package-lock.json`, README/architecture/start/operator guides, `docs/WORKSPACE_HANDOFF.md`, `AGENT_CONTEXT/00..06`, `AGENT_CONTEXT/08_QA_PIPELINE.md`
* **變更細節**：
  * user confirmed Tab should indent, and narrowed Enter-then-typing's apparent second line to `/code block`
  * a native mock run showed one stored newline while the old overlay caret moved down a line on subsequent typing; gated the macOS WebKit overlay to macOS and use the native Windows caret
  * added four-space Tab / Shift+Tab text/code indentation after existing list nesting commands, including selected lines, literal-tab removal and exclusion of an unselected following line
  * code Enter inserts one newline retaining the current indentation; Shift+Enter is explicit in prose and code; no schema change, new dependency or private-note mutation
  * verification: 30 unit tests passed; native mock UI passed actual slash conversion, native caret, Enter-then-English/Chinese typing, Chromium composition, Tab/Shift+Tab, undo/redo, code save/readback, autosave and existing search/window checks; sample-only screenshot inspected
  * packaged `dist/0.9.12-win.3/HeptaFloat-win32-x64/HeptaFloat.exe` (file version `0.9.12.3`); final EXE mock smoke passed all editor/IME/indentation/save-readback and existing search/window checks; ZIP SHA-256 verified: `f6781794f59ca022ec566955768b5ca397817afbd2198f0dcaf7955620b55025`
  * loaded live Router v0.9.3 and actual software-development v0.1 in full; registry identity/version matched; Card IDs, hashes, source and read time recorded in project conventions
  * Git inventory: clean baseline `ed8f27c`; all current source/tests/scripts/package/docs changes belong to this task; build/dist/node_modules and private runtime data stay ignored; parent handoff files remain outside Git
  * skill assessment: no skill/card edit needed; platform-caret boundaries and keyboard-test sequencing are repository-specific conventions and regressions; upstream access was rechecked as `push:false`
* **下一步建議 (Next Steps)**：
  * quit the old tray app, open `dist/0.9.12-win.3/HeptaFloat-win32-x64/HeptaFloat.exe`, and confirm `/code` with the user's physical input method
  * retain Windows/DPI/macOS acceptance boundaries; use a writable remote for push/remote CI

### [2026-10-24 00:39] - Fix Windows card search and add page history shortcuts
* **修改檔案**：`src/editor.js`, `src/palette.js`, `src/menus.js`, `src/platform.js`, `src/navigation.js`, `windows/search.cjs`, `windows/service.cjs`, `windows/chrome.js`, `windows/main.cjs`, `windows/smoke.cjs`, `test/windows.test.mjs`, build/package scripts, package metadata, README/architecture/start guide, `docs/`, `AGENT_CONTEXT/`
* **變更細節**：
  * Ctrl+O now works across editor, toolbar and picker; the search button and empty-query recent card list make the entry point visible
  * diagnosed official keyword searches missing some full Chinese titles; added NFKC/case-insensitive title-term matching over official paginated metadata, merged with content results; no Heptabase DB/cache or unofficial endpoint access
  * search cache is memory-only (five-minute TTL), shared across queries, invalidated by local saves/creates; indexing has bounded CLI concurrency/time; errors/partial failures are explicit and Retry is available
  * large-library verification exposed the first 45-second indexing limit; changed to background page publication with progress, automatic result refresh and a three-minute background budget, keeping native/available title matches usable immediately
  * fixed asynchronous search results replacing a closed/different picker; IME Enter is not used to open a card mid-composition
  * Alt+Left / Alt+Right (and Ctrl bracket aliases) navigate the actual session visit history; failed/stale navigation preserves the displayed cursor and new visits discard forward history; macOS retains recents navigation
  * bumped Windows package to `0.9.12-win.2` and derived Windows file version from package metadata
  * switched portable output to `dist/<version>/` with a running-process check before same-version replacement after the old running app locked the original output directory
  * verification: 20 unit tests, isolated native mock UI, and live read-only Ctrl+O/Alt navigation passed; before/after journal/note hashes unchanged; reports omit private titles/bodies
  * delivered EXE `dist/0.9.12-win.2/HeptaFloat-win32-x64/HeptaFloat.exe` passed packaged mock and live read-only smoke; ZIP SHA-256 verified: `e347ddfa7bbe664d983440ca7bbc1a2baa427d51b293465c39353160986d0e9a`; file version `0.9.12.2`
  * QA now uses separate mock/live hotkeys to prevent the normal app's shortcut conflict from opening a settings modal over keyboard tests
  * Git inventory: all changed/new source, tests, scripts and docs are task-related; dependencies, builds, profiles and distributions remain ignored; starting baseline was clean commit `1909d9e`
  * skill decision: no installed skill update; reusable search-error, stale-result, history and private-QA rules belong in project conventions and executable tests
* **下一步建議 (Next Steps)**：
  * quit the old tray app, run the updated portable app, and confirm the user's original query; retain real-write/physical-IME/DPI/login acceptance boundaries
  * configure a writable remote to push `codex/windows-port`; upstream access is read-only

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
