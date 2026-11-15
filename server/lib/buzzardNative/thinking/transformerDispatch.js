/**
 * Explains the Phase 5/6 split: a 1-block prototype exists; the full transformer op does not.
 */
function transformerDispatch() {
  return {
    ok: false,
    code: "NOT_IMPLEMENTED",
    implemented: false,
    fullGeneralTransformer: false,
    prototype: {
      op: "transformer_proto",
      status: "CODE_READY",
      architecture: "tiny_causal_transformer",
      layers: 1,
      boundToFullOp: false,
    },
    reason: "op 'transformer' means a general production Transformer. The trained 1-block prototype is invoked only via transformer_proto / SINAN_TRAIN_RUN.",
  };
}

module.exports = { transformerDispatch };
