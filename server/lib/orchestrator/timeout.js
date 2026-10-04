function withTimeout(promise, ms, code = "TIMEOUT") {
  const limit = Number(ms) || 8000;
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(code);
      err.code = code;
      reject(err);
    }, limit);
    timer.unref?.();
  });
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => clearTimeout(timer));
}

function retryRead(fn, { attempts = 2, delayMs = 20 } = {}) {
  let last;
  for (let i = 0; i < attempts; i += 1) {
    try {
      last = fn();
      if (last && last.ok !== false) return last;
    } catch (error) {
      last = { ok: false, code: "TRANSIENT", message: error.message };
    }
  }
  return last;
}

const FORBIDDEN_AUTORETRY = new Set(["PAYMENT", "REFUND", "PHONE_CALL", "CREATE"]);

function mayAutoRetry(kind) {
  return !FORBIDDEN_AUTORETRY.has(kind);
}

module.exports = {
  withTimeout,
  retryRead,
  mayAutoRetry,
};
