# BUZZARD LAUNCH SEQUENCE MAXIMAL ONE PACKAGE

Final staged launch orchestration for Buzzard go-live.

## Launch order

1. Domain + production server
2. PIM + real product data
3. Supplier feeds
4. Payment
5. Shipping
6. Marketplace
7. Telephony
8. Security + E2E
9. Launch

No stage auto-activates the next. Each must pass its readiness gate.

## CLI

```bash
cd intelligence
python3 main.py complete-launch-sequence-health
python3 main.py complete-launch-sequence-stages
python3 main.py complete-launch-sequence-demo
python3 main.py complete-launch-sequence-schema
python3 main.py complete-launch-sequence-docs
```

## API

- `GET /launch/health`
- `GET /launch/stages`
- `GET /launch/sequence`
- `GET /launch/schema/pim-import`
- `GET /launch/demo`

## Important

Software cannot purchase domains, create merchant accounts, or invent API credentials.
`live_activation` remains false until real external configuration is complete.

See also: `launch_sequence_maximal/docs/LAUNCH_SEQUENCE_FINAL.md`, `E2E_TEST_PLAN.md`
