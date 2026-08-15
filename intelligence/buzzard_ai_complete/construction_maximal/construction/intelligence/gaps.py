class ConstructionGapDetector:
    def compare(self, ours, competitor):
        ours_set = {str(x).strip().casefold() for x in ours}
        return [x for x in competitor if str(x).strip().casefold() not in ours_set]
