# Buzzard Desktop Bridge

Local Windows-compatible coordination tool for **explicit task/report handoff** between a human ChatGPT session and a Cursor workspace.

It is **not** Pusat, **not** a business orchestrator, and **not** a ChatGPT-session integration.

## Actual connection mechanisms

| Integration | Status | Mechanism |
| --- | --- | --- |
| ChatGPT app/session | NOT_AVAILABLE | No supported private conversation API. The bridge does not scrape cookies or invent endpoints. |
| ChatGPT file/clipboard handoff | IMPLEMENTED | Export `.task.json` + `.prompt.md` for paste. Import a report file. |
| OpenAI API | OPTIONAL / NOT_CONFIGURED unless `OPENAI_API_KEY` is present | Separate API. Does **not** share the ChatGPT conversation or subscription. Live calls are not made by default. |
| Cursor | FILE_HANDOFF (`CLI_DETECTED` if `cursor` is on PATH) | Writes `.buzzard-bridge/inbox` and `outbox` under an authorized workspace. Does not auto-run Cursor, commit, push, merge, or deploy. |
| Two-way direct integration | false | Explicit file/report handoff only. |

## Responsibilities

Pusat: business workflows, AI orchestration, product write boundary, approvals, commercial audit.

Desktop bridge: workspace allowlist, task states, export/import, local audit, human approval for RUNNING, connection honesty.

## Run

```bash
npm run bridge:start
# or on Windows: desktop-bridge\windows\BuzzardBridge.cmd
```

Binds `127.0.0.1` only. A random token is required for UI/API routes except `/health`.

State directory: `BUZZARD_BRIDGE_HOME` or `~/.buzzard-desktop-bridge` (not `/tmp`).

## Laptop download

One zip, no git commands:

https://github.com/Buzzard-de/Buzzard/raw/cursor/desktop-bridge-shortcut-c293/desktop-bridge/BuzzardDesktopBridge.zip

Extract, then double-click `START.cmd`. Node.js 20+ is required.

## Windows desktop shortcut

On a Windows PC, from the Buzzard repo:

```powershell
powershell -File desktop-bridge\windows\install-desktop-shortcut.ps1
```

This creates:

- Desktop: `Buzzard Desktop Bridge.lnk`
- Start Menu: `Buzzard`

Double-click the desktop shortcut. The first launch also recreates that shortcut. The browser opens on `127.0.0.1`. This environment is Linux, so desktop-shortcut creation is **NOT_VERIFIED** here.

```powershell
desktop-bridge\windows\BuzzardBridge.cmd
powershell -File desktop-bridge\windows\uninstall.ps1
```

## Security

- Authorized workspace roots only; path traversal rejected.
- Imported `commands` / `shell` / `exec` keys are ignored, never executed.
- Secrets redacted from task files, logs, and snapshots.
- Loopback bind + bearer token.
- RUNNING requires explicit approval.
- Interrupted RUNNING tasks recover as BLOCKED.

## Task/report protocol

- Task schema: `buzzard.desktop-bridge.task.v1`
- Report schema: `buzzard.desktop-bridge.report.v1`
- Unsupported versions are rejected.
- Max import size: 256 KiB.
- Imported `productionVerified` / `liveVerified` claims do **not** complete a task. The bridge evaluates completion.
- Imported `commands` / `shell` / `exec` keys are ignored and never executed.

## One-command handoff (manual remaining steps)

`exportTask` writes inbox/outbox files and returns `steps` plus `cursorAutoInvoked: false`. Operator still pastes into ChatGPT and opens Cursor. No private session API.

## Windows operator commands (NOT_VERIFIED on this Linux host)

```powershell
desktop-bridge\windows\BuzzardBridge.cmd
powershell -File desktop-bridge\windows\install-dev.ps1
powershell -File desktop-bridge\windows\uninstall.ps1
$env:BUZZARD_BRIDGE_OPEN_BROWSER = "1"
$env:BUZZARD_BRIDGE_PORT = "47821"
```

Logs: `%USERPROFILE%\.buzzard-desktop-bridge\bridge.log`

## Tests

```bash
npm run test:bridge
```
