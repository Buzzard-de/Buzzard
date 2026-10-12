/**
 * Local 24/7 file watcher. Does not attach to ChatGPT or run Cursor.
 */

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function watchForever(engine, { intervalMs = 5000, onTick } = {}) {
  process.stdout.write("Buzzard bridge watch started. ChatGPT session: NOT_AVAILABLE. Cursor auto-run: false.\n");
  for (;;) {
    const tick = engine.pollInbox();
    if (onTick) onTick(tick);
    if (tick.imported.length) {
      process.stdout.write(`Imported ${tick.imported.length} report(s). Commands were not executed.\n`);
    }
    await sleep(intervalMs);
  }
}

module.exports = { watchForever };
