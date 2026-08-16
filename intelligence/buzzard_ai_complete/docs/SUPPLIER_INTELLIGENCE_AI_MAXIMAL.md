# BUZZARD SUPPLIER INTELLIGENCE AI — MAXIMAL

Central supplier intelligence engine for discovery, evidence-backed risk scoring,
commercial fit checks, comparison, and human-gated onboarding recommendations.

## Pipeline

Discovery → Identity Verification → Evidence Collection → Risk Scoring →
Commercial Fit → Integration Fit → Comparison → Human Approval → Memory →
Continuous Re-evaluation

## CLI

```bash
python3 main.py complete-supplier-intelligence-health
python3 main.py complete-supplier-intelligence-demo
python3 main.py complete-supplier-intelligence-schema
python3 main.py complete-supplier-intelligence-docs
```

## API

- `GET /supplier-intelligence/health`
- `GET /supplier-intelligence/schema`
- `GET /supplier-intelligence/policy`
- `GET /supplier-intelligence/demo`

## Safety

- Public/open sources only — no credential theft or auth bypass
- Missing evidence never becomes a positive score
- AI recommends; human approval required before commercial onboarding
- `live_activation: false`
- `BUZZARD_SALES_ENABLED=0`
