# Buzzard Telephone Assistant — Reality Audit

Date: 2026-10-15  
Mode: **LOCAL READ-ONLY AUDIT** (Phase 1)  
This file did not exist before this audit (`ABSENT` at inspect). Existing registers and reports were not overwritten. No implementation changes.

**No completion percentage is calculated.** Implementation and verified functionality are reported separately. Local mocks are never classified as live.

---

## 1. Repository identity

| Field | Value |
| --- | --- |
| Working directory | `/workspace` |
| Branch | `cursor/software-completion-local-c293` |
| HEAD | `a4b84b90a8768464031f6e4d88c0f6fdc3df2181` |
| HEAD short | `a4b84b9` |
| Upstream | `origin/cursor/software-completion-local-c293` **ahead 37** |
| Working tree at inspect | **clean** (no untracked / uncommitted user files) |
| Push / PR / merge / deploy | **not performed** |
| `git fetch` | **not performed** |
| `git reset --hard` / `git clean -fd` | **not used** |
| Branch switch | **not performed** |
| Paid APIs / real calls / real messages | **not performed** |

HEAD is **not** the previously reported software-completion HEAD `8613c3b`. Current HEAD is the forensic-audit commit on the same branch (`Record the local 237-criteria source forensic audit.`).

Standing locks (boolean only; values not printed):

| Flag | Observed |
| --- | --- |
| `BUZZARD_SALES_ENABLED` | present; **not** `1` (is `0`) |
| `BUZZARD_PRODUCT_SOT_ACTIVE` | absent |
| `BUZZARD_LIVE_PAYMENTS` | absent |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | **absent** |
| `OPENAI_API_KEY` / `DEEPGRAM_API_KEY` / `ELEVENLABS_API_KEY` | **absent** |
| `WEBRTC_SIGNALING_URL` / `DIGITAL_HUMAN_ENDPOINT` | **absent** |
| `BUZZARD_VOICE_LIVE_PROBE` / `BUZZARD_PHONE_ENABLED` / `BUZZARD_AI_LIVE_PROBE` | **absent** |

### Relevant reports already in the tree (not overwritten)

- `docs/software-completion/BUZZARD_MASTER_PROJECT_STATUS_2026-10-14.md` — voice/Twilio/Realtime listed as interface-only, `live: false`, `blocked: true`
- `docs/software-completion/EXTERNAL_CONFIGURATION_CHECKLIST.md` — Twilio and Voice Realtime **NOT_CONFIGURED** unless env present; no paid session
- `docs/software-completion/PROVIDER_READINESS_MATRIX.md` — STT/TTS/WebRTC/Realtime/digital human: interface, no live
- `intelligence/buzzard_ai_complete/docs/AI_PHONE_ASSISTANT_V3_TELEPHONY.md`, `PHONE_GO_LIVE.md` — integration-ready wording; live still requires provider + credentials
- Duplicate copies under `intelligence/buzzard_ki_gesamt/aktiv/…` (same Python package, not a second live path)

Recent `git log --grep` for “phone” is dominated by **mobile homepage UI** (category drawer / Germany phone band), not telephony.

---

## 2. Two stacks (do not conflate)

The repository contains **two separate** telephone-adjacent implementations. Neither is a live PSTN assistant.

### Stack A — Node Buzzard API (canonical shop/server)

| Piece | Path |
| --- | --- |
| Voice adapters (always blocked) | `server/lib/software/voice.js` |
| Health always lists `twilio` blocked | `server/lib/software/health.js` |
| Provider inventory env names | `server/lib/software/externalIntegrations.js` |
| JSON “phone assistant” (order lookup, not calls) | `server/lib/phoneAssistantService.js` |
| HTTP routes | `server/plugins/aiAutomationPlugin.js` → `POST /api/ai/phone/{verify-order,order-status,escalate}` |
| Route auth | `server/lib/routePermissions.js` — those three routes are **PUBLIC** |
| Orchestrator (not called by phone routes) | `server/lib/pusat/lifecycle.js` `executeTask` |
| Guardian | `server/lib/pusat/guardian.js` (on `executeTask`, not on `/api/ai/phone/*`) |

There is **no** Twilio webhook route in the Node server. The `twilio` npm package is **not** a dependency. `voice.mockSession` never opens media (`live: false`, `callStarted: false`). `voice.routeTextTask` sets `pusat: true` as a **flag** and **does not** call `executeTask`.

### Stack B — Python `buzzard_ai_complete.ai_phone_assistant`

| Piece | Path |
| --- | --- |
| Facade / demo inbound | `intelligence/buzzard_ai_complete/ai_phone_assistant/telephony_facade.py` |
| FastAPI `/phone/*` | `…/api/routes.py` (mounted from `intelligence/buzzard_ai_complete/api/app.py` **if FastAPI is installed**) |
| Generic provider | `…/telephony/providers/generic_signed_media.py` (`name = "generic_signed_media"`) |
| Abstract Twilio-class telephony | `…/connectors/telephony_adapter.py` — `NotImplementedError` |
| Abstract Realtime | `…/connectors/realtime_adapter.py` and `…/telephony/media/speech_adapter.py` — `NotImplementedError` |
| Text intent (keyword) | `…/phone/intent.py` |
| Stub agent | `StubPhoneAgent` in `telephony_facade.py` |
| Local SQLite memory | `…/memory/store.py` → `data/phone_memory.sqlite3` (gitignored) |
| Config (enabled false) | `…/config/phone_production.json` |
| Env names (no secrets) | `…/deployment/phone.env.example` |
| CLI demo | `intelligence/main.py` `complete-phone-telephony-*` |

The string **Twilio** does not appear under `intelligence/buzzard_ai_complete` Python sources. Inbound JSON may include Twilio-like keys (`CallSid`, `From`, `To`) but there is no Twilio SDK and no Twilio signature algorithm.

`gizli/voice.py` / `Buzzard/voice.py` is a **local voice UI** launcher (`127.0.0.1:8787`), not the telephony webhook pipeline. It was not started in this audit.

---

## 3. Pipeline trace (incoming call → hangup)

Statuses used: `NOT_IMPLEMENTED` | `STUB` | `PARTIAL` | `CODE_READY` | `CONFIGURED` | `SANDBOX_VERIFIED` | `LIVE_VERIFIED`.  
`CONFIGURED` / `*_VERIFIED` require evidence. None of the live/sandbox-call statuses apply.

| Stage | Actual implementation | Status | Evidence |
| --- | --- | --- | --- |
| Incoming PSTN/SIP call | No provider number, no SIP stack, config `enabled: false`, Node health `twilio: false` | **NOT_IMPLEMENTED** | env absent; `phone_production.json` `enabled: false`; `voice.health().liveVerified === false` (unit test) |
| Telephony webhook | Python `POST /phone/telephony/inbound` (FastAPI, separate app). Node: **no** `/twilio` or voice webhook | **PARTIAL** (demo HTTP) / Node **NOT_IMPLEMENTED** | `api/routes.py`; no Node handler |
| Auth / signature | `signed_webhook_validator`: demo header `X-Buzzard-Demo` **or** any truthy `X-Signature`. Not Twilio `validateRequest` HMAC | **STUB** (presence check) | `telephony_facade.py` lines 19–23; unsigned `{}` rejected in unit test |
| Audio / STT / Realtime | `RealtimeSpeechAdapter` / `RealtimeVoiceAdapter` raise `NotImplementedError`. Config lists PCMU 8 kHz / 24 kHz but nothing transcodes | **STUB** | `speech_adapter.py`, `realtime_adapter.py`, `phone_production.json` `audio` |
| Pusat Orchestrator | Phone HTTP and Python agent **do not** call `executeTask`. `voice.routeTextTask` is a text stub with `pusat: true` | **NOT_IMPLEMENTED** on the telephone path | grep: no `executeTask` under phone modules; `voice.js` `routeTextTask` |
| Guardian / authorization | Guardian runs on Pusat `executeTask`. Phone routes are public JSON. Python `StubPhoneAgent` has no Guardian | **NOT_IMPLEMENTED** on the telephone path; Guardian **CODE_READY** only on Pusat tasks | `lifecycle.js`; `routePermissions.js` PUBLIC phone routes |
| Human Approval Center | Mandatory on Pusat consume for stored actions. Phone tools do not request HAC | **NOT_IMPLEMENTED** on the telephone path; HAC **CODE_READY** for Pusat | `pusatApprovalExceptions` tests this audit |
| Response generation | Keyword `detect_intent` + canned `StubPhoneAgent` text; Node order-status JSON via `aiChatService.findOrder` | **PARTIAL** (text demo) | `intent.py`, `StubPhoneAgent`, `phoneAssistantService.js` |
| Audio response / TTS | No playback bytes; `play_audio` / `output_audio` unimplemented | **NOT_IMPLEMENTED** | connectors + speech_adapter |
| Call termination / errors | In-memory `hangup` dict; `CALL_NOT_FOUND` if unknown id. No provider hangup API. FastAPI inbound `demo=True` **default** skips signature | **PARTIAL** | `telephony/service.py`, `api/routes.py` |
| Live call | Never opened | **not LIVE_VERIFIED** | all adapters `live: false` / `blocked: true` |

---

## 4. Twilio

| Question | Finding |
| --- | --- |
| Webhook handlers exist? | **Not for Twilio.** Generic Python inbound exists. Node has none. |
| Incoming signatures validated? | **Not Twilio signatures.** Demo header bypass; otherwise `bool(signature)` only. |
| Call state and errors? | In-memory `self.sessions`; hangup raises `CALL_NOT_FOUND`; no Twilio status callbacks. |
| Callback URLs / env names documented? | **Yes, names only:** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` (`voice.js`, `EXTERNAL_CONFIGURATION_CHECKLIST.md`). Python: `BUZZARD_PHONE_PUBLIC_WEBHOOK_BASE_URL`, `BUZZARD_PHONE_MEDIA_STREAM_URL` (`phone.env.example`). Config `public_webhook_base_url` / `media_stream_url` empty. |
| Credentials | **Absent** in this environment (boolean check). Unverified because absent. |
| Local/sandbox test without real calls or charges? | **Yes:** `voice.mockSession({ adapter: "twilio" })` and Python `PhoneTelephonyFacade().demo_flow()` / unsigned-reject test. Neither places a call. |

`externalIntegrations.js` sets `adapterExists: true` for Twilio pointing at `voice.js`. That file is an **interface that always blocks live media**. Treat that as **STUB**, not a Twilio adapter.

---

## 5. OpenAI Realtime / speech

| Question | Finding |
| --- | --- |
| Real vs stub | **Stubs / abstract classes.** No OpenAI Realtime WebSocket client. Env hint `OPENAI_API_KEY` for `realtime` / `stt` / `tts` in `voice.js` only. |
| Audio formats | Declared in JSON (`PCMU`, 8000 / 24000, `barge_in: true`). **Not implemented.** |
| Interruption / silence / timeout / disconnect | `interrupt()` / `close()` are `NotImplementedError`. Node `validateConfig` only checks timeout range 1–60000 ms on mocks. |
| Errors fail safely? | Unimplemented methods throw if invoked. Live path is not reachable without writing a client. Node path never opens a session even if probe env were set (`voice.js` note: probe flag still does not open media). |
| Local test without paid calls? | **Yes** — do not instantiate live clients; existing unit tests do not call OpenAI. `OPENAI_API_KEY` absent. |

---

## 6. Pusat and Esat security (telephone path)

Static inspection + existing tests only.

| Requirement | Result |
| --- | --- |
| Telephone requests reach existing Pusat handler | **No.** `/api/ai/phone/*` and Python `/phone/*` do not call `executeTask`. |
| User input cannot bypass authorization | **Gap on Node phone JSON:** `verify-order` / `order-status` are **public**. Access factor is `orderNumber + email` (+ optional postal code). Knowledge of those values returns order status and tracking. Not Guardian-gated. |
| Guardian checks protected actions | **Not on telephone.** Guardian **does** fail-closed on Pusat `executeTask` (this audit: softwareCompletion test 42 passed). |
| HAC mandatory for human-approval actions | **Not wired to telephone.** Pusat HAC self-approve tests passed (`ai_cannot_self_approve`). |
| Assistant cannot approve itself | True **for Pusat**. Telephone stub never requests approval. |
| No financial/irreversible action without authorization | Node phone does not charge. Sales is not `1`. Python policy JSON says never take payment; tools return `unavailable` without callbacks. Not a live-payment proof. |
| Sensitive audio / transcripts / credentials not unnecessarily logged | No audio path. Python hashes phone numbers (SHA-256) in SQLite. Node phone handlers do not log tokens. Public order-status **returns** tracking numbers to the caller. Twilio secrets are redacted from health JSON (unit test). |

Esat Bey is **not** a telephony defender. It is a local Guardian policy on Pusat tasks (`BUZZARD_MASTER_PROJECT_STATUS_2026-10-14.md`). Python phone has **no** Esat import.

---

## 7. Tests

No end-to-end phone call was executed. Unit/demo tests **do not** prove live telephony.

### Commands run (local, no external network / no paid APIs)

**A. Vitest (Node)**

```
npx vitest run server/__tests__/softwareCompletion.test.mjs \
  server/__tests__/softwareMasterCompletion.test.mjs \
  server/__tests__/pusatApprovalExceptions.test.mjs
```

| Result | Count |
| --- | --- |
| Files | 3 passed |
| Tests | **99 passed**, 0 failed, 0 skipped |
| Duration | ~4.4 s |

These suites include: voice `liveVerified === false` / Twilio `blocked: true`; mock session `live: false`; Guardian fail-closed; HAC refuse AI self-approval; consume-once without live action. They are **not** a telephone E2E.

**B. Python phone tests (`pytest` not installed; not installed per safety rules)**

Runner: `PYTHONPATH=/workspace/intelligence` + import of existing `test_*` functions (same tests as the three files below).

Files:

- `intelligence/buzzard_ai_complete/tests/test_ai_phone_assistant.py`
- `intelligence/buzzard_ai_complete/tests/test_ai_phone_assistant_memory.py`
- `intelligence/buzzard_ai_complete/tests/test_ai_phone_assistant_telephony_v3.py`

| Result | Count |
| --- | --- |
| Tests | **13 passed**, 0 failed, 0 skipped |

Coverage of those 13: keyword intent, demo text flow, hashed-memory identity gate, config `enabled: false`, unsigned webhook reject, in-memory demo inbound/hangup. **No audio, no Twilio, no OpenAI.**

**Not run:** Playwright, live webhook tunnels, `npx next build`, FastAPI HTTP server, `Buzzard/voice.py`.

---

## 8. Completion matrix

| Pipeline component | Implementation path | Status | Evidence | Missing work | External dependency | Safe next action |
| --- | --- | --- | --- | --- | --- | --- |
| Incoming PSTN | none | NOT_IMPLEMENTED | no number, `enabled: false` | Provider number + public URL | Twilio/SIP account (human) | Do not buy/call; document URL contract only |
| Twilio webhook | none in Node; Python generic inbound | STUB / PARTIAL | no Twilio SDK; demo inbound | Twilio handler + HMAC | Twilio | Implement signature verify **fail-closed**; keep demo isolated |
| Signature verification | demo header or any `X-Signature` | STUB | `signed_webhook_validator` | Real HMAC (Twilio auth token) | Twilio auth token (human) | Unit-test vectors with **test** tokens; never log token |
| Call state machine | in-memory `sessions` | PARTIAL | facade + runtime | Durable state, Twilio status callbacks | — | Local dict + tests; no provider |
| STT | `voice.js` env hint; Python NotImplemented | STUB | `speech_adapter.py` | Adapter implementation | paid STT | Keep unimplemented until sandbox key approved |
| OpenAI Realtime | env hint only | STUB | `ENV_HINTS.realtime` | Realtime WebSocket client | paid OpenAI | Do not call; add loopback mock frames |
| TTS / audio out | NotImplemented | NOT_IMPLEMENTED | connectors | PCMU renderer + Twilio stream | paid TTS / Twilio media | Local WAV fixture, not provider |
| Interruption / silence | config flag only | NOT_IMPLEMENTED | `barge_in: true` unused | VAD / interrupt | media path | Mock interrupt in unit tests |
| Text NLU | keyword `intent.py` | PARTIAL | unit tests this audit | LLM optional; must stay stub without key | — | Keep keyword router |
| Node order JSON | `phoneAssistantService.js` | PARTIAL | public POST | Authz / rate limit / Pusat | local orders DB | Tighten public surface (separate impl task) |
| Pusat `executeTask` | not on phone path | NOT_IMPLEMENTED (phone) | `routeTextTask` stub | Wire text events into Pusat | — | Text-only local task, Guardian on |
| Guardian | Pusat only | NOT_IMPLEMENTED (phone) | tests 42 / HAC | Bind phone tools to Guardian | — | Map tools to `evaluate` |
| HAC | Pusat only | NOT_IMPLEMENTED (phone) | approval tests | Phone mutations via consume+action | independent human | Do not auto-approve |
| Human handoff | dict transfer if destination set | STUB | empty destination → `unavailable` | Real transfer dest | phone number (human) | Leave destination empty |
| Recording | default off | CODE_READY (config) | `recording.enabled: false` | Legal basis before enable | jurisdiction (human) | Keep disabled |
| Customer memory | local sqlite, hashed phone, verification gate | PARTIAL | 3 memory tests | No CRM live; no audio | — | Keep hashed; no PII in logs |
| Live voice | blocked | not LIVE_VERIFIED | health + env | All of the above + human | paid providers | Never claim live |

---

## 9. Exact technical blockers

1. **No Twilio (or other) telephony adapter** — only `generic_signed_media` dicts and a blocked Node interface.
2. **No cryptographic webhook validation** — demo bypass (`demo=True` default on FastAPI inbound) plus truthy header.
3. **No STT/TTS/Realtime implementation** — `NotImplementedError`.
4. **No media streaming** — `start_media_stream` returns a JSON contract; does not open a socket.
5. **Telephone path does not enter Pusat / Guardian / HAC.**
6. **Credentials absent** — cannot be CONFIGURED.
7. **Two stacks unsynced** — Node shop API vs Python FastAPI package; Node is what `:3001` serves.
8. **Public Node order-status/verify** — not a call path, but a security gap if treated as the “assistant.”
9. **`voice.routeTextTask({ pusat: true })` is misleading** — no orchestrator call.
10. **Duplicate `buzzard_ki_gesamt` copy** — risk of editing the wrong tree later.

---

## 10. Required configuration (names only, no secrets)

Documented Node/Twilio/voice:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `OPENAI_API_KEY` (Realtime / STT / TTS hints)
- `DEEPGRAM_API_KEY` (optional STT)
- `ELEVENLABS_API_KEY` (optional TTS)
- `WEBRTC_SIGNALING_URL`
- `DIGITAL_HUMAN_ENDPOINT`
- `BUZZARD_VOICE_LIVE_PROBE` (must stay unset; even if set, `voice.js` still does not open media)

Documented Python phone:

- `BUZZARD_PHONE_ENABLED` (example default `false`)
- `BUZZARD_PHONE_PROVIDER`
- `BUZZARD_PHONE_PUBLIC_WEBHOOK_BASE_URL`
- `BUZZARD_PHONE_MEDIA_STREAM_URL`
- `BUZZARD_PHONE_HANDOFF_DESTINATION`
- `BUZZARD_PHONE_RECORDING` (example `false`)

Do **not** set sales / SoT / live payments to enable telephony.

---

## 11. External / human-only steps

- Acquire and verify a business number (Twilio or SIP).
- Place SID/token and speech keys in a secret manager (not git).
- Expose a **public** webhook and media URL (tunnel/DNS) — not done in this workspace.
- Authorize a **non-production** sandbox call (charges possible — human only).
- Independent HAC approval for any live enablement (`BUZZARD_PHONE_ENABLED`, live probe flags).
- Legal basis before recording.
- Production restore / SOC are unrelated and remain blocked.

This audit **does not** treat those as permission to perform them.

---

## 12. Smallest safe plan to verified end-to-end (not implemented)

**Verified end-to-end live calling cannot be completed in this workspace** without human-held credentials, a public URL, and paid provider accounts. The smallest **safe** sequence is:

1. **Keep live flags off.** No Twilio REST, no OpenAI Realtime, no real calls.
2. **Treat Stack A (Node) as the product path** or explicitly designate Stack B — do not dual-write.
3. **Local loopback E2E (text):** signed-webhook unit (HMAC with a **test** secret) → session → keyword/stub reply → hangup. Prove fail-closed unsigned requests. Status target: `SANDBOX_VERIFIED` for **text**, still not live audio.
4. **Bind tools to Pusat `executeTask` + Guardian.** Order lookup and any mutation must not remain a public unauthenticated JSON shortcut without the same gates as other customer data.
5. **HAC** for transfer, recording enablement, and any commercial tool.
6. **Stub media frames** (fixture PCM) through `RealtimeAudioBridge` without network — proves barge-in/timeout **locally**.
7. **Only after independent human approval:** configure Twilio sandbox + speech in a non-production env, then a single supervised test call. That is the first possible `SANDBOX_VERIFIED` for real audio. `LIVE_VERIFIED` requires production number + production probe evidence.

Until step 7, do not report the telephone assistant as complete or live.

---

## 13. Explicit statement

This document is a **local read-only reality audit**. No production operation, deploy, push, PR, merge, real phone call, paid API call, or code change was performed. Existing registers and prior reports were not overwritten. Implementation and verified live functionality are **not** the same; live telephony is **not** present.
