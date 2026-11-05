const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database/db');
const { requireAuth } = require('../middleware/auth');
const { evaluateCandleOutcome, calculateHistoricalStats } = require('../services/evaluationService');

const router = express.Router();

const uploadDir = path.join(__dirname, '../uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `result-${req.user.id}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// POST /api/evaluation/submit - Submit outcome evaluation with optional completed candle screenshot
router.post('/submit', requireAuth, upload.single('completed_screenshot'), (req, res) => {
  const userId = req.user.id;
  const { analysis_id, candle_color } = req.body;

  if (!analysis_id || !candle_color) {
    return res.status(400).json({
      success: false,
      message: 'Analysis ID and candle color (GREEN, RED, DOJI, UNCLEAR) are required.'
    });
  }

  const analysisId = parseInt(analysis_id, 10);
  const validColors = ['GREEN', 'RED', 'DOJI', 'UNCLEAR'];
  const cleanColor = candle_color.trim().toUpperCase();

  if (!validColors.includes(cleanColor)) {
    return res.status(400).json({
      success: false,
      message: `Invalid candle color. Must be one of: ${validColors.join(', ')}`
    });
  }

  try {
    // 1. Verify analysis exists and belongs to user
    const analysis = db.prepare('SELECT * FROM analyses WHERE id = ? AND user_id = ?').get(analysisId, userId);
    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: 'Analysis not found or access denied.'
      });
    }

    // 2. Check if already evaluated
    const existingEval = db.prepare('SELECT id FROM evaluations WHERE analysis_id = ?').get(analysisId);
    if (existingEval) {
      return res.status(400).json({
        success: false,
        message: 'This analysis has already been evaluated.'
      });
    }

    // 3. Compute evaluation outcome based on educational rules
    const { evaluationResult, notes } = evaluateCandleOutcome(analysis.consensus_decision, cleanColor);
    const completedScreenshotFilename = req.file ? req.file.filename : null;
    const evaluatedAt = new Date().toISOString();

    // 4. Save evaluation record
    const insertStmt = db.prepare(`
      INSERT INTO evaluations (
        analysis_id, user_id, completed_screenshot, candle_color,
        original_decision, evaluation_result, evaluation_notes, evaluated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      analysisId,
      userId,
      completedScreenshotFilename,
      cleanColor,
      analysis.consensus_decision,
      evaluationResult,
      notes,
      evaluatedAt
    );

    const savedEval = db.prepare('SELECT * FROM evaluations WHERE id = ?').get(result.lastInsertRowid);

    return res.json({
      success: true,
      message: 'Completed candle evaluated successfully.',
      evaluation: savedEval
    });
  } catch (err) {
    console.error('Evaluation submit error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to record candle evaluation.'
    });
  }
});

// GET /api/evaluation/stats - User's personal statistical track record
router.get('/stats', requireAuth, (req, res) => {
  const userId = req.user.id;
  try {
    const stats = calculateHistoricalStats(userId);
    return res.json({
      success: true,
      stats
    });
  } catch (err) {
    console.error('Stats fetch error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate historical statistics.'
    });
  }
});

// GET /api/evaluation/global-stats - Platform educational statistics
router.get('/global-stats', (req, res) => {
  try {
    const stats = calculateHistoricalStats(null);
    return res.json({
      success: true,
      stats
    });
  } catch (err) {
    console.error('Global stats error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate global statistics.'
    });
  }
});

module.exports = router;
