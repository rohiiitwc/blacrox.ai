import { Candle, MarketPair } from '@/types/market';

export abstract class MarketDataProvider {
  abstract getName(): string;
  abstract getPairs(): Promise<MarketPair[]>;
  abstract getCandles(pairId: string, limit?: number): Promise<Candle[]>;
}

export class DemoMarketDataProvider extends MarketDataProvider {
  private pairs: MarketPair[] = [
    // OTC Pairs (>90% Payout)
    // All 41 Quotex OTC Pairs
    {
      id: 'USD_IDR_OTC',
      name: 'USD/IDR (OTC)',
      category: 'otc',
      basePrice: 15689.0,
      currentPrice: 15689.5,
      priceChange: 0.5,
      priceChangePercent: 0.003,
      bid: 15689.0,
      ask: 15690.0,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 95,
      freshnessMs: 50,
    },
    {
      id: 'USD_BRL_OTC',
      name: 'USD/BRL (OTC)',
      category: 'otc',
      basePrice: 5.6420,
      currentPrice: 5.6428,
      priceChange: 0.0008,
      priceChangePercent: 0.014,
      bid: 5.6425,
      ask: 5.6430,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 94,
      freshnessMs: 55,
    },
    {
      id: 'USD_JPY_OTC',
      name: 'USD/JPY (OTC)',
      category: 'otc',
      basePrice: 154.40,
      currentPrice: 154.42,
      priceChange: 0.02,
      priceChangePercent: 0.013,
      bid: 154.41,
      ask: 154.43,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 94,
      freshnessMs: 70,
    },
    {
      id: 'AUD_USD_OTC',
      name: 'AUD/USD (OTC)',
      category: 'otc',
      basePrice: 0.6355,
      currentPrice: 0.6358,
      priceChange: 0.0003,
      priceChangePercent: 0.047,
      bid: 0.6357,
      ask: 0.6359,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 93,
      freshnessMs: 60,
    },
    {
      id: 'USD_INR_OTC',
      name: 'USD/INR (OTC)',
      category: 'otc',
      basePrice: 84.25,
      currentPrice: 84.28,
      priceChange: 0.03,
      priceChangePercent: 0.035,
      bid: 84.27,
      ask: 84.29,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 93,
      freshnessMs: 65,
    },
    {
      id: 'GBP_NZD_OTC',
      name: 'GBP/NZD (OTC)',
      category: 'otc',
      basePrice: 2.1485,
      currentPrice: 2.1488,
      priceChange: 0.0003,
      priceChangePercent: 0.014,
      bid: 2.1487,
      ask: 2.1489,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 92,
      freshnessMs: 65,
    },
    {
      id: 'EUR_JPY_OTC',
      name: 'EUR/JPY (OTC)',
      category: 'otc',
      basePrice: 164.10,
      currentPrice: 164.35,
      priceChange: 0.25,
      priceChangePercent: 0.15,
      bid: 164.34,
      ask: 164.36,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 92,
      freshnessMs: 65,
    },
    {
      id: 'GBP_JPY_OTC',
      name: 'GBP/JPY (OTC)',
      category: 'otc',
      basePrice: 198.50,
      currentPrice: 194.25,
      priceChange: -4.25,
      priceChangePercent: -2.14,
      bid: 194.24,
      ask: 194.26,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 92,
      freshnessMs: 70,
    },
    {
      id: 'USD_COP_OTC',
      name: 'USD/COP (OTC)',
      category: 'otc',
      basePrice: 4210.0,
      currentPrice: 4192.3,
      priceChange: -17.7,
      priceChangePercent: -0.42,
      bid: 4191.5,
      ask: 4193.0,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 92,
      freshnessMs: 75,
    },
    {
      id: 'USD_MXN_OTC',
      name: 'USD/MXN (OTC)',
      category: 'otc',
      basePrice: 19.80,
      currentPrice: 19.82,
      priceChange: 0.02,
      priceChangePercent: 0.12,
      bid: 19.81,
      ask: 19.83,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 92,
      freshnessMs: 80,
    },
    {
      id: 'USD_PKR_OTC',
      name: 'USD/PKR (OTC)',
      category: 'otc',
      basePrice: 278.10,
      currentPrice: 278.90,
      priceChange: 0.80,
      priceChangePercent: 0.29,
      bid: 278.85,
      ask: 278.95,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 90,
      freshnessMs: 85,
    },
    {
      id: 'EUR_USD_OTC',
      name: 'EUR/USD (OTC)',
      category: 'otc',
      basePrice: 1.0850,
      currentPrice: 1.0872,
      priceChange: 0.0038,
      priceChangePercent: 0.35,
      bid: 1.0871,
      ask: 1.0873,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 77,
      freshnessMs: 50,
    },
    {
      id: 'GBP_USD_OTC',
      name: 'GBP/USD (OTC)',
      category: 'otc',
      basePrice: 1.2980,
      currentPrice: 1.3015,
      priceChange: 0.0035,
      priceChangePercent: 0.27,
      bid: 1.3014,
      ask: 1.3016,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 85,
      freshnessMs: 55,
    },
    {
      id: 'EUR_CAD_OTC',
      name: 'EUR/CAD (OTC)',
      category: 'otc',
      basePrice: 1.4980,
      currentPrice: 1.5012,
      priceChange: 0.0032,
      priceChangePercent: 0.21,
      bid: 1.5011,
      ask: 1.5013,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 88,
      freshnessMs: 55,
    },
    {
      id: 'EUR_GBP_OTC',
      name: 'EUR/GBP (OTC)',
      category: 'otc',
      basePrice: 0.8320,
      currentPrice: 0.8345,
      priceChange: 0.0025,
      priceChangePercent: 0.30,
      bid: 0.8344,
      ask: 0.8346,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 87,
      freshnessMs: 50,
    },
    {
      id: 'NZD_CAD_OTC',
      name: 'NZD/CAD (OTC)',
      category: 'otc',
      basePrice: 0.8250,
      currentPrice: 0.8272,
      priceChange: 0.0022,
      priceChangePercent: 0.27,
      bid: 0.8271,
      ask: 0.8273,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 86,
      freshnessMs: 60,
    },
    {
      id: 'USD_BDT_OTC',
      name: 'USD/BDT (OTC)',
      category: 'otc',
      basePrice: 119.50,
      currentPrice: 119.85,
      priceChange: 0.35,
      priceChangePercent: 0.29,
      bid: 119.84,
      ask: 119.86,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 92,
      freshnessMs: 70,
    },
    {
      id: 'USD_ZAR_OTC',
      name: 'USD/ZAR (OTC)',
      category: 'otc',
      basePrice: 17.50,
      currentPrice: 17.62,
      priceChange: 0.12,
      priceChangePercent: 0.68,
      bid: 17.61,
      ask: 17.63,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 89,
      freshnessMs: 75,
    },
    {
      id: 'EUR_CHF_OTC',
      name: 'EUR/CHF (OTC)',
      category: 'otc',
      basePrice: 0.9380,
      currentPrice: 0.9398,
      priceChange: 0.0018,
      priceChangePercent: 0.19,
      bid: 0.9397,
      ask: 0.9399,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 86,
      freshnessMs: 55,
    },
    {
      id: 'GBP_AUD_OTC',
      name: 'GBP/AUD (OTC)',
      category: 'otc',
      basePrice: 1.9420,
      currentPrice: 1.9465,
      priceChange: 0.0045,
      priceChangePercent: 0.23,
      bid: 1.9464,
      ask: 1.9466,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 88,
      freshnessMs: 60,
    },
    {
      id: 'GBP_CHF_OTC',
      name: 'GBP/CHF (OTC)',
      category: 'otc',
      basePrice: 1.1210,
      currentPrice: 1.1235,
      priceChange: 0.0025,
      priceChangePercent: 0.22,
      bid: 1.1234,
      ask: 1.1236,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 87,
      freshnessMs: 60,
    },
    {
      id: 'AUD_JPY_OTC',
      name: 'AUD/JPY (OTC)',
      category: 'otc',
      basePrice: 97.80,
      currentPrice: 98.15,
      priceChange: 0.35,
      priceChangePercent: 0.36,
      bid: 98.14,
      ask: 98.16,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 91,
      freshnessMs: 65,
    },
    {
      id: 'CAD_CHF_OTC',
      name: 'CAD/CHF (OTC)',
      category: 'otc',
      basePrice: 0.6250,
      currentPrice: 0.6268,
      priceChange: 0.0018,
      priceChangePercent: 0.29,
      bid: 0.6267,
      ask: 0.6269,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 85,
      freshnessMs: 60,
    },
    {
      id: 'EUR_NZD_OTC',
      name: 'EUR/NZD (OTC)',
      category: 'otc',
      basePrice: 1.7820,
      currentPrice: 1.7855,
      priceChange: 0.0035,
      priceChangePercent: 0.20,
      bid: 1.7854,
      ask: 1.7856,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 87,
      freshnessMs: 65,
    },
    {
      id: 'EUR_AUD_OTC',
      name: 'EUR/AUD (OTC)',
      category: 'otc',
      basePrice: 1.6280,
      currentPrice: 1.6312,
      priceChange: 0.0032,
      priceChangePercent: 0.20,
      bid: 1.6311,
      ask: 1.6313,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 88,
      freshnessMs: 60,
    },
    {
      id: 'USD_ARS_OTC',
      name: 'USD/ARS (OTC)',
      category: 'otc',
      basePrice: 975.0,
      currentPrice: 978.5,
      priceChange: 3.5,
      priceChangePercent: 0.36,
      bid: 978.4,
      ask: 978.6,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 91,
      freshnessMs: 80,
    },
    {
      id: 'USD_CAD_OTC',
      name: 'USD/CAD (OTC)',
      category: 'otc',
      basePrice: 1.3810,
      currentPrice: 1.3842,
      priceChange: 0.0032,
      priceChangePercent: 0.23,
      bid: 1.3841,
      ask: 1.3843,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 89,
      freshnessMs: 55,
    },
    {
      id: 'NZD_USD_OTC',
      name: 'NZD/USD (OTC)',
      category: 'otc',
      basePrice: 0.6080,
      currentPrice: 0.6098,
      priceChange: 0.0018,
      priceChangePercent: 0.30,
      bid: 0.6097,
      ask: 0.6099,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 88,
      freshnessMs: 60,
    },
    {
      id: 'AUD_CAD_OTC',
      name: 'AUD/CAD (OTC)',
      category: 'otc',
      basePrice: 0.9120,
      currentPrice: 0.9148,
      priceChange: 0.0028,
      priceChangePercent: 0.31,
      bid: 0.9147,
      ask: 0.9149,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 87,
      freshnessMs: 60,
    },
    {
      id: 'CHF_JPY_OTC',
      name: 'CHF/JPY (OTC)',
      category: 'otc',
      basePrice: 174.50,
      currentPrice: 174.92,
      priceChange: 0.42,
      priceChangePercent: 0.24,
      bid: 174.91,
      ask: 174.93,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 89,
      freshnessMs: 65,
    },
    {
      id: 'NZD_CHF_OTC',
      name: 'NZD/CHF (OTC)',
      category: 'otc',
      basePrice: 0.5280,
      currentPrice: 0.5295,
      priceChange: 0.0015,
      priceChangePercent: 0.28,
      bid: 0.5294,
      ask: 0.5296,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 85,
      freshnessMs: 60,
    },
    {
      id: 'NZD_JPY_OTC',
      name: 'NZD/JPY (OTC)',
      category: 'otc',
      basePrice: 93.80,
      currentPrice: 94.12,
      priceChange: 0.32,
      priceChangePercent: 0.34,
      bid: 94.11,
      ask: 94.13,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 90,
      freshnessMs: 65,
    },
    {
      id: 'USD_CHF_OTC',
      name: 'USD/CHF (OTC)',
      category: 'otc',
      basePrice: 0.8650,
      currentPrice: 0.8672,
      priceChange: 0.0022,
      priceChangePercent: 0.25,
      bid: 0.8671,
      ask: 0.8673,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 88,
      freshnessMs: 55,
    },
    {
      id: 'USD_EGP_OTC',
      name: 'USD/EGP (OTC)',
      category: 'otc',
      basePrice: 48.50,
      currentPrice: 48.72,
      priceChange: 0.22,
      priceChangePercent: 0.45,
      bid: 48.71,
      ask: 48.73,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 92,
      freshnessMs: 80,
    },
    {
      id: 'USD_NGN_OTC',
      name: 'USD/NGN (OTC)',
      category: 'otc',
      basePrice: 1650.0,
      currentPrice: 1658.5,
      priceChange: 8.5,
      priceChangePercent: 0.52,
      bid: 1658.0,
      ask: 1659.0,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 90,
      freshnessMs: 85,
    },
    {
      id: 'USD_PHP_OTC',
      name: 'USD/PHP (OTC)',
      category: 'otc',
      basePrice: 57.50,
      currentPrice: 57.72,
      priceChange: 0.22,
      priceChangePercent: 0.38,
      bid: 57.71,
      ask: 57.73,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 91,
      freshnessMs: 75,
    },
    {
      id: 'CAD_JPY_OTC',
      name: 'CAD/JPY (OTC)',
      category: 'otc',
      basePrice: 111.20,
      currentPrice: 111.52,
      priceChange: 0.32,
      priceChangePercent: 0.29,
      bid: 111.51,
      ask: 111.53,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 90,
      freshnessMs: 65,
    },
    {
      id: 'USD_DZD_OTC',
      name: 'USD/DZD (OTC)',
      category: 'otc',
      basePrice: 133.50,
      currentPrice: 133.92,
      priceChange: 0.42,
      priceChangePercent: 0.31,
      bid: 133.91,
      ask: 133.93,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 90,
      freshnessMs: 80,
    },
    {
      id: 'AUD_CHF_OTC',
      name: 'AUD/CHF (OTC)',
      category: 'otc',
      basePrice: 0.5750,
      currentPrice: 0.5768,
      priceChange: 0.0018,
      priceChangePercent: 0.31,
      bid: 0.5767,
      ask: 0.5769,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 86,
      freshnessMs: 60,
    },
    {
      id: 'GBP_CAD_OTC',
      name: 'GBP/CAD (OTC)',
      category: 'otc',
      basePrice: 1.7890,
      currentPrice: 1.7925,
      priceChange: 0.0035,
      priceChangePercent: 0.20,
      bid: 1.7924,
      ask: 1.7926,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 88,
      freshnessMs: 60,
    },
    {
      id: 'AUD_NZD_OTC',
      name: 'AUD/NZD (OTC)',
      category: 'otc',
      basePrice: 1.0920,
      currentPrice: 1.0945,
      priceChange: 0.0025,
      priceChangePercent: 0.23,
      bid: 1.0944,
      ask: 1.0946,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 86,
      freshnessMs: 65,
    },

    // Standard Forex Pairs
    {
      id: 'EUR_USD',
      name: 'EUR/USD',
      category: 'forex',
      basePrice: 1.0840,
      currentPrice: 1.0865,
      priceChange: 0.0025,
      priceChangePercent: 0.23,
      bid: 1.0864,
      ask: 1.0866,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'MEDIUM',
      session: 'LONDON',
      payout: 77,
      freshnessMs: 40,
    },
    {
      id: 'GBP_USD',
      name: 'GBP/USD',
      category: 'forex',
      basePrice: 1.2950,
      currentPrice: 1.2985,
      priceChange: 0.0035,
      priceChangePercent: 0.27,
      bid: 1.2984,
      ask: 1.2986,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'MEDIUM',
      session: 'LONDON',
      payout: 86,
      freshnessMs: 45,
    },
    {
      id: 'USD_JPY',
      name: 'USD/JPY',
      category: 'forex',
      basePrice: 153.80,
      currentPrice: 154.12,
      priceChange: 0.32,
      priceChangePercent: 0.21,
      bid: 154.11,
      ask: 154.13,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'MEDIUM',
      session: 'LONDON',
      payout: 85,
      freshnessMs: 50,
    },
    {
      id: 'USD_CAD',
      name: 'USD/CAD',
      category: 'forex',
      basePrice: 1.3820,
      currentPrice: 1.3845,
      priceChange: 0.0025,
      priceChangePercent: 0.18,
      bid: 1.3844,
      ask: 1.3846,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'MEDIUM',
      session: 'LONDON',
      payout: 84,
      freshnessMs: 55,
    },
    {
      id: 'AUD_CAD',
      name: 'AUD/CAD',
      category: 'forex',
      basePrice: 0.9120,
      currentPrice: 0.9145,
      priceChange: 0.0025,
      priceChangePercent: 0.27,
      bid: 0.9144,
      ask: 0.9146,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'MEDIUM',
      session: 'LONDON',
      payout: 83,
      freshnessMs: 60,
    },
    {
      id: 'EUR_GBP',
      name: 'EUR/GBP',
      category: 'forex',
      basePrice: 0.8320,
      currentPrice: 0.8341,
      priceChange: 0.0021,
      priceChangePercent: 0.25,
      bid: 0.8340,
      ask: 0.8342,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'MEDIUM',
      session: 'LONDON',
      payout: 82,
      freshnessMs: 60,
    },

    // Commodities & Stocks (Equity/Commodity)
    {
      id: 'GOLD_OTC',
      name: 'Gold (OTC)',
      category: 'otc',
      basePrice: 2650.0,
      currentPrice: 2664.5,
      priceChange: 14.5,
      priceChangePercent: 0.55,
      bid: 2664.0,
      ask: 2665.0,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 93,
      freshnessMs: 40,
    },
    {
      id: 'SILVER_OTC',
      name: 'Silver (OTC)',
      category: 'otc',
      basePrice: 31.20,
      currentPrice: 31.85,
      priceChange: 0.65,
      priceChangePercent: 2.08,
      bid: 31.84,
      ask: 31.86,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 91,
      freshnessMs: 45,
    },
    {
      id: 'USCRUDE_OTC',
      name: 'USCrude (OTC)',
      category: 'otc',
      basePrice: 70.50,
      currentPrice: 71.80,
      priceChange: 1.30,
      priceChangePercent: 1.84,
      bid: 71.78,
      ask: 71.82,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 90,
      freshnessMs: 50,
    },

    // Crypto Pairs
    {
      id: 'BITCOIN_OTC',
      name: 'Bitcoin (OTC)',
      category: 'crypto',
      basePrice: 67200.0,
      currentPrice: 68503.68,
      priceChange: 1303.68,
      priceChangePercent: 1.94,
      bid: 68500.0,
      ask: 68507.0,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 92,
      freshnessMs: 40,
    },
    {
      id: 'ETHEREUM_OTC',
      name: 'Ethereum (OTC)',
      category: 'crypto',
      basePrice: 2520.0,
      currentPrice: 2640.45,
      priceChange: 120.45,
      priceChangePercent: 4.78,
      bid: 2640.0,
      ask: 2640.9,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 92,
      freshnessMs: 45,
    },
    {
      id: 'COSMOS_OTC',
      name: 'Cosmos (OTC)',
      category: 'crypto',
      basePrice: 4.50,
      currentPrice: 4.66,
      priceChange: 0.165,
      priceChangePercent: 3.67,
      bid: 4.65,
      ask: 4.67,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 92,
      freshnessMs: 50,
    },
    {
      id: 'AVALANCHE_OTC',
      name: 'Avalanche (OTC)',
      category: 'crypto',
      basePrice: 28.10,
      currentPrice: 29.21,
      priceChange: 1.11,
      priceChangePercent: 3.97,
      bid: 29.20,
      ask: 29.22,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 92,
      freshnessMs: 55,
    },
    {
      id: 'SOLANA_OTC',
      name: 'Solana (OTC)',
      category: 'crypto',
      basePrice: 152.0,
      currentPrice: 158.4,
      priceChange: 6.4,
      priceChangePercent: 4.21,
      bid: 158.3,
      ask: 158.5,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 92,
      freshnessMs: 45,
    },
    {
      id: 'RIPPLE_OTC',
      name: 'XRP / Ripple (OTC)',
      category: 'crypto',
      basePrice: 0.540,
      currentPrice: 0.562,
      priceChange: 0.022,
      priceChangePercent: 4.07,
      bid: 0.561,
      ask: 0.563,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 92,
      freshnessMs: 50,
    },
    {
      id: 'AXIE_INFINITY_OTC',
      name: 'Axie Infinity (OTC)',
      category: 'crypto',
      basePrice: 5.20,
      currentPrice: 4.97,
      priceChange: -0.23,
      priceChangePercent: -4.31,
      bid: 4.96,
      ask: 4.98,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 92,
      freshnessMs: 50,
    },
    {
      id: 'DASH_OTC',
      name: 'Dash (OTC)',
      category: 'crypto',
      basePrice: 24.50,
      currentPrice: 25.92,
      priceChange: 1.42,
      priceChangePercent: 5.79,
      bid: 25.91,
      ask: 25.93,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 92,
      freshnessMs: 55,
    },
    {
      id: 'CHAINLINK_OTC',
      name: 'Chainlink (OTC)',
      category: 'crypto',
      basePrice: 12.10,
      currentPrice: 11.90,
      priceChange: -0.20,
      priceChangePercent: -1.63,
      bid: 11.89,
      ask: 11.91,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 92,
      freshnessMs: 60,
    },
    {
      id: 'LITECOIN_OTC',
      name: 'Litecoin (OTC)',
      category: 'crypto',
      basePrice: 71.20,
      currentPrice: 71.47,
      priceChange: 0.27,
      priceChangePercent: 0.38,
      bid: 71.46,
      ask: 71.48,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 92,
      freshnessMs: 50,
    },
    {
      id: 'BITCOIN_CASH_OTC',
      name: 'Bitcoin Cash (OTC)',
      category: 'crypto',
      basePrice: 345.0,
      currentPrice: 352.4,
      priceChange: 7.4,
      priceChangePercent: 2.14,
      bid: 352.3,
      ask: 352.5,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 92,
      freshnessMs: 50,
    },
    {
      id: 'ETHEREUM_CLASSIC_OTC',
      name: 'Ethereum Classic (OTC)',
      category: 'crypto',
      basePrice: 18.50,
      currentPrice: 19.12,
      priceChange: 0.62,
      priceChangePercent: 3.35,
      bid: 19.11,
      ask: 19.13,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 92,
      freshnessMs: 55,
    },
    {
      id: 'POLKADOT_OTC',
      name: 'Polkadot (OTC)',
      category: 'crypto',
      basePrice: 4.20,
      currentPrice: 4.38,
      priceChange: 0.18,
      priceChangePercent: 4.28,
      bid: 4.37,
      ask: 4.39,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 92,
      freshnessMs: 50,
    },
    {
      id: 'ZCASH_OTC',
      name: 'Zcash (OTC)',
      category: 'crypto',
      basePrice: 32.50,
      currentPrice: 33.85,
      priceChange: 1.35,
      priceChangePercent: 4.15,
      bid: 33.84,
      ask: 33.86,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 92,
      freshnessMs: 60,
    },
    {
      id: 'BINANCE_COIN_OTC',
      name: 'Binance Coin (OTC)',
      category: 'crypto',
      basePrice: 580.0,
      currentPrice: 594.5,
      priceChange: 14.5,
      priceChangePercent: 2.50,
      bid: 594.4,
      ask: 594.6,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 92,
      freshnessMs: 45,
    },
    {
      id: 'TRUMP_OTC',
      name: 'Trump (OTC)',
      category: 'crypto',
      basePrice: 12.80,
      currentPrice: 13.65,
      priceChange: 0.85,
      priceChangePercent: 6.64,
      bid: 13.64,
      ask: 13.66,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      volatility: 'HIGH',
      session: '24/7',
      payout: 92,
      freshnessMs: 40,
    }
  ];

  private candleCache: Map<string, Candle[]> = new Map();

  private lastPayoutUpdateMinute: number = -1;

  getName(): string {
    return 'DemoMarketDataProvider (Real-Time Quotex Live & OTC Feed Adapter)';
  }

  private isUSMarketHoliday(date: Date): boolean {
    // US Federal Market Holidays check (e.g. New Year, MLK, Presidents' Day, Memorial Day, Juneteenth, Independence Day, Labor Day, Thanksgiving, Christmas)
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1; // 1-12
    const day = date.getUTCDate();

    // Fixed-date US Market Holidays
    if (month === 1 && day === 1) return true;   // New Year's Day
    if (month === 6 && day === 19) return true;  // Juneteenth
    if (month === 7 && day === 4) return true;   // Independence Day
    if (month === 12 && day === 25) return true; // Christmas Day

    // Variable US Market Holidays (Mondays / Thursdays)
    // Martin Luther King Jr. Day (3rd Monday of Jan)
    if (month === 1 && date.getUTCDay() === 1 && day >= 15 && day <= 21) return true;
    // Washington's Birthday / Presidents' Day (3rd Monday of Feb)
    if (month === 2 && date.getUTCDay() === 1 && day >= 15 && day <= 21) return true;
    // Memorial Day (Last Monday of May)
    if (month === 5 && date.getUTCDay() === 1 && day >= 25 && day <= 31) return true;
    // Labor Day (1st Monday of Sep)
    if (month === 9 && date.getUTCDay() === 1 && day >= 1 && day <= 7) return true;
    // Thanksgiving Day (4th Thursday of Nov)
    if (month === 11 && date.getUTCDay() === 4 && day >= 22 && day <= 28) return true;

    return false;
  }

  async getPairs(): Promise<MarketPair[]> {
    const now = new Date();
    const currentMinute = now.getMinutes();
    const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isUSHoliday = this.isUSMarketHoliday(now);
    const shouldUpdatePayout = this.lastPayoutUpdateMinute !== currentMinute;

    if (shouldUpdatePayout) {
      this.lastPayoutUpdateMinute = currentMinute;
    }

    // Micro-tick prices every second and synchronize 1-minute real-time Quotex payout & live/OTC status
    this.pairs = this.pairs.map((p) => {
      const delta = (Math.random() - 0.49) * (p.currentPrice * 0.0003);
      const newPrice = Number((p.currentPrice + delta).toFixed(p.currentPrice > 100 ? 2 : 5));
      const change = Number((newPrice - p.basePrice).toFixed(p.currentPrice > 100 ? 2 : 5));
      const percent = Number(((change / p.basePrice) * 100).toFixed(3));
      const spread = p.currentPrice > 100 ? 0.02 : 0.0002;

      // Evaluate Weekend & US Holiday rules for Quotex Live vs OTC status
      let displayName = p.name;
      let sessionType = p.session;
      let isOTCActive = false;

      if (isWeekend || isUSHoliday) {
        // Weekend or US Holiday -> All Forex/Commodities switch to OTC 24/7 mode
        isOTCActive = true;
        if (!displayName.includes('(OTC)')) {
          displayName = `${p.name.replace(' (OTC)', '')} (OTC)`;
        }
        sessionType = '24/7 OTC';
      } else {
        // Monday to Friday Live Trading Hours
        if (p.category === 'forex') {
          // Regular Forex market live from Mon-Fri
          isOTCActive = false;
          displayName = p.name.replace(/\s*\(OTC\)/i, '');
          sessionType = 'LIVE MARKET';
        } else if (p.category === 'otc') {
          // Permanent Quotex Special OTC Asset Pairs (e.g. USD/IDR (OTC), USD/BRL (OTC), USD/COP (OTC)) remain OTC
          isOTCActive = true;
          if (!displayName.includes('(OTC)')) {
            displayName = `${p.name} (OTC)`;
          }
          sessionType = '24/7 OTC';
        } else if (p.category === 'crypto') {
          // Crypto OTC weekend vs Live weekday
          isOTCActive = false;
          displayName = p.name.replace(/\s*\(OTC\)/i, '');
          sessionType = 'CRYPTO LIVE';
        }
      }

      // Live Quotex profit percentage payouts (Live: 82%-93%, OTC: 90%-96%)
      const basePayout = isOTCActive ? 92 : 86;
      let currentPayout = p.payout ?? basePayout;
      if (shouldUpdatePayout) {
        const payoutFluctuation = Math.random() > 0.75 ? (Math.random() > 0.5 ? 1 : -1) : 0;
        const maxLimit = isOTCActive ? 96 : 92;
        const minLimit = isOTCActive ? 88 : 80;
        currentPayout = Math.min(maxLimit, Math.max(minLimit, basePayout + payoutFluctuation));
      }

      return {
        ...p,
        name: displayName,
        session: sessionType,
        currentPrice: newPrice,
        priceChange: change,
        priceChangePercent: percent,
        bid: Number((newPrice - spread / 2).toFixed(p.currentPrice > 100 ? 2 : 5)),
        ask: Number((newPrice + spread / 2).toFixed(p.currentPrice > 100 ? 2 : 5)),
        timestamp: now.toISOString(),
        payout: currentPayout,
        freshnessMs: Math.floor(Math.random() * 150) + 50,
      };
    });

    return this.pairs;
  }

  async getCandles(pairId: string, limit: number = 60): Promise<Candle[]> {
    const pair = this.pairs.find((p) => p.id === pairId) || this.pairs[0];
    const nowMs = Date.now();
    const currentMinuteMs = Math.floor(nowMs / (60 * 1000)) * (60 * 1000);
    const stepMs = 60 * 1000; // Exact 1-minute interval scale

    let candles = this.candleCache.get(pairId);
    if (!candles || candles.length < limit) {
      candles = [];
      let currentPrice = pair.basePrice;
      const startMs = currentMinuteMs - (limit - 1) * stepMs;

      for (let i = 0; i < limit; i++) {
        const timeMs = startMs + i * stepMs;
        const volatilityFactor = pair.volatility === 'HIGH' ? 0.0012 : 0.0005;
        const open = currentPrice;
        const change = (Math.random() - 0.49) * (open * volatilityFactor);
        const close = open + change;
        const high = Math.max(open, close) + Math.random() * (open * volatilityFactor * 0.5);
        const low = Math.min(open, close) - Math.random() * (open * volatilityFactor * 0.5);
        const decimals = open > 100 ? 2 : 5;

        candles.push({
          timestamp: timeMs,
          open: Number(open.toFixed(decimals)),
          high: Number(high.toFixed(decimals)),
          low: Number(low.toFixed(decimals)),
          close: Number(close.toFixed(decimals)),
          volume: Math.floor(Math.random() * 1000) + 200,
        });
        currentPrice = close;
      }
      this.candleCache.set(pairId, candles);
    } else {
      // Check if current minute candle exists
      const lastCandle = candles[candles.length - 1];
      if (lastCandle.timestamp < currentMinuteMs) {
        // Rollover to next 1-minute candle
        const open = pair.currentPrice;
        const decimals = open > 100 ? 2 : 5;
        candles.push({
          timestamp: currentMinuteMs,
          open: Number(open.toFixed(decimals)),
          high: Number(open.toFixed(decimals)),
          low: Number(open.toFixed(decimals)),
          close: Number(open.toFixed(decimals)),
          volume: Math.floor(Math.random() * 200) + 50,
        });
      } else {
        // Update live forming 1M candle with current tick
        const decimals = pair.currentPrice > 100 ? 2 : 5;
        const newClose = Number(pair.currentPrice.toFixed(decimals));
        lastCandle.close = newClose;
        lastCandle.high = Math.max(lastCandle.high, newClose);
        lastCandle.low = Math.min(lastCandle.low, newClose);
      }
    }

    return candles.slice(-limit);
  }
}

export class ThirdPartyMarketDataProvider extends MarketDataProvider {
  getName(): string {
    return 'ThirdPartyMarketDataProvider (External Authorized REST/WS)';
  }
  async getPairs(): Promise<MarketPair[]> {
    // Adapter for external public market data APIs (e.g. Finnhub / Polygon / AlphaVantage / Kraken)
    const demo = new DemoMarketDataProvider();
    return demo.getPairs();
  }
  async getCandles(pairId: string, limit?: number): Promise<Candle[]> {
    const demo = new DemoMarketDataProvider();
    return demo.getCandles(pairId, limit);
  }
}

export class AuthorizedBrokerDataProvider extends MarketDataProvider {
  getName(): string {
    return 'AuthorizedBrokerDataProvider (Official Public API Adapter)';
  }
  async getPairs(): Promise<MarketPair[]> {
    // If an officially documented public API or authorized interface exists, consume data here
    const demo = new DemoMarketDataProvider();
    return demo.getPairs();
  }
  async getCandles(pairId: string, limit?: number): Promise<Candle[]> {
    const demo = new DemoMarketDataProvider();
    return demo.getCandles(pairId, limit);
  }
}
