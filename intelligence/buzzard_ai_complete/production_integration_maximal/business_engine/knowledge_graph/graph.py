class KnowledgeGraph:
    def __init__(self):
        self.nodes={}
        self.edges=[]

    def upsert_node(self,node_id,node_type,attributes=None):
        self.nodes[node_id]={"id":node_id,"type":node_type,"attributes":attributes or {}}
        return self.nodes[node_id]

    def link(self,source,relation,target,evidence=None):
        edge={"source":source,"relation":relation,"target":target,"evidence":evidence or []}
        self.edges.append(edge)
        return edge

    def neighbors(self,node_id,relation=None):
        return [
            e for e in self.edges
            if e["source"]==node_id and (relation is None or e["relation"]==relation)
        ]
