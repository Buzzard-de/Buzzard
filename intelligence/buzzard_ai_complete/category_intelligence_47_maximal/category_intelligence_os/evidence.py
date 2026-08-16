from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import TYPE_CHECKING

from buzzard_ai_complete.category_intelligence_47_maximal.category_intelligence_os.models import (
    EvidenceIn,
    ReviewIn,
)
from buzzard_ai_complete.category_intelligence_47_maximal.category_intelligence_os.store import now

if TYPE_CHECKING:
    from buzzard_ai_complete.category_intelligence_47_maximal.category_intelligence_os.store import (
        CategoryIntelligence47Store,
    )

EVIDENCE_SCHEMA = """
CREATE TABLE IF NOT EXISTS evidence(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competitor_id INTEGER,
  category_id INTEGER,
  evidence_type TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT DEFAULT '',
  source_name TEXT DEFAULT '',
  captured_at TEXT NOT NULL,
  source_date TEXT DEFAULT '',
  content_hash TEXT DEFAULT '',
  claim TEXT DEFAULT '',
  locator TEXT DEFAULT '',
  confidence REAL DEFAULT 0,
  review_status TEXT DEFAULT 'PENDING',
  reviewer TEXT DEFAULT '',
  reviewed_at TEXT DEFAULT '',
  UNIQUE(competitor_id, evidence_type, url, claim)
);
CREATE TABLE IF NOT EXISTS competitor_scores(
  competitor_id INTEGER PRIMARY KEY,
  category_coverage REAL DEFAULT 0,
  taxonomy_depth REAL DEFAULT 0,
  evidence_quality REAL DEFAULT 0,
  market_signal REAL DEFAULT 0,
  total_score REAL DEFAULT 0,
  calculated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS taxonomy_aliases(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER,
  canonical TEXT NOT NULL,
  alias TEXT NOT NULL,
  confidence REAL DEFAULT 0,
  source TEXT DEFAULT 'manual',
  UNIQUE(category_id, canonical, alias)
);
"""


def evidence_hash(payload: dict) -> str:
    raw = "|".join(
        str(payload.get(key, ""))
        for key in ("url", "title", "source_name", "source_date", "claim", "locator")
    )
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


class CategoryIntelligence47EvidenceLayer:
    def __init__(self, store: CategoryIntelligence47Store):
        self.store = store

    def ensure_schema(self) -> None:
        connection = self.store.connect()
        connection.executescript(EVIDENCE_SCHEMA)
        connection.commit()
        connection.close()

    def add_evidence(self, payload: EvidenceIn) -> dict:
        if not payload.url.startswith(("http://", "https://")):
            raise ValueError("Evidence URL must be http or https")
        content_hash = evidence_hash(payload.model_dump())
        connection = self.store.connect()
        connection.execute(
            """
            INSERT OR IGNORE INTO evidence(
              competitor_id, category_id, evidence_type, url, title, source_name,
              captured_at, source_date, content_hash, claim, locator, confidence
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                payload.competitor_id,
                payload.category_id,
                payload.evidence_type,
                payload.url,
                payload.title,
                payload.source_name,
                now(),
                payload.source_date,
                content_hash,
                payload.claim,
                payload.locator,
                payload.confidence,
            ),
        )
        connection.commit()
        evidence_id = connection.execute(
            """
            SELECT id FROM evidence
            WHERE competitor_id=? AND evidence_type=? AND url=? AND claim=?
            """,
            (payload.competitor_id, payload.evidence_type, payload.url, payload.claim),
        ).fetchone()["id"]
        connection.close()
        self.store.audit("research", "add", "evidence", evidence_id, payload.url)
        return {"ok": True, "evidence_id": evidence_id, "hash": content_hash, "status": "PENDING"}

    def review_evidence(self, payload: ReviewIn) -> dict:
        connection = self.store.connect()
        row = connection.execute("SELECT * FROM evidence WHERE id=?", (payload.evidence_id,)).fetchone()
        if not row:
            connection.close()
            raise KeyError("Evidence not found")
        status = "APPROVED" if payload.approved else "REJECTED"
        connection.execute(
            "UPDATE evidence SET review_status=?, reviewer=?, reviewed_at=? WHERE id=?",
            (status, payload.reviewer, now(), payload.evidence_id),
        )
        connection.commit()
        connection.close()
        self.store.audit(payload.reviewer, "review", "evidence", payload.evidence_id, payload.note)
        return {"ok": True, "status": status}

    def verify_competitor(self, competitor_id: int, reviewer: str = "authorized-reviewer") -> dict:
        connection = self.store.connect()
        competitor = connection.execute("SELECT * FROM competitors WHERE id=?", (competitor_id,)).fetchone()
        if not competitor:
            connection.close()
            raise KeyError("Competitor not found")
        approved = connection.execute(
            "SELECT COUNT(*) AS n FROM evidence WHERE competitor_id=? AND review_status='APPROVED'",
            (competitor_id,),
        ).fetchone()["n"]
        if approved < 1:
            connection.close()
            raise PermissionError("At least one APPROVED evidence record is required")
        connection.execute(
            "UPDATE competitors SET verified=1, status='VERIFIED' WHERE id=?",
            (competitor_id,),
        )
        connection.commit()
        connection.close()
        self.store.audit(reviewer, "verify", "competitor", competitor_id, f"approved_evidence={approved}")
        return {"ok": True, "status": "VERIFIED", "approved_evidence": approved}

    def list_competitor_evidence(self, competitor_id: int) -> list[dict]:
        connection = self.store.connect()
        rows = [
            dict(item)
            for item in connection.execute(
                "SELECT * FROM evidence WHERE competitor_id=? ORDER BY id DESC",
                (competitor_id,),
            )
        ]
        connection.close()
        return rows

    def verification_dashboard(self) -> dict:
        connection = self.store.connect()
        result = {
            "candidate_competitors": connection.execute(
                "SELECT COUNT(*) FROM competitors WHERE status='CANDIDATE'"
            ).fetchone()[0],
            "verified_competitors": connection.execute(
                "SELECT COUNT(*) FROM competitors WHERE status='VERIFIED'"
            ).fetchone()[0],
            "evidence_pending": connection.execute(
                "SELECT COUNT(*) FROM evidence WHERE review_status='PENDING'"
            ).fetchone()[0],
            "evidence_approved": connection.execute(
                "SELECT COUNT(*) FROM evidence WHERE review_status='APPROVED'"
            ).fetchone()[0],
            "evidence_rejected": connection.execute(
                "SELECT COUNT(*) FROM evidence WHERE review_status='REJECTED'"
            ).fetchone()[0],
        }
        connection.close()
        return result

    def score_category(self, category_id: int) -> dict:
        connection = self.store.connect()
        category = connection.execute("SELECT * FROM categories WHERE id=?", (category_id,)).fetchone()
        if not category:
            connection.close()
            raise KeyError("Category not found")
        competitors = connection.execute(
            "SELECT * FROM competitors WHERE category_id=?",
            (category_id,),
        ).fetchall()
        verified = len([row for row in competitors if row["verified"]])
        target = 20
        coverage = 100 * verified / target if target else 0

        for competitor in competitors:
            competitor_id = competitor["id"]
            evidence_count = connection.execute(
                "SELECT COUNT(*) AS n FROM evidence WHERE competitor_id=? AND review_status='APPROVED'",
                (competitor_id,),
            ).fetchone()["n"]
            nodes = connection.execute(
                """
                SELECT COUNT(*) AS n, COALESCE(MAX(level), 0) AS depth
                FROM competitor_nodes
                WHERE competitor_id=? AND verified=1
                """,
                (competitor_id,),
            ).fetchone()
            evidence_quality = min(100, evidence_count * 25)
            taxonomy_depth = min(100, nodes["depth"] * 20)
            market_signal = 100 if competitor["revenue_eur"] or competitor["gmv_eur"] else 0
            total = (
                0.30 * evidence_quality
                + 0.30 * taxonomy_depth
                + 0.20 * market_signal
                + 0.20 * (100 if competitor["verified"] else 0)
            )
            connection.execute(
                """
                INSERT OR REPLACE INTO competitor_scores
                VALUES(?,?,?,?,?,?,?)
                """,
                (competitor_id, coverage, taxonomy_depth, evidence_quality, market_signal, total, now()),
            )
        connection.commit()
        connection.close()
        self.store.audit("ai", "score", "category", category_id, f"verified={verified}/{target}")
        return {"ok": True, "category_id": category_id, "verified": verified, "coverage_pct": round(coverage, 1)}

    def executive_report(self) -> dict:
        connection = self.store.connect()
        categories = connection.execute(
            """
            SELECT cat.code, cat.name,
                   COUNT(cp.id) AS competitors,
                   SUM(CASE WHEN cp.verified=1 THEN 1 ELSE 0 END) AS verified,
                   COUNT(DISTINCT f.id) AS findings
            FROM categories cat
            LEFT JOIN competitors cp ON cp.category_id=cat.id
            LEFT JOIN findings f ON f.category_id=cat.id
            GROUP BY cat.id
            ORDER BY cat.code
            """
        ).fetchall()
        evidence = connection.execute(
            """
            SELECT
              SUM(CASE WHEN review_status='APPROVED' THEN 1 ELSE 0 END) AS approved,
              SUM(CASE WHEN review_status='PENDING' THEN 1 ELSE 0 END) AS pending,
              SUM(CASE WHEN review_status='REJECTED' THEN 1 ELSE 0 END) AS rejected
            FROM evidence
            """
        ).fetchone()
        connection.close()
        return {
            "generated_at": now(),
            "categories": [dict(row) for row in categories],
            "evidence": dict(evidence),
            "principle": "No VERIFIED market fact without approved evidence.",
        }

    def export_competitors(self) -> dict:
        connection = self.store.connect()
        rows = [
            dict(item)
            for item in connection.execute(
                """
                SELECT cat.code AS category_code, cat.name AS category, cp.rank, cp.name AS competitor,
                       cp.domain, cp.type AS competitor_type, cp.evidence_url, cp.revenue_eur, cp.gmv_eur,
                       cp.status, cp.notes
                FROM competitors cp
                JOIN categories cat ON cat.id=cp.category_id
                WHERE cat.code NOT IN ('01', 'bz.01')
                ORDER BY cat.code, cp.rank
                """
            )
        ]
        connection.close()
        return {"rows": rows, "count": len(rows)}

    def export_taxonomy(self) -> dict:
        connection = self.store.connect()
        rows = [
            dict(item)
            for item in connection.execute(
                """
                SELECT cat.code AS category_code, cat.name AS category, cp.rank, cp.name AS competitor,
                       cn.raw_path, cn.level, cn.evidence_url, cn.confidence, cn.verified
                FROM competitor_nodes cn
                JOIN competitors cp ON cp.id=cn.competitor_id
                JOIN categories cat ON cat.id=cp.category_id
                WHERE cat.code NOT IN ('01', 'bz.01')
                ORDER BY cat.code, cp.rank, cn.level, cn.raw_path
                """
            )
        ]
        connection.close()
        return {"rows": rows, "count": len(rows)}
