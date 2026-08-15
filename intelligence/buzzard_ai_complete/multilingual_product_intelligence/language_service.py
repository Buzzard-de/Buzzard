import json
import re
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent / "data"
LANG = json.loads((DATA_DIR / "languages.json").read_text(encoding="utf-8"))
SUPPORTED = {item["code"]: item for item in LANG["languages"]}


def supported_languages():
    return list(SUPPORTED.values())


def is_rtl(code):
    return bool(SUPPORTED.get(code, {}).get("rtl"))


def detect_language(text):
    if re.search(r"[\u0600-\u06FF]", text):
        return "ar"
    if re.search(r"[\u0370-\u03FF]", text):
        return "el"
    if re.search(r"[\u0400-\u04FF]", text):
        return "ru"
    return "de"


def normalize_request(text, user_language=None):
    lang = user_language if user_language in SUPPORTED else detect_language(text)
    return {"language": lang, "rtl": is_rtl(lang), "query": text.strip()}
