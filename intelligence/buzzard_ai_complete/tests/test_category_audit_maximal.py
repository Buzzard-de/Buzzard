from buzzard_ai_complete.category_audit_maximal.service import CategoryAuditService


def test_master_48():
    assert len(CategoryAuditService().engine().mains()) == 48


def test_full_live_input():
    live = CategoryAuditService().load_live_categories()
    assert live["status"] == "FULL_INPUT"
    assert live["main_category_count"] == 53
    assert len(live["categories"]) == 53
    assert len(live["migration_items"]) == 1


def test_tire_move_migration_item():
    report = CategoryAuditService().audit_report()
    row = next(x for x in report["migration_items"] if x["name"] == "Reifen & Felgen")
    assert row["action"] == "MOVE_CONTENT"
    assert row["target"] == "Lastikler – Tüm Motorlu Araçlar"
    assert row["parent"] == "Automotive & Kfz"


def test_heizung_klima_keep():
    report = CategoryAuditService().audit_report()["categories"]
    row = next(x for x in report if x["name"] == "Heizung, Klima & Energie")
    assert row["action"] == "KEEP"
    assert row["target"] == "Heizung, Klima & Energie"


def test_textil_restructure():
    report = CategoryAuditService().audit_report()["categories"]
    row = next(x for x in report if x["name"] == "Textil")
    assert row["action"] == "RESTRUCTURE"
    assert row["target"] == "Mode, Textil & Accessoires"


def test_no_delete():
    report = CategoryAuditService().audit_report()
    rows = report["categories"] + report["migration_items"]
    assert all(x["action"] != "DELETE" for x in rows)


def test_review_queue_size():
    summary = CategoryAuditService().engine().summary()
    assert summary["actions"]["REVIEW"] == 1
    assert summary["actions"]["KEEP"] >= 9
    assert summary["live_main_categories"] == 53
    assert summary["migration_items"] == 1


def test_angebote_keep():
    pytest = __import__("pytest")
    report = CategoryAuditService().audit_report()["categories"]
    matches = [x for x in report if x["name"] == "Angebote & Sonderkollektionen"]
    if not matches:
        pytest.skip("Angebote & Sonderkollektionen ist aktuell nicht als L1 im Shop-Katalog")
    row = matches[0]
    assert row["action"] == "KEEP"


def test_service_health_full_input():
    health = CategoryAuditService().health()
    assert health["status"] == "category_audit_ready"
    assert health["live_input_status"] == "FULL_INPUT"
    assert health["summary"]["live_main_categories"] == 53
    assert health["delete_enabled"] is False
    assert health["live_activation"] is False
    assert health["BUZZARD_SALES_ENABLED"] == 0


def test_sync_from_storefront():
    result = CategoryAuditService().sync_live_from_storefront()
    assert result["status"] == "FULL_INPUT"
    assert result["main_category_count"] == 53
    assert result["migration_items"] == 1


def test_demo_flow():
    demo = CategoryAuditService().demo_flow()
    assert demo["integrity"] is True
    assert demo["preview_matches_input"] is True
    assert len(demo["review_queue"]) == 1
