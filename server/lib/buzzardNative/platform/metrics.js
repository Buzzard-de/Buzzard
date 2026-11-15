function record(name, extra = {}) {
  return {
    name,
    at: new Date().toISOString(),
    env: "isolated_dev",
    hardware: "xeon_4c_no_gpu",
    method: extra.method || "in_process",
    dataset: extra.dataset || "buzzard_original_synthetic",
    value: extra.value,
    unit: extra.unit || null,
    measured: extra.measured !== false,
  };
}

function snapshot({ thinkingMs, rss, reasoningRate } = {}) {
  return [
    record("thinking_train_ms", { value: thinkingMs ?? null, unit: "ms" }),
    record("rss_delta", { value: rss ?? null, unit: "bytes" }),
    record("reasoning_heldout_rate", { value: reasoningRate ?? 0, unit: "ratio" }),
    record("stt_wer", { value: null, unit: "wer", measured: false }),
    record("tts_mos", { value: null, measured: false }),
    record("vision_map", { value: null, measured: false }),
    record("webrtc_rtt", { value: null, measured: false }),
    record("availability_24_7", { value: false, measured: true, method: "supervisor_not_running" }),
  ];
}

module.exports = { record, snapshot };
