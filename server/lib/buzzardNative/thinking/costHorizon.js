/**
 * Multi-year TCO. Unquoted money stays UNKNOWN.
 */
function costHorizon() {
  const unknownYear = {
    externalApi: "UNKNOWN",
    nativeDev: "UNKNOWN",
    hardware: "UNKNOWN",
    electricity: "UNKNOWN",
    maintenance: "UNKNOWN",
    training: "UNKNOWN",
    perCall: "UNKNOWN",
    perUser: "UNKNOWN",
  };
  return {
    quoted: false,
    y3: unknownYear,
    y5: { ...unknownYear },
    buildVsLicense: {
      thinking_rules: "build_in_house",
      tiny_from_scratch: "build_in_house",
      tokenizer_byte_bpe: "build_in_house",
      full_transformer_pretrain: "research_then_decide",
      stt_tts_foundation: "build_later_no_saas_core",
      open_source_after_license_review: "allowed_only_after_esat_review",
    },
    note: "SaaS LLM API is not the Buzzard core engine.",
  };
}

module.exports = { costHorizon };
