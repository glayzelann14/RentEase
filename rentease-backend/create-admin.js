
require('dotenv').config();

const bcrypt = require('bcrypt');
const pool = require('./db');

async function main() {
  const name = process.env.ADMIN_NAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  // Make sure all admin details are provided.
  if (!name || !email || !password) {
    throw new Error(
      'Set ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD in .env first.'
    );
  }

  // Require a strong password.
  if (password.length < 12) {
    throw new Error(
      'ADMIN_PASSWORD must be at least 12 characters long.'
    );
  }

  // Validate the email address.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('ADMIN_EMAIL must be a valid email address.');
  }

  // Check whether this email already exists.
  const existing = await pool.query(
    'SELECT user_id, role FROM app_users WHERE email = $1',
    [email]
  );

  // Hash the password before storing it.
  const passwordHash = await bcrypt.hash(password, 12);

  if (existing.rows.length > 0) {
    const user = existing.rows[0];

    // Never turn a tenant or owner into an admin.
    if (user.role !== 'admin') {
      throw new Error(
        'This email belongs to a non-admin account. ' +
        'Choose another email. Existing roles were not changed.'
      );
    }

    // Update an existing admin account.
    await pool.query(
      `UPDATE app_users
       SET full_name = $1,
           password_hash = $2,
           account_status = 'active'
       WHERE user_id = $3`,
      [name, passwordHash, user.user_id]
    );

    console.log(`Admin account updated: ${email}`);
    return;
  }

  // Create a new admin account.
  await pool.query(
    `INSERT INTO app_users
      (full_name, email, password_hash, role, account_status)
     VALUES ($1, $2, $3, 'admin', 'active')`,
    [name, email, passwordHash]
  );

  console.log(`Admin account created successfully: ${email}`);
}

main()
  .catch((error) => {
    console.error(`Admin setup failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
