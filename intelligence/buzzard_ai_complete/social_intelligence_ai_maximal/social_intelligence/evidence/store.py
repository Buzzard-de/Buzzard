class SocialEvidenceStore:
    def __init__(self):
        self.records=[]
        self.snapshots=[]

    def add(self, evidence):
        self.records.append(evidence)

    def snapshot(self, platform, timestamp, count):
        self.snapshots.append({
            "platform":platform,
            "timestamp":timestamp,
            "count":count
        })

    def recent(self, platform=None, limit=100):
        rows=self.records
        if platform:
            rows=[x for x in rows if x.platform==platform]
        return rows[-limit:]
