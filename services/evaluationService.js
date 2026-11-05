const db = require('../database/db');

function evaluateCandleOutcome(originalDecision, candleColor) {
  const normDecision = (originalDecision || '').trim().toUpperCase();
  const normColor = (candleColor || '').trim().toUpperCase();

  if (normColor === 'DOJI') {
    return {
      evaluationResult: 'REFUND',
      notes: 'Candle closed as a Doji (neutral). Simulated REFUND executed. Neither correct nor incorrect.'
    };
  }

  if (normColor === 'UNCLEAR') {
    return {
      evaluationResult: 'UNRESOLVED',
      notes: 'Candle outcome could not be reliably determined from screenshot. Marked as UNRESOLVED.'
    };
  }

  if (normDecision === 'UP') {
    if (normColor === 'GREEN') {
      return {
        evaluationResult: 'CORRECT',
        notes: 'Original scenario was UP and completed candle was GREEN (Bullish). Prediction verified.'
      };
    } else if (normColor === 'RED') {
      return {
        evaluationResult: 'INCORRECT',
        notes: 'Original scenario was UP but completed candle was RED (Bearish). Prediction failed.'
      };
    }
  } else if (normDecision === 'DOWN') {
    if (normColor === 'RED') {
      return {
        evaluationResult: 'CORRECT',
        notes: 'Original scenario was DOWN and completed candle was RED (Bearish). Prediction verified.'
      };
    } else if (normColor === 'GREEN') {
      return {
        evaluationResult: 'INCORRECT',
        notes: 'Original scenario was DOWN but completed candle was GREEN (Bullish). Prediction failed.'
      };
    }
  } else {
    // Original scenario was INCONCLUSIVE
    return {
      evaluationResult: 'UNRESOLVED',
      notes: 'Original analysis was INCONCLUSIVE. No directional trade simulated.'
    };
  }

  return {
    evaluationResult: 'UNRESOLVED',
    notes: 'Incomplete or unverified evaluation parameters.'
  };
}

function calculateHistoricalStats(userId = null) {
  let query = `
    SELECT 
      e.id, e.candle_color, e.original_decision, e.evaluation_result, e.evaluated_at,
      a.trading_pair, a.market_type, a.timeframe, a.agreement_score, a.agreement_type,
      a.consensus_confidence
    FROM evaluations e
    JOIN analyses a ON e.analysis_id = a.id
  `;
  const params = [];

  if (userId) {
    query += ' WHERE e.user_id = ?';
    params.push(userId);
  }

  query += ' ORDER BY e.id DESC';

  const rows = db.prepare(query).all(...params);

  function computeMetrics(dataset) {
    const total = dataset.length;
    const correct = dataset.filter(r => r.evaluation_result === 'CORRECT').length;
    const incorrect = dataset.filter(r => r.evaluation_result === 'INCORRECT').length;
    const refund = dataset.filter(r => r.evaluation_result === 'REFUND').length;
    const unresolved = dataset.filter(r => r.evaluation_result === 'UNRESOLVED').length;

    const decisiveTotal = correct + incorrect;
    const winRate = decisiveTotal > 0 ? Number(((correct / decisiveTotal) * 100).toFixed(1)) : 0;
    const isVerified = decisiveTotal >= 20;

    return {
      total,
      correct,
      incorrect,
      refund,
      unresolved,
      decisiveTotal,
      winRate,
      isVerified,
      verificationNote: isVerified
        ? 'Verified with statistically meaningful sample size.'
        : 'Accuracy is unverified — insufficient sample data (< 20 resolved evaluations).'
    };
  }

  const overall = computeMetrics(rows);

  const otcRows = rows.filter(r => (r.market_type || '').toUpperCase().includes('OTC') || (r.trading_pair || '').toUpperCase().includes('OTC'));
  const liveRows = rows.filter(r => !otcRows.includes(r));

  const otc = computeMetrics(otcRows);
  const live = computeMetrics(liveRows);

  const unanimousRows = rows.filter(r => r.agreement_type === 'UNANIMOUS' || r.agreement_score === '3/3');
  const unanimous = computeMetrics(unanimousRows);

  return {
    overall,
    otc,
    live,
    unanimous,
    recentEvaluations: rows.slice(0, 10)
  };
}

module.exports = {
  evaluateCandleOutcome,
  calculateHistoricalStats
};

