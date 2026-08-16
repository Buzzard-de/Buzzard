from __future__ import annotations

import json
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from buzzard_ai_complete.category_intelligence_47_maximal.category_intelligence_os.store import (
        CategoryIntelligence47Store,
    )


class CategoryIntelligence47ResearchLayer:
    def __init__(self, store: CategoryIntelligence47Store, matrix_path: Path):
        self.store = store
        self.matrix_path = matrix_path

    def load_matrix(self) -> dict:
        if not self.matrix_path.is_file():
            raise FileNotFoundError(str(self.matrix_path))
        return json.loads(self.matrix_path.read_text(encoding="utf-8"))

    def import_candidate_matrix(self) -> dict:
        payload = self.load_matrix()
        connection = self.store.connect()
        imported = 0
        for row in payload.get("research_rows", []):
            category = connection.execute(
                "SELECT id FROM categories WHERE code=?",
                (row["category_code"],),
            ).fetchone()
            if not category:
                continue
            connection.execute(
                """
                INSERT OR REPLACE INTO competitors(
                  category_id, rank, name, domain, type, country, evidence_url,
                  revenue_eur, gmv_eur, verified, status, notes
                ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                (
                    category["id"],
                    row["rank"],
                    row["competitor"],
                    row.get("domain", ""),
                    row.get("type", "SPECIALIST"),
                    row.get("country", "DE"),
                    row.get("evidence_url", ""),
                    row.get("revenue_eur"),
                    row.get("gmv_eur"),
                    0,
                    "CANDIDATE",
                    row.get("notes", ""),
                ),
            )
            imported += 1
        connection.commit()
        connection.close()
        self.store.audit("research-import", "bulk-seed", "candidate_matrix", "", f"rows={imported}")
        return {"imported": imported, "target": 940, "policy": "candidate != verified"}
