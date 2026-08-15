class WarehouseService:
    def __init__(self,repo): self.repo=repo
    def putaway(self,sku,location,quantity):
        if quantity<1: raise ValueError("INVALID_QUANTITY")
        r=self.repo.get((sku,location)) or {"sku":sku,"location":location,"quantity":0}
        r["quantity"]+=quantity; self.repo.save((sku,location),r); return r
    def pick(self,sku,location,quantity):
        r=self.repo.get((sku,location)) or {"sku":sku,"location":location,"quantity":0}
        if r["quantity"]<quantity: raise ValueError("INSUFFICIENT_LOCATION_STOCK")
        r["quantity"]-=quantity; self.repo.save((sku,location),r); return r
    def cycle_count(self,sku,location,observed):
        r=self.repo.get((sku,location)) or {"sku":sku,"location":location,"quantity":0}
        r["quantity"]=max(0,int(observed)); self.repo.save((sku,location),r); return r
