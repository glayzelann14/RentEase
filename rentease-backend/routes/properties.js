
'use strict';

const express = require('express');
const pool = require('../db');
const router = express.Router();

const positiveId = value =>
  /^\d+$/.test(String(value)) &&
  Number.isSafeInteger(Number(value)) &&
  Number(value) > 0;

// ============================================================
// AUTHENTICATION AND AUTHORIZATION
// ============================================================

async function requireRole(req, res, next) {
  const sessionUser = req.session?.user;

  if (!positiveId(sessionUser?.id)) {
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
      String(user.account_status).toLowerCase() !== 'active'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Account is not active.'
      });
    }

    if (user.role !== sessionUser.role) {
      return res.status(403).json({
        success: false,
        message: 'Your session role is outdated. Please sign in again.'
      });
    }

    req.currentUser = {
      id: Number(sessionUser.id),
      role: user.role
    };

    next();
  } catch (err) {
    next(err);
  }
}

function allow(...roles) {
  return (req, res, next) =>
    roles.includes(req.currentUser.role)
      ? next()
      : res.status(403).json({
          success: false,
          message: 'Access denied.'
        });
}

router.use(requireRole);

// ============================================================
// AVAILABLE RENTAL UNITS
// ============================================================

// Tenants see only available units without pending or active leases.

router.get(
  '/available-units',
  allow('tenant', 'owner', 'admin'),
  async (req, res, next) => {
    try {
      const result = await pool.query(`
        SELECT
          u.unit_id,
          u.property_id,
          u.unit_number,
          u.unit_type,
          u.monthly_rent,
          u.bedrooms,
          u.capacity,
          u.amenities,
          u.description AS unit_description,
          u.status,
          p.property_name,
          p.address,
          p.city,
          p.property_type,
          p.description AS property_description
        FROM units u
        JOIN properties p
          ON p.property_id = u.property_id
        WHERE LOWER(u.status) = 'available'
          AND NOT EXISTS (
            SELECT 1
            FROM leases l
            WHERE l.unit_id = u.unit_id
              AND LOWER(l.status) IN ('pending', 'active')
          )
        ORDER BY p.property_name, u.unit_number
      `);

      res.json({
        success: true,
        units: result.rows
      });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// LIST PROPERTIES
// ============================================================

// Admin sees all properties.
// Owner sees only their own properties.

router.get(
  '/properties',
  allow('owner', 'admin'),
  async (req, res, next) => {
    try {
      const params =
        req.currentUser.role === 'owner'
          ? [req.currentUser.id]
          : [];

      const where =
        params.length > 0
          ? 'WHERE p.owner_id = $1'
          : '';

      const result = await pool.query(
        `
        SELECT
          p.property_id,
          p.owner_id,
          p.property_name,
          p.description,
          p.address,
          p.city,
          p.property_type,
          a.full_name AS owner_name,
          COUNT(u.unit_id)::int AS unit_count,
          COUNT(u.unit_id) FILTER (
            WHERE LOWER(u.status) = 'available'
          )::int AS available_unit_count
        FROM properties p
        JOIN app_users a
          ON a.user_id = p.owner_id
        LEFT JOIN units u
          ON u.property_id = p.property_id
        ${where}
        GROUP BY p.property_id, a.full_name
        ORDER BY p.property_id DESC
        `,
        params
      );

      res.json({
        success: true,
        properties: result.rows
      });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// CREATE PROPERTY
// ============================================================

router.post(
  '/properties',
  allow('owner'),
  async (req, res, next) => {
    const {
      property_name,
      description,
      address,
      city,
      property_type
    } = req.body || {};

    if (
      typeof property_name !== 'string' ||
      !property_name.trim() ||
      typeof address !== 'string' ||
      !address.trim() ||
      [description, city, property_type].some(
        value => value != null && typeof value !== 'string'
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Property name and address are required. Optional fields must be text.'
      });
    }

    try {
      const result = await pool.query(
        `
        INSERT INTO properties (
          owner_id,
          property_name,
          description,
          address,
          city,
          property_type
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        `,
        [
          req.currentUser.id,
          property_name.trim(),
          description?.trim() || null,
          address.trim(),
          city?.trim() || null,
          property_type?.trim() || null
        ]
      );

      res.status(201).json({
        success: true,
        property: result.rows[0]
      });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// LIST UNITS OF A PROPERTY
// ============================================================

router.get(
  '/properties/:id/units',
  allow('owner', 'admin'),
  async (req, res, next) => {
    if (!positiveId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid property ID.'
      });
    }

    try {
      const own = await pool.query(
        `SELECT owner_id
         FROM properties
         WHERE property_id = $1`,
        [req.params.id]
      );

      if (!own.rows.length) {
        return res.status(404).json({
          success: false,
          message: 'Property not found.'
        });
      }

      if (
        req.currentUser.role === 'owner' &&
        Number(own.rows[0].owner_id) !== req.currentUser.id
      ) {
        return res.status(403).json({
          success: false,
          message: 'Not your property.'
        });
      }

      const result = await pool.query(
        `SELECT *
         FROM units
         WHERE property_id = $1
         ORDER BY unit_id DESC`,
        [req.params.id]
      );

      res.json({
        success: true,
        units: result.rows
      });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// CREATE RENTAL UNIT
// ============================================================

router.post(
  '/properties/:id/units',
  allow('owner'),
  async (req, res, next) => {
    if (!positiveId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid property ID.'
      });
    }

    const {
      unit_number,
      unit_type,
      monthly_rent,
      bedrooms = 0,
      capacity = 1,
      amenities,
      description
    } = req.body || {};

    const rent = Number(monthly_rent);
    const beds = Number(bedrooms);
    const cap = Number(capacity);

    if (
      typeof unit_number !== 'string' ||
      !unit_number.trim() ||
      monthly_rent == null ||
      !Number.isFinite(rent) ||
      rent <= 0 ||
      !Number.isInteger(beds) ||
      beds < 0 ||
      !Number.isInteger(cap) ||
      cap < 1 ||
      [unit_type, amenities, description].some(
        value => value != null && typeof value !== 'string'
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Enter a unit number, positive rent, valid bedrooms and capacity.'
      });
    }

    try {
      const own = await pool.query(
        `SELECT owner_id
         FROM properties
         WHERE property_id = $1`,
        [req.params.id]
      );

      if (!own.rows.length) {
        return res.status(404).json({
          success: false,
          message: 'Property not found.'
        });
      }

      if (Number(own.rows[0].owner_id) !== req.currentUser.id) {
        return res.status(403).json({
          success: false,
          message: 'Not your property.'
        });
      }

      const result = await pool.query(
        `
        INSERT INTO units (
          property_id,
          unit_number,
          unit_type,
          monthly_rent,
          bedrooms,
          capacity,
          amenities,
          description,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'available')
        RETURNING *
        `,
        [
          Number(req.params.id),
          unit_number.trim(),
          unit_type?.trim() || null,
          rent,
          beds,
          cap,
          amenities?.trim() || null,
          description?.trim() || null
        ]
      );

      res.status(201).json({
        success: true,
        unit: result.rows[0]
      });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// UPDATE PROPERTY
// ============================================================

router.patch(
  '/properties/:id',
  allow('owner'),
  async (req, res, next) => {
    if (!positiveId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid property ID.'
      });
    }

    const { property_name, address } = req.body || {};

    if (
      typeof property_name !== 'string' ||
      !property_name.trim() ||
      typeof address !== 'string' ||
      !address.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Property name and address are required.'
      });
    }

    try {
      const result = await pool.query(
        `
        UPDATE properties
        SET
          property_name = $1,
          address = $2
        WHERE property_id = $3
          AND owner_id = $4
        RETURNING *
        `,
        [
          property_name.trim(),
          address.trim(),
          Number(req.params.id),
          req.currentUser.id
        ]
      );

      if (!result.rows.length) {
        return res.status(404).json({
          success: false,
          message: 'Property not found under your account.'
        });
      }

      res.json({
        success: true,
        property: result.rows[0]
      });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// UPDATE RENTAL UNIT
// ============================================================

router.patch(
  '/properties/:id/units/:unitId',
  allow('owner'),
  async (req, res, next) => {
    if (
      !positiveId(req.params.id) ||
      !positiveId(req.params.unitId)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid property or unit ID.'
      });
    }

    const {
      unit_number,
      monthly_rent,
      bedrooms,
      capacity
    } = req.body || {};

    const rent = Number(monthly_rent);
    const beds = Number(bedrooms);
    const cap = Number(capacity);

    if (
      typeof unit_number !== 'string' ||
      !unit_number.trim() ||
      monthly_rent == null ||
      !Number.isFinite(rent) ||
      rent <= 0 ||
      bedrooms == null ||
      !Number.isInteger(beds) ||
      beds < 0 ||
      capacity == null ||
      !Number.isInteger(cap) ||
      cap < 1
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Enter a valid unit number, positive rent, bedrooms and capacity.'
      });
    }

    try {
      const result = await pool.query(
        `
        UPDATE units AS u
        SET
          unit_number = $1,
          monthly_rent = $2,
          bedrooms = $3,
          capacity = $4
        FROM properties AS p
        WHERE u.unit_id = $5
          AND u.property_id = $6
          AND p.property_id = u.property_id
          AND p.owner_id = $7
        RETURNING u.*
        `,
        [
          unit_number.trim(),
          rent,
          beds,
          cap,
          Number(req.params.unitId),
          Number(req.params.id),
          req.currentUser.id
        ]
      );

      if (!result.rows.length) {
        return res.status(404).json({
          success: false,
          message: 'Unit not found under your property.'
        });
      }

      res.json({
        success: true,
        unit: result.rows[0]
      });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// CONFIRM UNIT TURNOVER
// ============================================================

// Owner confirms that a previously rented unit has been
// returned, inspected, and is ready for new rental applications.
//
// Expected workflow:
// ACTIVE lease + OCCUPIED unit
// -> COMPLETED lease + MAINTENANCE unit
// -> Confirm Turnover
// -> AVAILABLE unit

router.patch(
  '/properties/:id/units/:unitId/confirm-turnover',
  allow('owner'),
  async (req, res, next) => {
    if (
      !positiveId(req.params.id) ||
      !positiveId(req.params.unitId)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid property or unit ID.'
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Lock the unit to prevent simultaneous status changes.
      const unitResult = await client.query(
        `
        SELECT
          u.unit_id,
          u.status,
          p.owner_id
        FROM units u
        JOIN properties p
          ON p.property_id = u.property_id
        WHERE u.unit_id = $1
          AND u.property_id = $2
        FOR UPDATE OF u
        `,
        [
          Number(req.params.unitId),
          Number(req.params.id)
        ]
      );

      const unit = unitResult.rows[0];

      if (
        !unit ||
        Number(unit.owner_id) !== req.currentUser.id
      ) {
        await client.query('ROLLBACK');

        return res.status(404).json({
          success: false,
          message: 'Unit not found under your property.'
        });
      }

      if (
        String(unit.status).toLowerCase() !== 'maintenance'
      ) {
        await client.query('ROLLBACK');

        return res.status(409).json({
          success: false,
          message:
            'Only units in maintenance can be released after turnover.'
        });
      }

      // Require a completed lease and prohibit releasing a unit
      // that still has a pending or active lease.
      const leases = await client.query(
        `
        SELECT
          EXISTS (
            SELECT 1
            FROM leases
            WHERE unit_id = $1
              AND LOWER(status) = 'completed'
          ) AS has_completed,

          EXISTS (
            SELECT 1
            FROM leases
            WHERE unit_id = $1
              AND LOWER(status) IN ('pending', 'active')
          ) AS has_open
        `,
        [unit.unit_id]
      );

      if (
        !leases.rows[0].has_completed ||
        leases.rows[0].has_open
      ) {
        await client.query('ROLLBACK');

        return res.status(409).json({
          success: false,
          message:
            'Turnover requires a completed lease and no pending or active lease.'
        });
      }

      // Return the unit to the rental catalog only after
      // owner confirmation.
      const updated = await client.query(
        `
        UPDATE units
        SET status = 'available'
        WHERE unit_id = $1
          AND LOWER(status) = 'maintenance'
        RETURNING *
        `,
        [unit.unit_id]
      );

      if (!updated.rows.length) {
        await client.query('ROLLBACK');

        return res.status(409).json({
          success: false,
          message:
            'The unit status changed. Please refresh.'
        });
      }

      await client.query('COMMIT');

      return res.json({
        success: true,
        unit: updated.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      next(error);
    } finally {
      client.release();
    }
  }
);

// ============================================================
// EXPORT ROUTER
// ============================================================

module.exports = router;
