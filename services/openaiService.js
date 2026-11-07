const fs = require('fs');
const { SYSTEM_CHART_PROMPT } = require('./prompts');
const { extractAndParseJson } = require('./parseHelper');

async function analyzeWithChatGPT(imagePath, mimeType = 'image/jpeg') {
  const startTime = Date.now();
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o';

  if (!apiKey || apiKey.trim() === '' || apiKey.startsWith('sk-placeholder')) {
    return {
      provider: 'chatgpt',
      provider_label: 'ChatGPT (OpenAI)',
      status: 'ERROR',
      is_mock: true,
      error_message: 'OPENAI_API_KEY not configured in .env',
      time_ms: Date.now() - startTime
    };
  }

  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const dataUri = `data:${mimeType};base64,${base64Image}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      signal: AbortSignal.timeout(4500),
      body: JSON.stringify({
        model: model,
        response_format: { type: 'json_object' },
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
                text: 'Please analyze this Quotex trading chart screenshot in detail for our educational trading simulator.'
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
        provider: 'chatgpt',
        provider_label: 'ChatGPT (OpenAI)',
        status: 'ERROR',
        error_message: `OpenAI API Error (${response.status}): ${errText}`,
        time_ms: elapsed
      };
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '{}';
    const parsed = extractAndParseJson(content);

    return {
      provider: 'chatgpt',
      provider_label: 'ChatGPT (OpenAI)',
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
      reasoning_summary: parsed.reasoning_summary || 'Analysis complete.',
      time_ms: elapsed,
      raw_response: content
    };
  } catch (err) {
    return {
      provider: 'chatgpt',
      provider_label: 'ChatGPT (OpenAI)',
      status: 'ERROR',
      error_message: err.message,
      time_ms: Date.now() - startTime
    };
  }
}

module.exports = {
  analyzeWithChatGPT
};

