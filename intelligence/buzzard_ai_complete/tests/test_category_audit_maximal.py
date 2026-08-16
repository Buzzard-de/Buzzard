from buzzard_ai_complete.category_audit_maximal.service import CategoryAuditService


def test_master_48():
    assert len(CategoryAuditService().engine().mains()) == 48


def test_tire_move():
    report = CategoryAuditService().audit_report()["categories"]
    row = next(x for x in report if x["name"] == "Reifen & Felgen")
    assert row["action"] == "MOVE_CONTENT"
    assert row["target"] == "Lastikler – Tüm Motorlu Araçlar"


def test_agriculture():
    report = CategoryAuditService().audit_report()["categories"]
    row = next(x for x in report if x["name"] == "Landwirtschaft & Agrartechnik")
    assert row["action"] == "RESTRUCTURE"


def test_construction():
    report = CategoryAuditService().audit_report()["categories"]
    row = next(x for x in report if x["name"] == "Baumaschinen & Ersatzteile")
    assert row["action"] == "RESTRUCTURE"


def test_no_delete():
    report = CategoryAuditService().audit_report()["categories"]
    assert all(x["action"] != "DELETE" for x in report)


def test_unknown_is_safe_review():
    report = CategoryAuditService().audit_report()["categories"]
    row = next(x for x in report if x["name"] == "Textil")
    assert row["action"] in {"KEEP", "REVIEW"}


def test_service_health():
    health = CategoryAuditService().health()
    assert health["status"] == "category_audit_ready"
    assert health["delete_enabled"] is False
    assert health["live_activation"] is False
    assert health["BUZZARD_SALES_ENABLED"] == 0


def test_demo_preview_matches():
    demo = CategoryAuditService().demo_flow()
    assert demo["integrity"] is True
    assert demo["preview_matches_input"] is True
