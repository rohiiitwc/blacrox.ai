/**
 * Pure Mathematical Indicator Calculator
 * Calculates RSI, Bollinger Bands, EMA, and MACD over candle OHLCV data series.
 */

/**
 * Calculates Exponential Moving Average (EMA)
 */
function calculateEMA(prices, period) {
  if (prices.length === 0) return [];
  const k = 2 / (period + 1);
  const emaValues = new Array(prices.length);
  
  // Initialize first EMA with SMA
  let sum = 0;
  const initialPeriod = Math.min(period, prices.length);
  for (let i = 0; i < initialPeriod; i++) {
    sum += prices[i];
  }
  let currentEMA = sum / initialPeriod;
  emaValues[initialPeriod - 1] = currentEMA;

  for (let i = initialPeriod; i < prices.length; i++) {
    currentEMA = prices[i] * k + currentEMA * (1 - k);
    emaValues[i] = currentEMA;
  }

  // Backfill early values for continuity
  for (let i = 0; i < initialPeriod - 1; i++) {
    emaValues[i] = prices[i];
  }

  return emaValues;
}

/**
 * Calculates Relative Strength Index (RSI)
 */
function calculateRSI(prices, period = 14) {
  if (prices.length <= period) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change >= 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Number((100 - 100 / (1 + rs)).toFixed(2));
}

/**
 * Calculates Bollinger Bands (BB 20, 2)
 */
function calculateBollingerBands(prices, period = 20, stdDevMultiplier = 2) {
  if (prices.length < period) {
    const lastPrice = prices[prices.length - 1] || 0;
    return { upper: lastPrice, middle: lastPrice, lower: lastPrice };
  }

  const slice = prices.slice(-period);
  const mean = slice.reduce((acc, val) => acc + val, 0) / period;
  
  const variance = slice.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  return {
    upper: Number((mean + stdDevMultiplier * stdDev).toFixed(5)),
    middle: Number(mean.toFixed(5)),
    lower: Number((mean - stdDevMultiplier * stdDev).toFixed(5)),
  };
}

/**
 * Calculates Moving Average Convergence Divergence (MACD 12, 26, 9)
 */
function calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (prices.length < slowPeriod) {
    return { macdLine: 0, signalLine: 0, histogram: 0 };
  }

  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);

  const macdLineSeries = [];
  for (let i = 0; i < prices.length; i++) {
    macdLineSeries.push(fastEMA[i] - slowEMA[i]);
  }

  const signalLineSeries = calculateEMA(macdLineSeries, signalPeriod);

  const currentMACD = macdLineSeries[macdLineSeries.length - 1];
  const currentSignal = signalLineSeries[signalLineSeries.length - 1];
  const histogram = currentMACD - currentSignal;

  return {
    macdLine: Number(currentMACD.toFixed(6)),
    signalLine: Number(currentSignal.toFixed(6)),
    histogram: Number(histogram.toFixed(6)),
  };
}

/**
 * Evaluates market conditions and outputs deterministic trade signal (CALL, PUT, or NEUTRAL)
 */
function evaluateSignalRules(candles) {
  const closePrices = candles.map((c) => c.close);
  const lastPrice = closePrices[closePrices.length - 1];

  const rsi = calculateRSI(closePrices, 14);
  const bb = calculateBollingerBands(closePrices, 20, 2);
  const ema9Series = calculateEMA(closePrices, 9);
  const ema21Series = calculateEMA(closePrices, 21);
  const macd = calculateMACD(closePrices, 12, 26, 9);

  const ema9 = Number(ema9Series[ema9Series.length - 1].toFixed(5));
  const ema21 = Number(ema21Series[ema21Series.length - 1].toFixed(5));
  const prevEma9 = Number(ema9Series[ema9Series.length - 2]?.toFixed(5) || ema9);
  const prevEma21 = Number(ema21Series[ema21Series.length - 2]?.toFixed(5) || ema21);

  const emaBullishCross = prevEma9 <= prevEma21 && ema9 > ema21;
  const emaBearishCross = prevEma9 >= prevEma21 && ema9 < ema21;

  const indicators = {
    rsi,
    bollingerBands: bb,
    ema9,
    ema21,
    macd,
  };

  // CALL (BUY) Condition: RSI < 35 (oversold), price piercing Lower BB, and EMA9 > EMA21 or Bullish Cross
  if ((rsi < 35 || lastPrice <= bb.lower) && (ema9 > ema21 || emaBullishCross)) {
    const reasons = [];
    if (rsi < 35) reasons.push(`RSI Oversold (${rsi})`);
    if (lastPrice <= bb.lower) reasons.push('Lower BB Rejection');
    if (ema9 > ema21) reasons.push('EMA9/EMA21 Bullish Vector');

    return {
      action: 'CALL',
      confidence: `${Math.min(94, 85 + Math.floor((35 - Math.min(rsi, 35)) * 0.4 + (bb.middle ? 3 : 0)))}%`,
      reason: reasons.join(' + ') || 'Bullish Momentum Confluence',
      indicators,
    };
  }

  // PUT (SELL) Condition: RSI > 65 (overbought), price piercing Upper BB, and EMA9 < EMA21 or Bearish Cross
  if ((rsi > 65 || lastPrice >= bb.upper) && (ema9 < ema21 || emaBearishCross)) {
    const reasons = [];
    if (rsi > 65) reasons.push(`RSI Overbought (${rsi})`);
    if (lastPrice >= bb.upper) reasons.push('Upper BB Rejection');
    if (ema9 < ema21) reasons.push('EMA9/EMA21 Bearish Vector');

    return {
      action: 'PUT',
      confidence: `${Math.min(94, 85 + Math.floor((Math.max(rsi, 65) - 65) * 0.4 + 3))}%`,
      reason: reasons.join(' + ') || 'Bearish Momentum Confluence',
      indicators,
    };
  }

  // Secondary trend confirmation fallback for active market swings
  if (emaBullishCross && macd.histogram > 0) {
    return {
      action: 'CALL',
      confidence: '86%',
      reason: 'EMA Bullish Crossover + MACD Histogram Expansion',
      indicators,
    };
  }

  if (emaBearishCross && macd.histogram < 0) {
    return {
      action: 'PUT',
      confidence: '86%',
      reason: 'EMA Bearish Crossover + MACD Histogram Contraction',
      indicators,
    };
  }

  return {
    action: 'NEUTRAL',
    confidence: '50%',
    reason: 'Consolidation / Mixed Technical Indicators',
    indicators,
  };
}

module.exports = {
  calculateEMA,
  calculateRSI,
  calculateBollingerBands,
  calculateMACD,
  evaluateSignalRules,
};
