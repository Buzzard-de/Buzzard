def validate_product(product):
    errors = []
    warnings = []
    for key in ("sku", "canonical_category_id"):
        if not product.get(key):
            errors.append("MISSING:" + key)
    category_id = product.get("canonical_category_id")
    if category_id and not str(category_id).startswith("bz."):
        errors.append("CATEGORY_NOT_CANONICAL")
    for key in ("gtin", "mpn", "brand_id", "title", "images"):
        if not product.get(key):
            warnings.append("MISSING_RECOMMENDED:" + key)
    return {
        "valid": not errors,
        "errors": errors,
        "warnings": warnings,
        "quality_score": max(0, 100 - len(errors) * 25 - len(warnings) * 5),
    }
