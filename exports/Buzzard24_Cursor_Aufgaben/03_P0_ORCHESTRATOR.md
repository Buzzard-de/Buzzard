# P0 – AI Orchestrator
- Bestehenden Orchestrator aus PR #238 prüfen.
- Mit dem neuen zentralen Görev Orkestratörü-Konzept konsolidieren; keine doppelten Orchestratoren.
- Agent Registry.
- Task lifecycle: queued/running/waiting_approval/succeeded/failed/cancelled.
- Prioritäten.
- Dependencies/Workflows.
- Retry/Timeout.
- Capability- und Rechteprüfung.
- Human Approval für riskante/finanzielle Aktionen.
- Audit Log.
- REST API/Health.
- Mock/Test Handler.
WICHTIG: keine echten Zahlungen, Bestellungen oder Supplier-Aufträge ausführen. Nur Adapter-/Mock-Ebene.
