function analyze({ energy = 0, speaking = false, silenceMs = 0, silenceTimeoutMs = 800 } = {}) {
  const speechStart = speaking || energy > 0.35;
  const speechEnd = !speechStart && silenceMs >= silenceTimeoutMs;
  return {
    speechStart,
    speechEnd,
    silenceTimeout: speechEnd,
    interruption: speechStart,
  };
}

module.exports = {
  analyze,
};
