const express = require('express');
const pool = require('../db');
const router = express.Router();

async function requireRole(req, res, next) {
  const sessionUser = req.session?.user;
  if (!sessionUser?.id) return res.status(401).json({ success: false, message: 'Please log in.' });
  try {
    const result = await pool.query('SELECT role, account_status FROM app_users WHERE user_id = $1', [sessionUser.id]);
    const user = result.rows[0];
    if (!user || user.account_status?.toLowerCase() !== 'active') {
      return res.status(403).json({ success: false, message: 'Account is not active.' });
    }
    if (user.role !== sessionUser.role) {
      return res.status(403).json({ success: false, message: 'Your session role is outdated. Please sign in again.' });
    }
    req.currentUser = { id: Number(sessionUser.id), role: user.role };
    next();
  } catch (err) { next(err); }
}
function allow(...roles) {
  return (req, res, next) => roles.includes(req.currentUser.role)
    ? next() : res.status(403).json({ success: false, message: 'Access denied.' });
}
const positiveId = value => Number.isSafeInteger(Number(value)) && Number(value) > 0;

router.use(requireRole);

// Tenants see only available units and their parent properties.
router.get('/available-units', allow('tenant', 'owner', 'admin'), async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT u.unit_id, u.property_id, u.unit_number, u.unit_type, u.monthly_rent,
             u.bedrooms, u.capacity, u.amenities, u.description AS unit_description,
             u.status, p.property_name, p.address, p.city, p.property_type,
             p.description AS property_description
      FROM units u JOIN properties p ON p.property_id = u.property_id
      WHERE LOWER(u.status) = 'available'
      ORDER BY p.property_name, u.unit_number`);
    res.json({ success: true, units: result.rows });
  } catch (err) { next(err); }
});

// Admin can see all property records; owners only their own.
router.get('/properties', allow('owner', 'admin'), async (req, res, next) => {
  try {
    const params = req.currentUser.role === 'owner' ? [req.currentUser.id] : [];
    const where = params.length ? 'WHERE p.owner_id = $1' : '';
    const result = await pool.query(`
      SELECT p.property_id, p.owner_id, p.property_name, p.description, p.address,
             p.city, p.property_type, a.full_name AS owner_name,
             COUNT(u.unit_id)::int AS unit_count,
             COUNT(u.unit_id) FILTER (WHERE LOWER(u.status) = 'available')::int AS available_unit_count
      FROM properties p JOIN app_users a ON a.user_id = p.owner_id
      LEFT JOIN units u ON u.property_id = p.property_id
      ${where}
      GROUP BY p.property_id, a.full_name
      ORDER BY p.property_id DESC`, params);
    res.json({ success: true, properties: result.rows });
  } catch (err) { next(err); }
});

router.post('/properties', allow('owner'), async (req, res, next) => {
  const { property_name, description, address, city, property_type } = req.body || {};
  if (typeof property_name !== 'string' || !property_name.trim() ||
      typeof address !== 'string' || !address.trim() ||
      [description, city, property_type].some(v => v != null && typeof v !== 'string')) {
    return res.status(400).json({ success: false, message: 'Property name and address are required. Optional fields must be text.' });
  }
  try {
    const result = await pool.query(`
      INSERT INTO properties (owner_id, property_name, description, address, city, property_type)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.currentUser.id, property_name.trim(), description?.trim() || null,
       address.trim(), city?.trim() || null, property_type?.trim() || null]);
    res.status(201).json({ success: true, property: result.rows[0] });
  } catch (err) { next(err); }
});

router.get('/properties/:id/units', allow('owner', 'admin'), async (req, res, next) => {
  if (!positiveId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid property ID.' });
  try {
    const own = await pool.query('SELECT owner_id FROM properties WHERE property_id = $1', [req.params.id]);
    if (!own.rows.length) return res.status(404).json({ success: false, message: 'Property not found.' });
    if (req.currentUser.role === 'owner' && Number(own.rows[0].owner_id) !== req.currentUser.id) {
      return res.status(403).json({ success: false, message: 'Not your property.' });
    }
    const result = await pool.query('SELECT * FROM units WHERE property_id = $1 ORDER BY unit_id DESC', [req.params.id]);
    res.json({ success: true, units: result.rows });
  } catch (err) { next(err); }
});

router.post('/properties/:id/units', allow('owner'), async (req, res, next) => {
  if (!positiveId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid property ID.' });
  const { unit_number, unit_type, monthly_rent, bedrooms = 0, capacity = 1, amenities, description } = req.body || {};
  const rent = Number(monthly_rent), beds = Number(bedrooms), cap = Number(capacity);
  if (typeof unit_number !== 'string' || !unit_number.trim() ||
      !Number.isFinite(rent) || rent <= 0 || !Number.isInteger(beds) || beds < 0 ||
      !Number.isInteger(cap) || cap < 1 ||
      [unit_type, amenities, description].some(v => v != null && typeof v !== 'string')) {
    return res.status(400).json({ success: false, message: 'Enter a unit number, positive rent, valid bedrooms and capacity.' });
  }
  try {
    const own = await pool.query('SELECT owner_id FROM properties WHERE property_id = $1', [req.params.id]);
    if (!own.rows.length) return res.status(404).json({ success: false, message: 'Property not found.' });
    if (Number(own.rows[0].owner_id) !== req.currentUser.id) return res.status(403).json({ success: false, message: 'Not your property.' });
    const result = await pool.query(`
      INSERT INTO units (property_id, unit_number, unit_type, monthly_rent, bedrooms, capacity, amenities, description, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'available') RETURNING *`,
      [Number(req.params.id), unit_number.trim(), unit_type?.trim() || null, rent, beds, cap,
       amenities?.trim() || null, description?.trim() || null]);
    res.status(201).json({ success: true, unit: result.rows[0] });
  } catch (err) { next(err); }
});

// PATCH property details (owner-only, database persisted)
router.patch('/properties/:id', allow('owner'), async (req, res, next) => {
  if (!positiveId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid property ID.' });
  const { property_name, address } = req.body || {};
  if (typeof property_name !== 'string' || !property_name.trim() ||
      typeof address !== 'string' || !address.trim()) {
    return res.status(400).json({ success: false, message: 'Property name and address are required.' });
  }
  try {
    const result = await pool.query(`
      UPDATE properties SET property_name = $1, address = $2
      WHERE property_id = $3 AND owner_id = $4
      RETURNING *`,
      [property_name.trim(), address.trim(), Number(req.params.id), req.currentUser.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Property not found under your account.' });
    res.json({ success: true, property: result.rows[0] });
  } catch (err) { next(err); }
});

// PATCH unit details (owner-only, unit must belong to their property)
router.patch('/properties/:id/units/:unitId', allow('owner'), async (req, res, next) => {
  if (!positiveId(req.params.id) || !positiveId(req.params.unitId)) {
    return res.status(400).json({ success: false, message: 'Invalid property or unit ID.' });
  }
  const { unit_number, monthly_rent, bedrooms, capacity } = req.body || {};
  const rent = Number(monthly_rent), beds = Number(bedrooms), cap = Number(capacity);
  if (typeof unit_number !== 'string' || !unit_number.trim() ||
      monthly_rent == null || !Number.isFinite(rent) || rent <= 0 ||
      bedrooms == null || !Number.isInteger(beds) || beds < 0 ||
      capacity == null || !Number.isInteger(cap) || cap < 1) {
    return res.status(400).json({ success: false, message: 'Enter a valid unit number, positive rent, bedrooms and capacity.' });
  }
  try {
    const result = await pool.query(`
      UPDATE units AS u SET unit_number = $1, monthly_rent = $2,
          bedrooms = $3, capacity = $4
      FROM properties AS p
      WHERE u.unit_id = $5 AND u.property_id = $6
        AND p.property_id = u.property_id AND p.owner_id = $7
      RETURNING u.*`,
      [unit_number.trim(), rent, beds, cap,
       Number(req.params.unitId), Number(req.params.id), req.currentUser.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Unit not found under your property.' });
    res.json({ success: true, unit: result.rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
