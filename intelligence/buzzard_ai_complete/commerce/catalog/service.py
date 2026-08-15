from buzzard_ai_complete.core.time import now
from buzzard_ai_complete.database.db import connect, init_db


class ProductCatalog:
    def __init__(self):
        init_db()

    def upsert(self, sku, name, category, **kwargs):
        allowed = {
            "brand",
            "purchase_price",
            "shipping_cost",
            "marketplace_fee",
            "payment_fee",
            "tax_rate",
            "ad_cost",
            "target_margin",
            "stock",
            "supplier_id",
            "active",
        }
        vals = {k: v for k, v in kwargs.items() if k in allowed}
        with connect() as c:
            row = c.execute("SELECT id FROM products WHERE sku=?", (sku,)).fetchone()
            if row:
                sets = ", ".join(f"{k}=?" for k in vals)
                params = list(vals.values())
                if sets:
                    c.execute(
                        f"UPDATE products SET name=?,category=?,{sets},updated_at=? WHERE sku=?",
                        (name, category, *params, now(), sku),
                    )
                else:
                    c.execute(
                        "UPDATE products SET name=?,category=?,updated_at=? WHERE sku=?",
                        (name, category, now(), sku),
                    )
                return row["id"]
            cols = ["sku", "name", "category", *vals.keys(), "created_at", "updated_at"]
            params = [sku, name, category, *vals.values(), now(), now()]
            cur = c.execute(
                f"INSERT INTO products({','.join(cols)}) VALUES({','.join('?' for _ in cols)})",
                params,
            )
            return cur.lastrowid

    def get(self, sku):
        with connect() as c:
            r = c.execute("SELECT * FROM products WHERE sku=?", (sku,)).fetchone()
            return dict(r) if r else None
