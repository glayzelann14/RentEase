
const express = require('express');
const pool = require('../db');
const router = express.Router();

async function currentUser(req, res, next) {
  const sessionUser = req.session?.user;

  if (!sessionUser?.id) {
    return res.status(401).json({
      success: false,
      message: 'Please log in.'
    });
  }

  try {
    const result = await pool.query(
      `SELECT role, account_status
       FROM app_users
       WHERE user_id = $1`,
      [sessionUser.id]
    );

    const user = result.rows[0];

    if (
      !user ||
      String(user.account_status).toLowerCase() !== 'active' ||
      user.role !== sessionUser.role
    ) {
      return res.status(403).json({
        success: false,
        message: 'Your account is inactive or your session is outdated.'
      });
    }

    req.currentUser = {
      id: Number(sessionUser.id),
      role: user.role
    };

    next();
  } catch (error) {
    next(error);
  }
}

function only(role) {
  return (req, res, next) => {
    if (req.currentUser.role === role) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied.'
    });
  };
}

function validId(value) {
  return (
    /^\d+$/.test(String(value)) &&
    Number.isSafeInteger(Number(value)) &&
    Number(value) > 0
  );
}

const SELECT = `
  SELECT
    m.request_id,
    m.tenant_id,
    m.unit_id,
    m.category,
    m.problem_description,
    m.priority,
    m.status,
    m.assigned_to,
    m.created_at,
    m.completed_at,
    u.unit_number,
    p.property_id,
    p.property_name,
    p.owner_id,
    t.full_name AS tenant_name,
    t.email AS tenant_email
  FROM maintenance_requests m
  JOIN units u
    ON u.unit_id = m.unit_id
  JOIN properties p
    ON p.property_id = u.property_id
  JOIN app_users t
    ON t.user_id = m.tenant_id
`;

router.use(currentUser);

// =====================================================
// TENANT - GET MY MAINTENANCE REQUESTS
// =====================================================

router.get('/maintenance/my', only('tenant'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `${SELECT}
       WHERE m.tenant_id = $1
       ORDER BY m.created_at DESC, m.request_id DESC`,
      [req.currentUser.id]
    );

    return res.json({
      success: true,
      requests: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// TENANT - SUBMIT MAINTENANCE REQUEST
// =====================================================

router.post('/maintenance', only('tenant'), async (req, res, next) => {
  const {
    unit_id,
    category,
    problem_description,
    priority = 'medium'
  } = req.body || {};

  const categories = [
    'Plumbing',
    'Electrical',
    'Appliance / Fixture',
    'General'
  ];

  if (
    !validId(unit_id) ||
    !categories.includes(category) ||
    typeof problem_description !== 'string' ||
    problem_description.trim().length < 10 ||
    problem_description.length > 4000 ||
    !['low', 'medium', 'high', 'urgent'].includes(priority)
  ) {
    return res.status(400).json({
      success: false,
      message:
        'Select a valid rental unit, category, priority and a description of at least 10 characters.'
    });
  }

  try {
    // Verify that the tenant has an active lease
    // for the selected rental unit.
    const lease = await pool.query(
      `SELECT lease_id
       FROM leases
       WHERE tenant_id = $1
         AND unit_id = $2
         AND LOWER(status) = 'active'
       LIMIT 1`,
      [req.currentUser.id, Number(unit_id)]
    );

    if (!lease.rows.length) {
      return res.status(403).json({
        success: false,
        message:
          'Maintenance requests require an active lease for the selected unit.'
      });
    }

    const inserted = await pool.query(
      `INSERT INTO maintenance_requests (
        tenant_id,
        unit_id,
        category,
        problem_description,
        priority,
        status
      )
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING request_id`,
      [
        req.currentUser.id,
        Number(unit_id),
        category,
        problem_description.trim(),
        priority
      ]
    );

    const result = await pool.query(
      `${SELECT}
       WHERE m.request_id = $1`,
      [inserted.rows[0].request_id]
    );

    return res.status(201).json({
      success: true,
      request: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// OWNER - GET MAINTENANCE REQUESTS
// =====================================================

router.get('/owner/maintenance', only('owner'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `${SELECT}
       WHERE p.owner_id = $1
       ORDER BY
         CASE
           WHEN LOWER(m.status) = 'completed' THEN 1
           ELSE 0
         END,
         m.created_at DESC,
         m.request_id DESC`,
      [req.currentUser.id]
    );

    return res.json({
      success: true,
      requests: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// OWNER - UPDATE MAINTENANCE STATUS
// =====================================================

router.patch(
  '/owner/maintenance/:id/status',
  only('owner'),
  async (req, res, next) => {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request ID.'
      });
    }

    const status = req.body?.status;

    const transitions = {
      pending: ['assigned', 'cancelled'],
      assigned: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'cancelled'],
      completed: [],
      cancelled: []
    };

    const allowedStatuses = [
      'assigned',
      'in_progress',
      'completed',
      'cancelled'
    ];

    if (
      typeof status !== 'string' ||
      !allowedStatuses.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid maintenance status.'
      });
    }

    let client;

    try {
      client = await pool.connect();

      await client.query('BEGIN');

      // Lock the request to prevent conflicting updates.
      const found = await client.query(
        `SELECT
           m.status,
           p.owner_id
         FROM maintenance_requests m
         JOIN units u
           ON u.unit_id = m.unit_id
         JOIN properties p
           ON p.property_id = u.property_id
         WHERE m.request_id = $1
         FOR UPDATE OF m`,
        [Number(req.params.id)]
      );

      if (!found.rows.length) {
        await client.query('ROLLBACK');

        return res.status(404).json({
          success: false,
          message: 'Maintenance request not found.'
        });
      }

      // Only the property's owner can update its requests.
      if (Number(found.rows[0].owner_id) !== req.currentUser.id) {
        await client.query('ROLLBACK');

        return res.status(403).json({
          success: false,
          message: 'Not a request for your property.'
        });
      }

      const before = String(found.rows[0].status).toLowerCase();

      // Enforce the valid status transitions.
      if (!transitions[before]?.includes(status)) {
        await client.query('ROLLBACK');

        return res.status(409).json({
          success: false,
          message: `Cannot move status from ${before} to ${status}.`
        });
      }

      // =====================================================
      // FIX: PostgreSQL error 42P08
      //
      // Explicitly cast $1 as VARCHAR to prevent inconsistent
      // parameter types between status assignment and
      // CASE comparisons.
      // =====================================================

      await client.query(
        `UPDATE maintenance_requests
         SET
           status = $1::varchar,

           assigned_to = CASE
             WHEN $1::varchar = 'assigned'
               THEN $2
             ELSE assigned_to
           END,

           completed_at = CASE
             WHEN $1::varchar = 'completed'
               THEN CURRENT_TIMESTAMP
             ELSE completed_at
           END

         WHERE request_id = $3`,
        [
          status,
          req.currentUser.id,
          Number(req.params.id)
        ]
      );

      // Retrieve the updated record.
      const result = await client.query(
        `${SELECT}
         WHERE m.request_id = $1`,
        [Number(req.params.id)]
      );

      await client.query('COMMIT');

      return res.json({
        success: true,
        request: result.rows[0]
      });
    } catch (error) {
      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          console.error(
            'Maintenance transaction rollback failed:',
            rollbackError
          );
        }
      }

      next(error);
    } finally {
      if (client) {
        client.release();
      }
    }
  }
);

module.exports = router;
