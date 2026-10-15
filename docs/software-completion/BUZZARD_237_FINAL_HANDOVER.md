# Buzzard 237 — Final handover (Esat Bey master security)

Date: 2026-10-15  
Esat Bey is **not** 100% and **not** LIVE_VERIFIED.

## Git

| Field | Value |
| --- | --- |
| Branch | `cursor/software-completion-local-c293` |
| Start this pass | `b2bdf57` |
| Push / PR / deploy | **not performed** |

## Scores (same 237-item arithmetic mean)

| Scope | Previous (register-verified) | New | Delta |
| --- | --- | --- | --- |
| Buzzard 237 | 73.53% | **73.77%** | +0.24 pp |
| Esat Bey items 227–237 | 77.82% | **83.00%** | +5.18 pp |

VERIFIED_100 = 0. HUMAN = 13. BLOCKED_EXTERNAL = 7.

## Implemented

- Real Esat paths are `server/lib/pusat/{esatSecurity,guardian,lifecycle}.js` (not `server/lib/software/esatSecurity.js`).
- Identity 2FA confirm-enable with AES-GCM at rest, recovery hashes, login TOTP gate.
- Local incident classification (not SOC). Rule-based anomaly (`ml: false`).
- Approval-unavailable fail-closed on `executeTask`.
- Marketplace publish Guardian deny on software lifecycle harness.

## Not 100%

- Live SOC / SIEM / IR drill
- Production backup restore (HUMAN, not RESTORE_TESTED)
- Remote Guardian
- Marketplace/carrier live credentials
- Original 237 acceptance criteria UNKNOWN
