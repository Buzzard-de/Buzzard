# Digital Evidence Locker (design only)

**Status:** CODE = design. TEST = none on production data. INTEGRATION = none. LIVE = **no**. SECURITY = no export path implemented in this task.  
**Date:** 8 November 2026, Europe/Berlin  
**This is not WORM storage.** HMAC is **not** a digital signature and **not** immutability.

## 1. Purpose

Hold copies of security-relevant artifacts so a later human/legal process can show **what was collected, when, by whom, and that the original bytes were not altered**. It does not prove a person committed a crime.

## 2. Non-goals (this phase)

- No production database snapshot.
- No customer export.
- No upload to counsel, police, or cloud “legal hold” products.
- No claim of hardware WORM / object-lock.
- No automatic complaint bundle send.

## 3. Object model

| Field | Rule |
| --- | --- |
| `evidence_id` | Unique, non-guessable |
| `class` | `ORIGINAL` or `WORKING_COPY` — never mixed |
| `sha256` | Of the **bytes as stored** |
| `source` | System/file/log stream name |
| `acquired_at` | Timestamp with timezone (Europe/Berlin + UTC) |
| `acquired_by` | Human id **or** agent id (Esat/Sinan/Pusat) |
| `method` | How obtained (export, copy, screenshot hash, log slice) |
| `read_only` | Originals: true forever in software policy |
| `parent_id` | Working copies point at original |
| `confidence` | `HIGH` / `MEDIUM` / `LOW` / `UNKNOWN` |
| `alt_explanations[]` | Required when attribution is inferred |
| `export_allowed` | default false; `HUMAN_EXPORT_APPROVED` only |

## 4. Original vs copy

- Write original once; subsequent “edits” create a **working copy** with new id and `parent_id`.
- Analysis tools may only open working copies.
- Hash mismatch on original → `INTEGRITY_FAIL`, freeze the bag, do not “repair” bytes.

## 5. Chain of custody

Append-only events:

`COLLECTED → HASHED → STORED → ACCESSED → COPIED → REVIEWED → (optional) EXPORT_REQUESTED → EXPORT_DENIED|EXPORT_APPROVED_NOT_SENT`

Each event: actor, time, reason. Missing actor = invalid event.

Software append-only is **not** WORM. A privileged host admin can still delete files. Report that limit honestly.

## 6. Manifest (signed — future)

A manifest lists evidence_ids + sha256 + custody hash chain.

Allowed later signature methods (none implemented):

- Human-held hardware key (preferred)
- Org code-signing key under dual control

**Rejected as “signature” for court packaging:** HMAC with an app secret, git commit, or SHA-256 alone.

HMAC may be used as an **internal integrity MAC** if the key is not on the same disk as the evidence. Even then, call it MAC, not signature, not WORM.

## 7. Access

- Default deny.
- Esat: security review read of **working copies**.
- Sinan: technical review of working copies.
- Pusat: metadata only unless human grants.
- Human: originals only on documented need.

Every read of an original is itself a custody event.

## 8. Confidence and alternatives

Never store `guilty_person`. Store `observed_indicator` (IP, ASN, device id, file hash) and `alt_explanations` (VPN, NAT, malware, false positive).

## 9. Export

Export pack = working copies + manifest + this policy excerpt.  
Requires: human approval, legal basis text, destination identity, **no auto-send**.

## 10. Acceptance tests (not yet automated against a locker)

1. Original hash stable after copy creation.  
2. Working copy mutation does not change original hash.  
3. Unknown actor cannot append custody.  
4. Export without `HUMAN_EXPORT_APPROVED` fails.  
5. HMAC-only pack is labeled `NOT_A_SIGNATURE`.  
6. No production path is used in unit tests (temp dir only, when code exists).

## 11. Honest status

No locker directory was created on this host. No evidence was ingested. Guardian SQLite was **not** used as evidence.
