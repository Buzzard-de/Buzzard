import importlib


def test_smoke_test_import_has_no_side_effects():
    before = importlib.import_module("buzzard_ai_complete.tasks.manager").TaskManager().list("PENDING")
    before_smoke = [t for t in before if t["title"] == "SMOKE-001"]
    importlib.import_module("buzzard_ai_complete.scripts.smoke_test")
    after = importlib.import_module("buzzard_ai_complete.tasks.manager").TaskManager().list("PENDING")
    after_smoke = [t for t in after if t["title"] == "SMOKE-001"]
    assert len(after_smoke) == len(before_smoke)
