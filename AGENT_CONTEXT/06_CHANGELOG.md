# Agent changelog

## 2026-10-23 Windows port

- Completed 2026-10-24: 13 unit tests, native/packaged mock smoke and live read-only integration; portable x64 EXE/ZIP/SHA-256 generated. Added onboarding fallback for the installed app before CLI registration. Mock-only screenshot QA confirms the editor/settings layout.

- Cloned upstream into a new nested checkout; no pre-existing work was overwritten. Created `codex/windows-port` from `f32f34f`.
- Added an Electron Windows host, portable x64 build, official-CLI adapter, guarded saves and local recovery, native tray/hotkey/settings, and platform-correct editor shortcuts.
- Added isolated tests and a read-only live smoke path. Fixed the macOS Ctrl+P navigation convention intercepting Windows recent-card shortcuts.
- Added operator/setup/architecture/schema/QA handoff documentation and Windows CI configuration.
- Git inventory: source/docs/tests/scripts/icon/lockfile belong in the commit; build/dist/dependencies/runtime/recovery stay ignored; no ambiguous pre-existing files in the checkout.
- Skill assessment: no installed skill update; durable project rules are in `04_RULES_AND_CONVENTIONS.md` and tests.
