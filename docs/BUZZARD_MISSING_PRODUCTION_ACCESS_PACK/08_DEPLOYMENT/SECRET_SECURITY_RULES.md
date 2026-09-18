# SECRET SECURITY

Real secrets belong ONLY in the deployment Secret Manager/environment.

Never:
- Git
- source files
- JSON fixtures
- SQLite business data
- logs
- screenshots
- admin UI
- AI context
- customer-visible output

Credentials must be rotatable.
Secret values must be redacted.
Tests must use mock/test credentials only.
