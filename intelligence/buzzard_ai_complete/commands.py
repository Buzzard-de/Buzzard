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


def complete_taxonomy_demo():
    from buzzard_ai_complete.master_taxonomy.service import MasterTaxonomyService

    return json.dumps(MasterTaxonomyService().demo_flow(), ensure_ascii=False, indent=2)


def complete_taxonomy_search(term):
    from buzzard_ai_complete.master_taxonomy.service import MasterTaxonomyService

    results = MasterTaxonomyService().search(term)
    return json.dumps(results[:25], ensure_ascii=False, indent=2)


def complete_taxonomy_path(node_id):
    from buzzard_ai_complete.master_taxonomy.service import MasterTaxonomyService

    return json.dumps(
        MasterTaxonomyService().path(node_id), ensure_ascii=False, indent=2
    )


def complete_taxonomy_snapshot():
    from buzzard_ai_complete.master_taxonomy.service import MasterTaxonomyService

    return json.dumps(MasterTaxonomyService().snapshot(), ensure_ascii=False, indent=2)


def complete_taxonomy_docs():
    return _read_doc("MASTER_TAXONOMY.md")


def complete_taxonomy_unify_status():
    from buzzard_ai_complete.master_taxonomy.unification import TaxonomyUnificationService

    return json.dumps(TaxonomyUnificationService().status(), ensure_ascii=False, indent=2)


def complete_taxonomy_unify_resolve(legacy_id, system="shop"):
    from buzzard_ai_complete.master_taxonomy.unification import TaxonomyUnificationService

    return json.dumps(
        TaxonomyUnificationService().resolve(legacy_id, system),
        ensure_ascii=False,
        indent=2,
        default=str,
    )


def complete_taxonomy_unify_docs():
    return _read_doc("TAXONOMY_UNIFICATION_MAXIMAL.md")


def complete_pim_demo():
    from buzzard_ai_complete.pim_product_master.service import PimProductMasterService

    return json.dumps(PimProductMasterService().demo_flow(), ensure_ascii=False, indent=2)


def complete_pim_health():
    from buzzard_ai_complete.pim_product_master.service import PimProductMasterService

    return json.dumps(PimProductMasterService().health(), ensure_ascii=False, indent=2)


def complete_pim_schema():
    from buzzard_ai_complete.pim_product_master.service import PimProductMasterService

    service = PimProductMasterService()
    return json.dumps(
        {
            "product_master": service.schema(),
            "supplier_import": service.supplier_import_schema(),
        },
        ensure_ascii=False,
        indent=2,
    )


def complete_pim_docs():
    return _read_doc("PIM_PRODUCT_MASTER_MAXIMAL.md")


def complete_multilingual_health():
    from buzzard_ai_complete.multilingual_product_intelligence.service import (
        MultilingualProductIntelligenceService,
    )

    return json.dumps(
        MultilingualProductIntelligenceService().health(),
        ensure_ascii=False,
        indent=2,
    )


def complete_multilingual_languages():
    from buzzard_ai_complete.multilingual_product_intelligence.service import (
        MultilingualProductIntelligenceService,
    )

    return json.dumps(
        MultilingualProductIntelligenceService().languages(),
        ensure_ascii=False,
        indent=2,
    )


def complete_multilingual_normalize(text, language=None):
    from buzzard_ai_complete.multilingual_product_intelligence.service import (
        MultilingualProductIntelligenceService,
    )

    return json.dumps(
        MultilingualProductIntelligenceService().normalize(text, language),
        ensure_ascii=False,
        indent=2,
    )


def complete_multilingual_demo():
    from buzzard_ai_complete.multilingual_product_intelligence.service import (
        MultilingualProductIntelligenceService,
    )

    return json.dumps(
        MultilingualProductIntelligenceService().demo_flow(),
        ensure_ascii=False,
        indent=2,
    )


def complete_multilingual_docs():
    return _read_doc("MULTILINGUAL_PRODUCT_INTELLIGENCE_MAXIMAL.md")


def complete_import_engine_health():
    from buzzard_ai_complete.supplier_import_enrichment_engine.service import (
        SupplierImportEnrichmentService,
    )

    return json.dumps(
        SupplierImportEnrichmentService().health(),
        ensure_ascii=False,
        indent=2,
    )


def complete_import_engine_demo():
    from buzzard_ai_complete.supplier_import_enrichment_engine.service import (
        SupplierImportEnrichmentService,
    )

    return json.dumps(
        SupplierImportEnrichmentService().demo_flow(),
        ensure_ascii=False,
        indent=2,
    )


def complete_import_engine_schema():
    from buzzard_ai_complete.supplier_import_enrichment_engine.service import (
        SupplierImportEnrichmentService,
    )

    service = SupplierImportEnrichmentService()
    return json.dumps(
        {
            "decision": service.decision_schema(),
            "normalized_record": service.normalized_record_schema(),
        },
        ensure_ascii=False,
        indent=2,
    )


def complete_import_engine_docs():
    return _read_doc("SUPPLIER_IMPORT_ENRICHMENT_ENGINE_MAXIMAL.md")


def complete_phone_health():
    from buzzard_ai_complete.ai_phone_assistant.service import AiPhoneAssistantService

    return json.dumps(
        AiPhoneAssistantService().health(),
        ensure_ascii=False,
        indent=2,
    )


def complete_phone_analyze(text, language=None):
    from buzzard_ai_complete.ai_phone_assistant.service import AiPhoneAssistantService

    return json.dumps(
        AiPhoneAssistantService().analyze(text, language),
        ensure_ascii=False,
        indent=2,
    )


def complete_phone_demo():
    from buzzard_ai_complete.ai_phone_assistant.service import AiPhoneAssistantService

    return json.dumps(
        AiPhoneAssistantService().demo_flow(),
        ensure_ascii=False,
        indent=2,
    )


def complete_phone_schema():
    from buzzard_ai_complete.ai_phone_assistant.service import AiPhoneAssistantService

    service = AiPhoneAssistantService()
    return json.dumps(
        {
            "tools": service.tool_contract(),
            "conversation": service.conversation_state(),
        },
        ensure_ascii=False,
        indent=2,
    )


def complete_phone_docs():
    return _read_doc("AI_PHONE_ASSISTANT_MAXIMAL.md")


def complete_phone_memory_health():
    from buzzard_ai_complete.ai_phone_assistant.memory_facade import PhoneMemoryCrmService

    return json.dumps(
        PhoneMemoryCrmService().health(),
        ensure_ascii=False,
        indent=2,
    )


def complete_phone_memory_demo():
    from buzzard_ai_complete.ai_phone_assistant.memory_facade import PhoneMemoryCrmService

    return json.dumps(
        PhoneMemoryCrmService().demo_flow(),
        ensure_ascii=False,
        indent=2,
    )


def complete_phone_memory_context(customer_id, verification_level="none"):
    from buzzard_ai_complete.ai_phone_assistant.memory_facade import PhoneMemoryCrmService

    return json.dumps(
        PhoneMemoryCrmService().agent_context(customer_id, verification_level),
        ensure_ascii=False,
        indent=2,
    )


def complete_phone_memory_docs():
    return _read_doc("AI_PHONE_ASSISTANT_V2_MEMORY_CRM.md")


def complete_phone_telephony_health():
    from buzzard_ai_complete.ai_phone_assistant.telephony_facade import PhoneTelephonyFacade

    return json.dumps(
        PhoneTelephonyFacade().health(),
        ensure_ascii=False,
        indent=2,
    )


def complete_phone_telephony_demo():
    from buzzard_ai_complete.ai_phone_assistant.telephony_facade import PhoneTelephonyFacade

    return json.dumps(
        PhoneTelephonyFacade().demo_flow(),
        ensure_ascii=False,
        indent=2,
    )


def complete_phone_telephony_schema():
    from buzzard_ai_complete.ai_phone_assistant.telephony_facade import PhoneTelephonyFacade

    service = PhoneTelephonyFacade()
    return json.dumps(
        {
            "call": service.call_schema(),
            "production": service.load_production_config(),
        },
        ensure_ascii=False,
        indent=2,
    )


def complete_phone_telephony_docs():
    return _read_doc("AI_PHONE_ASSISTANT_V3_TELEPHONY.md")


def complete_platform_health():
    from buzzard_ai_complete.complete_commerce_platform.service import (
        CompleteCommercePlatformService,
    )

    return json.dumps(
        CompleteCommercePlatformService().health(),
        ensure_ascii=False,
        indent=2,
    )


def complete_platform_modules():
    from buzzard_ai_complete.complete_commerce_platform.service import (
        CompleteCommercePlatformService,
    )

    return json.dumps(
        CompleteCommercePlatformService().modules(),
        ensure_ascii=False,
        indent=2,
    )


def complete_platform_demo():
    from buzzard_ai_complete.complete_commerce_platform.service import (
        CompleteCommercePlatformService,
    )

    return json.dumps(
        CompleteCommercePlatformService().demo_flow(),
        ensure_ascii=False,
        indent=2,
    )


def complete_platform_schema():
    from buzzard_ai_complete.complete_commerce_platform.service import (
        CompleteCommercePlatformService,
    )

    service = CompleteCommercePlatformService()
    return json.dumps(
        {
            "events": service.events_schema(),
            "order": service.order_schema(),
            "security": service.security_policy(),
            "channels": service.channel_mapping_policy(),
        },
        ensure_ascii=False,
        indent=2,
    )


def complete_platform_docs():
    return _read_doc("COMPLETE_COMMERCE_PLATFORM_MAXIMAL_FINAL.md")


def complete_production_health():
    from buzzard_ai_complete.production_integration_maximal.service import (
        ProductionIntegrationService,
    )

    return json.dumps(
        ProductionIntegrationService().health(),
        ensure_ascii=False,
        indent=2,
    )


def complete_production_readiness():
    from buzzard_ai_complete.production_integration_maximal.service import (
        ProductionIntegrationService,
    )

    return json.dumps(
        ProductionIntegrationService().readiness(),
        ensure_ascii=False,
        indent=2,
    )


def complete_production_demo():
    from buzzard_ai_complete.production_integration_maximal.service import (
        ProductionIntegrationService,
    )

    return json.dumps(
        ProductionIntegrationService().demo_flow(),
        ensure_ascii=False,
        indent=2,
    )


def complete_production_schema():
    from buzzard_ai_complete.production_integration_maximal.service import (
        ProductionIntegrationService,
    )

    service = ProductionIntegrationService()
    return json.dumps(
        {
            "integrations": service.load_production_config(),
            "providers": service.provider_registry(),
            "advanced_engines": service.advanced_engines_config(),
            "advanced_systems": service.advanced_systems_schema(),
        },
        ensure_ascii=False,
        indent=2,
    )


def complete_production_docs():
    return _read_doc("PRODUCTION_INTEGRATION_MAXIMAL_ONE_PACKAGE.md")


def complete_launch_sequence_health():
    from buzzard_ai_complete.launch_sequence_maximal.service import LaunchSequenceService

    return json.dumps(LaunchSequenceService().health(), ensure_ascii=False, indent=2)


def complete_launch_sequence_stages():
    from buzzard_ai_complete.launch_sequence_maximal.service import LaunchSequenceService

    service = LaunchSequenceService()
    return json.dumps(
        {"stages": service.health()["stages"], "state": service.load_launch_state()},
        ensure_ascii=False,
        indent=2,
    )


def complete_launch_sequence_demo():
    from buzzard_ai_complete.launch_sequence_maximal.service import LaunchSequenceService

    return json.dumps(LaunchSequenceService().demo_flow(), ensure_ascii=False, indent=2)


def complete_launch_sequence_schema():
    from buzzard_ai_complete.launch_sequence_maximal.service import LaunchSequenceService

    service = LaunchSequenceService()
    return json.dumps(
        {
            "pim_import": service.pim_schema(),
            "launch_state": service.load_launch_state(),
            "payment": service.load_payment_config(),
            "shipping": service.load_shipping_config(),
            "marketplaces": service.load_marketplace_config(),
            "telephony": service.load_telephony_config(),
            "suppliers": service.load_suppliers_config(),
        },
        ensure_ascii=False,
        indent=2,
    )


def complete_launch_sequence_docs():
    return _read_doc("LAUNCH_SEQUENCE_MAXIMAL_ONE_PACKAGE.md")


def complete_ai_council_18_health():
    from buzzard_ai_complete.ai_council_18_unified.service import AiCouncil18Service

    return json.dumps(AiCouncil18Service().health(), ensure_ascii=False, indent=2)


def complete_ai_council_18_agents():
    from buzzard_ai_complete.ai_council_18_unified.service import AiCouncil18Service

    service = AiCouncil18Service()
    return json.dumps(
        {"agents": service.list_agents(), "count": len(service.list_agents())},
        ensure_ascii=False,
        indent=2,
    )


def complete_ai_council_18_demo():
    from buzzard_ai_complete.ai_council_18_unified.service import AiCouncil18Service

    return json.dumps(AiCouncil18Service().demo_flow(), ensure_ascii=False, indent=2)


def complete_ai_council_18_schema():
    from buzzard_ai_complete.ai_council_18_unified.service import AiCouncil18Service

    service = AiCouncil18Service()
    return json.dumps(
        {"finding": service.load_schema(), "config": service.load_config()},
        ensure_ascii=False,
        indent=2,
    )


def complete_ai_council_18_docs():
    return _read_doc("AI_COUNCIL_18_UNIFIED_MAXIMAL.md")


def complete_ai_council_19_health():
    from buzzard_ai_complete.ai_council_19_customs_bureaucracy.service import AiCouncil19Service

    return json.dumps(AiCouncil19Service().health(), ensure_ascii=False, indent=2)


def complete_ai_council_19_agents():
    from buzzard_ai_complete.ai_council_19_customs_bureaucracy.service import AiCouncil19Service

    service = AiCouncil19Service()
    return json.dumps(
        {"agents": service.list_agents(), "count": len(service.list_agents())},
        ensure_ascii=False,
        indent=2,
    )


def complete_ai_council_19_assess():
    from buzzard_ai_complete.ai_council_19_customs_bureaucracy.service import AiCouncil19Service

    return json.dumps(AiCouncil19Service().assess_trade(), ensure_ascii=False, indent=2)


def complete_ai_council_19_demo():
    from buzzard_ai_complete.ai_council_19_customs_bureaucracy.service import AiCouncil19Service

    return json.dumps(AiCouncil19Service().demo_flow(), ensure_ascii=False, indent=2)


def complete_ai_council_19_schema():
    from buzzard_ai_complete.ai_council_19_customs_bureaucracy.service import AiCouncil19Service

    service = AiCouncil19Service()
    return json.dumps(
        {"assessment": service.load_schema(), "config": service.load_config()},
        ensure_ascii=False,
        indent=2,
    )


def complete_ai_council_19_docs():
    return _read_doc("AI_COUNCIL_19_CUSTOMS_BUREAUCRACY_MAXIMAL.md")


def complete_category_intelligence_43_health():
    from buzzard_ai_complete.category_intelligence_43_maximal.service import CategoryIntelligence43Service

    return json.dumps(CategoryIntelligence43Service().health(), ensure_ascii=False, indent=2)


def complete_category_intelligence_43_agents():
    from buzzard_ai_complete.category_intelligence_43_maximal.service import CategoryIntelligence43Service

    service = CategoryIntelligence43Service()
    return json.dumps(
        {"agents": service.list_agents(), "count": len(service.list_agents())},
        ensure_ascii=False,
        indent=2,
    )


def complete_category_intelligence_43_demo():
    from buzzard_ai_complete.category_intelligence_43_maximal.service import CategoryIntelligence43Service

    return json.dumps(CategoryIntelligence43Service().demo_flow(), ensure_ascii=False, indent=2)


def complete_category_intelligence_43_schema():
    from buzzard_ai_complete.category_intelligence_43_maximal.service import CategoryIntelligence43Service

    service = CategoryIntelligence43Service()
    return json.dumps(
        {"report": service.load_schema(), "config": service.load_config()},
        ensure_ascii=False,
        indent=2,
    )


def complete_category_intelligence_43_docs():
    return _read_doc("43_CATEGORY_INTELLIGENCE_MAXIMAL.md")


def complete_category_intelligence_47_health():
    from buzzard_ai_complete.category_intelligence_47_maximal.service import CategoryIntelligence47Service

    return json.dumps(CategoryIntelligence47Service().health(), ensure_ascii=False, indent=2)


def complete_category_intelligence_47_summary():
    from buzzard_ai_complete.category_intelligence_47_maximal.service import CategoryIntelligence47Service

    service = CategoryIntelligence47Service()
    return json.dumps(
        {
            "health": service.health(),
            "summary": service.summary(),
            "intelligence_os": service.intelligence_os_summary(),
        },
        ensure_ascii=False,
        indent=2,
    )


def complete_category_intelligence_47_demo():
    from buzzard_ai_complete.category_intelligence_47_maximal.service import CategoryIntelligence47Service

    return json.dumps(CategoryIntelligence47Service().demo_flow(), ensure_ascii=False, indent=2)


def complete_category_intelligence_47_docs():
    return _read_doc("47_CATEGORY_INTELLIGENCE_OS.md")


def complete_sync_category_intelligence_47():
    from pathlib import Path
    import subprocess
    import sys

    script = (
        Path(__file__).resolve().parents[1]
        / "scripts"
        / "sync_category_intelligence_47.py"
    )
    result = subprocess.run([sys.executable, str(script)], capture_output=True, text=True, check=True)
    return result.stdout.strip()


def complete_category_intelligence_47_final_100_single_file():
    from buzzard_ai_complete.category_intelligence_47_maximal.service import CategoryIntelligence47Service

    return json.dumps(CategoryIntelligence47Service().final_100_single_file_summary(), ensure_ascii=False, indent=2)


def complete_build_category_intelligence_47_final_100():
    from pathlib import Path
    import subprocess
    import sys

    script = (
        Path(__file__).resolve().parents[1]
        / "scripts"
        / "build_category_intelligence_47_final_100.py"
    )
    result = subprocess.run([sys.executable, str(script)], capture_output=True, text=True, check=True)
    return result.stdout.strip()


def complete_category_intelligence_47_max_final_single_file():
    from buzzard_ai_complete.category_intelligence_47_maximal.service import CategoryIntelligence47Service

    return json.dumps(CategoryIntelligence47Service().max_final_single_file_summary(), ensure_ascii=False, indent=2)


def complete_build_category_intelligence_47_max_final():
    from pathlib import Path
    import subprocess
    import sys

    script = (
        Path(__file__).resolve().parents[1]
        / "scripts"
        / "build_category_intelligence_47_max_final.py"
    )
    result = subprocess.run([sys.executable, str(script)], capture_output=True, text=True, check=True)
    return result.stdout.strip()


def complete_category_intelligence_47_max_single_final_single_file():
    from buzzard_ai_complete.category_intelligence_47_maximal.service import CategoryIntelligence47Service

    return json.dumps(
        CategoryIntelligence47Service().max_single_final_single_file_summary(),
        ensure_ascii=False,
        indent=2,
    )


def complete_build_category_intelligence_47_max_single_final():
    from pathlib import Path
    import subprocess
    import sys

    script = (
        Path(__file__).resolve().parents[1]
        / "scripts"
        / "build_category_intelligence_47_max_single_final.py"
    )
    result = subprocess.run([sys.executable, str(script)], capture_output=True, text=True, check=True)
    return result.stdout.strip()


def complete_category_intelligence_47_final_max_single_file():
    from buzzard_ai_complete.category_intelligence_47_maximal.service import CategoryIntelligence47Service

    return json.dumps(
        CategoryIntelligence47Service().final_max_single_file_summary(),
        ensure_ascii=False,
        indent=2,
    )


def complete_build_category_intelligence_47_final_max():
    from pathlib import Path
    import subprocess
    import sys

    script = (
        Path(__file__).resolve().parents[1]
        / "scripts"
        / "build_category_intelligence_47_final_max.py"
    )
    result = subprocess.run([sys.executable, str(script)], capture_output=True, text=True, check=True)
    return result.stdout.strip()


def complete_sync_turkish_48_main_categories():
    return complete_sync_german_48_main_categories()


def complete_sync_german_48_main_categories():
    from pathlib import Path
    import subprocess
    import sys

    script = Path(__file__).resolve().parents[1] / "scripts" / "sync_german_48_main_categories.py"
    result = subprocess.run([sys.executable, str(script)], capture_output=True, text=True, check=True)
    return result.stdout.strip()


def complete_category_intelligence_47_final_manifest():
    from buzzard_ai_complete.category_intelligence_47_maximal.service import CategoryIntelligence47Service

    return json.dumps(
        CategoryIntelligence47Service().load_final_manifest(),
        ensure_ascii=False,
        indent=2,
    )


def complete_category_intelligence_47_final_manifest_summary():
    from buzzard_ai_complete.category_intelligence_47_maximal.service import CategoryIntelligence47Service

    return json.dumps(
        CategoryIntelligence47Service().final_manifest_summary(),
        ensure_ascii=False,
        indent=2,
    )


def complete_de_ecom_intel_scan():
    from buzzard_ai_complete.operations.de_ecom_intel_scan import run_de_ecom_intel_scan

    return json.dumps(run_de_ecom_intel_scan(), ensure_ascii=False, indent=2, default=str)


def complete_de_ecom_intel_export():
    from buzzard_ai_complete.operations.de_ecom_intel_scan import export_de_ecom_intel_scan

    return json.dumps(
        export_de_ecom_intel_scan(run_scan=False, create_zip=True),
        ensure_ascii=False,
        indent=2,
        default=str,
    )


def complete_all_connectors_health():
    from live_connectors.registry import connector_health

    return json.dumps(connector_health(), ensure_ascii=False, indent=2)


def complete_sync_category_intelligence_43():
    from pathlib import Path
    import subprocess
    import sys

    script = (
        Path(__file__).resolve().parents[1]
        / "scripts"
        / "sync_category_intelligence_43.py"
    )
    result = subprocess.run([sys.executable, str(script)], capture_output=True, text=True, check=True)
    return result.stdout.strip()


def complete_social_intelligence_health():
    from buzzard_ai_complete.social_intelligence_ai_maximal.service import SocialIntelligenceService

    return json.dumps(SocialIntelligenceService().health(), ensure_ascii=False, indent=2)


def complete_social_intelligence_platforms():
    from buzzard_ai_complete.social_intelligence_ai_maximal.service import SocialIntelligenceService

    service = SocialIntelligenceService()
    platforms = service.list_platforms()
    return json.dumps(
        {"platforms": platforms, "count": len(platforms)},
        ensure_ascii=False,
        indent=2,
    )


def complete_social_intelligence_demo():
    from buzzard_ai_complete.social_intelligence_ai_maximal.service import SocialIntelligenceService

    return json.dumps(SocialIntelligenceService().demo_flow(), ensure_ascii=False, indent=2)


def complete_social_intelligence_schema():
    from buzzard_ai_complete.social_intelligence_ai_maximal.service import SocialIntelligenceService

    service = SocialIntelligenceService()
    return json.dumps(
        {"signal": service.load_schema(), "config": service.load_config()},
        ensure_ascii=False,
        indent=2,
    )


def complete_social_intelligence_docs():
    return _read_doc("SOCIAL_INTELLIGENCE_AI_MAXIMAL.md")


def complete_automotive_taxonomy_health():
    from buzzard_ai_complete.automotive_taxonomy_maximal.service import AutomotiveTaxonomyService

    return json.dumps(AutomotiveTaxonomyService().health(), ensure_ascii=False, indent=2)


def complete_automotive_taxonomy_seed():
    from buzzard_ai_complete.automotive_taxonomy_maximal.service import AutomotiveTaxonomyService

    service = AutomotiveTaxonomyService()
    seed = service.master_seed()
    return json.dumps({"systems": seed, "count": len(seed)}, ensure_ascii=False, indent=2)


def complete_automotive_taxonomy_demo():
    from buzzard_ai_complete.automotive_taxonomy_maximal.service import AutomotiveTaxonomyService

    return json.dumps(AutomotiveTaxonomyService().demo_flow(), ensure_ascii=False, indent=2)


def complete_automotive_taxonomy_schema():
    from buzzard_ai_complete.automotive_taxonomy_maximal.service import AutomotiveTaxonomyService

    service = AutomotiveTaxonomyService()
    return json.dumps(
        {"taxonomy": service.load_schema(), "config": service.load_config()},
        ensure_ascii=False,
        indent=2,
    )


def complete_automotive_taxonomy_docs():
    return _read_doc("AUTOMOTIVE_TAXONOMY_MAXIMAL.md")


def complete_automotive_taxonomy_tires_categories():
    from buzzard_ai_complete.automotive_taxonomy_maximal.service import AutomotiveTaxonomyService

    service = AutomotiveTaxonomyService()
    categories = service.tires_categories()
    return json.dumps({"categories": categories, "count": len(categories)}, ensure_ascii=False, indent=2)


def complete_automotive_taxonomy_tires_demo():
    from buzzard_ai_complete.automotive_taxonomy_maximal.service import AutomotiveTaxonomyService

    return json.dumps(AutomotiveTaxonomyService().tires_demo(), ensure_ascii=False, indent=2)


def complete_automotive_taxonomy_tires_schema():
    from buzzard_ai_complete.automotive_taxonomy_maximal.service import AutomotiveTaxonomyService

    return json.dumps(AutomotiveTaxonomyService().load_tires_config(), ensure_ascii=False, indent=2)


def complete_automotive_taxonomy_tires_docs():
    return _read_doc("AUTOMOTIVE_TAXONOMY_TIRES_MAXIMAL.md")


def complete_automotive_taxonomy_kfz_tree():
    from buzzard_ai_complete.automotive_taxonomy_maximal.service import AutomotiveTaxonomyService

    service = AutomotiveTaxonomyService()
    return json.dumps(
        {"summary": service.kfz_summary(), "mains": service.kfz_mains()},
        ensure_ascii=False,
        indent=2,
        default=str,
    )


def complete_automotive_taxonomy_kfz_intelligence_os():
    from buzzard_ai_complete.automotive_taxonomy_maximal.service import AutomotiveTaxonomyService

    service = AutomotiveTaxonomyService()
    return json.dumps(
        {
            "summary": service.kfz_intelligence_summary(),
            "competitors": service.kfz_competitors(),
        },
        ensure_ascii=False,
        indent=2,
        default=str,
    )


def complete_intelligence_os_all_in_one():
    from buzzard_ai_complete.automotive_taxonomy_maximal.service import AutomotiveTaxonomyService

    service = AutomotiveTaxonomyService()
    return json.dumps(
        {
            "summary": service.intelligence_os_all_in_one_summary(),
            "modules": service.load_intelligence_os_all_in_one().get("modules", []),
            "competitors": service.load_intelligence_os_all_in_one().get("competitors", []),
            "demo_findings": service.load_intelligence_os_all_in_one().get("demo_findings", []),
            "scoring_weights": service.load_intelligence_os_all_in_one().get("scoring_weights", {}),
            "governance": service.load_intelligence_os_all_in_one().get("governance", {}),
        },
        ensure_ascii=False,
        indent=2,
        default=str,
    )


def complete_intelligence_os_maximum_manifest():
    from buzzard_ai_complete.automotive_taxonomy_maximal.service import AutomotiveTaxonomyService

    service = AutomotiveTaxonomyService()
    manifest = service.load_intelligence_os_maximum_manifest()
    return json.dumps(
        {
            "summary": service.intelligence_os_maximum_manifest_summary(),
            "agents": manifest.get("agents", []),
            "services": manifest.get("services", []),
            "schemas": manifest.get("schemas", {}),
            "runtime_defaults": manifest.get("runtime_defaults", {}),
        },
        ensure_ascii=False,
        indent=2,
        default=str,
    )


def complete_intelligence_os_maximum_single_file():
    from buzzard_ai_complete.automotive_taxonomy_maximal.service import AutomotiveTaxonomyService

    service = AutomotiveTaxonomyService()
    return json.dumps(
        service.intelligence_os_maximum_single_file_summary(),
        ensure_ascii=False,
        indent=2,
        default=str,
    )


def complete_master_business_os_maximum_manifest():
    from buzzard_ai_complete.automotive_taxonomy_maximal.service import AutomotiveTaxonomyService

    service = AutomotiveTaxonomyService()
    manifest = service.load_master_business_os_maximum_manifest()
    return json.dumps(
        {
            "summary": service.master_business_os_maximum_manifest_summary(),
            "enterprise_modules": manifest.get("enterprise_modules", []),
            "business_categories": manifest.get("business_categories", []),
            "company_layers": manifest.get("company_layers", []),
            "integration_targets": manifest.get("integration_targets", []),
            "agents": manifest.get("agents", []),
            "services": manifest.get("services", []),
        },
        ensure_ascii=False,
        indent=2,
        default=str,
    )


def complete_master_business_os_maximum_single_file():
    from buzzard_ai_complete.automotive_taxonomy_maximal.service import AutomotiveTaxonomyService

    service = AutomotiveTaxonomyService()
    return json.dumps(
        service.master_business_os_maximum_single_file_summary(),
        ensure_ascii=False,
        indent=2,
        default=str,
    )


def complete_master_business_os_final_100_single_file():
    from buzzard_ai_complete.automotive_taxonomy_maximal.service import AutomotiveTaxonomyService

    service = AutomotiveTaxonomyService()
    return json.dumps(
        service.master_business_os_final_100_single_file_summary(),
        ensure_ascii=False,
        indent=2,
        default=str,
    )


def complete_sync_kfz_category_tree():
    from pathlib import Path
    import subprocess
    import sys

    script = Path(__file__).resolve().parents[1] / "scripts" / "sync_kfz_category_tree.py"
    result = subprocess.run([sys.executable, str(script)], capture_output=True, text=True, check=True)
    return result.stdout.strip()


def complete_intelligence_pipeline_health():
    from buzzard_ai_complete.intelligence_pipeline.orchestrator import IntelligencePipelineOrchestrator

    return json.dumps(IntelligencePipelineOrchestrator().health(), ensure_ascii=False, indent=2)


def complete_intelligence_pipeline_run(domain: str = "kfz_automotive"):
    from buzzard_ai_complete.intelligence_pipeline.orchestrator import IntelligencePipelineOrchestrator

    return json.dumps(
        IntelligencePipelineOrchestrator().run(domain=domain),
        ensure_ascii=False,
        indent=2,
        default=str,
    )


def complete_agriculture_health():
    from buzzard_ai_complete.agriculture_maximal.service import AgricultureService

    return json.dumps(AgricultureService().health(), ensure_ascii=False, indent=2)


def complete_agriculture_branches():
    from buzzard_ai_complete.agriculture_maximal.service import AgricultureService

    service = AgricultureService()
    branches = service.list_branches()
    return json.dumps({"branches": branches, "count": len(branches)}, ensure_ascii=False, indent=2)


def complete_agriculture_demo():
    from buzzard_ai_complete.agriculture_maximal.service import AgricultureService

    return json.dumps(AgricultureService().demo_flow(), ensure_ascii=False, indent=2)


def complete_agriculture_schema():
    from buzzard_ai_complete.agriculture_maximal.service import AgricultureService

    service = AgricultureService()
    return json.dumps(
        {"taxonomy": service.load_schema(), "config": service.load_config()},
        ensure_ascii=False,
        indent=2,
    )


def complete_agriculture_docs():
    return _read_doc("AGRICULTURE_MAXIMAL.md")


def complete_renewable_energy_health():
    from buzzard_ai_complete.renewable_energy_maximal.service import RenewableEnergyService

    return json.dumps(RenewableEnergyService().health(), ensure_ascii=False, indent=2)


def complete_renewable_energy_branches():
    from buzzard_ai_complete.renewable_energy_maximal.service import RenewableEnergyService

    service = RenewableEnergyService()
    branches = service.list_branches()
    return json.dumps({"branches": branches, "count": len(branches)}, ensure_ascii=False, indent=2)


def complete_renewable_energy_demo():
    from buzzard_ai_complete.renewable_energy_maximal.service import RenewableEnergyService

    return json.dumps(RenewableEnergyService().demo_flow(), ensure_ascii=False, indent=2)


def complete_renewable_energy_schema():
    from buzzard_ai_complete.renewable_energy_maximal.service import RenewableEnergyService

    service = RenewableEnergyService()
    return json.dumps(
        {"taxonomy": service.load_schema(), "config": service.load_config()},
        ensure_ascii=False,
        indent=2,
    )


def complete_renewable_energy_docs():
    return _read_doc("RENEWABLE_ENERGY_MAXIMAL.md")


def complete_renewable_energy_taxonomy():
    from buzzard_ai_complete.renewable_energy_maximal.service import RenewableEnergyService

    return json.dumps(RenewableEnergyService().load_taxonomy(), ensure_ascii=False, indent=2)


def complete_livestock_health():
    from buzzard_ai_complete.livestock_maximal.service import LivestockService

    return json.dumps(LivestockService().health(), ensure_ascii=False, indent=2)


def complete_livestock_branches():
    from buzzard_ai_complete.livestock_maximal.service import LivestockService

    service = LivestockService()
    branches = service.list_branches()
    return json.dumps({"branches": branches, "count": len(branches)}, ensure_ascii=False, indent=2)


def complete_livestock_demo():
    from buzzard_ai_complete.livestock_maximal.service import LivestockService

    return json.dumps(LivestockService().demo_flow(), ensure_ascii=False, indent=2)


def complete_livestock_schema():
    from buzzard_ai_complete.livestock_maximal.service import LivestockService

    service = LivestockService()
    return json.dumps(
        {"taxonomy": service.load_schema(), "config": service.load_config()},
        ensure_ascii=False,
        indent=2,
    )


def complete_livestock_docs():
    return _read_doc("LIVESTOCK_MAXIMAL.md")


def complete_master_taxonomy_clean_health():
    from buzzard_ai_complete.master_taxonomy_clean_maximal.service import MasterTaxonomyCleanService

    return json.dumps(MasterTaxonomyCleanService().health(), ensure_ascii=False, indent=2)


def complete_master_taxonomy_clean_demo():
    from buzzard_ai_complete.master_taxonomy_clean_maximal.service import MasterTaxonomyCleanService

    return json.dumps(MasterTaxonomyCleanService().demo_flow(), ensure_ascii=False, indent=2)


def complete_master_taxonomy_clean_manifest():
    from buzzard_ai_complete.master_taxonomy_clean_maximal.service import MasterTaxonomyCleanService

    service = MasterTaxonomyCleanService()
    return json.dumps(
        {
            "manifest": service.load_manifest(),
            "sales_defaults": service.load_sales_defaults(),
        },
        ensure_ascii=False,
        indent=2,
    )


def complete_master_taxonomy_clean_docs():
    return _read_doc("MASTER_TAXONOMY_CLEAN.md")


def complete_construction_health():
    from buzzard_ai_complete.construction_maximal.service import ConstructionService

    return json.dumps(ConstructionService().health(), ensure_ascii=False, indent=2)


def complete_construction_branches():
    from buzzard_ai_complete.construction_maximal.service import ConstructionService

    service = ConstructionService()
    branches = service.list_branches()
    return json.dumps({"branches": branches, "count": len(branches)}, ensure_ascii=False, indent=2)


def complete_construction_demo():
    from buzzard_ai_complete.construction_maximal.service import ConstructionService

    return json.dumps(ConstructionService().demo_flow(), ensure_ascii=False, indent=2)


def complete_construction_schema():
    from buzzard_ai_complete.construction_maximal.service import ConstructionService

    service = ConstructionService()
    return json.dumps(
        {"taxonomy": service.load_schema(), "config": service.load_config()},
        ensure_ascii=False,
        indent=2,
    )


def complete_construction_taxonomy():
    from buzzard_ai_complete.construction_maximal.service import ConstructionService

    return json.dumps(ConstructionService().load_taxonomy(), ensure_ascii=False, indent=2)


def complete_construction_docs():
    return _read_doc("CONSTRUCTION_MAXIMAL.md")


def complete_master_taxonomy_48_health():
    from buzzard_ai_complete.master_taxonomy_48_maximal.service import MasterTaxonomy48Service

    return json.dumps(MasterTaxonomy48Service().health(), ensure_ascii=False, indent=2)


def complete_master_taxonomy_48_demo():
    from buzzard_ai_complete.master_taxonomy_48_maximal.service import MasterTaxonomy48Service

    return json.dumps(MasterTaxonomy48Service().demo_flow(), ensure_ascii=False, indent=2)


def complete_master_taxonomy_48_counts():
    from buzzard_ai_complete.master_taxonomy_48_maximal.service import MasterTaxonomy48Service

    return json.dumps(MasterTaxonomy48Service().load_counts(), ensure_ascii=False, indent=2)


def complete_master_taxonomy_48_docs():
    return _read_doc("MASTER_TAXONOMY_48_MAXIMAL.md")


def complete_main_column_48_health():
    from buzzard_ai_complete.main_column_48_maximal.service import MainColumn48Service

    return json.dumps(MainColumn48Service().health(), ensure_ascii=False, indent=2)


def complete_main_column_48_demo():
    from buzzard_ai_complete.main_column_48_maximal.service import MainColumn48Service

    return json.dumps(MainColumn48Service().demo_flow(), ensure_ascii=False, indent=2)


def complete_main_column_48_docs():
    return _read_doc("MAIN_COLUMN_48_MAXIMAL.md")


def complete_smart_menu_48_health():
    from buzzard_ai_complete.smart_menu_48_maximal.service import SmartMenu48Service

    return json.dumps(SmartMenu48Service().health(), ensure_ascii=False, indent=2)


def complete_smart_menu_48_demo():
    from buzzard_ai_complete.smart_menu_48_maximal.service import SmartMenu48Service

    return json.dumps(SmartMenu48Service().demo_flow(), ensure_ascii=False, indent=2)


def complete_smart_menu_48_docs():
    return _read_doc("SMART_MENU_48_MAXIMAL.md")


def complete_category_audit_health():
    from buzzard_ai_complete.category_audit_maximal.service import CategoryAuditService

    return json.dumps(CategoryAuditService().health(), ensure_ascii=False, indent=2)


def complete_category_audit_demo():
    from buzzard_ai_complete.category_audit_maximal.service import CategoryAuditService

    return json.dumps(CategoryAuditService().demo_flow(), ensure_ascii=False, indent=2)


def complete_category_audit_report():
    from buzzard_ai_complete.category_audit_maximal.service import CategoryAuditService

    return json.dumps(CategoryAuditService().audit_report(), ensure_ascii=False, indent=2)


def complete_category_audit_sync():
    from buzzard_ai_complete.category_audit_maximal.service import CategoryAuditService

    return json.dumps(
        CategoryAuditService().sync_live_from_storefront(),
        ensure_ascii=False,
        indent=2,
    )


def complete_category_audit_docs():
    return _read_doc("CATEGORY_AUDIT_MAXIMAL.md")


def complete_supplier_intelligence_health():
    from buzzard_ai_complete.supplier_intelligence_ai_maximal.service import (
        SupplierIntelligenceService,
    )

    return json.dumps(SupplierIntelligenceService().health(), ensure_ascii=False, indent=2)


def complete_supplier_intelligence_demo():
    from buzzard_ai_complete.supplier_intelligence_ai_maximal.service import (
        SupplierIntelligenceService,
    )

    return json.dumps(SupplierIntelligenceService().demo_flow(), ensure_ascii=False, indent=2)


def complete_supplier_intelligence_schema():
    from buzzard_ai_complete.supplier_intelligence_ai_maximal.service import (
        SupplierIntelligenceService,
    )

    service = SupplierIntelligenceService()
    return json.dumps(
        {
            "supplier": service.load_schema(),
            "config": service.load_config(),
            "risk_policy": service.load_risk_policy(),
        },
        ensure_ascii=False,
        indent=2,
    )


def complete_supplier_intelligence_docs():
    return _read_doc("SUPPLIER_INTELLIGENCE_AI_MAXIMAL.md")


def run_tests():
    result = subprocess.run(
        [sys.executable, "-m", "pytest", str(PACK_DIR / "tests"), "-q"],
        cwd=str(PACK_DIR.parent),
    )
    return result.returncode
