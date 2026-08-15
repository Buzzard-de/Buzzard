class AutomotiveTaxonomy:
    def __init__(self, nodes=None, products=None):
        self.nodes = {n.id: n for n in (nodes or [])}
        self.products = {p.id: p for p in (products or [])}

    def add_node(self, node):
        if node.parent_id and node.parent_id not in self.nodes:
            raise ValueError("PARENT_NODE_NOT_FOUND")
        self.nodes[node.id] = node

    def add_product(self, product):
        if product.category_id not in self.nodes:
            raise ValueError("CATEGORY_NOT_FOUND")
        self.products[product.id] = product

    def children(self, node_id):
        return [n for n in self.nodes.values() if n.parent_id == node_id]

    def descendants(self, node_id):
        out=[]
        queue=list(self.children(node_id))
        while queue:
            n=queue.pop(0)
            out.append(n)
            queue.extend(self.children(n.id))
        return out

    def path(self, node_id):
        path=[]
        cur=self.nodes[node_id]
        while cur:
            path.append(cur)
            cur=self.nodes.get(cur.parent_id)
        return list(reversed(path))

    def search(self, query):
        q=query.lower().strip()
        return [
            n for n in self.nodes.values()
            if q in n.name.lower() or any(q in s.lower() for s in n.synonyms)
        ]
