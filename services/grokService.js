const fs = require('fs');
const { SYSTEM_CHART_PROMPT } = require('./prompts');
const { extractAndParseJson } = require('./parseHelper');

async function analyzeWithGrok(imagePath, mimeType = 'image/jpeg') {
  const startTime = Date.now();
  const apiKey = process.env.GROK_API_KEY;
  const model = process.env.GROK_MODEL || 'grok-2-vision-1212';

  if (!apiKey || apiKey.trim() === '' || apiKey.startsWith('xai-placeholder')) {
    return {
      provider: 'grok',
      provider_label: 'Grok (xAI)',
      is_mock: true,
      error: 'GROK_API_KEY not configured in .env',
      time_ms: Date.now() - startTime
    };
  }

  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const dataUri = `data:${mimeType};base64,${base64Image}`;

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      signal: AbortSignal.timeout(4500),
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: SYSTEM_CHART_PROMPT
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please analyze this Quotex trading chart screenshot in detail for our educational trading simulator. Return only JSON.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: dataUri,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        temperature: 0.2,
        max_tokens: 1000
      })
    });

    const elapsed = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text();
      return {
        provider: 'grok',
        provider_label: 'Grok (xAI)',
        status: 'ERROR',
        error_message: `xAI API Error (${response.status}): ${errText}`,
        time_ms: elapsed
      };
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '{}';
    const parsed = extractAndParseJson(content);

    return {
      provider: 'grok',
      provider_label: 'Grok (xAI)',
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
      chart_left_x_percent: parsed.chart_left_x_percent !== undefined && parsed.chart_left_x_percent !== null ? Number(parsed.chart_left_x_percent) : null,
      chart_right_x_percent: parsed.chart_right_x_percent !== undefined && parsed.chart_right_x_percent !== null ? Number(parsed.chart_right_x_percent) : null,
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
      reasoning_summary: parsed.reasoning_summary || 'Grok chart analysis complete.',
      time_ms: elapsed,
      raw_response: content
    };
  } catch (err) {
    return {
      provider: 'grok',
      provider_label: 'Grok (xAI)',
      status: 'ERROR',
      error_message: err.message,
      time_ms: Date.now() - startTime
    };
  }
}

module.exports = {
  analyzeWithGrok
};

