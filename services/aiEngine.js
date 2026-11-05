const { analyzeWithChatGPT } = require('./openaiService');
const { analyzeWithGemini } = require('./geminiService');
const { analyzeWithGrok } = require('./grokService');
const db = require('../database/db');

// Realistic educational mock generator when live API keys are not yet configured in .env
function generateEducationalSimulation(provider, providerLabel, seedNum = 1) {
  const pairs = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'EUR/GBP (OTC)'];
  const isOtc = seedNum % 2 === 0;
  const pair = isOtc ? 'EUR/USD (OTC)' : 'EUR/USD';
  
  // Create deterministic-looking variation based on provider
  let decision = 'UP';
  let pattern = 'Bullish Engulfing pattern off dynamic support';
  let ema = 'EMA 7 (green) crossed above EMA 21 (red), upward slope';
  let bb = 'Price bounced off lower Bollinger Band moving towards middle band';
  let trend = 'Short-term bullish trend on 1M chart';
  let confidence = 78;

  if (seedNum % 3 === 1) {
    decision = 'UP';
    if (provider === 'gemini') {
      confidence = 82;
      pattern = 'Strong rejection wick at previous demand zone';
    } else if (provider === 'grok') {
      confidence = 75;
      pattern = 'Three white soldiers developing with moderate bullish volume';
    }
  } else if (seedNum % 3 === 2) {
    decision = 'DOWN';
    pattern = 'Bearish Pin Bar formed at local resistance';
    ema = 'EMA 7 descending below EMA 21, resistance holding';
    bb = 'Price rejected at upper Bollinger Band';
    trend = 'Short-term bearish continuation';
    confidence = 80;
    if (provider === 'gemini') confidence = 76;
    if (provider === 'grok') confidence = 79;
  } else {
    // Inconclusive scenario
    if (provider === 'chatgpt') {
      decision = 'UP';
      confidence = 62;
    } else if (provider === 'gemini') {
      decision = 'DOWN';
      confidence = 58;
    } else {
      decision = 'INCONCLUSIVE';
      confidence = 50;
      pattern = 'Doji inside narrow consolidation range';
    }
  }

  return {
    provider,
    provider_label: providerLabel,
    status: 'MOCK',
    decision,
    confidence,
    pair,
    market_type: isOtc ? 'OTC' : 'Live',
    timeframe: '1M',
    trend,
    candlestick_pattern: pattern,
    ema_observations: ema,
    bb_observations: bb,
    sr_observations: 'Horizontal support at 1.08450, resistance at 1.08620',
    volume_observations: 'Volume steady with slight increase on recent candle',
    market_structure: 'Higher lows maintaining ascending channel structure',
    scenarios: 'Bullish scenario favors continuation towards upper resistance; bearish scenario risks breakdown below EMA 21.',
    uncertainty: 'Simulated educational preview (configure live API key in .env for live AI inference)',
    reasoning_summary: `Educational simulated evaluation for ${providerLabel}. Observed ${pattern}.`,
    time_ms: 120 + Math.floor(Math.random() * 80),
    raw_response: JSON.stringify({ note: 'Simulated educational analysis' })
  };
}

async function runMultiAiAnalysis(analysisId, imagePath, mimeType = 'image/jpeg') {
  const analysisRecord = db.prepare('SELECT * FROM analyses WHERE id = ?').get(analysisId);
  if (!analysisRecord) {
    throw new Error(`Analysis record ${analysisId} not found.`);
  }

  // Update status to PROCESSING
  db.prepare('UPDATE analyses SET status = ? WHERE id = ?').run('PROCESSING', analysisId);

  const startTime = Date.now();

  // Run all 3 AI provider calls concurrently
  const [chatgptResult, geminiResult, grokResult] = await Promise.allSettled([
    analyzeWithChatGPT(imagePath, mimeType),
    analyzeWithGemini(imagePath, mimeType),
    analyzeWithGrok(imagePath, mimeType)
  ]);

  const allowMock = process.env.MOCK_AI_FALLBACK !== 'false';
  const seed = analysisId;

  // Process ChatGPT result
  let chatgpt = chatgptResult.status === 'fulfilled' ? chatgptResult.value : {
    provider: 'chatgpt',
    provider_label: 'ChatGPT (OpenAI)',
    status: 'ERROR',
    error_message: chatgptResult.reason?.message || 'OpenAI call failed',
    time_ms: Date.now() - startTime
  };

  if (chatgpt.is_mock && allowMock) {
    chatgpt = generateEducationalSimulation('chatgpt', 'ChatGPT (OpenAI)', seed);
  }

  // Process Gemini result
  let gemini = geminiResult.status === 'fulfilled' ? geminiResult.value : {
    provider: 'gemini',
    provider_label: 'Gemini (Google)',
    status: 'ERROR',
    error_message: geminiResult.reason?.message || 'Gemini call failed',
    time_ms: Date.now() - startTime
  };

  if (gemini.is_mock && allowMock) {
    gemini = generateEducationalSimulation('gemini', 'Gemini (Google)', seed);
  }

  // Process Grok result
  let grok = grokResult.status === 'fulfilled' ? grokResult.value : {
    provider: 'grok',
    provider_label: 'Grok (xAI)',
    status: 'ERROR',
    error_message: grokResult.reason?.message || 'Grok call failed',
    time_ms: Date.now() - startTime
  };

  if (grok.is_mock && allowMock) {
    grok = generateEducationalSimulation('grok', 'Grok (xAI)', seed);
  }

  const results = [chatgpt, gemini, grok];

  // Calculate agreement & consensus
  const validResults = results.filter(r => r.decision && ['UP', 'DOWN', 'INCONCLUSIVE'].includes(r.decision));
  
  const upCount = validResults.filter(r => r.decision === 'UP').length;
  const downCount = validResults.filter(r => r.decision === 'DOWN').length;
  const incCount = validResults.filter(r => r.decision === 'INCONCLUSIVE').length;

  let consensusDecision = 'INCONCLUSIVE';
  let agreementScore = '0/3';
  let agreementType = 'DISAGREEMENT';
  let consensusConfidence = 50;
  let combinedConclusion = 'Analysis resulted in inconclusive market conditions.';

  if (upCount === 3) {
    consensusDecision = 'UP';
    agreementScore = '3/3';
    agreementType = 'UNANIMOUS';
    consensusConfidence = Math.round(results.reduce((sum, r) => sum + (r.confidence || 75), 0) / 3);
    combinedConclusion = 'Unanimous agreement across ChatGPT, Gemini, and Grok pointing towards a possible BULLISH (UP) next 1-minute candle.';
  } else if (downCount === 3) {
    consensusDecision = 'DOWN';
    agreementScore = '3/3';
    agreementType = 'UNANIMOUS';
    consensusConfidence = Math.round(results.reduce((sum, r) => sum + (r.confidence || 75), 0) / 3);
    combinedConclusion = 'Unanimous agreement across ChatGPT, Gemini, and Grok pointing towards a possible BEARISH (DOWN) next 1-minute candle.';
  } else if (upCount === 2) {
    consensusDecision = 'UP';
    agreementScore = '2/3';
    agreementType = 'MAJORITY';
    const upModels = results.filter(r => r.decision === 'UP');
    consensusConfidence = Math.round((upModels.reduce((sum, r) => sum + (r.confidence || 75), 0) / 2) * 0.9);
    combinedConclusion = 'Majority agreement (2 of 3 models) suggesting a possible BULLISH (UP) scenario for the upcoming candle. Note model divergence.';
  } else if (downCount === 2) {
    consensusDecision = 'DOWN';
    agreementScore = '2/3';
    agreementType = 'MAJORITY';
    const downModels = results.filter(r => r.decision === 'DOWN');
    consensusConfidence = Math.round((downModels.reduce((sum, r) => sum + (r.confidence || 75), 0) / 2) * 0.9);
    combinedConclusion = 'Majority agreement (2 of 3 models) suggesting a possible BEARISH (DOWN) scenario for the upcoming candle. Note model divergence.';
  } else {
    consensusDecision = 'INCONCLUSIVE';
    agreementScore = 'Disagreement';
    agreementType = 'DISAGREEMENT';
    consensusConfidence = 50;
    combinedConclusion = 'AI models diverged or signals were conflicting across models. As per educational rules, marked as INCONCLUSIVE.';
  }

  // Best extracted pair, market_type, timeframe
  const detectedPair = results.find(r => r.pair && r.pair !== 'Unknown')?.pair || 'EUR/USD';
  const detectedMarketType = results.find(r => r.market_type && r.market_type !== 'Unknown')?.market_type || 'Unknown';
  const detectedTimeframe = results.find(r => r.timeframe && r.timeframe !== 'Unknown')?.timeframe || '1M';

  // Save AI results to database
  const insertAiResult = db.prepare(`
    INSERT INTO ai_results (
      analysis_id, provider, provider_label, decision, confidence, pair,
      market_type, timeframe, trend, candlestick_pattern, ema_observations,
      bb_observations, sr_observations, volume_observations, market_structure,
      scenarios, uncertainty, response_time_ms, status, error_message, raw_response
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?
    )
  `);

  const saveAiTransaction = db.transaction(() => {
    // Delete any old ai_results for this analysis_id if rerun
    db.prepare('DELETE FROM ai_results WHERE analysis_id = ?').run(analysisId);

    for (const r of results) {
      insertAiResult.run(
        analysisId,
        r.provider,
        r.provider_label,
        r.decision || 'INCONCLUSIVE',
        r.confidence || 50,
        r.pair || detectedPair,
        r.market_type || detectedMarketType,
        r.timeframe || detectedTimeframe,
        r.trend || 'N/A',
        r.candlestick_pattern || 'N/A',
        r.ema_observations || 'N/A',
        r.bb_observations || 'N/A',
        r.sr_observations || 'N/A',
        r.volume_observations || 'N/A',
        r.market_structure || 'N/A',
        r.scenarios || 'N/A',
        r.uncertainty || 'N/A',
        r.time_ms || 0,
        r.status || 'SUCCESS',
        r.error_message || null,
        r.raw_response || null
      );
    }

    // Update analysis master record
    db.prepare(`
      UPDATE analyses
      SET trading_pair = ?,
          market_type = ?,
          timeframe = ?,
          status = 'COMPLETED',
          consensus_decision = ?,
          consensus_confidence = ?,
          agreement_score = ?,
          agreement_type = ?,
          combined_conclusion = ?,
          limitations_notes = ?
      WHERE id = ?
    `).run(
      detectedPair,
      detectedMarketType,
      detectedTimeframe,
      consensusDecision,
      consensusConfidence,
      agreementScore,
      agreementType,
      combinedConclusion,
      'Educational paper-trading simulation. Real-money trading is not executed or advised.',
      analysisId
    );
  });

  saveAiTransaction();

  return {
    analysisId,
    trading_pair: detectedPair,
    market_type: detectedMarketType,
    timeframe: detectedTimeframe,
    consensus_decision: consensusDecision,
    consensus_confidence: consensusConfidence,
    agreement_score: agreementScore,
    agreement_type: agreementType,
    combined_conclusion: combinedConclusion,
    ai_results: results
  };
}

module.exports = {
  runMultiAiAnalysis
};
