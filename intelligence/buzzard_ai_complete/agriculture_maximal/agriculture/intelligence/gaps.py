class AgricultureGapDetector:
    def compare_taxonomies(self, ours, competitor):
        """
        Returns public-source taxonomy nodes seen elsewhere but absent in ours.
        The caller is responsible for provenance and lawful source collection.
        """
        ours_set={str(x).strip().lower() for x in ours}
        return [x for x in competitor if str(x).strip().lower() not in ours_set]
