/**
 * Blacrox.AI - Technical Price Calibration and Validation Engine
 * Ensures strict Support and Resistance accuracy, scale decimal preservation,
 * and mathematical integrity (Resistance > Current Price > Support).
 */

function getExpectedPriceRange(pair = '') {
  const p = String(pair || '').toUpperCase();
  if (/AVA|AVAX|AVALANCHE/i.test(p)) return { min: 5, max: 60, decimals: 3, defaultPrice: 11.385 };
  if (/DZD/i.test(p)) return { min: 180, max: 350, decimals: 3, defaultPrice: 255.150 };
  if (/COP/i.test(p)) return { min: 2500, max: 5000, decimals: 2, defaultPrice: 3184.77 };
  if (/ARS/i.test(p)) return { min: 1000, max: 3000, decimals: 2, defaultPrice: 1612.61 };
  if (/NGN/i.test(p)) return { min: 1000, max: 2000, decimals: 2, defaultPrice: 1320.47 };
  if (/INR/i.test(p)) return { min: 60, max: 120, decimals: 2, defaultPrice: 87.42 };
  if (/BRL/i.test(p)) return { min: 3, max: 10, decimals: 4, defaultPrice: 5.8480 };
  if (/PKR/i.test(p)) return { min: 200, max: 400, decimals: 2, defaultPrice: 279.05 };
  if (/JPY/i.test(p)) return { min: 110, max: 200, decimals: 2, defaultPrice: 153.85 };
  if (/BTC/i.test(p)) return { min: 30000, max: 150000, decimals: 2, defaultPrice: 76500.00 };
  if (/ETH/i.test(p)) return { min: 1500, max: 6000, decimals: 2, defaultPrice: 2850.00 };
  if (/SOL/i.test(p)) return { min: 50, max: 400, decimals: 2, defaultPrice: 188.50 };
  if (/EUR/i.test(p)) return { min: 0.8, max: 1.3, decimals: 5, defaultPrice: 1.08380 };
  if (/GBP/i.test(p)) return { min: 1.0, max: 1.5, decimals: 5, defaultPrice: 1.29520 };
  if (/AED/i.test(p)) return { min: 0.5, max: 5.0, decimals: 5, defaultPrice: 1.29600 };
  if (/NZD|AUD|CAD|CHF|SGD/i.test(p)) return { min: 0.4, max: 2.5, decimals: 5, defaultPrice: 0.60450 };
  return { min: 0.1, max: 1000000, decimals: 5, defaultPrice: 1.29336 };
}

function calibratePriceLevels(pair, rawRes, rawSup, rawPrice, resY, supY, priceY, chartHigh, chartLow) {
  const expected = getExpectedPriceRange(pair);

  const getDecimals = (str) => {
    if (!str || typeof str !== 'string' || !str.includes('.')) return 0;
    return str.trim().split('.')[1].length;
  };

  const cleanNum = (val) => {
    if (val == null) return NaN;
    if (typeof val === 'number') return isNaN(val) ? NaN : val;
    const s = String(val).replace(/[^0-9.-]/g, '');
    return parseFloat(s);
  };

  let pVal = cleanNum(rawPrice);
  let rVal = cleanNum(rawRes);
  let sVal = cleanNum(rawSup);
  let hVal = cleanNum(chartHigh);
  let lVal = cleanNum(chartLow);

  // If pVal dropped decimals against expected range (e.g. 11350 for AVA whose max is 60)
  if (!isNaN(pVal) && pVal > expected.max && expected.max > 0) {
    while (pVal > expected.max && pVal >= 10) {
      pVal = pVal / 10;
    }
  }

  // If price is missing or invalid, determine pair default
  if (isNaN(pVal) || pVal <= 0) {
    pVal = expected.defaultPrice;
  }

  // Detect and fix decimal stripping (e.g. 11390 for 11.390, or 129520 for 1.29520)
  const fixMagnitude = (val, ref) => {
    if (isNaN(val) || val <= 0 || isNaN(ref) || ref <= 0) return val;
    let v = val;
    while (v > ref * 5 && v >= 10) {
      v = v / 10;
    }
    while (v < ref * 0.2 && v > 0) {
      v = v * 10;
    }
    return v;
  };

  rVal = fixMagnitude(rVal, pVal);
  sVal = fixMagnitude(sVal, pVal);
  hVal = fixMagnitude(hVal, pVal);
  lVal = fixMagnitude(lVal, pVal);

  // If High/Low are provided and valid, verify bounds
  if (!isNaN(hVal) && !isNaN(lVal) && hVal > lVal) {
    if (isNaN(rVal) || rVal <= 0) rVal = hVal;
    if (isNaN(sVal) || sVal <= 0) sVal = lVal;
  }

  // Dynamic channel spread delta based on price scale (0.12% to 0.35%)
  const minSpread = Math.max(pVal * 0.0015, Math.pow(10, -expected.decimals) * 20);

  // Fallback if rVal or sVal are completely invalid
  if (isNaN(rVal) || rVal <= 0) rVal = pVal + minSpread;
  if (isNaN(sVal) || sVal <= 0) sVal = Math.max(0.00001, pVal - minSpread);

  // Guarantee: Resistance > Support (swap if inverted)
  if (rVal < sVal) {
    const temp = rVal;
    rVal = sVal;
    sVal = temp;
  }

  // If Resistance == Support or gap is too narrow
  if (rVal - sVal < minSpread) {
    rVal = pVal + minSpread;
    sVal = Math.max(0.00001, pVal - minSpread);
  }

  // Guarantee: Resistance > Current Price > Support
  if (rVal <= pVal) {
    rVal = pVal + minSpread;
  }
  if (sVal >= pVal) {
    sVal = Math.max(0.00001, pVal - minSpread);
  }

  // Determine decimal precision to preserve scale precision
  const decimals = Math.max(
    expected.decimals,
    getDecimals(rawPrice),
    getDecimals(rawRes),
    getDecimals(rawSup),
    getDecimals(chartHigh),
    getDecimals(chartLow)
  );

  // Calibrate vertical Y% coordinates (0% = top, 100% = bottom)
  let finalResY = Number(resY);
  let finalSupY = Number(supY);
  let finalPriceY = Number(priceY);

  if (isNaN(finalResY) || finalResY < 12 || finalResY > 80) finalResY = 25.0;
  if (isNaN(finalSupY) || finalSupY < 20 || finalSupY > 90) finalSupY = 75.0;
  if (finalResY >= finalSupY) {
    finalResY = Math.max(15.0, finalSupY - 30.0);
  }

  if (isNaN(finalPriceY) || finalPriceY < finalResY || finalPriceY > finalSupY) {
    const relRatio = (rVal - pVal) / (rVal - sVal);
    finalPriceY = finalResY + (relRatio * (finalSupY - finalResY));
    finalPriceY = Math.max(finalResY + 2.0, Math.min(finalSupY - 2.0, finalPriceY));
  }

  return {
    resistance_level: rVal.toFixed(decimals),
    support_level: sVal.toFixed(decimals),
    current_price: pVal.toFixed(decimals),
    resistance_y_percent: Math.round(finalResY * 10) / 10,
    support_y_percent: Math.round(finalSupY * 10) / 10,
    current_price_y_percent: Math.round(finalPriceY * 10) / 10,
    decimals
  };
}

module.exports = {
  getExpectedPriceRange,
  calibratePriceLevels
};

