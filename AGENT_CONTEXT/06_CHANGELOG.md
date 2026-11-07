# Agent changelog

## 2026-11-08 Code-block Enter, Tab and Windows caret

- User clarified Tab should indent and the apparent second newline occurs in `/code`. Mock instrumentation showed one newline in code text but an overlay-caret line jump after typing. Windows now uses its native caret; macOS keeps the WebKit overlay.
- Added code Enter with indentation retention, Tab/Shift+Tab text/code fallback after structural list commands, and explicit Shift+Enter. No content-schema migration or dependency was introduced.
- Thirty unit tests and native mock checks cover actual slash conversion, Enter then typing, Chromium IME composition, selected-line indentation, undo/redo, new autosave and code save/readback. Packaged results are recorded in the root changelog.
- Loaded current software-development v0.1 through the live Router registry; source/version/hash/read-time evidence is in `04_RULES_AND_CONVENTIONS.md`. Skill files/cards were not changed: the reusable caret and keyboard-test rules belong in this repository.
- Starting Git baseline: clean `ed8f27c` on `codex/windows-port`. Task-related source/tests/scripts/docs are intended for commit; build/dist/node_modules remain ignored, parent handoff docs stay outside Git. Upstream access was rechecked as `push:false`.
- Final versioned EXE passed packaged mock smoke, including code IME/Enter/indentation/readback. File/product versions are `0.9.12.3` / `0.9.12-win.3`; ZIP hash was verified and is recorded in the root changelog. No live card writes were run for this editor task.

## 2026-10-24 Windows search and card navigation

- Version `0.9.12-win.2`: Ctrl+O window-wide card search, visible search button, recent default list, official paginated title fallback, explicit errors/retry/partial warnings, stale-result rejection, Alt arrow session history and Ctrl bracket aliases.
- 20 unit tests plus native mock/live read-only UI checks pass. Live search/open/back/forward preserves journal/note MD5s; no private card content is logged or committed. Packaged validation is recorded in the root changelog.
- Source/docs/tests/scripts and package metadata are the only intended Git changes. The clean starting commit is `1909d9e`; build/dist/node_modules are ignored. Upstream is read-only.
- Packaged EXE mock/live read-only smoke and ZIP SHA-256 verification passed; executable is under `dist/0.9.12-win.2/HeptaFloat-win32-x64/`. File/product versions are `0.9.12.2` / `0.9.12-win.2`.
- Skill review: no installed skill update; project conventions now require distinguishable search errors, official metadata access, actual visit history and isolated/private keyboard QA.
- Large-library follow-up: initial 45-second bound was insufficient. Twenty tests now include progressive indexing, and a live read-only full scan completed with 6,648 metadata entries in about 66 seconds of remaining wait. Background results/progress avoid blocking the search UI; final packaged validation follows the updated implementation.

## 2026-10-23 Windows port

- Completed 2026-10-24: 13 unit tests, native/packaged mock smoke and live read-only integration; portable x64 EXE/ZIP/SHA-256 generated. Added onboarding fallback for the installed app before CLI registration. Mock-only screenshot QA confirms the editor/settings layout.

- Cloned upstream into a new nested checkout; no pre-existing work was overwritten. Created `codex/windows-port` from `f32f34f`.
- Added an Electron Windows host, portable x64 build, official-CLI adapter, guarded saves and local recovery, native tray/hotkey/settings, and platform-correct editor shortcuts.
- Added isolated tests and a read-only live smoke path. Fixed the macOS Ctrl+P navigation convention intercepting Windows recent-card shortcuts.
- Added operator/setup/architecture/schema/QA handoff documentation and Windows CI configuration.
- Git inventory: source/docs/tests/scripts/icon/lockfile belong in the commit; build/dist/dependencies/runtime/recovery stay ignored; no ambiguous pre-existing files in the checkout.
- Skill assessment: no installed skill update; durable project rules are in `04_RULES_AND_CONVENTIONS.md` and tests.
