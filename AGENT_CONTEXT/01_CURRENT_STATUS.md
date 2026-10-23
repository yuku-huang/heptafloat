# Current status

2026-10-24: Windows implementation, portable x64 packaging, isolated native UI smoke, and real CLI read-only integration are complete. Unit tests cover 13 behaviors. Packaged EXE checks and validation boundaries are tracked in the changelog. The output ZIP is `dist/HeptaFloat-0.9.12-win.1-windows-x64.zip`.

Working branch: `codex/windows-port`; clean upstream baseline: `f32f34f`. `origin` is the upstream public repository, and the connected account reports `push:false`. Do not claim a remote push/CI/release unless verified.

The app supports floating/always-on-top windows, close-to-tray, single instance, configurable global hotkey, themes/text size, persistent recents/window position, search/new cards, official-CLI read/save and image integration, MD5 checks, and recovery drafts. Windows CLI `0.7.0` reads were verified without mutating real notes.

Pending acceptance: real writes/uploads, physical IME, multi-monitor/DPI, login startup/reboot, Windows 10 hardware, and native macOS regression build. Windows updater/notch/automatic journal links are not implemented.
