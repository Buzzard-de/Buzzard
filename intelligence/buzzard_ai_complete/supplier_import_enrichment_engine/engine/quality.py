def score(record, category_result, attribute_conflicts):
    score=100
    errors=[]
    warnings=[]
    if not record.get("supplier_sku"): errors.append("missing_supplier_sku"); score-=25
    if not record.get("title"): errors.append("missing_title"); score-=25
    if not record.get("gtin") and not (record.get("brand") and record.get("mpn")):
        warnings.append("weak_identity"); score-=10
    if category_result.get("status") != "accept":
        warnings.append("category_needs_review"); score-=20
    if attribute_conflicts:
        warnings.append("attribute_conflict"); score-=15
    if not record.get("images"):
        warnings.append("missing_images"); score-=5
    if not record.get("description"):
        warnings.append("missing_description"); score-=5
    return {
        "score": max(0,score),
        "errors":errors,
        "warnings":warnings,
        "decision": "reject" if errors else ("review" if score < 80 else "accept")
    }
