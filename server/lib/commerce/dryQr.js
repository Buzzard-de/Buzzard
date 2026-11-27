/**
 * Local QR Code Model 2, byte mode, error correction L, mask 0.
 * Versions 1–5 use one data block. No network and no payment provider.
 */
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) EXP[i] = EXP[i - 255];
})();

const VERSIONS = {
  1: { size: 21, data: 19, ecc: 7, align: [], remainder: 0 },
  2: { size: 25, data: 34, ecc: 10, align: [6, 18], remainder: 7 },
  3: { size: 29, data: 55, ecc: 15, align: [6, 22], remainder: 7 },
  4: { size: 33, data: 80, ecc: 20, align: [6, 26], remainder: 7 },
  5: { size: 37, data: 108, ecc: 26, align: [6, 30], remainder: 7 },
};

function mul(a, b) {
  if (!a || !b) return 0;
  return EXP[LOG[a] + LOG[b]];
}

function rsGenerator(count) {
  let poly = [1];
  for (let i = 0; i < count; i += 1) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j += 1) {
      next[j] ^= mul(poly[j], EXP[i]);
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }
  return poly;
}

function rsRemainder(data, eccCount) {
  const gen = rsGenerator(eccCount);
  const msg = data.concat(new Array(eccCount).fill(0));
  for (let i = 0; i < data.length; i += 1) {
    const coef = msg[i];
    if (!coef) continue;
    for (let j = 0; j < gen.length; j += 1) msg[i + j] ^= mul(gen[j], coef);
  }
  return msg.slice(data.length);
}

function dataCodewords(bytes, capacity) {
  const bits = [];
  const push = (value, len) => {
    for (let i = len - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1);
  };
  push(0b0100, 4);
  push(bytes.length, 8);
  for (const byte of bytes) push(byte, 8);
  const maxBits = capacity * 8;
  for (let i = 0; i < Math.min(4, maxBits - bits.length); i += 1) bits.push(0);
  while (bits.length % 8) bits.push(0);
  const words = [];
  for (let i = 0; i < bits.length; i += 8) {
    let value = 0;
    for (let bit = 0; bit < 8; bit += 1) value = (value << 1) | bits[i + bit];
    words.push(value);
  }
  const pads = [0xec, 0x11];
  let pad = 0;
  while (words.length < capacity) words.push(pads[pad++ % 2]);
  return words;
}

function formatBits() {
  let rem = 0b01000 << 10;
  for (let i = 14; i >= 10; i -= 1) {
    if ((rem >>> i) & 1) rem ^= 0b10100110111 << (i - 10);
  }
  return (((0b01000 << 10) | rem) ^ 0b101010000010010) & 0x7fff;
}

function inFinder(row, col, size) {
  const boxes = [
    [0, 0],
    [0, size - 7],
    [size - 7, 0],
  ];
  return boxes.some(([r, c]) => row >= r && row < r + 8 && col >= c && col < c + 8);
}

function functionModule(row, col, version) {
  const { size, align } = version;
  if (inFinder(row, col, size)) return true;
  if (row === 6 || col === 6) return true;
  if (align.length) {
    for (const r of align) {
      for (const c of align) {
        if (inFinder(r, c, size)) continue;
        if (Math.abs(row - r) <= 2 && Math.abs(col - c) <= 2) return true;
      }
    }
  }
  if (row === 8 && (col < 9 || col >= size - 8)) return true;
  if (col === 8 && (row < 9 || row >= size - 8)) return true;
  return false;
}

function paintFinder(matrix, row, col) {
  for (let r = 0; r < 7; r += 1) {
    for (let c = 0; c < 7; c += 1) {
      const edge = r === 0 || c === 0 || r === 6 || c === 6;
      const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      matrix[row + r][col + c] = edge || core;
    }
  }
}

function paintFunctions(matrix, version) {
  const { size, align } = version;
  paintFinder(matrix, 0, 0);
  paintFinder(matrix, 0, size - 7);
  paintFinder(matrix, size - 7, 0);
  for (let i = 8; i < size - 8; i += 1) {
    const on = i % 2 === 0;
    matrix[6][i] = on;
    matrix[i][6] = on;
  }
  for (const row of align) {
    for (const col of align) {
      if (inFinder(row, col, size)) continue;
      for (let r = -2; r <= 2; r += 1) {
        for (let c = -2; c <= 2; c += 1) {
          const edge = Math.abs(r) === 2 || Math.abs(c) === 2;
          matrix[row + r][col + c] = edge || (r === 0 && c === 0);
        }
      }
    }
  }
  matrix[size - 8][8] = true;
  const bits = formatBits();
  const positions = [];
  for (let i = 0; i < 15; i += 1) positions.push((bits >>> (14 - i)) & 1);
  const horizontal = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ];
  horizontal.forEach(([row, col], index) => {
    matrix[row][col] = Boolean(positions[index]);
  });
  const vertical = [];
  for (let col = size - 1; col >= size - 8; col -= 1) vertical.push([8, col]);
  for (let row = size - 7; row < size; row += 1) vertical.push([row, 8]);
  vertical.forEach(([row, col], index) => {
    matrix[row][col] = Boolean(positions[index]);
  });
}

function placeData(matrix, version, bits) {
  const { size } = version;
  let index = 0;
  let upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col -= 1;
    for (let step = 0; step < size; step += 1) {
      const row = upward ? size - 1 - step : step;
      for (const offset of [0, -1]) {
        const c = col + offset;
        if (functionModule(row, c, version)) continue;
        matrix[row][c] = index < bits.length ? Boolean(bits[index]) : false;
        if (index < bits.length && (row + c) % 2 === 0) matrix[row][c] = !matrix[row][c];
        index += 1;
      }
    }
    upward = !upward;
  }
}

function readData(matrix, version) {
  const { size } = version;
  const bits = [];
  let upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col -= 1;
    for (let step = 0; step < size; step += 1) {
      const row = upward ? size - 1 - step : step;
      for (const offset of [0, -1]) {
        const c = col + offset;
        if (functionModule(row, c, version)) continue;
        let dark = matrix[row][c];
        if ((row + c) % 2 === 0) dark = !dark;
        bits.push(dark ? 1 : 0);
      }
    }
    upward = !upward;
  }
  return bits;
}

function chooseVersion(byteLength) {
  for (const number of [1, 2, 3, 4, 5]) {
    if (byteLength + 2 <= VERSIONS[number].data) return number;
  }
  return null;
}

function encodeQrMatrix(text) {
  const bytes = Buffer.from(String(text), "utf8");
  const number = chooseVersion(bytes.length);
  if (!number) return { ok: false, code: "QR_TOO_LONG" };
  const version = VERSIONS[number];
  const words = dataCodewords([...bytes], version.data);
  const ecc = rsRemainder(words, version.ecc);
  const stream = words.concat(ecc);
  const bits = [];
  for (const word of stream) {
    for (let i = 7; i >= 0; i -= 1) bits.push((word >>> i) & 1);
  }
  for (let i = 0; i < version.remainder; i += 1) bits.push(0);
  const matrix = Array.from({ length: version.size }, () => Array(version.size).fill(false));
  paintFunctions(matrix, version);
  placeData(matrix, version, bits);
  return { ok: true, version: number, size: version.size, matrix, payload: String(text) };
}

function decodeQrPayload(matrix, versionNumber) {
  const version = VERSIONS[versionNumber];
  const bits = readData(matrix, version);
  const words = [];
  const total = version.data + version.ecc;
  for (let i = 0; i < total; i += 1) {
    let value = 0;
    for (let bit = 0; bit < 8; bit += 1) value = (value << 1) | (bits[i * 8 + bit] || 0);
    words.push(value);
  }
  const data = words.slice(0, version.data);
  let cursor = 0;
  const take = (count) => {
    let value = 0;
    for (let i = 0; i < count; i += 1) {
      const index = cursor + i;
      const word = data[index >> 3];
      value = (value << 1) | ((word >>> (7 - (index & 7))) & 1);
    }
    cursor += count;
    return value;
  };
  const mode = take(4);
  const length = take(8);
  if (mode !== 0b0100) return { ok: false, code: "QR_MODE" };
  const bytes = [];
  for (let i = 0; i < length; i += 1) bytes.push(take(8));
  return { ok: true, payload: Buffer.from(bytes).toString("utf8") };
}

function encodeQrSvg(text) {
  const encoded = encodeQrMatrix(text);
  if (!encoded.ok) return encoded;
  const decoded = decodeQrPayload(encoded.matrix, encoded.version);
  const cell = 4;
  const quiet = 4;
  const span = encoded.size + quiet * 2;
  let rects = "";
  encoded.matrix.forEach((row, r) => {
    row.forEach((dark, c) => {
      if (dark) rects += `<rect x="${(c + quiet) * cell}" y="${(r + quiet) * cell}" width="${cell}" height="${cell}"/>`;
    });
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${span * cell} ${span * cell}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/>${rects}</svg>`;
  return { ...encoded, svg, roundTrip: decoded.ok && decoded.payload === String(text), decoded };
}

module.exports = { encodeQrMatrix, decodeQrPayload, encodeQrSvg, formatBits };
