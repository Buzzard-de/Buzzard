import json
from pathlib import Path


def test_config_exists():
    config_path = Path(__file__).resolve().parents[1] / "config/system.json"
    assert config_path.exists()
    data = json.loads(config_path.read_text(encoding="utf-8"))
    assert data["system"] == "Buzzard Intelligence"
    assert data["human_approval_required"] is True
    assert data["minimum_net_profit_eur"] == 0.50
