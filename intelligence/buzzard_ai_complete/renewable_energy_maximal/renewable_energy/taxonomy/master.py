import json
from pathlib import Path

_DATA_FILE = Path(__file__).resolve().parents[2] / "data" / "taxonomy.json"
_DOC = json.loads(_DATA_FILE.read_text(encoding="utf-8"))

RENEWABLE_ENERGY_TAXONOMY = _DOC["taxonomy"]
TAXONOMY_MAIN_CATEGORY = _DOC.get("main_category", "Yenilenebilir Enerji")
TAXONOMY_ARCHITECTURE = _DOC.get(
    "architecture",
    "main → sub → sub-sub → product → technical attributes → compatibility",
)
