require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const authRoutes = require('./routes/authRoutes');
const analysisRoutes = require('./routes/analysisRoutes');
const evaluationRoutes = require('./routes/evaluationRoutes');
const systemRoutes = require('./routes/systemRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Security & Parsing Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Static file serving & Cloud-Safe Uploads
const isVercel = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT
);

const uploadDir = isVercel ? '/tmp/uploads' : path.join(__dirname, 'uploads');
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (e) {}

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadDir));

// API Routes
app.get('/api', (req, res) => {
  res.json({
    status: 'online',
    platform: 'Blacrox.AI API',
    version: '1.0.0',
    mode: isVercel ? 'serverless' : 'node'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    uptime: Math.floor(process.uptime())
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/evaluation', evaluationRoutes);
app.use('/api/system', systemRoutes);

// SPA fallback for non-API GET routes (compatible with Express 5)
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/') && !req.path.startsWith('/uploads/')) {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
  }
  next();
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'An unexpected internal server error occurred.'
  });
});

function startServer(port = PORT) {
  const server = app.listen(port, () => {
    console.log(`=======================================================`);
    console.log(`🚀 BLACROX.AI Trading Chart Analysis Server Running`);
    console.log(`📡 URL: http://localhost:${port}`);
    console.log(`⏱️ Session Expiration: 120 minutes (2 hours)`);
    console.log(`🤖 AI Providers: ChatGPT (OpenAI), Gemini (Google), Grok (xAI)`);
    console.log(`📊 Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`=======================================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${port} is already in use. Set PORT in your .env or close the running instance.`);
    } else {
      console.error('❌ Server startup error:', err);
    }
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = app;
module.exports.startServer = startServer;
