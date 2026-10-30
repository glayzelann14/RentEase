'use strict';
const express = require('express');
const pool = require('../db');
const router = express.Router();

const validId = value => /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0;

async function authenticated(req, res, next) {
  const id = req.session?.user?.id;
  if (!validId(id)) return res.status(401).json({ success: false, message: 'Please log in.' });
  try {
    const { rows } = await pool.query('SELECT user_id, role, account_status FROM app_users WHERE user_id = $1', [id]);
    const user = rows[0];
    if (!user || String(user.account_status).toLowerCase() !== 'active') return res.status(403).json({ success: false, message: 'Account is not active.' });
    if (user.role !== req.session.user.role) return res.status(403).json({ success: false, message: 'Session role changed; please sign in again.' });
    req.currentUser = { id: Number(user.user_id), role: user.role };
    next();
  } catch (err) { next(err); }
}
const requireRole = role => (req, res, next) => req.currentUser.role === role ? next() : res.status(403).json({ success: false, message: 'Access denied.' });
router.use(authenticated);

const detailsSelect = `SELECT a.application_id, a.tenant_id, a.unit_id,
  a.move_in_date, a.lease_duration_months, a.employment_details,
  a.contact_details, a.status, a.reviewed_by, a.reviewed_at,
  t.full_name AS tenant_name, t.email AS tenant_email,
  u.unit_number, u.monthly_rent, u.status AS unit_status,
  p.property_id, p.property_name, p.address, p.city, p.owner_id
  FROM applications a
  JOIN app_users t ON t.user_id = a.tenant_id
  JOIN units u ON u.unit_id = a.unit_id
  JOIN properties p ON p.property_id = u.property_id`;

router.get('/applications/my', requireRole('tenant'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(`${detailsSelect} WHERE a.tenant_id = $1 ORDER BY a.application_id DESC`, [req.currentUser.id]);
    res.json({ success: true, applications: rows });
  } catch (err) { next(err); }
});

router.post('/applications', requireRole('tenant'), async (req, res, next) => {
  const { unit_id, move_in_date, lease_duration_months, contact_details, employment_details } = req.body || {};
  const duration = Number(lease_duration_months);
  const moveIn = typeof move_in_date === 'string' ? move_in_date.trim() : '';
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(moveIn) && !Number.isNaN(Date.parse(`${moveIn}T00:00:00Z`)) && new Date(`${moveIn}T00:00:00Z`).toISOString().slice(0, 10) === moveIn;
  if (!validId(unit_id) || !validDate || !Number.isInteger(duration) || duration < 1 || duration > 120 ||
      typeof contact_details !== 'string' || !contact_details.trim() || contact_details.length > 2000 ||
      (employment_details != null && (typeof employment_details !== 'string' || employment_details.length > 4000))) {
    return res.status(400).json({ success: false, message: 'Provide a valid unit, move-in date, duration (1–120 months), and contact details.' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const unit = await client.query('SELECT unit_id, status FROM units WHERE unit_id = $1 FOR UPDATE', [unit_id]);
    if (!unit.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ success: false, message: 'Unit not found.' }); }
    if (String(unit.rows[0].status).toLowerCase() !== 'available') { await client.query('ROLLBACK'); return res.status(409).json({ success: false, message: 'Unit is no longer available.' }); }
    const duplicate = await client.query("SELECT application_id FROM applications WHERE tenant_id = $1 AND unit_id = $2 AND LOWER(status) IN ('pending','approved') LIMIT 1", [req.currentUser.id, unit_id]);
    if (duplicate.rows.length) { await client.query('ROLLBACK'); return res.status(409).json({ success: false, message: 'You already have a pending or approved application for this unit.' }); }
    const created = await client.query(`INSERT INTO applications
      (tenant_id, unit_id, move_in_date, lease_duration_months, employment_details, contact_details, status)
      VALUES ($1,$2,$3,$4,$5,$6,'pending') RETURNING application_id`,
      [req.currentUser.id, Number(unit_id), moveIn, duration, employment_details?.trim() || null, contact_details.trim()]);
    const { rows } = await client.query(`${detailsSelect} WHERE a.application_id = $1`, [created.rows[0].application_id]);
    await client.query('COMMIT');
    res.status(201).json({ success: true, application: rows[0] });
  } catch (err) { await client.query('ROLLBACK'); next(err); } finally { client.release(); }
});

router.get('/owner/applications', requireRole('owner'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(`${detailsSelect} WHERE p.owner_id = $1 ORDER BY a.application_id DESC`, [req.currentUser.id]);
    res.json({ success: true, applications: rows });
  } catch (err) { next(err); }
});

router.patch('/owner/applications/:id/decision', requireRole('owner'), async (req, res, next) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid application ID.' });
  const decision = typeof req.body?.decision === 'string' ? req.body.decision.toLowerCase() : '';
  if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ success: false, message: 'Decision must be approved or rejected.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Lock the unit first, matching the tenant submission lock order.
    const unitResult = await client.query(`SELECT u.unit_id, u.status, p.owner_id
      FROM applications a JOIN units u ON u.unit_id = a.unit_id
      JOIN properties p ON p.property_id = u.property_id
      WHERE a.application_id = $1`, [req.params.id]);
    if (!unitResult.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ success: false, message: 'Application not found.' }); }
    const unitId = unitResult.rows[0].unit_id;
    const lockedUnit = await client.query('SELECT status FROM units WHERE unit_id = $1 FOR UPDATE', [unitId]);
    const app = await client.query(`SELECT a.application_id, a.status, p.owner_id
      FROM applications a JOIN units u ON u.unit_id = a.unit_id
      JOIN properties p ON p.property_id = u.property_id
      WHERE a.application_id = $1 FOR UPDATE OF a`, [req.params.id]);
    if (!app.rows.length || Number(app.rows[0].owner_id) !== req.currentUser.id) { await client.query('ROLLBACK'); return res.status(404).json({ success: false, message: 'Application not found under your properties.' }); }
    if (String(app.rows[0].status).toLowerCase() !== 'pending') { await client.query('ROLLBACK'); return res.status(409).json({ success: false, message: 'Application has already been reviewed.' }); }
    if (decision === 'approved' && String(lockedUnit.rows[0].status).toLowerCase() !== 'available') { await client.query('ROLLBACK'); return res.status(409).json({ success: false, message: 'Unit is no longer available.' }); }
    await client.query('UPDATE applications SET status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP WHERE application_id = $3', [decision, req.currentUser.id, req.params.id]);
    if (decision === 'approved') {
      // Reserve the unit. Actual lease creation is a separate workflow.
      await client.query("UPDATE units SET status = 'reserved' WHERE unit_id = $1", [unitId]);
      await client.query("UPDATE applications SET status = 'rejected', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP WHERE unit_id = $2 AND application_id <> $3 AND LOWER(status) = 'pending'", [req.currentUser.id, unitId, req.params.id]);
    }
    const { rows } = await client.query(`${detailsSelect} WHERE a.application_id = $1`, [req.params.id]);
    await client.query('COMMIT');
    res.json({ success: true, application: rows[0] });
  } catch (err) { await client.query('ROLLBACK'); next(err); } finally { client.release(); }
});
module.exports = router;
