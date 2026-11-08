# Next steps

Current feature is accepted: 1.1.1 closes the original handoff after native acceptance and retains it on failure. The user reloaded and verified Discord opening/closure; native window/tab metadata agrees. Seventy-seven tests pass. Edge's working Google Chrome fallback and primary key are now one receipt-managed installation, with actual lifecycle/legacy/foreign-key checks passing. No further blind reloads, host-discovery probes or browser restarts are needed for this fix. Final archive/Git results are in CHANGELOG.

Delivery complete locally: the 1.1.1 combined/extension ZIPs passed exact-file/hash verification and the bundled installer passed default-source repeat installation without restarting the app. Existing native/desktop bytes remain frozen. Upstream write preflight still rejects this account with HTTP 403; keep the local delivery commit and retry the same branch only after remote access is corrected.

1. Preserve the tested/frozen native host and win.7. If changing native code later, bump its version before rebuilding/installing. Keep independent OS/host probes outside browser acceptance windows. To revert only page closure, disable auto-close in bridge settings.
2. Broader acceptance remains separate: physical Chinese IME, real note/image writes, DPI/multi-monitor, login/reboot, Windows 10, native macOS and independent real pin/foreground scenarios. Existing mock/window tests do not prove every device case.
3. Chrome/mobile and real-host-unavailable page retention remain optional follow-up runtime tests; current error-retention coverage is API/DOM based. Bot lives elsewhere: apply the provided helper only in its actual repo after compatibility review. No Bot deployment/message sending is claimed; defaults still preserve unmarked web links.
4. Use `npm run package:native-bridge` for a standalone host+extension bundle, copying frozen native bytes. For a future Electron change use `--stage-only`, artifact QA, then `--archive-only`; current win.7 stays unchanged. Never overlap packaging writes with installation reads. Keep versioned installs and rollback; do not terminate user processes or overwrite private notes for QA.
5. A writable remote is needed for push/CI; upstream rejects this account with HTTP 403. No fork or publication was created. Choose Windows signing/distribution and update policy before public release.

Skill verdict: no installed/Heptabase skill edit is needed. Exact-origin bounded native framing, owned immutable installs, isolated child handles and evidence boundaries belong in repository conventions and tests.
