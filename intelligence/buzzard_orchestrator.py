"""
BUZZARD AI GÖREV ORKESTRATÖRÜ
Tek dosyalı, ölçeklenebilir başlangıç backend'i.

Amaç:
- Buzzard AI çalışanlarını merkezi olarak yönetmek
- Görevleri doğru AI çalışanına yönlendirmek
- Öncelik, bağımlılık, SLA, retry ve timeout yönetmek
- Yetki sınırlarını uygulamak
- Riskli işlemlerde insan onayı istemek
- Audit log tutmak
- AI çalışanları arasında olay/görev akışı kurmak
- SQLite ile kalıcı durum saklamak
- REST API üzerinden web paneli / diğer servislerle konuşmak

Çalıştırma:
    pip install fastapi uvicorn pydantic
    uvicorn buzzard_orchestrator:app --reload

Dokümantasyon:
    http://127.0.0.1:8000/docs

Not:
Bu sürüm gerçek para transferi, gerçek sipariş veya gerçek tedarikçi API çağrısı
yapmaz. Dış sistem bağlantıları adapter olarak bırakılmıştır. Üretimde secret
yönetimi, OAuth/API anahtarları, RBAC, gerçek queue sistemi, Redis/PostgreSQL,
observability ve güvenlik katmanları ayrıca yapılandırılmalıdır.
"""

from __future__ import annotations

import json
import os
import sqlite3
import threading
import time
import traceback
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field


# ============================================================
# 1. TEMEL YAPILAR
# ============================================================

DB_PATH = os.getenv("BUZZARD_DB", "buzzard_orchestrator.db")
MAX_RETRIES = int(os.getenv("BUZZARD_MAX_RETRIES", "3"))
DEFAULT_TIMEOUT = int(os.getenv("BUZZARD_TASK_TIMEOUT", "120"))
HUMAN_APPROVAL_THRESHOLD_EUR = float(
    os.getenv("BUZZARD_APPROVAL_THRESHOLD_EUR", "500")
)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:16]}"


class Priority(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    NORMAL = "normal"
    LOW = "low"


class TaskStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    WAITING_APPROVAL = "waiting_approval"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ApprovalDecision(str, Enum):
    APPROVE = "approve"
    REJECT = "reject"


@dataclass
class Agent:
    agent_id: str
    name: str
    role: str
    description: str
    capabilities: List[str]
    allowed_actions: List[str]
    max_transaction_eur: float = 0.0
    active: bool = True


@dataclass
class AgentResult:
    success: bool
    output: Dict[str, Any]
    message: str = ""


# ============================================================
# 2. SQLITE KALICILIK
# ============================================================

class Database:
    def __init__(self, path: str):
        self.path = path
        self.lock = threading.Lock()
        self._init()

    def connect(self):
        conn = sqlite3.connect(self.path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init(self):
        with self.lock, self.connect() as c:
            c.executescript(
                """
                CREATE TABLE IF NOT EXISTS tasks (
                    task_id TEXT PRIMARY KEY,
                    task_type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT,
                    priority TEXT NOT NULL,
                    status TEXT NOT NULL,
                    risk_level TEXT NOT NULL,
                    requested_by TEXT,
                    assigned_agent TEXT,
                    payload TEXT,
                    result TEXT,
                    error TEXT,
                    retries INTEGER DEFAULT 0,
                    max_retries INTEGER DEFAULT 3,
                    timeout_seconds INTEGER DEFAULT 120,
                    requires_approval INTEGER DEFAULT 0,
                    approval_id TEXT,
                    parent_task_id TEXT,
                    depends_on TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    started_at TEXT,
                    finished_at TEXT
                );

                CREATE TABLE IF NOT EXISTS approvals (
                    approval_id TEXT PRIMARY KEY,
                    task_id TEXT NOT NULL,
                    status TEXT NOT NULL,
                    requested_by TEXT,
                    reason TEXT,
                    amount_eur REAL DEFAULT 0,
                    decision_by TEXT,
                    decision_note TEXT,
                    created_at TEXT NOT NULL,
                    decided_at TEXT
                );

                CREATE TABLE IF NOT EXISTS audit_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_id TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    actor TEXT,
                    task_id TEXT,
                    agent_id TEXT,
                    data TEXT,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS agents (
                    agent_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    role TEXT NOT NULL,
                    description TEXT,
                    capabilities TEXT,
                    allowed_actions TEXT,
                    max_transaction_eur REAL,
                    active INTEGER DEFAULT 1
                );
                """
            )

    def execute(self, sql: str, params=()):
        with self.lock, self.connect() as c:
            cur = c.execute(sql, params)
            return cur.fetchall()

    def one(self, sql: str, params=()):
        rows = self.execute(sql, params)
        return dict(rows[0]) if rows else None

    def audit(self, event_type: str, actor: str, task_id=None,
              agent_id=None, data=None):
        self.execute(
            """
            INSERT INTO audit_log
            (event_id,event_type,actor,task_id,agent_id,data,created_at)
            VALUES (?,?,?,?,?,?,?)
            """,
            (
                new_id("evt"),
                event_type,
                actor,
                task_id,
                agent_id,
                json.dumps(data or {}, ensure_ascii=False),
                now_iso(),
            ),
        )


db = Database(DB_PATH)


# ============================================================
# 3. AI ÇALIŞAN KAYIT SİSTEMİ
# ============================================================

class AgentRegistry:
    def __init__(self):
        self.agents: Dict[str, Agent] = {}
        self.handlers: Dict[str, Callable[[Dict[str, Any]], AgentResult]] = {}

    def register(
        self,
        agent: Agent,
        handler: Optional[Callable[[Dict[str, Any]], AgentResult]] = None,
    ):
        self.agents[agent.agent_id] = agent
        if handler:
            self.handlers[agent.agent_id] = handler

        db.execute(
            """
            INSERT OR REPLACE INTO agents
            (agent_id,name,role,description,capabilities,allowed_actions,
             max_transaction_eur,active)
            VALUES (?,?,?,?,?,?,?,?)
            """,
            (
                agent.agent_id,
                agent.name,
                agent.role,
                agent.description,
                json.dumps(agent.capabilities, ensure_ascii=False),
                json.dumps(agent.allowed_actions, ensure_ascii=False),
                agent.max_transaction_eur,
                1 if agent.active else 0,
            ),
        )

    def get(self, agent_id: str) -> Optional[Agent]:
        return self.agents.get(agent_id)

    def all(self) -> List[Agent]:
        return list(self.agents.values())

    def find_best(self, task_type: str) -> Optional[Agent]:
        candidates = [
            a for a in self.agents.values()
            if a.active and task_type in a.capabilities
        ]
        if not candidates:
            return None
        return candidates[0]


registry = AgentRegistry()


# ============================================================
# 4. ÖRNEK BUZZARD AI EKİBİ
# ============================================================

def generic_agent_handler(agent_name: str):
    def handler(payload: Dict[str, Any]) -> AgentResult:
        return AgentResult(
            success=True,
            output={
                "agent": agent_name,
                "mode": "simulation",
                "received_payload": payload,
                "next_step": "Gerçek AI/model/API adapter'ı bağlanmalı.",
            },
            message=f"{agent_name} görevi aldı."
        )
    return handler


def nesrin_handler(payload):
    return AgentResult(
        success=True,
        output={
            "summary": "Nesrin Hanım merkezi yönetim görevini işledi.",
            "priority": payload.get("priority", "normal"),
            "recommendation": "İlgili uzman AI'ların sonuçları toplanmalı."
        },
        message="Nesrin merkezi koordinasyon görevini tamamladı."
    )


def security_handler(payload):
    return AgentResult(
        success=True,
        output={
            "security_check": "passed",
            "mode": "simulation",
            "risk_flags": []
        },
        message="Güvenlik kontrolü tamamlandı."
    )


registry.register(
    Agent(
        agent_id="nesrin",
        name="Nesrin Hanım",
        role="Merkezi AI Yönetici / Koordinatör",
        description="Buzzard AI çalışanlarının koordinasyonu ve yönetim özeti.",
        capabilities=[
            "management",
            "business_analysis",
            "daily_summary",
            "task_coordination",
        ],
        allowed_actions=[
            "create_task",
            "assign_task",
            "request_approval",
            "read_business_data",
            "send_notification",
        ],
        max_transaction_eur=500.0,
    ),
    nesrin_handler,
)

registry.register(
    Agent(
        agent_id="supplier_ai",
        name="Tedarik AI",
        role="Tedarikçi ve satın alma uzmanı",
        description="Tedarikçi, stok, fiyat ve yeniden sipariş süreçleri.",
        capabilities=[
            "supplier_check",
            "stock_check",
            "price_check",
            "purchase_recommendation",
        ],
        allowed_actions=[
            "read_supplier_data",
            "read_stock",
            "read_price",
            "create_purchase_recommendation",
        ],
        max_transaction_eur=5000.0,
    ),
    generic_agent_handler("Tedarik AI"),
)

registry.register(
    Agent(
        agent_id="product_ai",
        name="Ürün AI",
        role="Ürün oluşturma ve kategorilendirme uzmanı",
        description="Ürün verisi, başlık, açıklama, özellik ve kategori işlemleri.",
        capabilities=[
            "product_creation",
            "product_categorization",
            "product_enrichment",
            "translation",
        ],
        allowed_actions=[
            "create_product",
            "edit_product",
            "categorize_product",
            "translate_product",
        ],
        max_transaction_eur=0,
    ),
    generic_agent_handler("Ürün AI"),
)

registry.register(
    Agent(
        agent_id="pricing_ai",
        name="Fiyat AI",
        role="Fiyat ve stok optimizasyon uzmanı",
        description="Rekabet, marj ve stok durumuna göre fiyat önerileri.",
        capabilities=[
            "pricing",
            "stock_check",
            "margin_analysis",
            "competitor_analysis",
        ],
        allowed_actions=[
            "read_market_price",
            "read_stock",
            "recommend_price",
        ],
        max_transaction_eur=0,
    ),
    generic_agent_handler("Fiyat AI"),
)

registry.register(
    Agent(
        agent_id="order_ai",
        name="Sipariş AI",
        role="Sipariş ve fulfillment uzmanı",
        description="Sipariş, tedarikçi siparişi, kargo ve takip süreçleri.",
        capabilities=[
            "order_processing",
            "fulfillment",
            "shipping",
            "return_processing",
        ],
        allowed_actions=[
            "read_order",
            "prepare_order",
            "prepare_supplier_order",
            "update_shipping_status",
        ],
        max_transaction_eur=500.0,
    ),
    generic_agent_handler("Sipariş AI"),
)

registry.register(
    Agent(
        agent_id="customs_ai",
        name="Gümrük AI",
        role="Gümrük ve dış ticaret uzmanı",
        description="GTIP, menşe, vergi ve ithalat/ihracat kontrolleri.",
        capabilities=[
            "customs_check",
            "tariff_check",
            "origin_check",
            "import_compliance",
        ],
        allowed_actions=[
            "read_product_data",
            "classify_tariff",
            "check_origin",
            "prepare_customs_report",
        ],
        max_transaction_eur=0,
    ),
    generic_agent_handler("Gümrük AI"),
)

registry.register(
    Agent(
        agent_id="security_ai",
        name="Esat Bey",
        role="Buzzard Muhafızı / AI Siber Güvenlik",
        description="Sistemleri savunur, tehditleri tespit eder ve raporlar.",
        capabilities=[
            "security_check",
            "threat_detection",
            "access_review",
            "anomaly_detection",
        ],
        allowed_actions=[
            "read_security_events",
            "isolate_service",
            "raise_security_alert",
        ],
        max_transaction_eur=0,
    ),
    security_handler,
)


# ============================================================
# 5. GÖREV MODELİ
# ============================================================

class TaskCreate(BaseModel):
    task_type: str = Field(..., min_length=1)
    title: str
    description: str = ""
    payload: Dict[str, Any] = Field(default_factory=dict)
    priority: Priority = Priority.NORMAL
    risk_level: RiskLevel = RiskLevel.LOW
    requested_by: str = "system"
    assigned_agent: Optional[str] = None
    depends_on: List[str] = Field(default_factory=list)
    parent_task_id: Optional[str] = None
    requires_approval: bool = False
    amount_eur: float = 0.0
    timeout_seconds: int = DEFAULT_TIMEOUT
    max_retries: int = MAX_RETRIES


class ApprovalDecisionRequest(BaseModel):
    decision: ApprovalDecision
    decided_by: str
    note: str = ""


# ============================================================
# 6. YETKİ VE RİSK MOTORU
# ============================================================

class PolicyEngine:
    HIGH_RISK_ACTIONS = {
        "payment",
        "purchase",
        "refund",
        "supplier_order",
        "price_change_large",
        "account_change",
        "security_isolation",
        "delete_data",
    }

    def requires_approval(
        self,
        task_type: str,
        risk_level: RiskLevel,
        amount_eur: float,
        explicit: bool,
    ) -> bool:
        if explicit:
            return True
        if risk_level in {RiskLevel.HIGH, RiskLevel.CRITICAL}:
            return True
        if task_type in self.HIGH_RISK_ACTIONS:
            return True
        if amount_eur > HUMAN_APPROVAL_THRESHOLD_EUR:
            return True
        return False

    def can_agent_execute(
        self,
        agent: Agent,
        task_type: str,
        amount_eur: float,
    ) -> bool:
        if not agent.active:
            return False

        if task_type not in agent.capabilities:
            return False

        if amount_eur > agent.max_transaction_eur:
            return False

        return True


policy = PolicyEngine()


# ============================================================
# 7. GÖREV ORKESTRATÖRÜ
# ============================================================

class Orchestrator:

    def create_task(self, req: TaskCreate) -> Dict[str, Any]:
        task_id = new_id("task")

        agent_id = req.assigned_agent
        if not agent_id:
            agent = registry.find_best(req.task_type)
            agent_id = agent.agent_id if agent else None

        if agent_id:
            agent = registry.get(agent_id)
            if not agent:
                raise HTTPException(404, "AI çalışanı bulunamadı.")

            if not policy.can_agent_execute(
                agent, req.task_type, req.amount_eur
            ):
                raise HTTPException(
                    403,
                    "Bu AI çalışanının bu görevi yürütmeye yetkisi yok."
                )

        approval_required = policy.requires_approval(
            req.task_type,
            req.risk_level,
            req.amount_eur,
            req.requires_approval,
        )

        approval_id = None

        if approval_required:
            approval_id = new_id("approval")
            db.execute(
                """
                INSERT INTO approvals
                (approval_id,task_id,status,requested_by,reason,amount_eur,created_at)
                VALUES (?,?,?,?,?,?,?)
                """,
                (
                    approval_id,
                    task_id,
                    "pending",
                    req.requested_by,
                    self.approval_reason(req),
                    req.amount_eur,
                    now_iso(),
                ),
            )

        status = (
            TaskStatus.WAITING_APPROVAL.value
            if approval_required
            else TaskStatus.QUEUED.value
        )

        db.execute(
            """
            INSERT INTO tasks
            (task_id,task_type,title,description,priority,status,risk_level,
             requested_by,assigned_agent,payload,retries,max_retries,
             timeout_seconds,requires_approval,approval_id,parent_task_id,
             depends_on,created_at,updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                task_id,
                req.task_type,
                req.title,
                req.description,
                req.priority.value,
                status,
                req.risk_level.value,
                req.requested_by,
                agent_id,
                json.dumps(req.payload, ensure_ascii=False),
                0,
                req.max_retries,
                req.timeout_seconds,
                1 if approval_required else 0,
                approval_id,
                req.parent_task_id,
                json.dumps(req.depends_on),
                now_iso(),
                now_iso(),
            ),
        )

        db.audit(
            "task_created",
            req.requested_by,
            task_id=task_id,
            agent_id=agent_id,
            data={
                "task_type": req.task_type,
                "approval_required": approval_required,
            },
        )

        return self.get_task(task_id)

    @staticmethod
    def approval_reason(req: TaskCreate) -> str:
        reasons = []
        if req.amount_eur > HUMAN_APPROVAL_THRESHOLD_EUR:
            reasons.append(
                f"Tutar {HUMAN_APPROVAL_THRESHOLD_EUR:.0f} € eşiğini aşıyor."
            )
        if req.risk_level in {RiskLevel.HIGH, RiskLevel.CRITICAL}:
            reasons.append(f"Risk seviyesi: {req.risk_level.value}")
        if req.task_type in PolicyEngine.HIGH_RISK_ACTIONS:
            reasons.append(f"Yüksek riskli işlem: {req.task_type}")
        if req.requires_approval:
            reasons.append("Görev açıkça insan onayı istedi.")
        return " ".join(reasons) or "Politika gereği insan onayı gerekiyor."

    def get_task(self, task_id: str):
        row = db.one("SELECT * FROM tasks WHERE task_id=?", (task_id,))
        if not row:
            raise HTTPException(404, "Görev bulunamadı.")

        for field in ("payload", "result", "depends_on"):
            if row.get(field):
                try:
                    row[field] = json.loads(row[field])
                except Exception:
                    pass
        return row

    def list_tasks(self, status: Optional[str] = None, limit: int = 100):
        if status:
            rows = db.execute(
                "SELECT * FROM tasks WHERE status=? "
                "ORDER BY created_at DESC LIMIT ?",
                (status, limit),
            )
        else:
            rows = db.execute(
                "SELECT * FROM tasks ORDER BY created_at DESC LIMIT ?",
                (limit,),
            )
        return [dict(r) for r in rows]

    def dependencies_ready(self, task: Dict[str, Any]) -> bool:
        depends_on = task.get("depends_on") or []
        if isinstance(depends_on, str):
            depends_on = json.loads(depends_on)

        for dep_id in depends_on:
            dep = self.get_task(dep_id)
            if dep["status"] != TaskStatus.SUCCEEDED.value:
                return False
        return True

    def approve(self, task_id: str, req: ApprovalDecisionRequest):
        task = self.get_task(task_id)

        if task["status"] != TaskStatus.WAITING_APPROVAL.value:
            raise HTTPException(
                409, "Bu görev şu anda onay beklemiyor."
            )

        approval_id = task["approval_id"]

        new_status = (
            TaskStatus.QUEUED.value
            if req.decision == ApprovalDecision.APPROVE
            else TaskStatus.CANCELLED.value
        )

        db.execute(
            """
            UPDATE approvals
            SET status=?,decision_by=?,decision_note=?,decided_at=?
            WHERE approval_id=?
            """,
            (
                req.decision.value,
                req.decided_by,
                req.note,
                now_iso(),
                approval_id,
            ),
        )

        db.execute(
            "UPDATE tasks SET status=?,updated_at=? WHERE task_id=?",
            (new_status, now_iso(), task_id),
        )

        db.audit(
            "approval_decision",
            req.decided_by,
            task_id=task_id,
            data={"decision": req.decision.value, "note": req.note},
        )

        return self.get_task(task_id)

    def execute(self, task_id: str):
        task = self.get_task(task_id)

        if task["status"] == TaskStatus.WAITING_APPROVAL.value:
            raise HTTPException(409, "Görev önce insan onayı bekliyor.")

        if task["status"] != TaskStatus.QUEUED.value:
            raise HTTPException(
                409,
                f"Görev çalıştırılamaz. Mevcut durum: {task['status']}"
            )

        if not self.dependencies_ready(task):
            raise HTTPException(
                409,
                "Görevin bağımlılıkları henüz tamamlanmadı."
            )

        agent_id = task["assigned_agent"]
        if not agent_id:
            agent = registry.find_best(task["task_type"])
            if not agent:
                raise HTTPException(
                    503,
                    "Bu görev tipi için uygun AI çalışanı bulunamadı."
                )
            agent_id = agent.agent_id
            db.execute(
                "UPDATE tasks SET assigned_agent=?,updated_at=? WHERE task_id=?",
                (agent_id, now_iso(), task_id),
            )
        else:
            agent = registry.get(agent_id)

        if not agent:
            raise HTTPException(503, "Atanmış AI çalışanı aktif değil.")

        if not policy.can_agent_execute(
            agent,
            task["task_type"],
            self.extract_amount(task),
        ):
            raise HTTPException(
                403,
                "AI çalışanının yetki sınırı bu görevi yürütmeye izin vermiyor."
            )

        handler = registry.handlers.get(agent_id)
        if not handler:
            raise HTTPException(
                501,
                f"{agent.name} için gerçek handler/adaptör bağlanmamış."
            )

        db.execute(
            """
            UPDATE tasks
            SET status=?,started_at=?,updated_at=?
            WHERE task_id=?
            """,
            (
                TaskStatus.RUNNING.value,
                now_iso(),
                now_iso(),
                task_id,
            ),
        )

        db.audit(
            "task_started",
            "orchestrator",
            task_id=task_id,
            agent_id=agent_id,
        )

        try:
            payload = task.get("payload") or {}
            payload["_task_id"] = task_id
            payload["_task_type"] = task["task_type"]
            payload["_priority"] = task["priority"]

            result = handler(payload)

            if result.success:
                db.execute(
                    """
                    UPDATE tasks
                    SET status=?,result=?,error=NULL,finished_at=?,updated_at=?
                    WHERE task_id=?
                    """,
                    (
                        TaskStatus.SUCCEEDED.value,
                        json.dumps(result.output, ensure_ascii=False),
                        now_iso(),
                        now_iso(),
                        task_id,
                    ),
                )
                db.audit(
                    "task_succeeded",
                    agent.name,
                    task_id=task_id,
                    agent_id=agent_id,
                    data=result.output,
                )
            else:
                self.fail_or_retry(
                    task,
                    result.message or "AI görevi başarısız."
                )

        except Exception as exc:
            self.fail_or_retry(
                task,
                f"{type(exc).__name__}: {str(exc)}\n{traceback.format_exc()}"
            )

        return self.get_task(task_id)

    @staticmethod
    def extract_amount(task: Dict[str, Any]) -> float:
        payload = task.get("payload") or {}
        try:
            return float(payload.get("amount_eur", 0))
        except Exception:
            return 0.0

    def fail_or_retry(self, task: Dict[str, Any], error: str):
        retries = int(task["retries"] or 0)
        max_retries = int(task["max_retries"] or MAX_RETRIES)

        if retries < max_retries:
            new_retries = retries + 1
            db.execute(
                """
                UPDATE tasks
                SET status=?,retries=?,error=?,updated_at=?
                WHERE task_id=?
                """,
                (
                    TaskStatus.QUEUED.value,
                    new_retries,
                    error,
                    now_iso(),
                    task["task_id"],
                ),
            )
            db.audit(
                "task_retry",
                "orchestrator",
                task_id=task["task_id"],
                data={"retry": new_retries, "error": error},
            )
        else:
            db.execute(
                """
                UPDATE tasks
                SET status=?,error=?,finished_at=?,updated_at=?
                WHERE task_id=?
                """,
                (
                    TaskStatus.FAILED.value,
                    error,
                    now_iso(),
                    now_iso(),
                    task["task_id"],
                ),
            )
            db.audit(
                "task_failed",
                "orchestrator",
                task_id=task["task_id"],
                data={"error": error},
            )

    def cancel(self, task_id: str, actor: str):
        task = self.get_task(task_id)

        if task["status"] in {
            TaskStatus.SUCCEEDED.value,
            TaskStatus.FAILED.value,
            TaskStatus.CANCELLED.value,
        }:
            raise HTTPException(409, "Görev zaten tamamlanmış.")

        db.execute(
            "UPDATE tasks SET status=?,updated_at=? WHERE task_id=?",
            (TaskStatus.CANCELLED.value, now_iso(), task_id),
        )
        db.audit("task_cancelled", actor, task_id=task_id)

        return self.get_task(task_id)


orchestrator = Orchestrator()


# ============================================================
# 8. OLAY / İŞ AKIŞI MOTORU
# ============================================================

class WorkflowEngine:
    """
    Basit workflow:
    Aynı isteğin içinde birden fazla AI görevi oluşturulabilir.
    Bağımlılıklar ile zincir kurulur.
    """

    def create_chain(
        self,
        steps: List[TaskCreate],
        requested_by: str = "system",
    ) -> List[Dict[str, Any]]:
        created = []
        previous_id = None

        for step in steps:
            step.requested_by = requested_by
            if previous_id:
                step.depends_on = [previous_id]

            task = orchestrator.create_task(step)
            created.append(task)
            previous_id = task["task_id"]

        return created


workflow = WorkflowEngine()


# ============================================================
# 9. FASTAPI
# ============================================================

app = FastAPI(
    title="Buzzard AI Görev Orkestratörü",
    version="1.0.0",
    description=(
        "Buzzard AI çalışanlarını merkezi olarak yöneten görev, "
        "yetki, onay, audit ve workflow servisi."
    ),
)


@app.get("/")
def root():
    return {
        "service": "Buzzard AI Görev Orkestratörü",
        "status": "online",
        "version": "1.0.0",
        "time": now_iso(),
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "agents": len(registry.all()),
        "database": DB_PATH,
        "time": now_iso(),
    }


@app.get("/agents")
def agents():
    return [
        {
            "agent_id": a.agent_id,
            "name": a.name,
            "role": a.role,
            "description": a.description,
            "capabilities": a.capabilities,
            "allowed_actions": a.allowed_actions,
            "max_transaction_eur": a.max_transaction_eur,
            "active": a.active,
        }
        for a in registry.all()
    ]


@app.get("/agents/{agent_id}")
def agent(agent_id: str):
    a = registry.get(agent_id)
    if not a:
        raise HTTPException(404, "AI çalışanı bulunamadı.")
    return {
        "agent_id": a.agent_id,
        "name": a.name,
        "role": a.role,
        "description": a.description,
        "capabilities": a.capabilities,
        "allowed_actions": a.allowed_actions,
        "max_transaction_eur": a.max_transaction_eur,
        "active": a.active,
    }


@app.post("/tasks")
def create_task(req: TaskCreate):
    return orchestrator.create_task(req)


@app.get("/tasks")
def tasks(status: Optional[str] = None, limit: int = 100):
    limit = max(1, min(limit, 500))
    return orchestrator.list_tasks(status, limit)


@app.get("/tasks/{task_id}")
def task(task_id: str):
    return orchestrator.get_task(task_id)


@app.post("/tasks/{task_id}/execute")
def execute_task(task_id: str):
    return orchestrator.execute(task_id)


@app.post("/tasks/{task_id}/cancel")
def cancel_task(task_id: str, actor: str = "system"):
    return orchestrator.cancel(task_id, actor)


@app.post("/tasks/{task_id}/approval")
def approval(task_id: str, req: ApprovalDecisionRequest):
    return orchestrator.approve(task_id, req)


@app.get("/approvals")
def approvals(status: str = "pending"):
    rows = db.execute(
        """
        SELECT * FROM approvals
        WHERE status=?
        ORDER BY created_at DESC
        """,
        (status,),
    )
    return [dict(r) for r in rows]


@app.get("/audit")
def audit(limit: int = 100):
    limit = max(1, min(limit, 500))
    rows = db.execute(
        """
        SELECT * FROM audit_log
        ORDER BY id DESC
        LIMIT ?
        """,
        (limit,),
    )
    result = []
    for r in rows:
        item = dict(r)
        try:
            item["data"] = json.loads(item["data"])
        except Exception:
            pass
        result.append(item)
    return result


# ============================================================
# 10. ÖRNEK YÖNETİCİ KOMUTLARI
# ============================================================

@app.post("/demo/daily-summary")
def demo_daily_summary():
    req = TaskCreate(
        task_type="daily_summary",
        title="Günlük Buzzard Yönetim Özeti",
        description="Günlük satış, stok, sipariş ve kritik durum özeti.",
        priority=Priority.HIGH,
        risk_level=RiskLevel.LOW,
        requested_by="Süleyman Bey",
        assigned_agent="nesrin",
        payload={
            "include_sales": True,
            "include_stock": True,
            "include_orders": True,
            "include_alerts": True,
        },
    )
    task = orchestrator.create_task(req)
    return orchestrator.execute(task["task_id"])


@app.post("/demo/purchase-request")
def demo_purchase_request():
    req = TaskCreate(
        task_type="supplier_order",
        title="Tedarikçi sipariş önerisi",
        description="Örnek yüksek riskli satın alma işlemi.",
        priority=Priority.HIGH,
        risk_level=RiskLevel.HIGH,
        requested_by="Süleyman Bey",
        assigned_agent="supplier_ai",
        amount_eur=2500,
        payload={
            "supplier": "DEMO_SUPPLIER",
            "sku": "BUZZ-DEMO-001",
            "quantity": 500,
            "amount_eur": 2500,
        },
    )
    return orchestrator.create_task(req)


# ============================================================
# 11. GELİŞTİRME NOTLARI
# ============================================================
#
# ÜRETİMDE EKLENECEKLER:
#
# 1. PostgreSQL
# 2. Redis
# 3. Celery / Temporal / gerçek message queue
# 4. OpenAI API / model gateway adapter
# 5. Tedarikçi API/XML adapter'ları
# 6. ERP / muhasebe adapter'ı
# 7. DHL/DPD/Hermes adapter'ları
# 8. Google Merchant Center adapter'ı
# 9. eBay/Amazon adapter'ları
# 10. TecDoc adapter'ı
# 11. OAuth2 / JWT / RBAC
# 12. Secret manager
# 13. Rate limiting
# 14. Idempotency
# 15. Distributed locking
# 16. Dead-letter queue
# 17. Monitoring / Prometheus / Grafana
# 18. Sentry veya eşdeğer hata izleme
# 19. İnsan onay paneli
# 20. AI kararlarının açıklanabilirlik kaydı
# 21. GDPR veri politikaları
# 22. KVKK/GDPR benzeri veri erişim kontrolleri
# 23. Backup ve disaster recovery
#
# HEDEF MİMARİ:
#
#                ┌─────────────────────┐
#                │ Buzzard Yönetimi    │
#                │ Süleyman Bey        │
#                └──────────┬──────────┘
#                           │
#                           ▼
#                ┌─────────────────────┐
#                │ Görev Orkestratörü  │
#                │  - görev dağıtımı   │
#                │  - öncelik          │
#                │  - yetki            │
#                │  - onay             │
#                │  - audit            │
#                └──────────┬──────────┘
#                           │
#        ┌──────────────────┼──────────────────┐
#        ▼                  ▼                  ▼
#   Nesrin             Uzman AI'lar       Güvenlik AI
#                         │
#       ┌─────────────────┼──────────────────────┐
#       ▼                 ▼                      ▼
#   Tedarik AI        Ürün AI                Fiyat AI
#   Sipariş AI        Gümrük AI              Kategori AI'ları
#
# Bu dosya başlangıç omurgasıdır. Gerçek dış servis çağrıları
# adapter katmanına bağlanmalıdır.
