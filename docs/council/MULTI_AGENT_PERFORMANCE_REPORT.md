# Multi-Agent Performance

Measured 8 November 2026 18:30 Europe/Berlin on this VM.

Hardware (`thinking/hardwareProbe.js` + `/proc`):

- Intel(R) Xeon(R) Processor, 4 cores
- RAM 16780574720 bytes ≈ 15.63 GiB
- GPU none_detected, CUDA false
- Disk `/dev/vdc` 254G, ~11G used, 243G avail
- Node v22.23.4

Load probe (`core/loadProbe.js`): sequential in-process `think()` calls. **Not** eight OS processes, **not** eight LLM instances.

| Scenario | agents | ms | rssDeltaMb | errors |
|---|---:|---:|---:|---:|
| one | 1 | 0.128 | 0 | 0 |
| two | 2 | 0.042 | 0 | 0 |
| four | 4 | 0.084 | 0 | 0 |
| eight | 8 | 0.087 | 0 | 0 |
| pusat + three experts | 4 | 0.044 | 0 | 0 |
| all registered | 8 | 0.080 | 0 | 0 |

Honest capacity:

- Rule runtime: eight identities in one Node process is fine.
- Eight simultaneous general LLMs / real ASR / neural TTS: **not possible** on this host (no GPU, ~16 GiB, 0 EUR, egress DENY).
- Shared engines save RAM versus eight copies; a thinking crash still leaves hearing up (`thinkingCrashed=true`, `hearingOk=true`).
