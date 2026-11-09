function detectBlobs(gray, width, height) {
  const seen = new Uint8Array(gray.length);
  const boxes = [];
  const dirs = [1, -1, width, -width];
  for (let i = 0; i < gray.length; i += 1) {
    if (gray[i] < 128 || seen[i]) continue;
    const q = [i];
    seen[i] = 1;
    let minX = i % width;
    let maxX = minX;
    let minY = Math.floor(i / width);
    let maxY = minY;
    let n = 0;
    while (q.length) {
      const p = q.pop();
      n += 1;
      const x = p % width;
      const y = Math.floor(p / width);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      for (const d of dirs) {
        const nidx = p + d;
        if (nidx < 0 || nidx >= gray.length) continue;
        if (d === 1 && x === width - 1) continue;
        if (d === -1 && x === 0) continue;
        if (seen[nidx] || gray[nidx] < 128) continue;
        seen[nidx] = 1;
        q.push(nidx);
      }
    }
    if (n >= 4) boxes.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, pixels: n });
  }
  return {
    ok: true,
    boxes,
    count: boxes.length,
    kind: "CONNECTED_COMPONENTS_NOT_GENERAL_DETECT",
    generalDetect: false,
    understanding: false,
  };
}

function syntheticTwoBlobs() {
  const w = 16;
  const h = 8;
  const g = Buffer.alloc(w * h, 0);
  for (let y = 1; y < 4; y += 1) for (let x = 1; x < 4; x += 1) g[y * w + x] = 255;
  for (let y = 4; y < 7; y += 1) for (let x = 10; x < 14; x += 1) g[y * w + x] = 255;
  return { ...detectBlobs(g, w, h), width: w, height: h };
}

module.exports = { detectBlobs, syntheticTwoBlobs };
