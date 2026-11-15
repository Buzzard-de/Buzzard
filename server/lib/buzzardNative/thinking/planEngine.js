function topo(tasks) {
  const byId = new Map(tasks.map((t) => [t.id, { ...t, status: t.status || "pending" }]));
  const ordered = [];
  const seen = new Set();
  function visit(id, stack) {
    if (seen.has(id)) return;
    if (stack.has(id)) throw new Error("cyclic_dependency");
    stack.add(id);
    const t = byId.get(id);
    for (const d of t.deps || []) visit(d, stack);
    stack.delete(id);
    seen.add(id);
    ordered.push(t);
  }
  for (const t of tasks) visit(t.id, new Set());
  return ordered;
}

function plan({ goal, tasks } = {}) {
  const list =
    tasks ||
    String(goal || "")
      .split(/\s*(?:then|;)\s*/i)
      .map((title, i) => ({ id: `t${i + 1}`, title: title.trim(), deps: i ? [`t${i}`] : [] }))
      .filter((t) => t.title);
  const ordered = topo(list);
  return {
    ok: true,
    kind: "RULE_BASED",
    llmCompleted: false,
    ordered: ordered.map((t) => t.id),
    tasks: ordered,
    incomplete: ordered.filter((t) => t.status !== "done").map((t) => t.id),
    complete: ordered.filter((t) => t.status === "done").map((t) => t.id),
  };
}

function replan(current, failedId) {
  const tasks = current.tasks.map((t) =>
    t.id === failedId ? { ...t, status: "failed" } : t.status === "done" ? t : { ...t, status: "pending" },
  );
  const retry = { id: `${failedId}_retry`, title: `retry ${failedId}`, deps: [failedId], status: "pending" };
  return plan({ tasks: [...tasks, retry] });
}

module.exports = { plan, replan, topo };
