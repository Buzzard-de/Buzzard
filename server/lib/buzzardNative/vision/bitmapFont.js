/** 5x7 bitmap for A-Z and 0-9. Original glyphs, not a copied font file. */
const GLYPHS = {
  S: ["01110", "10000", "01100", "00010", "11100"],
  I: ["11111", "00100", "00100", "00100", "11111"],
  N: ["10001", "11001", "10101", "10011", "10001"],
  A: ["01110", "10001", "11111", "10001", "10001"],
  T: ["11111", "00100", "00100", "00100", "00100"],
  R: ["11110", "10001", "11110", "10100", "10010"],
  U: ["10001", "10001", "10001", "10001", "01110"],
  E: ["11111", "10000", "11110", "10000", "11111"],
  K: ["10001", "10010", "11100", "10010", "10001"],
  "0": ["01110", "10001", "10001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "01110"],
  "2": ["11110", "00001", "01110", "10000", "11111"],
  D: ["11100", "10010", "10001", "10010", "11100"],
  G: ["01110", "10000", "10111", "10001", "01110"],
  L: ["10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "01110"],
  B: ["11110", "10001", "11110", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "01111"],
  H: ["10001", "10001", "11111", "10001", "10001"],
  P: ["11110", "10001", "11110", "10000", "10000"],
  Y: ["10001", "01010", "00100", "00100", "00100"],
};

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let i = 0; i < 8; i += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function deflateStore(raw) {
  const zlib = require("zlib");
  return zlib.deflateSync(raw);
}

function renderTextPng(text) {
  const letters = String(text)
    .toUpperCase()
    .split("")
    .filter((ch) => GLYPHS[ch]);
  const gw = 5;
  const gh = 5;
  const gap = 1;
  const width = letters.length * (gw + gap) - gap;
  const height = gh;
  const rows = [];
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width);
    row[0] = 0;
    letters.forEach((ch, li) => {
      const g = GLYPHS[ch][y];
      for (let x = 0; x < gw; x += 1) {
        row[1 + li * (gw + gap) + x] = g[x] === "1" ? 0 : 255;
      }
    });
    rows.push(row);
  }
  const raw = Buffer.concat(rows);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 0;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateStore(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return { png, width, height, text: letters.join(""), paethUnused: paeth };
}

function ocrBitmap(png) {
  const zlib = require("zlib");
  if (png[0] !== 0x89) return { ok: false, code: "NOT_PNG", understanding: false };
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  let i = 8;
  let idat = Buffer.alloc(0);
  while (i + 8 <= png.length) {
    const len = png.readUInt32BE(i);
    const type = png.slice(i + 4, i + 8).toString("ascii");
    const data = png.slice(i + 8, i + 8 + len);
    if (type === "IDAT") idat = Buffer.concat([idat, data]);
    if (type === "IEND") break;
    i += 12 + len;
  }
  let raw;
  try {
    raw = zlib.inflateSync(idat);
  } catch {
    return { ok: false, code: "INFLATE_FAIL", understanding: false };
  }
  const gw = 5;
  const gap = 1;
  const stride = 1 + width;
  const letters = [];
  const count = Math.floor((width + gap) / (gw + gap));
  for (let li = 0; li < count; li += 1) {
    const bits = [];
    for (let y = 0; y < height; y += 1) {
      let row = "";
      for (let x = 0; x < gw; x += 1) {
        const v = raw[y * stride + 1 + li * (gw + gap) + x];
        row += v < 128 ? "1" : "0";
      }
      bits.push(row);
    }
    let best = "?";
    for (const [ch, g] of Object.entries(GLYPHS)) {
      if (g.join("|") === bits.join("|")) best = ch;
    }
    letters.push(best);
  }
  return {
    ok: true,
    text: letters.join(""),
    width,
    height,
    kind: "BITMAP_TEMPLATE_OCR_NOT_GENERAL",
    understanding: false,
    generalOcr: false,
  };
}

module.exports = { renderTextPng, ocrBitmap, GLYPHS };
