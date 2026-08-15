class AutomotiveTaxonomyValidator:
    def validate(self, taxonomy):
        errors=[]
        for n in taxonomy.nodes.values():
            if n.parent_id and n.parent_id not in taxonomy.nodes:
                errors.append(f"ORPHAN:{n.id}")
            if n.level < 1:
                errors.append(f"INVALID_LEVEL:{n.id}")
        paths={}
        for n in taxonomy.nodes.values():
            path=">".join(x.name.lower() for x in taxonomy.path(n.id))
            if path in paths and paths[path] != n.id:
                errors.append(f"DUPLICATE_PATH:{path}")
            paths[path]=n.id
        return errors
