/**
 * Item 226 — merge to a protected production branch stays human-gated.
 * Never runs git merge or gh pr merge. Feature-branch PRs are not merges.
 */

const AI_ACTORS = new Set(["pusat", "guardian", "orchestrator", "esat", "agent", "ai"]);

const PROTECTED_TARGETS = Object.freeze(["main", "master", "production"]);

function inspect(input = {}) {
  const branch = String(input.branch || process.env.GITHUB_REF_NAME || "").trim() || null;
  const target = String(input.target || "main").trim().toLowerCase();
  return {
    ok: true,
    live: false,
    merged: false,
    gitExecuted: false,
    ghExecuted: false,
    protectedTarget: PROTECTED_TARGETS.includes(target),
    protectedTargets: PROTECTED_TARGETS,
    currentBranch: branch,
    prNumber: input.prNumber || null,
    note: "A feature-branch PR is not a merge to a protected branch. Item 226.",
  };
}

function merge(input = {}) {
  const actor = String(input.actorId || input.actor || input.approver || "").trim().toLowerCase();
  const target = String(input.target || "main").trim().toLowerCase();
  if (AI_ACTORS.has(actor)) {
    return {
      ok: false,
      merged: false,
      live: false,
      mutated: false,
      gitExecuted: false,
      ghExecuted: false,
      target,
      prNumber: input.prNumber || null,
      reason: "SELF_APPROVE_DENIED",
      actor,
    };
  }
  return {
    ok: false,
    merged: false,
    live: false,
    mutated: false,
    gitExecuted: false,
    ghExecuted: false,
    forceMergeIgnored: input.forceMerge === true,
    target,
    prNumber: input.prNumber || null,
    reason: "HUMAN_PROTECTED_MERGE_REQUIRED",
    note: "Protected-branch merge is not executed here. Do not merge PR #431. Item 226.",
  };
}

module.exports = { PROTECTED_TARGETS, inspect, merge };
