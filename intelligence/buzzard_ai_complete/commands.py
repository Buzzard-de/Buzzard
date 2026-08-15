import json
import subprocess
import sys
from pathlib import Path

PACK_DIR = Path(__file__).resolve().parent


def bootstrap():
    from buzzard_ai_complete.core.registry import AgentRegistry
    from buzzard_ai_complete.database.db import init_db

    init_db()
    registry = AgentRegistry()
    registry.register("dogu_bey", "Uzman İstihbarat ve Araştırma AI")
    registry.register("aslan_bey", "Müsteşar / AI Operasyon ve İstihbarat Koordinatörü")
    registry.register("esat_bey", "AI Siber Güvenlik ve Savunma Uzmanı")


def complete_init():
    bootstrap()
    return "Buzzard AI COMPLETE vNext initialized."


def complete_agents():
    bootstrap()
    from buzzard_ai_complete.core.registry import AgentRegistry

    lines = []
    for agent in AgentRegistry().all():
        lines.append(f"{agent['name']} | {agent['role']} | {agent['status']}")
    return "\n".join(lines) if lines else "No agents registered."


def complete_task(title, description, priority="NORMAL"):
    bootstrap()
    from buzzard_ai_complete.agents.aslan_bey import AslanBey

    task_id = AslanBey().create_research_task(title, description, priority)
    return f"Task created: {task_id}"


def complete_dispatch(task_id, url):
    bootstrap()
    from buzzard_ai_complete.agents.aslan_bey import AslanBey

    result = AslanBey().dispatch(task_id, url)
    return json.dumps(result, ensure_ascii=False, indent=2, default=str)


def complete_tasks():
    bootstrap()
    from buzzard_ai_complete.tasks.manager import TaskManager

    return json.dumps(TaskManager().list(), ensure_ascii=False, indent=2, default=str)


def complete_dashboard():
    bootstrap()
    from buzzard_ai_complete.agents.aslan_bey import AslanBey

    return json.dumps(AslanBey().dashboard(), ensure_ascii=False, indent=2, default=str)


def complete_report():
    bootstrap()
    from buzzard_ai_complete.reports.builder import ReportBuilder

    return ReportBuilder().build_executive()


def complete_health():
    bootstrap()
    from buzzard_ai_complete.monitoring.health import health

    return json.dumps(health(), ensure_ascii=False, indent=2)


def complete_ai_status():
    bootstrap()
    from buzzard_ai_complete.ai.provider import AIProvider

    return json.dumps(AIProvider().status(), ensure_ascii=False, indent=2)


def complete_scan(text):
    bootstrap()
    from buzzard_ai_complete.agents.esat_bey import EsatBey

    return json.dumps(EsatBey().scan_text(text), ensure_ascii=False, indent=2)


def complete_policy(action):
    from buzzard_ai_complete.core.policies import BuzzardPolicy

    decision = BuzzardPolicy().decide(action)
    return json.dumps(
        {"action": action, "allowed": decision.allowed, "reason": decision.reason},
        ensure_ascii=False,
        indent=2,
    )


def complete_metrics():
    from buzzard_ai_complete.monitoring.metrics import metrics

    return json.dumps(metrics.snapshot(), ensure_ascii=False, indent=2)


def complete_orchestrate(task_id, objective, priority="NORMAL"):
    bootstrap()
    from buzzard_ai_complete.core.orchestrator import BuzzardOrchestrator

    result = BuzzardOrchestrator().run(task_id, objective, priority)
    payload = {
        "task_id": result["task"].task_id,
        "status": result["task"].status,
        "subtasks": result["task"].subtasks,
        "research": result.get("research"),
        "task_record": result.get("task_record"),
    }
    return json.dumps(payload, ensure_ascii=False, indent=2, default=str)


def _read_doc(name):
    path = PACK_DIR / "docs" / name
    if path.exists():
        return path.read_text(encoding="utf-8")
    return f"Dokument nicht gefunden: {name}"


def complete_tree():
    return _read_doc("COMPLETE_ARCHITECTURE_TREE.md")


def complete_inventory():
    return _read_doc("PROJECT_INVENTORY.md")


def complete_verify():
    result = subprocess.run(
        [sys.executable, str(PACK_DIR / "scripts" / "verify_project.py")],
        cwd=str(PACK_DIR.parent),
        capture_output=True,
        text=True,
    )
    output = (result.stdout or "") + (result.stderr or "")
    if result.returncode != 0:
        raise RuntimeError(output.strip() or f"verify_project exited with {result.returncode}")
    return output.strip()


def complete_maintain(cancel_tests=False, process_limit=0):
    from buzzard_ai_complete.runtime.maintenance import maintain_cycle

    bootstrap()
    result = maintain_cycle(cancel_tests=cancel_tests, process_limit=process_limit)
    return json.dumps(result, ensure_ascii=False, indent=2, default=str)


def complete_scheduler(interval=300, process_limit=1):
    from buzzard_ai_complete.runtime.maintenance import run_scheduler_loop

    bootstrap()
    run_scheduler_loop(interval_seconds=interval, process_limit=process_limit)
    return "Scheduler stopped."


def complete_commerce_demo():
    bootstrap()
    from buzzard_ai_complete.commerce.service import CommerceService

    svc = CommerceService()
    svc.products.upsert(
        "SKU-DEMO",
        "Buzzard Demo Product",
        "Tools",
        purchase_price=50,
        shipping_cost=5,
        marketplace_fee=5,
        payment_fee=2,
        tax_rate=0.0,
        ad_cost=2,
        target_margin=0.07,
    )
    svc.competitors.record_price("SKU-DEMO", "Competitor A", "https://example.com/a", 80)
    result = svc.evaluate_product("SKU-DEMO", 79)
    return json.dumps(result, ensure_ascii=False, indent=2, default=str)


def complete_commerce_evaluate(sku, selling_price):
    bootstrap()
    from buzzard_ai_complete.commerce.service import CommerceService

    result = CommerceService().evaluate_product(sku, selling_price)
    return json.dumps(result, ensure_ascii=False, indent=2, default=str)


def complete_commerce_add_product(
    sku,
    name,
    category,
    purchase_price,
    shipping_cost=0,
    marketplace_fee=0,
    payment_fee=0,
    tax_rate=0,
    ad_cost=0,
    target_margin=0.07,
):
    bootstrap()
    from buzzard_ai_complete.commerce.service import CommerceService

    pid = CommerceService().products.upsert(
        sku,
        name,
        category,
        purchase_price=float(purchase_price),
        shipping_cost=float(shipping_cost),
        marketplace_fee=float(marketplace_fee),
        payment_fee=float(payment_fee),
        tax_rate=float(tax_rate),
        ad_cost=float(ad_cost),
        target_margin=float(target_margin),
    )
    return json.dumps({"id": pid, "sku": sku}, ensure_ascii=False, indent=2)


def complete_commerce_scope():
    return _read_doc("commerce/COMPLETE_COMMERCE_SCOPE.md")


def complete_commerce_tree():
    commerce_dir = PACK_DIR / "commerce"
    lines = ["# Buzzard Commerce — Extension Tree", ""]
    for path in sorted(commerce_dir.rglob("*")):
        if path.is_dir() and path.name != "__pycache__":
            rel = path.relative_to(commerce_dir)
            depth = len(rel.parts)
            indent = "  " * (depth - 1)
            marker = ""
            if (path / "README.md").exists():
                marker = "  # " + (path / "README.md").read_text(encoding="utf-8").splitlines()[0].lstrip("# ")
            lines.append(f"{indent}{rel.name}/{marker}")
    return "\n".join(lines)


def complete_commerce_inventory():
    commerce_dir = PACK_DIR / "commerce"
    modules = sorted(
        p.relative_to(commerce_dir).as_posix()
        for p in commerce_dir.rglob("*")
        if p.is_dir() and p.name != "__pycache__" and any(p.iterdir())
    )
    services = sorted(str(p.relative_to(commerce_dir)) for p in commerce_dir.rglob("service.py"))
    engines = sorted(str(p.relative_to(commerce_dir)) for p in commerce_dir.rglob("engine.py"))
    payload = {
        "commerce_modules": len(modules),
        "service_modules": services,
        "engine_modules": engines,
        "extension_directories": modules,
    }
    return json.dumps(payload, ensure_ascii=False, indent=2)


def complete_commerce_production_work():
    return _read_doc("REMAINING_PRODUCTION_WORK.md")


def complete_commerce_integration_order():
    return _read_doc("INTEGRATION_ORDER.md")


def _logistics_decision_payload(decision):
    def quote(q):
        if q is None:
            return None
        return {
            "carrier": q.carrier,
            "service": q.service,
            "price": q.price,
            "currency": q.currency,
            "delivery_days": q.delivery_days,
            "available": q.available,
            "reason": q.reason,
        }

    return {
        "selected": quote(decision.selected),
        "alternatives": [quote(q) for q in decision.alternatives],
        "reason": decision.reason,
    }


def complete_logistics_demo():
    from buzzard_ai_complete.logistics.service import SmartShippingService

    svc = SmartShippingService()
    payload = {}
    for priority in ("cheapest", "balanced", "fastest"):
        decision = svc.recommend(2, 30, 20, 15, "DE", "35075", priority)
        payload[priority] = _logistics_decision_payload(decision)
    return json.dumps(payload, ensure_ascii=False, indent=2)


def complete_logistics_recommend(
    weight_kg,
    length_cm,
    width_cm,
    height_cm,
    country,
    postal_code,
    priority="balanced",
):
    from buzzard_ai_complete.logistics.rules import validate_parcel
    from buzzard_ai_complete.logistics.models import Parcel
    from buzzard_ai_complete.logistics.service import SmartShippingService

    parcel = Parcel(float(weight_kg), float(length_cm), float(width_cm), float(height_cm))
    errors = validate_parcel(parcel)
    if errors:
        return json.dumps({"errors": errors}, ensure_ascii=False, indent=2)
    decision = SmartShippingService().recommend(
        weight_kg, length_cm, width_cm, height_cm, country, postal_code, priority
    )
    return json.dumps(_logistics_decision_payload(decision), ensure_ascii=False, indent=2)


def complete_logistics_docs():
    return _read_doc("LOGISTICS_ENGINE_V1.md")


def _fulfillment_result_payload(result):
    return {
        "order_id": result.order_id,
        "status": result.status,
        "supplier": result.supplier,
        "carrier": result.carrier,
        "tracking_number": result.tracking_number,
        "errors": result.errors,
    }


def complete_order_demo():
    from buzzard_ai_complete.order_engine.service import OrderFulfillmentService

    svc = OrderFulfillmentService()
    scenarios = [
        ("fulfillment", "O-DEMO-1", 2),
        ("backorder", "O-DEMO-2", 20),
    ]
    payload = {}
    for name, order_id, qty in scenarios:
        result = svc.process_order(order_id, "C-DEMO", "DE", "35075", "SKU-DEMO", qty, 10.0)
        payload[name] = _fulfillment_result_payload(result)
    return json.dumps(payload, ensure_ascii=False, indent=2)


def complete_order_process(order_id, customer_id, country, postal_code, sku, quantity, unit_price):
    from buzzard_ai_complete.order_engine.service import OrderFulfillmentService

    result = OrderFulfillmentService().process_order(
        order_id, customer_id, country, postal_code, sku, quantity, unit_price
    )
    return json.dumps(_fulfillment_result_payload(result), ensure_ascii=False, indent=2)


def complete_order_docs():
    return _read_doc("ORDER_FULFILLMENT_ENGINE_V1.md")


def complete_billing_demo():
    from buzzard_ai_complete.customer_billing.service import CustomerBillingService

    return json.dumps(CustomerBillingService().demo_flow(), ensure_ascii=False, indent=2)


def complete_billing_refund(order_id, reason, amount):
    from buzzard_ai_complete.customer_billing.service import CustomerBillingService

    result = CustomerBillingService().refund(order_id, reason, amount)
    return json.dumps(result, ensure_ascii=False, indent=2)


def complete_billing_docs():
    return _read_doc("CUSTOMER_BILLING_RETURNS_ENGINE_V1.md")


def complete_crm_demo():
    from buzzard_ai_complete.crm.service import CustomerExperienceService

    return json.dumps(CustomerExperienceService().demo_flow(), ensure_ascii=False, indent=2)


def complete_crm_segment(lifetime_value, order_count, support_tickets=0):
    from buzzard_ai_complete.crm.service import CustomerExperienceService

    result = CustomerExperienceService().segment(lifetime_value, order_count, support_tickets)
    return json.dumps(result, ensure_ascii=False, indent=2)


def complete_crm_docs():
    return _read_doc("CRM_CUSTOMER_EXPERIENCE_ENGINE_V1.md")


def complete_marketing_demo():
    from buzzard_ai_complete.marketing.service import MarketingAdvertisingService

    return json.dumps(MarketingAdvertisingService().demo_flow(), ensure_ascii=False, indent=2)


def complete_marketing_budget(total, channels, weights=None):
    from buzzard_ai_complete.marketing.service import MarketingAdvertisingService

    result = MarketingAdvertisingService().allocate_budget(total, channels, weights)
    return json.dumps(result, ensure_ascii=False, indent=2)


def complete_marketing_docs():
    return _read_doc("MARKETING_ADVERTISING_ENGINE_V1.md")


def complete_max_demo():
    from buzzard_ai_complete.vmax.service import MaxPlatformService

    return json.dumps(MaxPlatformService().demo_flow(), ensure_ascii=False, indent=2)


def complete_max_snapshot():
    from buzzard_ai_complete.vmax.service import MaxPlatformService

    return json.dumps(MaxPlatformService().snapshot(), ensure_ascii=False, indent=2)


def complete_max_docs():
    return _read_doc("MAXIMAL_UPGRADE_REPORT.md")


def complete_one_piece_demo():
    from buzzard_ai_complete.control_center.service import OnePieceControlService

    return json.dumps(OnePieceControlService().demo_flow(), ensure_ascii=False, indent=2)


def complete_one_piece_e2e(order_id):
    from buzzard_ai_complete.control_center.service import OnePieceControlService

    return json.dumps(OnePieceControlService().e2e_plan(order_id), ensure_ascii=False, indent=2)


def complete_one_piece_docs():
    return _read_doc("ONE_PIECE_MAXIMAL_ARCHITECTURE.md")


def complete_analytics_demo():
    from buzzard_ai_complete.analytics_bi.service import AnalyticsBIService

    return json.dumps(AnalyticsBIService().demo_flow(), ensure_ascii=False, indent=2)


def complete_analytics_docs():
    return _read_doc("ANALYTICS_BI_MAXIMAL.md")


def complete_production_demo():
    from buzzard_ai_complete.production.service import ProductionMaxService

    return json.dumps(ProductionMaxService().demo_flow(), ensure_ascii=False, indent=2)


def complete_production_readiness():
    from buzzard_ai_complete.production.service import ProductionMaxService

    return json.dumps(ProductionMaxService().readiness(), ensure_ascii=False, indent=2)


def complete_production_docs():
    return _read_doc("PRODUCTION_MAX_UPGRADE.md")


def complete_shop_bridge_demo():
    from buzzard_ai_complete.shop_bridge.service import ShopBridgeService

    return json.dumps(ShopBridgeService().demo_flow(), ensure_ascii=False, indent=2)


def complete_shop_bridge_readiness():
    from buzzard_ai_complete.shop_bridge.service import ShopBridgeService

    return json.dumps(ShopBridgeService().readiness(), ensure_ascii=False, indent=2)


def complete_shop_bridge_docs():
    return _read_doc("SHOP_INTELLIGENCE_COMMERCE_BRIDGE_MAXIMAL.md")


def run_tests():
    result = subprocess.run(
        [sys.executable, "-m", "pytest", str(PACK_DIR / "tests"), "-q"],
        cwd=str(PACK_DIR.parent),
    )
    return result.returncode
