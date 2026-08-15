class Policy:
    ALLOWED={'READ','RESEARCH','WRITE_MEMORY','CREATE_TASK','REVIEW','AUDIT'}
    def check(self,action): return action in self.ALLOWED
