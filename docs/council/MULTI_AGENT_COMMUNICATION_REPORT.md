# Multi-Agent Communication

Code: `server/lib/buzzardNative/core/agentBus.js`.

Message fields: message_id, sender_agent_id, receiver_agent_id, task_id, message_type, timestamp, permission_scope, correlation_id, integrity_hash, status=`DELIVERED_IN_PROCESS`, liveNetwork=false.

Measured:

- sinan_bey → esat_bey report: ok
- unknown sender: UNKNOWN_AGENT
- permission_scope personal_memory: PRIVATE_MEMORY_TRANSFER_DENIED
- duplicate payload hash: DUPLICATE_MESSAGE
- Pusat task_request / task_response via `taskRouter` (3 reports collected)

Classification: IN_PROCESS_TESTED. Not NETWORK_TESTED. Not LIVE_VERIFIED.
