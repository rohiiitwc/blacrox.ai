# BLACROX.AI — AI-Powered Educational Trading Chart Analysis Website

An educational market analysis and paper-trading simulator designed for Quotex 1-minute candlestick charts. The platform processes chart screenshots using three concurrent AI vision engines:
1. **ChatGPT (OpenAI GPT-4o)**
2. **Gemini (Google Gemini 2.5 Flash)**
3. **Grok (xAI Grok-2-Vision)**

---

## ⚠️ Important Educational Disclaimer
- **Paper-Trading & Simulator Only:** This website is strictly an educational tool and simulator.
- **No Real Trades:** It does not connect to brokers, execute trades, or place orders.
- **No Guaranteed Returns:** AI market interpretations carry uncertainty. Never risk real financial capital based on AI predictions.
- **No Password Requests:** Users are never prompted for Quotex or broker account passwords.

---

## Key Features

### 1. Quotex Screenshot Upload & Preview
- Drag-and-drop or file browser upload for PNG, JPG, and JPEG.
- Desktop and mobile responsive file preview with instant remove/replace options.
- Client and server-side file type and 10MB size validation.
- User data isolation ensures uploads belong strictly to the authenticated account.

### 2. Concurrent Multi-AI Engine
- Concurrent execution using `Promise.allSettled()` across:
  - **ChatGPT** (OpenAI Vision API)
  - **Gemini** (Google Generative AI API)
  - **Grok** (xAI Vision API)
- Extracts:
  - Detected Currency Pair (e.g. `EUR/USD`)
  - Market Type (OTC vs Live Market)
  - Candlestick patterns (e.g., Bullish Engulfing, Pin Bar, Doji)
  - Indicators: EMA 7, EMA 21, Bollinger Bands, Support/Resistance, Volume, Market Structure
  - Potential Bullish vs Bearish scenarios
  - Calibrated confidence & uncertainty estimates

### 3. One-Minute Candle Consensus
- Educational labels: `UP`, `DOWN`, or `INCONCLUSIVE`.
- Model agreement scoring:
  - `3/3` Unanimous Agreement
  - `2/3` Majority Agreement
  - `Disagreement` -> Automatically falls back to `INCONCLUSIVE` as per educational safety standards.

### 4. Section 6 Candle Outcome Evaluation
Users can upload or declare the outcome after the 1-minute candle closes:
| Original Scenario | Completed Candle | Evaluation Result |
| :--- | :--- | :--- |
| **UP** | Green | **Correct** |
| **UP** | Red | **Incorrect** |
| **DOWN** | Red | **Correct** |
| **DOWN** | Green | **Incorrect** |
| **Either** | Doji | **Neutral / REFUND simulation** |
| **Unclear** | Unresolved | **UNRESOLVED** |

*Note: Doji candles are classified as REFUND and are excluded from the Win Rate calculation.*

### 5. Honest Performance & Accuracy Tracker
- Separate accuracy metrics for Overall, OTC markets, and Live markets.
- Statistical significance guard: When sample size is under 20 resolved evaluations, the dashboard clearly displays:
  > `⚠️ Accuracy is unverified — insufficient sample data (< 20 resolved evaluations)`
- Never claims unsupported 85–90% or 99–100% win rates.

### 6. Authentication & Session Security
- User registration, login, forgot password, and reset password flows.
- Strict session lifetime of **exactly 120 minutes (2 hours)** enforced on the backend via JWT and tracked on the frontend.
- When expired, automatically redirects to login with:
  > `"Your session has expired. Please log in again."`
- Password hashing with `bcryptjs`.
- `.env` protected in `.gitignore`. Server-side API calls only.

---

## Tech Stack
- **Backend:** Node.js (v24), Express 5, Better-SQLite3 (WAL mode), Multer, Bcrypt.js, JsonWebToken.
- **Frontend:** Vanilla HTML5, Modern CSS (Design tokens, Dark Mode `:root { color-scheme: dark; }`, Responsive Flexbox/Grid), Vanilla ES6 Modules.
- **AI Integrations:** OpenAI REST API, Google Gemini REST API, xAI Grok REST API.

---

## Getting Started

### 1. Prerequisites
- Node.js (v18+)

### 2. Installation
```bash
# Clone the repository and navigate into the folder
cd Blacrox.AI

# Install dependencies
npm install
```

### 3. Environment Variables
Create a `.env` file in the project root (copied from `.env.example`):
```env
PORT=3000
NODE_ENV=development

# 2-hour session expiration
JWT_SECRET=your_jwt_secret_key_here
SESSION_EXPIRY_HOURS=2

# Live AI Credentials (leave blank to run in educational simulation mode)
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o

GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash

GROK_API_KEY=
GROK_MODEL=grok-2-vision-1212

# Set to true to allow educational testing without live keys
MOCK_AI_FALLBACK=true
```

### 4. Running the Application
```bash
# Start server
npm start
```
Visit `http://localhost:3000` in your web browser.

### 5. Running the Automated Test Suite
```bash
npm test
```
Runs the 15-point automated verification suite testing registration, login, password reset, 2-hour session expiry, screenshot upload, multi-AI parallel calls, consensus, candle evaluation rules, user isolation, and security.
