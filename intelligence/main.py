#!/usr/bin/env python3
import argparse
import json
from pathlib import Path

from dotenv import load_dotenv

from buzzard_intelligence import (
    APILayer,
    Analyzer,
    CategoryDiscovery,
    Collector,
    CompetitorIntel,
    Council,
    IntelligenceDB,
    MemoryEngine,
    Reporter,
    Scheduler,
    SEED_CATEGORIES,
    SharedMemory,
    TrendEngine,
    MultilingualMemory,
    TrustEngine,
    ProfitEngine,
    MarketEngine,
    SupplierIntel,
    RiskEngine,
    CouncilOrchestrator,
    AIGateway,
    WebResearch,
    ConnectorHub,
    ProductMatcher,
    PriceIntel,
    DemandForecast,
    SupplierMatcher,
    ProductSelector,
    OfficialVerifier,
    MissionEngine,
    LearningMemory,
    CategoryIntel,
    CompetitorMonitor,
    AnomalyEngine,
    TaxonomyEngine,
    GeographyEngine,
    ComplianceIntel,
    ScenarioEngine,
    IntelligenceDashboard,
    MasterCore,
    AuthorizedResearch,
    PublicConnectors,
    NormalizationEngine,
    SourceReliability,
    ChangeDetection,
    RivalProductTracker,
    RivalCategoryMap,
    RivalPriceTracker,
    MarketRadar,
    OpportunityDiscovery,
    ProductRadar,
    BrandIntel,
    SupplierVerifier,
    SupplierPerformance,
    SupplierPriceCompare,
    StockIntel,
    ShippingIntel,
    MarketplaceIntel,
    SEOIntel,
    AdvertisingIntel,
    ReviewIntel,
    PromotionIntel,
    SeasonalityIntel,
    CrossBorderIntel,
    EUComplianceMonitor,
    FXIntel,
    LandedCostCalculator,
    ProfitOptimizer,
    PortfolioManager,
    CommandCenter,
    ResearchJobsEngine,
    DataQualityControl,
    MultiAgentCollaboration,
    HypothesisEngine,
    FactCheckingEngine,
    OpportunityRanking,
    ProductDiscoveryIntel,
    SupplierDiscoveryIntel,
    MarketEntryPlanner,
    WorkflowAutomation,
    DynamicPriceOptimizer,
    DynamicMarginIntel,
    ROASIntel,
    InventoryPlanner,
    DemandToPurchasing,
    PurchaseToSellingPrice,
    CrossSellIntel,
    BundleIntel,
    AssortmentOptimizer,
    CategoryPortfolioIntel,
    GermanyMarketIntel,
    EUMarketIntel,
    TurkeyMarketIntel,
    GulfMarketIntel,
    IntlExpansionIntel,
    GlobalCurrencyIntel,
    GlobalCustomsIntel,
    GlobalLogisticsIntel,
    LocalMarketplaceIntel,
    AIIntelligenceCenter,
    UnifiedErrorHandling,
    InputValidation,
    SchemaValidation,
    APIRetryBackoff,
    RateLimitManager,
    CircuitBreaker,
    CredentialValidation,
    DataIntegrityChecks,
    ConflictResolution,
    SourceFreshnessMonitor,
    DataProvenance,
    AuditLogIntegrity,
    AgentHealthMonitor,
    MissionRecoveryManager,
    QueueJobRecovery,
    HumanApprovalGuardrails,
    BackupRestoreManager,
    SystemHealthDashboard,
    IntegrationTests,
    ProductionErrorCenter,
)
from live_connectors import (
    AmazonCreatorsClient,
    EbayClient,
    GoogleAdsClient,
    PublicFetcher,
    live_health_report,
)

INTELLIGENCE_DIR = Path(__file__).resolve().parent


def load_live_env():
    load_dotenv(INTELLIGENCE_DIR / ".env")


def main():
    parser = argparse.ArgumentParser(
        description="Buzzard Intelligence v1–v120 + Live Data Connectors"
    )
    sub = parser.add_subparsers(dest="cmd")

    sub.add_parser("init", help="Create v1 + v2 + v4 + v5 SQLite schemas")
    sub.add_parser("init-v1", help="Create v1 SQLite schema only")
    sub.add_parser("init-v2", help="Create v2 memory schema only")
    sub.add_parser("init-v4", help="Create v4 scheduler schema only")
    sub.add_parser("init-v5", help="Create v5 API layer schema only")
    sub.add_parser("init-v8", help="Create v8 category discovery schema only")
    sub.add_parser("init-v9", help="Create v9 reporting/alerts schema only")
    sub.add_parser("init-v10", help="Create v10 council integration schema only")
    sub.add_parser("init-v12", help="Create v12 shared memory schema only")
    sub.add_parser("init-v13", help="Create v13 multilingual intelligence schema only")
    sub.add_parser("init-v14", help="Create v14 competitor intelligence schema only")
    sub.add_parser("init-v15", help="Create v15 authenticity/trust schema only")
    sub.add_parser("init-v16", help="Create v16 profitability schema only")
    sub.add_parser("init-v17", help="Create v17 market opportunity schema only")
    sub.add_parser("init-v18", help="Create v18 supplier intelligence schema only")
    sub.add_parser("init-v19", help="Create v19 risk/compliance schema only")
    sub.add_parser("init-v20", help="Create v20 council orchestrator schema only")
    sub.add_parser("init-v21", help="Create v21 AI agent gateway schema only")
    sub.add_parser("init-v22", help="Create v22 web research schema only")
    sub.add_parser("init-v23", help="Create v23 connector hub schema only")
    sub.add_parser("init-v24", help="Create v24 product matching schema only")
    sub.add_parser("init-v25", help="Create v25 price intelligence schema only")
    sub.add_parser("init-v26", help="Create v26 demand forecasting schema only")
    sub.add_parser("init-v27", help="Create v27 supplier matching schema only")
    sub.add_parser("init-v28", help="Create v28 product selection schema only")
    sub.add_parser("init-v29", help="Create v29 official verification schema only")
    sub.add_parser("init-v30", help="Create v30 autonomous mission schema only")
    sub.add_parser("init-v31", help="Create v31 learning memory schema only")
    sub.add_parser("init-v32", help="Create v32 category intelligence schema only")
    sub.add_parser("init-v33", help="Create v33 competitor monitor schema only")
    sub.add_parser("init-v34", help="Create v34 alerts & anomaly detection store")
    sub.add_parser("init-v35", help="Create v35 deep category taxonomy store")
    sub.add_parser("init-v36", help="Create v36 market geography store")
    sub.add_parser("init-v37", help="Create v37 risk & compliance intelligence store")
    sub.add_parser("init-v38", help="Create v38 profitability scenario store")
    sub.add_parser("init-v39", help="Create v39 intelligence dashboard store")
    sub.add_parser("init-v40", help="Create v40 master intelligence core store")
    sub.add_parser("init-v41", help="Create v41 authorized web research")
    sub.add_parser("init-v42", help="Create v42 public API data connectors")
    sub.add_parser("init-v43", help="Create v43 data normalization store")
    sub.add_parser("init-v44", help="Create v44 source reliability scoring store")
    sub.add_parser("init-v45", help="Create v45 change detection store")
    sub.add_parser("init-v46", help="Create v46 competitor product tracking store")
    sub.add_parser("init-v47", help="Create v47 competitor category mapping store")
    sub.add_parser("init-v48", help="Create v48 competitor price tracking store")
    sub.add_parser("init-v49", help="Create v49 market trend radar store")
    sub.add_parser("init-v50", help="Create v50 opportunity discovery store")
    sub.add_parser("init-v51", help="Create v51 product trend radar store")
    sub.add_parser("init-v52", help="Create v52 brand intelligence store")
    sub.add_parser("init-v53", help="Create v53 supplier verification store")
    sub.add_parser("init-v54", help="Create v54 supplier performance tracking store")
    sub.add_parser("init-v55", help="Create v55 supplier price comparison store")
    sub.add_parser("init-v56", help="Create v56 stock & availability intelligence store")
    sub.add_parser("init-v57", help="Create v57 shipping & delivery intelligence store")
    sub.add_parser("init-v58", help="Create v58 marketplace intelligence store")
    sub.add_parser("init-v59", help="Create v59 SEO & search demand intelligence store")
    sub.add_parser("init-v60", help="Create v60 advertising intelligence store")
    sub.add_parser("init-v61", help="Create v61 customer review intelligence store")
    sub.add_parser("init-v62", help="Create v62 promotion & discount intelligence store")
    sub.add_parser("init-v63", help="Create v63 seasonality intelligence store")
    sub.add_parser("init-v64", help="Create v64 cross-border market intelligence store")
    sub.add_parser("init-v65", help="Create v65 EU & Germany compliance monitor store")
    sub.add_parser("init-v66", help="Create v66 currency & FX intelligence store")
    sub.add_parser("init-v67", help="Create v67 landed cost calculator store")
    sub.add_parser("init-v68", help="Create v68 advanced profitability optimizer store")
    sub.add_parser("init-v69", help="Create v69 portfolio manager store")
    sub.add_parser("init-v70", help="Create v70 real-time intelligence command center store")
    sub.add_parser("init-v71", help="Create v71 automated research jobs store")
    sub.add_parser("init-v72", help="Create v72 data quality control store")
    sub.add_parser("init-v73", help="Create v73 multi-agent collaboration store")
    sub.add_parser("init-v74", help="Create v74 hypothesis engine store")
    sub.add_parser("init-v75", help="Create v75 fact checking store")
    sub.add_parser("init-v76", help="Create v76 opportunity ranking store")
    sub.add_parser("init-v77", help="Create v77 product discovery store")
    sub.add_parser("init-v78", help="Create v78 supplier discovery store")
    sub.add_parser("init-v79", help="Create v79 market entry planner store")
    sub.add_parser("init-v80", help="Create v80 workflow automation store")
    sub.add_parser("init-v81", help="Create v81 dynamic price optimization store")
    sub.add_parser("init-v82", help="Create v82 dynamic margin intelligence store")
    sub.add_parser("init-v83", help="Create v83 advertising ROAS intelligence store")
    sub.add_parser("init-v84", help="Create v84 inventory planning store")
    sub.add_parser("init-v85", help="Create v85 demand to purchasing store")
    sub.add_parser("init-v86", help="Create v86 purchasing to selling price store")
    sub.add_parser("init-v87", help="Create v87 cross-sell intelligence store")
    sub.add_parser("init-v88", help="Create v88 bundle intelligence store")
    sub.add_parser("init-v89", help="Create v89 assortment optimization store")
    sub.add_parser("init-v90", help="Create v90 category portfolio intelligence store")
    sub.add_parser("init-v91", help="Create v91 Germany market intelligence store")
    sub.add_parser("init-v92", help="Create v92 EU market intelligence store")
    sub.add_parser("init-v93", help="Create v93 Türkiye market intelligence store")
    sub.add_parser("init-v94", help="Create v94 Gulf market intelligence store")
    sub.add_parser("init-v95", help="Create v95 international expansion intelligence store")
    sub.add_parser("init-v96", help="Create v96 global currency intelligence store")
    sub.add_parser("init-v97", help="Create v97 global customs intelligence store")
    sub.add_parser("init-v98", help="Create v98 global logistics intelligence store")
    sub.add_parser("init-v99", help="Create v99 local marketplace intelligence store")
    sub.add_parser("init-v100", help="Create v100 Buzzard AI intelligence center store")
    sub.add_parser("init-v101", help="Create v101 unified error handling store")
    sub.add_parser("init-v102", help="Create v102 input validation store")
    sub.add_parser("init-v103", help="Create v103 schema validation store")
    sub.add_parser("init-v104", help="Create v104 API retry & backoff store")
    sub.add_parser("init-v105", help="Create v105 rate limit manager store")
    sub.add_parser("init-v106", help="Create v106 timeout & circuit breaker store")
    sub.add_parser("init-v107", help="Create v107 credential & secret validation store")
    sub.add_parser("init-v108", help="Create v108 data integrity checks store")
    sub.add_parser("init-v109", help="Create v109 duplicate & conflict resolution store")
    sub.add_parser("init-v110", help="Create v110 source freshness monitor store")
    sub.add_parser("init-v111", help="Create v111 data provenance & lineage store")
    sub.add_parser("init-v112", help="Create v112 audit log integrity store")
    sub.add_parser("init-v113", help="Create v113 agent health monitor store")
    sub.add_parser("init-v114", help="Create v114 mission recovery manager store")
    sub.add_parser("init-v115", help="Create v115 queue & job recovery store")
    sub.add_parser("init-v116", help="Create v116 human approval guardrails store")
    sub.add_parser("init-v117", help="Create v117 backup & restore manager store")
    sub.add_parser("init-v118", help="Create v118 system health dashboard store")
    sub.add_parser("init-v119", help="Create v119 end-to-end integration tests store")
    sub.add_parser("init-v120", help="Create v120 production readiness & error center store")
    sub.add_parser("seed", help="Seed legacy TR main categories (v1 + v2)")
    sub.add_parser("seed-de", help="Seed 41 German Buzzard main categories (v1 + v2)")
    sub.add_parser("seed-tasks", help="Create placeholder scan tasks for legacy TR categories (v4)")
    sub.add_parser("seed-tasks-de", help="Create placeholder scan tasks for 41 DE categories (v4)")
    sub.add_parser("report", help="v1 summary report")
    sub.add_parser("report-v2", help="v2 memory summary report")
    sub.add_parser("changes", help="v2 detected changes (price, popularity, discoveries)")
    sub.add_parser("export-memory", help="Export v2 memory snapshot to JSON")
    sub.add_parser("tasks", help="List v4 scan tasks")
    sub.add_parser("run", help="Run due v4 scan tasks via v3 collector")
    sub.add_parser("sources", help="List v5 API/feed sources")
    sub.add_parser("test-apis", help="Test enabled v5 API sources")
    sub.add_parser("schema", help="Show v5 source schema example JSON")
    sub.add_parser("analyze", help="v6 market/category analysis report from v2 memory")
    sub.add_parser("demo", help="v6 add German demo observations to v2 memory")
    sub.add_parser("demo-trends", help="v7 add time-series demo data to v2 memory")
    sub.add_parser("trends", help="v7 trend and opportunity report from v2 memory")
    sub.add_parser("sync-categories", help="v8 load known categories from data/buzzard_categories.json")
    sub.add_parser("demo-discovery", help="v8 add German demo category signals")
    sub.add_parser("discover", help="v8 category discovery report")
    sub.add_parser("refresh-alerts", help="v9 rebuild alerts from memory/discovery events")
    sub.add_parser("intel-report", help="v9 management intelligence report")
    sub.add_parser("alerts", help="v9 active intelligence alerts")
    sub.add_parser("queue", help="v9 prioritized intelligence queue")
    sub.add_parser("demo-reporting", help="v9 demo data + alert refresh")
    sub.add_parser("inbox", help="v10 council review inbox")
    sub.add_parser("council-board", help="v10 council status board")
    sub.add_parser("demo-council", help="v10 demo council events")
    sub.add_parser("sync-council", help="v10 import open v9 alerts into council inbox")

    council_event = sub.add_parser("council-event", help="v10 create intelligence event")
    council_event.add_argument("--type", required=True)
    council_event.add_argument("--title", required=True)
    council_event.add_argument("--details", default="")
    council_event.add_argument("--source", default="")
    council_event.add_argument("--priority", type=int, default=5)
    council_event.add_argument("--from-agent", default="Buzzard Intelligence")

    council_assign = sub.add_parser("council-assign", help="v10 assign event to reviewer")
    council_assign.add_argument("--event-id", type=int, required=True)
    council_assign.add_argument("--agent", required=True)

    council_review = sub.add_parser("council-review", help="v10 record event review decision")
    council_review.add_argument("--event-id", type=int, required=True)
    council_review.add_argument("--decision", required=True)
    council_review.add_argument("--note", default="")
    council_review.add_argument("--agent", default="Council Manager")

    voice = sub.add_parser("voice", help="v11 start local voice interface server")
    voice.add_argument("--host", default="127.0.0.1")
    voice.add_argument("--port", type=int, default=8787)

    remember = sub.add_parser("remember", help="v12 store a shared memory entry")
    remember.add_argument("--type", required=True, help="DECISION, TASK, PREFERENCE, CONVERSATION, …")
    remember.add_argument("--text", required=True)
    remember.add_argument("--source", default="system")
    remember.add_argument("--confidence", type=float, default=0.8)
    remember.add_argument("--tags", default="")
    remember.add_argument("--entity", default="")

    recall = sub.add_parser("recall", help="v12 search shared memory")
    recall.add_argument("--query", required=True)

    sub.add_parser("shared-timeline", help="v12 shared memory timeline (newest first)")

    memory_status = sub.add_parser("memory-status", help="v12 update shared memory status")
    memory_status.add_argument("--id", type=int, required=True)
    memory_status.add_argument("--status", required=True, help="ACTIVE, VERIFIED, DISPUTED, ARCHIVED, REJECTED")
    memory_status.add_argument("--actor", default="system")

    shared_link = sub.add_parser("shared-link", help="v12 link two shared memory entries")
    shared_link.add_argument("--from-id", type=int, required=True)
    shared_link.add_argument("--to-id", type=int, required=True)
    shared_link.add_argument("--relation", default="related")

    term_add = sub.add_parser("term-add", help="v13 register a multilingual term for a canonical entity")
    term_add.add_argument("--language", required=True)
    term_add.add_argument("--text", required=True)
    term_add.add_argument("--canonical", required=True)
    term_add.add_argument("--entity", default="")
    term_add.add_argument("--source", default="system")
    term_add.add_argument("--confidence", type=float, default=0.8)

    sub.add_parser("ml-demo", help="v13 add demo multilingual product terms")
    sub.add_parser("ml-report", help="v13 multilingual intelligence report")

    competitor_add = sub.add_parser("competitor-add", help="v14 register a public competitor/store")
    competitor_add.add_argument("--name", required=True)
    competitor_add.add_argument("--country", default="")
    competitor_add.add_argument("--source", required=True)

    competitor_product = sub.add_parser(
        "competitor-product", help="v14 record a public competitor product observation"
    )
    competitor_product.add_argument("--competitor", required=True)
    competitor_product.add_argument("--category", required=True)
    competitor_product.add_argument("--name", required=True)
    competitor_product.add_argument("--brand", default="")
    competitor_product.add_argument("--price", type=float)
    competitor_product.add_argument("--currency", default="EUR")
    competitor_product.add_argument("--popularity", type=float)
    competitor_product.add_argument("--source", required=True)

    sub.add_parser("competitor-demo", help="v14 add demo competitor intelligence data")
    sub.add_parser("competitor-report", help="v14 competitor/market intelligence report")

    trust_product = sub.add_parser("trust-product", help="v15 register a product for authenticity review")
    trust_product.add_argument("--name", required=True)
    trust_product.add_argument("--brand", default="")
    trust_product.add_argument("--supplier", default="")
    trust_product.add_argument("--source", default="")

    trust_evidence = sub.add_parser("trust-evidence", help="v15 add evidence document for a product")
    trust_evidence.add_argument("--product-id", type=int, required=True)
    trust_evidence.add_argument("--type", required=True)
    trust_evidence.add_argument("--issuer", default="")
    trust_evidence.add_argument("--reference", default="")

    trust_verify = sub.add_parser("trust-verify", help="v15 update product verification status")
    trust_verify.add_argument("--product-id", type=int, required=True)
    trust_verify.add_argument(
        "--status",
        required=True,
        help="UNVERIFIED, PENDING, VERIFIED, REJECTED, DISPUTED",
    )
    trust_verify.add_argument("--note", default="")

    sub.add_parser("trust-demo", help="v15 add demo authenticity/trust data")
    sub.add_parser("trust-report", help="v15 authenticity and trust report")

    profit_calc = sub.add_parser("profit-calc", help="v16 calculate product profitability")
    profit_calc.add_argument("--name", required=True)
    profit_calc.add_argument("--sale", type=float, required=True)
    profit_calc.add_argument("--cost", type=float, required=True)
    profit_calc.add_argument("--shipping", type=float, default=0)
    profit_calc.add_argument("--marketplace", type=float, default=0)
    profit_calc.add_argument("--payment", type=float, default=0)
    profit_calc.add_argument("--ads", type=float, default=0)
    profit_calc.add_argument("--packaging", type=float, default=0)
    profit_calc.add_argument("--other", type=float, default=0)
    profit_calc.add_argument(
        "--tax",
        type=float,
        default=0,
        help="Steuer-/MwSt.-Effekt als direkter EUR-Aufwand",
    )

    sub.add_parser("profit-demo", help="v16 add demo profitability records")
    sub.add_parser("profit-report", help="v16 profitability report")

    market_add = sub.add_parser("market-add", help="v17 register a country/market profile")
    market_add.add_argument("--country", required=True)
    market_add.add_argument("--market", required=True)
    market_add.add_argument("--demand", type=float, default=None)
    market_add.add_argument("--competition", type=float, default=None)
    market_add.add_argument("--logistics", type=float, default=None)
    market_add.add_argument("--risk", type=float, default=None)

    opportunity_add = sub.add_parser("opportunity-add", help="v17 register a product market opportunity")
    opportunity_add.add_argument("--country", required=True)
    opportunity_add.add_argument("--category", required=True)
    opportunity_add.add_argument("--product", required=True)
    opportunity_add.add_argument("--demand", type=float, default=None)
    opportunity_add.add_argument("--competition", type=float, default=None)
    opportunity_add.add_argument("--margin", type=float, default=None)
    opportunity_add.add_argument("--logistics", type=float, default=None)
    opportunity_add.add_argument("--risk", type=float, default=None)

    sub.add_parser("market-demo", help="v17 add demo market/opportunity data")
    sub.add_parser("market-report", help="v17 market and country opportunity report")

    supplier_add = sub.add_parser("supplier-add", help="v18 register a supplier profile")
    supplier_add.add_argument("--name", required=True)
    supplier_add.add_argument("--country", default="")
    supplier_add.add_argument("--b2b", default="unknown")
    supplier_add.add_argument("--source", required=True)

    supplier_capability = sub.add_parser(
        "supplier-capability", help="v18 register a supplier integration capability"
    )
    supplier_capability.add_argument("--supplier", required=True)
    supplier_capability.add_argument("--capability", required=True)
    supplier_capability.add_argument("--status", required=True)
    supplier_capability.add_argument("--evidence", default="")

    sub.add_parser("supplier-demo", help="v18 add demo supplier intelligence data")
    sub.add_parser("supplier-report", help="v18 supplier intelligence report")

    risk_add = sub.add_parser("risk-add", help="v19 register a risk/compliance signal")
    risk_add.add_argument("--entity", required=True)
    risk_add.add_argument("--type", required=True, help="AUTHENTICITY, SUPPLIER, PRODUCT_SAFETY, …")
    risk_add.add_argument("--severity", required=True, help="LOW, MEDIUM, HIGH, CRITICAL")
    risk_add.add_argument("--details", default="")
    risk_add.add_argument("--source", default="")
    risk_add.add_argument("--country", default="")

    risk_verify = sub.add_parser("risk-verify", help="v19 update risk review status")
    risk_verify.add_argument("--risk-id", type=int, required=True)
    risk_verify.add_argument(
        "--status",
        required=True,
        help="OPEN, UNDER_REVIEW, VERIFIED, RESOLVED, REJECTED",
    )
    risk_verify.add_argument("--note", default="")
    risk_verify.add_argument("--reviewer", default="Council Manager")

    sub.add_parser("risk-demo", help="v19 add demo risk/compliance records")
    sub.add_parser("risk-report", help="v19 risk and compliance report")

    orch_create = sub.add_parser("orch-create", help="v20 create a council orchestration task")
    orch_create.add_argument("--title", required=True)
    orch_create.add_argument("--details", default="")
    orch_create.add_argument("--priority", type=int, default=5)
    orch_create.add_argument("--created-by", default="Council Manager")

    orch_assign = sub.add_parser("orch-assign", help="v20 assign task to expert agent")
    orch_assign.add_argument("--task-id", type=int, required=True)
    orch_assign.add_argument("--agent", required=True)

    orch_opinion = sub.add_parser("orch-opinion", help="v20 record expert opinion on a task")
    orch_opinion.add_argument("--task-id", type=int, required=True)
    orch_opinion.add_argument("--agent", required=True)
    orch_opinion.add_argument("--decision", required=True)
    orch_opinion.add_argument("--confidence", type=float, default=0.8)
    orch_opinion.add_argument("--note", default="")

    sub.add_parser("orch-demo", help="v20 add demo council orchestration workflow")
    sub.add_parser("orch-board", help="v20 council orchestrator board")

    ai_add_provider = sub.add_parser("ai-add-provider", help="v21 register an AI provider")
    ai_add_provider.add_argument("--name", required=True)
    ai_add_provider.add_argument("--base-url", required=True)
    ai_add_provider.add_argument("--model", required=True)
    ai_add_provider.add_argument("--api-key-env", default="BUZZARD_AI_API_KEY")

    sub.add_parser("ai-providers", help="v21 list configured AI providers")
    sub.add_parser("ai-demo", help="v21 add demo AI gateway provider")

    research_create = sub.add_parser("research-create", help="v22 create a web research job")
    research_create.add_argument("--query", required=True)
    research_create.add_argument("--purpose", default="General Intelligence")

    research_source = sub.add_parser("research-source", help="v22 add a public web source to research")
    research_source.add_argument("--research-id", type=int, required=True)
    research_source.add_argument("--url", required=True)
    research_source.add_argument("--title", default="")
    research_source.add_argument("--domain", default="")

    research_finding = sub.add_parser("research-finding", help="v22 add a sourced finding to research")
    research_finding.add_argument("--research-id", type=int, required=True)
    research_finding.add_argument("--source-id", type=int, required=True)
    research_finding.add_argument("--claim", required=True)
    research_finding.add_argument("--confidence", type=float, default=0.8)
    research_finding.add_argument("--note", default="")

    sub.add_parser("research-demo", help="v22 add demo web research records")
    sub.add_parser("research-report", help="v22 web research report")

    connector_add = sub.add_parser("connector-add", help="v23 register an API/feed connector")
    connector_add.add_argument("--name", required=True)
    connector_add.add_argument("--kind", required=True)
    connector_add.add_argument("--base-url", required=True)
    connector_add.add_argument("--key-env", default="")

    connector_capability = sub.add_parser(
        "connector-capability", help="v23 add a connector capability"
    )
    connector_capability.add_argument("--connector", required=True)
    connector_capability.add_argument("--name", required=True)
    connector_capability.add_argument("--direction", default="inbound")

    connector_health = sub.add_parser("connector-health", help="v23 set connector health status")
    connector_health.add_argument("--connector", required=True)
    connector_health.add_argument("--status", required=True)
    connector_health.add_argument("--note", default="")

    sub.add_parser("connector-demo", help="v23 add demo connector records")
    sub.add_parser("connector-report", help="v23 connector hub report")

    match_canonical = sub.add_parser("match-canonical", help="v24 add a canonical product")
    match_canonical.add_argument("--name", required=True)
    match_canonical.add_argument("--brand", default="")
    match_canonical.add_argument("--category", default="")
    match_canonical.add_argument("--variant", default="")

    match_listing = sub.add_parser("match-listing", help="v24 add a source listing")
    match_listing.add_argument("--canonical-id", type=int)
    match_listing.add_argument("--source", required=True)
    match_listing.add_argument("--name", required=True)
    match_listing.add_argument("--brand", default="")
    match_listing.add_argument("--category", default="")
    match_listing.add_argument("--variant", default="")
    match_listing.add_argument("--ean", default="")
    match_listing.add_argument("--gtin", default="")
    match_listing.add_argument("--mpn", default="")
    match_listing.add_argument("--oem", default="")
    match_listing.add_argument("--url", default="")

    match_analyze = sub.add_parser("match-analyze", help="v24 analyze listing match score")
    match_analyze.add_argument("--listing-id", type=int, required=True)
    match_analyze.add_argument("--candidate-id", type=int, required=True)

    sub.add_parser("match-demo", help="v24 add demo product matching records")
    sub.add_parser("match-report", help="v24 product matching report")

    price_add = sub.add_parser("price-add", help="v25 record a price observation")
    price_add.add_argument("--product-id", required=True)
    price_add.add_argument("--seller", required=True)
    price_add.add_argument("--price", type=float, required=True)
    price_add.add_argument("--currency", default="EUR")
    price_add.add_argument("--source", required=True)
    price_add.add_argument("--shipping", type=float, default=0)
    price_add.add_argument("--vat-included", default="unknown")

    price_changes = sub.add_parser("price-changes", help="v25 price change signals for product")
    price_changes.add_argument("--product-id", required=True)

    sub.add_parser("price-demo", help="v25 add demo price observations")
    sub.add_parser("price-report", help="v25 price intelligence report")

    demand_observation = sub.add_parser(
        "demand-observation", help="v26 add a demand observation"
    )
    demand_observation.add_argument("--product-id", required=True)
    demand_observation.add_argument("--value", type=float, required=True)
    demand_observation.add_argument("--period", required=True)

    demand_forecast = sub.add_parser("demand-forecast", help="v26 forecast demand for product")
    demand_forecast.add_argument("--product-id", required=True)
    demand_forecast.add_argument("--window", type=int, default=7)

    sub.add_parser("demand-demo", help="v26 add demo demand data")
    sub.add_parser("demand-report", help="v26 demand forecasting report")

    supplier_match_add = sub.add_parser(
        "supplier-match-add", help="v27 register supplier for matching"
    )
    supplier_match_add.add_argument("--name", required=True)
    supplier_match_add.add_argument("--category", required=True)
    supplier_match_add.add_argument("--trust", type=float, default=None)
    supplier_match_add.add_argument("--integration", type=float, default=None)
    supplier_match_add.add_argument("--logistics", type=float, default=None)
    supplier_match_add.add_argument("--risk", type=float, default=None)
    supplier_match_add.add_argument("--dropshipping", type=float, default=None)
    supplier_match_add.add_argument("--whitelabel", type=float, default=None)
    supplier_match_add.add_argument("--evidence", type=float, default=None)

    supplier_match_run = sub.add_parser(
        "supplier-match-run", help="v27 match suppliers for product/category"
    )
    supplier_match_run.add_argument("--product", required=True)
    supplier_match_run.add_argument("--category", required=True)

    sub.add_parser("supplier-match-demo", help="v27 add demo supplier matching data")
    sub.add_parser("supplier-match-report", help="v27 supplier matching report")

    selection_add = sub.add_parser("selection-add", help="v28 evaluate a product candidate")
    selection_add.add_argument("--name", required=True)
    selection_add.add_argument("--category", required=True)
    selection_add.add_argument("--profit", type=float, default=None)
    selection_add.add_argument("--demand", type=float, default=None)
    selection_add.add_argument("--price", type=float, default=None)
    selection_add.add_argument("--market", type=float, default=None)
    selection_add.add_argument("--supplier", type=float, default=None)
    selection_add.add_argument("--risk", type=float, default=None)
    selection_add.add_argument("--trust", type=float, default=None)

    sub.add_parser("selection-demo", help="v28 add demo product selection data")
    sub.add_parser("selection-report", help="v28 product selection report")

    verify_claim = sub.add_parser("verify-claim", help="v29 add a verification claim")
    verify_claim.add_argument("--entity", required=True)
    verify_claim.add_argument("--text", required=True)
    verify_claim.add_argument("--category", default="GENERAL")

    verify_source = sub.add_parser("verify-source", help="v29 add an official source to claim")
    verify_source.add_argument("--claim-id", type=int, required=True)
    verify_source.add_argument("--type", required=True)
    verify_source.add_argument("--url", required=True)
    verify_source.add_argument("--publisher", required=True)
    verify_source.add_argument("--published", default="")
    verify_source.add_argument("--note", default="")

    verify_set = sub.add_parser("verify-set", help="v29 set claim verification status")
    verify_set.add_argument("--claim-id", type=int, required=True)
    verify_set.add_argument("--status", required=True)
    verify_set.add_argument("--note", default="")

    sub.add_parser("verify-demo", help="v29 add demo verification records")
    sub.add_parser("verify-report", help="v29 official verification report")

    mission_create = sub.add_parser("mission-create", help="v30 create an intelligence mission")
    mission_create.add_argument("--title", required=True)
    mission_create.add_argument("--details", default="")
    mission_create.add_argument("--priority", type=int, default=10)

    mission_result = sub.add_parser("mission-result", help="v30 record task result")
    mission_result.add_argument("--task-id", type=int, required=True)
    mission_result.add_argument("--agent", required=True)
    mission_result.add_argument("--result", required=True)
    mission_result.add_argument("--confidence", type=float, default=0.8)
    mission_result.add_argument("--evidence", default="")

    mission_approve = sub.add_parser("mission-approve", help="v30 human approval gate")
    mission_approve.add_argument("--mission-id", type=int, required=True)
    mission_approve.add_argument("--decision", required=True)
    mission_approve.add_argument("--note", default="")

    sub.add_parser("mission-demo", help="v30 add demo mission")
    sub.add_parser("mission-board", help="v30 autonomous mission board")

    learn_remember = sub.add_parser("learn-remember", help="v31 store a learning memory entry")
    learn_remember.add_argument("--kind", required=True)
    learn_remember.add_argument("--topic", required=True)
    learn_remember.add_argument("--text", required=True)
    learn_remember.add_argument("--confidence", type=float, default=0.8)
    learn_remember.add_argument("--source", default="")

    learn_lesson = sub.add_parser("learn-lesson", help="v31 store a lesson learned")
    learn_lesson.add_argument("--topic", required=True)
    learn_lesson.add_argument("--text", required=True)

    learn_recall = sub.add_parser("learn-recall", help="v31 search learning memory")
    learn_recall.add_argument("--query", required=True)
    learn_recall.add_argument("--limit", type=int, default=20)

    learn_status = sub.add_parser("learn-status", help="v31 set learning memory status")
    learn_status.add_argument("--memory-id", type=int, required=True)
    learn_status.add_argument("--status", required=True)

    sub.add_parser("learn-demo", help="v31 add demo learning memory records")
    sub.add_parser("learn-report", help="v31 learning memory report")

    category_signal = sub.add_parser("category-signal", help="v32 add category market signal")
    category_signal.add_argument("--category", required=True)
    category_signal.add_argument("--demand", type=float, default=None)
    category_signal.add_argument("--competition", type=float, default=None)
    category_signal.add_argument("--supplier", type=float, default=None)
    category_signal.add_argument("--margin", type=float, default=None)
    category_signal.add_argument("--risk", type=float, default=None)

    category_owned = sub.add_parser("category-owned", help="v32 mark category as present in Buzzard")
    category_owned.add_argument("--category", required=True)

    sub.add_parser("category-seed", help="v32 seed 100+ category catalog")
    sub.add_parser("category-queue", help="v32 category research queue")
    sub.add_parser("category-report", help="v32 category intelligence report")
    sub.add_parser("category-demo", help="v32 seed catalog and demo signals")

    rivals_add = sub.add_parser("rivals-add", help="v33 register a public competitor/marketplace")
    rivals_add.add_argument("--name", required=True)
    rivals_add.add_argument("--url", required=True)
    rivals_add.add_argument("--market", required=True)

    rivals_category = sub.add_parser("rivals-category", help="v33 record competitor category observation")
    rivals_category.add_argument("--competitor", required=True)
    rivals_category.add_argument("--category", required=True)
    rivals_category.add_argument("--count", type=int, default=0)
    rivals_category.add_argument("--url", default="")

    rivals_product = sub.add_parser("rivals-product", help="v33 record competitor product observation")
    rivals_product.add_argument("--competitor", required=True)
    rivals_product.add_argument("--category", required=True)
    rivals_product.add_argument("--name", required=True)
    rivals_product.add_argument("--price", type=float)
    rivals_product.add_argument("--currency", default="EUR")
    rivals_product.add_argument("--signal", default="")
    rivals_product.add_argument("--url", default="")

    rivals_changes = sub.add_parser("rivals-changes", help="v33 competitor change report")
    rivals_changes.add_argument("--competitor", required=True)

    sub.add_parser("rivals-demo", help="v33 add demo competitor monitor data")
    sub.add_parser("rivals-report", help="v33 competitor intelligence report")

    sub.add_parser("anomaly-demo", help="v34 add demo anomaly detection data")
    sub.add_parser("anomaly-report", help="v34 alerts & anomaly detection report")
    sub.add_parser("taxonomy-demo", help="v35 add demo category taxonomy data")
    sub.add_parser("taxonomy-report", help="v35 deep category taxonomy report")
    sub.add_parser("geo-demo", help="v36 add demo market geography data")
    sub.add_parser("geo-report", help="v36 market geography report")
    sub.add_parser("compliance-demo", help="v37 add demo compliance intelligence data")
    sub.add_parser("compliance-report", help="v37 risk & compliance intelligence report")
    sub.add_parser("scenario-demo", help="v38 add demo profitability scenario data")
    sub.add_parser("scenario-report", help="v38 profitability scenario report")
    sub.add_parser("idash-demo", help="v39 add demo intelligence dashboard data")
    sub.add_parser("idash-report", help="v39 intelligence dashboard report")
    sub.add_parser("master-demo", help="v40 add demo master core data")
    sub.add_parser("master-report", help="v40 master intelligence core report")
    sub.add_parser("authres-demo", help="v41 add demo data")
    sub.add_parser("authres-report", help="v41 report")
    sub.add_parser("pubconn-demo", help="v42 add demo data")
    sub.add_parser("pubconn-report", help="v42 report")
    sub.add_parser("norm-demo", help="v43 add demo data")
    sub.add_parser("norm-report", help="v43 report")
    sub.add_parser("srscore-demo", help="v44 add demo data")
    sub.add_parser("srscore-report", help="v44 report")
    sub.add_parser("cdetect-demo", help="v45 add demo data")
    sub.add_parser("cdetect-report", help="v45 report")
    sub.add_parser("rprod-demo", help="v46 add demo data")
    sub.add_parser("rprod-report", help="v46 report")
    sub.add_parser("rcatmap-demo", help="v47 add demo data")
    sub.add_parser("rcatmap-report", help="v47 report")
    sub.add_parser("rprice-demo", help="v48 add demo data")
    sub.add_parser("rprice-report", help="v48 report")
    sub.add_parser("mradar-demo", help="v49 add demo data")
    sub.add_parser("mradar-report", help="v49 report")
    sub.add_parser("oppdisc-demo", help="v50 add demo data")
    sub.add_parser("oppdisc-report", help="v50 report")
    sub.add_parser("pradar-demo", help="v51 add demo data")
    sub.add_parser("pradar-report", help="v51 report")
    sub.add_parser("brand-demo", help="v52 add demo data")
    sub.add_parser("brand-report", help="v52 report")
    sub.add_parser("sverify-demo", help="v53 add demo data")
    sub.add_parser("sverify-report", help="v53 report")
    sub.add_parser("sperf-demo", help="v54 add demo data")
    sub.add_parser("sperf-report", help="v54 report")
    sub.add_parser("sprice-demo", help="v55 add demo data")
    sub.add_parser("sprice-report", help="v55 report")
    sub.add_parser("stock-demo", help="v56 add demo data")
    sub.add_parser("stock-report", help="v56 report")
    sub.add_parser("ship-demo", help="v57 add demo data")
    sub.add_parser("ship-report", help="v57 report")
    sub.add_parser("mplace-demo", help="v58 add demo data")
    sub.add_parser("mplace-report", help="v58 report")
    sub.add_parser("seo-demo", help="v59 add demo data")
    sub.add_parser("seo-report", help="v59 report")
    sub.add_parser("advert-demo", help="v60 add demo data")
    sub.add_parser("advert-report", help="v60 report")
    sub.add_parser("revintel-demo", help="v61 add demo data")
    sub.add_parser("revintel-report", help="v61 report")
    sub.add_parser("promo-demo", help="v62 add demo data")
    sub.add_parser("promo-report", help="v62 report")
    sub.add_parser("season-demo", help="v63 add demo data")
    sub.add_parser("season-report", help="v63 report")
    sub.add_parser("xborder-demo", help="v64 add demo data")
    sub.add_parser("xborder-report", help="v64 report")
    sub.add_parser("eucomp-demo", help="v65 add demo data")
    sub.add_parser("eucomp-report", help="v65 report")
    sub.add_parser("fx-demo", help="v66 add demo data")
    sub.add_parser("fx-report", help="v66 report")
    sub.add_parser("lcost-demo", help="v67 add demo data")
    sub.add_parser("lcost-report", help="v67 report")
    sub.add_parser("profopt-demo", help="v68 add demo data")
    sub.add_parser("profopt-report", help="v68 report")
    sub.add_parser("port-demo", help="v69 add demo data")
    sub.add_parser("port-report", help="v69 report")
    sub.add_parser("cmdctr-demo", help="v70 add demo data")
    sub.add_parser("cmdctr-report", help="v70 report")
    sub.add_parser("rjobs-demo", help="v71 add demo data")
    sub.add_parser("rjobs-report", help="v71 report")
    sub.add_parser("dqc-demo", help="v72 add demo data")
    sub.add_parser("dqc-report", help="v72 report")
    sub.add_parser("magent-demo", help="v73 add demo data")
    sub.add_parser("magent-report", help="v73 report")
    sub.add_parser("hypoth-demo", help="v74 add demo data")
    sub.add_parser("hypoth-report", help="v74 report")
    sub.add_parser("fcheck-demo", help="v75 add demo data")
    sub.add_parser("fcheck-report", help="v75 report")
    sub.add_parser("oprank-demo", help="v76 add demo data")
    sub.add_parser("oprank-report", help="v76 report")
    sub.add_parser("pdisc-demo", help="v77 add demo data")
    sub.add_parser("pdisc-report", help="v77 report")
    sub.add_parser("sdisc-demo", help="v78 add demo data")
    sub.add_parser("sdisc-report", help="v78 report")
    sub.add_parser("mentry-demo", help="v79 add demo data")
    sub.add_parser("mentry-report", help="v79 report")
    sub.add_parser("wflow-demo", help="v80 add demo data")
    sub.add_parser("wflow-report", help="v80 report")
    sub.add_parser("dprice-demo", help="v81 add demo data")
    sub.add_parser("dprice-report", help="v81 report")
    sub.add_parser("dmargin-demo", help="v82 add demo data")
    sub.add_parser("dmargin-report", help="v82 report")
    sub.add_parser("roas-demo", help="v83 add demo data")
    sub.add_parser("roas-report", help="v83 report")
    sub.add_parser("invplan-demo", help="v84 add demo data")
    sub.add_parser("invplan-report", help="v84 report")
    sub.add_parser("dpurch-demo", help="v85 add demo data")
    sub.add_parser("dpurch-report", help="v85 report")
    sub.add_parser("psell-demo", help="v86 add demo data")
    sub.add_parser("psell-report", help="v86 report")
    sub.add_parser("xsell-demo", help="v87 add demo data")
    sub.add_parser("xsell-report", help="v87 report")
    sub.add_parser("bundle-demo", help="v88 add demo data")
    sub.add_parser("bundle-report", help="v88 report")
    sub.add_parser("assort-demo", help="v89 add demo data")
    sub.add_parser("assort-report", help="v89 report")
    sub.add_parser("catport-demo", help="v90 add demo data")
    sub.add_parser("catport-report", help="v90 report")
    sub.add_parser("demark-demo", help="v91 add demo data")
    sub.add_parser("demark-report", help="v91 report")
    sub.add_parser("eumark-demo", help="v92 add demo data")
    sub.add_parser("eumark-report", help="v92 report")
    sub.add_parser("trmark-demo", help="v93 add demo data")
    sub.add_parser("trmark-report", help="v93 report")
    sub.add_parser("gulfmark-demo", help="v94 add demo data")
    sub.add_parser("gulfmark-report", help="v94 report")
    sub.add_parser("intl-demo", help="v95 add demo data")
    sub.add_parser("intl-report", help="v95 report")
    sub.add_parser("gcfx-demo", help="v96 add demo data")
    sub.add_parser("gcfx-report", help="v96 report")
    sub.add_parser("gcustoms-demo", help="v97 add demo data")
    sub.add_parser("gcustoms-report", help="v97 report")
    sub.add_parser("glog-demo", help="v98 add demo data")
    sub.add_parser("glog-report", help="v98 report")
    sub.add_parser("lmarket-demo", help="v99 add demo data")
    sub.add_parser("lmarket-report", help="v99 report")
    sub.add_parser("aicenter-demo", help="v100 add demo data")
    sub.add_parser("aicenter-report", help="v100 report")
    sub.add_parser("uerr-demo", help="v101 add demo data")
    sub.add_parser("uerr-report", help="v101 report")
    sub.add_parser("inval-demo", help="v102 add demo data")
    sub.add_parser("inval-report", help="v102 report")
    sub.add_parser("svalid-demo", help="v103 add demo data")
    sub.add_parser("svalid-report", help="v103 report")
    sub.add_parser("retry-demo", help="v104 add demo data")
    sub.add_parser("retry-report", help="v104 report")
    sub.add_parser("ratelimit-demo", help="v105 add demo data")
    sub.add_parser("ratelimit-report", help="v105 report")
    sub.add_parser("cbreak-demo", help="v106 add demo data")
    sub.add_parser("cbreak-report", help="v106 report")
    sub.add_parser("credval-demo", help="v107 add demo data")
    sub.add_parser("credval-report", help="v107 report")
    sub.add_parser("dinteg-demo", help="v108 add demo data")
    sub.add_parser("dinteg-report", help="v108 report")
    sub.add_parser("conflict-demo", help="v109 add demo data")
    sub.add_parser("conflict-report", help="v109 report")
    sub.add_parser("fresh-demo", help="v110 add demo data")
    sub.add_parser("fresh-report", help="v110 report")
    sub.add_parser("proven-demo", help="v111 add demo data")
    sub.add_parser("proven-report", help="v111 report")
    sub.add_parser("audit-demo", help="v112 add demo data")
    sub.add_parser("audit-report", help="v112 report")
    sub.add_parser("aghealth-demo", help="v113 add demo data")
    sub.add_parser("aghealth-report", help="v113 report")
    sub.add_parser("mrecover-demo", help="v114 add demo data")
    sub.add_parser("mrecover-report", help="v114 report")
    sub.add_parser("qrecover-demo", help="v115 add demo data")
    sub.add_parser("qrecover-report", help="v115 report")
    sub.add_parser("guard-demo", help="v116 add demo data")
    sub.add_parser("guard-report", help="v116 report")
    sub.add_parser("backup-demo", help="v117 add demo data")
    sub.add_parser("backup-report", help="v117 report")
    sub.add_parser("syshealth-demo", help="v118 add demo data")
    sub.add_parser("syshealth-report", help="v118 report")
    sub.add_parser("e2etest-demo", help="v119 add demo data")
    sub.add_parser("e2etest-report", help="v119 report")
    sub.add_parser("errctr-demo", help="v120 add demo data")
    sub.add_parser("errctr-report", help="v120 report")

    sub.add_parser("live-health", help="Live connector credential health check")
    live_ebay = sub.add_parser("live-ebay", help="Live eBay Browse API search")
    live_ebay.add_argument("--query", required=True)
    live_ebay.add_argument("--limit", type=int, default=20)
    live_amazon = sub.add_parser("live-amazon", help="Live Amazon Creators API search")
    live_amazon.add_argument("--query", required=True)
    sub.add_parser("live-google-ads", help="Live Google Ads campaign query (last 7 days)")
    live_fetch = sub.add_parser("live-fetch", help="Fetch an authorized public URL")
    live_fetch.add_argument("--url", required=True)

    add_category = sub.add_parser("add-category", help="v8 register a sourced category candidate")
    add_category.add_argument("--name", required=True)
    add_category.add_argument("--parent", default="")
    add_category.add_argument("--level", type=int, default=1)
    add_category.add_argument("--source", required=True)
    add_category.add_argument("--confidence", type=float, default=0.8)

    memory = sub.add_parser("memory", help="Search v2 memory by product, brand, or category")
    memory.add_argument("query")

    collect = sub.add_parser("collect", help="Collect one public HTML source (v3, robots.txt aware)")
    collect.add_argument("--url", required=True)
    collect.add_argument("--category", required=True)
    collect.add_argument("--subcategory", default="")
    collect.add_argument("--country", default="DE")
    collect.add_argument("--platform", default="public_web")

    collect_list = sub.add_parser("collect-list", help="Collect multiple URLs from a text file (v3)")
    collect_list.add_argument("file", help="One URL per line; lines starting with # are ignored")
    collect_list.add_argument("--category", required=True)
    collect_list.add_argument("--subcategory", default="")
    collect_list.add_argument("--country", default="DE")
    collect_list.add_argument("--platform", default="public_web")

    add_task = sub.add_parser("add-task", help="Add a v4 scan task with source URL")
    add_task.add_argument("--category", required=True)
    add_task.add_argument("--subcategory", default="")
    add_task.add_argument("--url", required=True)
    add_task.add_argument("--country", default="DE")
    add_task.add_argument("--platform", default="public_web")
    add_task.add_argument("--interval", type=int, default=1440, help="Minutes between runs (min 60)")
    add_task.add_argument("--priority", type=int, default=5)

    add_api = sub.add_parser("add-api", help="Register a v5 official API or feed source")
    add_api.add_argument("--name", required=True)
    add_api.add_argument("--base-url", required=True)
    add_api.add_argument("--category", required=True)
    add_api.add_argument("--country", default="DE")
    add_api.add_argument("--platform", default="official_api")
    add_api.add_argument("--interval", type=int, default=1440)
    add_api.add_argument("--priority", type=int, default=8)
    add_api.add_argument("--auth-env", default="BUZZARD_API_KEY")

    p = sub.add_parser("add-observation", help="Record a sourced observation (v2 memory engine)")
    p.add_argument("--category", required=True)
    p.add_argument("--subcategory", default="")
    p.add_argument("--subsubcategory", default="")
    p.add_argument("--product", required=True)
    p.add_argument("--brand", default="")
    p.add_argument("--platform", default="")
    p.add_argument("--country", default="")
    p.add_argument("--price", type=float)
    p.add_argument("--currency", default="EUR")
    p.add_argument("--popularity", type=float)
    p.add_argument("--source-url", required=True)
    p.add_argument("--source-name", default="")
    p.add_argument("--confidence", type=float, default=0.70)

    args = parser.parse_args()
    v1 = IntelligenceDB()
    v2 = MemoryEngine()
    v3 = Collector(v2)
    v4 = Scheduler(v3)
    v5 = APILayer()
    v6 = Analyzer(v2)
    v7 = TrendEngine(v2)
    v8 = CategoryDiscovery()
    v9 = Reporter(v2, v8)
    v10 = Council()
    v12 = SharedMemory()
    v13 = MultilingualMemory()
    v14 = CompetitorIntel()
    v15 = TrustEngine()
    v16 = ProfitEngine()
    v17 = MarketEngine()
    v18 = SupplierIntel()
    v19 = RiskEngine()
    v20 = CouncilOrchestrator()
    v21 = AIGateway()
    v22 = WebResearch()
    v23 = ConnectorHub()
    v24 = ProductMatcher()
    v25 = PriceIntel()
    v26 = DemandForecast()
    v27 = SupplierMatcher()
    v28 = ProductSelector()
    v29 = OfficialVerifier()
    v30 = MissionEngine()
    v31 = LearningMemory()
    v32 = CategoryIntel()
    v33 = CompetitorMonitor()
    v34 = AnomalyEngine()
    v35 = TaxonomyEngine()
    v36 = GeographyEngine()
    v37 = ComplianceIntel()
    v38 = ScenarioEngine()
    v39 = IntelligenceDashboard()
    v40 = MasterCore()
    v41 = AuthorizedResearch()
    v42 = PublicConnectors()
    v43 = NormalizationEngine()
    v44 = SourceReliability()
    v45 = ChangeDetection()
    v46 = RivalProductTracker()
    v47 = RivalCategoryMap()
    v48 = RivalPriceTracker()
    v49 = MarketRadar()
    v50 = OpportunityDiscovery()
    v51 = ProductRadar()
    v52 = BrandIntel()
    v53 = SupplierVerifier()
    v54 = SupplierPerformance()
    v55 = SupplierPriceCompare()
    v56 = StockIntel()
    v57 = ShippingIntel()
    v58 = MarketplaceIntel()
    v59 = SEOIntel()
    v60 = AdvertisingIntel()
    v61 = ReviewIntel()
    v62 = PromotionIntel()
    v63 = SeasonalityIntel()
    v64 = CrossBorderIntel()
    v65 = EUComplianceMonitor()
    v66 = FXIntel()
    v67 = LandedCostCalculator()
    v68 = ProfitOptimizer()
    v69 = PortfolioManager()
    v70 = CommandCenter()
    v71 = ResearchJobsEngine()
    v72 = DataQualityControl()
    v73 = MultiAgentCollaboration()
    v74 = HypothesisEngine()
    v75 = FactCheckingEngine()
    v76 = OpportunityRanking()
    v77 = ProductDiscoveryIntel()
    v78 = SupplierDiscoveryIntel()
    v79 = MarketEntryPlanner()
    v80 = WorkflowAutomation()
    v81 = DynamicPriceOptimizer()
    v82 = DynamicMarginIntel()
    v83 = ROASIntel()
    v84 = InventoryPlanner()
    v85 = DemandToPurchasing()
    v86 = PurchaseToSellingPrice()
    v87 = CrossSellIntel()
    v88 = BundleIntel()
    v89 = AssortmentOptimizer()
    v90 = CategoryPortfolioIntel()
    v91 = GermanyMarketIntel()
    v92 = EUMarketIntel()
    v93 = TurkeyMarketIntel()
    v94 = GulfMarketIntel()
    v95 = IntlExpansionIntel()
    v96 = GlobalCurrencyIntel()
    v97 = GlobalCustomsIntel()
    v98 = GlobalLogisticsIntel()
    v99 = LocalMarketplaceIntel()
    v100 = AIIntelligenceCenter()
    v101 = UnifiedErrorHandling()
    v102 = InputValidation()
    v103 = SchemaValidation()
    v104 = APIRetryBackoff()
    v105 = RateLimitManager()
    v106 = CircuitBreaker()
    v107 = CredentialValidation()
    v108 = DataIntegrityChecks()
    v109 = ConflictResolution()
    v110 = SourceFreshnessMonitor()
    v111 = DataProvenance()
    v112 = AuditLogIntegrity()
    v113 = AgentHealthMonitor()
    v114 = MissionRecoveryManager()
    v115 = QueueJobRecovery()
    v116 = HumanApprovalGuardrails()
    v117 = BackupRestoreManager()
    v118 = SystemHealthDashboard()
    v119 = IntegrationTests()
    v120 = ProductionErrorCenter()

    if args.cmd == "init":
        v1.init()
        v2.init()
        v4.init()
        v5.init()
        v8.init()
        v9.init()
        v10.init()
        v12.init()
        v13.init()
        v14.init()
        v15.init()
        v16.init()
        v17.init()
        v18.init()
        v19.init()
        v20.init()
        v21.init()
        v22.init()
        v23.init()
        v24.init()
        v25.init()
        v26.init()
        v27.init()
        v28.init()
        v29.init()
        v30.init()
        v31.init()
        v32.init()
        v33.init()
        v34.init()
        v35.init()
        v36.init()
        v37.init()
        v38.init()
        v39.init()
        v40.init()
        v41.init()
        v42.init()
        v43.init()
        v44.init()
        v45.init()
        v46.init()
        v47.init()
        v48.init()
        v49.init()
        v50.init()
        v51.init()
        v52.init()
        v53.init()
        v54.init()
        v55.init()
        v56.init()
        v57.init()
        v58.init()
        v59.init()
        v60.init()
        v61.init()
        v62.init()
        v63.init()
        v64.init()
        v65.init()
        v66.init()
        v67.init()
        v68.init()
        v69.init()
        v70.init()
        v71.init()
        v72.init()
        v73.init()
        v74.init()
        v75.init()
        v76.init()
        v77.init()
        v78.init()
        v79.init()
        v80.init()
        v81.init()
        v82.init()
        v83.init()
        v84.init()
        v85.init()
        v86.init()
        v87.init()
        v88.init()
        v89.init()
        v90.init()
        v91.init()
        v92.init()
        v93.init()
        v94.init()
        v95.init()
        v96.init()
        v97.init()
        v98.init()
        v99.init()
        v100.init()
        v101.init()
        v102.init()
        v103.init()
        v104.init()
        v105.init()
        v106.init()
        v107.init()
        v108.init()
        v109.init()
        v110.init()
        v111.init()
        v112.init()
        v113.init()
        v114.init()
        v115.init()
        v116.init()
        v117.init()
        v118.init()
        v119.init()
        v120.init()
        print(f"v1 database ready at {Path(v1.path).resolve()}")
        print(f"v2 memory engine ready at {Path(v2.path).resolve()}")
        print(f"v4 scheduler ready at {Path(v4.path).resolve()}")
        print(f"v5 API layer ready at {Path(v5.path).resolve()}")
        print(f"v8 category discovery ready at {Path(v8.path).resolve()}")
        print(f"v9 reporting ready at {Path(v9.path).resolve()}")
        print(f"v10 council ready at {Path(v10.path).resolve()}")
        print(f"v12 shared memory ready at {Path(v12.path).resolve()}")
        print(f"v13 multilingual ready at {Path(v13.path).resolve()}")
        print(f"v14 competitor intel ready at {Path(v14.path).resolve()}")
        print(f"v15 trust engine ready at {Path(v15.path).resolve()}")
        print(f"v16 profit engine ready at {Path(v16.path).resolve()}")
        print(f"v17 market engine ready at {Path(v17.path).resolve()}")
        print(f"v18 supplier intel ready at {Path(v18.path).resolve()}")
        print(f"v19 risk engine ready at {Path(v19.path).resolve()}")
        print(f"v20 council orchestrator ready at {Path(v20.path).resolve()}")
        print(f"v21 AI gateway ready at {Path(v21.path).resolve()}")
        print(f"v22 web research ready at {Path(v22.path).resolve()}")
        print(f"v23 connector hub ready at {Path(v23.path).resolve()}")
        print(f"v24 product matching ready at {Path(v24.path).resolve()}")
        print(f"v25 price intelligence ready at {Path(v25.path).resolve()}")
        print(f"v26 demand forecasting ready at {Path(v26.path).resolve()}")
        print(f"v27 supplier matching ready at {Path(v27.path).resolve()}")
        print(f"v28 product selection ready at {Path(v28.path).resolve()}")
        print(f"v29 official verification ready at {Path(v29.path).resolve()}")
        print(f"v30 autonomous mission ready at {Path(v30.path).resolve()}")
        print(f"v31 learning memory ready at {Path(v31.path).resolve()}")
        print(f"v32 category intelligence ready at {Path(v32.path).resolve()}")
        print(f"v33 competitor monitor ready at {Path(v33.path).resolve()}")
        print(f"v34 anomaly detection ready at {Path(v34.path).resolve()}")
        print(f"v35 category taxonomy ready at {Path(v35.path).resolve()}")
        print(f"v36 market geography ready at {Path(v36.path).resolve()}")
        print(f"v37 compliance intelligence ready at {Path(v37.path).resolve()}")
        print(f"v38 profitability scenario ready at {Path(v38.path).resolve()}")
        print(f"v39 intelligence dashboard ready at {Path(v39.path).resolve()}")
        print(f"v40 master core ready at {Path(v40.path).resolve()}")
        print(f"v41 authorized web research ready at {Path(v41.path).resolve()}")
        print(f"v42 public API data connectors ready at {Path(v42.path).resolve()}")
        print(f"v43 data normalization store ready at {Path(v43.path).resolve()}")
        print(f"v44 source reliability scoring store ready at {Path(v44.path).resolve()}")
        print(f"v45 change detection store ready at {Path(v45.path).resolve()}")
        print(f"v46 competitor product tracking store ready at {Path(v46.path).resolve()}")
        print(f"v47 competitor category mapping store ready at {Path(v47.path).resolve()}")
        print(f"v48 competitor price tracking store ready at {Path(v48.path).resolve()}")
        print(f"v49 market trend radar store ready at {Path(v49.path).resolve()}")
        print(f"v50 opportunity discovery store ready at {Path(v50.path).resolve()}")
        print(f"v51 product trend radar store ready at {Path(v51.path).resolve()}")
        print(f"v52 brand intelligence store ready at {Path(v52.path).resolve()}")
        print(f"v53 supplier verification store ready at {Path(v53.path).resolve()}")
        print(f"v54 supplier performance tracking store ready at {Path(v54.path).resolve()}")
        print(f"v55 supplier price comparison store ready at {Path(v55.path).resolve()}")
        print(f"v56 stock & availability intelligence store ready at {Path(v56.path).resolve()}")
        print(f"v57 shipping & delivery intelligence store ready at {Path(v57.path).resolve()}")
        print(f"v58 marketplace intelligence store ready at {Path(v58.path).resolve()}")
        print(f"v59 SEO & search demand intelligence store ready at {Path(v59.path).resolve()}")
        print(f"v60 advertising intelligence store ready at {Path(v60.path).resolve()}")
        print(f"v61 customer review intelligence store ready at {Path(v61.path).resolve()}")
        print(f"v62 promotion & discount intelligence store ready at {Path(v62.path).resolve()}")
        print(f"v63 seasonality intelligence store ready at {Path(v63.path).resolve()}")
        print(f"v64 cross-border market intelligence store ready at {Path(v64.path).resolve()}")
        print(f"v65 EU & Germany compliance monitor store ready at {Path(v65.path).resolve()}")
        print(f"v66 currency & FX intelligence store ready at {Path(v66.path).resolve()}")
        print(f"v67 landed cost calculator store ready at {Path(v67.path).resolve()}")
        print(f"v68 advanced profitability optimizer store ready at {Path(v68.path).resolve()}")
        print(f"v69 portfolio manager store ready at {Path(v69.path).resolve()}")
        print(f"v70 real-time intelligence command center store ready at {Path(v70.path).resolve()}")
        print(f"v71 automated research jobs store ready at {Path(v71.path).resolve()}")
        print(f"v72 data quality control store ready at {Path(v72.path).resolve()}")
        print(f"v73 multi-agent collaboration store ready at {Path(v73.path).resolve()}")
        print(f"v74 hypothesis engine store ready at {Path(v74.path).resolve()}")
        print(f"v75 fact checking store ready at {Path(v75.path).resolve()}")
        print(f"v76 opportunity ranking store ready at {Path(v76.path).resolve()}")
        print(f"v77 product discovery store ready at {Path(v77.path).resolve()}")
        print(f"v78 supplier discovery store ready at {Path(v78.path).resolve()}")
        print(f"v79 market entry planner store ready at {Path(v79.path).resolve()}")
        print(f"v80 workflow automation store ready at {Path(v80.path).resolve()}")
        print(f"v81 dynamic price optimization store ready at {Path(v81.path).resolve()}")
        print(f"v82 dynamic margin intelligence store ready at {Path(v82.path).resolve()}")
        print(f"v83 advertising ROAS intelligence store ready at {Path(v83.path).resolve()}")
        print(f"v84 inventory planning store ready at {Path(v84.path).resolve()}")
        print(f"v85 demand to purchasing store ready at {Path(v85.path).resolve()}")
        print(f"v86 purchasing to selling price store ready at {Path(v86.path).resolve()}")
        print(f"v87 cross-sell intelligence store ready at {Path(v87.path).resolve()}")
        print(f"v88 bundle intelligence store ready at {Path(v88.path).resolve()}")
        print(f"v89 assortment optimization store ready at {Path(v89.path).resolve()}")
        print(f"v90 category portfolio intelligence store ready at {Path(v90.path).resolve()}")
        print(f"v91 Germany market intelligence store ready at {Path(v91.path).resolve()}")
        print(f"v92 EU market intelligence store ready at {Path(v92.path).resolve()}")
        print(f"v93 Türkiye market intelligence store ready at {Path(v93.path).resolve()}")
        print(f"v94 Gulf market intelligence store ready at {Path(v94.path).resolve()}")
        print(f"v95 international expansion intelligence store ready at {Path(v95.path).resolve()}")
        print(f"v96 global currency intelligence store ready at {Path(v96.path).resolve()}")
        print(f"v97 global customs intelligence store ready at {Path(v97.path).resolve()}")
        print(f"v98 global logistics intelligence store ready at {Path(v98.path).resolve()}")
        print(f"v99 local marketplace intelligence store ready at {Path(v99.path).resolve()}")
        print(f"v100 Buzzard AI intelligence center store ready at {Path(v100.path).resolve()}")
        print(f"v101 unified error handling store ready at {Path(v101.path).resolve()}")
        print(f"v102 input validation store ready at {Path(v102.path).resolve()}")
        print(f"v103 schema validation store ready at {Path(v103.path).resolve()}")
        print(f"v104 API retry & backoff store ready at {Path(v104.path).resolve()}")
        print(f"v105 rate limit manager store ready at {Path(v105.path).resolve()}")
        print(f"v106 timeout & circuit breaker store ready at {Path(v106.path).resolve()}")
        print(f"v107 credential & secret validation store ready at {Path(v107.path).resolve()}")
        print(f"v108 data integrity checks store ready at {Path(v108.path).resolve()}")
        print(f"v109 duplicate & conflict resolution store ready at {Path(v109.path).resolve()}")
        print(f"v110 source freshness monitor store ready at {Path(v110.path).resolve()}")
        print(f"v111 data provenance & lineage store ready at {Path(v111.path).resolve()}")
        print(f"v112 audit log integrity store ready at {Path(v112.path).resolve()}")
        print(f"v113 agent health monitor store ready at {Path(v113.path).resolve()}")
        print(f"v114 mission recovery manager store ready at {Path(v114.path).resolve()}")
        print(f"v115 queue & job recovery store ready at {Path(v115.path).resolve()}")
        print(f"v116 human approval guardrails store ready at {Path(v116.path).resolve()}")
        print(f"v117 backup & restore manager store ready at {Path(v117.path).resolve()}")
        print(f"v118 system health dashboard store ready at {Path(v118.path).resolve()}")
        print(f"v119 end-to-end integration tests store ready at {Path(v119.path).resolve()}")
        print(f"v120 production readiness & error center store ready at {Path(v120.path).resolve()}")
    elif args.cmd == "init-v1":
        v1.init()
        print(f"v1 database ready at {Path(v1.path).resolve()}")
    elif args.cmd == "init-v2":
        v2.init()
        print(f"v2 memory engine ready at {Path(v2.path).resolve()}")
    elif args.cmd == "init-v4":
        v4.init()
        print(f"v4 scheduler ready at {Path(v4.path).resolve()}")
    elif args.cmd == "init-v5":
        v5.init()
        print(f"v5 API layer ready at {Path(v5.path).resolve()}")
    elif args.cmd == "init-v8":
        v8.init()
        print(f"v8 category discovery ready at {Path(v8.path).resolve()}")
    elif args.cmd == "init-v9":
        v9.init()
        print(f"v9 reporting ready at {Path(v9.path).resolve()}")
    elif args.cmd == "init-v10":
        v10.init()
        print(f"v10 council ready at {Path(v10.path).resolve()}")
    elif args.cmd == "init-v12":
        v12.init()
        print(f"v12 shared memory ready at {Path(v12.path).resolve()}")
    elif args.cmd == "init-v13":
        v13.init()
        print(f"v13 multilingual ready at {Path(v13.path).resolve()}")
    elif args.cmd == "init-v14":
        v14.init()
        print(f"v14 competitor intel ready at {Path(v14.path).resolve()}")
    elif args.cmd == "init-v15":
        v15.init()
        print(f"v15 trust engine ready at {Path(v15.path).resolve()}")
    elif args.cmd == "init-v16":
        v16.init()
        print(f"v16 profit engine ready at {Path(v16.path).resolve()}")
    elif args.cmd == "init-v17":
        v17.init()
        print(f"v17 market engine ready at {Path(v17.path).resolve()}")
    elif args.cmd == "init-v18":
        v18.init()
        print(f"v18 supplier intel ready at {Path(v18.path).resolve()}")
    elif args.cmd == "init-v19":
        v19.init()
        print(f"v19 risk engine ready at {Path(v19.path).resolve()}")
    elif args.cmd == "init-v20":
        v20.init()
        print(f"v20 council orchestrator ready at {Path(v20.path).resolve()}")
    elif args.cmd == "init-v21":
        v21.init()
        print(f"v21 AI gateway ready at {Path(v21.path).resolve()}")
    elif args.cmd == "init-v22":
        v22.init()
        print(f"v22 web research ready at {Path(v22.path).resolve()}")
    elif args.cmd == "init-v23":
        v23.init()
        print(f"v23 connector hub ready at {Path(v23.path).resolve()}")
    elif args.cmd == "init-v24":
        v24.init()
        print(f"v24 product matching ready at {Path(v24.path).resolve()}")
    elif args.cmd == "init-v25":
        v25.init()
        print(f"v25 price intelligence ready at {Path(v25.path).resolve()}")
    elif args.cmd == "init-v26":
        v26.init()
        print(f"v26 demand forecasting ready at {Path(v26.path).resolve()}")
    elif args.cmd == "init-v27":
        v27.init()
        print(f"v27 supplier matching ready at {Path(v27.path).resolve()}")
    elif args.cmd == "init-v28":
        v28.init()
        print(f"v28 product selection ready at {Path(v28.path).resolve()}")
    elif args.cmd == "init-v29":
        v29.init()
        print(f"v29 official verification ready at {Path(v29.path).resolve()}")
    elif args.cmd == "init-v30":
        v30.init()
        print(f"v30 autonomous mission ready at {Path(v30.path).resolve()}")
    elif args.cmd == "init-v31":
        v31.init()
        print(f"v31 learning memory ready at {Path(v31.path).resolve()}")
    elif args.cmd == "init-v32":
        v32.init()
        print(f"v32 category intelligence ready at {Path(v32.path).resolve()}")
    elif args.cmd == "init-v33":
        v33.init()
        print(f"v33 competitor monitor ready at {Path(v33.path).resolve()}")
    elif args.cmd == "init-v34":
        v34.init()
        print(f"v34 anomaly detection ready at {Path(v34.path).resolve()}")
    elif args.cmd == "init-v35":
        v35.init()
        print(f"v35 category taxonomy ready at {Path(v35.path).resolve()}")
    elif args.cmd == "init-v36":
        v36.init()
        print(f"v36 market geography ready at {Path(v36.path).resolve()}")
    elif args.cmd == "init-v37":
        v37.init()
        print(f"v37 compliance intelligence ready at {Path(v37.path).resolve()}")
    elif args.cmd == "init-v38":
        v38.init()
        print(f"v38 profitability scenario ready at {Path(v38.path).resolve()}")
    elif args.cmd == "init-v39":
        v39.init()
        print(f"v39 intelligence dashboard ready at {Path(v39.path).resolve()}")
    elif args.cmd == "init-v40":
        v40.init()
        print(f"v40 master core ready at {Path(v40.path).resolve()}")
    elif args.cmd == "init-v41":
        v41.init()
        print(f"v41 authorized web research ready at {Path(v41.path).resolve()}")
    elif args.cmd == "init-v42":
        v42.init()
        print(f"v42 public API data connectors ready at {Path(v42.path).resolve()}")
    elif args.cmd == "init-v43":
        v43.init()
        print(f"v43 data normalization store ready at {Path(v43.path).resolve()}")
    elif args.cmd == "init-v44":
        v44.init()
        print(f"v44 source reliability scoring store ready at {Path(v44.path).resolve()}")
    elif args.cmd == "init-v45":
        v45.init()
        print(f"v45 change detection store ready at {Path(v45.path).resolve()}")
    elif args.cmd == "init-v46":
        v46.init()
        print(f"v46 competitor product tracking store ready at {Path(v46.path).resolve()}")
    elif args.cmd == "init-v47":
        v47.init()
        print(f"v47 competitor category mapping store ready at {Path(v47.path).resolve()}")
    elif args.cmd == "init-v48":
        v48.init()
        print(f"v48 competitor price tracking store ready at {Path(v48.path).resolve()}")
    elif args.cmd == "init-v49":
        v49.init()
        print(f"v49 market trend radar store ready at {Path(v49.path).resolve()}")
    elif args.cmd == "init-v50":
        v50.init()
        print(f"v50 opportunity discovery store ready at {Path(v50.path).resolve()}")
    elif args.cmd == "init-v51":
        v51.init()
        print(f"v51 product trend radar store ready at {Path(v51.path).resolve()}")
    elif args.cmd == "init-v52":
        v52.init()
        print(f"v52 brand intelligence store ready at {Path(v52.path).resolve()}")
    elif args.cmd == "init-v53":
        v53.init()
        print(f"v53 supplier verification store ready at {Path(v53.path).resolve()}")
    elif args.cmd == "init-v54":
        v54.init()
        print(f"v54 supplier performance tracking store ready at {Path(v54.path).resolve()}")
    elif args.cmd == "init-v55":
        v55.init()
        print(f"v55 supplier price comparison store ready at {Path(v55.path).resolve()}")
    elif args.cmd == "init-v56":
        v56.init()
        print(f"v56 stock & availability intelligence store ready at {Path(v56.path).resolve()}")
    elif args.cmd == "init-v57":
        v57.init()
        print(f"v57 shipping & delivery intelligence store ready at {Path(v57.path).resolve()}")
    elif args.cmd == "init-v58":
        v58.init()
        print(f"v58 marketplace intelligence store ready at {Path(v58.path).resolve()}")
    elif args.cmd == "init-v59":
        v59.init()
        print(f"v59 SEO & search demand intelligence store ready at {Path(v59.path).resolve()}")
    elif args.cmd == "init-v60":
        v60.init()
        print(f"v60 advertising intelligence store ready at {Path(v60.path).resolve()}")
    elif args.cmd == "init-v61":
        v61.init()
        print(f"v61 customer review intelligence store ready at {Path(v61.path).resolve()}")
    elif args.cmd == "init-v62":
        v62.init()
        print(f"v62 promotion & discount intelligence store ready at {Path(v62.path).resolve()}")
    elif args.cmd == "init-v63":
        v63.init()
        print(f"v63 seasonality intelligence store ready at {Path(v63.path).resolve()}")
    elif args.cmd == "init-v64":
        v64.init()
        print(f"v64 cross-border market intelligence store ready at {Path(v64.path).resolve()}")
    elif args.cmd == "init-v65":
        v65.init()
        print(f"v65 EU & Germany compliance monitor store ready at {Path(v65.path).resolve()}")
    elif args.cmd == "init-v66":
        v66.init()
        print(f"v66 currency & FX intelligence store ready at {Path(v66.path).resolve()}")
    elif args.cmd == "init-v67":
        v67.init()
        print(f"v67 landed cost calculator store ready at {Path(v67.path).resolve()}")
    elif args.cmd == "init-v68":
        v68.init()
        print(f"v68 advanced profitability optimizer store ready at {Path(v68.path).resolve()}")
    elif args.cmd == "init-v69":
        v69.init()
        print(f"v69 portfolio manager store ready at {Path(v69.path).resolve()}")
    elif args.cmd == "init-v70":
        v70.init()
        print(f"v70 real-time intelligence command center store ready at {Path(v70.path).resolve()}")
    elif args.cmd == "init-v71":
        v71.init()
        print(f"v71 automated research jobs store ready at {Path(v71.path).resolve()}")
    elif args.cmd == "init-v72":
        v72.init()
        print(f"v72 data quality control store ready at {Path(v72.path).resolve()}")
    elif args.cmd == "init-v73":
        v73.init()
        print(f"v73 multi-agent collaboration store ready at {Path(v73.path).resolve()}")
    elif args.cmd == "init-v74":
        v74.init()
        print(f"v74 hypothesis engine store ready at {Path(v74.path).resolve()}")
    elif args.cmd == "init-v75":
        v75.init()
        print(f"v75 fact checking store ready at {Path(v75.path).resolve()}")
    elif args.cmd == "init-v76":
        v76.init()
        print(f"v76 opportunity ranking store ready at {Path(v76.path).resolve()}")
    elif args.cmd == "init-v77":
        v77.init()
        print(f"v77 product discovery store ready at {Path(v77.path).resolve()}")
    elif args.cmd == "init-v78":
        v78.init()
        print(f"v78 supplier discovery store ready at {Path(v78.path).resolve()}")
    elif args.cmd == "init-v79":
        v79.init()
        print(f"v79 market entry planner store ready at {Path(v79.path).resolve()}")
    elif args.cmd == "init-v80":
        v80.init()
        print(f"v80 workflow automation store ready at {Path(v80.path).resolve()}")
    elif args.cmd == "init-v81":
        v81.init()
        print(f"v81 dynamic price optimization store ready at {Path(v81.path).resolve()}")
    elif args.cmd == "init-v82":
        v82.init()
        print(f"v82 dynamic margin intelligence store ready at {Path(v82.path).resolve()}")
    elif args.cmd == "init-v83":
        v83.init()
        print(f"v83 advertising ROAS intelligence store ready at {Path(v83.path).resolve()}")
    elif args.cmd == "init-v84":
        v84.init()
        print(f"v84 inventory planning store ready at {Path(v84.path).resolve()}")
    elif args.cmd == "init-v85":
        v85.init()
        print(f"v85 demand to purchasing store ready at {Path(v85.path).resolve()}")
    elif args.cmd == "init-v86":
        v86.init()
        print(f"v86 purchasing to selling price store ready at {Path(v86.path).resolve()}")
    elif args.cmd == "init-v87":
        v87.init()
        print(f"v87 cross-sell intelligence store ready at {Path(v87.path).resolve()}")
    elif args.cmd == "init-v88":
        v88.init()
        print(f"v88 bundle intelligence store ready at {Path(v88.path).resolve()}")
    elif args.cmd == "init-v89":
        v89.init()
        print(f"v89 assortment optimization store ready at {Path(v89.path).resolve()}")
    elif args.cmd == "init-v90":
        v90.init()
        print(f"v90 category portfolio intelligence store ready at {Path(v90.path).resolve()}")
    elif args.cmd == "init-v91":
        v91.init()
        print(f"v91 Germany market intelligence store ready at {Path(v91.path).resolve()}")
    elif args.cmd == "init-v92":
        v92.init()
        print(f"v92 EU market intelligence store ready at {Path(v92.path).resolve()}")
    elif args.cmd == "init-v93":
        v93.init()
        print(f"v93 Türkiye market intelligence store ready at {Path(v93.path).resolve()}")
    elif args.cmd == "init-v94":
        v94.init()
        print(f"v94 Gulf market intelligence store ready at {Path(v94.path).resolve()}")
    elif args.cmd == "init-v95":
        v95.init()
        print(f"v95 international expansion intelligence store ready at {Path(v95.path).resolve()}")
    elif args.cmd == "init-v96":
        v96.init()
        print(f"v96 global currency intelligence store ready at {Path(v96.path).resolve()}")
    elif args.cmd == "init-v97":
        v97.init()
        print(f"v97 global customs intelligence store ready at {Path(v97.path).resolve()}")
    elif args.cmd == "init-v98":
        v98.init()
        print(f"v98 global logistics intelligence store ready at {Path(v98.path).resolve()}")
    elif args.cmd == "init-v99":
        v99.init()
        print(f"v99 local marketplace intelligence store ready at {Path(v99.path).resolve()}")
    elif args.cmd == "init-v100":
        v100.init()
        print(f"v100 Buzzard AI intelligence center store ready at {Path(v100.path).resolve()}")
    elif args.cmd == "init-v101":
        v101.init()
        print(f"v101 unified error handling store ready at {Path(v101.path).resolve()}")
    elif args.cmd == "init-v102":
        v102.init()
        print(f"v102 input validation store ready at {Path(v102.path).resolve()}")
    elif args.cmd == "init-v103":
        v103.init()
        print(f"v103 schema validation store ready at {Path(v103.path).resolve()}")
    elif args.cmd == "init-v104":
        v104.init()
        print(f"v104 API retry & backoff store ready at {Path(v104.path).resolve()}")
    elif args.cmd == "init-v105":
        v105.init()
        print(f"v105 rate limit manager store ready at {Path(v105.path).resolve()}")
    elif args.cmd == "init-v106":
        v106.init()
        print(f"v106 timeout & circuit breaker store ready at {Path(v106.path).resolve()}")
    elif args.cmd == "init-v107":
        v107.init()
        print(f"v107 credential & secret validation store ready at {Path(v107.path).resolve()}")
    elif args.cmd == "init-v108":
        v108.init()
        print(f"v108 data integrity checks store ready at {Path(v108.path).resolve()}")
    elif args.cmd == "init-v109":
        v109.init()
        print(f"v109 duplicate & conflict resolution store ready at {Path(v109.path).resolve()}")
    elif args.cmd == "init-v110":
        v110.init()
        print(f"v110 source freshness monitor store ready at {Path(v110.path).resolve()}")
    elif args.cmd == "init-v111":
        v111.init()
        print(f"v111 data provenance & lineage store ready at {Path(v111.path).resolve()}")
    elif args.cmd == "init-v112":
        v112.init()
        print(f"v112 audit log integrity store ready at {Path(v112.path).resolve()}")
    elif args.cmd == "init-v113":
        v113.init()
        print(f"v113 agent health monitor store ready at {Path(v113.path).resolve()}")
    elif args.cmd == "init-v114":
        v114.init()
        print(f"v114 mission recovery manager store ready at {Path(v114.path).resolve()}")
    elif args.cmd == "init-v115":
        v115.init()
        print(f"v115 queue & job recovery store ready at {Path(v115.path).resolve()}")
    elif args.cmd == "init-v116":
        v116.init()
        print(f"v116 human approval guardrails store ready at {Path(v116.path).resolve()}")
    elif args.cmd == "init-v117":
        v117.init()
        print(f"v117 backup & restore manager store ready at {Path(v117.path).resolve()}")
    elif args.cmd == "init-v118":
        v118.init()
        print(f"v118 system health dashboard store ready at {Path(v118.path).resolve()}")
    elif args.cmd == "init-v119":
        v119.init()
        print(f"v119 end-to-end integration tests store ready at {Path(v119.path).resolve()}")
    elif args.cmd == "init-v120":
        v120.init()
        print(f"v120 production readiness & error center store ready at {Path(v120.path).resolve()}")
    elif args.cmd == "seed":
        v1.init()
        v2.init()
        v1.seed_categories(SEED_CATEGORIES)
        count = v2.seed_categories()
        print(f"Seeded {count} legacy main categories into v1 and v2.")
    elif args.cmd == "seed-de":
        v1.init()
        v2.init()
        count_v1 = v1.seed_categories_de()
        count_v2 = v2.seed_categories_de()
        print(f"Seeded {count_v1} German main categories into v1 and {count_v2} into v2.")
    elif args.cmd == "seed-tasks":
        v4.init()
        count = v4.seed_tasks()
        print(f"{count} Platzhalter-Aufgaben für TR-Kategorien erstellt.")
    elif args.cmd == "seed-tasks-de":
        v4.init()
        count = v4.seed_tasks_de()
        print(f"{count} Platzhalter-Aufgaben für DE-Kategorien erstellt.")
    elif args.cmd == "tasks":
        v4.init()
        print(v4.list_tasks())
    elif args.cmd == "add-task":
        v4.init()
        print(
            v4.add_task(
                args.category,
                args.subcategory,
                args.url,
                args.country,
                args.platform,
                args.interval,
                args.priority,
            )
        )
    elif args.cmd == "run":
        v4.init()
        print(v4.run_due())
    elif args.cmd == "sources":
        v5.init()
        print(v5.list_sources())
    elif args.cmd == "add-api":
        v5.init()
        print(
            v5.add_source(
                args.name,
                args.base_url,
                args.category,
                args.country,
                args.platform,
                args.interval,
                args.priority,
                args.auth_env,
            )
        )
    elif args.cmd == "test-apis":
        v5.init()
        print(v5.test_all())
    elif args.cmd == "schema":
        print(v5.schema_example())
    elif args.cmd == "analyze":
        v6.init()
        print(v6.full_report())
    elif args.cmd == "demo":
        v6.demo()
        print("Demo-Beobachtungen in v2 Memory gespeichert.")
    elif args.cmd == "demo-trends":
        v7.demo()
        print("Demo-Zeitreihen in v2 Memory gespeichert.")
    elif args.cmd == "trends":
        v7.init()
        print(v7.report())
    elif args.cmd == "sync-categories":
        v8.init()
        count = v8.sync_known_categories()
        print(f"{count} bekannte Buzzard-Kategorien synchronisiert.")
    elif args.cmd == "demo-discovery":
        v8.init()
        v8.sync_known_categories()
        v8.demo()
        print("Demo-Kategorie-Signale gespeichert.")
    elif args.cmd == "discover":
        v8.init()
        print(v8.report())
    elif args.cmd == "add-category":
        v8.init()
        print(
            v8.add_candidate(
                args.name,
                args.parent,
                args.level,
                args.source,
                args.confidence,
            )
        )
    elif args.cmd == "refresh-alerts":
        count = v9.refresh_alerts()
        print(f"{count} aktive Warnungen aktualisiert.")
    elif args.cmd == "intel-report":
        v9.init()
        print(v9.report())
    elif args.cmd == "alerts":
        v9.init()
        print(v9.alerts())
    elif args.cmd == "queue":
        v9.init()
        print(v9.priority_queue())
    elif args.cmd == "demo-reporting":
        count = v9.demo()
        print(f"Demo-Daten geladen, {count} Warnungen erzeugt.")
    elif args.cmd == "inbox":
        v10.init()
        print(v10.inbox())
    elif args.cmd == "council-board":
        v10.init()
        print(v10.council_board())
    elif args.cmd == "demo-council":
        v10.init()
        v10.demo()
        print("Demo-Intelligence-Ereignisse erstellt.")
    elif args.cmd == "sync-council":
        imported = v10.sync_from_alerts(v9)
        print(f"{imported} Warnungen in den Council-Posteingang übernommen.")
    elif args.cmd == "council-event":
        v10.init()
        print(
            v10.create_event(
                args.type,
                args.title,
                args.details,
                args.source,
                args.priority,
                args.from_agent,
            )
        )
    elif args.cmd == "council-assign":
        v10.init()
        print(v10.assign(args.event_id, args.agent))
    elif args.cmd == "council-review":
        v10.init()
        print(v10.review(args.event_id, args.decision, args.note, args.agent))
    elif args.cmd == "voice":
        from voice.server import main as voice_main

        print(f"Voice interface: http://{args.host}:{args.port}")
        voice_main(host=args.host, port=args.port)
    elif args.cmd == "remember":
        v12.init()
        print(
            v12.add(
                args.type,
                args.text,
                args.source,
                args.confidence,
                args.tags,
                args.entity,
            )
        )
    elif args.cmd == "recall":
        v12.init()
        print(v12.search(args.query))
    elif args.cmd == "shared-timeline":
        v12.init()
        print(v12.timeline())
    elif args.cmd == "memory-status":
        v12.init()
        print(v12.update_status(args.id, args.status, args.actor))
    elif args.cmd == "shared-link":
        v12.init()
        print(v12.link(args.from_id, args.to_id, args.relation))
    elif args.cmd == "term-add":
        v13.init()
        print(
            v13.add(
                args.language,
                args.text,
                args.canonical,
                args.entity,
                args.source,
                args.confidence,
            )
        )
    elif args.cmd == "ml-demo":
        v13.init()
        v13.demo()
        print("Demo-Mehrsprachdaten gespeichert.")
    elif args.cmd == "ml-report":
        v13.init()
        print(v13.report())
    elif args.cmd == "competitor-add":
        v14.init()
        print(v14.add_competitor(args.name, args.country, args.source))
    elif args.cmd == "competitor-product":
        v14.init()
        print(
            v14.add_product(
                args.competitor,
                args.category,
                args.name,
                args.brand,
                args.price,
                args.currency,
                args.popularity,
                args.source,
            )
        )
    elif args.cmd == "competitor-demo":
        v14.init()
        v14.demo()
        print("Demo-Wettbewerbsdaten gespeichert.")
    elif args.cmd == "competitor-report":
        v14.init()
        print(v14.report())
    elif args.cmd == "trust-product":
        v15.init()
        print(v15.add_product(args.name, args.brand, args.supplier, args.source))
    elif args.cmd == "trust-evidence":
        v15.init()
        print(v15.add_evidence(args.product_id, args.type, args.issuer, args.reference))
    elif args.cmd == "trust-verify":
        v15.init()
        print(v15.verify(args.product_id, args.status, args.note))
    elif args.cmd == "trust-demo":
        v15.init()
        v15.demo()
        print("Demo-Vertrauensdaten gespeichert.")
    elif args.cmd == "trust-report":
        v15.init()
        print(v15.report())
    elif args.cmd == "profit-calc":
        v16.init()
        print(
            v16.calculate(
                args.name,
                args.sale,
                args.cost,
                args.shipping,
                args.marketplace,
                args.payment,
                args.ads,
                args.packaging,
                args.other,
                args.tax,
            )
        )
    elif args.cmd == "profit-demo":
        v16.init()
        v16.demo()
        print("Demo-Rentabilitätsdaten gespeichert.")
    elif args.cmd == "profit-report":
        v16.init()
        print(v16.report())
    elif args.cmd == "market-add":
        v17.init()
        print(
            v17.add_market(
                args.country,
                args.market,
                args.demand,
                args.competition,
                args.logistics,
                args.risk,
            )
        )
    elif args.cmd == "opportunity-add":
        v17.init()
        print(
            v17.add_opportunity(
                args.country,
                args.category,
                args.product,
                args.demand,
                args.competition,
                args.margin,
                args.logistics,
                args.risk,
            )
        )
    elif args.cmd == "market-demo":
        v17.init()
        v17.demo()
        print("Demo-Marktdaten gespeichert.")
    elif args.cmd == "market-report":
        v17.init()
        print(v17.report())
    elif args.cmd == "supplier-add":
        v18.init()
        print(v18.add_supplier(args.name, args.country, args.b2b, args.source))
    elif args.cmd == "supplier-capability":
        v18.init()
        print(
            v18.add_capability(
                args.supplier,
                args.capability,
                args.status,
                args.evidence,
            )
        )
    elif args.cmd == "supplier-demo":
        v18.init()
        v18.demo()
        print("Demo-Lieferantendaten gespeichert.")
    elif args.cmd == "supplier-report":
        v18.init()
        print(v18.report())
    elif args.cmd == "risk-add":
        v19.init()
        print(
            v19.add_risk(
                args.entity,
                args.type,
                args.severity,
                args.details,
                args.source,
                args.country,
            )
        )
    elif args.cmd == "risk-verify":
        v19.init()
        print(v19.verify(args.risk_id, args.status, args.note, args.reviewer))
    elif args.cmd == "risk-demo":
        v19.init()
        v19.demo()
        print("Demo-Risikodaten gespeichert.")
    elif args.cmd == "risk-report":
        v19.init()
        print(v19.report())
    elif args.cmd == "orch-create":
        v20.init()
        print(
            v20.create_task(
                args.title,
                args.details,
                args.priority,
                args.created_by,
            )
        )
    elif args.cmd == "orch-assign":
        v20.init()
        print(v20.assign(args.task_id, args.agent))
    elif args.cmd == "orch-opinion":
        v20.init()
        print(
            v20.add_opinion(
                args.task_id,
                args.agent,
                args.decision,
                args.confidence,
                args.note,
            )
        )
    elif args.cmd == "orch-demo":
        v20.init()
        v20.demo()
        print("Demo-Council-Orchestrierung gespeichert.")
    elif args.cmd == "orch-board":
        v20.init()
        print(v20.board())
    elif args.cmd == "ai-add-provider":
        v21.init()
        print(
            v21.add_provider(
                args.name,
                args.base_url,
                args.model,
                args.api_key_env,
            )
        )
    elif args.cmd == "ai-providers":
        v21.init()
        print(v21.providers())
    elif args.cmd == "ai-demo":
        v21.init()
        print(v21.demo())
    elif args.cmd == "research-create":
        v22.init()
        print(v22.create_research(args.query, args.purpose))
    elif args.cmd == "research-source":
        v22.init()
        print(v22.add_source(args.research_id, args.url, args.title, args.domain))
    elif args.cmd == "research-finding":
        v22.init()
        print(
            v22.add_finding(
                args.research_id,
                args.source_id,
                args.claim,
                args.confidence,
                args.note,
            )
        )
    elif args.cmd == "research-demo":
        v22.init()
        v22.demo()
        print("Demo-Forschungsdaten gespeichert.")
    elif args.cmd == "research-report":
        v22.init()
        print(v22.report())
    elif args.cmd == "connector-add":
        v23.init()
        print(v23.add_connector(args.name, args.kind, args.base_url, args.key_env))
    elif args.cmd == "connector-capability":
        v23.init()
        print(v23.add_capability(args.connector, args.name, args.direction))
    elif args.cmd == "connector-health":
        v23.init()
        print(v23.set_health(args.connector, args.status, args.note))
    elif args.cmd == "connector-demo":
        v23.init()
        v23.demo()
        print("Demo-Connector-Daten gespeichert.")
    elif args.cmd == "connector-report":
        v23.init()
        print(v23.report())
    elif args.cmd == "match-canonical":
        v24.init()
        print(v24.add_canonical(args.name, args.brand, args.category, args.variant))
    elif args.cmd == "match-listing":
        v24.init()
        print(
            v24.add_listing(
                args.canonical_id,
                args.source,
                args.name,
                args.brand,
                args.category,
                args.variant,
                args.ean,
                args.gtin,
                args.mpn,
                args.oem,
                args.url,
            )
        )
    elif args.cmd == "match-analyze":
        v24.init()
        print(v24.match(args.listing_id, args.candidate_id))
    elif args.cmd == "match-demo":
        v24.init()
        v24.demo()
        print("Demo-Produkt-Matching-Daten gespeichert.")
    elif args.cmd == "match-report":
        v24.init()
        print(v24.report())
    elif args.cmd == "price-add":
        v25.init()
        print(
            v25.add_price(
                args.product_id,
                args.seller,
                args.price,
                args.currency,
                args.source,
                args.shipping,
                args.vat_included,
            )
        )
    elif args.cmd == "price-changes":
        v25.init()
        print(v25.changes(args.product_id))
    elif args.cmd == "price-demo":
        v25.init()
        v25.demo()
        print("Demo-Preisbeobachtungen gespeichert.")
    elif args.cmd == "price-report":
        v25.init()
        print(v25.report())
    elif args.cmd == "demand-observation":
        v26.init()
        print(v26.add_observation(args.product_id, args.value, args.period))
    elif args.cmd == "demand-forecast":
        v26.init()
        print(v26.forecast(args.product_id, args.window))
    elif args.cmd == "demand-demo":
        v26.init()
        v26.demo()
        print("Demo-Nachfragedaten gespeichert.")
    elif args.cmd == "demand-report":
        v26.init()
        print(v26.report())
    elif args.cmd == "supplier-match-add":
        v27.init()
        print(
            v27.add_supplier(
                args.name,
                args.category,
                args.trust,
                args.integration,
                args.logistics,
                args.risk,
                args.dropshipping,
                args.whitelabel,
                args.evidence,
            )
        )
    elif args.cmd == "supplier-match-run":
        v27.init()
        print(v27.match(args.product, args.category))
    elif args.cmd == "supplier-match-demo":
        v27.init()
        v27.demo()
        print("Demo-Lieferanten-Matching gespeichert.")
    elif args.cmd == "supplier-match-report":
        v27.init()
        print(v27.report())
    elif args.cmd == "selection-add":
        v28.init()
        print(
            v28.add_product(
                args.name,
                args.category,
                args.profit,
                args.demand,
                args.price,
                args.market,
                args.supplier,
                args.risk,
                args.trust,
            )
        )
    elif args.cmd == "selection-demo":
        v28.init()
        v28.demo()
        print("Demo-Produktauswahl gespeichert.")
    elif args.cmd == "selection-report":
        v28.init()
        print(v28.report())
    elif args.cmd == "verify-claim":
        v29.init()
        print(v29.add_claim(args.entity, args.text, args.category))
    elif args.cmd == "verify-source":
        v29.init()
        print(
            v29.add_source(
                args.claim_id,
                args.type,
                args.url,
                args.publisher,
                args.published,
                args.note,
            )
        )
    elif args.cmd == "verify-set":
        v29.init()
        print(v29.verify(args.claim_id, args.status, args.note))
    elif args.cmd == "verify-demo":
        v29.init()
        v29.demo()
        print("Demo-Verifizierungsdaten gespeichert.")
    elif args.cmd == "verify-report":
        v29.init()
        print(v29.report())
    elif args.cmd == "mission-create":
        v30.init()
        print(v30.create_mission(args.title, args.details, args.priority))
    elif args.cmd == "mission-result":
        v30.init()
        print(
            v30.add_result(
                args.task_id,
                args.agent,
                args.result,
                args.confidence,
                args.evidence,
            )
        )
    elif args.cmd == "mission-approve":
        v30.init()
        print(v30.approve(args.mission_id, args.decision, args.note))
    elif args.cmd == "mission-demo":
        v30.init()
        v30.demo()
        print("Demo-Mission angelegt.")
    elif args.cmd == "mission-board":
        v30.init()
        print(v30.board())
    elif args.cmd == "learn-remember":
        v31.init()
        print(v31.remember(args.kind, args.topic, args.text, args.confidence, args.source))
    elif args.cmd == "learn-lesson":
        v31.init()
        print(v31.lesson(args.topic, args.text))
    elif args.cmd == "learn-recall":
        v31.init()
        print(v31.recall(args.query, args.limit))
    elif args.cmd == "learn-status":
        v31.init()
        print(v31.set_status(args.memory_id, args.status))
    elif args.cmd == "learn-demo":
        v31.init()
        v31.demo()
        print("Demo-Learning-Memory gespeichert.")
    elif args.cmd == "learn-report":
        v31.init()
        print(v31.report())
    elif args.cmd == "category-seed":
        v32.init()
        print(v32.seed())
    elif args.cmd == "category-signal":
        v32.init()
        print(
            v32.add_signal(
                args.category,
                args.demand,
                args.competition,
                args.supplier,
                args.margin,
                args.risk,
            )
        )
    elif args.cmd == "category-owned":
        v32.init()
        print(v32.set_owned(args.category))
    elif args.cmd == "category-queue":
        v32.init()
        print(v32.queue())
    elif args.cmd == "category-report":
        v32.init()
        print(v32.report())
    elif args.cmd == "category-demo":
        v32.init()
        v32.demo()
        print("Demo-Kategorie-Intelligence gespeichert.")
    elif args.cmd == "rivals-add":
        v33.init()
        print(v33.add_competitor(args.name, args.url, args.market))
    elif args.cmd == "rivals-category":
        v33.init()
        print(v33.add_category(args.competitor, args.category, args.count, args.url))
    elif args.cmd == "rivals-product":
        v33.init()
        print(
            v33.add_product(
                args.competitor,
                args.category,
                args.name,
                args.price,
                args.currency,
                args.signal,
                args.url,
            )
        )
    elif args.cmd == "rivals-changes":
        v33.init()
        print(v33.changes(args.competitor))
    elif args.cmd == "rivals-demo":
        v33.init()
        v33.demo()
        print("Demo-Wettbewerber-Intelligence gespeichert.")
    elif args.cmd == "rivals-report":
        v33.init()
        print(v33.report())
    elif args.cmd == "anomaly-demo":
        v34.init()
        v34.demo()
        print("Demo-Anomaly-Detection gespeichert.")
    elif args.cmd == "anomaly-report":
        v34.init()
        print(v34.report())
    elif args.cmd == "taxonomy-demo":
        v35.init()
        v35.demo()
        print("Demo-Kategorie-Taxonomie gespeichert.")
    elif args.cmd == "taxonomy-report":
        v35.init()
        print(v35.report())
    elif args.cmd == "geo-demo":
        v36.init()
        v36.demo()
        print("Demo-Markt-Geografie gespeichert.")
    elif args.cmd == "geo-report":
        v36.init()
        print(v36.report())
    elif args.cmd == "compliance-demo":
        v37.init()
        v37.demo()
        print("Demo-Compliance-Intelligence gespeichert.")
    elif args.cmd == "compliance-report":
        v37.init()
        print(v37.report())
    elif args.cmd == "scenario-demo":
        v38.init()
        v38.demo()
        print("Demo-Profitabilitäts-Szenario gespeichert.")
    elif args.cmd == "scenario-report":
        v38.init()
        print(v38.report())
    elif args.cmd == "idash-demo":
        v39.init()
        v39.demo()
        print("Demo-Intelligence-Dashboard gespeichert.")
    elif args.cmd == "idash-report":
        v39.init()
        print(v39.report())
    elif args.cmd == "master-demo":
        v40.init()
        v40.demo()
        print("Demo-Master-Core gespeichert.")
    elif args.cmd == "master-report":
        v40.init()
        print(v40.report())
    elif args.cmd == "authres-demo":
        v41.init()
        v41.demo()
        print("Demo-Autorisierte Web-Recherche gespeichert.")
    elif args.cmd == "authres-report":
        v41.init()
        print(v41.report())
    elif args.cmd == "pubconn-demo":
        v42.init()
        v42.demo()
        print("Demo-Public-API-Connectors gespeichert.")
    elif args.cmd == "pubconn-report":
        v42.init()
        print(v42.report())
    elif args.cmd == "norm-demo":
        v43.init()
        v43.demo()
        print("Demo-Daten-Normalisierung gespeichert.")
    elif args.cmd == "norm-report":
        v43.init()
        print(v43.report())
    elif args.cmd == "srscore-demo":
        v44.init()
        v44.demo()
        print("Demo-Quellen-Zuverlässigkeit gespeichert.")
    elif args.cmd == "srscore-report":
        v44.init()
        print(v44.report())
    elif args.cmd == "cdetect-demo":
        v45.init()
        v45.demo()
        print("Demo-Änderungserkennung gespeichert.")
    elif args.cmd == "cdetect-report":
        v45.init()
        print(v45.report())
    elif args.cmd == "rprod-demo":
        v46.init()
        v46.demo()
        print("Demo-Wettbewerber-Produkt-Tracking gespeichert.")
    elif args.cmd == "rprod-report":
        v46.init()
        print(v46.report())
    elif args.cmd == "rcatmap-demo":
        v47.init()
        v47.demo()
        print("Demo-Wettbewerber-Kategorie-Mapping gespeichert.")
    elif args.cmd == "rcatmap-report":
        v47.init()
        print(v47.report())
    elif args.cmd == "rprice-demo":
        v48.init()
        v48.demo()
        print("Demo-Wettbewerber-Preis-Tracking gespeichert.")
    elif args.cmd == "rprice-report":
        v48.init()
        print(v48.report())
    elif args.cmd == "mradar-demo":
        v49.init()
        v49.demo()
        print("Demo-Markt-Trend-Radar gespeichert.")
    elif args.cmd == "mradar-report":
        v49.init()
        print(v49.report())
    elif args.cmd == "oppdisc-demo":
        v50.init()
        v50.demo()
        print("Demo-Chancen-Entdeckung gespeichert.")
    elif args.cmd == "oppdisc-report":
        v50.init()
        print(v50.report())
    elif args.cmd == "pradar-demo":
        v51.init()
        v51.demo()
        print("Demo-Produkt-Trend-Radar gespeichert.")
    elif args.cmd == "pradar-report":
        v51.init()
        print(v51.report())
    elif args.cmd == "brand-demo":
        v52.init()
        v52.demo()
        print("Demo-Marken-Intelligence gespeichert.")
    elif args.cmd == "brand-report":
        v52.init()
        print(v52.report())
    elif args.cmd == "sverify-demo":
        v53.init()
        v53.demo()
        print("Demo-Lieferanten-Verifizierung gespeichert.")
    elif args.cmd == "sverify-report":
        v53.init()
        print(v53.report())
    elif args.cmd == "sperf-demo":
        v54.init()
        v54.demo()
        print("Demo-Lieferanten-Performance gespeichert.")
    elif args.cmd == "sperf-report":
        v54.init()
        print(v54.report())
    elif args.cmd == "sprice-demo":
        v55.init()
        v55.demo()
        print("Demo-Lieferanten-Preisvergleich gespeichert.")
    elif args.cmd == "sprice-report":
        v55.init()
        print(v55.report())
    elif args.cmd == "stock-demo":
        v56.init()
        v56.demo()
        print("Demo-Bestand-Intelligence gespeichert.")
    elif args.cmd == "stock-report":
        v56.init()
        print(v56.report())
    elif args.cmd == "ship-demo":
        v57.init()
        v57.demo()
        print("Demo-Versand-Intelligence gespeichert.")
    elif args.cmd == "ship-report":
        v57.init()
        print(v57.report())
    elif args.cmd == "mplace-demo":
        v58.init()
        v58.demo()
        print("Demo-Marktplatz-Intelligence gespeichert.")
    elif args.cmd == "mplace-report":
        v58.init()
        print(v58.report())
    elif args.cmd == "seo-demo":
        v59.init()
        v59.demo()
        print("Demo-SEO-Intelligence gespeichert.")
    elif args.cmd == "seo-report":
        v59.init()
        print(v59.report())
    elif args.cmd == "advert-demo":
        v60.init()
        v60.demo()
        print("Demo-Werbe-Intelligence gespeichert.")
    elif args.cmd == "advert-report":
        v60.init()
        print(v60.report())
    elif args.cmd == "revintel-demo":
        v61.init()
        v61.demo()
        print("Demo-Kundenbewertungs-Intelligence gespeichert.")
    elif args.cmd == "revintel-report":
        v61.init()
        print(v61.report())
    elif args.cmd == "promo-demo":
        v62.init()
        v62.demo()
        print("Demo-Promotion-Intelligence gespeichert.")
    elif args.cmd == "promo-report":
        v62.init()
        print(v62.report())
    elif args.cmd == "season-demo":
        v63.init()
        v63.demo()
        print("Demo-Saisonalitäts-Intelligence gespeichert.")
    elif args.cmd == "season-report":
        v63.init()
        print(v63.report())
    elif args.cmd == "xborder-demo":
        v64.init()
        v64.demo()
        print("Demo-Grenzüberschreitende Markt-Intelligence gespeichert.")
    elif args.cmd == "xborder-report":
        v64.init()
        print(v64.report())
    elif args.cmd == "eucomp-demo":
        v65.init()
        v65.demo()
        print("Demo-EU-Compliance-Monitor gespeichert.")
    elif args.cmd == "eucomp-report":
        v65.init()
        print(v65.report())
    elif args.cmd == "fx-demo":
        v66.init()
        v66.demo()
        print("Demo-Währungs-Intelligence gespeichert.")
    elif args.cmd == "fx-report":
        v66.init()
        print(v66.report())
    elif args.cmd == "lcost-demo":
        v67.init()
        v67.demo()
        print("Demo-Landed-Cost-Rechner gespeichert.")
    elif args.cmd == "lcost-report":
        v67.init()
        print(v67.report())
    elif args.cmd == "profopt-demo":
        v68.init()
        v68.demo()
        print("Demo-Profitabilitäts-Optimierer gespeichert.")
    elif args.cmd == "profopt-report":
        v68.init()
        print(v68.report())
    elif args.cmd == "port-demo":
        v69.init()
        v69.demo()
        print("Demo-Portfolio-Manager gespeichert.")
    elif args.cmd == "port-report":
        v69.init()
        print(v69.report())
    elif args.cmd == "cmdctr-demo":
        v70.init()
        v70.demo()
        print("Demo-Command-Center gespeichert.")
    elif args.cmd == "cmdctr-report":
        v70.init()
        print(v70.report())
    elif args.cmd == "rjobs-demo":
        v71.init()
        v71.demo()
        print("Demo-Automatisierte-Recherche-Jobs gespeichert.")
    elif args.cmd == "rjobs-report":
        v71.init()
        print(v71.report())
    elif args.cmd == "dqc-demo":
        v72.init()
        v72.demo()
        print("Demo-Datenqualitäts-Kontrolle gespeichert.")
    elif args.cmd == "dqc-report":
        v72.init()
        print(v72.report())
    elif args.cmd == "magent-demo":
        v73.init()
        v73.demo()
        print("Demo-Multi-Agent-Kollaboration gespeichert.")
    elif args.cmd == "magent-report":
        v73.init()
        print(v73.report())
    elif args.cmd == "hypoth-demo":
        v74.init()
        v74.demo()
        print("Demo-Hypothesen-Engine gespeichert.")
    elif args.cmd == "hypoth-report":
        v74.init()
        print(v74.report())
    elif args.cmd == "fcheck-demo":
        v75.init()
        v75.demo()
        print("Demo-Faktenprüfung gespeichert.")
    elif args.cmd == "fcheck-report":
        v75.init()
        print(v75.report())
    elif args.cmd == "oprank-demo":
        v76.init()
        v76.demo()
        print("Demo-Chancen-Ranking gespeichert.")
    elif args.cmd == "oprank-report":
        v76.init()
        print(v76.report())
    elif args.cmd == "pdisc-demo":
        v77.init()
        v77.demo()
        print("Demo-Produkt-Entdeckung gespeichert.")
    elif args.cmd == "pdisc-report":
        v77.init()
        print(v77.report())
    elif args.cmd == "sdisc-demo":
        v78.init()
        v78.demo()
        print("Demo-Lieferanten-Entdeckung gespeichert.")
    elif args.cmd == "sdisc-report":
        v78.init()
        print(v78.report())
    elif args.cmd == "mentry-demo":
        v79.init()
        v79.demo()
        print("Demo-Markteintritts-Planer gespeichert.")
    elif args.cmd == "mentry-report":
        v79.init()
        print(v79.report())
    elif args.cmd == "wflow-demo":
        v80.init()
        v80.demo()
        print("Demo-Workflow-Automatisierung gespeichert.")
    elif args.cmd == "wflow-report":
        v80.init()
        print(v80.report())
    elif args.cmd == "dprice-demo":
        v81.init()
        v81.demo()
        print("Demo-Dynamische-Preisoptimierung gespeichert.")
    elif args.cmd == "dprice-report":
        v81.init()
        print(v81.report())
    elif args.cmd == "dmargin-demo":
        v82.init()
        v82.demo()
        print("Demo-Dynamische-Margen-Intelligence gespeichert.")
    elif args.cmd == "dmargin-report":
        v82.init()
        print(v82.report())
    elif args.cmd == "roas-demo":
        v83.init()
        v83.demo()
        print("Demo-ROAS-Intelligence gespeichert.")
    elif args.cmd == "roas-report":
        v83.init()
        print(v83.report())
    elif args.cmd == "invplan-demo":
        v84.init()
        v84.demo()
        print("Demo-Bestandsplanung gespeichert.")
    elif args.cmd == "invplan-report":
        v84.init()
        print(v84.report())
    elif args.cmd == "dpurch-demo":
        v85.init()
        v85.demo()
        print("Demo-Nachfrage-zu-Einkauf gespeichert.")
    elif args.cmd == "dpurch-report":
        v85.init()
        print(v85.report())
    elif args.cmd == "psell-demo":
        v86.init()
        v86.demo()
        print("Demo-Einkauf-zu-Verkaufspreis gespeichert.")
    elif args.cmd == "psell-report":
        v86.init()
        print(v86.report())
    elif args.cmd == "xsell-demo":
        v87.init()
        v87.demo()
        print("Demo-Cross-Sell-Intelligence gespeichert.")
    elif args.cmd == "xsell-report":
        v87.init()
        print(v87.report())
    elif args.cmd == "bundle-demo":
        v88.init()
        v88.demo()
        print("Demo-Bundle-Intelligence gespeichert.")
    elif args.cmd == "bundle-report":
        v88.init()
        print(v88.report())
    elif args.cmd == "assort-demo":
        v89.init()
        v89.demo()
        print("Demo-Sortiments-Optimierung gespeichert.")
    elif args.cmd == "assort-report":
        v89.init()
        print(v89.report())
    elif args.cmd == "catport-demo":
        v90.init()
        v90.demo()
        print("Demo-Kategorie-Portfolio-Intelligence gespeichert.")
    elif args.cmd == "catport-report":
        v90.init()
        print(v90.report())
    elif args.cmd == "demark-demo":
        v91.init()
        v91.demo()
        print("Demo-Deutschland-Markt-Intelligence gespeichert.")
    elif args.cmd == "demark-report":
        v91.init()
        print(v91.report())
    elif args.cmd == "eumark-demo":
        v92.init()
        v92.demo()
        print("Demo-EU-Markt-Intelligence gespeichert.")
    elif args.cmd == "eumark-report":
        v92.init()
        print(v92.report())
    elif args.cmd == "trmark-demo":
        v93.init()
        v93.demo()
        print("Demo-Türkei-Markt-Intelligence gespeichert.")
    elif args.cmd == "trmark-report":
        v93.init()
        print(v93.report())
    elif args.cmd == "gulfmark-demo":
        v94.init()
        v94.demo()
        print("Demo-Golf-Markt-Intelligence gespeichert.")
    elif args.cmd == "gulfmark-report":
        v94.init()
        print(v94.report())
    elif args.cmd == "intl-demo":
        v95.init()
        v95.demo()
        print("Demo-Internationale-Expansion gespeichert.")
    elif args.cmd == "intl-report":
        v95.init()
        print(v95.report())
    elif args.cmd == "gcfx-demo":
        v96.init()
        v96.demo()
        print("Demo-Globale-Währungs-Intelligence gespeichert.")
    elif args.cmd == "gcfx-report":
        v96.init()
        print(v96.report())
    elif args.cmd == "gcustoms-demo":
        v97.init()
        v97.demo()
        print("Demo-Globale-Zoll-Intelligence gespeichert.")
    elif args.cmd == "gcustoms-report":
        v97.init()
        print(v97.report())
    elif args.cmd == "glog-demo":
        v98.init()
        v98.demo()
        print("Demo-Globale-Logistik-Intelligence gespeichert.")
    elif args.cmd == "glog-report":
        v98.init()
        print(v98.report())
    elif args.cmd == "lmarket-demo":
        v99.init()
        v99.demo()
        print("Demo-Lokale-Marktplatz-Intelligence gespeichert.")
    elif args.cmd == "lmarket-report":
        v99.init()
        print(v99.report())
    elif args.cmd == "aicenter-demo":
        v100.init()
        v100.demo()
        print("Demo-AI-Intelligence-Center gespeichert.")
    elif args.cmd == "aicenter-report":
        v100.init()
        print(v100.report())
    elif args.cmd == "uerr-demo":
        v101.init()
        v101.demo()
        print("Demo-Unified-Error-Handling gespeichert.")
    elif args.cmd == "uerr-report":
        v101.init()
        print(v101.report())
    elif args.cmd == "inval-demo":
        v102.init()
        v102.demo()
        print("Demo-Input-Validierung gespeichert.")
    elif args.cmd == "inval-report":
        v102.init()
        print(v102.report())
    elif args.cmd == "svalid-demo":
        v103.init()
        v103.demo()
        print("Demo-Schema-Validierung gespeichert.")
    elif args.cmd == "svalid-report":
        v103.init()
        print(v103.report())
    elif args.cmd == "retry-demo":
        v104.init()
        v104.demo()
        print("Demo-API-Retry-Backoff gespeichert.")
    elif args.cmd == "retry-report":
        v104.init()
        print(v104.report())
    elif args.cmd == "ratelimit-demo":
        v105.init()
        v105.demo()
        print("Demo-Rate-Limit-Manager gespeichert.")
    elif args.cmd == "ratelimit-report":
        v105.init()
        print(v105.report())
    elif args.cmd == "cbreak-demo":
        v106.init()
        v106.demo()
        print("Demo-Circuit-Breaker gespeichert.")
    elif args.cmd == "cbreak-report":
        v106.init()
        print(v106.report())
    elif args.cmd == "credval-demo":
        v107.init()
        v107.demo()
        print("Demo-Credential-Validierung gespeichert.")
    elif args.cmd == "credval-report":
        v107.init()
        print(v107.report())
    elif args.cmd == "dinteg-demo":
        v108.init()
        v108.demo()
        print("Demo-Datenintegritäts-Checks gespeichert.")
    elif args.cmd == "dinteg-report":
        v108.init()
        print(v108.report())
    elif args.cmd == "conflict-demo":
        v109.init()
        v109.demo()
        print("Demo-Konflikt-Auflösung gespeichert.")
    elif args.cmd == "conflict-report":
        v109.init()
        print(v109.report())
    elif args.cmd == "fresh-demo":
        v110.init()
        v110.demo()
        print("Demo-Quellen-Aktualität gespeichert.")
    elif args.cmd == "fresh-report":
        v110.init()
        print(v110.report())
    elif args.cmd == "proven-demo":
        v111.init()
        v111.demo()
        print("Demo-Daten-Herkunft gespeichert.")
    elif args.cmd == "proven-report":
        v111.init()
        print(v111.report())
    elif args.cmd == "audit-demo":
        v112.init()
        v112.demo()
        print("Demo-Audit-Log-Integrität gespeichert.")
    elif args.cmd == "audit-report":
        v112.init()
        print(v112.report())
    elif args.cmd == "aghealth-demo":
        v113.init()
        v113.demo()
        print("Demo-Agent-Health-Monitor gespeichert.")
    elif args.cmd == "aghealth-report":
        v113.init()
        print(v113.report())
    elif args.cmd == "mrecover-demo":
        v114.init()
        v114.demo()
        print("Demo-Mission-Recovery gespeichert.")
    elif args.cmd == "mrecover-report":
        v114.init()
        print(v114.report())
    elif args.cmd == "qrecover-demo":
        v115.init()
        v115.demo()
        print("Demo-Queue-Recovery gespeichert.")
    elif args.cmd == "qrecover-report":
        v115.init()
        print(v115.report())
    elif args.cmd == "guard-demo":
        v116.init()
        v116.demo()
        print("Demo-Freigabe-Guardrails gespeichert.")
    elif args.cmd == "guard-report":
        v116.init()
        print(v116.report())
    elif args.cmd == "backup-demo":
        v117.init()
        v117.demo()
        print("Demo-Backup-Restore gespeichert.")
    elif args.cmd == "backup-report":
        v117.init()
        print(v117.report())
    elif args.cmd == "syshealth-demo":
        v118.init()
        v118.demo()
        print("Demo-System-Health-Dashboard gespeichert.")
    elif args.cmd == "syshealth-report":
        v118.init()
        print(v118.report())
    elif args.cmd == "e2etest-demo":
        v119.init()
        v119.demo()
        print("Demo-Integrationstests gespeichert.")
    elif args.cmd == "e2etest-report":
        v119.init()
        print(v119.report())
    elif args.cmd == "errctr-demo":
        v120.init()
        v120.demo()
        print("Demo-Error-Center gespeichert.")
    elif args.cmd == "errctr-report":
        v120.init()
        print(v120.report())
    elif args.cmd == "live-health":
        load_live_env()
        print(live_health_report())
    elif args.cmd == "live-ebay":
        load_live_env()
        try:
            result = EbayClient().search(args.query, args.limit)
            print(json.dumps(result, ensure_ascii=False, indent=2)[:30000])
        except RuntimeError as exc:
            print(str(exc))
    elif args.cmd == "live-amazon":
        load_live_env()
        try:
            result = AmazonCreatorsClient().search(args.query)
            print(json.dumps(result, ensure_ascii=False, indent=2)[:30000])
        except RuntimeError as exc:
            print(str(exc))
    elif args.cmd == "live-google-ads":
        load_live_env()
        gaql = """SELECT customer.id, campaign.id, campaign.name, metrics.impressions,
metrics.clicks, metrics.cost_micros
FROM campaign
WHERE segments.date DURING LAST_7_DAYS"""
        try:
            result = GoogleAdsClient().query(gaql)
            print(json.dumps(result, ensure_ascii=False, indent=2)[:30000])
        except RuntimeError as exc:
            print(str(exc))
    elif args.cmd == "live-fetch":
        load_live_env()
        result = PublicFetcher().fetch(args.url)
        preview = dict(result)
        preview["text"] = preview["text"][:500]
        print(json.dumps(preview, ensure_ascii=False, indent=2))
    elif args.cmd == "collect":
        v3.init()
        print(v3.collect(args.url, args.category, args.subcategory, args.country, args.platform))
    elif args.cmd == "collect-list":
        v3.init()
        urls = [
            line.strip()
            for line in Path(args.file).read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.lstrip().startswith("#")
        ]
        for result in v3.collect_list(urls, args.category, args.subcategory, args.country, args.platform):
            print(result)
    elif args.cmd == "add-observation":
        v2.init()
        result = v2.observe(
            args.category,
            args.subcategory,
            args.subsubcategory,
            args.product,
            args.brand,
            args.platform,
            args.country,
            args.price,
            args.currency,
            args.popularity,
            args.source_url,
            args.source_name,
            args.confidence,
        )
        print(result)
    elif args.cmd == "report":
        v1.init()
        print(v1.report())
    elif args.cmd == "report-v2":
        v2.init()
        print(v2.report())
    elif args.cmd == "changes":
        v2.init()
        print(v2.changes())
    elif args.cmd == "memory":
        v2.init()
        print(v2.search_memory(args.query))
    elif args.cmd == "export-memory":
        v2.init()
        path = v2.export_json()
        print(f"Memory exported to {path}")
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
