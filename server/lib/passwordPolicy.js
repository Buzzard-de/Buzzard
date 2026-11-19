/**
 * Minimum strength for administrator passwords (bootstrap and change).
 *
 * The check never returns or logs the password, only a reason code.
 */
const MIN_LENGTH = 12;
const MAX_LENGTH = 256;
const LONG_ENOUGH_WITHOUT_CLASSES = 20;
const COMMON_FRAGMENTS = ["password", "passwort", "changeme", "letmein", "qwerty", "123456", "admin123", "welcome"];

function characterClasses(value) {
  return [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(value)).length;
}

/**
 * @param {unknown} password
 * @param {{ email?: string, denylist?: string[] }} [context] denylist: known default passwords (compared exactly)
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
function checkAdminPassword(password, { email = "", denylist = [] } = {}) {
  if (typeof password !== "string") return { ok: false, reason: "not_a_string" };
  if (password.length < MIN_LENGTH) return { ok: false, reason: "too_short" };
  if (password.length > MAX_LENGTH) return { ok: false, reason: "too_long" };
  if (password.trim() !== password || !password.trim()) return { ok: false, reason: "surrounding_whitespace" };
  if (denylist.includes(password)) return { ok: false, reason: "known_default" };

  const lower = password.toLowerCase();
  if (COMMON_FRAGMENTS.some((fragment) => lower.includes(fragment))) return { ok: false, reason: "common_pattern" };

  const localPart = String(email || "").toLowerCase().split("@")[0];
  if (localPart.length >= 4 && lower.includes(localPart)) return { ok: false, reason: "contains_account_name" };

  if (new Set(password).size < 6) return { ok: false, reason: "too_few_distinct_characters" };
  if (password.length < LONG_ENOUGH_WITHOUT_CLASSES && characterClasses(password) < 3) {
    return { ok: false, reason: "too_few_character_classes" };
  }
  return { ok: true };
}

module.exports = { checkAdminPassword, MIN_LENGTH, MAX_LENGTH };
