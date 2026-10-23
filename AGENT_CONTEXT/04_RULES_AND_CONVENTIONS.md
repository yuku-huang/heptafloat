# Rules and conventions

- Keep official Heptabase shims/bundles/databases unmodified. Discover current CLI help before integration changes.
- Keep shared editor behavior working on macOS. Gate Windows-only UI and behavior through the platform bridge.
- Never interpolate note text or paths into cmd.exe. Invoke executable+argument arrays; save JSON through request-owned temporary files.
- Save only with a verified MD5. Persist recovery before attempted mutations. Unknown hashes cannot authorize overwrites.
- Keep native IPC narrow, validate the sender/arguments, and do not expose Node or arbitrary file/shell access to the renderer.
- Mock tests never write real notes. Live smoke is read-only. Never log or commit private note content/recovery/profile files.
- Node/npm lockfile is authoritative for Windows. Preserve the upstream Bun/macOS workflow.
- Respect the parent workspace Git/documentation rules. Stage only this task's files; keep generated distributions ignored.
- Skill review: no installed skill update needed for this port. The reusable Windows CLI, shortcut, and QA rules are project-specific and recorded here and in tests.
