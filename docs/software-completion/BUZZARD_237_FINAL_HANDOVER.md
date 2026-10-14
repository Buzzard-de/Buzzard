# Buzzard 237 — Final handover (this execution)

Date: 2026-10-14  
This document is a session handover, not a claim that 237/237 items are complete.

## Git

| Field | Value |
| --- | --- |
| Branch | `cursor/software-completion-local-c293` |
| Starting HEAD | `31d968b596c0a049a8ca700602a40f1d1a644402` |
| Push / merge / deploy / PR | **not performed** |

## Totals

Canonical original titles: **UNKNOWN**. Register first created in `4b0ce17`; no earlier 237 source recovered.

| Final state | Count | % of 237 |
| --- | --- | --- |
| VERIFIED_100 | 0 | 0.0% |
| PARTIAL | 216 | 91.1% |
| HUMAN_APPROVAL_REQUIRED | 13 | 5.5% |
| BLOCKED_EXTERNAL_DEPENDENCY | 7 | 3.0% |
| NOT_APPLICABLE_WITH_EVIDENCE | 1 | 0.4% |

Mean established-scope completion: **69.3%** (was 69.1%). Not 237/237.

## What was implemented this pass

- Pricing: paymentFee / paymentFeeRate when provided; no invented fees; €0.50 floor; no €0.10 undercut.
- Idempotent draft cancel and commerce `cancelOrder` (no commercial side effects).
- Returns: estimated vs actual; supplier credit not assumed.
- Marketplace: dry-run listing, presence-only auth config, RATE_LIMIT/AUTH classification; live=false.
- Supplier feeds: sourceId preserved; invalid supplier cost rejected.
- Approval consume after expiry refused.
- Original 237 checklist re-searched and still not found.

## Highest-priority remaining work

1. Recover original 237 titles/criteria or obtain an explicit waiver.
2. Remaining PARTIAL items that still need missing requirements.
3. Human approvals and external credentials (never invent LIVE_VERIFIED).
