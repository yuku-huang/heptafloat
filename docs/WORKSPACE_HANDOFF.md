# Parent workspace handoff

2026-11-08 Deep Link continuation: `codex/discord-hepta-preview`, win.6 contains strict Windows protocol/read-only preview, optional per-user installation, experimental MV3 bridge and separate Bot patch instructions. `docs/DEEPLINK_TEST_RESULTS.md` keeps OS/protocol/native tests separate from unresolved browser/Discord acceptance. Parent navigation/status/changelog receive additive pointers only; no private surrounding sources/data are imported.

2026-11-08 editor update: `0.9.12-win.3` uses the native Windows caret for code/newline display and adds Tab/Shift+Tab text/code indentation. Thirty unit tests and native mock keyboard/composition/save-readback checks pass; final packaged verification is in `CHANGELOG.md`. Parent navigation/status/changelog entries are updated additively; all implementation and durable rules are committed in this nested repository.

The parent `Heptabae_project` folder is a multi-project workspace, not a Git repository. This task added only the new `heptafloat` checkout and additive navigation/status entries to the parent's README, ARCHITECTURE, START_HERE, CHANGELOG, and AGENT_CONTEXT files 00–08. Existing project files and personal assets were preserved.

Those parent entries point to this repository's user guide, architecture, schema, tests, status, and next steps. This tracked document records the same durable handoff without importing unrelated private workspace documentation into the upstream-derived Git repository.

Current implementation: `codex/discord-hepta-preview`, continuing `codex/windows-port` from upstream `f32f34f`. Upstream `origin` is read-only; actual push returned HTTP 403. A writable fork/remote is needed before push/remote CI. Build, dependency, QA screenshot/report, and portable output folders remain ignored.

2026-10-24 follow-up: `0.9.12-win.2` adds Ctrl+O search with Chinese-title fallback, explicit loading/failure/retry, and Alt arrows for session navigation. Parent README/architecture/start pointers, changelog and status/next-steps/agent changelog receive additive updates only. The durable implementation, 20-test coverage and live read-only hash checks remain versioned here.

Skill decision: no installed skill update. The Windows CLI invocation, modifier handling, guarded saves, and QA boundaries are project conventions and are recorded in `AGENT_CONTEXT/04_RULES_AND_CONVENTIONS.md` and executable tests.
