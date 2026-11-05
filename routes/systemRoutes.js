const express = require('express');
const router = express.Router();

router.get('/status', (req, res) => {
  const hasOpenAiKey = !!process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('sk-placeholder');
  const hasGeminiKey = !!process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith('AIzaSy-placeholder');
  const hasGrokKey = !!process.env.GROK_API_KEY && !process.env.GROK_API_KEY.startsWith('xai-placeholder');

  res.json({
    success: true,
    platform: 'Blacrox.AI - Educational Trading Chart Analysis',
    serverTime: new Date().toISOString(),
    serverTimestampMs: Date.now(),
    uptimeSeconds: Math.floor(process.uptime()),
    providers: {
      chatgpt: {
        provider: 'OpenAI ChatGPT',
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        isConfigured: hasOpenAiKey,
        mode: hasOpenAiKey ? 'LIVE' : 'EDUCATIONAL_SIMULATION'
      },
      gemini: {
        provider: 'Google Gemini',
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        isConfigured: hasGeminiKey,
        mode: hasGeminiKey ? 'LIVE' : 'EDUCATIONAL_SIMULATION'
      },
      grok: {
        provider: 'xAI Grok',
        model: process.env.GROK_MODEL || 'grok-2-vision-1212',
        isConfigured: hasGrokKey,
        mode: hasGrokKey ? 'LIVE' : 'EDUCATIONAL_SIMULATION'
      }
    },
    educationalNotice: 'Educational paper-trading simulator. No real money trades or guaranteed financial returns.'
  });
});

router.get('/time', (req, res) => {
  const now = new Date();
  res.json({
    iso: now.toISOString(),
    timestamp: now.getTime(),
    formattedUtc: now.toUTCString()
  });
});

module.exports = router;

