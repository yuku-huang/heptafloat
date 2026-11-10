# Start here

Current desktop update (2026-11-10): win.8 adds Ctrl+L for the displayed card and direct same-window Windows card-link clicks, with Alt+Left/Right history and only Heptabase in the hover menu. Eighty source tests and development/general/packaged preview smoke pass with sample notes; OS clipboard/external launches are stubbed in QA. See docs/WINDOWS.md for link formats and installation/rollback. Bridge 1.1.1 and native host 1.0.0 are reused.

Current bridge: 1.1.1 adds user-requested auto-close after native acceptance; errors, unknown preferences, disabled auto-close and alternate-route choices keep the handoff. Seventy-seven source tests pass, including 30 bridge cases. The user reloaded 1.1.1 and clicked an existing Discord card: the card opened and handoff disappeared. Independent native inventory found a new window with previous windows retained, and no new handoff tab remained. This is human-assisted Edge/Discord acceptance, separate from API/DOM negative tests.

Approved P2 host 1.0.0 is installed for the exact current Edge extension ID. Edge's documented Google Chrome fallback key was the measured successful difference; both keys now share one receipt/manifest/origin, with actual install/migration/upgrade/rollback/removal tests passing. Never adopt an unknown existing fallback key. Normal win.7, native binary and tested desktop ZIP stay unchanged. Reuse/reload the current extension folder; no desktop Quit or host rebuild is needed. Tool policy still prohibits internal extension-page input. The old protocol route remains a separate unresolved browser fallback. Follow `docs/NATIVE_MESSAGING.md` and `docs/DEEPLINK_TEST_RESULTS.md`.

This checkout adds Windows support to upstream HeptaFloat `f32f34f` (0.9.12).

Current desktop version: `0.9.12-win.8`. The user explicitly replaced the old read-only/reused preview with a new complete card window per link. Editing/history/pin and recovery/retry bases are window-specific; appearance/global shortcut/startup remain app preferences. When replacing the desktop runtime, quit its prior tray process first. Native browser/Discord success does not prove the retained external protocol or every device scenario; see the results matrix.

Editor update: `/code` uses the native Windows caret, language selector and syntax decorations; Tab/Shift+Tab indent selected lines and Enter preserves indentation. `npm test` runs 80 focused tests; `npm run test:preview` tests full editable card windows, independent pin, targeted autosave, search/history, copy/direct card links, code language save, conflict copies and close/quit guards with mock notes only. `docs/DEEPLINK.md` covers extension loading, protocol installation and rollback; Bot integration is a separate example under `integrations/discord`.

1. Read `docs/WINDOWS.md` for portable-app usage, setup, and limits.
2. Run `npm ci`, `npm test`, and `npm run test:windows` on Windows.
3. Run `npm run start:windows` to use the real Heptabase connection.
4. Run `npm run package:windows` to create the x64 portable distribution.
5. Read `ARCHITECTURE.md` and `AGENT_CONTEXT/` before continuing development.

Native bridge builds need the existing Windows .NET Framework compiler: `npm run test:native-host` builds/tests before installation. Freeze that binary, then `npm run package:native-bridge`. Do not rebuild and overwrite an installed same-version host. The ZIP also contains a current-user installer; Node is only needed for source builds, not to run the delivered host.

The workspace containing this checkout is not itself a Git repository. Keep source commits inside this nested `heptafloat` repository; do not add surrounding personal data.

## Push Windows work

The 403 was repository authorization: the authenticated `yuku-huang` account has `push:false` on `madeyexz/heptafloat`. Its login works. Keep that original `origin` for fetching upstream changes; the owned [yuku-huang/heptafloat](https://github.com/yuku-huang/heptafloat) fork is now the writable `fork` remote. Commit `ba027071ee3c4fe8c9efc78729ebb602cbc97d98` was pushed on `codex/discord-hepta-preview` and independently read back through Git and the GitHub API.

From this checkout, repeat setup or push committed work using the existing GitHub CLI login:

```powershell
powershell.exe -NoProfile -File .\scripts\push-fork.ps1 -ExpectedAccount yuku-huang
powershell.exe -NoProfile -File .\scripts\push-fork.ps1 -ExpectedAccount yuku-huang -Push
```

The script checks the account, selected upstream, named task branch, existing remote URLs, fork parent/owner/write permission and clean worktree before pushing. It reuses the fork, preserves `origin`, sets only this branch's `pushRemote`, uses normal `git push --set-upstream`, and compares local HEAD with Git's advertised SHA and GitHub's branch SHA. An existing conflicting remote is refused. No credentials are exported or reset; the connector and local CLI may use different accounts.

For this configured branch, plain `git push` now targets `fork`. No PR, merge, release, artifact upload or CI success is implied by a successful push. The application packages remain local under ignored `dist/`.

The current win.8 task branch is `codex/card-link-navigation`; the earlier bridge branch remains available. To undo only a branch's local push routing, substitute its actual name in `git config --local --unset branch.<task-branch>.pushRemote` and `git branch --unset-upstream <task-branch>`. This retains both remotes, the GitHub fork and published history; upstream will still reject unauthorized writes. Deliberate deletion of the fork is separate work.

References: [GitHub fork workflow](https://docs.github.com/en/pull-requests/how-tos/work-with-forks/fork-a-repo), [GitHub CLI fork options](https://cli.github.com/manual/gh_repo_fork).
