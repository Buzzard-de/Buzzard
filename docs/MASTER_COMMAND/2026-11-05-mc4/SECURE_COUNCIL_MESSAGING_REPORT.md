# Secure council messaging

**Existing:** HMAC messenger + optional X25519/AES-GCM box (`server/lib/security/secureMessaging.js`, `e2eBox.js`). HMAC alone is not E2EE.

**Added:** explicit non-E2EE channel documentation module `server/lib/council/secureMessaging.js`.

**WhatsApp:** not recommended for unrestricted bot-to-bot traffic.

**Confidential live use:** not approved.
