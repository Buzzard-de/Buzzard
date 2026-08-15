class CategoryGapDetector:
    def compare(self, ours, observed_public_categories):
        ours_set = {str(x).casefold() for x in ours}
        return [x for x in observed_public_categories if str(x).casefold() not in ours_set]
