/**
 * Part 13 — Deployment identity (commit/branch/version) for drift detection.
 * Render redeploy from main required when this file changes without live version endpoint.
 */
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const pkg = require(path.join(__dirname, "..", "..", "package.json"));
const BUILD_INFO_FILE = path.join(__dirname, "..", "data", "build-info.json");

function readBuildInfoFile() {
  try {
    if (fs.existsSync(BUILD_INFO_FILE)) {
      return JSON.parse(fs.readFileSync(BUILD_INFO_FILE, "utf8"));
    }
  } catch {
    /* ignore */
  }
  return null;
}

function readLocalGitCommit() {
  try {
    const root = path.join(__dirname, "..", "..");
    return execSync("git rev-parse HEAD", { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function readLocalGitBranch() {
  try {
    const root = path.join(__dirname, "..", "..");
    return execSync("git rev-parse --abbrev-ref HEAD", { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function resolveCommit() {
  const file = readBuildInfoFile();
  return (
    process.env.RENDER_GIT_COMMIT ||
    process.env.BUZZARD_GIT_COMMIT ||
    process.env.GIT_COMMIT ||
    file?.commit ||
    readLocalGitCommit() ||
    "unknown"
  );
}

function resolveBranch() {
  const file = readBuildInfoFile();
  return (
    process.env.RENDER_GIT_BRANCH ||
    process.env.BUZZARD_GIT_BRANCH ||
    process.env.GIT_BRANCH ||
    file?.branch ||
    readLocalGitBranch() ||
    "unknown"
  );
}

function getDeploymentIdentity() {
  const commit = resolveCommit();
  const branch = resolveBranch();
  const buildTime =
    process.env.BUZZARD_BUILD_TIME ||
    process.env.RENDER_BUILD_TIME ||
    readBuildInfoFile()?.buildTime ||
    null;

  return {
    service: "buzzard-api",
    environment: process.env.NODE_ENV || "development",
    commit: commit === "unknown" ? commit : commit.slice(0, 12),
    commitFull: commit,
    branch,
    buildTime,
    version: pkg.version || "1.0.0",
    salesEnabled: process.env.BUZZARD_SALES_ENABLED === "1",
  };
}

function compareCommits(expected, running) {
  if (!expected || !running || expected === "unknown" || running === "unknown") {
    return { match: null, drift: null, reason: "commit_unknown" };
  }
  const e = expected.toLowerCase();
  const r = running.toLowerCase();
  const match = e === r || e.startsWith(r) || r.startsWith(e) || e.slice(0, 12) === r.slice(0, 12);
  return {
    match,
    drift: match ? false : true,
    expectedCommit: e.slice(0, 12),
    runningCommit: r.slice(0, 12),
  };
}

function getDeploymentDrift(expectedCommit) {
  const identity = getDeploymentIdentity();
  const expected =
    expectedCommit ||
    process.env.BUZZARD_EXPECTED_GIT_COMMIT ||
    readLocalGitCommit() ||
    null;
  const comparison = compareCommits(expected, identity.commitFull);
  return {
    ...comparison,
    identity,
    status: comparison.match === true ? "SYNCED" : comparison.match === false ? "DEPLOYMENT_DRIFT" : "UNKNOWN",
  };
}

module.exports = {
  getDeploymentIdentity,
  getDeploymentDrift,
  compareCommits,
  readLocalGitCommit,
};
