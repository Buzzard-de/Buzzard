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


def test_production_bridge_preflight(monkeypatch):
    monkeypatch.setenv("PUBLIC_BASE_URL", "https://buzzard24.de")
    monkeypatch.setenv("DATABASE_URL", "postgres://example")
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test")
    monkeypatch.setenv("STRIPE_PUBLISHABLE_KEY", "pk_test")
    monkeypatch.setenv("DEFAULT_PAYMENT_PROVIDER", "stripe")
    monkeypatch.setenv("DEFAULT_CARRIER", "dhl")
    monkeypatch.setenv("DHL_API_KEY", "dhl")
    monkeypatch.setenv("TECDOC_API_KEY", "tec")
    monkeypatch.setenv("SUPPLIER_HUB_URL", "https://supplier.example")
    monkeypatch.setenv("SMTP_HOST", "smtp.example")
    monkeypatch.setenv("SENDGRID_API_KEY", "sg")
    monkeypatch.setenv("JWT_SECRET", "secret")
    monkeypatch.setenv("BACKUP_BUCKET", "backup")
    monkeypatch.setenv("SENTRY_DSN", "https://sentry.example/1")
    monkeypatch.setenv("BUZZARD_LEGAL_READY", "1")
    report = ProductionBridgeService().preflight()
    assert report["total"] == 14
    assert report["gates"]["DOMAIN"] is True
    assert report["gates"]["TLS"] is True
    assert report["go_live_allowed"] is False


def test_production_bridge_max_single_summary():
    summary = ProductionBridgeService().max_single_summary()
    assert summary["primary_console_html"] == "/taxonomy/buzzard_production_bridge_max_single_file.html"
    assert "preflight" in summary
