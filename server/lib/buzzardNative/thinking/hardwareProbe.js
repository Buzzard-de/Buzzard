const fs = require("fs");
const { execFileSync } = require("child_process");

function read(path, fallback = "") {
  try {
    return fs.readFileSync(path, "utf8");
  } catch {
    return fallback;
  }
}

function probeHardware() {
  const cpuinfo = read("/proc/cpuinfo");
  const meminfo = read("/proc/meminfo");
  const model = (cpuinfo.match(/model name\s*:\s*(.+)/) || [])[1] || "UNKNOWN";
  const cores = (cpuinfo.match(/^processor\s*:/gm) || []).length || "UNKNOWN";
  const memKb = Number((meminfo.match(/MemTotal:\s+(\d+)/) || [])[1] || 0);
  let gpu = "none_detected";
  let vram = "UNKNOWN";
  let cuda = false;
  try {
    const smi = execFileSync("nvidia-smi", ["--query-gpu=name,memory.total", "--format=csv,noheader"], {
      timeout: 1500,
      encoding: "utf8",
    });
    gpu = smi.trim() || gpu;
    cuda = true;
  } catch {
    cuda = false;
  }
  let disk = "UNKNOWN";
  try {
    disk = execFileSync("df", ["-h", "/"], { encoding: "utf8", timeout: 1500 }).trim();
  } catch {
    disk = "UNKNOWN";
  }
  return {
    os: process.platform,
    node: process.version,
    cpuModel: model.trim(),
    cpuCores: cores,
    ramBytes: memKb ? memKb * 1024 : "UNKNOWN",
    gpu,
    vram,
    cuda,
    disk,
    cooling: "UNKNOWN",
    electricity: "UNKNOWN",
    measuredAt: new Date().toISOString(),
    liveCluster: false,
  };
}

module.exports = { probeHardware };
