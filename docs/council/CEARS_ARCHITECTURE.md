# CEARS Architecture (design only)

**Status:** CODE = design document. TEST = none against live channels. INTEGRATION = not wired. LIVE = **no**. SECURITY = fail-closed by absence of senders.  
**Date:** 8 November 2026, Europe/Berlin  
**SoT:** `docs/council/BUZZARD_MASTER_FULL_SYSTEM_AUDIT_REPORT.md`  
**This is not a live alarm system.** No phone, SMS, email, SOC, or government channel is connected.

## 1. Purpose

CEARS (Critical Event Alert and Response System) is the intended command path for security and continuity incidents. Until human approval and verified contacts exist, CEARS must **record and classify locally** and must **not** notify the outside world.

## 2. Roles (people / agents)

| Role | Identity | Duty | Cannot |
| --- | --- | --- | --- |
| Command | Pusat | Open/close incident record, assign Esat + Sinan, keep timeline | Auto-file complaints, auto-page third parties |
| Security lead | Esat Bey | Severity, containment advice, evidence hold | Be the sole defense; disable security policy |
| Technical lead | Sinan Bey | Root-cause hypotheses, rollback plan, code/config freeze advice | Push/merge/deploy without human |
| Decision owner | Human operator | ACK, severity override, notify, restore, legal send | Delegated to any AI |

False statement to avoid: “24/7 CEARS is operational.” Cursor sessions and this VM are not a SOC.

## 3. Severity

| Code | Meaning | Example (not exhaustive) | Auto-notify (this design) |
| --- | --- | --- | --- |
| P0 | Immediate harm to money, identity, or availability of production | Confirmed payment fraud, ransomware on live DB | **forbidden until contacts verified** — local alarm record only |
| P1 | Serious, contained or uncertain | Egress deny storm, suspected account takeover | local record + human ACK required |
| P2 | Degraded, no confirmed loss | Backup job failed in isolated drill | local record |
| P3 | Hygiene / audit | Stale dependency, docs drift | local record |

Uncertainty **raises** severity for action freeze; it does **not** authorize external send.

## 4. Classification axes (orthogonal)

- **Confidentiality** / **Integrity** / **Availability**
- **Safety of funds** (orders, payouts, tax)
- **Safety of persons / data subjects** (PII)
- **Attribution confidence** (`UNATTRIBUTED` | `INFRASTRUCTURE_ONLY` | `PERSON_SUSPECTED_NOT_PROVEN`)
- IP/ASN is **infrastructure**, never a legal identity.

## 5. Incident record (logical schema)

```
incident_id, opened_at, opened_by,
severity, cia, funds_risk, pii_risk,
status: OPEN | ACKED | CONTAINING | EVIDENCE_HOLD | HUMAN_REVIEW | CLOSED | FALSE_POSITIVE,
timeline[],
evidence_ids[],
ack: { by, at, channel } | null,
notify_attempts: []  // must stay empty until HUMAN_NOTIFY_APPROVED
alternative_channel_status: NOT_CONFIGURED
close_report_id | null
```

No row in this design is written to production databases in this task.

## 6. 24/7 alarm — technical requirements ( unmet )

To claim 24/7 later, **all** of these must be true and tested:

1. Two independent humans with ACK duty and documented backup.
2. Two independent notify channels (e.g. on-call phone **and** signed email), each with a verified destination.
3. ACK timeout and retry with backoff; after N failures, **alternate channel**.
4. Alternate channel is a **pre-agreed** human procedure (not “email Europol”).
5. Fail-closed if channel config missing → stay local.
6. Rate-limit to prevent alert storms paging the operator into error.
7. False-positive workflow that does not delete the original timeline.

**Current:** all of 1–7 are **NOT_CONFIGURED**.

## 7. Multi-channel notify (design)

Order after human approval only:

1. Local dashboard / Pusat incident panel (not built).
2. Operator-approved email (not configured).
3. Operator-approved voice/SMS (Zeynep LIVE_CALL remains blocked).
4. Contracted SOC/MSSP **if a contract exists** (none verified in audit).
5. Competent authority **only** via legal process after human + counsel — see complaint design. Not CEARS auto-send.

BKA, LKA Hessen, BSI/CERT-Bund, CSIRTs, Europol, INTERPOL: **directory research is not done in this document**. They are **not** active endpoints.

## 8. ACK and retry

- First notify does not close the incident.
- ACK is a signed human action (`HUMAN_ACK`).
- Retry schedule (proposal, not implemented): 0 / 5 / 15 / 60 minutes, then alternate channel.
- AI ACK is invalid.

## 9. False positives

- Status `FALSE_POSITIVE` still keeps timeline and hashes.
- Requires Esat note + human ACK.
- Does not un-hold evidence.

## 10. Timeline and close report

Close report fields: what happened, what was **not** proven, containment, residual risk, follow-up tickets, evidence locker IDs, attribution confidence, “no person convicted from IP”.

## 11. Honest status

| Dimension | Value |
| --- | --- |
| CODE | document only |
| TEST | not a pager test |
| INTEGRATION | none |
| LIVE | no |
| SECURITY | no auto-exfil of incident data |
