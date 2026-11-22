# Voice and audio

Date: 22 November 2026. No microphone, no phone call, and no external speech API was used.

Code, configuration, tests, and live connection are separate. A function that returns `NOT_IMPLEMENTED` is code that records a gap. It is not a working recognizer.

## Answers

1. The Node server does not hear a person. `hearing.js` can score PCM energy. Human transcription is `NOT_IMPLEMENTED` in `humanStt.js`.
2. Speech is not turned into text by a Buzzard model. The optional `Buzzard/web/index.html` page can use the browser's own speech recognition. That page is not the commerce server.
3. Official TTS is not connected. `nativeTts.js` builds a prototype tone and sets `liveTts: false`.
4. Real-time conversation is blocked by `PUSAT_LIVE_VOICE` in `phase13Pusat.js`.
5. The server has no barge-in. The optional HTML page can call `speechSynthesis.cancel()`.
6. Text meetings and agent memory exist. They are not a live voice context.
7. Character voice maps exist in `engines/speech.js` with `live: false`. They are not distinct speaking voices.
8. A phone call cannot be placed. `authorizeOutbound` returns `PROVIDER_NOT_CONFIGURED`. Twilio appears as an environment probe, not a client call.
9. WebRTC signaling stores offer, answer, and ICE strings in a process map (`signaling.js`, `liveMedia: false`). Media transport, STUN, and TURN are not connected. `webrtcMedia` is false.

## Capability table

| Capability | Code | Test | Live |
|---|---|---|---|
| STT | File inspect and tone loopback. Human transcribe not implemented. | Native phase tests expect the block. | No |
| TTS | Prototype tone WAV | Phase tests | No |
| VAD | RMS threshold, explicitly not STT | Runtime enqueue | No |
| Audio in/out | PCM buffers | Local | No device |
| Streaming audio | Not found | None | No |
| Real-time voice | Gate | Phase gate test | BLOCKED_EXTERNAL |
| Barge-in | Browser cancel only | None on the server | No |
| Speaker identification | Not implemented. Council `speakerId` is an agent id. | None | No |
| Session | In-process map | Phase 15 | No network |
| Error recovery | Simulated packet loss | Phase 15 | No |
| WebRTC signaling | In-memory bag | Scorecard test | No peers |
| WebRTC media | Not implemented | Phase 15 | No |
| ICE | Stored string | Limited | No negotiation |
| STUN/TURN | Status BLOCKED | Adapter test | No |
| OpenAI Realtime | No client. Egress denies `api.openai.com`. | Egress tests | No |
| Phone | Refused | Master-command test | LIVE_VERIFICATION_REQUIRED |

STATUS for live voice: BLOCKED_EXTERNAL.
CONFIDENCE: High that this tree does not place a call or transcribe speech with its own model.
RECOMMENDED ACTION: Leave the gates closed. Do not treat the browser demo as the product voice stack.
