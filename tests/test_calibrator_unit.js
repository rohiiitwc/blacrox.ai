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
