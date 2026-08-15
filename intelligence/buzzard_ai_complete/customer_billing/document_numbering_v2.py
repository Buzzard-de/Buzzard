class DocumentNumbering:
    def __init__(self, prefix):
        self.prefix = prefix
        self.counter = 0

    def next(self):
        self.counter += 1
        return f"{self.prefix}-{self.counter:08d}"
