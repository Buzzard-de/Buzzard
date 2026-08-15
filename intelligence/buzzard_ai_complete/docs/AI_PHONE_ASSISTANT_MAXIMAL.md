# BUZZARD AI PHONE ASSISTANT MAXIMAL

Multilingual voice assistant architecture for Buzzard product support.

## Architecture

Phone/SIP provider → Telephony Adapter → Realtime Voice Adapter → Language Router
→ Intent & Entity Layer → Tool Gateway → PIM / Inventory / Compatibility / CRM
→ Response → Voice → Call Summary

## Features

- 59-language routing (reuses Buzzard multilingual layer conceptually)
- Intent detection: product search, availability, price, compatibility, order, human handoff
- Tool contracts: PIM search, inventory/price, compatibility, lead creation, handoff
- Conversation state machine with guardrails (no invented stock/price/compatibility)
- Provider-neutral telephony and realtime voice adapters
- Recording disabled by default; credentials via environment only

## CLI

```bash
cd intelligence
python3 main.py complete-phone-health
python3 main.py complete-phone-analyze --text "Haben Sie das auf Lager?"
python3 main.py complete-phone-demo
python3 main.py complete-phone-schema
python3 main.py complete-phone-docs
```

## API

- `GET /phone/health`
- `GET /phone/schema/tools`
- `GET /phone/schema/conversation`
- `POST /phone/analyze`
- `GET /phone/demo`

## Live deployment

Integration-ready only. Real calling requires telephony/SIP provider, verified number,
and production voice/realtime credentials — never stored in source code.
