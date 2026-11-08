const { calibratePriceLevels, getExpectedPriceRange } = require('../services/priceCalibrator');

function test(name, fn) {
  try {
    fn();
    console.log(`✓ PASS: ${name}`);
  } catch (err) {
    console.error(`✗ FAIL: ${name}`, err);
    process.exitCode = 1;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

test('Enforces Resistance > Current Price > Support for Avalanche', () => {
  const res = calibratePriceLevels('Avalanche (OTC)', '11410', '11310', '11350', 20, 80, 50, '11450', '11280');
  const r = parseFloat(res.resistance_level);
  const p = parseFloat(res.current_price);
  const s = parseFloat(res.support_level);
  assert(r > p, `Expected r (${r}) > p (${p})`);
  assert(p > s, `Expected p (${p}) > s (${s})`);
  assert(r > 10 && r < 20, `Expected r in 10-20 range, got ${r}`);
  assert(res.decimals === 3, `Expected 3 decimals, got ${res.decimals}`);
});

test('Fixes inverted S/R levels', () => {
  const res = calibratePriceLevels('EUR/USD', '1.08100', '1.08900', '1.08500', 80, 20, 50);
  const r = parseFloat(res.resistance_level);
  const p = parseFloat(res.current_price);
  const s = parseFloat(res.support_level);
  assert(r > p, `Expected r (${r}) > p (${p})`);
  assert(p > s, `Expected p (${p}) > s (${s})`);
  assert(res.resistance_y_percent < res.support_y_percent, `Resistance Y% must be visually above Support Y%`);
});

test('Handles USD/DZD correctly', () => {
  const res = calibratePriceLevels('USD/DZD (OTC)', '255.608', '255.054', '255.150', 18, 78, 48);
  const r = parseFloat(res.resistance_level);
  const p = parseFloat(res.current_price);
  const s = parseFloat(res.support_level);
  assert(r > p, `Expected r (${r}) > p (${p})`);
  assert(p > s, `Expected p (${p}) > s (${s})`);
  assert(res.decimals === 3, `Expected 3 decimals`);
});

test('Handles completely missing prices with clean pair defaults', () => {
  const res = calibratePriceLevels('USD/COP (OTC)', null, null, null, null, null, null);
  const r = parseFloat(res.resistance_level);
  const p = parseFloat(res.current_price);
  const s = parseFloat(res.support_level);
  assert(r > p, `Expected r (${r}) > p (${p})`);
  assert(p > s, `Expected p (${p}) > s (${s})`);
  assert(p > 3000 && p < 3500, `COP price should be ~3184`);
});

test('Never returns identical Resistance and Support', () => {
  const res = calibratePriceLevels('USD/ARS (OTC)', '1612.00', '1612.00', '1612.00', 50, 50, 50);
  const r = parseFloat(res.resistance_level);
  const p = parseFloat(res.current_price);
  const s = parseFloat(res.support_level);
  assert(r > p, `Expected r (${r}) > p (${p})`);
  assert(p > s, `Expected p (${p}) > s (${s})`);
});

test('Preserves exact Quotex chart S/R on tight channels (USD/COP)', () => {
  const res = calibratePriceLevels('USD/COP (OTC)', '3185.20', '3184.40', '3184.97', 25, 75, 50);
  assert(res.resistance_level === '3185.20', `Expected 3185.20, got ${res.resistance_level}`);
  assert(res.support_level === '3184.40', `Expected 3184.40, got ${res.support_level}`);
  assert(res.current_price === '3184.97', `Expected 3184.97, got ${res.current_price}`);
  assert(res.decimals === 2, `Expected 2 decimals, got ${res.decimals}`);
});

test('Preserves sub-1.0 Quotex OTC prices (USD/BRL OTC)', () => {
  const res = calibratePriceLevels('USD/BRL (OTC)', '0.19043', '0.18800', '0.18834', 25, 75, 50);
  assert(res.resistance_level === '0.19043', `Expected 0.19043, got ${res.resistance_level}`);
  assert(res.support_level === '0.18800', `Expected 0.18800, got ${res.support_level}`);
  assert(res.current_price === '0.18834', `Expected 0.18834, got ${res.current_price}`);
  assert(res.decimals === 5, `Expected 5 decimals, got ${res.decimals}`);
});


