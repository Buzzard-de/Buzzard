import json
from pathlib import Path

from buzzard_ai_complete.multilingual_product_intelligence.language_service import (
    detect_language,
    is_rtl,
    normalize_request,
    supported_languages,
)

DATA_DIR = Path(__file__).resolve().parent / "data"
SCHEMA_DIR = Path(__file__).resolve().parent / "schemas"


class MultilingualProductIntelligenceService:
    def load_languages_config(self):
        return json.loads((DATA_DIR / "languages.json").read_text(encoding="utf-8"))

    def health(self):
        config = self.load_languages_config()
        rtl_count = sum(1 for lang in config["languages"] if lang.get("rtl"))
        return {
            "service": "multilingual",
            "status": "ready",
            "supported_languages": config["supported_count"],
            "rtl_languages": rtl_count,
            "groups": list(config["groups"].keys()),
            "default_language": config.get("default", "de"),
        }

    def languages(self):
        return {
            "count": len(supported_languages()),
            "languages": supported_languages(),
        }

    def normalize(self, text, user_language=None):
        return normalize_request(text, user_language)

    def glossary(self):
        return json.loads((DATA_DIR / "multilingual_glossary.json").read_text(encoding="utf-8"))

    def ai_pipeline(self):
        return json.loads((DATA_DIR / "ai_language_understanding.json").read_text(encoding="utf-8"))

    def translation_schema(self):
        return json.loads((SCHEMA_DIR / "translation.schema.json").read_text(encoding="utf-8"))

    def demo_flow(self):
        samples = [
            ("Bremsbelag vorne", None),
            ("فحمات الفرامل", None),
            ("fren balatası", "tr"),
        ]
        normalized = [self.normalize(text, language) for text, language in samples]
        return {
            "health": self.health(),
            "samples": normalized,
            "glossary_terms": len(self.glossary()),
            "detect_language": detect_language("Motoröl 5W-30"),
            "rtl_de": is_rtl("de"),
            "rtl_ar": is_rtl("ar"),
        }
