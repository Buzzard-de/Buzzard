# AI Identity Registry

Measured: 8 November 2026, 18:30 Europe/Berlin.  
Branch: `cursor/buzzard-native-ai-multi-agent-foundation-c293` (from handoff `1eeebd5c`).  
Code: `server/lib/buzzardNative/core/identityRegistry.js`.

Existing `server/lib/pusat/council.js` MEMBERS was not rewritten. Nesrin Hanım and category AIs remain there. Amelia/Adrian/Mira/Leon are **not** added to that roster.

| agent_id | display_name | role | voice | avatar | memory_namespace | identity status |
|---|---|---|---|---|---|---|
| pusat | Pusat | central_orchestrator | NOT_CONFIGURED | NOT_CONFIGURED | memory/pusat/ | CODE_READY |
| sinan_bey | Sinan Bey | chief_software_architect | REFERENCE_REGISTERED (`public/council/sinan-bey-official-voice-v1.m4a`) | TESTED PNG (`public/council/sinan-bey.png`) | memory/sinan/ | CODE_READY |
| esat_bey | Esat Bey | cyber_security_guardian | NOT_CONFIGURED | NOT_CONFIGURED | memory/esat/ | CODE_READY |
| dogu_bey | Doğu Bey | research_intelligence | NOT_CONFIGURED | NOT_CONFIGURED | memory/dogu/ | CODE_READY |
| amelia | Amelia | brand_ambassador_female | NOT_CONFIGURED | NOT_CONFIGURED | memory/amelia/ | CODE_READY |
| adrian | Adrian | brand_ambassador_male | NOT_CONFIGURED | NOT_CONFIGURED | memory/adrian/ | CODE_READY |
| mira | Mira | ai_influencer_female | NOT_CONFIGURED | NOT_CONFIGURED | memory/mira/ | CODE_READY |
| leon | Leon | ai_influencer_male | NOT_CONFIGURED | NOT_CONFIGURED | memory/leon/ | CODE_READY |

Verified:

- Official m4a SHA-256 `16d43e7d8b27a6520ee9e6bbc61e8c503bdc76f7b715fa4ad2b356a558df0e2d` unchanged.
- `cloneAuthorized` false on every profile.
- `assignVoice(sinan_bey → amelia)` → `VOICE_IDENTITY_NOT_COPYABLE`.
- `assignAvatar(amelia → mira)` → `AVATAR_CROSS_IDENTITY_DENIED`.
- `impersonate(leon as sinan_bey)` → `IMPERSONATION_DENIED`.
- Official character change still `HUMAN_GATE_REQUIRED`.

Identities verified in registry: 8/8 code records. Voices/avatars physically present: Sinan only.
