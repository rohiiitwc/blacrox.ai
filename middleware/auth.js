const jwt = require('jsonwebtoken');
const db = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'blacrox_jwt_secure_random_key_production_grade';
const SESSION_EXPIRY = `${process.env.SESSION_EXPIRY_HOURS || 2}h`; // 2 hours = 120 minutes

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      full_name: user.full_name
    },
    JWT_SECRET,
    { expiresIn: SESSION_EXPIRY }
  );
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, full_name, email, created_at FROM users WHERE id = ?').get(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'User account not found.' });
    }

    req.user = user;
    req.tokenPayload = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        expired: true,
        message: 'Your session has expired. Please log in again.'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid session token. Please log in again.'
    });
  }
}

// In-memory rate limiting for login/auth endpoints
const rateLimitMap = new Map();
function rateLimiter(maxRequests = 10, windowMs = 60000) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const clientData = rateLimitMap.get(ip) || { count: 0, resetTime: now + windowMs };

    if (now > clientData.resetTime) {
      clientData.count = 1;
      clientData.resetTime = now + windowMs;
    } else {
      clientData.count += 1;
    }

    rateLimitMap.set(ip, clientData);

    if (clientData.count > maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please wait a minute and try again.'
      });
    }

    next();
  };
}

module.exports = {
  generateToken,
  requireAuth,
  rateLimiter,
  JWT_SECRET
};
