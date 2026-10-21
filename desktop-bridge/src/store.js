const fs = require("fs");
const path = require("path");
const { defaultHome, ensureDir, writeAtomic } = require("./paths");

function files(home = defaultHome()) {
  ensureDir(home);
  return {
    home,
    settings: path.join(home, "settings.json"),
    tasks: path.join(home, "tasks.json"),
  };
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function loadState(home = defaultHome()) {
  const paths = files(home);
  const settings = readJson(paths.settings, {
    workspaceRoots: [],
    bind: "127.0.0.1",
    port: 47821,
    openaiApiKeyPresent: false,
  });
  const tasks = readJson(paths.tasks, { tasks: [] });
  return {
    home: paths.home,
    settings,
    tasks: Array.isArray(tasks.tasks) ? tasks.tasks : [],
  };
}

function saveSettings(home, settings) {
  const paths = files(home);
  writeAtomic(paths.settings, `${JSON.stringify(settings, null, 2)}\n`);
}

function saveTasks(home, tasks) {
  const paths = files(home);
  writeAtomic(paths.tasks, `${JSON.stringify({ tasks }, null, 2)}\n`);
}

module.exports = { files, loadState, saveSettings, saveTasks };
