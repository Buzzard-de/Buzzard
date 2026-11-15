# Security

{
  "leastPrivilege": true,
  "secretManagement": "NAMES_ONLY_NO_VALUES",
  "auditLogging": true,
  "rateLimiting": "CODE_READY_MOCK",
  "webhookSignatureRequired": true,
  "replayProtection": true,
  "idempotency": true,
  "dataMinimization": true,
  "encryptionInTransitRequired": true,
  "piiAccessControl": true,
  "retentionPolicy": "UNKNOWN_NOT_PRODUCTION",
  "disableSecurityOnCarrierError": false,
  "shareCustomerAddressOnlyWhenShipping": true,
  "storedSecretValues": 0
}

Webhook HMAC required. Replay rejected. Secrets not stored.
