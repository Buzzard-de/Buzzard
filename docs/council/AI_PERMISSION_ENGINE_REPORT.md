# AI Permission Engine

Code: `server/lib/buzzardNative/core/permissionEngine.js`.

Dangerous permissions always false (HUMAN_GATE_REQUIRED): GIT_PUSH, GIT_MERGE, DEPLOY, PRODUCTION_WRITE, PAYMENT_ACTIVATE, SALES_ACTIVATE, DATA_EXPORT, DATA_DELETE, SECURITY_POLICY_CHANGE, CLONE_OFFICIAL_VOICE.

Measured denials:

| Actor | Permission | Result |
|---|---|---|
| sinan_bey | DEPLOY | HUMAN_GATE_REQUIRED |
| esat_bey | SECURITY_POLICY_CHANGE | HUMAN_GATE_REQUIRED |
| pusat | PAYMENT_ACTIVATE | HUMAN_GATE_REQUIRED |
| mira | DATA_EXPORT | HUMAN_GATE_REQUIRED |
| leon | selfElevate GIT_PUSH | SELF_ELEVATION_DENIED |
| amelia | ASSIGN_TASK | PERMISSION_DENIED |

SAFE grants (local only): Sinan READ/ANALYZE/MODIFY_LOCAL_CODE, RUN_TESTS, CREATE_LOCAL_BRANCH; Pusat ASSIGN_TASK + ACCESS_SHARED_MEMORY; owners ACCESS_PRIVATE_MEMORY of **own** namespace only (enforced in memory engine, not by this list alone).

Agents cannot change their own SAFE map. Esat cannot disable Esat.
