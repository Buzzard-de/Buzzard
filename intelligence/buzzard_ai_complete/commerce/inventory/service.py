from buzzard_ai_complete.core.time import now
from buzzard_ai_complete.database.db import connect, init_db


class InventoryService:
    def __init__(self):
        init_db()

    def move(self, sku, quantity, movement_type, reference=None):
        qty = int(quantity)
        with connect() as c:
            c.execute(
                "INSERT INTO inventory_movements(sku,quantity,movement_type,reference,created_at) VALUES(?,?,?,?,?)",
                (sku, qty, movement_type, reference, now()),
            )
            c.execute(
                "UPDATE products SET stock=stock+?,updated_at=? WHERE sku=?",
                (qty, now(), sku),
            )

    def stock(self, sku):
        with connect() as c:
            r = c.execute("SELECT stock FROM products WHERE sku=?", (sku,)).fetchone()
            return int(r["stock"]) if r else 0
