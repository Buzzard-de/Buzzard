const { footprintBlocked, inBounds } = require("./worldGraph");

function neighbors(x, z) {
  return [
    [x + 0.5, z],
    [x - 0.5, z],
    [x, z + 0.5],
    [x, z - 0.5],
    [x + 0.5, z + 0.5],
    [x - 0.5, z - 0.5],
    [x + 0.5, z - 0.5],
    [x - 0.5, z + 0.5],
  ];
}

function key(x, z) {
  return `${x.toFixed(1)},${z.toFixed(1)}`;
}

function findPath(world, from, to) {
  const start = { x: from.x, z: from.z };
  const goal = { x: to.x, z: to.z };
  if (!inBounds(world, goal.x, goal.z)) {
    return { ok: false, code: "NAVIGATION_OUT_OF_BOUNDS" };
  }
  const open = [{ ...start, g: 0, path: [start] }];
  const seen = new Set([key(start.x, start.z)]);
  let guard = 0;
  while (open.length && guard < 800) {
    guard += 1;
    open.sort((a, b) => a.g + hypot(a, goal) - (b.g + hypot(b, goal)));
    const cur = open.shift();
    if (hypot(cur, goal) < 0.7) {
      return { ok: true, path: [...cur.path, goal], steps: cur.path.length };
    }
    for (const [nx, nz] of neighbors(cur.x, cur.z)) {
      const k = key(nx, nz);
      if (seen.has(k) || !inBounds(world, nx, nz)) continue;
      if (footprintBlocked(world, nx, nz)) continue;
      seen.add(k);
      open.push({ x: nx, z: nz, g: cur.g + 0.5, path: [...cur.path, { x: nx, z: nz }] });
    }
  }
  return { ok: false, code: "NAVIGATION_BLOCKED" };
}

function hypot(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function approachPoint(object) {
  return {
    x: object.position.x,
    z: Math.max(0.5, object.position.z - (object.size?.z || 0.6) / 2 - 0.7),
  };
}

module.exports = {
  findPath,
  approachPoint,
};
