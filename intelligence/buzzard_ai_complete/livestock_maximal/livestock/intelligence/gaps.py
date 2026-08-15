class LivestockGapDetector:
    def compare(self, buzzard_nodes, competitor_nodes):
        ours={x.strip().lower() for x in buzzard_nodes}
        return [x for x in competitor_nodes if x.strip().lower() not in ours]
