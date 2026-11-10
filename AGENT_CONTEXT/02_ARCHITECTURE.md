# Architecture handoff

win.8: current renderer kind/id -> copyCardLink IPC -> validated service.cardLink -> await Electron main-process clipboard.writeText. A note UUID with known preview space yields standard HTTPS; absence or a journal date yields the existing native Heptabase URI without guessing space/card IDs. Live CLI properties echoes journal dates and journal reads expose no UUID, so copying does not add another CLI call. Pure src/card-links.js recognizes supported card targets; Windows clicks reuse openHere/show/CardHistory rather than the popup. Popup offers only Heptabase, Ctrl+click remains external, and ordinary external OS/Discord intents keep their new-window path. macOS behavior and persisted state/native host/extension schemas are unchanged.

Approved P2: bridge 1.1.1 handoff → bounded `sendNativeMessage` → exact-origin current-user stdio host → fixed receipt-owned HeptaFloat EXE → existing singleton/new complete card window. Host 1.0.0 is unchanged: .NET Framework, 8 KB, strict action/UUID/origin/path validation and isolated child handles. Edge installation now receipt-manages its primary and documented Google Chrome fallback keys, pointing to one manifest/origin; legacy ownership never silently adopts a foreign key. The native ZIP copies frozen bytes. User-assisted Edge/Discord success is recorded separately from CLI and lifecycle tests.

Windows installer lifecycle notifies association changes after register/restore, offers receipt-checked `Refresh`, and reports Windows `AssocQueryString` friendly name/executable/HRESULT in `Status`. It reuses the installed Electron maintenance flag without replacing running files. OS discovery is separate from browser discovery: the user's Edge still says no handler after refresh and full restart. This protocol route is preserved as fallback.

Bridge 1.1.1: foreground once-only or coalesced manual native launch. After acceptance, default autoClose requests scoped removal of its own top-frame, valid, still-current handoff tab. Errors, unknown/disabled preferences or later web/protocol choices keep the page; closing failure offers manual closure. Acceptance is process creation, not card-render acknowledgement. No permission is added. Build/loaded version checks and explicit reload retain storage. The external-Bot Markdown helper remains a separate un-deployed patch example.

Deep Link pipeline: validated intent queue → new registered card window per link → the same chrome/editor and sender-bound IPC → official CLI. Initial linked loads skip the journal; all toolbar/editor commands are enabled. Pin/history/buffers belong to each window; appearance/hotkey/startup remain app preferences. Closing flushes that renderer and stays open on error; app Quit checks every renderer. Host UUIDs scope recovery files and retry hashes; serial writes and MD5/keep-both conflicts remain intact. See architecture and Deep Link guides for the user override of the old preview design.

Shared editor (`src/`) → platform-specific bridge → official Heptabase CLI.

Windows: `windows/main.cjs` manages native app state/protocols/IPC; `preload.cjs` is the isolated bridge; `cli.cjs` discovers and invokes the official bundle without a shell; `service.cjs` handles validated reads, serialized writes, temporary files, images, and recovery. `chrome.js` and `windows.css` provide title-bar actions/settings.

macOS: `Sources/main.swift` and `build.sh` remain the original host/build. Shared shortcut helpers preserve macOS modifier behavior while enabling Ctrl on Windows.

Windows uses the Chromium native caret. The custom caret overlay is macOS-only. `commands.js` supplies code newline/indentation and text-line Tab fallback after list commands; serialization keeps the same text/block schema. Native mock editor regression checks live in `windows/editor-smoke.cjs` and pure command tests in `test/editor-commands.test.mjs`.

Search adds `windows/search.cjs`: official paginated metadata + keyword results, five-minute memory cache, three workers, explicit partial-failure warnings. Navigation adds `src/navigation.js`: up to 100 session visits, committed after display, independent of persistent recents. Ctrl+O and Alt arrows work across editor/toolbar/picker outside settings and IME composition. See architecture and data-schema docs for result shape and limits.

Detailed security/data flow: `../ARCHITECTURE.md`. No custom server, direct Heptabase storage access, or unrelated workspace changes are required.
