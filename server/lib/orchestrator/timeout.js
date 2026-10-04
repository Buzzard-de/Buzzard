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

async function retryProvider(fn, { attempts = 2, baseMs = 120, maxMs = 1500 } = {}) {
  const max = Math.min(3, Math.max(1, attempts));
  let last;
  for (let i = 0; i < max; i += 1) {
    try {
      last = await fn(i);
      if (last && last.ok !== false) return last;
    } catch (error) {
      last = { ok: false, code: "TRANSIENT", message: error.message };
    }
    if (i < max - 1) {
      const delay = Math.min(maxMs, baseMs * 2 ** i + Math.floor(Math.random() * baseMs));
      await new Promise((resolve) => {
        const t = setTimeout(resolve, delay);
        t.unref?.();
      });
    }
  }
  return last;
}

module.exports = {
  withTimeout,
  retryRead,
  retryProvider,
  mayAutoRetry,
};
