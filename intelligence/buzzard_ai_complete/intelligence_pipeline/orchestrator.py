"""Buzzard Intelligence Pipeline — Public Sources → Master Taxonomy."""

from __future__ import annotations

import json
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from buzzard_ai_complete.agents.aslan_bey import AslanBey
from buzzard_ai_complete.ai_council_18_unified.council.memory.shared_memory import (
    SharedIntelligenceMemory,
)
from buzzard_ai_complete.category_intelligence_43_maximal.category_intelligence.opportunities.scoring import (
    OpportunityScorer,
)
from buzzard_ai_complete.memory.store import MemoryStore

CONFIG_DIR = Path(__file__).resolve().parent / "config"
REPO_ROOT = Path(__file__).resolve().parents[3]


class IntelligencePipelineOrchestrator:
  """Runs the canonical intelligence flow end-to-end."""

  PIPELINE_STAGES = [
      "public_sources",
      "source_discovery",
      "public_collector",
      "parser_normalizer",
      "canonical_category_resolver",
      "intelligence_layers",
      "opportunity_engine",
      "shared_memory",
      "alert_engine",
      "central_kurmay_ai",
      "human_approval",
      "buzzard_master_taxonomy",
  ]

  INTELLIGENCE_LAYERS = [
      "category_intelligence",
      "competitor_intelligence",
      "price_intelligence",
      "product_intelligence",
      "supplier_intelligence",
      "demand_intelligence",
      "trend_intelligence",
  ]

  def __init__(self):
      self.config = self.load_config()
      self.memory = SharedIntelligenceMemory()
      self.store = MemoryStore()
      self.scorer = OpportunityScorer()
      self.kurmay = AslanBey()

  def load_config(self) -> dict[str, Any]:
      return json.loads((CONFIG_DIR / "pipeline.production.json").read_text(encoding="utf-8"))

  def _repo_path(self, relative: str) -> Path:
      return REPO_ROOT / relative

  def _domain_config(self, domain: str) -> dict[str, Any]:
      domains = self.config.get("domains", {})
      if domain not in domains:
          raise KeyError(f"Unknown pipeline domain: {domain}")
      return domains[domain]

  def _now(self) -> str:
      return datetime.now(timezone.utc).isoformat()

  def _gap_score(self, covered: int, total: int = 8, strategic: bool = False) -> float:
      missing = max(0, total - covered)
      multiplier = 1.2 if strategic else 1.0
      return round(missing * 10 * multiplier, 1)

  def stage_public_sources(self, domain_cfg: dict[str, Any]) -> dict[str, Any]:
      rows = []
      for source in domain_cfg.get("public_sources", []):
          path = self._repo_path(source["path"])
          rows.append(
              {
                  "id": source["id"],
                  "type": source["type"],
                  "path": source["path"],
                  "exists": path.is_file(),
                  "bytes": path.stat().st_size if path.is_file() else 0,
              }
          )
      return {"count": len(rows), "sources": rows}

  def stage_source_discovery(self, domain_cfg: dict[str, Any]) -> dict[str, Any]:
      competitors = domain_cfg.get("competitor_sources", [])
      return {
          "competitor_count": len(competitors),
          "discovered": [
              {
                  "competitor_id": item["id"],
                  "name": item["name"],
                  "seed_url": item["seed_url"],
                  "discovery_status": "seed_registered",
              }
              for item in competitors
          ],
      }

  def stage_public_collector(self, domain_cfg: dict[str, Any]) -> dict[str, Any]:
      from live_connectors.public_fetch import PublicFetcher

      fetcher = PublicFetcher()
      collected = []
      for item in domain_cfg.get("competitor_sources", [])[:3]:
          try:
              result = fetcher.fetch(item["seed_url"])
              collected.append(
                  {
                      "competitor_id": item["id"],
                      "url": result.get("url", item["seed_url"]),
                      "status": "OK",
                      "bytes": result.get("bytes", 0),
                  }
              )
          except Exception as exc:  # noqa: BLE001
              collected.append(
                  {
                      "competitor_id": item["id"],
                      "url": item["seed_url"],
                      "status": "FEHLER",
                      "error": str(exc),
                  }
              )
      return {"collected": len(collected), "samples": collected}

  def stage_parser_normalizer(self, domain_cfg: dict[str, Any]) -> dict[str, Any]:
      os_path = domain_cfg["taxonomy_sink"]["kfz_intelligence_os"]
      os_data = json.loads(self._repo_path(os_path).read_text(encoding="utf-8"))
      taxonomy = os_data.get("taxonomy", [])
      l3_count = sum(
          len(sub.get("children", []))
          for main in taxonomy
          for sub in main.get("subcategories", [])
      )
      return {
          "taxonomy_nodes": len(taxonomy),
          "subcategory_count": sum(len(main.get("subcategories", [])) for main in taxonomy),
          "l3_count": l3_count,
          "competitor_count": len(os_data.get("competitors", [])),
          "normalized_at": self._now(),
      }

  def stage_canonical_resolver(self, domain_cfg: dict[str, Any]) -> dict[str, Any]:
      bridge_path = domain_cfg["taxonomy_sink"]["shop_bridge"]
      bridge = json.loads(self._repo_path(bridge_path).read_text(encoding="utf-8"))
      resolved = []
      for main in bridge.get("mains", []):
          resolved.append(
              {
                  "kfz_id": main["kfz_id"],
                  "name_de": main["name_de"],
                  "shop_root_id": main["shop_root_id"],
                  "shop_l2_id": main["shop_l2_id"],
                  "shop_l2_slug": main["shop_l2_slug"],
                  "l3_count": main.get("l3_count", 0),
              }
          )
      return {
          "shop_automotive_root_id": bridge.get("shop_automotive_root_id"),
          "resolved_count": len(resolved),
          "mains": resolved,
      }

  def stage_intelligence_layers(self, domain_cfg: dict[str, Any]) -> dict[str, Any]:
      from buzzard_ai_complete.automotive_taxonomy_maximal.service import AutomotiveTaxonomyService

      auto = AutomotiveTaxonomyService()
      summary = auto.kfz_intelligence_summary()
      competitors = auto.kfz_competitors()
      return {
          "category_intelligence": {
              "main_categories": summary.get("main_category_count"),
              "subcategories": summary.get("subcategory_count"),
              "l3_nodes": summary.get("l3_count"),
          },
          "competitor_intelligence": {
              "tracked_competitors": len(competitors),
              "competitors": competitors,
          },
          "price_intelligence": {
              "status": "benchmark_mode",
              "note": "Live marketplace prices via connectors when configured",
          },
          "product_intelligence": {
              "status": "pim_ready",
              "canonical_category_field": "canonical_category_id",
          },
          "supplier_intelligence": {
              "status": "hub_ready",
              "note": "Supplier import enrichment available",
          },
          "demand_intelligence": {
              "status": "seed_mode",
              "note": "Demand signals from coverage gaps and search trends",
          },
          "trend_intelligence": {
              "status": "social_ready",
              "note": "Social intelligence adapters available",
          },
      }

  def stage_opportunity_engine(self, domain_cfg: dict[str, Any]) -> dict[str, Any]:
      os_path = domain_cfg["taxonomy_sink"]["kfz_intelligence_os"]
      os_data = json.loads(self._repo_path(os_path).read_text(encoding="utf-8"))
      coverage = os_data.get("coverage", {})
      opportunities = []
      strategic_names = ("Motor", "Fren", "Lastik", "Yağ", "Filtre", "Elektrik")

      for main in os_data.get("taxonomy", []):
          main_id = main["id"]
          row = coverage.get(main_id, {})
          covered = sum(1 for value in row.values() if value)
          missing = max(0, 8 - covered)
          strategic = any(token in main["name"] for token in strategic_names)
          gap_score = self._gap_score(covered, strategic=strategic)
          score = self.scorer.score(
              competitor_count=covered,
              seller_count=covered,
              price_signal=0.5 if missing else 0.2,
              demand_signal=0.6 if strategic else 0.3,
              margin_signal=0.4,
              evidence_quality=0.5,
          )
          opportunities.append(
              {
                  "kfz_id": main_id,
                  "name": main["name"],
                  "competitors_covered": covered,
                  "competitors_missing": missing,
                  "gap_score": gap_score,
                  "opportunity_score": score,
                  "priority": self.scorer.classify(score),
              }
          )

      opportunities.sort(key=lambda item: (item["gap_score"], item["opportunity_score"]), reverse=True)
      return {
          "count": len(opportunities),
          "top_opportunities": opportunities[:10],
          "all_opportunities": opportunities,
      }

  def stage_shared_memory(
      self, domain: str, opportunities: dict[str, Any], resolver: dict[str, Any]
  ) -> dict[str, Any]:
      finding_ids = []
      for opp in opportunities.get("top_opportunities", [])[:5]:
          finding_ids.append(
              self.memory.add_finding(
                  {
                      "agent_id": "intelligence_pipeline",
                      "topic": f"kfz_opportunity/{opp['kfz_id']}",
                      "finding": opp,
                      "confidence": min(0.95, opp["opportunity_score"] / 100),
                  }
              )
          )

      payload = {
          "domain": domain,
          "pipeline_run": self._now(),
          "resolved_mains": resolver.get("resolved_count"),
          "top_opportunities": opportunities.get("top_opportunities", [])[:5],
      }
      self.store.put(
          "intelligence_pipeline",
          f"run_{domain}",
          payload,
          source="intelligence_pipeline/orchestrator",
          confidence=82.0,
      )
      return {"findings_saved": len(finding_ids), "memory_namespace": "intelligence_pipeline"}

  def stage_alert_engine(self, opportunities: dict[str, Any]) -> dict[str, Any]:
      alerts = []
      for opp in opportunities.get("top_opportunities", []):
          if opp["competitors_missing"] >= 4:
              alerts.append(
                  {
                      "level": "high",
                      "type": "category_gap",
                      "kfz_id": opp["kfz_id"],
                      "message": (
                          f"Hohe Buzzard-Chance: {opp['name']} — "
                          f"{opp['competitors_missing']}/8 Wettbewerber fehlen"
                      ),
                  }
              )
          elif opp["priority"] == "high_priority":
              alerts.append(
                  {
                      "level": "medium",
                      "type": "opportunity",
                      "kfz_id": opp["kfz_id"],
                      "message": f"Priorität hoch für {opp['name']}",
                  }
              )
      return {"alert_count": len(alerts), "alerts": alerts}

  def stage_central_kurmay_ai(self, alerts: dict[str, Any]) -> dict[str, Any]:
      dashboard = self.kurmay.dashboard()
      return {
          "agent": self.config.get("kurmay_agent", "aslan_bey"),
          "role": self.kurmay.role,
          "open_tasks": len(dashboard.get("open_tasks", [])),
          "claim_issues": len(dashboard.get("claim_issues", [])),
          "alerts_forwarded": alerts.get("alert_count", 0),
          "recommendation": (
              "Aslan Bey koordiniert Doğu Bey für Live-Collectors und "
              "menschliche Freigabe vor Taxonomie-Schreibzugriff."
          ),
      }

  def stage_human_approval(self) -> dict[str, Any]:
      rules = self.config.get("rules", {})
      return {
          "required": rules.get("human_approval_required_for_taxonomy_write", True),
          "automatic_publish": rules.get("automatic_taxonomy_publish", False),
          "status": "pending_review",
          "actions": [
              "Review top_opportunities in shared memory",
              "Approve taxonomy changes via admin workflow",
              "Run complete-sync-kfz-category-tree after approval",
          ],
      }

  def stage_buzzard_master_taxonomy(self, domain_cfg: dict[str, Any]) -> dict[str, Any]:
      sink = domain_cfg["taxonomy_sink"]
      return {
          "shop_root_id": sink.get("shop_root"),
          "kfz_intelligence_os": sink.get("kfz_intelligence_os"),
          "shop_bridge": sink.get("shop_bridge"),
          "console_html": "/taxonomy/buzzard_intelligence_os_maximum_single_file.html",
          "console_all_in_one_html": "/taxonomy/buzzard_intelligence_os_all_in_one.html",
          "console_kfz_html": "/taxonomy/buzzard_master_kfz_intelligence_os.html",
          "json_path": "/taxonomy/buzzard_intelligence_os_all_in_one.json",
          "manifest_path": "/taxonomy/buzzard_intelligence_os_maximum_manifest.json",
          "sync_command": "complete-sync-kfz-category-tree",
          "write_mode": "approval_required",
      }

  def run(self, domain: str = "kfz_automotive") -> dict[str, Any]:
      domain_cfg = self._domain_config(domain)
      public_sources = self.stage_public_sources(domain_cfg)
      source_discovery = self.stage_source_discovery(domain_cfg)
      public_collector = self.stage_public_collector(domain_cfg)
      parser_normalizer = self.stage_parser_normalizer(domain_cfg)
      canonical_resolver = self.stage_canonical_resolver(domain_cfg)
      intelligence_layers = self.stage_intelligence_layers(domain_cfg)
      opportunity_engine = self.stage_opportunity_engine(domain_cfg)
      shared_memory = self.stage_shared_memory(domain, opportunity_engine, canonical_resolver)
      alert_engine = self.stage_alert_engine(opportunity_engine)
      central_kurmay = self.stage_central_kurmay_ai(alert_engine)
      human_approval = self.stage_human_approval()
      master_taxonomy = self.stage_buzzard_master_taxonomy(domain_cfg)

      return {
          "pipeline": self.config.get("name"),
          "version": self.config.get("version"),
          "domain": domain,
          "run_at": self._now(),
          "stages": self.PIPELINE_STAGES,
          "intelligence_layers": self.INTELLIGENCE_LAYERS,
          "results": {
              "public_sources": public_sources,
              "source_discovery": source_discovery,
              "public_collector": public_collector,
              "parser_normalizer": parser_normalizer,
              "canonical_category_resolver": canonical_resolver,
              "intelligence_layers": intelligence_layers,
              "opportunity_engine": opportunity_engine,
              "shared_memory": shared_memory,
              "alert_engine": alert_engine,
              "central_kurmay_ai": central_kurmay,
              "human_approval": human_approval,
              "buzzard_master_taxonomy": master_taxonomy,
          },
          "hinweise": [
              "Nur öffentliche Quellen — keine Login-/CAPTCHA-Umgehung.",
              "Coverage-Matrix ist Research-Seed bis Live-Collector verbunden ist.",
              "Verkäufe bleiben deaktiviert (Katalogmodus).",
              "Taxonomie-Schreibzugriff erfordert menschliche Freigabe.",
          ],
      }

  def health(self) -> dict[str, Any]:
      return {
          "service": "intelligence-pipeline",
          "status": "ready",
          "stages": len(self.PIPELINE_STAGES),
          "domains": list(self.config.get("domains", {}).keys()),
          "kurmay_agent": self.config.get("kurmay_agent"),
      }
