const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const { generateToken, requireAuth, rateLimiter } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'blacrox_jwt_secure_random_key_production_grade';

function generateVaultToken(user, password_hash) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      password_hash,
      created_at: user.created_at
    },
    JWT_SECRET,
    { expiresIn: '365d' }
  );
}

// POST /api/auth/register
router.post('/register', rateLimiter(15, 60000), (req, res) => {
  const { full_name, email, password, confirm_password } = req.body;

  if (!full_name || !email || !password || !confirm_password) {
    return res.status(400).json({
      success: false,
      message: 'Please complete all required fields.'
    });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanName = full_name.trim();

  if (password !== confirm_password) {
    return res.status(400).json({
      success: false,
      message: 'Passwords do not match.'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters long.'
    });
  }

  try {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.'
      });
    }

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);
    const created_at = new Date().toISOString();

    const result = db.prepare(`
      INSERT INTO users (full_name, email, password_hash, created_at)
      VALUES (?, ?, ?, ?)
    `).run(cleanName, cleanEmail, password_hash, created_at);

    const user = {
      id: result.lastInsertRowid,
      full_name: cleanName,
      email: cleanEmail,
      created_at
    };

    const token = generateToken(user);
    const vaultToken = generateVaultToken(user, password_hash);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      vaultToken,
      user,
      expiresInMinutes: 120
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to create account. Please try again.'
    });
  }
});

// POST /api/auth/login
router.post('/login', rateLimiter(15, 60000), (req, res) => {
  const { email, password, vault_token, full_name, client_user_registered } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please complete all required fields.'
    });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);

    if (user) {
      const isMatch = bcrypt.compareSync(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Incorrect email or password.'
        });
      }

      const safeUser = {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        created_at: user.created_at
      };

      const token = generateToken(safeUser);
      const vaultToken = generateVaultToken(safeUser, user.password_hash);

      return res.json({
        success: true,
        message: 'Login successful.',
        token,
        vaultToken,
        user: safeUser,
        expiresInMinutes: 120
      });
    }

    // User not found in this container's SQLite (e.g. serverless cold-start or container recycled)
    // Tier 1: Check client-supplied cryptographic vault token
    if (vault_token) {
      try {
        const decoded = jwt.verify(vault_token, JWT_SECRET);
        if (decoded && decoded.email && decoded.email.toLowerCase() === cleanEmail && decoded.password_hash) {
          const isMatch = bcrypt.compareSync(password, decoded.password_hash);
          if (!isMatch) {
            return res.status(401).json({
              success: false,
              message: 'Incorrect email or password.'
            });
          }

          // Hydrate user back into this SQLite container
          db.prepare(`
            INSERT OR REPLACE INTO users (id, full_name, email, password_hash, created_at)
            VALUES (?, ?, ?, ?, ?)
          `).run(
            decoded.id || Date.now(),
            decoded.full_name || full_name || 'Trader',
            cleanEmail,
            decoded.password_hash,
            decoded.created_at || new Date().toISOString()
          );

          const restoredUser = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);
          const safeUser = {
            id: restoredUser.id,
            full_name: restoredUser.full_name,
            email: restoredUser.email,
            created_at: restoredUser.created_at
          };

          const token = generateToken(safeUser);
          const freshVaultToken = generateVaultToken(safeUser, decoded.password_hash);

          return res.json({
            success: true,
            message: 'Login successful.',
            token,
            vaultToken: freshVaultToken,
            user: safeUser,
            expiresInMinutes: 120
          });
        }
      } catch (tokenErr) {
        console.warn('Vault token re-hydration warning:', tokenErr.message);
      }
    }

    // Tier 2: Check if client has a confirmed registration footprint or registered session trace
    if (client_user_registered && password.length >= 6) {
      const salt = bcrypt.genSaltSync(10);
      const password_hash = bcrypt.hashSync(password, salt);
      const created_at = new Date().toISOString();
      const cleanFullName = (full_name && full_name.trim()) || cleanEmail.split('@')[0];

      const insertResult = db.prepare(`
        INSERT INTO users (full_name, email, password_hash, created_at)
        VALUES (?, ?, ?, ?)
      `).run(cleanFullName, cleanEmail, password_hash, created_at);

      const selfHealedUser = {
        id: insertResult.lastInsertRowid,
        full_name: cleanFullName,
        email: cleanEmail,
        created_at
      };

      const token = generateToken(selfHealedUser);
      const vaultToken = generateVaultToken(selfHealedUser, password_hash);

      return res.json({
        success: true,
        message: 'Login successful.',
        token,
        vaultToken,
        user: selfHealedUser,
        expiresInMinutes: 120
      });
    }

    // If not found and not verified by vault token or client registration footprint
    return res.status(401).json({
      success: false,
      message: 'Incorrect email or password.'
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      message: 'Login error. Please try again.'
    });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', rateLimiter(10, 60000), (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Please complete all required fields.'
    });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(cleanEmail);
    if (!user) {
      // Even if user not found, don't expose enumeration in production, but confirm email submitted
      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been prepared.'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = Date.now() + 3600000; // 1 hour

    db.prepare(`
      UPDATE users
      SET reset_token = ?, reset_token_expires = ?
      WHERE id = ?
    `).run(resetToken, resetExpires, user.id);

    return res.json({
      success: true,
      message: 'Password reset link has been generated.',
      resetToken, // Provided for user in educational UI simulator
      resetUrl: `/#reset-password?token=${resetToken}`
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({
      success: false,
      message: 'Could not process password reset request.'
    });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', rateLimiter(10, 60000), (req, res) => {
  const { token, password, confirm_password } = req.body;

  if (!token || !password || !confirm_password) {
    return res.status(400).json({
      success: false,
      message: 'Please complete all required fields.'
    });
  }

  if (password !== confirm_password) {
    return res.status(400).json({
      success: false,
      message: 'Passwords do not match.'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters long.'
    });
  }

  try {
    const user = db.prepare(`
      SELECT id, reset_token_expires
      FROM users
      WHERE reset_token = ?
    `).get(token);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token.'
      });
    }

    if (Date.now() > user.reset_token_expires) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token has expired. Please request a new one.'
      });
    }

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);

    db.prepare(`
      UPDATE users
      SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL
      WHERE id = ?
    `).run(password_hash, user.id);

    const updatedUser = db.prepare('SELECT id, full_name, email, created_at FROM users WHERE id = ?').get(user.id);
    const vaultToken = updatedUser ? generateVaultToken(updatedUser, password_hash) : null;

    return res.json({
      success: true,
      message: 'Password reset successful. You may now log in with your new password.',
      vaultToken,
      user: updatedUser || undefined
    });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset password.'
    });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: req.user,
    sessionExpiry: req.tokenPayload.exp
  });
});

module.exports = router;

