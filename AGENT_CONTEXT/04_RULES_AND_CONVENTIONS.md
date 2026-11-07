# Rules and conventions

- Keep official Heptabase shims/bundles/databases unmodified. Discover current CLI help before integration changes.
- Keep shared editor behavior working on macOS. Gate Windows-only UI and behavior through the platform bridge.
- Keep the WebKit caret overlay macOS-only. For newline reports, compare serialized text and caret display separately; keyboard tests must include Enter followed by typing inside `/code`, not just ordinary paragraphs.
- Tab fallback must preserve list nesting, block IDs, text marks and multi-line selection boundaries. Await native text insertion before sending the next test key; confirm a new save rather than reusing an old Saved label.
- Never interpolate note text or paths into cmd.exe. Invoke executable+argument arrays; save JSON through request-owned temporary files.
- Save only with a verified MD5. Persist recovery before attempted mutations. Unknown hashes cannot authorize overwrites.
- Keep native IPC narrow, validate the sender/arguments, and do not expose Node or arbitrary file/shell access to the renderer.
- Mock tests never write real notes. Live smoke is read-only. Never log or commit private note content/recovery/profile files.
- Search failures must be visibly distinct from successful empty results. Use only official CLI pagination for metadata; discard stale picker requests. Do not treat pinned recents as browser history.
- Use isolated QA hotkeys/profiles, close any startup settings notice before keyboard tests, and keep live assertions/reports free of private query text.
- Package into versioned output folders and check for running executables before replacing a build. Do not stop the user's app or discard unsaved work to unlock packaging.
- Node/npm lockfile is authoritative for Windows. Preserve the upstream Bun/macOS workflow.
- Respect the parent workspace Git/documentation rules. Stage only this task's files; keep generated distributions ignored.
- Skill review: no installed skill update needed for this port. The reusable Windows CLI, shortcut, and QA rules are project-specific and recorded here and in tests.

Development-policy evidence for the 2026-11-08 editor task: read live through `heptabase_policy.load_software_development`, source `official_heptabase_desktop_cli`, readAt `2026-11-07T16:56:54.433883+00:00`, no cache. Router `662077f1-6f0a-4d25-95fa-5a3d48f3853d` v0.9.3 SHA-256 `7e63e770addd5d5089c0dd2ad8d9a945b9c2cdd7e9ae61cdc4e6ae3bac969efa`; actual `software-development` card `7004b48d-cb3f-4d09-87f8-663f184c5c8c` v0.1 SHA-256 `4eae445e1ce80c610bc5df2151b7c6993e0029f1897d48d360060bd86feb2f02`. Registry v0.1 matched; both full texts were read. This is provenance, not a policy cache; reload live for a new development task.
