
const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db');

const router = express.Router();

// Register a new tenant or property owner
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please complete all required fields.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
      });
    }

    if (!['tenant', 'owner'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid account role.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await pool.query(
      'SELECT user_id FROM app_users WHERE email = $1',
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This email is already registered.',
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await pool.query(
      `INSERT INTO app_users
        (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)`,
      [name.trim(), normalizedEmail, passwordHash, role]
    );

    return res.status(201).json({
      success: true,
      message: 'Account created successfully. You can now log in.',
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'This email is already registered.',
      });
    }

    console.error('Signup failed:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to create your account right now.',
    });
  }
});

// Log in an existing user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your email and password.',
      });
    }

    const result = await pool.query(
      `SELECT user_id, full_name, email, password_hash, role, account_status
       FROM app_users
       WHERE email = $1`,
      [email.trim().toLowerCase()]
    );

    const user = result.rows[0];

    if (
      !user ||
      !(await bcrypt.compare(password, user.password_hash))
    ) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    if (user.account_status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'This account is not active.',
      });
    }

    req.session.regenerate((error) => {
      if (error) {
        console.error('Session creation failed:', error.message);

        return res.status(500).json({
          success: false,
          message: 'Unable to start your session.',
        });
      }

      req.session.user = {
        id: user.user_id,
        name: user.full_name,
        email: user.email,
        role: user.role,
      };

      req.session.save((saveError) => {
        if (saveError) {
          console.error('Session save failed:', saveError.message);

          return res.status(500).json({
            success: false,
            message: 'Unable to save your session.',
          });
        }

        console.log('Login session saved:', {
          sessionID: req.sessionID,
          user: req.session.user,
        });

        return res.json({
          success: true,
          message: 'Login successful.',
          user: req.session.user,
        });
      });
    });
  } catch (error) {
    console.error('Login failed:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to log in right now.',
    });
  }
});

// Check the current logged-in user
router.get('/me', (req, res) => {
  console.log('Checking session:', {
    sessionID: req.sessionID,
    user: req.session?.user,
  });

  if (!req.session?.user) {
    return res.status(401).json({
      success: false,
      message: 'You are not logged in.',
    });
  }

  return res.json({
    success: true,
    user: req.session.user,
  });
});

// Log out the current user
router.post('/logout', (req, res, next) => {
  if (!req.session) {
    return res.json({
      success: true,
      message: 'Logged out successfully.',
    });
  }

  req.session.destroy((error) => {
    if (error) {
      return next(error);
    }

    res.clearCookie('rentease.sid', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    });

    return res.json({
      success: true,
      message: 'Logged out successfully.',
    });
  });
});

module.exports = router;
