import uuid

from buzzard_ai_complete.supplier_import_enrichment_engine.engine.attribute_mapper import map_attributes
from buzzard_ai_complete.supplier_import_enrichment_engine.engine.category_mapper import map_category
from buzzard_ai_complete.supplier_import_enrichment_engine.engine.identity import (
    classify_duplicate,
    content_hash,
)
from buzzard_ai_complete.supplier_import_enrichment_engine.engine.normalizer import normalize
from buzzard_ai_complete.supplier_import_enrichment_engine.engine.quality import score


class ImportEngine:
    def __init__(self, supplier_id, existing_index=None, dry_run=True):
        self.supplier_id = supplier_id
        self.existing_index = existing_index or {}
        self.dry_run = dry_run

    def process_one(self, raw):
        r = normalize(raw, self.supplier_id)
        duplicates = classify_duplicate(r, self.existing_index)
        cat = map_category(r.get("category_hint"), r.get("title"))
        attrs, conflicts = map_attributes(r.get("attributes"))
        q = score(r, cat, conflicts)

        if duplicates:
            decision = "duplicate"
        elif q["decision"] == "reject":
            decision = "reject"
        elif q["decision"] == "review":
            decision = "review"
        else:
            decision = "accept"

        return {
            "import_candidate_id": str(uuid.uuid4()),
            "supplier_id": self.supplier_id,
            "content_hash": content_hash(r),
            "normalized": r,
            "category_mapping": cat,
            "attributes": attrs,
            "attribute_conflicts": conflicts,
            "duplicates": duplicates,
            "quality": q,
            "decision": decision,
            "dry_run": self.dry_run,
        }

    def process(self, records):
        results = [self.process_one(r) for r in records]
        return {
            "supplier_id": self.supplier_id,
            "dry_run": self.dry_run,
            "received": len(records),
            "results": results,
            "summary": {
                "accept": sum(x["decision"] == "accept" for x in results),
                "review": sum(x["decision"] == "review" for x in results),
                "duplicate": sum(x["decision"] == "duplicate" for x in results),
                "reject": sum(x["decision"] == "reject" for x in results),
            },
        }
