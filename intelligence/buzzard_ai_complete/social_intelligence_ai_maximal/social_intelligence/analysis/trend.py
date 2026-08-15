from collections import defaultdict

class TrendEngine:
    def __init__(self):
        self.history = []

    def record(self, timestamp, topic, score):
        self.history.append({"timestamp": timestamp, "topic": topic, "score": float(score)})

    def trend(self, topic, recent_n=5):
        rows=[x for x in self.history if x["topic"]==topic][-recent_n:]
        if len(rows)<2:
            return {"direction":"unknown","change":0.0,"observations":len(rows)}
        change=rows[-1]["score"]-rows[0]["score"]
        return {
            "direction":"up" if change>0 else "down" if change<0 else "flat",
            "change":round(change,2),
            "observations":len(rows)
        }
