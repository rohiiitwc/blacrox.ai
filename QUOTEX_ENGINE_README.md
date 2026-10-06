# Quotex Real-Time Binary Options Signal Generator Daemon

Low-latency 1-minute binary options signal generation service connected directly to [https://qxbroker.com/en/trade](https://qxbroker.com/en/trade) terminal and broadcasting live signals to the frontend deployment (`https://blacrox-aiin-eight.vercel.app/`).

## Architecture & Workflow

1. **`quotex-scraper-engine.js`**: Headless Node.js process using `puppeteer-extra` and stealth plugins. Attaches to Chrome DevTools Protocol (`Network.webSocketFrameReceived`) to parse raw binary/text frames from Quotex's broker socket (`https://qxbroker.com/en/trade`) into an in-memory OHLCV candle feed (100+ candles).
2. **`indicator-calculator.js`**: Pure mathematical technical analysis engine computing RSI-14, Bollinger Bands (20,2), EMA-9, EMA-21, and MACD (12,26,9) without external heavy dependencies.
3. **`scheduler-dispatcher.js`**: Precision timer running on 500ms ticks:
   - **Signal Evaluation Window**: Synchronizes to compute & broadcast signals at exact `HH:MM:45` to `HH:MM:48` (12 to 15s before candle open).
   - **Settlement Verification**: Monitors closing price at `HH:MM:00` + 60s directly on Quotex terminal, evaluates `WIN` / `LOSS` / `DRAW`, and pushes outcome immediately to the frontend.

---

## Prerequisites

- **Node.js**: v18.0.0+
- **Chrome / Chromium**: Installed locally or supplied via Puppeteer

Install required dependencies:

```bash
npm install puppeteer-extra puppeteer-extra-plugin-stealth puppeteer
```

---

## Running in Development

Run the signal generator directly from terminal:

```bash
node scheduler-dispatcher.js
```

Environment variables supported:
- `FRONTEND_ENDPOINT`: URL to push JSON signals & settlements (default: `https://blacrox-aiin-eight.vercel.app/api/signals`).
- `TARGET_PAIR`: Asset pair to monitor (default: `EUR/USD`).

Example:
```bash
FRONTEND_ENDPOINT=https://blacrox-aiin-eight.vercel.app/api/signals TARGET_PAIR=EUR/USD node scheduler-dispatcher.js
```

---

## Continuous Background Daemon Deployment

### Option A: Running with PM2 (Recommended for VPS / Server)

1. Install PM2 globally:
   ```bash
   npm install -g pm2
   ```

2. Start the signal generator daemon:
   ```bash
   pm2 start scheduler-dispatcher.js --name "quotex-signal-daemon" --restart-delay 3000 --max-memory-restart 500M
   ```

3. Save PM2 startup config to auto-restart on system reboot:
   ```bash
   pm2 save
   pm2 startup
   ```

4. View daemon logs:
   ```bash
   pm2 logs quotex-signal-daemon
   ```

---

### Option B: Docker Containerization

1. Create a `Dockerfile`:
   ```dockerfile
   FROM node:20-slim

   # Install Chrome dependencies for Puppeteer stealth
   RUN apt-get update && apt-get install -y \
       chromium \
       fonts-ipafont-gothic \
       fonts-wqy-zenhei \
       fonts-thai-tlwg \
       fonts-kacst \
       fonts-freefont-ttf \
       libxss1 \
       --no-install-recommends \
       && rm -rf /var/lib/apt/lists/*

   ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
       PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .

   CMD ["node", "scheduler-dispatcher.js"]
   ```

2. Build & Run Docker Image:
   ```bash
   docker build -t quotex-signal-engine .
   docker run -d --name quotex-daemon --restart always -e FRONTEND_ENDPOINT="https://blacrox-aiin-eight.vercel.app/api/signals" quotex-signal-engine
   ```

---

## Cloudflare Challenge & Auto-Reconnect Handling

- The scraper engine utilizes `puppeteer-extra-plugin-stealth` to naturally pass Cloudflare bot detection on `https://qxbroker.com/en/trade`.
- In the event of a socket disconnect or Cloudflare re-challenge, `quotex-scraper-engine.js` automatically re-establishes CDP socket listeners without interrupting the timing loop.
