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
  const storePath = path.join(dbDir, 'store.json');
  const tables = {
    users: [],
    analyses: [],
    ai_results: [],
    evaluations: []
  };
  let autoIds = { users: 1, analyses: 1, ai_results: 1, evaluations: 1 };

  function loadStore() {
    try {
      if (fs.existsSync(storePath)) {
        const raw = fs.readFileSync(storePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && parsed.tables) {
          tables.users = parsed.tables.users || [];
          tables.analyses = parsed.tables.analyses || [];
          tables.ai_results = parsed.tables.ai_results || [];
          tables.evaluations = parsed.tables.evaluations || [];
          autoIds = parsed.autoIds || autoIds;
        }
      }
    } catch (e) {
      console.warn('Fallback store load failed:', e.message);
    }
  }

  function saveStore() {
    try {
      fs.writeFileSync(storePath, JSON.stringify({ tables, autoIds }, null, 2), 'utf8');
    } catch (e) {
      console.warn('Fallback store save failed:', e.message);
    }
  }

  loadStore();

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
            const a = tables.analyses.find(item => item.id === params[0]);
            if (a && sql.includes('AND user_id = ?') && a.user_id !== params[1]) {
              return null;
            }
            return a || null;
          }
          if (sql.includes('FROM evaluations') && sql.includes('WHERE id = ?')) {
            return tables.evaluations.find(e => e.id === params[0]) || null;
          }
          if (sql.includes('FROM evaluations') && sql.includes('WHERE analysis_id = ?')) {
            return tables.evaluations.find(e => e.analysis_id === params[0]) || null;
          }
          if (sql.includes('COUNT(*)')) {
            if (sql.includes('FROM users')) return { c: tables.users.length };
            if (sql.includes('FROM analyses')) return { c: tables.analyses.length };
            return { c: 0 };
          }
          return null;
        },
        all: (...params) => {
          if (sql.includes('FROM analyses')) {
            let matched = [...tables.analyses];
            if (sql.includes('user_id = ?') || sql.includes('a.user_id = ?')) {
              matched = matched.filter(a => a.user_id === params[0]);
            }
            if (sql.includes('LEFT JOIN evaluations')) {
              matched = matched.map(a => {
                const evalRec = tables.evaluations.find(e => e.analysis_id === a.id);
                return {
                  ...a,
                  evaluation_id: evalRec ? evalRec.id : null,
                  candle_color: evalRec ? evalRec.candle_color : null,
                  evaluation_result: evalRec ? evalRec.evaluation_result : null,
                  evaluated_at: evalRec ? evalRec.evaluated_at : null
                };
              });
            }
            if (sql.includes('ORDER BY')) {
              matched.sort((x, y) => y.id - x.id);
            }
            return matched;
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
              saveStore();
            }
            return { lastInsertRowid: id, changes: 1 };
          }
          if (sql.includes('UPDATE users')) {
            if (sql.includes('WHERE id = ?')) {
              const u = tables.users.find(item => item.id === params[params.length - 1]);
              if (u && sql.includes('password_hash = ?')) {
                u.password_hash = params[0];
                u.reset_token = null;
                u.reset_token_expires = null;
                saveStore();
              }
            }
            return { lastInsertRowid: 1, changes: 1 };
          }
          if (sql.includes('INSERT INTO analyses')) {
            const id = autoIds.analyses++;
            tables.analyses.push({
              id,
              user_id: params[0],
              initial_screenshot: params[1],
              initial_screenshot_orig_name: params[2],
              upload_timestamp: params[3],
              server_time: params[4],
              status: 'PROCESSING'
            });
            saveStore();
            return { lastInsertRowid: id, changes: 1 };
          }
          if (sql.includes('UPDATE analyses')) {
            if (sql.includes('SET status = ? WHERE id = ?')) {
              const a = tables.analyses.find(item => item.id === params[1]);
              if (a) { a.status = params[0]; saveStore(); }
            } else if (sql.includes('SET trading_pair = ?')) {
              const targetId = params[params.length - 1];
              const a = tables.analyses.find(item => item.id === targetId);
              if (a) {
                a.trading_pair = params[0];
                a.market_type = params[1];
                a.timeframe = params[2];
                a.support_level = params[3];
                a.resistance_level = params[4];
                a.current_price = params[5];
                a.support_y_percent = params[6];
                a.resistance_y_percent = params[7];
                a.current_price_y_percent = params[8];
                a.chart_left_x_percent = params[9];
                a.chart_right_x_percent = params[10];
                a.entry_time_ist = params[11];
                a.expiry_time_ist = params[12];
                a.trade_recommendation = params[13];
                a.status = 'COMPLETED';
                a.consensus_decision = params[14];
                a.consensus_confidence = params[15];
                a.agreement_score = params[16];
                a.agreement_type = params[17];
                a.combined_conclusion = params[18];
                a.limitations_notes = params[19];
                saveStore();
              }
            }
            return { lastInsertRowid: 1, changes: 1 };
          }
          if (sql.includes('INSERT INTO evaluations')) {
            const id = autoIds.evaluations++;
            tables.evaluations.push({
              id,
              analysis_id: params[0],
              user_id: params[1],
              completed_screenshot: params[2],
              candle_color: params[3],
              original_decision: params[4],
              evaluation_result: params[5],
              evaluation_notes: params[6],
              evaluated_at: params[7]
            });
            saveStore();
            return { lastInsertRowid: id, changes: 1 };
          }
          if (sql.includes('INSERT INTO ai_results')) {
            const id = autoIds.ai_results++;
            tables.ai_results.push({
              id,
              analysis_id: params[0],
              provider: params[1],
              provider_label: params[2],
              decision: params[3],
              confidence: params[4],
              pair: params[5],
              market_type: params[6],
              timeframe: params[7],
              support_level: params[8],
              resistance_level: params[9],
              current_price: params[10],
              trend: params[11],
              candlestick_pattern: params[12],
              ema_observations: params[13],
              bb_observations: params[14],
              sr_observations: params[15],
              volume_observations: params[16],
              market_structure: params[17],
              scenarios: params[18],
              uncertainty: params[19],
              response_time_ms: params[20],
              status: params[21],
              error_message: params[22],
              raw_response: params[23]
            });
            saveStore();
            return { lastInsertRowid: id, changes: 1 };
          }
          if (sql.includes('DELETE FROM analyses')) {
            if (sql.includes('WHERE user_id = ?')) {
              tables.analyses = tables.analyses.filter(a => a.user_id !== params[0]);
            } else if (sql.includes('WHERE id = ?')) {
              tables.analyses = tables.analyses.filter(a => a.id !== params[0]);
            }
            saveStore();
            return { lastInsertRowid: 1, changes: 1 };
          }
          if (sql.includes('DELETE FROM evaluations')) {
            if (sql.includes('WHERE user_id = ?')) {
              tables.evaluations = tables.evaluations.filter(e => e.user_id !== params[0]);
            } else if (sql.includes('WHERE analysis_id = ?')) {
              tables.evaluations = tables.evaluations.filter(e => e.analysis_id !== params[0]);
            }
            saveStore();
            return { lastInsertRowid: 1, changes: 1 };
          }
          if (sql.includes('DELETE FROM ai_results')) {
            if (sql.includes('WHERE analysis_id = ?')) {
              tables.ai_results = tables.ai_results.filter(r => r.analysis_id !== params[0]);
            }
            saveStore();
            return { lastInsertRowid: 1, changes: 1 };
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
    try { db.exec("ALTER TABLE analyses ADD COLUMN support_y_percent REAL DEFAULT 72;"); } catch (e) {}
    try { db.exec("ALTER TABLE analyses ADD COLUMN resistance_y_percent REAL DEFAULT 28;"); } catch (e) {}
    try { db.exec("ALTER TABLE analyses ADD COLUMN current_price_y_percent REAL DEFAULT 50;"); } catch (e) {}
    try { db.exec("ALTER TABLE analyses ADD COLUMN chart_left_x_percent REAL DEFAULT 8.5;"); } catch (e) {}
    try { db.exec("ALTER TABLE analyses ADD COLUMN chart_right_x_percent REAL DEFAULT 84.0;"); } catch (e) {}

    try { db.exec("ALTER TABLE ai_results ADD COLUMN support_level TEXT DEFAULT '';"); } catch (e) {}
    try { db.exec("ALTER TABLE ai_results ADD COLUMN resistance_level TEXT DEFAULT '';"); } catch (e) {}
    try { db.exec("ALTER TABLE ai_results ADD COLUMN current_price TEXT DEFAULT '';"); } catch (e) {}
  } catch (err) {
    console.error('Schema initialization warning:', err.message);
  }
}

initSchema();

module.exports = db;
