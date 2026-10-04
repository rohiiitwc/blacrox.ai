import { Candle, TechnicalIndicators } from '@/types/market';

export class IndicatorCalculator {
  /**
   * Calculates Exponential Moving Average (EMA)
   */
  public static calculateEMA(candles: Candle[], period: number): number | null {
    if (candles.length < period) return null;
    const k = 2 / (period + 1);
    let ema = candles.slice(0, period).reduce((sum, c) => sum + c.close, 0) / period;

    for (let i = period; i < candles.length; i++) {
      ema = candles[i].close * k + ema * (1 - k);
    }
    return Number(ema.toFixed(5));
  }

  /**
   * Calculates Simple Moving Average (SMA)
   */
  public static calculateSMA(candles: Candle[], period: number): number | null {
    if (candles.length < period) return null;
    const slice = candles.slice(-period);
    const sum = slice.reduce((acc, c) => acc + c.close, 0);
    return Number((sum / period).toFixed(5));
  }

  /**
   * Calculates Relative Strength Index (RSI)
   */
  public static calculateRSI(candles: Candle[], period: number = 14): number | null {
    if (candles.length < period + 1) return null;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const change = candles[i].close - candles[i - 1].close;
      if (change >= 0) gains += change;
      else losses += Math.abs(change);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < candles.length; i++) {
      const change = candles[i].close - candles[i - 1].close;
      const gain = change >= 0 ? change : 0;
      const loss = change < 0 ? Math.abs(change) : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);
    return Number(rsi.toFixed(2));
  }

  /**
   * Calculates Moving Average Convergence Divergence (MACD)
   */
  public static calculateMACD(
    candles: Candle[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
  ): TechnicalIndicators['macd'] {
    if (candles.length < slowPeriod + signalPeriod) return null;

    const fastEMA = this.calculateEMA(candles, fastPeriod);
    const slowEMA = this.calculateEMA(candles, slowPeriod);

    if (fastEMA === null || slowEMA === null) return null;

    const macdLine = fastEMA - slowEMA;
    
    // Approximate signal line from recent MACD points
    const macdHistory: number[] = [];
    for (let i = slowPeriod; i <= candles.length; i++) {
      const sub = candles.slice(0, i);
      const f = this.calculateEMA(sub, fastPeriod);
      const s = this.calculateEMA(sub, slowPeriod);
      if (f !== null && s !== null) {
        macdHistory.push(f - s);
      }
    }

    if (macdHistory.length < signalPeriod) return null;

    const k = 2 / (signalPeriod + 1);
    let signalLine = macdHistory.slice(0, signalPeriod).reduce((sum, v) => sum + v, 0) / signalPeriod;

    for (let i = signalPeriod; i < macdHistory.length; i++) {
      signalLine = macdHistory[i] * k + signalLine * (1 - k);
    }

    const histogram = macdLine - signalLine;

    return {
      macdLine: Number(macdLine.toFixed(6)),
      signalLine: Number(signalLine.toFixed(6)),
      histogram: Number(histogram.toFixed(6)),
    };
  }

  /**
   * Calculates Bollinger Bands (20, 2)
   */
  public static calculateBollingerBands(candles: Candle[], period: number = 20, multiplier: number = 2): TechnicalIndicators['bollingerBands'] {
    if (candles.length < period) return null;
    const middle = this.calculateSMA(candles, period);
    if (middle === null) return null;

    const slice = candles.slice(-period);
    const variance = slice.reduce((sum, c) => sum + Math.pow(c.close - middle, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    return {
      upper: Number((middle + stdDev * multiplier).toFixed(5)),
      middle: middle,
      lower: Number((middle - stdDev * multiplier).toFixed(5)),
    };
  }

  /**
   * Calculates Average True Range (ATR 14)
   */
  public static calculateATR(candles: Candle[], period: number = 14): number | null {
    if (candles.length < period + 1) return null;

    let trSum = 0;
    for (let i = 1; i <= period; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = candles[i - 1].close;
      const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
      trSum += tr;
    }

    let atr = trSum / period;
    for (let i = period + 1; i < candles.length; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = candles[i - 1].close;
      const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
      atr = (atr * (period - 1) + tr) / period;
    }

    return Number(atr.toFixed(5));
  }

  /**
   * Computes comprehensive technical indicators snapshot from candle series
   */
  public static computeAll(candles: Candle[]): TechnicalIndicators {
    if (!candles || candles.length < 5) {
      return {
        rsi: null,
        macd: null,
        ema20: null,
        ema50: null,
        sma20: null,
        bollingerBands: null,
        atr: null,
        momentum: null,
        trend: 'NEUTRAL',
        volatilityStatus: 'NORMAL',
        supportLevel: null,
        resistanceLevel: null,
      };
    }

    const rsi = this.calculateRSI(candles, 14);
    const macd = this.calculateMACD(candles);
    const ema20 = this.calculateEMA(candles, 20);
    const ema50 = this.calculateEMA(candles, 50);
    const sma20 = this.calculateSMA(candles, 20);
    const bb = this.calculateBollingerBands(candles, 20);
    const atr = this.calculateATR(candles, 14);

    const latest = candles[candles.length - 1].close;
    const prev = candles[Math.max(0, candles.length - 10)].close;
    const momentum = Number((((latest - prev) / prev) * 100).toFixed(3));

    // Support and Resistance calculation over last 30 candles
    const windowCandles = candles.slice(-30);
    const highs = windowCandles.map((c) => c.high);
    const lows = windowCandles.map((c) => c.low);
    const resistanceLevel = Number(Math.max(...highs).toFixed(5));
    const supportLevel = Number(Math.min(...lows).toFixed(5));

    // Determine overall trend
    let trend: TechnicalIndicators['trend'] = 'NEUTRAL';
    if (ema20 && ema50) {
      if (ema20 > ema50 && latest > ema20) trend = 'STRONG_BULLISH';
      else if (ema20 > ema50) trend = 'BULLISH';
      else if (ema20 < ema50 && latest < ema20) trend = 'STRONG_BEARISH';
      else if (ema20 < ema50) trend = 'BEARISH';
    }

    let volatilityStatus: TechnicalIndicators['volatilityStatus'] = 'NORMAL';
    if (atr && latest > 0) {
      const atrRatio = (atr / latest) * 100;
      if (atrRatio > 0.15) volatilityStatus = 'HIGH';
      else if (atrRatio < 0.03) volatilityStatus = 'LOW';
    }

    return {
      rsi,
      macd,
      ema20,
      ema50,
      sma20,
      bollingerBands: bb,
      atr,
      momentum,
      trend,
      volatilityStatus,
      supportLevel,
      resistanceLevel,
    };
  }
}
