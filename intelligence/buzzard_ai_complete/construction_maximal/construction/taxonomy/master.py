import json
from pathlib import Path

_DATA = Path(__file__).resolve().parents[2] / "data" / "taxonomy.json"
_DOC = json.loads(_DATA.read_text(encoding="utf-8"))

CONSTRUCTION_TAXONOMY = _DOC["taxonomy"]
TAXONOMY_MAIN_CATEGORY = _DOC.get("main_category", "İnşaat & İnşaat Makineleri")
TAXONOMY_PRINCIPLE = _DOC.get("principle", "construction-need-first")
TAXONOMY_LEVELS = _DOC.get("levels", [])
