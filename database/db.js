const path = require('path');
const fs = require('fs');

const isVercel = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT ||
  (process.env.NODE_ENV === 'production' && !fs.existsSync(path.join(__dirname, '../data')))
);

// On serverless environments (like Vercel), the root filesystem is read-only.
// /tmp is the only writable directory.
let dbDir = path.join(__dirname, '../data');
if (isVercel) {
  dbDir = '/tmp/blacrox_data';
}

try {
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
} catch (e) {
  console.warn('Could not create db directory, falling back to /tmp:', e.message);
  dbDir = '/tmp';
}

const dbPath = path.join(dbDir, 'blacrox.db');

let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(dbPath);
  try { db.pragma(isVercel ? 'journal_mode = MEMORY' : 'journal_mode = WAL'); } catch (e) {}
  try { db.pragma('foreign_keys = ON'); } catch (e) {}
} catch (err) {
  console.warn('Failed to open SQLite database at path, falling back to in-memory:', err.message);
  try {
    const Database = require('better-sqlite3');
    db = new Database(':memory:');
  } catch (err2) {
    console.error('Critical: better-sqlite3 native addon unavailable, using resilient fallback store:', err2.message);
    db = createFallbackDb();
  }
}

function createFallbackDb() {
  const tables = {
    users: [],
    analyses: [],
    ai_results: [],
    evaluations: []
  };
  let autoIds = { users: 1, analyses: 1, ai_results: 1, evaluations: 1 };

  return {
    exec: () => {},
    pragma: () => {},
    transaction: (fn) => (...args) => fn(...args),
    prepare: (sql) => {
      return {
        get: (...params) => {
          if (sql.includes('FROM users') && sql.includes('WHERE id = ?')) {
            return tables.users.find(u => u.id === params[0]) || null;
          }
          if (sql.includes('FROM users') && sql.includes('WHERE email = ?')) {
            return tables.users.find(u => (u.email || '').toLowerCase() === (params[0] || '').toLowerCase()) || null;
          }
          if (sql.includes('FROM users') && sql.includes('WHERE reset_token = ?')) {
            return tables.users.find(u => u.reset_token === params[0]) || null;
          }
          if (sql.includes('FROM analyses') && sql.includes('WHERE id = ?')) {
            return tables.analyses.find(a => a.id === params[0]) || null;
          }
          if (sql.includes('FROM evaluations') && sql.includes('WHERE id = ?')) {
            return tables.evaluations.find(e => e.id === params[0]) || null;
          }
          if (sql.includes('FROM evaluations') && sql.includes('WHERE analysis_id = ?')) {
            return tables.evaluations.find(e => e.analysis_id === params[0]) || null;
          }
          if (sql.includes('COUNT(*)')) {
            return { c: 0 };
          }
          return null;
        },
        all: (...params) => {
          if (sql.includes('FROM analyses') && sql.includes('WHERE user_id = ?')) {
            return tables.analyses.filter(a => a.user_id === params[0]);
          }
          if (sql.includes('FROM ai_results') && sql.includes('WHERE analysis_id = ?')) {
            return tables.ai_results.filter(r => r.analysis_id === params[0]);
          }
          if (sql.includes('FROM evaluations')) {
            if (params.length > 0 && typeof params[0] === 'number') {
              return tables.evaluations.filter(e => e.user_id === params[0]);
            }
            return tables.evaluations;
          }
          return [];
        },
        run: (...params) => {
          if (sql.includes('INSERT INTO users') || sql.includes('INSERT OR IGNORE INTO users')) {
            const hasExplicitId = sql.includes('(id,') || sql.includes('(id ');
            const id = hasExplicitId ? params[0] : autoIds.users++;
            const name = hasExplicitId ? params[1] : params[0];
            const mail = hasExplicitId ? params[2] : params[1];
            const hash = hasExplicitId ? params[3] : params[2];
            const cat = hasExplicitId ? params[4] : params[3];
            const existing = tables.users.find(u => u.id === id || (u.email || '').toLowerCase() === (mail || '').toLowerCase());
            if (!existing) {
              tables.users.push({ id, full_name: name, email: mail, password_hash: hash, created_at: cat });
            }
            return { lastInsertRowid: id, changes: 1 };
          }
          if (sql.includes('UPDATE users')) {
            return { lastInsertRowid: 1, changes: 1 };
          }
          if (sql.includes('INSERT INTO analyses')) {
            const id = autoIds.analyses++;
            tables.analyses.push({ id, user_id: params[0], initial_screenshot: params[1], initial_screenshot_orig_name: params[2], upload_timestamp: params[3], server_time: params[4], status: 'PROCESSING' });
            return { lastInsertRowid: id, changes: 1 };
          }
          if (sql.includes('INSERT INTO evaluations')) {
            const id = autoIds.evaluations++;
            tables.evaluations.push({ id, analysis_id: params[0], user_id: params[1], completed_screenshot: params[2], candle_color: params[3], original_decision: params[4], evaluation_result: params[5], evaluation_notes: params[6], evaluated_at: params[7] });
            return { lastInsertRowid: id, changes: 1 };
          }
          if (sql.includes('INSERT INTO ai_results')) {
            const id = autoIds.ai_results++;
            return { lastInsertRowid: id, changes: 1 };
          }
          return { lastInsertRowid: 1, changes: 1 };
        }
      };
    }
  };
}

function initSchema() {
  try {
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
        support_level TEXT DEFAULT '',
        resistance_level TEXT DEFAULT '',
        current_price TEXT DEFAULT '',
        entry_time_ist TEXT DEFAULT '',
        expiry_time_ist TEXT DEFAULT '',
        trade_recommendation TEXT DEFAULT 'TRADE',
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
        support_level TEXT DEFAULT '',
        resistance_level TEXT DEFAULT '',
        current_price TEXT DEFAULT '',
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

    // Safe incremental schema migrations
    try { db.exec("ALTER TABLE analyses ADD COLUMN support_level TEXT DEFAULT '';"); } catch (e) {}
    try { db.exec("ALTER TABLE analyses ADD COLUMN resistance_level TEXT DEFAULT '';"); } catch (e) {}
    try { db.exec("ALTER TABLE analyses ADD COLUMN current_price TEXT DEFAULT '';"); } catch (e) {}
    try { db.exec("ALTER TABLE analyses ADD COLUMN entry_time_ist TEXT DEFAULT '';"); } catch (e) {}
    try { db.exec("ALTER TABLE analyses ADD COLUMN expiry_time_ist TEXT DEFAULT '';"); } catch (e) {}
    try { db.exec("ALTER TABLE analyses ADD COLUMN trade_recommendation TEXT DEFAULT 'TRADE';"); } catch (e) {}
    try { db.exec("ALTER TABLE analyses ADD COLUMN support_y_percent INTEGER DEFAULT 75;"); } catch (e) {}
    try { db.exec("ALTER TABLE analyses ADD COLUMN resistance_y_percent INTEGER DEFAULT 28;"); } catch (e) {}
    try { db.exec("ALTER TABLE analyses ADD COLUMN current_price_y_percent INTEGER DEFAULT 33;"); } catch (e) {}

    try { db.exec("ALTER TABLE ai_results ADD COLUMN support_level TEXT DEFAULT '';"); } catch (e) {}
    try { db.exec("ALTER TABLE ai_results ADD COLUMN resistance_level TEXT DEFAULT '';"); } catch (e) {}
    try { db.exec("ALTER TABLE ai_results ADD COLUMN current_price TEXT DEFAULT '';"); } catch (e) {}
  } catch (err) {
    console.error('Schema initialization warning:', err.message);
  }
}

initSchema();

module.exports = db;
