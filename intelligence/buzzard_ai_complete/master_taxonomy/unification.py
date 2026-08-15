import csv
import re
from pathlib import Path

import json

DATA_DIR = Path(__file__).resolve().parent / "data"
CANONICAL_JSON = DATA_DIR / "canonical_taxonomy.json"
MAPPING_CSV = DATA_DIR / "category_id_mapping.csv"


class TaxonomyUnificationService:
    def __init__(self):
        self._canonical = None
        self._aliases = None

    def load_canonical(self):
        if self._canonical is None:
            self._canonical = json.loads(CANONICAL_JSON.read_text(encoding="utf-8"))
        return self._canonical

    def load_aliases(self):
        if self._aliases is None:
            aliases = {}
            with MAPPING_CSV.open(encoding="utf-8-sig") as handle:
                for row in csv.DictReader(handle):
                    legacy_id = row["legacy_id"].strip()
                    system = row["legacy_system"].strip()
                    aliases[(legacy_id, system)] = {
                        "legacy_id": legacy_id,
                        "legacy_system": system,
                        "canonical_id": row["canonical_id"].strip(),
                        "action": row.get("action", "map").strip(),
                        "reason": row.get("reason", "").strip(),
                    }
            self._aliases = aliases
        return self._aliases

    def _normalize_shop_legacy(self, legacy_id: str) -> str:
        match = re.match(r"^cat-(\d+)", legacy_id)
        if match:
            return f"shop-{int(match.group(1)):02d}"
        return legacy_id

    def _normalize_intelligence_legacy(self, legacy_id: str) -> str:
        if legacy_id.startswith("intelligence."):
            return legacy_id
        match = re.match(r"^(\d+)(?:\.|$)", legacy_id)
        if match:
            return f"intelligence.{int(match.group(1)):02d}"
        return legacy_id

    def resolve(self, legacy_id: str, legacy_system: str = "shop"):
        aliases = self.load_aliases()
        system = legacy_system.strip().lower()
        candidate = legacy_id.strip()

        direct = aliases.get((candidate, system))
        if direct:
            return self._build_resolution(candidate, system, direct["canonical_id"], "direct")

        if system == "shop":
            normalized = self._normalize_shop_legacy(candidate)
            mapped = aliases.get((normalized, system))
            if mapped:
                return self._build_resolution(
                    candidate, system, mapped["canonical_id"], "shop_root_alias"
                )

        if system == "intelligence":
            normalized = self._normalize_intelligence_legacy(candidate)
            mapped = aliases.get((normalized, system))
            if mapped:
                return self._build_resolution(
                    candidate, system, mapped["canonical_id"], "intelligence_root_alias"
                )

        return {
            "legacy_id": candidate,
            "legacy_system": system,
            "canonical_id": None,
            "resolved": False,
            "strategy": "unmapped",
        }

    def _build_resolution(self, legacy_id, system, canonical_id, strategy):
        node = self.get_node(canonical_id)
        return {
            "legacy_id": legacy_id,
            "legacy_system": system,
            "canonical_id": canonical_id,
            "resolved": True,
            "strategy": strategy,
            "canonical_node": node,
            "path": self.path(canonical_id) if node else [],
        }

    def all_nodes(self):
        return self.load_canonical()["nodes"]

    def get_node(self, node_id):
        return next((node for node in self.all_nodes() if node["id"] == node_id), None)

    def roots(self):
        return [node for node in self.all_nodes() if node["level"] == 1]

    def children(self, parent_id):
        return [node for node in self.all_nodes() if node["parent_id"] == parent_id]

    def path(self, node_id):
        result = []
        current = self.get_node(node_id)
        while current:
            result.append(current)
            current = self.get_node(current["parent_id"]) if current.get("parent_id") else None
        return list(reversed(result))

    def aliases(self, legacy_system=None):
        items = list(self.load_aliases().values())
        if legacy_system:
            system = legacy_system.strip().lower()
            items = [item for item in items if item["legacy_system"] == system]
        return items

    def status(self):
        data = self.load_canonical()
        nodes = data["nodes"]
        return {
            "canonical_system": data.get("canonical_system", "BUZZARD_MASTER_TAXONOMY"),
            "schema_version": data.get("schema_version"),
            "canonical_roots": data.get("master_root_count"),
            "total_nodes": len(nodes),
            "alias_count": len(self.load_aliases()),
            "legacy_systems": sorted({item["legacy_system"] for item in self.aliases()}),
            "status": "ready",
        }

    def demo_flow(self):
        return {
            "status": self.status(),
            "resolve_shop_cat01": self.resolve("cat-01", "shop"),
            "resolve_intelligence_01": self.resolve("01", "intelligence"),
            "sample_roots": self.roots()[:5],
        }
