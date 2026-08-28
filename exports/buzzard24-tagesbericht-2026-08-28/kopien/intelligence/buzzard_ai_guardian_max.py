"""
BUZZARD AI GUARDIAN MAX
=======================
Central operational safety layer for Buzzard AI.

Implements in ONE file:
1. Disaster Recovery / Backup / Restore verification
2. AI cost accounting, budgets and automatic circuit breakers
3. Central AI memory / knowledge base with provenance
4. Anomaly detection + automatic incident creation
5. Human approval center for high-risk actions

DESIGN PRINCIPLES
- Sales remain disabled by default.
- No payment execution.
- No real supplier order execution.
- Critical actions require human approval.
- Secrets are never persisted by this module.
- All important state changes are auditable.
- SQLite is used by default; the storage interface can later be moved to PostgreSQL.
- External side effects are represented by adapters and must be explicitly enabled.

This is a production-oriented foundation, not a replacement for infrastructure-level
backups, cloud IAM, WAF, SIEM, or a managed secrets vault.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import os
import shutil
import sqlite3
import statistics
import time
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple


# ---------------------------------------------------------------------------
# CONFIG
# ---------------------------------------------------------------------------

APP_NAME = "buzzard-ai-guardian-max"
DB_PATH = Path(os.getenv("BUZZARD_GUARDIAN_DB", "./buzzard_guardian.sqlite3"))
BACKUP_DIR = Path(os.getenv("BUZZARD_BACKUP_DIR", "./backups"))

# HARD SAFETY DEFAULTS — aligned with Buzzard catalog mode (BUZZARD_SALES_ENABLED)
def _env_bool(*keys: str, default: str = "false") -> bool:
    for key in keys:
        val = os.getenv(key)
        if val is not None:
            return val.lower() in ("true", "1", "yes")
    return default.lower() in ("true", "1", "yes")


SALES_ENABLED = _env_bool("SALES_ENABLED", "BUZZARD_SALES_ENABLED")
REAL_PAYMENT_ENABLED = _env_bool("REAL_PAYMENT_ENABLED", "BUZZARD_REAL_PAYMENT_ENABLED")
REAL_SUPPLIER_ORDER_ENABLED = _env_bool(
    "REAL_SUPPLIER_ORDER_ENABLED", "BUZZARD_REAL_SUPPLIER_ORDER_ENABLED"
)
REAL_PRODUCT_IMAGES_ENABLED = _env_bool(
    "REAL_PRODUCT_IMAGES_ENABLED", "BUZZARD_REAL_PRODUCT_IMAGES_ENABLED"
)

if SALES_ENABLED or REAL_PAYMENT_ENABLED or REAL_SUPPLIER_ORDER_ENABLED:
    # Guardian must never silently override deployment policy.
    # The application can fail closed instead.
    pass

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
log = logging.getLogger(APP_NAME)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex}"


def json_dumps(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, default=str)


# ---------------------------------------------------------------------------
# DATA MODELS
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class AgentPolicy:
    agent_id: str
    daily_budget_eur: float
    monthly_budget_eur: float
    max_single_task_eur: float = 1.00
    max_risk_score_without_approval: int = 20
    enabled: bool = True


@dataclass(frozen=True)
class CostEvent:
    agent_id: str
    model: str
    provider: str
    input_tokens: int
    output_tokens: int
    input_cost_eur: float
    output_cost_eur: float
    task_id: str
    metadata: Dict[str, Any]

    @property
    def total_cost_eur(self) -> float:
        return round(self.input_cost_eur + self.output_cost_eur, 8)


@dataclass(frozen=True)
class MemoryRecord:
    memory_id: str
    namespace: str
    key: str
    content: str
    source: str
    confidence: float
    created_at: str
    updated_at: str
    tags: Tuple[str, ...]
    agent_id: Optional[str]
    expires_at: Optional[str]


@dataclass(frozen=True)
class ApprovalRequest:
    approval_id: str
    task_id: str
    requested_by: str
    action_type: str
    description: str
    risk_score: int
    amount_eur: float
    payload: Dict[str, Any]
    status: str
    created_at: str
    decided_at: Optional[str]
    decided_by: Optional[str]
    decision_reason: Optional[str]


@dataclass(frozen=True)
class Incident:
    incident_id: str
    severity: str
    category: str
    title: str
    description: str
    source: str
    status: str
    created_at: str
    resolved_at: Optional[str]


# ---------------------------------------------------------------------------
# STORAGE
# ---------------------------------------------------------------------------

class SQLiteStore:
    """Small transactional store. Replaceable later with PostgreSQL."""

    def __init__(self, db_path: Path = DB_PATH):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(
            str(self.db_path),
            timeout=30,
            check_same_thread=False,
        )
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA journal_mode=WAL")
        self.conn.execute("PRAGMA foreign_keys=ON")
        self.conn.execute("PRAGMA busy_timeout=30000")
        self.init_schema()

    def close(self) -> None:
        self.conn.close()

    def execute(self, sql: str, params: Sequence[Any] = ()) -> sqlite3.Cursor:
        cur = self.conn.execute(sql, params)
        self.conn.commit()
        return cur

    def executemany(self, sql: str, rows: Iterable[Sequence[Any]]) -> None:
        self.conn.executemany(sql, rows)
        self.conn.commit()

    def query(self, sql: str, params: Sequence[Any] = ()) -> List[sqlite3.Row]:
        return list(self.conn.execute(sql, params).fetchall())

    def init_schema(self) -> None:
        self.conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id TEXT UNIQUE NOT NULL,
                event_type TEXT NOT NULL,
                actor TEXT NOT NULL,
                severity TEXT NOT NULL,
                entity_id TEXT,
                data_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS agent_policies (
                agent_id TEXT PRIMARY KEY,
                daily_budget_eur REAL NOT NULL,
                monthly_budget_eur REAL NOT NULL,
                max_single_task_eur REAL NOT NULL,
                max_risk_score_without_approval INTEGER NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS cost_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id TEXT UNIQUE NOT NULL,
                agent_id TEXT NOT NULL,
                model TEXT NOT NULL,
                provider TEXT NOT NULL,
                input_tokens INTEGER NOT NULL,
                output_tokens INTEGER NOT NULL,
                input_cost_eur REAL NOT NULL,
                output_cost_eur REAL NOT NULL,
                total_cost_eur REAL NOT NULL,
                task_id TEXT NOT NULL,
                metadata_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_cost_agent_time
                ON cost_events(agent_id, created_at);

            CREATE TABLE IF NOT EXISTS memory (
                memory_id TEXT PRIMARY KEY,
                namespace TEXT NOT NULL,
                key TEXT NOT NULL,
                content TEXT NOT NULL,
                source TEXT NOT NULL,
                confidence REAL NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                tags_json TEXT NOT NULL,
                agent_id TEXT,
                expires_at TEXT
            );

            CREATE UNIQUE INDEX IF NOT EXISTS uq_memory_namespace_key
                ON memory(namespace, key);

            CREATE TABLE IF NOT EXISTS approval_requests (
                approval_id TEXT PRIMARY KEY,
                task_id TEXT NOT NULL,
                requested_by TEXT NOT NULL,
                action_type TEXT NOT NULL,
                description TEXT NOT NULL,
                risk_score INTEGER NOT NULL,
                amount_eur REAL NOT NULL,
                payload_json TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                decided_at TEXT,
                decided_by TEXT,
                decision_reason TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_approval_status
                ON approval_requests(status);

            CREATE TABLE IF NOT EXISTS incidents (
                incident_id TEXT PRIMARY KEY,
                severity TEXT NOT NULL,
                category TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                source TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                resolved_at TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_incident_status
                ON incidents(status);

            CREATE TABLE IF NOT EXISTS idempotency (
                idempotency_key TEXT PRIMARY KEY,
                result_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """
        )
        self.conn.commit()


# ---------------------------------------------------------------------------
# AUDIT
# ---------------------------------------------------------------------------

class AuditLogger:
    def __init__(self, store: SQLiteStore):
        self.store = store

    def write(
        self,
        event_type: str,
        actor: str,
        severity: str = "INFO",
        entity_id: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None,
    ) -> str:
        event_id = new_id("audit")
        self.store.execute(
            """
            INSERT INTO audit_log
            (event_id,event_type,actor,severity,entity_id,data_json,created_at)
            VALUES (?,?,?,?,?,?,?)
            """,
            (
                event_id,
                event_type,
                actor,
                severity,
                entity_id,
                json_dumps(data or {}),
                utc_now(),
            ),
        )
        return event_id


# ---------------------------------------------------------------------------
# AI COST CONTROL
# ---------------------------------------------------------------------------

class CostController:
    """
    Tracks actual model spend and enforces daily/monthly/single-task budgets.

    Cost must be supplied by the calling provider adapter; this module never
    guesses provider pricing.
    """

    def __init__(self, store: SQLiteStore, audit: AuditLogger):
        self.store = store
        self.audit = audit

    def register_agent(self, policy: AgentPolicy) -> None:
        self.store.execute(
            """
            INSERT INTO agent_policies
            (agent_id,daily_budget_eur,monthly_budget_eur,max_single_task_eur,
             max_risk_score_without_approval,enabled)
            VALUES (?,?,?,?,?,?)
            ON CONFLICT(agent_id) DO UPDATE SET
              daily_budget_eur=excluded.daily_budget_eur,
              monthly_budget_eur=excluded.monthly_budget_eur,
              max_single_task_eur=excluded.max_single_task_eur,
              max_risk_score_without_approval=excluded.max_risk_score_without_approval,
              enabled=excluded.enabled
            """,
            (
                policy.agent_id,
                policy.daily_budget_eur,
                policy.monthly_budget_eur,
                policy.max_single_task_eur,
                policy.max_risk_score_without_approval,
                int(policy.enabled),
            ),
        )
        self.audit.write(
            "agent_policy_updated",
            "system",
            entity_id=policy.agent_id,
            data=asdict(policy),
        )

    def _policy(self, agent_id: str) -> AgentPolicy:
        rows = self.store.query(
            "SELECT * FROM agent_policies WHERE agent_id=?", (agent_id,)
        )
        if not rows:
            raise ValueError(f"No policy registered for agent: {agent_id}")
        r = rows[0]
        return AgentPolicy(
            agent_id=r["agent_id"],
            daily_budget_eur=r["daily_budget_eur"],
            monthly_budget_eur=r["monthly_budget_eur"],
            max_single_task_eur=r["max_single_task_eur"],
            max_risk_score_without_approval=r["max_risk_score_without_approval"],
            enabled=bool(r["enabled"]),
        )

    def spend(self, agent_id: str, days: int = 0) -> float:
        if days == 0:
            start = datetime.now(timezone.utc).date().isoformat()
            rows = self.store.query(
                """
                SELECT COALESCE(SUM(total_cost_eur),0) AS total
                FROM cost_events
                WHERE agent_id=? AND substr(created_at,1,10)=?
                """,
                (agent_id, start),
            )
        else:
            start_dt = datetime.now(timezone.utc) - timedelta(days=days)
            rows = self.store.query(
                """
                SELECT COALESCE(SUM(total_cost_eur),0) AS total
                FROM cost_events
                WHERE agent_id=? AND created_at>=?
                """,
                (agent_id, start_dt.isoformat()),
            )
        return float(rows[0]["total"])

    def monthly_spend(self, agent_id: str) -> float:
        month = datetime.now(timezone.utc).strftime("%Y-%m")
        rows = self.store.query(
            """
            SELECT COALESCE(SUM(total_cost_eur),0) AS total
            FROM cost_events
            WHERE agent_id=? AND substr(created_at,1,7)=?
            """,
            (agent_id, month),
        )
        return float(rows[0]["total"])

    def authorize_estimated_cost(
        self,
        agent_id: str,
        estimated_cost_eur: float,
        task_id: str,
    ) -> bool:
        policy = self._policy(agent_id)
        if not policy.enabled:
            return False
        if estimated_cost_eur < 0:
            return False
        if estimated_cost_eur > policy.max_single_task_eur:
            self.audit.write(
                "cost_guard_block",
                "cost_controller",
                "WARNING",
                task_id,
                {"agent_id": agent_id, "estimated": estimated_cost_eur,
                 "reason": "single_task_limit"},
            )
            return False

        daily = self.spend(agent_id)
        monthly = self.monthly_spend(agent_id)

        allowed = (
            daily + estimated_cost_eur <= policy.daily_budget_eur
            and monthly + estimated_cost_eur <= policy.monthly_budget_eur
        )

        if not allowed:
            self.audit.write(
                "cost_guard_block",
                "cost_controller",
                "WARNING",
                task_id,
                {
                    "agent_id": agent_id,
                    "estimated": estimated_cost_eur,
                    "daily_spend": daily,
                    "monthly_spend": monthly,
                    "daily_budget": policy.daily_budget_eur,
                    "monthly_budget": policy.monthly_budget_eur,
                },
            )
        return allowed

    def record(self, event: CostEvent) -> str:
        policy = self._policy(event.agent_id)
        if not policy.enabled:
            raise PermissionError("AI agent is disabled by policy.")
        if event.total_cost_eur > policy.max_single_task_eur:
            raise PermissionError("Single-task AI cost limit exceeded.")

        event_id = new_id("cost")
        self.store.execute(
            """
            INSERT INTO cost_events
            (event_id,agent_id,model,provider,input_tokens,output_tokens,
             input_cost_eur,output_cost_eur,total_cost_eur,task_id,
             metadata_json,created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                event_id,
                event.agent_id,
                event.model,
                event.provider,
                event.input_tokens,
                event.output_tokens,
                event.input_cost_eur,
                event.output_cost_eur,
                event.total_cost_eur,
                event.task_id,
                json_dumps(event.metadata),
                utc_now(),
            ),
        )

        daily = self.spend(event.agent_id)
        monthly = self.monthly_spend(event.agent_id)

        if daily >= policy.daily_budget_eur or monthly >= policy.monthly_budget_eur:
            self.store.execute(
                "UPDATE agent_policies SET enabled=0 WHERE agent_id=?",
                (event.agent_id,),
            )
            self.audit.write(
                "ai_budget_circuit_breaker",
                "cost_controller",
                "CRITICAL",
                event.agent_id,
                {
                    "daily_spend": daily,
                    "monthly_spend": monthly,
                    "daily_budget": policy.daily_budget_eur,
                    "monthly_budget": policy.monthly_budget_eur,
                },
            )

        return event_id

    def dashboard(self) -> Dict[str, Any]:
        agents = self.store.query("SELECT * FROM agent_policies ORDER BY agent_id")
        result = []
        for a in agents:
            result.append(
                {
                    "agent_id": a["agent_id"],
                    "enabled": bool(a["enabled"]),
                    "daily_spend_eur": round(self.spend(a["agent_id"]), 4),
                    "daily_budget_eur": a["daily_budget_eur"],
                    "monthly_spend_eur": round(
                        self.monthly_spend(a["agent_id"]), 4
                    ),
                    "monthly_budget_eur": a["monthly_budget_eur"],
                }
            )
        return {"agents": result}


# ---------------------------------------------------------------------------
# CENTRAL AI MEMORY / KNOWLEDGE BASE
# ---------------------------------------------------------------------------

class KnowledgeBase:
    """
    Central memory with provenance, confidence, tags and optional expiry.

    For semantic/vector search, this class exposes a stable interface; a future
    embedding index can be attached without changing callers.
    """

    def __init__(self, store: SQLiteStore, audit: AuditLogger):
        self.store = store
        self.audit = audit

    def upsert(
        self,
        namespace: str,
        key: str,
        content: str,
        source: str,
        confidence: float = 1.0,
        tags: Sequence[str] = (),
        agent_id: Optional[str] = None,
        expires_at: Optional[str] = None,
    ) -> str:
        if not namespace or not key or not content:
            raise ValueError("namespace, key and content are required")
        confidence = max(0.0, min(1.0, float(confidence)))
        now = utc_now()
        memory_id = new_id("mem")

        old = self.store.query(
            "SELECT memory_id FROM memory WHERE namespace=? AND key=?",
            (namespace, key),
        )
        if old:
            memory_id = old[0]["memory_id"]

        self.store.execute(
            """
            INSERT INTO memory
            (memory_id,namespace,key,content,source,confidence,created_at,
             updated_at,tags_json,agent_id,expires_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(namespace,key) DO UPDATE SET
              content=excluded.content,
              source=excluded.source,
              confidence=excluded.confidence,
              updated_at=excluded.updated_at,
              tags_json=excluded.tags_json,
              agent_id=excluded.agent_id,
              expires_at=excluded.expires_at
            """,
            (
                memory_id,
                namespace,
                key,
                content,
                source,
                confidence,
                now,
                now,
                json_dumps(list(tags)),
                agent_id,
                expires_at,
            ),
        )
        self.audit.write(
            "memory_upsert",
            agent_id or "system",
            entity_id=memory_id,
            data={
                "namespace": namespace,
                "key": key,
                "source": source,
                "confidence": confidence,
            },
        )
        return memory_id

    def get(self, namespace: str, key: str) -> Optional[MemoryRecord]:
        rows = self.store.query(
            "SELECT * FROM memory WHERE namespace=? AND key=?",
            (namespace, key),
        )
        if not rows:
            return None
        r = rows[0]
        if r["expires_at"] and r["expires_at"] < utc_now():
            return None
        return MemoryRecord(
            memory_id=r["memory_id"],
            namespace=r["namespace"],
            key=r["key"],
            content=r["content"],
            source=r["source"],
            confidence=r["confidence"],
            created_at=r["created_at"],
            updated_at=r["updated_at"],
            tags=tuple(json.loads(r["tags_json"])),
            agent_id=r["agent_id"],
            expires_at=r["expires_at"],
        )

    def search(self, query: str, namespace: Optional[str] = None, limit: int = 20):
        """
        Deterministic lexical search fallback.

        Later this can be backed by embeddings/vector DB while preserving the API.
        """
        q = query.lower().strip()
        if not q:
            return []

        sql = """
            SELECT * FROM memory
            WHERE (lower(content) LIKE ? OR lower(key) LIKE ?)
        """
        params: List[Any] = [f"%{q}%", f"%{q}%"]
        if namespace:
            sql += " AND namespace=?"
            params.append(namespace)
        sql += " ORDER BY confidence DESC, updated_at DESC LIMIT ?"
        params.append(int(limit))

        rows = self.store.query(sql, params)
        return [
            {
                "memory_id": r["memory_id"],
                "namespace": r["namespace"],
                "key": r["key"],
                "content": r["content"],
                "source": r["source"],
                "confidence": r["confidence"],
                "tags": json.loads(r["tags_json"]),
                "agent_id": r["agent_id"],
                "updated_at": r["updated_at"],
            }
            for r in rows
            if not r["expires_at"] or r["expires_at"] >= utc_now()
        ]

    def cleanup_expired(self) -> int:
        cur = self.store.execute(
            "DELETE FROM memory WHERE expires_at IS NOT NULL AND expires_at < ?",
            (utc_now(),),
        )
        return cur.rowcount


# ---------------------------------------------------------------------------
# INCIDENTS / ANOMALY ENGINE
# ---------------------------------------------------------------------------

class IncidentManager:
    def __init__(self, store: SQLiteStore, audit: AuditLogger):
        self.store = store
        self.audit = audit

    def create(
        self,
        severity: str,
        category: str,
        title: str,
        description: str,
        source: str,
    ) -> str:
        severity = severity.upper()
        if severity not in {"INFO", "WARNING", "HIGH", "CRITICAL"}:
            raise ValueError("Invalid incident severity")

        incident_id = new_id("inc")
        self.store.execute(
            """
            INSERT INTO incidents
            (incident_id,severity,category,title,description,source,status,created_at)
            VALUES (?,?,?,?,?,?,?,?)
            """,
            (
                incident_id,
                severity,
                category,
                title,
                description,
                source,
                "OPEN",
                utc_now(),
            ),
        )
        self.audit.write(
            "incident_created",
            source,
            severity,
            incident_id,
            {
                "category": category,
                "title": title,
                "description": description,
            },
        )
        return incident_id

    def resolve(self, incident_id: str, actor: str, reason: str) -> None:
        self.store.execute(
            """
            UPDATE incidents
            SET status='RESOLVED', resolved_at=?
            WHERE incident_id=? AND status!='RESOLVED'
            """,
            (utc_now(), incident_id),
        )
        self.audit.write(
            "incident_resolved",
            actor,
            "INFO",
            incident_id,
            {"reason": reason},
        )

    def open_incidents(self, limit: int = 100) -> List[Dict[str, Any]]:
        rows = self.store.query(
            """
            SELECT * FROM incidents
            WHERE status='OPEN'
            ORDER BY
              CASE severity
                WHEN 'CRITICAL' THEN 1
                WHEN 'HIGH' THEN 2
                WHEN 'WARNING' THEN 3
                ELSE 4
              END,
              created_at DESC
            LIMIT ?
            """,
            (limit,),
        )
        return [dict(r) for r in rows]


class AnomalyEngine:
    """
    Generic rules engine.

    It deliberately favors false-positive alerts over silent execution of risky
    actions. Rules can be expanded as real Buzzard metrics become available.
    """

    def __init__(
        self,
        store: SQLiteStore,
        audit: AuditLogger,
        incidents: IncidentManager,
    ):
        self.store = store
        self.audit = audit
        self.incidents = incidents

    def check_price_change(
        self,
        product_id: str,
        old_price: float,
        new_price: float,
        threshold_pct: float = 25.0,
    ) -> Optional[str]:
        if old_price <= 0 or new_price < 0:
            return self.incidents.create(
                "HIGH",
                "DATA_QUALITY",
                "Invalid product price",
                f"Product {product_id}: old={old_price}, new={new_price}",
                "price_guard",
            )

        pct = abs(new_price - old_price) / old_price * 100
        if pct >= threshold_pct:
            return self.incidents.create(
                "HIGH",
                "PRICE_ANOMALY",
                "Unusually large price change",
                f"Product {product_id}: {old_price} -> {new_price} ({pct:.2f}%)",
                "price_guard",
            )
        return None

    def check_stock(
        self,
        product_id: str,
        old_stock: int,
        new_stock: int,
        max_jump: int = 10000,
    ) -> Optional[str]:
        if new_stock < 0:
            return self.incidents.create(
                "HIGH",
                "STOCK_ANOMALY",
                "Negative stock received",
                f"Product {product_id}: {new_stock}",
                "stock_guard",
            )

        if abs(new_stock - old_stock) > max_jump:
            return self.incidents.create(
                "HIGH",
                "STOCK_ANOMALY",
                "Unusually large stock change",
                f"Product {product_id}: {old_stock} -> {new_stock}",
                "stock_guard",
            )
        return None

    def check_supplier_feed(
        self,
        supplier: str,
        expected_records: int,
        received_records: int,
    ) -> Optional[str]:
        if expected_records <= 0:
            return None
        ratio = received_records / expected_records
        if ratio < 0.5:
            return self.incidents.create(
                "CRITICAL",
                "SUPPLIER_FEED",
                "Supplier feed unexpectedly incomplete",
                f"{supplier}: expected {expected_records}, received {received_records}",
                "supplier_monitor",
            )
        if ratio < 0.8:
            return self.incidents.create(
                "HIGH",
                "SUPPLIER_FEED",
                "Supplier feed volume dropped",
                f"{supplier}: expected {expected_records}, received {received_records}",
                "supplier_monitor",
            )
        return None

    def check_ai_error_rate(
        self,
        agent_id: str,
        recent_results: Sequence[bool],
        critical_threshold: float = 0.50,
        minimum_samples: int = 10,
    ) -> Optional[str]:
        if len(recent_results) < minimum_samples:
            return None
        error_rate = 1 - sum(1 for x in recent_results if x) / len(recent_results)
        if error_rate >= critical_threshold:
            return self.incidents.create(
                "CRITICAL",
                "AI_HEALTH",
                "AI agent error rate too high",
                f"{agent_id}: error rate {error_rate:.2%}",
                "ai_monitor",
            )
        return None

    def check_latency(
        self,
        component: str,
        samples_ms: Sequence[float],
        threshold_ms: float = 10000,
    ) -> Optional[str]:
        if not samples_ms:
            return None
        p95 = statistics.quantiles(samples_ms, n=20)[18] if len(samples_ms) >= 20 else max(samples_ms)
        if p95 > threshold_ms:
            return self.incidents.create(
                "HIGH",
                "PERFORMANCE",
                "Component latency anomaly",
                f"{component}: p95/max={p95:.0f}ms",
                "performance_monitor",
            )
        return None


# ---------------------------------------------------------------------------
# HUMAN APPROVAL CENTER
# ---------------------------------------------------------------------------

HIGH_RISK_ACTIONS = {
    "REAL_PAYMENT",
    "REAL_SUPPLIER_ORDER",
    "BULK_PRICE_CHANGE",
    "BULK_STOCK_CHANGE",
    "DELETE_DATA",
    "PRODUCTION_DEPLOY",
    "SECURITY_POLICY_CHANGE",
    "EXPORT_PERSONAL_DATA",
}


class ApprovalCenter:
    def __init__(
        self,
        store: SQLiteStore,
        audit: AuditLogger,
        incidents: IncidentManager,
    ):
        self.store = store
        self.audit = audit
        self.incidents = incidents

    def calculate_risk(
        self,
        action_type: str,
        amount_eur: float = 0,
        affects_records: int = 1,
        external_side_effect: bool = False,
    ) -> int:
        risk = 0
        if action_type in HIGH_RISK_ACTIONS:
            risk += 60
        if amount_eur > 0:
            risk += min(30, int(amount_eur / 100))
        if affects_records > 100:
            risk += 20
        elif affects_records > 10:
            risk += 10
        if external_side_effect:
            risk += 25
        return min(100, risk)

    def requires_approval(
        self,
        action_type: str,
        risk_score: int,
        amount_eur: float = 0,
    ) -> bool:
        if action_type in HIGH_RISK_ACTIONS:
            return True
        if risk_score >= 20:
            return True
        if amount_eur > 0:
            return True
        return False

    def request(
        self,
        task_id: str,
        requested_by: str,
        action_type: str,
        description: str,
        payload: Dict[str, Any],
        risk_score: Optional[int] = None,
        amount_eur: float = 0,
    ) -> str:
        risk_score = (
            self.calculate_risk(action_type, amount_eur)
            if risk_score is None
            else max(0, min(100, risk_score))
        )

        approval_id = new_id("approval")
        self.store.execute(
            """
            INSERT INTO approval_requests
            (approval_id,task_id,requested_by,action_type,description,
             risk_score,amount_eur,payload_json,status,created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?)
            """,
            (
                approval_id,
                task_id,
                requested_by,
                action_type,
                description,
                risk_score,
                amount_eur,
                json_dumps(payload),
                "PENDING",
                utc_now(),
            ),
        )
        self.audit.write(
            "approval_requested",
            requested_by,
            "WARNING" if risk_score < 60 else "CRITICAL",
            approval_id,
            {
                "task_id": task_id,
                "action_type": action_type,
                "risk_score": risk_score,
                "amount_eur": amount_eur,
            },
        )
        return approval_id

    def decide(
        self,
        approval_id: str,
        approved: bool,
        decided_by: str,
        reason: str,
    ) -> None:
        rows = self.store.query(
            "SELECT * FROM approval_requests WHERE approval_id=?",
            (approval_id,),
        )
        if not rows:
            raise KeyError("Approval request not found")
        r = rows[0]
        if r["status"] != "PENDING":
            raise ValueError("Approval is no longer pending")

        status = "APPROVED" if approved else "REJECTED"
        self.store.execute(
            """
            UPDATE approval_requests
            SET status=?, decided_at=?, decided_by=?, decision_reason=?
            WHERE approval_id=? AND status='PENDING'
            """,
            (status, utc_now(), decided_by, reason, approval_id),
        )
        self.audit.write(
            "approval_decision",
            decided_by,
            "INFO" if approved else "WARNING",
            approval_id,
            {"decision": status, "reason": reason},
        )

    def get(self, approval_id: str) -> Optional[Dict[str, Any]]:
        rows = self.store.query(
            "SELECT * FROM approval_requests WHERE approval_id=?",
            (approval_id,),
        )
        if not rows:
            return None
        r = dict(rows[0])
        r["payload"] = json.loads(r.pop("payload_json"))
        return r

    def pending(self, limit: int = 100) -> List[Dict[str, Any]]:
        rows = self.store.query(
            """
            SELECT * FROM approval_requests
            WHERE status='PENDING'
            ORDER BY created_at ASC
            LIMIT ?
            """,
            (limit,),
        )
        result = []
        for r in rows:
            x = dict(r)
            x["payload"] = json.loads(x.pop("payload_json"))
            result.append(x)
        return result

    def assert_allowed(
        self,
        action_type: str,
        approval_id: Optional[str] = None,
    ) -> None:
        # Fail closed for actions explicitly forbidden in this phase.
        if action_type == "REAL_PAYMENT" and not REAL_PAYMENT_ENABLED:
            raise PermissionError("REAL_PAYMENT is disabled by deployment policy.")
        if action_type == "REAL_SUPPLIER_ORDER" and not REAL_SUPPLIER_ORDER_ENABLED:
            raise PermissionError(
                "REAL_SUPPLIER_ORDER is disabled by deployment policy."
            )

        if action_type in HIGH_RISK_ACTIONS:
            if not approval_id:
                raise PermissionError("Human approval is required.")
            request = self.get(approval_id)
            if not request or request["status"] != "APPROVED":
                raise PermissionError("Valid APPROVED human approval is required.")


# ---------------------------------------------------------------------------
# DISASTER RECOVERY
# ---------------------------------------------------------------------------

class DisasterRecovery:
    """
    Application-level backup manager.

    IMPORTANT:
    This does not replace cloud snapshots or off-site backups. It provides a
    deterministic application backup, integrity manifest and restore verification.
    """

    def __init__(
        self,
        store: SQLiteStore,
        audit: AuditLogger,
        backup_dir: Path = BACKUP_DIR,
    ):
        self.store = store
        self.audit = audit
        self.backup_dir = Path(backup_dir)
        self.backup_dir.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def sha256(path: Path) -> str:
        h = hashlib.sha256()
        with path.open("rb") as f:
            for chunk in iter(lambda: f.read(1024 * 1024), b""):
                h.update(chunk)
        return h.hexdigest()

    def backup(self, label: str = "manual") -> Dict[str, Any]:
        self.store.conn.commit()

        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        safe_label = "".join(c if c.isalnum() or c in "-_" else "_" for c in label)
        destination = self.backup_dir / f"buzzard_{safe_label}_{timestamp}.sqlite3"

        # SQLite online backup API is safer than copying a live WAL database.
        target = sqlite3.connect(str(destination))
        try:
            self.store.conn.backup(target)
        finally:
            target.close()

        checksum = self.sha256(destination)
        manifest = {
            "app": APP_NAME,
            "created_at": utc_now(),
            "source_db": str(self.store.db_path),
            "backup_file": str(destination),
            "sha256": checksum,
            "sales_enabled": SALES_ENABLED,
        }

        manifest_path = destination.with_suffix(".json")
        manifest_path.write_text(json_dumps(manifest), encoding="utf-8")

        self.audit.write(
            "backup_created",
            "disaster_recovery",
            "INFO",
            str(destination),
            manifest,
        )
        return manifest

    def verify(self, backup_file: str) -> Dict[str, Any]:
        path = Path(backup_file)
        if not path.exists():
            raise FileNotFoundError(path)

        checksum = self.sha256(path)
        temp_db = self.backup_dir / f".verify_{uuid.uuid4().hex}.sqlite3"
        shutil.copy2(path, temp_db)

        result = {
            "file": str(path),
            "sha256": checksum,
            "integrity": False,
            "tables": [],
            "row_counts": {},
        }

        conn = sqlite3.connect(str(temp_db))
        try:
            integrity = conn.execute("PRAGMA integrity_check").fetchone()[0]
            result["integrity"] = integrity == "ok"
            tables = [
                r[0]
                for r in conn.execute(
                    "SELECT name FROM sqlite_master WHERE type='table'"
                ).fetchall()
            ]
            result["tables"] = tables
            for table in tables:
                safe = table.replace('"', '""')
                result["row_counts"][table] = conn.execute(
                    f'SELECT COUNT(*) FROM "{safe}"'
                ).fetchone()[0]
        finally:
            conn.close()
            temp_db.unlink(missing_ok=True)

        self.audit.write(
            "backup_verified",
            "disaster_recovery",
            "INFO" if result["integrity"] else "CRITICAL",
            str(path),
            result,
        )
        return result

    def restore_to(
        self,
        backup_file: str,
        target_path: str,
        approval_id: Optional[str] = None,
    ) -> None:
        # Restore is always considered destructive/high-risk.
        if not approval_id:
            raise PermissionError("Human approval is required for database restore.")

        source = Path(backup_file)
        target = Path(target_path)
        if not source.exists():
            raise FileNotFoundError(source)

        # Verify before restore.
        verification = self.verify(str(source))
        if not verification["integrity"]:
            raise RuntimeError("Backup integrity verification failed.")

        temp_target = target.with_suffix(target.suffix + ".restoring")
        shutil.copy2(source, temp_target)
        os.replace(temp_target, target)

        self.audit.write(
            "database_restored",
            "disaster_recovery",
            "CRITICAL",
            str(target),
            {"source": str(source), "approval_id": approval_id},
        )


# ---------------------------------------------------------------------------
# IDEMPOTENCY
# ---------------------------------------------------------------------------

class Idempotency:
    def __init__(self, store: SQLiteStore):
        self.store = store

    def get(self, key: str) -> Optional[Dict[str, Any]]:
        rows = self.store.query(
            "SELECT result_json FROM idempotency WHERE idempotency_key=?",
            (key,),
        )
        if not rows:
            return None
        return json.loads(rows[0]["result_json"])

    def put(self, key: str, result: Dict[str, Any]) -> None:
        self.store.execute(
            """
            INSERT INTO idempotency(idempotency_key,result_json,created_at)
            VALUES (?,?,?)
            ON CONFLICT(idempotency_key) DO NOTHING
            """,
            (key, json_dumps(result), utc_now()),
        )


# ---------------------------------------------------------------------------
# GUARDIAN FACADE
# ---------------------------------------------------------------------------

class BuzzardAIGuardian:
    """
    Single integration point for the Buzzard Orchestrator.

    Recommended flow:
        task arrives
          -> policy check
          -> cost estimate check
          -> anomaly checks
          -> approval if required
          -> execute adapter
          -> record cost
          -> memory update
          -> audit
    """

    def __init__(self, db_path: Path = DB_PATH):
        self.store = SQLiteStore(db_path)
        self.audit = AuditLogger(self.store)
        self.incidents = IncidentManager(self.store, self.audit)
        self.costs = CostController(self.store, self.audit)
        self.memory = KnowledgeBase(self.store, self.audit)
        self.anomalies = AnomalyEngine(self.store, self.audit, self.incidents)
        self.approvals = ApprovalCenter(
            self.store, self.audit, self.incidents
        )
        self.idempotency = Idempotency(self.store)
        self.dr = DisasterRecovery(self.store, self.audit)

    def register_default_agents(self) -> None:
        defaults = [
            AgentPolicy("nesrin", 5.0, 100.0, 1.0, 20),
            AgentPolicy("product_ai", 3.0, 60.0, 0.50, 20),
            AgentPolicy("category_ai", 2.0, 50.0, 0.50, 20),
            AgentPolicy("supplier_ai", 3.0, 75.0, 1.00, 15),
            AgentPolicy("price_ai", 2.0, 50.0, 0.50, 15),
            AgentPolicy("customs_ai", 2.0, 50.0, 0.75, 20),
            AgentPolicy("order_ai", 2.0, 50.0, 0.75, 10),
            AgentPolicy("esat_security", 3.0, 75.0, 1.00, 5),
        ]
        for policy in defaults:
            self.costs.register_agent(policy)

    def create_task_gate(
        self,
        task_id: str,
        agent_id: str,
        action_type: str,
        description: str,
        estimated_cost_eur: float,
        amount_eur: float = 0,
        affects_records: int = 1,
        external_side_effect: bool = False,
    ) -> Dict[str, Any]:
        if not self.costs.authorize_estimated_cost(
            agent_id, estimated_cost_eur, task_id
        ):
            raise PermissionError("AI cost policy blocked task.")

        risk = self.approvals.calculate_risk(
            action_type,
            amount_eur,
            affects_records,
            external_side_effect,
        )

        requires = self.approvals.requires_approval(
            action_type,
            risk,
            amount_eur,
        )

        approval_id = None
        if requires:
            approval_id = self.approvals.request(
                task_id=task_id,
                requested_by=agent_id,
                action_type=action_type,
                description=description,
                payload={
                    "agent_id": agent_id,
                    "estimated_cost_eur": estimated_cost_eur,
                    "affects_records": affects_records,
                },
                risk_score=risk,
                amount_eur=amount_eur,
            )

        self.audit.write(
            "task_gate_created",
            agent_id,
            "WARNING" if requires else "INFO",
            task_id,
            {
                "action_type": action_type,
                "risk_score": risk,
                "requires_approval": requires,
                "approval_id": approval_id,
            },
        )

        return {
            "task_id": task_id,
            "allowed_to_prepare": True,
            "requires_approval": requires,
            "approval_id": approval_id,
            "risk_score": risk,
        }

    def execute_guarded(
        self,
        task_id: str,
        agent_id: str,
        action_type: str,
        operation,
        approval_id: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        if idempotency_key:
            previous = self.idempotency.get(idempotency_key)
            if previous is not None:
                return previous

        self.approvals.assert_allowed(action_type, approval_id)

        # Explicit phase policy: sales remain disabled.
        if action_type in {
            "CHECKOUT",
            "REAL_PAYMENT",
            "REAL_SUPPLIER_ORDER",
        }:
            raise PermissionError(
                f"{action_type} is disabled in the current Buzzard phase."
            )

        try:
            result = operation()
            payload = {
                "ok": True,
                "task_id": task_id,
                "agent_id": agent_id,
                "action_type": action_type,
                "result": result,
            }
            if idempotency_key:
                self.idempotency.put(idempotency_key, payload)

            self.audit.write(
                "guarded_operation_succeeded",
                agent_id,
                "INFO",
                task_id,
                {"action_type": action_type},
            )
            return payload

        except Exception as exc:
            self.audit.write(
                "guarded_operation_failed",
                agent_id,
                "HIGH",
                task_id,
                {"action_type": action_type, "error": str(exc)},
            )
            self.incidents.create(
                "HIGH",
                "TASK_FAILURE",
                "Guarded operation failed",
                f"{action_type}: {exc}",
                agent_id,
            )
            raise

    def status(self) -> Dict[str, Any]:
        return {
            "app": APP_NAME,
            "time": utc_now(),
            "sales_enabled": SALES_ENABLED,
            "real_payment_enabled": REAL_PAYMENT_ENABLED,
            "real_supplier_order_enabled": REAL_SUPPLIER_ORDER_ENABLED,
            "real_product_images_enabled": REAL_PRODUCT_IMAGES_ENABLED,
            "database": str(self.store.db_path),
            "open_incidents": len(self.incidents.open_incidents()),
            "pending_approvals": len(self.approvals.pending()),
            "costs": self.costs.dashboard(),
        }

    def close(self) -> None:
        self.store.close()


# ---------------------------------------------------------------------------
# DEMO / SELF TEST
# ---------------------------------------------------------------------------

def self_test() -> Dict[str, Any]:
    import tempfile

    with tempfile.TemporaryDirectory(prefix="buzzard_guardian_test_") as td:
        db = Path(td) / "test.sqlite3"
        backup_dir = Path(td) / "backups"

        g = BuzzardAIGuardian(db)
        g.dr.backup_dir = backup_dir
        g.dr.backup_dir.mkdir(parents=True, exist_ok=True)
        g.register_default_agents()

        # Memory
        mem_id = g.memory.upsert(
            "buzzard",
            "opening_date",
            "Geplantes Buzzard Go-Live: 02.11.2026",
            "business_plan",
            1.0,
            ["launch", "planning"],
        )
        assert g.memory.get("buzzard", "opening_date")

        # Cost
        ok = g.costs.authorize_estimated_cost("product_ai", 0.10, "task_1")
        assert ok
        g.costs.record(
            CostEvent(
                "product_ai",
                "test-model",
                "test-provider",
                100,
                50,
                0.01,
                0.02,
                "task_1",
                {},
            )
        )

        # Anomaly
        incident_id = g.anomalies.check_price_change(
            "SKU-TEST", 100, 150, 25
        )
        assert incident_id

        # Approval
        gate = g.create_task_gate(
            "task_2",
            "order_ai",
            "REAL_SUPPLIER_ORDER",
            "Prepare a supplier order",
            0.20,
            amount_eur=250,
            affects_records=1,
            external_side_effect=True,
        )
        assert gate["requires_approval"]
        approval_id = gate["approval_id"]
        assert approval_id

        try:
            g.execute_guarded(
                "task_2",
                "order_ai",
                "REAL_SUPPLIER_ORDER",
                lambda: {"sent": True},
                approval_id=approval_id,
            )
            raise AssertionError("Real supplier order should be blocked.")
        except PermissionError:
            pass

        # Backup + verification
        manifest = g.dr.backup("selftest")
        verification = g.dr.verify(manifest["backup_file"])
        assert verification["integrity"]

        status = g.status()
        g.close()

        return {
            "passed": True,
            "memory_id": mem_id,
            "incident_id": incident_id,
            "approval_id": approval_id,
            "backup_verified": verification["integrity"],
            "sales_enabled": status["sales_enabled"],
        }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description=APP_NAME)
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("init")
    sub.add_parser("status")
    sub.add_parser("self-test")
    sub.add_parser("backup")

    verify = sub.add_parser("verify-backup")
    verify.add_argument("file")

    args = parser.parse_args()
    guardian = BuzzardAIGuardian()

    try:
        if args.command == "init":
            guardian.register_default_agents()
            print(json_dumps({"ok": True, "status": guardian.status()}))

        elif args.command == "status":
            print(json_dumps(guardian.status()))

        elif args.command == "self-test":
            guardian.close()
            print(json_dumps(self_test()))

        elif args.command == "backup":
            print(json_dumps(guardian.dr.backup("manual")))

        elif args.command == "verify-backup":
            print(json_dumps(guardian.dr.verify(args.file)))

        else:
            parser.print_help()
    finally:
        if args.command != "self-test":
            guardian.close()


if __name__ == "__main__":
    main()
