from buzzard_ai_complete.production.bridge import ProductionBridgeService


def test_production_bridge_manifest():
    manifest = ProductionBridgeService().load_manifest()
    assert manifest["name"] == "Buzzard Production Bridge"
    assert len(manifest["gates"]) == 14
    assert manifest["go_live_rule"] == "Jedes Gate muss bestehen."


def test_production_bridge_gates_blocked_without_credentials(monkeypatch):
    monkeypatch.delenv("STRIPE_SECRET_KEY", raising=False)
    monkeypatch.delenv("JWT_SECRET", raising=False)
    monkeypatch.setenv("BUZZARD_SALES_ENABLED", "0")
    summary = ProductionBridgeService().summary()
    assert summary["ready_for_go_live"] is False
    assert summary["gates_blocked"] > 0
    assert "payment" in summary["blocked_gates"]


def test_production_bridge_gate_passes_with_env(monkeypatch):
    monkeypatch.setenv("BUZZARD_SITE_URL", "https://buzzard24.de")
    monkeypatch.setenv("JWT_SECRET", "test-secret")
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test")
    monkeypatch.setenv("DHL_API_KEY", "dhl-test")
    monkeypatch.setenv("SMTP_HOST", "smtp.example.com")
    monkeypatch.setenv("TECDOC_API_KEY", "tec-test")
    monkeypatch.setenv("BUZZARD_DB_ENABLED", "1")
    monkeypatch.setenv("SENTRY_DSN", "https://sentry.example/1")
    monkeypatch.setenv("BUZZARD_LEGAL_READY", "1")
    monkeypatch.setenv("BUZZARD_SALES_ENABLED", "1")
    monkeypatch.setenv("BUZZARD_RETURNS_READY", "1")
    monkeypatch.setenv("BUZZARD_GDPR_READY", "1")
    monkeypatch.setenv("BACKUP_BUCKET", "buzzard-backups")
    summary = ProductionBridgeService().summary()
    assert summary["gates_passed"] >= 10
    assert summary["ready_for_go_live"] is True
