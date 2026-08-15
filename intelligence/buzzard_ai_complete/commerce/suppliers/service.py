from buzzard_ai_complete.core.time import now
from buzzard_ai_complete.database.db import connect, init_db


class SupplierService:
    def __init__(self):
        init_db()

    def upsert(self, name, **kwargs):
        allowed = {"country", "dropshipping", "white_label", "api_type", "reliability_score", "active"}
        vals = {k: v for k, v in kwargs.items() if k in allowed}
        with connect() as c:
            r = c.execute("SELECT id FROM suppliers WHERE name=?", (name,)).fetchone()
            if r:
                if vals:
                    sets = ", ".join(f"{k}=?" for k in vals)
                    c.execute(
                        f"UPDATE suppliers SET {sets},updated_at=? WHERE id=?",
                        (*vals.values(), now(), r["id"]),
                    )
                return r["id"]
            cols = ["name", *vals.keys(), "created_at", "updated_at"]
            params = [name, *vals.values(), now(), now()]
            cur = c.execute(
                f"INSERT INTO suppliers({','.join(cols)}) VALUES({','.join('?' for _ in cols)})",
                params,
            )
            return cur.lastrowid
