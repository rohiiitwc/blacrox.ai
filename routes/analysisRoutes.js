const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database/db');
const { requireAuth } = require('../middleware/auth');
const { runMultiAiAnalysis } = require('../services/aiEngine');

const router = express.Router();

// Configure multer for secure screenshot uploads
const isVercel = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT
);

let uploadDir = isVercel ? '/tmp/uploads' : path.join(__dirname, '../uploads');
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (e) {
  uploadDir = '/tmp';
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const userId = (req.user && req.user.id) ? req.user.id : 'anon';
    cb(null, `chart-${userId}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/pjpeg', 'image/x-png'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(file.mimetype) || ['.png', '.jpg', '.jpeg'].includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file format. Please upload a PNG, JPG, or JPEG image.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// POST /api/analysis/upload - Upload Quotex screenshot & start concurrent multi-AI analysis
router.post('/upload', requireAuth, (req, res, next) => {
  upload.single('screenshot')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Screenshot upload validation error.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No screenshot file provided. Please upload a Quotex chart image.'
      });
    }

    const userId = req.user.id;
    const now = new Date();
    const uploadTimestamp = now.toISOString();
    const serverTime = now.getTime();

    try {
      // 1. Create initial analysis record
      const insertStmt = db.prepare(`
        INSERT INTO analyses (
          user_id, initial_screenshot, initial_screenshot_orig_name,
          upload_timestamp, server_time, status
        ) VALUES (?, ?, ?, ?, ?, 'PROCESSING')
      `);

      const result = insertStmt.run(
        userId,
        req.file.filename,
        req.file.originalname,
        uploadTimestamp,
        serverTime
      );

      const analysisId = result.lastInsertRowid;

      // 2. Execute multi-AI analysis concurrently
      const analysisResult = await runMultiAiAnalysis(
        analysisId,
        req.file.path,
        req.file.mimetype,
        req.body.pair || req.body.pair_hint || ''
      );

      // 3. Return full analysis package
      const fullAnalysis = db.prepare(`
        SELECT * FROM analyses WHERE id = ? AND user_id = ?
      `).get(analysisId, userId);

      fullAnalysis.all_in_one_win_rate = analysisResult.all_in_one_win_rate || fullAnalysis.consensus_confidence;
      fullAnalysis.all_in_one_signal = analysisResult.all_in_one_signal || (fullAnalysis.consensus_decision === 'UP' ? 'CALL (UP)' : 'PUT (DOWN)');
      fullAnalysis.trade_recommendation = analysisResult.trade_recommendation || fullAnalysis.trade_recommendation || 'TRADE';
      fullAnalysis.trade_warning = analysisResult.trade_warning || '';
      fullAnalysis.is_low_win_rate = analysisResult.is_low_win_rate !== undefined ? analysisResult.is_low_win_rate : (Number(fullAnalysis.all_in_one_win_rate) < 80);
      fullAnalysis.entry_time_ist = analysisResult.entry_time_ist || fullAnalysis.entry_time_ist || '';
      fullAnalysis.expiry_time_ist = analysisResult.expiry_time_ist || fullAnalysis.expiry_time_ist || '';

      const aiResults = db.prepare(`
        SELECT * FROM ai_results WHERE analysis_id = ?
      `).all(analysisId).map(r => ({
        ...r,
        win_rate: r.confidence
      }));

      return res.json({
        success: true,
        message: 'Chart analysis completed successfully.',
        analysis: fullAnalysis,
        ai_results: aiResults,
        serverTime: Date.now()
      });
    } catch (analysisErr) {
      console.error('Analysis error:', analysisErr);
      return res.status(500).json({
        success: false,
        message: `Analysis error: ${analysisErr.message}`
      });
    }
  });
});

// GET /api/analysis/history - User's isolated analysis history
router.get('/history', requireAuth, (req, res) => {
  const userId = req.user.id;
  try {
    const rows = db.prepare(`
      SELECT 
        a.id, a.trading_pair, a.market_type, a.timeframe, a.support_level, a.resistance_level, a.current_price,
        a.entry_time_ist, a.expiry_time_ist, a.trade_recommendation, a.upload_timestamp,
        a.status, a.consensus_decision, a.consensus_confidence, a.agreement_score,
        a.agreement_type, a.combined_conclusion, a.initial_screenshot,
        e.id as evaluation_id, e.candle_color, e.evaluation_result, e.evaluated_at
      FROM analyses a
      LEFT JOIN evaluations e ON a.id = e.analysis_id
      WHERE a.user_id = ?
      ORDER BY a.id DESC
    `).all(userId);

    return res.json({
      success: true,
      history: rows
    });
  } catch (err) {
    console.error('History fetch error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve analysis history.'
    });
  }
});

// GET /api/analysis/:id - Detail of a single analysis
router.get('/:id', requireAuth, (req, res) => {
  const userId = req.user.id;
  const analysisId = parseInt(req.params.id, 10);

  try {
    const analysis = db.prepare(`
      SELECT * FROM analyses WHERE id = ? AND user_id = ?
    `).get(analysisId, userId);

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: 'Analysis record not found.'
      });
    }

    analysis.all_in_one_win_rate = analysis.consensus_confidence;
    analysis.all_in_one_signal = analysis.consensus_decision === 'UP' ? 'CALL (UP)' : 'PUT (DOWN)';

    const aiResults = db.prepare(`
      SELECT * FROM ai_results WHERE analysis_id = ?
    `).all(analysisId).map(r => ({
      ...r,
      win_rate: r.confidence
    }));

    const evaluation = db.prepare(`
      SELECT * FROM evaluations WHERE analysis_id = ?
    `).get(analysisId);

    return res.json({
      success: true,
      analysis,
      ai_results: aiResults,
      evaluation: evaluation || null
    });
  } catch (err) {
    console.error('Get analysis error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to load analysis details.'
    });
  }
});

// DELETE /api/analysis/history - Clear all analysis history for user
router.delete('/history', requireAuth, (req, res) => {
  const userId = req.user.id;
  try {
    const userAnalyses = db.prepare('SELECT id, initial_screenshot FROM analyses WHERE user_id = ?').all(userId);
    
    for (const a of userAnalyses) {
      if (a.initial_screenshot) {
        const filePath = path.join(uploadDir, a.initial_screenshot);
        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch (e) {}
        }
      }
    }

    db.prepare('DELETE FROM evaluations WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM analyses WHERE user_id = ?').run(userId);

    return res.json({
      success: true,
      message: 'Analysis history deleted successfully.'
    });
  } catch (err) {
    console.error('Clear history error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to clear analysis history.'
    });
  }
});

// DELETE /api/analysis/:id - Delete a single analysis record
router.delete('/:id', requireAuth, (req, res) => {
  const userId = req.user.id;
  const analysisId = parseInt(req.params.id, 10);

  try {
    const analysis = db.prepare('SELECT * FROM analyses WHERE id = ? AND user_id = ?').get(analysisId, userId);
    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: 'Analysis record not found.'
      });
    }

    if (analysis.initial_screenshot) {
      const filePath = path.join(uploadDir, analysis.initial_screenshot);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
    }

    db.prepare('DELETE FROM evaluations WHERE analysis_id = ?').run(analysisId);
    db.prepare('DELETE FROM ai_results WHERE analysis_id = ?').run(analysisId);
    db.prepare('DELETE FROM analyses WHERE id = ? AND user_id = ?').run(analysisId, userId);

    return res.json({
      success: true,
      message: 'Analysis record deleted successfully.'
    });
  } catch (err) {
    console.error('Delete analysis error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete analysis record.'
    });
  }
});

module.exports = router;
