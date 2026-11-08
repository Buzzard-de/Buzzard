function wavTone({ hz = 220, ms = 80 } = {}) {
  const rate = 8000;
  const n = Math.floor((rate * ms) / 1000);
  const data = Buffer.alloc(n);
  for (let i = 0; i < n; i += 1) {
    data[i] = 128 + Math.floor(40 * Math.sin((2 * Math.PI * hz * i) / rate));
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + n, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate, 28);
  header.writeUInt16LE(1, 32);
  header.writeUInt16LE(8, 34);
  header.write("data", 36);
  header.writeUInt32LE(n, 40);
  return Buffer.concat([header, data]);
}

module.exports = { wavTone };
