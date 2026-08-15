from collections import defaultdict
from statistics import mean

class SocialSignalEngine:
    """
    Converts platform observations into normalized cross-platform signals.
    Signals are about products/categories/topics, not invasive person profiling.
    """

    def normalize_engagement(self, evidence):
        e = evidence.engagement or {}
        return (
            float(e.get("likes", 0)) +
            float(e.get("comments", 0)) * 2 +
            float(e.get("shares", 0)) * 3 +
            float(e.get("saves", 0)) * 2 +
            float(e.get("views", 0)) * 0.02
        )

    def aggregate(self, evidences):
        by_topic = defaultdict(list)
        for e in evidences:
            topic = (e.title or e.text_excerpt or "").strip().lower()
            if topic:
                by_topic[topic].append(e)
        results = []
        for topic, rows in by_topic.items():
            strengths = [self.normalize_engagement(x) for x in rows]
            results.append({
                "topic": topic,
                "platforms": sorted({x.platform for x in rows}),
                "evidence_count": len(rows),
                "mean_engagement_score": round(mean(strengths), 2),
                "total_engagement_score": round(sum(strengths), 2)
            })
        return sorted(results, key=lambda x: x["total_engagement_score"], reverse=True)

    def cross_platform_strength(self, evidence):
        platforms = {x.platform for x in evidence}
        return min(100.0, len(platforms) * 18.0 + min(len(evidence), 20) * 2.0)
