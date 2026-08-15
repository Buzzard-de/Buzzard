-- BUZZARD MASTER TAXONOMY UNIFICATION
CREATE TABLE IF NOT EXISTS buzzard_category_alias (
  legacy_id TEXT NOT NULL,
  legacy_system TEXT NOT NULL,
  canonical_id TEXT NOT NULL,
  action TEXT NOT NULL,
  reason TEXT,
  PRIMARY KEY (legacy_id, legacy_system)
);

-- Import data/category_id_mapping.csv into this table.
-- IMPORTANT: do not delete legacy categories before products/orders are remapped.
-- Recommended migration:
-- 1) freeze taxonomy writes
-- 2) import aliases
-- 3) update product.category_id via alias table
-- 4) update analytics dimensions
-- 5) update AI/index documents
-- 6) verify zero orphan products
-- 7) switch readers to canonical taxonomy
-- 8) keep aliases for backward compatibility
