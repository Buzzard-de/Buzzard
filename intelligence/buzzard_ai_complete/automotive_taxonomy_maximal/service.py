import json
from dataclasses import asdict
from pathlib import Path

from buzzard_ai_complete.automotive_taxonomy_maximal.automotive_taxonomy.catalog.engine import (
    AutomotiveTaxonomy,
)
from buzzard_ai_complete.automotive_taxonomy_maximal.automotive_taxonomy.catalog.master_seed import (
    MASTER_SYSTEMS,
)
from buzzard_ai_complete.automotive_taxonomy_maximal.automotive_taxonomy.compatibility.fitment import (
    FitmentEngine,
)
from buzzard_ai_complete.automotive_taxonomy_maximal.automotive_taxonomy.compatibility.selector import (
    VehicleSelector,
)
from buzzard_ai_complete.automotive_taxonomy_maximal.automotive_taxonomy.models import (
    FitmentRule,
    TaxonomyNode,
    VehicleProfile,
)
from buzzard_ai_complete.automotive_taxonomy_maximal.automotive_taxonomy.service import (
    AutomotiveProductIntelligence,
)
from buzzard_ai_complete.automotive_taxonomy_maximal.automotive_taxonomy.validation.validator import (
    AutomotiveTaxonomyValidator,
)
from buzzard_ai_complete.automotive_taxonomy_maximal.automotive_taxonomy.tires.fitment import (
    TireFitmentEngine,
)
from buzzard_ai_complete.automotive_taxonomy_maximal.automotive_taxonomy.tires.models import (
    TireFitment,
)
from buzzard_ai_complete.automotive_taxonomy_maximal.automotive_taxonomy.tires.service import (
    TireIntelligence,
)
from buzzard_ai_complete.automotive_taxonomy_maximal.automotive_taxonomy.tires.taxonomy import (
    TIRE_TAXONOMY,
)

CONFIG_DIR = Path(__file__).resolve().parent / "config"
SCHEMA_DIR = Path(__file__).resolve().parent / "schemas"
DOCS_DIR = Path(__file__).resolve().parent / "docs"
REPO_ROOT = Path(__file__).resolve().parents[3]


class AutomotiveTaxonomyService:
    def _repo_path(self, relative: str) -> Path:
        return REPO_ROOT / relative

    def load_kfz_tree(self) -> dict:
        config = self.load_config()
        path = self._repo_path(config["kfz_category_tree_path"])
        return json.loads(path.read_text(encoding="utf-8"))

    def load_kfz_shop_bridge(self) -> dict:
        config = self.load_config()
        path = self._repo_path(config["kfz_shop_bridge_path"])
        return json.loads(path.read_text(encoding="utf-8"))

    def load_kfz_intelligence_os(self) -> dict:
        config = self.load_config()
        path = self._repo_path(config["kfz_intelligence_os_path"])
        return json.loads(path.read_text(encoding="utf-8"))

    def kfz_intelligence_summary(self) -> dict:
        try:
            os_data = self.load_kfz_intelligence_os()
        except (FileNotFoundError, KeyError, json.JSONDecodeError):
            return {"status": "NOT_LOADED"}
        taxonomy = os_data.get("taxonomy", [])
        l3_count = sum(
            len(sub.get("children", []))
            for main in taxonomy
            for sub in main.get("subcategories", [])
        )
        return {
            "name": os_data.get("name"),
            "version": os_data.get("version"),
            "main_category_count": len(taxonomy),
            "subcategory_count": sum(len(main.get("subcategories", [])) for main in taxonomy),
            "l3_count": l3_count,
            "competitor_count": len(os_data.get("competitors", [])),
            "coverage_categories": len(os_data.get("coverage", {})),
            "note": os_data.get("note"),
        }

    def kfz_competitors(self) -> list[dict]:
        return self.load_kfz_intelligence_os().get("competitors", [])

    def kfz_coverage(self, main_id: str | None = None) -> dict:
        os_data = self.load_kfz_intelligence_os()
        coverage = os_data.get("coverage", {})
        if main_id is None:
            return coverage
        normalized = main_id.zfill(2) if main_id.isdigit() else main_id
        return coverage.get(normalized, {})

    def kfz_taxonomy_main(self, main_id: str) -> dict | None:
        normalized = main_id.zfill(2) if main_id.isdigit() else main_id
        for main in self.load_kfz_intelligence_os().get("taxonomy", []):
            if main.get("id") == normalized:
                bridge = self.kfz_main(normalized) or {}
                return {
                    **main,
                    "name_de": bridge.get("name_de"),
                    "shop_l2_id": bridge.get("shop_l2_id"),
                    "shop_l2_name": bridge.get("shop_l2_name"),
                    "shop_l2_slug": bridge.get("shop_l2_slug"),
                    "competitor_coverage": self.kfz_coverage(normalized),
                    "active_competitors": bridge.get("active_competitors", []),
                }
        return None

    def kfz_summary(self) -> dict:
        try:
            bridge = self.load_kfz_shop_bridge()
            intel = self.kfz_intelligence_summary()
        except (FileNotFoundError, KeyError, json.JSONDecodeError):
            return {"status": "NOT_SYNCED"}
        return {
            "name": intel.get("name", "Buzzard Master Kfz"),
            "version": intel.get("version"),
            "main_category_count": bridge.get("main_category_count"),
            "subcategory_count": bridge.get("subcategory_count"),
            "l3_count": bridge.get("l3_count", intel.get("l3_count")),
            "competitor_count": intel.get("competitor_count", len(bridge.get("competitors", []))),
            "shop_automotive_root_id": bridge.get("shop_automotive_root_id"),
            "url_prefix": bridge.get("url_prefix"),
            "bridge_version": bridge.get("version"),
            "intelligence_os": intel.get("version"),
            "console_html": "/taxonomy/buzzard_intelligence_os_all_in_one.html",
            "console_kfz_html": "/taxonomy/buzzard_master_kfz_intelligence_os.html",
        }

    def kfz_mains(self) -> list[dict]:
        bridge = self.load_kfz_shop_bridge()
        return bridge.get("mains", [])

    def kfz_main(self, main_id: str) -> dict | None:
        normalized = main_id.zfill(2) if main_id.isdigit() else main_id
        for main in self.kfz_mains():
            if main.get("kfz_id") == normalized:
                return main
        return None

    def shop_bridge_for_kfz(self, main_id: str) -> dict | None:
        main = self.kfz_main(main_id)
        if not main:
            return None
        return {
            "kfz_id": main["kfz_id"],
            "kfz_name": main["kfz_name"],
            "name_de": main["name_de"],
            "shop_root_id": main["shop_root_id"],
            "shop_l2_id": main["shop_l2_id"],
            "shop_l2_name": main["shop_l2_name"],
            "shop_l2_slug": main["shop_l2_slug"],
            "url": f"{main.get('slug', '')}",
        }

    def load_config(self):
        return json.loads((CONFIG_DIR / "automotive_taxonomy.production.json").read_text(encoding="utf-8"))

    def load_schema(self):
        return json.loads((SCHEMA_DIR / "automotive_taxonomy.schema.json").read_text(encoding="utf-8"))

    def load_tires_config(self):
        return json.loads((CONFIG_DIR / "tires.production.json").read_text(encoding="utf-8"))

    def health(self):
        config = self.load_config()
        rules = config.get("rules", {})
        tires_config = self.load_tires_config()
        return {
            "service": "automotive-taxonomy-maximal",
            "status": "maximal_automotive_taxonomy_ready",
            "principle": config.get("principle", "vehicle_need_first"),
            "levels": len(config.get("levels", [])),
            "master_systems": len(MASTER_SYSTEMS),
            "tires_category": tires_config.get("category", "Lastikler"),
            "tires_vehicle_types": len(TIRE_TAXONOMY),
            "fitment_requires_evidence": rules.get("fitment_requires_evidence", True),
            "automatic_fitment_publish": rules.get("automatic_fitment_publish", False),
            "live_activation": False,
            "kfz_tree": self.kfz_summary(),
        }

    def build_demo_taxonomy(self):
        nodes = [
            TaxonomyNode("auto", "Otomotiv", 1),
            TaxonomyNode("brakes", "Fren Sistemi", 2, "auto"),
            TaxonomyNode("pads", "Fren Balataları", 3, "brakes"),
            TaxonomyNode("front-pads", "Ön Fren Balataları", 4, "pads"),
        ]
        return AutomotiveTaxonomy(nodes=nodes)

    def master_seed(self):
        return [{"id": item[0], "name": item[1]} for item in MASTER_SYSTEMS]

    def tires_categories(self):
        return TIRE_TAXONOMY

    def tires_demo(self):
        intelligence = TireIntelligence()
        fitment = TireFitmentEngine(
            [
                TireFitment(
                    "tire-205-55-16",
                    "passenger_car",
                    make="BMW",
                    model="320d",
                    year_from=2018,
                    year_to=2020,
                    axle="front",
                    position="front",
                    evidence_source="verified",
                    confidence=0.95,
                )
            ]
        )
        vehicle = {"vehicle_type": "passenger_car", "make": "BMW", "model": "320d", "year": 2019}
        return {
            "tires_config": self.load_tires_config(),
            "vehicle_types": list(TIRE_TAXONOMY.keys()),
            "passenger_car_tree": TIRE_TAXONOMY["passenger_car"],
            "size_validation": intelligence.validate_size(205, 55, 16),
            "search_contract": intelligence.search(
                vehicle_type="passenger_car", season="summer", width=205, aspect=55, rim=16
            ),
            "fitment_matches": [asdict(match) for match in fitment.compatible(vehicle, axle="front")],
        }

    def demo_flow(self):
        taxonomy = self.build_demo_taxonomy()
        vehicle = VehicleProfile("v1", "BMW", "320d", year_from=2018, year_to=2020, engine_code="B47")
        vehicles = [vehicle]
        intelligence = AutomotiveProductIntelligence(taxonomy, vehicles)
        fitment = FitmentEngine(taxonomy)
        fitment.add_rule(
            FitmentRule("p1", "v1", "front", "front", "B47", "verified", "source", 0.95)
        )
        return {
            "health": self.health(),
            "master_system_count": len(MASTER_SYSTEMS),
            "demo_path": intelligence.product_path("front-pads"),
            "vehicle_matches": [
                asdict(v) for v in VehicleSelector(vehicles).select(make="BMW", model="320d", year=2019, engine_code="B47")
            ],
            "fitment_matches": [fitment.explain(rule) for rule in fitment.find(vehicle, "p1", "front")],
            "validation_errors": AutomotiveTaxonomyValidator().validate(taxonomy),
            "parts_for_vehicle": intelligence.find_parts_for_vehicle(
                {"make": "BMW", "model": "320d", "year": 2019, "engine_code": "B47"},
                category="fren",
            ),
            "tires": self.tires_demo(),
        }
