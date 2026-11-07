# Next steps

- Quit the previous tray app and run `0.9.12-win.3`. Confirm `/code`: Enter then Chinese typing stays on one new line, Tab indents four spaces, Shift+Tab removes one level, and multi-line indentation/undo behaves as expected. Native composition is automated; the user's physical input method still needs acceptance.

- Quit the previous tray app and use `0.9.12-win.2`. Check Ctrl+O with the user's original troublesome query, and Alt+Left/Right across several cards. First title indexing runs in the background (about one minute observed for this library), with results/progress updating automatically; later queries reuse memory for five minutes. No private queries belong in Git or diagnostics.

1. Use the portable build for acceptance of real note edits, image import/export, physical Chinese IME, multi-monitor/DPI transitions, and launch at login. Do not describe mock writes as real integration validation.
2. Connect a writable GitHub fork/remote, push `codex/windows-port`, and run the provided Windows workflow. Upstream access is currently read-only.
3. Before a public release, choose Windows signing/distribution and update policy. Current build is unsigned and updates manually.
4. If feature parity is requested, add per-command shortcut recording and optional new-card journal links. MacBook notch is macOS-only.
5. Run the native macOS build after shared-editor changes on a Mac.
