# AI Capability Registry

Code: `server/lib/buzzardNative/core/capabilityRegistry.js`.  
Status ladder uses `platform/engineStatus.js`. `active` is true only for `LIVE_VERIFIED` or `PRODUCTION_READY`. Local `TESTED` prototypes are `testedLocal`, not live.

Shared engines (granted ≠ live):

| Engine | Shared live status | Proto if any | Note |
|---|---|---|---|
| thinking | TESTED (rule inference) | — | RULE_BASED, not LLM |
| hearing | NOT_IMPLEMENTED (human STT) | tone-codec TESTED | VAD/inspect ≠ STT |
| speech | NOT_IMPLEMENTED (official TTS) | proto tone TESTED | cloneAuthorized false |
| vision | NOT_IMPLEMENTED (understand) | bitmap OCR TESTED | template ≠ understanding |
| memory | TESTED isolation | — | in-process |
| digital_body | NOT_IMPLEMENTED (3D) | PNG TESTED | PNG ≠ body |
| motion | NOT_IMPLEMENTED (lip-sync) | viseme TESTED | viseme ≠ lips |
| realtime | NOT_IMPLEMENTED live media | in-process TESTED | not WebRTC |

Per character grants (all `active=false` for sensory/body/live engines):

- Sinan Bey: thinking, hearing, speech, vision, memory, digital_body, motion, realtime
- Esat Bey: thinking, hearing, speech, vision, memory, security_analysis (CODE_READY)
- Doğu Bey: thinking, hearing, speech, vision, memory, research_analysis (CODE_READY)
- Amelia / Adrian: thinking, hearing, speech, memory, digital_body, motion (no vision)
- Mira / Leon: thinking, hearing, speech, vision, memory, digital_body, motion
- Pusat: thinking, hearing, speech, memory, task_routing TESTED, event_coordination TESTED, permission_management TESTED

Amelia `canUse(vision)` = false (measured).
