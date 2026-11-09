/**
 * Pusat WhatsApp sandbox. Does not send, migrate, or touch personal chats.
 */
function status() {
  return {
    connected: false,
    liveAccount: false,
    numberMigrated: false,
    messagesSent: 0,
    personalNumberPreserved: true,
    backupsUntouched: true,
  };
}

function send() {
  return { ok: false, code: "WHATSAPP_SEND_DENIED", sent: false, live: false };
}

function migrateNumber() {
  return { ok: false, code: "NUMBER_MIGRATION_DENIED" };
}

module.exports = { status, send, migrateNumber };
