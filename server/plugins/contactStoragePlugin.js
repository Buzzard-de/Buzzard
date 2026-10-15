const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../lib/auth');
const { requirePermission } = require('../lib/rbac');

const dataDir = path.join(__dirname, '..', 'data');
const submissionsFile = path.join(dataDir, 'submissions.json');
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

function validateContactAntiAbuse(body, now = Date.now()) {
  if (body && (body._honey || body._website)) {
    return { ok: true, discarded: true, reason: "honeypot" };
  }
  const startedAt = Number(body && body._formStarted);
  if (!Number.isFinite(startedAt) || startedAt <= 0 || startedAt > now + 60_000) {
    return { ok: false, status: 400, reason: "FORM_START_REQUIRED", stored: false };
  }
  if (now - startedAt < 3000) {
    return { ok: false, status: 400, reason: "FORM_TOO_FAST", stored: false };
  }
  return { ok: true, discarded: false };
}

function ensureDataDirectory() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function readSubmissions() {
  if (!fs.existsSync(submissionsFile)) {
    return [];
  }
  try {
    const content = fs.readFileSync(submissionsFile, 'utf8');
    return JSON.parse(content || '[]');
  } catch (err) {
    console.error('Error reading submissions file:', require('../lib/security').publicTaskError(err, 'contact.readFailed'));
    return [];
  }
}

function writeSubmissions(submissions) {
  try {
    fs.writeFileSync(submissionsFile, JSON.stringify(submissions, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing submissions file:', require('../lib/security').publicTaskError(err, 'contact.writeFailed'));
    return false;
  }
}

module.exports = {
  validateContactAntiAbuse,
  writeSubmissions,
  register(app) {
    ensureDataDirectory();

    app.post('/api/contact', (req, res) => {
      const forwardedFor = req.headers['x-forwarded-for'];
      const ip = (Array.isArray(forwardedFor) ? forwardedFor[0] : (forwardedFor || req.socket.remoteAddress || 'unknown')).split(',')[0].trim();
      if (isRateLimited(ip)) {
        return res.status(429).json({ message: 'Zu viele Anfragen. Bitte versuchen Sie es in einigen Minuten erneut.', errorKey: 'contact.rateLimited' });
      }

      const abuse = validateContactAntiAbuse(req.body);
      if (abuse.discarded) {
        return res.json({ message: 'Vielen Dank — Ihre Nachricht wurde erfolgreich empfangen.' });
      }
      if (!abuse.ok) {
        return res.status(abuse.status || 400).json({ message: 'Bitte Formular kurz ausfüllen und erneut senden.', errorKey: 'contact.invalid' });
      }

      const name = normalizeText(req.body && req.body.name);
      const email = normalizeText(req.body && req.body.email).toLowerCase();
      const message = normalizeText(req.body && req.body.message);

      if (!name || !email || !message) {
        return res.status(400).json({ message: 'Bitte alle Felder ausfüllen.', errorKey: 'contact.fieldsRequired' });
      }
      if (name.length > MAX_NAME_LENGTH || email.length > MAX_EMAIL_LENGTH || message.length > MAX_MESSAGE_LENGTH) {
        return res.status(400).json({ message: 'Eine oder mehrere Eingaben sind zu lang.', errorKey: 'contact.tooLong' });
      }
      if (!isValidEmail(email)) {
        return res.status(400).json({ message: 'Bitte eine gültige E-Mail-Adresse eingeben.', errorKey: 'contact.invalidEmail' });
      }

      const submissions = readSubmissions();
      submissions.push({
        id: Date.now(),
        name,
        email,
        message,
        createdAt: new Date().toISOString(),
      });
      if (!writeSubmissions(submissions)) {
        return res.status(500).json({
          message: 'Nachricht konnte nicht gespeichert werden. Bitte später erneut versuchen.',
          errorKey: 'contact.writeFailed',
        });
      }

      console.log('Kontaktanfrage gespeichert:', { received: true, id: submissions[submissions.length - 1].id });
      return res.json({ message: 'Vielen Dank — Ihre Nachricht wurde erfolgreich empfangen.', errorKey: 'contact.received' });
    });

    app.get('/api/submissions', (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, 'orders.read')) return;
      const submissions = readSubmissions();
      return res.json({ submissions });
    });
  }
};
