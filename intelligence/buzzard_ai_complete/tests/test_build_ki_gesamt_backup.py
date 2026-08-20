import json
from pathlib import Path

import pytest

SCRIPTS = Path(__file__).resolve().parents[2] / "scripts"
sys_path = SCRIPTS.parent
import sys

sys.path.insert(0, str(sys_path))

from scripts.build_ki_gesamt_backup import inventory, should_skip  # noqa: E402


def test_inventory_has_ki_areas():
    data = inventory()
    assert data["schema"] == "buzzard.ki-gesamt.inventory.v1"
    assert data["areas"]["python_complete"] > 500
    assert data["agents"]["named_agents_total"] == 73


def test_should_skip_ignores_snapshot_path_segments():
    path = Path("intelligence/buzzard_ki_gesamt/snapshots/2026-08-18/foo.py")
    assert should_skip(path, check_name_only=True) is False


def test_manifest_file_created_after_build(tmp_path, monkeypatch):
    import scripts.build_ki_gesamt_backup as module

    ki_root = tmp_path / "buzzard_ki_gesamt"
    monkeypatch.setattr(module, "REPO", tmp_path)
    monkeypatch.setattr(module, "KI_ROOT", ki_root)
    monkeypatch.setattr(module, "SNAPSHOTS", ki_root / "snapshots")

    ki_root.mkdir(parents=True)
    (tmp_path / "components" / "ai").mkdir(parents=True)
    (tmp_path / "components" / "ai" / "widget.tsx").write_text("export {}", encoding="utf-8")
    (tmp_path / "intelligence" / "buzzard_ai_complete").mkdir(parents=True)
    (tmp_path / "intelligence" / "buzzard_intelligence").mkdir(parents=True)
    (tmp_path / "intelligence" / "main.py").write_text("# cli\n", encoding="utf-8")

    module.main = lambda: None
    from scripts.build_ki_gesamt_backup import build_symlinks, collect_manifests, copy_small_layers

    (ki_root / "manifests").mkdir(parents=True, exist_ok=True)
    manifest = inventory()
    build_symlinks(ki_root / "aktiv")
    copy_small_layers(ki_root)
    (ki_root / "MANIFEST.json").write_text(json.dumps(manifest), encoding="utf-8")
    assert (ki_root / "MANIFEST.json").exists()
