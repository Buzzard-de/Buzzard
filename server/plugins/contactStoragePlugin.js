const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../lib/auth');
const { requirePermission } = require('../lib/rbac');

// Same location as every other store: follows BUZZARD_DATA_DIR (persistent disk, isolated tests).
const dataDir = require('../lib/dataDir').resolveDataDir();
const submissionsFile = path.join(dataDir, 'submissions.json');
const jsonFileStore = require('../lib/jsonFileStore');
const requestLog = new Map();
const WINDOW_MS = 5 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;
const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 254;
const MAX_MESSAGE_LENGTH = 3000;

function cleanupRequestLog(now) {
  for (const [ip, records] of requestLog.entries()) {
    const recent = records.filter(ts => now - ts < WINDOW_MS);
    if (recent.length === 0) {
      requestLog.delete(ip);
    } else {
      requestLog.set(ip, recent);
    }
  }
}

function isRateLimited(ip) {
  const now = Date.now();
  cleanupRequestLog(now);
  const records = requestLog.get(ip) || [];
  const recent = records.filter(ts => now - ts < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    requestLog.set(ip, recent);
    return true;
  }
  recent.push(now);
  requestLog.set(ip, recent);
  return false;
}

function normalizeText(value) {
  return String(value || '').trim();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function ensureDataDirectory() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function readSubmissions() {
  return jsonFileStore.readJsonArray(submissionsFile);
}

/**
 * Adds one message. The file is replaced as a whole under a lock, the previous
 * version is kept, and a damaged file is set aside instead of being overwritten.
 */
function addSubmission(submission) {
  jsonFileStore.updateJsonArray(submissionsFile, (submissions) => [...submissions, submission], { durable: true });
}

module.exports = {
  register(app) {
    ensureDataDirectory();

    app.post('/api/contact', (req, res) => {
      // The address as the proxy chain reports it, not a header the sender can write.
      const ip = require('../lib/security').getClientIp(req);
      if (isRateLimited(ip)) {
        return res.status(429).json({ message: 'Zu viele Anfragen. Bitte versuchen Sie es in einigen Minuten erneut.' });
      }

      if (req.body?._honey || req.body?._website) {
        return res.json({ message: 'Vielen Dank — Ihre Nachricht wurde erfolgreich empfangen.' });
      }

      const startedAt = Number(req.body?._formStarted || 0);
      if (startedAt > 0 && Date.now() - startedAt < 3000) {
        return res.status(400).json({ message: 'Bitte Formular kurz ausfüllen und erneut senden.' });
      }

      const name = normalizeText(req.body && req.body.name);
      const email = normalizeText(req.body && req.body.email).toLowerCase();
      const message = normalizeText(req.body && req.body.message);

      if (!name || !email || !message) {
        return res.status(400).json({ message: 'Bitte alle Felder ausfüllen.' });
      }
      if (name.length > MAX_NAME_LENGTH || email.length > MAX_EMAIL_LENGTH || message.length > MAX_MESSAGE_LENGTH) {
        return res.status(400).json({ message: 'Eine oder mehrere Eingaben sind zu lang.' });
      }
      if (!isValidEmail(email)) {
        return res.status(400).json({ message: 'Bitte eine gültige E-Mail-Adresse eingeben.' });
      }

      const submissionId = Date.now();
      try {
        addSubmission({ id: submissionId, name, email, message, createdAt: new Date().toISOString() });
      } catch (err) {
        // The sender is not told "received" for a message that was not stored.
        console.error('Kontaktanfrage konnte nicht gespeichert werden:', err.code || err.name);
        return res.status(503).json({ message: 'Ihre Nachricht konnte gerade nicht gespeichert werden. Bitte versuchen Sie es später erneut.' });
      }

      // Who wrote is in the submissions store; the server output only notes that something arrived.
      console.log('Kontaktanfrage gespeichert:', submissionId);
      return res.json({ message: 'Vielen Dank — Ihre Nachricht wurde erfolgreich empfangen.' });
    });

    app.get('/api/submissions', (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, 'orders.read')) return;
      const submissions = readSubmissions();
      return res.json({ submissions });
    });
  }
};
