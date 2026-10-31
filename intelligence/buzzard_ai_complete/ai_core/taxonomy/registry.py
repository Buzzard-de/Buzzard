from __future__ import annotations

import re
from pathlib import Path

from buzzard_ai_complete.ai_core.taxonomy.loader import TaxonomyDocument, TaxonomyNode, load_taxonomy
from buzzard_ai_complete.config import settings


class TaxonomyRegistry:
    """Single source for category worker provisioning from master taxonomy."""

    def __init__(self, taxonomy_path: str | Path | None = None) -> None:
        self.path = Path(taxonomy_path or settings.BUZZARD_MASTER_TAXONOMY_PATH)
        self._document: TaxonomyDocument | None = None

    def load(self) -> TaxonomyDocument:
        self._document = load_taxonomy(self.path)
        return self._document

    def _doc(self) -> TaxonomyDocument:
        if self._document is None:
            self.load()
        return self._document

    def list_main_categories(self) -> list[TaxonomyNode]:
        return [n for n in self._doc().nodes if n.level == 1]

    def get_node(self, node_id: str) -> TaxonomyNode | None:
        for node in self._doc().nodes:
            if node.id == node_id:
                return node
        return None

    def schema_version(self) -> str:
        return self._doc().schema

    def checksum(self) -> str:
        return self._doc().checksum

    def main_category_count(self) -> int:
        return len(self.list_main_categories())
