from pathlib import Path
import json
def test_manifest():
    p=Path(__file__).parents[1]/"01_integration/system_manifest.json"
    d=json.loads(p.read_text(encoding="utf-8"))
    assert d["system"]=="Buzzard Intelligence"
    assert d["architecture"]=="v21-v200"
    assert d["human_approval_required"] is True
