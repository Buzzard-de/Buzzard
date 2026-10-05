const FORBIDDEN_STORE = ["videoFrame", "rawVideo", "faceEmbedding", "biometric", "faceId"];

function sanitizePresence(input = {}) {
  return {
    present: Boolean(input.present),
    cameraOn: Boolean(input.cameraOn),
    micOn: Boolean(input.micOn),
    gazeHint: input.gazeHint === "USER" || input.gazeHint === "AWAY" ? input.gazeHint : "UNKNOWN",
    identityClaimed: false,
    biometricStored: false,
    persistentVideo: false,
  };
}

function forbidPersistentCamera(payload = {}) {
  for (const key of FORBIDDEN_STORE) {
    if (payload[key]) return { ok: false, code: "CAMERA_PERSISTENCE_FORBIDDEN" };
  }
  return { ok: true };
}

function sessionOnlyCameraPolicy() {
  return {
    persistRawVideo: false,
    faceRecognition: false,
    biometricIdentification: false,
    identityFromAuthorizedContextOnly: true,
  };
}

module.exports = {
  sanitizePresence,
  forbidPersistentCamera,
  sessionOnlyCameraPolicy,
};
