import json
import re
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
TAX = json.loads((DATA_DIR / "taxonomy.json").read_text(encoding="utf-8"))
NODES = TAX["nodes"]

def tokens(s):
    return set(re.findall(r"[a-z0-9äöüß]+", (s or "").casefold()))

def map_category(hint, title=""):
    query = tokens((hint or "") + " " + (title or ""))
    if not query:
        return {"status":"review","category_id":None,"confidence":0,"candidates":[]}
    scored=[]
    for n in NODES:
        nt=tokens(n["name"])
        overlap=len(query & nt)
        if overlap:
            score=overlap/max(1,len(nt))
            scored.append((score,n))
    scored.sort(key=lambda x:x[0], reverse=True)
    if not scored:
        return {"status":"review","category_id":None,"confidence":0,"candidates":[]}
    top_score, top=scored[0]
    confidence=round(min(0.99, top_score),3)
    if top["level"] != 3 or confidence < 0.70:
        return {
            "status":"review",
            "category_id":top["id"] if top["level"]==3 else None,
            "confidence":confidence,
            "candidates":[{"id":n["id"],"name":n["name"],"score":round(s,3)} for s,n in scored[:5]]
        }
    return {
        "status":"accept",
        "category_id":top["id"],
        "confidence":confidence,
        "candidates":[{"id":n["id"],"name":n["name"],"score":round(s,3)} for s,n in scored[:5]]
    }
