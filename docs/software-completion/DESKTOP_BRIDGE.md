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

## Windows packaging

This environment is Linux. Commands:

```powershell
desktop-bridge\windows\BuzzardBridge.cmd
powershell -File desktop-bridge\windows\install-dev.ps1
```

Installer generation and Windows UI verification: **NOT_VERIFIED**. `install-dev.ps1` only creates a Start Menu shortcut when Node is present. No code signing.

## Security

- Authorized workspace roots only; path traversal rejected.
- Imported `commands` / `shell` / `exec` keys are ignored, never executed.
- Secrets redacted from task files, logs, and snapshots.
- Loopback bind + bearer token.
- RUNNING requires explicit approval.
- Interrupted RUNNING tasks recover as BLOCKED.

## Tests

```bash
npm run test:bridge
```
