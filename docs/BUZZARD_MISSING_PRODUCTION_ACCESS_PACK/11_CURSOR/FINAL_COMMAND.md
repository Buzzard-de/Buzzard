# CURSOR FINAL COMMAND

Inspect the current Buzzard repository and this access pack.

Do not rebuild completed #347–#354 engines.

Implement/fix only missing access, deployment, provider configuration, diagnostics, live-validation wiring and final operational gaps.

For every external provider:
- support genuine credentials via secret references
- verify configuration
- perform safe read-only validation first
- use existing controlled gates for mutations
- never fabricate live evidence

If credentials are unavailable, continue all software work and report the exact status as NOT_CONFIGURED / NOT_AVAILABLE / UNVERIFIED / BLOCKED.

Run:
- existing provider tests
- existing production gates
- typecheck
- lint
- build
- security
- final production status

Never enable SALES_ENABLED automatically.

Final report must include:
1. providers configured
2. providers actually live-validated
3. genuine evidence references (metadata only, never secrets)
4. production flags
5. real side-effect counters
6. remaining blockers
7. final sales state
