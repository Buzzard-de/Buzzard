from dataclasses import dataclass


@dataclass
class ExperimentResult:
    experiment_id: str
    variant_a_roas: float
    variant_b_roas: float

    def winner(self):
        if self.variant_a_roas == self.variant_b_roas:
            return "TIE"
        return "A" if self.variant_a_roas > self.variant_b_roas else "B"
