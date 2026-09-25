from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from buzzard_ai_complete.config import settings


@dataclass(frozen=True)
class TaxonomyNode:
    id: str
    parent_id: str | None
    level: int
    name: str
    slug: str
    schema_version: str = ""
    capabilities: tuple[str, ...] = ()


@dataclass(frozen=True)
class TaxonomyDocument:
    schema: str
    main_categories: int
    nodes: list[TaxonomyNode]
    checksum: str


def _default_taxonomy_path() -> Path:
    return Path(settings.BUZZARD_MASTER_TAXONOMY_PATH)


def load_taxonomy(path: str | Path | None = None) -> TaxonomyDocument:
    taxonomy_path = Path(path) if path else _default_taxonomy_path()
    if not taxonomy_path.is_file():
        raise FileNotFoundError(f"taxonomy file not found: {taxonomy_path}")

    raw_bytes = taxonomy_path.read_bytes()
    checksum = hashlib.sha256(raw_bytes).hexdigest()
    data: dict[str, Any] = json.loads(raw_bytes.decode("utf-8"))
    schema = str(data.get("schema", "unknown"))
    nodes: list[TaxonomyNode] = []
    for item in data.get("nodes", []):
        nodes.append(
            TaxonomyNode(
                id=str(item["id"]),
                parent_id=item.get("parent_id"),
                level=int(item.get("level", 0)),
                name=str(item.get("name", "")),
                slug=str(item.get("slug", "")),
                schema_version=schema,
            )
        )
    declared_main = int(data.get("main_categories", 0))
    return TaxonomyDocument(
        schema=schema,
        main_categories=declared_main,
        nodes=nodes,
        checksum=checksum,
    )
