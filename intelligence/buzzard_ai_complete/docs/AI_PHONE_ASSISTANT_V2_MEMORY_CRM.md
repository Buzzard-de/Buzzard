# BUZZARD AI PHONE ASSISTANT V2 — MEMORY & CRM

Extends the phone assistant with customer memory and CRM context.

## Memory layers

- **Session memory** — current call only
- **Customer memory** — approved, purpose-based facts across calls

Examples: preferred language, previous call summary, open requests.

## Privacy & identity

- Phone numbers stored as hashes in the memory DB
- Identity verification gate before private context is exposed
- Unverified callers get no customer/order memory
- Passwords, payment data, and auth codes are never stored
- Call recording disabled by default

## CLI

```bash
cd intelligence
python3 main.py complete-phone-memory-health
python3 main.py complete-phone-memory-demo
python3 main.py complete-phone-memory-context --customer-id <id> --verification-level phone_verified
python3 main.py complete-phone-memory-docs
```

## API

- `GET /phone/memory/health`
- `GET /phone/memory/schema`
- `POST /phone/memory/customer`
- `GET /phone/memory/context/{customer_id}?verification_level=phone_verified`
- `POST /phone/memory/fact`
- `POST /phone/memory/call`
- `GET /phone/memory/demo`

## Verification levels

- `none` — no private memory
- `phone_verified` — approved facts + recent calls
- `customer_authenticated` — same gate, reserved for account login
- `order_authenticated` — same gate, reserved for order reference auth
