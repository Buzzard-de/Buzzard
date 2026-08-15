# Production completion checklist

The codebase contains the integration points, but these items require real deployment values or infrastructure:

- [ ] Choose and configure an LLM provider
- [ ] Choose and configure a permitted search provider
- [ ] Configure production PostgreSQL
- [ ] Configure a secrets vault
- [ ] Configure HTTPS/reverse proxy
- [ ] Configure backups and restore drills
- [ ] Configure monitoring/alert delivery
- [ ] Configure CI/CD
- [ ] Run legal/privacy review for every data source
- [ ] Run full end-to-end tests in the target environment
- [ ] Load test before public launch

No API keys or passwords are included.
