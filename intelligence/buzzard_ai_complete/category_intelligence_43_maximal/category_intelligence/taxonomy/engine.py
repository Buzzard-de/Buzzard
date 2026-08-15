class TaxonomyIntelligence:
    def canonicalize(self, name):
        return " ".join(str(name).strip().lower().split())

    def flatten(self, nodes):
        return {self.canonicalize(n.name): n for n in nodes}

    def missing_nodes(self, buzzard_nodes, observed_nodes):
        ours = self.flatten(buzzard_nodes)
        missing = []
        for node in observed_nodes:
            key = self.canonicalize(node.name)
            if key not in ours:
                missing.append(node)
        return missing

    def hierarchy_gaps(self, buzzard_nodes, observed_nodes):
        ours = {(n.level, self.canonicalize(n.name)) for n in buzzard_nodes}
        gaps = []
        for n in observed_nodes:
            key = (n.level, self.canonicalize(n.name))
            if key not in ours:
                gaps.append({
                    "name": n.name,
                    "level": n.level,
                    "parent_id": n.parent_id,
                    "source": n.source
                })
        return gaps
