# BUZZARD AI PHONE ASSISTANT V3 — TELEPHONY FINAL

Telephony integration layer for live phone calls (integration-ready, disabled by default).

## Features

- Signed webhook gateway
- Inbound call sessions + bidirectional media bridge contract
- Realtime speech adapter boundary
- Call routing with customer memory context
- Human handoff + barge-in contract
- Safe production defaults (`enabled: false`, recording off)

## CLI

```bash
cd intelligence
python3 main.py complete-phone-telephony-health
python3 main.py complete-phone-telephony-demo
python3 main.py complete-phone-telephony-schema
python3 main.py complete-phone-telephony-docs
```

## API

- `GET /phone/telephony/health`
- `GET /phone/telephony/schema`
- `POST /phone/telephony/inbound`
- `POST /phone/telephony/hangup/{call_id}`
- `GET /phone/telephony/demo`

## Go live

See `docs/PHONE_GO_LIVE.md` and `ai_phone_assistant/deployment/phone.env.example`.

Requires real telephony provider, verified number, public webhook/media URLs, and secret manager credentials.
