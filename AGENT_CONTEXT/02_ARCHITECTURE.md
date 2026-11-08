# Architecture handoff

Approved P2: bridge 1.1.0 handoff → bounded `sendNativeMessage` → exact-origin current-user stdio host → fixed receipt-owned HeptaFloat EXE with canonical URI argument → existing singleton/new complete card window. Host 1.0.0 uses .NET Framework, an 8 KB limit, strict action/UUID/field validation and isolated child standard handles. No shell, network listener, arbitrary command/path, credential/note access or new Electron permissions. Host acceptance means process creation only. Per-browser HKCU manifests and immutable host versions are managed by `install-native-host.ps1`; unknown registrations are refused. The native ZIP copies the tested binary without recompiling it or changing the win.7 artifact. Actual Edge discovery is still failed/unaccepted; CLI/installer tests are separate.

Windows installer lifecycle notifies association changes after register/restore, offers receipt-checked `Refresh`, and reports Windows `AssocQueryString` friendly name/executable/HRESULT in `Status`. It reuses the installed Electron maintenance flag without replacing running files. OS discovery is separate from browser discovery: the user's Edge still says no handler after refresh and full restart. This protocol route is preserved as fallback.

Bridge 1.1.0: foreground/focused once-only automatic native request or coalesced manual native request; explicit web/protocol choices suppress stale results. The separate protocol fallback keeps native anchor behavior. Build/loaded versions are distinct; explicit reload retains storage. Independent bridge packaging preserves the tested win.7 app. `integrations/discord/card-link.cjs` optionally formats validated marked Markdown destinations; it never sends or deploys anything.

Deep Link pipeline: validated intent queue → new registered card window per link → the same chrome/editor and sender-bound IPC → official CLI. Initial linked loads skip the journal; all toolbar/editor commands are enabled. Pin/history/buffers belong to each window; appearance/hotkey/startup remain app preferences. Closing flushes that renderer and stays open on error; app Quit checks every renderer. Host UUIDs scope recovery files and retry hashes; serial writes and MD5/keep-both conflicts remain intact. See architecture and Deep Link guides for the user override of the old preview design.

Shared editor (`src/`) → platform-specific bridge → official Heptabase CLI.

Windows: `windows/main.cjs` manages native app state/protocols/IPC; `preload.cjs` is the isolated bridge; `cli.cjs` discovers and invokes the official bundle without a shell; `service.cjs` handles validated reads, serialized writes, temporary files, images, and recovery. `chrome.js` and `windows.css` provide title-bar actions/settings.

macOS: `Sources/main.swift` and `build.sh` remain the original host/build. Shared shortcut helpers preserve macOS modifier behavior while enabling Ctrl on Windows.

Windows uses the Chromium native caret. The custom caret overlay is macOS-only. `commands.js` supplies code newline/indentation and text-line Tab fallback after list commands; serialization keeps the same text/block schema. Native mock editor regression checks live in `windows/editor-smoke.cjs` and pure command tests in `test/editor-commands.test.mjs`.

Search adds `windows/search.cjs`: official paginated metadata + keyword results, five-minute memory cache, three workers, explicit partial-failure warnings. Navigation adds `src/navigation.js`: up to 100 session visits, committed after display, independent of persistent recents. Ctrl+O and Alt arrows work across editor/toolbar/picker outside settings and IME composition. See architecture and data-schema docs for result shape and limits.

Detailed security/data flow: `../ARCHITECTURE.md`. No custom server, direct Heptabase storage access, or unrelated workspace changes are required.
