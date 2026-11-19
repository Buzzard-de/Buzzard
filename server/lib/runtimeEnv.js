/**
 * Whether this process serves real users.
 *
 * NODE_ENV=production is the normal signal. A hosted deployment that forgot
 * to set it must still not fall back to development conveniences such as demo
 * accounts, so the platform markers count as well.
 */
function isProduction() {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.RENDER === "true" ||
    process.env.BUZZARD_ENV === "production"
  );
}

module.exports = { isProduction };
