# Parent workspace handoff

The parent `Heptabae_project` folder is a multi-project workspace, not a Git repository. This task added only the new `heptafloat` checkout and additive navigation/status entries to the parent's README, ARCHITECTURE, START_HERE, CHANGELOG, and AGENT_CONTEXT files 00–08. Existing project files and personal assets were preserved.

Those parent entries point to this repository's user guide, architecture, schema, tests, status, and next steps. This tracked document records the same durable handoff without importing unrelated private workspace documentation into the upstream-derived Git repository.

Versioned implementation: `codex/windows-port` based on `f32f34f`. Upstream `origin` is read-only for the connected account. A writable fork/remote is needed before push/remote CI. Build, dependency, QA screenshot/report, and portable output folders remain ignored.

2026-10-24 follow-up: `0.9.12-win.2` adds Ctrl+O search with Chinese-title fallback, explicit loading/failure/retry, and Alt arrows for session navigation. Parent README/architecture/start pointers, changelog and status/next-steps/agent changelog receive additive updates only. The durable implementation, 20-test coverage and live read-only hash checks remain versioned here.

Skill decision: no installed skill update. The Windows CLI invocation, modifier handling, guarded saves, and QA boundaries are project conventions and are recorded in `AGENT_CONTEXT/04_RULES_AND_CONVENTIONS.md` and executable tests.
