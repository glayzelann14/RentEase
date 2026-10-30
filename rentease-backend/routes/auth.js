
const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db');

const router = express.Router();

// ========================================
// MIDDLEWARE: CHECK ADMIN ACCESS
// ========================================
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      success: false,
      message: 'Please log in first.',
    });
  }

  if (req.session.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Administrator access required.',
    });
  }

  next();
}

// ========================================
// SIGN UP: REGISTER TENANT OR OWNER
// New accounts require admin approval.
// ========================================
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
      `SELECT user_id
       FROM app_users
       WHERE email = $1`,
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This email is already registered.',
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO app_users
        (full_name, email, password_hash, role, account_status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id, full_name, email, role, account_status`,
      [
        name.trim(),
        normalizedEmail,
        passwordHash,
        role,
        'pending',
      ]
    );

    return res.status(201).json({
      success: true,
      message:
        'Account created successfully. Please wait for admin approval before logging in.',
      user: result.rows[0],
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

// ========================================
// LOG IN: ACTIVE ACCOUNTS ONLY
// ========================================
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
      `SELECT
         user_id,
         full_name,
         email,
         password_hash,
         role,
         account_status
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

    const accountStatus = String(
      user.account_status || ''
    ).toLowerCase();

    if (accountStatus === 'pending') {
      return res.status(403).json({
        success: false,
        status: 'pending',
        message:
          'Your account is waiting for admin approval. Please try again after your account has been approved.',
      });
    }

    if (accountStatus === 'rejected') {
      return res.status(403).json({
        success: false,
        status: 'rejected',
        message:
          'Your account registration was rejected. Please contact the administrator for assistance.',
      });
    }

    if (accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        status: accountStatus || 'inactive',
        message:
          'Your account is not active. Please contact the administrator.',
      });
    }

    // Create a fresh session after successful authentication.
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

// ========================================
// GET CURRENT LOGGED-IN USER
// ========================================
router.get('/me', (req, res) => {
  if (!req.session || !req.session.user) {
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

// ========================================
// LOG OUT
// ========================================
router.post('/logout', (req, res) => {
  if (!req.session) {
    res.clearCookie('rentease.sid', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
    });

    return res.json({
      success: true,
      message: 'Logged out successfully.',
    });
  }

  req.session.destroy((error) => {
    if (error) {
      console.error('Logout failed:', error.message);

      return res.status(500).json({
        success: false,
        message: 'Failed to log out.',
      });
    }

    res.clearCookie('rentease.sid', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
    });

    return res.json({
      success: true,
      message: 'Logged out successfully.',
    });
  });
});

// ========================================
// ADMIN: GET REGISTERED TENANTS AND OWNERS
// ========================================
router.get('/admin/users', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         user_id,
         full_name,
         email,
         role,
         account_status
       FROM app_users
       WHERE role IN ('tenant', 'owner')
       ORDER BY user_id DESC`
    );

    return res.json({
      success: true,
      users: result.rows,
    });
  } catch (error) {
    console.error('Loading admin users failed:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to load registered users.',
    });
  }
});

// ========================================
// ADMIN: APPROVE ACCOUNT
// Sets account_status to active.
// ========================================
router.patch(
  '/admin/users/:id/approve',
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!/^\d+$/.test(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid user ID.',
        });
      }

      const result = await pool.query(
        `UPDATE app_users
         SET account_status = 'active'
         WHERE user_id = $1
           AND role IN ('tenant', 'owner')
         RETURNING
           user_id,
           full_name,
           email,
           role,
           account_status`,
        [Number(id)]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found.',
        });
      }

      return res.json({
        success: true,
        message: 'Account approved successfully.',
        user: result.rows[0],
      });
    } catch (error) {
      console.error('Approving user failed:', error.message);

      return res.status(500).json({
        success: false,
        message: 'Unable to approve this account.',
      });
    }
  }
);

// ========================================
// ADMIN: REJECT ACCOUNT
// Sets account_status to rejected.
// ========================================
router.patch(
  '/admin/users/:id/reject',
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!/^\d+$/.test(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid user ID.',
        });
      }

      const result = await pool.query(
        `UPDATE app_users
         SET account_status = 'rejected'
         WHERE user_id = $1
           AND role IN ('tenant', 'owner')
         RETURNING
           user_id,
           full_name,
           email,
           role,
           account_status`,
        [Number(id)]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found.',
        });
      }

      return res.json({
        success: true,
        message: 'Account rejected successfully.',
        user: result.rows[0],
      });
    } catch (error) {
      console.error('Rejecting user failed:', error.message);

      return res.status(500).json({
        success: false,
        message: 'Unable to reject this account.',
      });
    }
  }
);

module.exports = router;
