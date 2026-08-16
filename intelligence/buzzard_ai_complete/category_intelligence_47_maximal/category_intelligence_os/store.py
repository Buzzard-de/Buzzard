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
  code TEXT UNIQUE,
  name TEXT,
  parent_id INTEGER,
  level INTEGER NOT NULL,
  source TEXT DEFAULT 'master_taxonomy'
);
CREATE TABLE IF NOT EXISTS competitors(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER,
  rank INTEGER,
  name TEXT,
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
  competitor_id INTEGER,
  raw_path TEXT,
  normalized_path TEXT,
  level INTEGER,
  node_name TEXT,
  parent_path TEXT,
  evidence_url TEXT DEFAULT '',
  confidence REAL DEFAULT 0,
  verified INTEGER DEFAULT 0,
  UNIQUE(competitor_id, normalized_path)
);
CREATE TABLE IF NOT EXISTS buzzard_nodes(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER,
  path TEXT,
  level INTEGER,
  node_name TEXT,
  parent_path TEXT,
  status TEXT DEFAULT 'ACTIVE',
  UNIQUE(category_id, path)
);
CREATE TABLE IF NOT EXISTS features(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competitor_id INTEGER,
  feature TEXT,
  present INTEGER,
  evidence_url TEXT DEFAULT '',
  confidence REAL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS findings(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER,
  kind TEXT,
  path TEXT,
  title TEXT,
  score REAL DEFAULT 0,
  confidence REAL DEFAULT 0,
  status TEXT DEFAULT 'PROPOSED',
  rationale TEXT DEFAULT '',
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS research_queue(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER,
  competitor_id INTEGER,
  task_type TEXT,
  target TEXT,
  priority INTEGER DEFAULT 50,
  status TEXT DEFAULT 'OPEN'
);
CREATE TABLE IF NOT EXISTS audit(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT,
  action TEXT,
  entity TEXT,
  entity_id TEXT,
  details TEXT,
  created_at TEXT
);
"""


def norm(value: str) -> str:
    text = unicodedata.normalize("NFKD", (value or "").lower()).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


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
        return connection

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
            if norm(row.name) in ("automotive", "automotive kfz", "kfz"):
                continue
            cursor = connection.execute(
                "INSERT OR IGNORE INTO categories(code, name, parent_id, level, source) VALUES(?,?,?,?,?)",
                (row.code, row.name, row.parent_id, row.level, row.source),
            )
            added += cursor.rowcount
        connection.commit()
        connection.close()
        return {"added": added}

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
        return {"id": competitor_id}

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
                norm(" > ".join(parts)),
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
        return {"ok": True}

    def add_feature(self, payload: Feature) -> dict:
        connection = self.connect()
        connection.execute(
            "INSERT INTO features(competitor_id, feature, present, evidence_url, confidence) VALUES(?,?,?,?,?)",
            (payload.competitor_id, payload.feature, int(payload.present), payload.evidence_url, payload.confidence),
        )
        connection.commit()
        connection.close()
        return {"ok": True}

    def add_finding(self, payload: Finding) -> dict:
        connection = self.connect()
        connection.execute(
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
        connection.commit()
        connection.close()
        return {"ok": True}

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
            SELECT cn.normalized_path, cn.level, cn.node_name, COUNT(DISTINCT cn.competitor_id) cnt
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
            SELECT f.feature, COUNT(DISTINCT f.competitor_id) cnt
            FROM features f
            JOIN competitors cp ON cp.id = f.competitor_id
            WHERE cp.category_id=? AND f.present=1
            GROUP BY f.feature
            ORDER BY cnt DESC
            """,
            (category_id,),
        ).fetchall()
        connection.close()

        common = []
        unique = []
        missing = []
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
                unique.append(item)
            if node["normalized_path"] not in buzzard_paths and node["cnt"] >= 2:
                missing.append(item)

        return {
            "category": dict(category),
            "competitors": competitor_count,
            "target": 20,
            "coverage_pct": round(competitor_count / 20 * 100, 1),
            "common": common,
            "unique": unique,
            "buzzard_missing_candidates": missing,
            "common_features": [dict(item) for item in features],
        }

    def list_audit(self) -> list[dict]:
        connection = self.connect()
        rows = [dict(item) for item in connection.execute("SELECT * FROM audit ORDER BY id DESC LIMIT 500")]
        connection.close()
        return rows
