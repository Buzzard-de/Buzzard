/**
 * Why 5536-param next-token fails held-out reasoning. Not an excuse to hide scores.
 */
function whyReasoningFails() {
  return {
    phase5HeldOut: "1/11 string match (likely chance)",
    phase6HeldOut: "0/11",
    causes: [
      "objective_is_next_token_not_proof",
      "corpus_is_tiny_synthetic_not_language",
      "no_chain_of_thought_supervision",
      "dModel_8_one_block_cannot_carry_logic",
      "greedy_decode_from_byte_bpe_is_not_an_answer",
    ],
    moreParamsAlone: "not_a_success_criterion",
    generalIntelligence: false,
  };
}

module.exports = { whyReasoningFails };
