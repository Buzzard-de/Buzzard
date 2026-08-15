import json
from pathlib import Path

from buzzard_ai_complete.vmax.backup import SnapshotStore
from buzzard_ai_complete.vmax.catalog import ProductIntelligence
from buzzard_ai_complete.vmax.decisions import DecisionEngine
from buzzard_ai_complete.vmax.feature_flags import FeatureFlags
from buzzard_ai_complete.vmax.platform import BuzzardMaxPlatform

REGISTRY_PATH = Path(__file__).resolve().parent.parent / "docs" / "MAXIMAL_MODULE_REGISTRY.json"


class MaxPlatformService:
    def __init__(self, platform=None):
        self.platform = platform or BuzzardMaxPlatform()

    def _bootstrap_registry(self):
        if not REGISTRY_PATH.exists():
            return
        registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
        for name, version in registry.items():
            self.platform.register_module(name.lower(), version, [name])

    def demo_flow(self):
        self._bootstrap_registry()
        self.platform.health.set("platform", "OK")
        self.platform.policy.add("public_research", True)
        self.platform.audit.record("system", "max_demo", "platform", "OK")

        product = ProductIntelligence().score(10, 20, 2, 2, 1)
        decision = DecisionEngine().decide({"profitable": True, "stock_available": True})
        flags = FeatureFlags()
        flags.set("vmax_enabled", True)

        snapshot = self.platform.snapshot()
        return {
            "snapshot": snapshot,
            "product_intelligence": product,
            "decision": decision,
            "feature_flags": {"vmax_enabled": flags.enabled("vmax_enabled")},
            "backup_preview": SnapshotStore().dump(snapshot)[:200],
        }

    def snapshot(self):
        self._bootstrap_registry()
        return self.platform.snapshot()
