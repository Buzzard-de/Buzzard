class Verifier:
    def __init__(self,db): self.db=db
    def verify_claim(self,claim_id,confidence,status='VERIFIED'):
        self.db.execute('UPDATE claims SET confidence=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',(confidence,status,claim_id))
        return {'claim_id':claim_id,'confidence':confidence,'status':status}
