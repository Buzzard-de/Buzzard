# Face, video, and motion

Date: 22 November 2026. No camera was opened and no vision model was called.

The council face on screen is `"/council/sinan-bey.png"` in `digitalBody.js`. `body3d` is false. CSS or a PNG is not a digital human.

| Capability | Class | Evidence |
|---|---|---|
| Image input | Code gate | `vision.js` sniffs and validates. It does not understand a scene. |
| Camera input | Code gate | `cameraIntake.js` checks type and size and stores nothing. Test in `unstartedLocalSurfaces.test.mjs`. |
| Video input | Not implemented | `live_video` returns not implemented. |
| Face detection | Not implemented | `detect` is not implemented. |
| Face tracking | Not implemented | No tracker found. |
| Expression | Design labels | `expression.js` names states and sets `mesh: false`. |
| Object detection | Toy code | `blobDetect.js` counts connected components and sets `GENERAL_DETECT: false`. |
| Object tracking | Toy code | Frame hash diff, not a tracker. |
| Body detection | Not implemented | No body detector. |
| Pose | Labels | `idle`, `listening`, `thinking`, `speaking` on a PNG. `animation: false`. |
| Hands | Not implemented | `gestures: false`. |
| Gesture | Not implemented | No landmark module. |
| Motion | Timeline only | `motion.js` stores cues and sets `rendered: false`. |
| Scene understanding | Not implemented | `understand` is blocked. |
| Real-time video | Not implemented | No WebRTC video. |
| Digital human render | Static image | PNG path plus an emoji in the optional voice page. |
| Avatar | Static image | Registry points at image files. |
| 3D character | Not implemented | `engineStatus` marks `body3d` not implemented. |
| Lip sync | Schedule only | `visemeSchedule.js` sets `lipSync: false`. |
| Facial animation | Not implemented | `audio_to_face` is not implemented. |
| Body animation | Not implemented | `animate` is not implemented. |
| Try-on | Blocked | `tryOnPipeline.js` returns `VISION_MODEL_BLOCKED` and `visionRan: false`. |

External dependency: a vision model and a camera pipeline, both absent.
RISK LEVEL: P2 for the product story, P3 while sales are locked.
RECOMMENDED ACTION: Keep the vision call blocked. Do not describe the PNG as a digital human.
CONFIDENCE: High.
