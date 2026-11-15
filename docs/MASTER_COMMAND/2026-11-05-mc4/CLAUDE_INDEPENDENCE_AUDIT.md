# Claude independence audit

Forbidden production providers: anthropic, claude, claude-code, openai, google (`independentCapabilities.js`).

Egress denies `api.anthropic.com` / `api.claude.ai` / `api.openai.com`. EXTRA_HOSTS cannot unlock them.

No Claude account, API, model, runtime, agent, or memory is integrated.

Capability process remains Buzzard-owned and versioned in `CAPABILITIES`.
