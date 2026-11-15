# Egress remainder (9 November 2026, Europe/Berlin)

Continuation from `f5155dc0` / Command 3 leftovers. Isolated branch `cursor/buzzard-egress-remainder-c293`.  
Policy file unchanged: DEFAULT DENY. No live HTTP. No WAF change. Archives not rewritten.

## Done this slice

| Item | Status |
| --- | --- |
| `intelligence/buzzard_ai_gesamt/research/engine.py` | raw `urlopen` replaced with `guarded_urlopen` |
| aktiv copy of the same engine | same gate (duplicate tree) |
| `backupAutomation.js` | `execSync("node …")` → `execFileSync(process.execPath, [script])` (no shell) |
| Smoke `scripts/*` raw fetch | **still open** (localhost is private-denied; not converted) |
| Archive `urlopen` | **still open** on purpose |

## Honest leftover

- Operator smoke scripts.
- Archive Python.
- Host firewall / Render WAF unverified.
- Job URL gate still explicit keys only.

CODE: this slice. TEST: backup source check + Python 8 (prior 7 + gesamt import). LIVE: no.
