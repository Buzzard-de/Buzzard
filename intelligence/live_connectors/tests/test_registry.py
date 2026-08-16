from live_connectors.registry import connector_health


def test_connector_health_lists_all_four():
    payload = connector_health()
    keys = {row["key"] for row in payload["connectors"]}
    assert keys == {"ebay", "amazon", "google_ads", "public_fetch"}
    assert payload["connector_count"] == 4
    public = next(row for row in payload["connectors"] if row["key"] == "public_fetch")
    assert public["status"] == "READY"
