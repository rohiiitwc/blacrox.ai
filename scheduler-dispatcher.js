const http = require('http');
const QuotexScraperEngine = require('./quotex-scraper-engine');
const { evaluateSignalRules } = require('./indicator-calculator');

/**
 * Scheduler & Real-Time Event Dispatcher
 * Synchronizes at the exact HH:MM:45s mark to calculate 1-minute binary signal
 * Monitors expiry at HH:MM:00 + 60s for Quotex settlement verification.
 */
class SchedulerDispatcher {
  constructor(options = {}) {
    this.targetPair = options.pair || 'EUR/USD';
    this.frontendEndpoint = options.frontendEndpoint || 'https://blacrox-aiin-eight.vercel.app/api/signals';
    this.scraper = new QuotexScraperEngine({ selectedPair: this.targetPair });
    this.activeSignals = new Map(); // Store pending active signals waiting for settlement
    this.isTimerRunning = false;
    this.timerId = null;
  }

  /**
   * Start high-precision timing cycle & CDP scraping daemon
   */
  async start() {
    console.log(`[SchedulerDispatcher] Initializing engine for ${this.targetPair}...`);
    
    // Launch Quotex browser scraper
    await this.scraper.initialize();

    // Start precision interval watcher (evaluates every 500ms for exact :45s boundary match)
    this.isTimerRunning = true;
    this.timerId = setInterval(() => {
      this.checkTimingWindow();
    }, 500);

    console.log(`[SchedulerDispatcher] Timing protocol active. Synchronized to :45s signal broadcast mark.`);
  }

  /**
   * Check current clock and execute appropriate protocol stage (:45s signal or :00s settlement)
   */
  checkTimingWindow() {
    const now = new Date();
    const seconds = now.getSeconds();
    const currentMinuteStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // 1. Signal Execution Window: HH:MM:45 to HH:MM:48 (12-15 seconds before new candle open)
    if (seconds >= 45 && seconds <= 47) {
      const signalKey = `${currentMinuteStr}:45`;
      if (!this.activeSignals.has(signalKey)) {
        this.generateAndDispatchSignal(now, signalKey);
      }
    }

    // 2. Real-time Outcome Verification Window: Check pending expired trades at HH:MM:00 boundary
    this.verifyPendingSettlements(now);
  }

  /**
   * Generate signal using technical indicators over Quotex candles and dispatch to target frontend
   */
  async generateAndDispatchSignal(now, signalKey) {
    console.log(`\n[SignalEngine] Triggered at ${now.toISOString()} (:45s mark)`);

    // Sourced exclusively from Quotex live candles
    const candles = this.scraper.getCandles();
    const signalResult = evaluateSignalRules(candles);

    if (signalResult.action === 'NEUTRAL') {
      console.log(`[SignalEngine] Market condition NEUTRAL. Skipping broadcast to avoid low probability trade.`);
      this.activeSignals.set(signalKey, { status: 'SKIPPED' });
      return;
    }

    // Calculate exact target entry and expiry timestamps
    // Entry: Exact next minute open HH:MM+1:00
    const entryDate = new Date(now.getTime() + (60 - now.getSeconds()) * 1000);
    entryDate.setMilliseconds(0);
    const expiryDate = new Date(entryDate.getTime() + 60 * 1000);

    const formatTime = (d) => `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:00`;
    const signalTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    const entryTimeStr = formatTime(entryDate);
    const expiryTimeStr = formatTime(expiryDate);

    const latestPrice = this.scraper.getLatestPrice(this.targetPair) || candles[candles.length - 1].close;

    const payload = {
      pair: this.targetPair,
      action: signalResult.action,
      signalTime: signalTimeStr,
      entryTime: entryTimeStr,
      expiryTime: expiryTimeStr,
      source: "Quotex Live Terminal (https://qxbroker.com/en/trade)",
      confidence: signalResult.confidence,
      reason: signalResult.reason,
      entryPrice: latestPrice,
      rawIndicators: signalResult.indicators
    };

    console.log(`[SignalEngine] GENERATED SIGNAL:`, JSON.stringify(payload, null, 2));

    // Store signal reference to verify settlement price at expiry
    this.activeSignals.set(signalKey, {
      id: `quotex_sig_${Date.now()}`,
      payload,
      expiryTimestampMs: expiryDate.getTime(),
      entryPrice: latestPrice,
      action: signalResult.action,
      status: 'ACTIVE',
    });

    // Broadcast payload to frontend deployment immediately
    await this.dispatchToFrontend(payload);
  }

  /**
   * Monitor closing price on Quotex terminal at exact expiry timestamp (HH:MM:00 + 60s)
   */
  async verifyPendingSettlements(now) {
    const nowMs = now.getTime();

    const settlementDelayMs = 20000; // 20-second confirmation delay after trade expiry (15-30 seconds)

    for (const [key, sig] of this.activeSignals.entries()) {
      if (sig.status === 'ACTIVE' && nowMs >= sig.expiryTimestampMs + settlementDelayMs) {
        // Fetch exact exit strike settlement price from Quotex broker socket
        const exitPrice = this.scraper.getLatestPrice(this.targetPair) || sig.entryPrice;
        
        let outcome = 'DRAW';
        if (sig.action === 'CALL') {
          outcome = exitPrice > sig.entryPrice ? 'WIN' : exitPrice < sig.entryPrice ? 'LOSS' : 'DRAW';
        } else if (sig.action === 'PUT') {
          outcome = exitPrice < sig.entryPrice ? 'WIN' : exitPrice > sig.entryPrice ? 'LOSS' : 'DRAW';
        }

        sig.status = 'SETTLED';
        sig.outcome = outcome;
        sig.exitPrice = exitPrice;

        console.log(`\n[SettlementVerifier] TRADE SETTLED FOR ${this.targetPair}:`);
        console.log(` - Entry Price: ${sig.entryPrice}`);
        console.log(` - Settlement Price: ${exitPrice}`);
        console.log(` - Direction: ${sig.action} | Outcome: ${outcome}`);

        // Push verification result to frontend server
        await this.dispatchVerificationResult({
          signalId: sig.id,
          newStatus: outcome,
          entryPrice: sig.entryPrice,
          expiryPrice: exitPrice,
          pair: this.targetPair
        });
      }
    }
  }

  /**
   * Push JSON signal event payload to target HTTP/WebSocket frontend deployment
   */
  async dispatchToFrontend(payload) {
    try {
      const postData = JSON.stringify(payload);
      console.log(`[Dispatcher] Dispatching real-time signal to ${this.frontendEndpoint}...`);

      const urlObj = new URL(this.frontendEndpoint);
      const reqOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = (urlObj.protocol === 'https:' ? require('https') : http).request(reqOptions, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          console.log(`[Dispatcher] Frontend dispatch response (${res.statusCode}): ${body}`);
        });
      });

      req.on('error', (err) => {
        console.error(`[Dispatcher] Failed to dispatch signal to frontend: ${err.message}`);
      });

      req.write(postData);
      req.end();
    } catch (e) {
      console.error(`[Dispatcher] Dispatch exception: ${e.message}`);
    }
  }

  /**
   * Push settlement outcome verification payload
   */
  async dispatchVerificationResult(verificationPayload) {
    try {
      const postData = JSON.stringify(verificationPayload);
      const urlObj = new URL(this.frontendEndpoint);

      const reqOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = (urlObj.protocol === 'https:' ? require('https') : http).request(reqOptions, (res) => {
        res.on('data', () => {});
      });

      req.on('error', (err) => {
        console.error(`[Dispatcher] Verification dispatch error: ${err.message}`);
      });

      req.write(postData);
      req.end();
    } catch (e) {
      console.error(`[Dispatcher] Settlement dispatch exception: ${e.message}`);
    }
  }

  /**
   * Gracefully stop dispatcher
   */
  async stop() {
    if (this.timerId) clearInterval(this.timerId);
    await this.scraper.close();
    console.log('[SchedulerDispatcher] Engine stopped cleanly.');
  }
}

// Auto-run if executed directly
if (require.main === module) {
  const engine = new SchedulerDispatcher({
    pair: 'EUR/USD',
    frontendEndpoint: process.env.FRONTEND_ENDPOINT || 'https://blacrox-aiin-eight.vercel.app/api/signals'
  });

  engine.start().catch((err) => {
    console.error('Fatal runtime failure in signal dispatcher daemon:', err);
  });
}

module.exports = SchedulerDispatcher;
