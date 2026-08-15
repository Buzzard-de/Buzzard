VALID={"requested","approved","label_created","in_transit","received","inspected","refunded","replaced","rejected","closed"}
TRANSITIONS={
 "requested":{"approved","rejected"},
 "approved":{"label_created","rejected"},
 "label_created":{"in_transit"},
 "in_transit":{"received"},
 "received":{"inspected"},
 "inspected":{"refunded","replaced","rejected"},
 "refunded":{"closed"},
 "replaced":{"closed"},
 "rejected":{"closed"}
}
class RMAService:
    def __init__(self,repo): self.repo=repo
    def create(self, order_id, items, reason):
        r={"rma_id":self.repo.new_id(),"order_id":order_id,"items":items,"reason":reason,"status":"requested"}
        self.repo.save(r); return r
    def transition(self,rma_id,status):
        r=self.repo.get(rma_id)
        if not r: raise ValueError("RMA_NOT_FOUND")
        if status not in TRANSITIONS.get(r["status"],set()): raise ValueError("INVALID_RMA_TRANSITION")
        r["status"]=status; self.repo.save(r); return r
