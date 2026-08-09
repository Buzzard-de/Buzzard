const base = { DE: 4.99, FR: 8.99, NL: 7.99, PL: 29.99, GB: 9.99, CH: 12.99 };
const free = { DE: 79, FR: 99, NL: 99, PL: 449, GB: 99, CH: 129 };

function calculateShipping(country, weight, subtotal) {
  if (subtotal >= (free[country] ?? 100)) return 0;
  let value = base[country] ?? 9.99;
  if (weight > 2) value += 4;
  if (weight > 5) value += 9;
  if (weight > 10) value += 18;
  return Number(value.toFixed(2));
}

module.exports = {
  calculateShipping,
};
