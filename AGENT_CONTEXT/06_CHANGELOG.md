# Agent changelog

## 2026-11-08 Complete linked card windows

- Explicit user override: replace read-only/reused preview with full editable card windows and new-window-per-link default. Removed separate preview assets; reused normal chrome/editor/commands and per-sender controls/title/mention replies. Pins/history/buffers stay independent; appearance/hotkey settings remain global.
- Added close/quit flush guards and tray reopening for Esc-hidden cards. Host UUIDs separate offline recovery files and verified save retries; missing hashes cannot borrow another window version. Opening a link itself does not save.
- 50 unit tests pass; native sample-only tests cover repeated/different links, toolbar/pin shortcut from toolbar focus, settings routing, targeted autosave/languages, search/history/new notes, same-card keep-both copies, offline close protection and all-window quit checks. Initial autofocus was fixed by showing the editor before focusing it.
- Final win.7 ZIP SHA-256 `ee3057842cf95d621854099c316b851650a11d0ef00e156acd07b67890dfee62`; integrity/current guides/installer and tested-ASAR identity verified. Unit rerun 50/50, syntax/shared Bun bundle/diff checks passed. Generated outputs/profiles are ignored; parent handoff remains outside nested Git.
- Actual task-owned HKCU win.6→win.7 upgrade/rollback/uninstall restored handler/HTTPS defaults with no card writes. Permanent win.7 installed; runtime hash matches the tested ASAR, while the old normal win.5 process remains alive until the user quits its tray app.
- Windows packaging supports stage-only → native artifact QA → archive-only. Final artifact/install/Git results are in the root changelog. Prior normal process/private data are preserved; browser/Discord acceptance remains unresolved.
- Skill verdict: no skill edit; per-window scopes, actual focused keyboard input and save-safe lifecycle are repository-specific conventions/tests. Fresh policy provenance is in `04_RULES_AND_CONVENTIONS.md`.

## 2026-11-08 MV3 bridge and Windows continuation

- Final ZIP/sidecar verified; runtime unchanged from tested ASAR and installer current. Actual permanent-root win.6 install → rollback to running win.5 → win.6 reinstall passed while preserving the old process. Development registration included the entry path and restored installed association. A packaging/install source race was corrected by rerunning sequentially; the rule is recorded in project conventions. SHA-256 is in the root changelog.
- Feature commits: P0 `6895167`, MV3/install `354effc`. Actual branch push to upstream returned HTTP 403 permission denied; no fork, force-push or remote CI was attempted. Final branch is `codex/discord-hepta-preview`; build/dist/local profiles and seven parent handoff edits remain outside tracked source.

- Added the marked-only MV3 handoff/options/web fallback using existing esbuild/shared URL functions; all-card defaults OFF. Bot absent: separate minimal helper/URL-field patch instructions, no deployment or message sending.
- Forty-seven unit tests pass. Actual installed win.5 cold/warm/minimized A→B reused window/process; install/reinstall/first rollback/uninstall passed after handling short-lived Electron file locks. No user process was stopped.
- User manually loaded Edge 1.0.0. Marker→handoff observed and user confirmed; external launch not accepted, and the later OS probe was explicitly excluded. Tool policy rejects management/extension pages; no alternative surface/CDP/policy workaround. Discord native minimized state was inaccessible; no actual click acceptance.
- Final win.6 packaging, upgrade and artifact evidence are in `docs/DEEPLINK_TEST_RESULTS.md`. Code/docs explicitly mark P1 experimental. Build/profiles/runtime/private data stay ignored; prior P0 was independently committed as `6895167`.
- Skill verdict: no skill update; target-bound IPC, independent source testing, safe install reruns and the actual policy boundary are repository conventions/test cases. Live policy provenance is recorded in `04_RULES_AND_CONVENTIONS.md`.

## 2026-11-08 P0 Deep Link checkpoint

- Preserved the 14 resumed source/test/script changes. Strict canonical URL parser, initial/second-instance routing, preview-only IPC and read-only shared card rendering; per-user protocol installer with rollback. 42 unit/native mock editor/preview checks passed previously. Windows UI acceptance was stopped by Escape; no Discord completion claimed.
- Latest live software-development v0.1 loaded in full on resume at `2026-11-07T19:43:17.375157+00:00`, registry version matched; same Router/Skill IDs and SHA-256 values as project conventions. No skill write needed; project-specific changes are documented locally.

## 2026-11-08 Code languages and syntax colors

- Added `src/code-block.js`, lowlight/highlight.js, 31 language choices, pure grammar/params tests and native language/undo/IME/save-reopen checks. All 38 unit tests and final native mock run passed. Windows and Bun bundles built; no native Mac build or real note writes were run.
- Official CLI help confirms `[!]<language>[:displayMode]`. No schema migration; unknown params/wrap/IDs/text are preserved. Highlight spans remain decorations; large blocks fall back to plain rendering. Both packaging paths include licenses.
- Eleven source/test/build entries were inventoried as prior authorized work before starting Deep Link development. No ambiguous user files; outputs/dependencies stay ignored. This baseline is committed separately; no win.4 distribution is claimed.
- Skill assessment: no skill change; code-params, decoration and native-focus regression rules belong in project documentation/tests. Live software-development v0.1 was read at `2026-11-07T18:28:12.844478+00:00` with the same verified IDs/hashes recorded in project conventions.

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
