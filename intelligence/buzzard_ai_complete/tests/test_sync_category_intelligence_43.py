import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[2] / "scripts"
sys.path.insert(0, str(SCRIPTS.parent))

from scripts.sync_category_intelligence_43 import build_categories


def test_sync_category_intelligence_43_builds_43_categories():
    rows = build_categories()
    assert len(rows) == 50
    assert rows[0]["buzzard_id"] == "cat-01"
    assert rows[0]["name"] == "Textil"
    assert rows[4]["buzzard_id"] == "cat-05"
    assert rows[4]["name"] == "Automotive & Kfz"
    assert rows[-1]["name"] == "Lieferanten-Intelligence"
