# Multi-Agent Security

Handoff still holds:

- Official voice SHA-256 `16d43e7d8b27a6520ee9e6bbc61e8c503bdc76f7b715fa4ad2b356a558df0e2d`
- cloneAuthorized false; cloneAttempt CLONE_DENIED
- evaluateEgress https://api.openai.com/v1 allowed=false (DEFAULT DENY)
- Esat inspect path unchanged
- Runtime enqueue still denies destinationUrl to OpenAI
- New ACTORS list is identity registry (eight ids); stranger still UNAUTHORIZED_ACTOR
- Audit redacts password/secret/token/api_key/card/cvv
- Memory ACL owner===actor except shared_knowledge + ACCESS_SHARED_MEMORY
- Bus rejects private-memory payload scope
- Permission engine hard-closes dangerous ops
- Budget 0 EUR; no download; no paid API

Not done: host firewall change, production policy change, loosening egress.
