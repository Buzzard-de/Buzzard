class AccountingLedgerV2:
    def __init__(self):
        self.entries = []

    def post(self, account, debit=0.0, credit=0.0, reference=""):
        if debit < 0 or credit < 0:
            raise ValueError("ledger_amount_must_not_be_negative")
        if debit and credit:
            raise ValueError("entry_cannot_have_both_debit_and_credit")
        entry = {
            "account": account,
            "debit": round(debit, 2),
            "credit": round(credit, 2),
            "reference": reference,
        }
        self.entries.append(entry)
        return entry

    def balance(self, account):
        return round(
            sum(entry["debit"] - entry["credit"] for entry in self.entries if entry["account"] == account),
            2,
        )
