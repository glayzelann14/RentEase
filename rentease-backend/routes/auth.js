
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


// Authenticated profile: full name and mobile are editable; email and role are not.
router.get('/profile', async (req, res) => {
  const id = req.session?.user?.id;
  if (!validProfileId(id)) return res.status(401).json({success:false,message:'Please sign in.'});
  try {
    const {rows} = await pool.query(`SELECT u.user_id, u.full_name, u.email, u.role, u.account_status,
      COALESCE(p.mobile, '') AS mobile, (p.avatar_data IS NOT NULL) AS has_avatar, p.avatar_updated_at
      FROM app_users u LEFT JOIN user_profile_contacts p ON p.user_id=u.user_id
      WHERE u.user_id=$1`, [id]);
    const user=rows[0];
    if (!user || user.account_status !== 'active' || user.role !== req.session.user.role)
      return res.status(403).json({success:false,message:'Account is not active.'});
    return res.json({success:true,profile:{name:user.full_name,email:user.email,role:user.role,mobile:user.mobile, avatar_url: user.has_avatar ? `/profile/avatar?v=${new Date(user.avatar_updated_at).getTime()}` : ''}});
  } catch(error) { console.error('Profile read:',error); return res.status(500).json({success:false,message:'Could not load profile.'}); }
});
router.patch('/profile', async (req, res) => {
  const id=req.session?.user?.id;
  if (!validProfileId(id)) return res.status(401).json({success:false,message:'Please sign in.'});
  const name=typeof req.body?.name==='string' ? req.body.name.trim():'';
  const mobile=typeof req.body?.mobile==='string' ? req.body.mobile.trim():'';
  if (name.length<2 || name.length>100 || (mobile && !/^(09\d{9}|\+639\d{9})$/.test(mobile)))
    return res.status(400).json({success:false,message:'Provide a name (2Ã¢â‚¬â€œ100 characters) and a valid Philippine mobile number, or leave mobile blank.'});
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const {rows}=await client.query('SELECT user_id,role,email,account_status FROM app_users WHERE user_id=$1 FOR UPDATE',[id]);
    const user=rows[0];
    if (!user || user.account_status!=='active' || user.role!==req.session.user.role) {
      await client.query('ROLLBACK');return res.status(403).json({success:false,message:'Account is not active.'});
    }
    await client.query('UPDATE app_users SET full_name=$1 WHERE user_id=$2',[name,id]);
    await client.query(`INSERT INTO user_profile_contacts (user_id,mobile) VALUES ($1,$2)
      ON CONFLICT (user_id) DO UPDATE SET mobile=EXCLUDED.mobile`,[id,mobile]);
    await client.query('COMMIT');
    req.session.user.name=name;
    return req.session.save(error=>{
      if(error){console.error('Profile session save:',error);return res.status(500).json({success:false,message:'Profile saved, but session refresh failed. Please sign in again.'});}
      res.json({success:true,profile:{name,email:user.email,role:user.role,mobile}});
    });
  }catch(error){await client.query('ROLLBACK');console.error('Profile update:',error);return res.status(500).json({success:false,message:'Could not update profile.'});}
  finally{client.release();}
});
// Avatar is stored in PostgreSQL rather than local disk (survives process restarts).
// Available only to the logged-in user; all DB queries are scoped to that identity.
router.get('/profile/avatar', async (req, res) => {
  const id = req.session?.user?.id;
  if (!validProfileId(id)) return res.status(401).json({ success:false, message:'Please sign in.' });
  try {
    const { rows } = await pool.query(`SELECT p.avatar_data, p.avatar_mime
      FROM app_users u JOIN user_profile_contacts p ON p.user_id = u.user_id
      WHERE u.user_id=$1 AND u.account_status='active' AND u.role=$2`, [id, req.session.user.role]);
    if (!rows[0]?.avatar_data) return res.status(404).json({success:false,message:'No profile picture saved.'});
    res.set('Cache-Control', 'private, no-store');
    res.set('X-Content-Type-Options', 'nosniff');
    res.type(rows[0].avatar_mime).send(rows[0].avatar_data);
  } catch(error) { console.error('Avatar read:',error); return res.status(500).json({success:false,message:'Could not load picture.'}); }
});
router.patch('/profile/avatar', async (req, res) => {
  const id = req.session?.user?.id;
  if (!validProfileId(id)) return res.status(401).json({success:false,message:'Please sign in.'});
  const input = req.body?.image;
  if (typeof input !== 'string' || input.length > 2_900_000) return res.status(400).json({success:false,message:'Select an image smaller than 2 MB.'});
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(input);
  if (!match) return res.status(400).json({success:false,message:'Only JPG, PNG, and WebP pictures are supported.'});
  const mime = match[1];
  const data = Buffer.from(match[2], 'base64');
  const png = data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpg = data.length >= 4 && data[0]===0xff && data[1]===0xd8 && data[2]===0xff;
  const webp = data.length >= 12 && data.toString('ascii',0,4)==='RIFF' && data.toString('ascii',8,12)==='WEBP';
  if (!data.length || data.length>2*1024*1024 || !((mime==='image/png'&&png)||(mime==='image/jpeg'&&jpg)||(mime==='image/webp'&&webp)))
    return res.status(400).json({success:false,message:'Invalid image or larger than 2 MB.'});
  try {
    const result = await pool.query(`INSERT INTO user_profile_contacts (user_id, mobile, avatar_data, avatar_mime, avatar_updated_at)
      SELECT user_id, '', $3, $4, NOW() FROM app_users
      WHERE user_id=$1 AND account_status='active' AND role=$2
      ON CONFLICT (user_id) DO UPDATE SET avatar_data=EXCLUDED.avatar_data,
      avatar_mime=EXCLUDED.avatar_mime, avatar_updated_at=NOW() RETURNING user_id`,
      [id, req.session.user.role, data, mime]);
    if (!result.rowCount) return res.status(403).json({success:false,message:'Account is not active.'});
    return res.json({success:true, avatar_url:`/profile/avatar?v=${Date.now()}`});
  } catch(error) { console.error('Avatar save:',error); return res.status(500).json({success:false,message:'Could not save picture. Check database migration.'}); }
});

function validProfileId(value){return /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value)>0;}

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
