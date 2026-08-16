from __future__ import annotations

import datetime
import os
import re
import sqlite3
import unicodedata
from pathlib import Path

from buzzard_ai_complete.category_intelligence_47_maximal.category_intelligence_os.models import (
    BuzzNode,
    Category,
    Competitor,
    Feature,
    Finding,
    Node,
)

SCHEMA = """
CREATE TABLE IF NOT EXISTS categories(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  parent_id INTEGER,
  level INTEGER NOT NULL,
  source TEXT DEFAULT 'master_taxonomy',
  status TEXT DEFAULT 'ACTIVE'
);
CREATE TABLE IF NOT EXISTS competitors(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  rank INTEGER NOT NULL,
  name TEXT NOT NULL,
  domain TEXT DEFAULT '',
  type TEXT DEFAULT 'SPECIALIST',
  country TEXT DEFAULT 'DE',
  evidence_url TEXT DEFAULT '',
  revenue_eur REAL,
  gmv_eur REAL,
  verified INTEGER DEFAULT 0,
  status TEXT DEFAULT 'UNVERIFIED',
  notes TEXT DEFAULT '',
  UNIQUE(category_id, rank)
);
CREATE TABLE IF NOT EXISTS competitor_nodes(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competitor_id INTEGER NOT NULL,
  raw_path TEXT NOT NULL,
  normalized_path TEXT NOT NULL,
  level INTEGER NOT NULL,
  node_name TEXT NOT NULL,
  parent_path TEXT DEFAULT '',
  evidence_url TEXT DEFAULT '',
  confidence REAL DEFAULT 0,
  verified INTEGER DEFAULT 0,
  UNIQUE(competitor_id, normalized_path)
);
CREATE TABLE IF NOT EXISTS buzzard_nodes(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  path TEXT NOT NULL,
  level INTEGER NOT NULL,
  node_name TEXT NOT NULL,
  parent_path TEXT DEFAULT '',
  status TEXT DEFAULT 'ACTIVE',
  UNIQUE(category_id, path)
);
CREATE TABLE IF NOT EXISTS competitor_features(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competitor_id INTEGER NOT NULL,
  feature TEXT NOT NULL,
  present INTEGER NOT NULL,
  evidence_url TEXT DEFAULT '',
  confidence REAL DEFAULT 0,
  notes TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS findings(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  path TEXT DEFAULT '',
  title TEXT NOT NULL,
  score REAL DEFAULT 0,
  confidence REAL DEFAULT 0,
  evidence_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'PROPOSED',
  rationale TEXT DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS research_queue(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  competitor_id INTEGER,
  task_type TEXT NOT NULL,
  target TEXT NOT NULL,
  priority INTEGER DEFAULT 50,
  status TEXT DEFAULT 'OPEN',
  assigned_agent TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS audit(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT DEFAULT '',
  details TEXT DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS settings(
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
"""


def norm(value: str) -> str:
    text = unicodedata.normalize("NFKD", (value or "").lower()).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


normalize = norm


def now() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


class CategoryIntelligence47Store:
    def __init__(self, db_path: str | Path | None = None):
        default_path = Path(__file__).resolve().parents[1] / "data" / "buzzard_47_category_intelligence.db"
        self.db_path = Path(db_path or os.getenv("BUZZARD_47_DB", str(default_path)))
        self.db_path.parent.mkdir(parents=True, exist_ok=True)

    def connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        connection.executescript(SCHEMA)
        self._migrate_legacy_features(connection)
        self._seed_settings(connection)
        self._ensure_final_schema(connection)
        return connection

    def _ensure_final_schema(self, connection: sqlite3.Connection) -> None:
        from buzzard_ai_complete.category_intelligence_47_maximal.category_intelligence_os.evidence import (
            EVIDENCE_SCHEMA,
        )

        connection.executescript(EVIDENCE_SCHEMA)
        connection.commit()

    def _migrate_legacy_features(self, connection: sqlite3.Connection) -> None:
        legacy = connection.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='features'"
        ).fetchone()
        if not legacy:
            return
        connection.execute(
            """
            INSERT OR IGNORE INTO competitor_features(competitor_id, feature, present, evidence_url, confidence, notes)
            SELECT competitor_id, feature, present, evidence_url, confidence, ''
            FROM features
            """
        )
        connection.commit()

    def _seed_settings(self, connection: sqlite3.Connection) -> None:
        defaults = {
            "scope": "47 non-Kfz categories",
            "competitor_target": "940",
            "verification": "evidence required",
        }
        for key, value in defaults.items():
            connection.execute(
                "INSERT OR IGNORE INTO settings(key, value) VALUES(?, ?)",
                (key, value),
            )
        connection.commit()

    def audit(self, actor: str, action: str, entity: str, entity_id: str = "", details: str = "") -> None:
        connection = self.connect()
        connection.execute(
            "INSERT INTO audit(actor, action, entity, entity_id, details, created_at) VALUES(?,?,?,?,?,?)",
            (actor, action, entity, str(entity_id), details, now()),
        )
        connection.commit()
        connection.close()

    def summary(self) -> dict:
        connection = self.connect()
        count = lambda query: connection.execute(query).fetchone()[0]
        payload = {
            "categories": count("SELECT COUNT(*) FROM categories"),
            "competitors": count("SELECT COUNT(*) FROM competitors"),
            "verified_competitors": count("SELECT COUNT(*) FROM competitors WHERE verified=1"),
            "verified_nodes": count("SELECT COUNT(*) FROM competitor_nodes WHERE verified=1"),
            "buzzard_nodes": count("SELECT COUNT(*) FROM buzzard_nodes"),
            "findings": count("SELECT COUNT(*) FROM findings"),
            "open_tasks": count("SELECT COUNT(*) FROM research_queue WHERE status='OPEN'"),
            "target_categories": 47,
            "target_competitors": 940,
        }
        connection.close()
        return payload

    def list_categories(self) -> list[dict]:
        connection = self.connect()
        rows = [dict(item) for item in connection.execute("SELECT * FROM categories ORDER BY code, level, name")]
        connection.close()
        return rows

    def import_categories(self, rows: list[Category]) -> dict:
        connection = self.connect()
        added = 0
        for row in rows:
            if row.code in ("bz.01", "01") or norm(row.name) in (
                "automotive",
                "automotive kfz",
                "kfz",
                "otomotiv kfz",
                "otomotiv",
            ):
                continue
            cursor = connection.execute(
                "INSERT OR IGNORE INTO categories(code, name, parent_id, level, source) VALUES(?,?,?,?,?)",
                (row.code, row.name, row.parent_id, row.level, row.source),
            )
            added += cursor.rowcount
        connection.commit()
        connection.close()
        self.audit("system", "import", "categories", "", f"added={added}")
        return {"ok": True, "added": added}

    def add_competitor(self, payload: Competitor) -> dict:
        connection = self.connect()
        if not connection.execute("SELECT 1 FROM categories WHERE id=?", (payload.category_id,)).fetchone():
            connection.close()
            raise KeyError("Category not found")
        connection.execute(
            """
            INSERT OR REPLACE INTO competitors(
              category_id, rank, name, domain, type, country, evidence_url,
              revenue_eur, gmv_eur, verified, status, notes
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                payload.category_id,
                payload.rank,
                payload.name,
                payload.domain,
                payload.type,
                payload.country,
                payload.evidence_url,
                payload.revenue_eur,
                payload.gmv_eur,
                int(payload.verified),
                "VERIFIED" if payload.verified else "UNVERIFIED",
                payload.notes,
            ),
        )
        connection.commit()
        competitor_id = connection.execute(
            "SELECT id FROM competitors WHERE category_id=? AND rank=?",
            (payload.category_id, payload.rank),
        ).fetchone()["id"]
        connection.close()
        self.audit("user", "upsert", "competitor", competitor_id, payload.name)
        return {"ok": True, "id": competitor_id}

    def list_competitors(self, category_id: int) -> list[dict]:
        connection = self.connect()
        rows = [
            dict(item)
            for item in connection.execute(
                "SELECT * FROM competitors WHERE category_id=? ORDER BY rank",
                (category_id,),
            )
        ]
        connection.close()
        return rows

    def add_node(self, payload: Node) -> dict:
        parts = [part.strip() for part in payload.path.split(">") if part.strip()]
        if not parts:
            raise ValueError("Empty taxonomy path")
        path = " > ".join(parts)
        connection = self.connect()
        connection.execute(
            """
            INSERT OR REPLACE INTO competitor_nodes(
              competitor_id, raw_path, normalized_path, level, node_name, parent_path,
              evidence_url, confidence, verified
            ) VALUES(?,?,?,?,?,?,?,?,?)
            """,
            (
                payload.competitor_id,
                payload.path,
                norm(path),
                len(parts),
                parts[-1],
                " > ".join(parts[:-1]),
                payload.evidence_url,
                payload.confidence,
                int(payload.verified),
            ),
        )
        connection.commit()
        connection.close()
        return {"ok": True, "level": len(parts)}

    def add_buzzard_node(self, payload: BuzzNode) -> dict:
        parts = [part.strip() for part in payload.path.split(">") if part.strip()]
        if not parts:
            raise ValueError("Empty taxonomy path")
        connection = self.connect()
        connection.execute(
            """
            INSERT OR REPLACE INTO buzzard_nodes(
              category_id, path, level, node_name, parent_path, status
            ) VALUES(?,?,?,?,?,?)
            """,
            (payload.category_id, payload.path, len(parts), parts[-1], " > ".join(parts[:-1]), payload.status),
        )
        connection.commit()
        connection.close()
        return {"ok": True, "level": len(parts)}

    def add_feature(self, payload: Feature) -> dict:
        connection = self.connect()
        connection.execute(
            """
            INSERT INTO competitor_features(competitor_id, feature, present, evidence_url, confidence, notes)
            VALUES(?,?,?,?,?,?)
            """,
            (
                payload.competitor_id,
                payload.feature,
                int(payload.present),
                payload.evidence_url,
                payload.confidence,
                payload.notes,
            ),
        )
        connection.commit()
        connection.close()
        return {"ok": True}

    def add_finding(self, payload: Finding) -> dict:
        connection = self.connect()
        cursor = connection.execute(
            """
            INSERT INTO findings(
              category_id, kind, path, title, score, confidence, status, rationale, created_at
            ) VALUES(?,?,?,?,?,?,?,?,?)
            """,
            (
                payload.category_id,
                payload.kind,
                payload.path,
                payload.title,
                payload.score,
                payload.confidence,
                "PROPOSED",
                payload.rationale,
                now(),
            ),
        )
        finding_id = cursor.lastrowid
        connection.commit()
        connection.close()
        self.audit("ai", "create", "finding", finding_id, payload.title)
        return {"ok": True, "id": finding_id}

    def analyze(self, category_id: int) -> dict:
        connection = self.connect()
        category = connection.execute("SELECT * FROM categories WHERE id=?", (category_id,)).fetchone()
        if not category:
            connection.close()
            raise KeyError("Category not found")

        competitor_count = connection.execute(
            "SELECT COUNT(*) FROM competitors WHERE category_id=?",
            (category_id,),
        ).fetchone()[0]
        nodes = connection.execute(
            """
            SELECT cn.normalized_path, cn.level, cn.node_name, COUNT(DISTINCT cn.competitor_id) AS cnt
            FROM competitor_nodes cn
            JOIN competitors cp ON cp.id = cn.competitor_id
            WHERE cp.category_id=? AND cn.verified=1
            GROUP BY cn.normalized_path, cn.level, cn.node_name
            ORDER BY cn.level, cn.node_name
            """,
            (category_id,),
        ).fetchall()
        buzzard_paths = {
            norm(item["path"])
            for item in connection.execute("SELECT path FROM buzzard_nodes WHERE category_id=?", (category_id,))
        }
        features = connection.execute(
            """
            SELECT cf.feature, COUNT(DISTINCT cf.competitor_id) AS cnt
            FROM competitor_features cf
            JOIN competitors cp ON cp.id = cf.competitor_id
            WHERE cp.category_id=? AND cf.present=1
            GROUP BY cf.feature
            ORDER BY cnt DESC
            """,
            (category_id,),
        ).fetchall()
        connection.close()

        common, rare, missing = [], [], []
        for node in nodes:
            share = 100 * node["cnt"] / competitor_count if competitor_count else 0
            item = {
                "path": node["normalized_path"],
                "level": node["level"],
                "competitors": node["cnt"],
                "share_pct": round(share, 1),
            }
            if share >= 70:
                common.append(item)
            if share <= 10:
                rare.append(item)
            if node["normalized_path"] not in buzzard_paths and node["cnt"] >= 2:
                missing.append(item)

        coverage_pct = round(competitor_count / 20 * 100, 1)
        return {
            "category": dict(category),
            "competitor_count": competitor_count,
            "competitors": competitor_count,
            "target": 20,
            "coverage_pct": coverage_pct,
            "common_nodes": common,
            "rare_or_unique_nodes": rare,
            "common": common,
            "unique": rare,
            "buzzard_missing_candidates": missing,
            "common_features": [dict(item) for item in features],
        }

    def list_audit(self) -> list[dict]:
        connection = self.connect()
        rows = [dict(item) for item in connection.execute("SELECT * FROM audit ORDER BY id DESC LIMIT 500")]
        connection.close()
        return rows
