from buzzard_ai_complete.commands import complete_commerce_inventory, complete_commerce_scope


def test_commerce_scope_doc():
    scope = complete_commerce_scope()
    assert "Buzzard Commerce" in scope
    assert "marketplaces" in scope.lower()


def test_commerce_inventory_lists_extensions():
    import json

    data = json.loads(complete_commerce_inventory())
    assert data["commerce_modules"] >= 30
    assert "catalog/service.py" in data["service_modules"]
