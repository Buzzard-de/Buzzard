from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from buzzard_ai_complete.ai_core.api.deps import enforce_api_permission, get_orchestrator, get_request_id
from buzzard_ai_complete.ai_core.services.orchestrator import UnifiedOrchestrator
from buzzard_ai_complete.ai_core.taxonomy.registry import TaxonomyRegistry

router = APIRouter(prefix="/categories", tags=["ai-core-categories"])


@router.get("", dependencies=[Depends(enforce_api_permission)])
def list_categories():
    registry = TaxonomyRegistry()
    categories = registry.list_main_categories()
    return {
        "count": len(categories),
        "schema_version": registry.schema_version(),
        "checksum": registry.checksum(),
        "categories": [
            {"id": n.id, "name": n.name, "slug": n.slug, "level": n.level}
            for n in categories
        ],
    }


@router.get("/{taxonomy_id}", dependencies=[Depends(enforce_api_permission)])
def get_category(taxonomy_id: str, request_id: str = Depends(get_request_id)):
    registry = TaxonomyRegistry()
    node = registry.get_node(taxonomy_id)
    if not node:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Category not found", "request_id": request_id},
        )
    return {"id": node.id, "name": node.name, "slug": node.slug, "level": node.level, "parent_id": node.parent_id}


@router.post("/{taxonomy_id}/scan", dependencies=[Depends(enforce_api_permission)])
def scan_category(
    taxonomy_id: str,
    payload: dict[str, Any] | None = None,
    orchestrator: UnifiedOrchestrator = Depends(get_orchestrator),
    request_id: str = Depends(get_request_id),
):
    registry = TaxonomyRegistry()
    node = registry.get_node(taxonomy_id)
    if not node or node.level != 1:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Main category not found", "request_id": request_id},
        )
    body = payload or {}
    body["category_id"] = taxonomy_id
    task = orchestrator.create_task(
        type="category_scan",
        payload=body,
        worker_id=f"category-{taxonomy_id}",
        created_by="api",
    )
    return {"task_id": task.id, "status": task.status, "worker_id": task.worker_id}
