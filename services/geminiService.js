const fs = require('fs');
const { SYSTEM_CHART_PROMPT } = require('./prompts');
const { extractAndParseJson } = require('./parseHelper');

async function analyzeWithGemini(imagePath, mimeType = 'image/jpeg') {
  const startTime = Date.now();
  const apiKey = process.env.GEMINI_API_KEY;
  const primaryModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const candidateModels = [primaryModel, 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];

  if (!apiKey || apiKey.trim() === '' || apiKey.startsWith('AIzaSy-placeholder')) {
    return {
      provider: 'gemini',
      provider_label: 'Gemini (Google)',
      is_mock: true,
      error: 'GEMINI_API_KEY not configured in .env',
      time_ms: Date.now() - startTime
    };
  }

  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    let response = null;
    let selectedModel = primaryModel;
    let lastErrText = '';

    for (const m of candidateModels) {
      selectedModel = m;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `${SYSTEM_CHART_PROMPT}\n\nPlease inspect this Quotex trading chart screenshot carefully. Identify the exact trading pair shown in the top-left tab or right panel (e.g. GBP/NZD (OTC)), extract the exact Support price level number, Resistance price level number, Current price, and evaluate the upcoming 1-minute candle direction based on Support and Resistance reaction and momentum.`
                  },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64Image
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              response_mime_type: 'application/json',
              temperature: 0.2
            }
          })
        });

        if (response.ok) break;
        lastErrText = await response.text();
      } catch (e) {
        lastErrText = e.message;
      }
    }

    const elapsed = Date.now() - startTime;

    if (!response || !response.ok) {
      return {
        provider: 'gemini',
        provider_label: 'Gemini (Google)',
        status: 'ERROR',
        error_message: `Gemini API Error (${selectedModel}): ${lastErrText}`,
        time_ms: elapsed
      };
    }

    const data = await response.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const parsed = extractAndParseJson(candidate);

    return {
      provider: 'gemini',
      provider_label: 'Gemini (Google)',
      status: 'SUCCESS',
      decision: ['UP', 'DOWN', 'INCONCLUSIVE'].includes(parsed.decision) ? parsed.decision : 'INCONCLUSIVE',
      confidence: typeof parsed.confidence === 'number' ? Math.min(Math.max(parsed.confidence, 0), 100) : 70,
      pair: parsed.pair || 'Unknown',
      market_type: parsed.market_type || 'Unknown',
      timeframe: parsed.timeframe || '1M',
      visible_time: parsed.visible_time || '',
      support_level: parsed.support_level || '',
      resistance_level: parsed.resistance_level || '',
      current_price: parsed.current_price || '',
      chart_high_price: parsed.chart_high_price || '',
      chart_low_price: parsed.chart_low_price || '',
      support_y_percent: parsed.support_y_percent !== undefined && parsed.support_y_percent !== null ? Number(parsed.support_y_percent) : null,
      resistance_y_percent: parsed.resistance_y_percent !== undefined && parsed.resistance_y_percent !== null ? Number(parsed.resistance_y_percent) : null,
      current_price_y_percent: parsed.current_price_y_percent !== undefined && parsed.current_price_y_percent !== null ? Number(parsed.current_price_y_percent) : null,
      trend: parsed.trend || 'Trend not clear',
      candlestick_pattern: parsed.candlestick_pattern || 'Not specified',
      ema_observations: parsed.ema_observations || 'Not visible on chart',
      bb_observations: parsed.bb_observations || 'Not visible on chart',
      sr_observations: parsed.sr_observations || 'No clear S/R lines',
      volume_observations: parsed.volume_observations || 'Volume not displayed',
      market_structure: parsed.market_structure || 'Sideways / Consolidation',
      scenarios: parsed.scenarios || 'Both bullish and bearish paths viable',
      uncertainty: parsed.uncertainty || 'Normal chart noise',
      reasoning_summary: parsed.reasoning_summary || 'Gemini chart analysis complete.',
      time_ms: elapsed,
      raw_response: candidate
    };
  } catch (err) {
    return {
      provider: 'gemini',
      provider_label: 'Gemini (Google)',
      status: 'ERROR',
      error_message: err.message,
      time_ms: Date.now() - startTime
    };
  }
}

module.exports = {
  analyzeWithGemini
};

