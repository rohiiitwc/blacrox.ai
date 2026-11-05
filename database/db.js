const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'blacrox.db');
const db = new Database(dbPath);

// Enable WAL mode for high concurrency & foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      reset_token TEXT,
      reset_token_expires INTEGER
    );

    CREATE TABLE IF NOT EXISTS analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      initial_screenshot TEXT NOT NULL,
      initial_screenshot_orig_name TEXT,
      trading_pair TEXT DEFAULT 'Unknown',
      market_type TEXT DEFAULT 'Unknown',
      timeframe TEXT DEFAULT '1M',
      upload_timestamp TEXT NOT NULL,
      server_time INTEGER NOT NULL,
      status TEXT DEFAULT 'COMPLETED',
      consensus_decision TEXT DEFAULT 'INCONCLUSIVE',
      consensus_confidence INTEGER DEFAULT 0,
      agreement_score TEXT DEFAULT '0/3',
      agreement_type TEXT DEFAULT 'DISAGREEMENT',
      combined_conclusion TEXT,
      limitations_notes TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ai_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      analysis_id INTEGER NOT NULL,
      provider TEXT NOT NULL,
      provider_label TEXT NOT NULL,
      decision TEXT NOT NULL,
      confidence INTEGER NOT NULL,
      pair TEXT,
      market_type TEXT,
      timeframe TEXT,
      trend TEXT,
      candlestick_pattern TEXT,
      ema_observations TEXT,
      bb_observations TEXT,
      sr_observations TEXT,
      volume_observations TEXT,
      market_structure TEXT,
      scenarios TEXT,
      uncertainty TEXT,
      response_time_ms INTEGER,
      status TEXT DEFAULT 'SUCCESS',
      error_message TEXT,
      raw_response TEXT,
      FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS evaluations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      analysis_id INTEGER NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      completed_screenshot TEXT,
      candle_color TEXT NOT NULL,
      original_decision TEXT NOT NULL,
      evaluation_result TEXT NOT NULL,
      evaluation_notes TEXT,
      evaluated_at TEXT NOT NULL,
      FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
    CREATE INDEX IF NOT EXISTS idx_ai_results_analysis_id ON ai_results(analysis_id);
    CREATE INDEX IF NOT EXISTS idx_evaluations_user_id ON evaluations(user_id);
    CREATE INDEX IF NOT EXISTS idx_evaluations_analysis_id ON evaluations(analysis_id);
  `);
}

initSchema();

module.exports = db;
