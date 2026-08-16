import json
import re
from pathlib import Path


def norm(value):
    text = value.casefold().replace("ä", "a").replace("ö", "o").replace("ü", "u").replace("ß", "ss")
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9çğıöşü\s&-]", " ", text)).strip()


class CategoryAuditEngine:
    ACTIONS = {"KEEP", "MOVE_CONTENT", "RESTRUCTURE", "SEPARATE", "REVIEW"}

    def __init__(self, master_path, live_path, policy_path):
        self.master = json.loads(Path(master_path).read_text(encoding="utf-8"))
        self.live = json.loads(Path(live_path).read_text(encoding="utf-8"))["categories"]
        self.policy = json.loads(Path(policy_path).read_text(encoding="utf-8"))

    def mains(self):
        return [node for node in self.master["nodes"] if node["level"] == 1]

    def exact(self, name):
        query = norm(name)
        return [node for node in self.mains() if norm(node["name"]) == query]

    def recommendation(self, item):
        name = item["name"]
        query = norm(name)
        if name in self.policy:
            rule = self.policy[name]
            return {
                "action": rule["action"],
                "target": rule["target"],
                "reason": "Explicitly approved category-audit rule.",
            }
        if self.exact(name):
            match = self.exact(name)[0]
            return {
                "action": "KEEP",
                "target": match["name"],
                "reason": "Exact canonical Master match.",
            }
        if "reifen" in query or "felgen" in query:
            return {
                "action": "MOVE_CONTENT",
                "target": "Lastikler – Tüm Motorlu Araçlar",
                "reason": "Tire/wheel content belongs to the dedicated tire ecosystem.",
            }
        if "landwirtschaft" in query or "agrartechnik" in query:
            return {
                "action": "RESTRUCTURE",
                "target": "Tarım & Tarım Makineleri",
                "reason": "Agriculture content belongs to the canonical agriculture ecosystem.",
            }
        if "baumaschinen" in query:
            return {
                "action": "RESTRUCTURE",
                "target": "İnşaat & İnşaat Makineleri",
                "reason": "Construction-machine content belongs to the canonical construction ecosystem.",
            }
        return {
            "action": "REVIEW",
            "target": None,
            "reason": "No safe deterministic mapping; human/category-AI review required.",
        }

    def audit(self):
        return [{**item, **self.recommendation(item)} for item in self.live]

    def summary(self):
        rows = self.audit()
        counts = {action: 0 for action in sorted(self.ACTIONS)}
        for row in rows:
            counts[row["action"]] += 1
        return {
            "live_categories": len(rows),
            "master_main_categories": len(self.mains()),
            "actions": counts,
            "delete_disabled": True,
        }

    def validate(self):
        assert len(self.mains()) == 48
        assert all(row["action"] in self.ACTIONS for row in self.audit())
        assert all(row["action"] != "DELETE" for row in self.audit())
        return True
