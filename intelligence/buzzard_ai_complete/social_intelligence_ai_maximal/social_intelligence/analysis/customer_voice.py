class SocialCustomerVoice:
    POSITIVE={"love","great","good","perfect","works","recommend"}
    NEGATIVE={"bad","broken","poor","problem","hate","refund","return"}

    def classify(self, texts):
        out=[]
        for text in texts:
            t=text.lower()
            pos=sum(x in t for x in self.POSITIVE)
            neg=sum(x in t for x in self.NEGATIVE)
            sentiment="positive" if pos>neg else "negative" if neg>pos else "neutral"
            out.append({"text":text,"sentiment":sentiment})
        return out
