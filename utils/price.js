// Turns "$1,234.50", "14.15" or "Total $7.10" into a number
function parsePrice(text) {
  const match = text.match(/\$?\s*(\d[\d,]*(?:\.\d+)?)/);
  if (!match) throw new Error(`No price found in "${text}"`);
  return Number(match[1].replace(/,/g, ''));
}

module.exports = { parsePrice };