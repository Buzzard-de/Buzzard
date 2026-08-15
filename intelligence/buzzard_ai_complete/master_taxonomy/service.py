import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent / "data"
TAXONOMY_JSON = DATA_DIR / "taxonomy.json"
TAXONOMY_CSV = DATA_DIR / "taxonomy.csv"


class MasterTaxonomyService:
    def __init__(self):
        self._data = None

    def load(self):
        if self._data is None:
            self._data = json.loads(TAXONOMY_JSON.read_text(encoding="utf-8"))
        return self._data

    def all_nodes(self):
        return self.load()["nodes"]

    def get_node(self, node_id):
        return next((node for node in self.all_nodes() if node["id"] == node_id), None)

    def children(self, parent_id):
        return [node for node in self.all_nodes() if node["parent_id"] == parent_id]

    def by_level(self, level):
        return [node for node in self.all_nodes() if node["level"] == level]

    def search(self, term):
        query = term.casefold()
        return [
            node
            for node in self.all_nodes()
            if query in node["name"].casefold() or query in node["slug"].casefold()
        ]

    def path(self, node_id):
        result = []
        current = self.get_node(node_id)
        while current:
            result.append(current)
            current = self.get_node(current["parent_id"]) if current["parent_id"] else None
        return list(reversed(result))

    def snapshot(self):
        data = self.load()
        nodes = data["nodes"]
        return {
            "schema_version": data["schema_version"],
            "master_category_count": data["master_category_count"],
            "total_nodes": len(nodes),
            "level_counts": {
                level: len(self.by_level(level))
                for level in sorted({node["level"] for node in nodes})
            },
            "hierarchy": data["hierarchy"],
            "data_files": {
                "json": str(TAXONOMY_JSON.relative_to(DATA_DIR.parent.parent)),
                "csv": str(TAXONOMY_CSV.relative_to(DATA_DIR.parent.parent)),
            },
        }

    def demo_flow(self):
        sample = self.get_node("01.01.01")
        return {
            "snapshot": self.snapshot(),
            "sample_category": sample,
            "sample_path": self.path("01.01.01"),
            "sample_children": self.children("01")[:5],
            "search_motor": self.search("motor")[:5],
        }
