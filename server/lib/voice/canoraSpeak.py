"""Speak with the local Canora Turkish ONNX weights. No network call."""
import json
import os
import sys
import wave
from pathlib import Path

os.environ["LD_LIBRARY_PATH"] = ":".join(
    part for part in os.environ.get("LD_LIBRARY_PATH", "").split(":")
    if part and "piper" not in part
)

import numpy as np
import onnxruntime as ort

root = Path(sys.argv[1])
voice = sys.argv[2]
text = sys.argv[3]
out = sys.argv[4]
sys.path.insert(0, str(root))
from g2p_tr import TurkishG2P  # noqa: E402

phonemes, _ = TurkishG2P()(text)
symbols = list(phonemes)
vocab = json.loads((root / "config.json").read_text())["vocab"]
ids = [0] + [vocab[symbol] for symbol in symbols if symbol in vocab] + [0]
style = np.fromfile(root / "voices" / f"{voice}.bin", dtype=np.float32).reshape(510, 256)
row = min(max(len(symbols) - 1, 0), 509)
session = ort.InferenceSession(str(root / "model_quantized.onnx"), providers=["CPUExecutionProvider"])
audio = session.run(None, {
    "input_ids": np.array([ids], dtype=np.int64),
    "style": style[row:row + 1],
    "speed": np.ones((1,), dtype=np.float32),
})[0].reshape(-1)
pcm = np.clip(audio, -1, 1)
pcm = (pcm * 32767).astype(np.int16)
with wave.open(out, "w") as handle:
    handle.setnchannels(1)
    handle.setsampwidth(2)
    handle.setframerate(24000)
    handle.writeframes(pcm.tobytes())
print(len(pcm))
