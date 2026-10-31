
'use strict';

const express = require('express');
const pool = require('../db');

const router = express.Router();

const validId = value =>
  /^\d+$/.test(String(value)) &&
  Number.isSafeInteger(Number(value)) &&
  Number(value) > 0;

function validAmount(value) {
  const text = String(value ?? '').trim();

  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return false;

  const amount = Number(text);

  return Number.isFinite(amount) &&
    amount > 0 &&
    amount <= 100000000;
}

const cents = value => Math.round(Number(value) * 100);

// ============================================================
// AUTHENTICATION
// ============================================================

async function auth(req, res, next) {
  if (!validId(req.session?.user?.id)) {
    return res.status(401).json({
      success: false,
      message: 'Please sign in.'
    });
  }

  try {
    const result = await pool.query(
      `SELECT user_id, role, account_status
       FROM app_users
       WHERE user_id = $1`,
      [req.session.user.id]
    );

    const user = result.rows[0];

    if (
      !user ||
      user.role !== req.session.user.role ||
      String(user.account_status).toLowerCase() !== 'active'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Account inactive or session outdated.'
      });
    }

    req.actor = {
      id: Number(user.user_id),
      role: user.role
    };

    next();
  } catch (error) {
    next(error);
  }
}

function allow(role) {
  return (req, res, next) =>
    req.actor.role === role
      ? next()
      : res.status(403).json({
          success: false,
          message: 'Access denied.'
        });
}

router.use(auth);

// ============================================================
// SHARED DEPOSIT QUERY
// ============================================================

const depositQuery = `
  SELECT
    dp.deposit_payment_id,
    dp.lease_id,
    dp.amount,
    dp.payment_method,
    dp.reference_number,
    dp.status,
    dp.submitted_at,
    dp.verified_by,
    dp.verified_at,
    dp.rejection_reason,
    l.tenant_id,
    l.security_deposit,
    l.status AS lease_status,
    p.owner_id,
    p.property_name,
    u.unit_number,
    t.full_name AS tenant_name
  FROM security_deposit_payments dp
  JOIN leases l ON l.lease_id = dp.lease_id
  JOIN units u ON u.unit_id = l.unit_id
  JOIN properties p ON p.property_id = u.property_id
  JOIN app_users t ON t.user_id = l.tenant_id
`;

// ============================================================
// TENANT: VIEW MY DEPOSIT PAYMENTS
// ============================================================

router.get('/deposits/my', allow('tenant'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `${depositQuery}
       WHERE l.tenant_id = $1
       ORDER BY dp.submitted_at DESC, dp.deposit_payment_id DESC`,
      [req.actor.id]
    );

    res.json({
      success: true,
      deposits: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// OWNER: VIEW DEPOSIT PAYMENTS
// ============================================================

router.get('/owner/deposits', allow('owner'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `${depositQuery}
       WHERE p.owner_id = $1
       ORDER BY dp.submitted_at DESC, dp.deposit_payment_id DESC`,
      [req.actor.id]
    );

    res.json({
      success: true,
      deposits: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// TENANT: SUBMIT SECURITY DEPOSIT PAYMENT
// ============================================================

router.post('/deposits', allow('tenant'), async (req, res, next) => {
  const {
    lease_id,
    amount,
    payment_method,
    reference_number
  } = req.body || {};

  const method = String(payment_method ?? '').toLowerCase();
  const reference = String(reference_number ?? '').trim();

  if (
    !validId(lease_id) ||
    !validAmount(amount) ||
    !['cash', 'gcash', 'bank_transfer', 'other'].includes(method) ||
    reference.length > 150 ||
    (!reference && method !== 'cash')
  ) {
    return res.status(400).json({
      success: false,
      message: 'Enter valid deposit payment information.'
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Lock the lease so concurrent submissions and owner reviews
    // cannot reserve or verify more than the required deposit.
    const leaseResult = await client.query(
      `SELECT lease_id, tenant_id, security_deposit, status
       FROM leases
       WHERE lease_id = $1
       FOR UPDATE`,
      [lease_id]
    );

    const lease = leaseResult.rows[0];

    if (!lease || Number(lease.tenant_id) !== req.actor.id) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'Lease not found under your account.'
      });
    }

    if (!['pending', 'active'].includes(
      String(lease.status).toLowerCase()
    )) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message: 'Deposit collection is closed for this lease.'
      });
    }

    const required = cents(lease.security_deposit);

    if (required <= 0) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message: 'This lease does not require a security deposit.'
      });
    }

    // Pending submissions reserve part of the required amount.
    const totals = await client.query(
      `SELECT
         COALESCE(SUM(amount) FILTER (
           WHERE status = 'verified'
         ), 0) AS verified_total,
         COALESCE(SUM(amount) FILTER (
           WHERE status = 'pending_verification'
         ), 0) AS pending_total
       FROM security_deposit_payments
       WHERE lease_id = $1`,
      [lease_id]
    );

    const verified = cents(totals.rows[0].verified_total);
    const pending = cents(totals.rows[0].pending_total);
    const requested = cents(amount);

    const remaining = required - verified - pending;

    if (requested > remaining) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message:
          'This payment exceeds the remaining deposit amount, ' +
          'including pending submissions.'
      });
    }

    const inserted = await client.query(
      `INSERT INTO security_deposit_payments (
         lease_id,
         amount,
         payment_method,
         reference_number,
         status
       )
       VALUES ($1, $2, $3, $4, 'pending_verification')
       RETURNING deposit_payment_id`,
      [
        lease_id,
        (requested / 100).toFixed(2),
        method,
        reference || null
      ]
    );

    const saved = await client.query(
      `${depositQuery}
       WHERE dp.deposit_payment_id = $1`,
      [inserted.rows[0].deposit_payment_id]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Security deposit payment submitted for verification.',
      deposit: saved.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

// ============================================================
// OWNER: VERIFY OR REJECT DEPOSIT PAYMENT
// ============================================================

router.patch(
  '/owner/deposits/:id/decision',
  allow('owner'),
  async (req, res, next) => {
    const paymentId = req.params.id;
    const decision = req.body?.decision;
    const reason = String(req.body?.rejection_reason ?? '').trim();

    if (
      !validId(paymentId) ||
      !['verified', 'rejected'].includes(decision)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Valid deposit payment and decision required.'
      });
    }

    if (decision === 'rejected' && (!reason || reason.length > 1000)) {
      return res.status(400).json({
        success: false,
        message: 'Provide a rejection reason (maximum 1000 characters).'
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const info = await client.query(
        `SELECT dp.lease_id, p.owner_id
         FROM security_deposit_payments dp
         JOIN leases l ON l.lease_id = dp.lease_id
         JOIN units u ON u.unit_id = l.unit_id
         JOIN properties p ON p.property_id = u.property_id
         WHERE dp.deposit_payment_id = $1`,
        [paymentId]
      );

      if (
        !info.rows.length ||
        Number(info.rows[0].owner_id) !== req.actor.id
      ) {
        await client.query('ROLLBACK');

        return res.status(404).json({
          success: false,
          message: 'Deposit payment not found under your properties.'
        });
      }

      // Lock lease before payment, matching the settlement
      // workflow's transaction locking order.
      const leaseResult = await client.query(
        `SELECT lease_id, security_deposit
         FROM leases
         WHERE lease_id = $1
         FOR UPDATE`,
        [info.rows[0].lease_id]
      );

      const paymentResult = await client.query(
        `SELECT *
         FROM security_deposit_payments
         WHERE deposit_payment_id = $1
         FOR UPDATE`,
        [paymentId]
      );

      const payment = paymentResult.rows[0];

      if (!payment || payment.status !== 'pending_verification') {
        await client.query('ROLLBACK');

        return res.status(409).json({
          success: false,
          message: 'Deposit payment was already reviewed.'
        });
      }

      if (decision === 'verified') {

        // ====================================================
        // NEW: LATE DEPOSIT VERIFICATION PROTECTION
        // ====================================================
        // This lease is locked until the transaction ends.
        // Prevent increasing the verified deposit after
        // the settlement has been finalized or settled.

        const settlementResult = await client.query(
          `SELECT status
           FROM security_deposit_settlements
           WHERE lease_id = $1`,
          [payment.lease_id]
        );

        if (
          settlementResult.rows.some(row =>
            ['finalized', 'settled'].includes(
              String(row.status).toLowerCase()
            )
          )
        ) {
          await client.query('ROLLBACK');

          return res.status(409).json({
            success: false,
            message:
              'Deposit verification is closed because the settlement has already been finalized.'
          });
        }

        // ====================================================
        // EXISTING: PREVENT DEPOSIT OVERPAYMENT
        // ====================================================

        const result = await client.query(
          `SELECT COALESCE(SUM(amount), 0) AS verified_total
           FROM security_deposit_payments
           WHERE lease_id = $1
             AND status = 'verified'`,
          [payment.lease_id]
        );

        const required = cents(leaseResult.rows[0].security_deposit);
        const verified = cents(result.rows[0].verified_total);
        const incoming = cents(payment.amount);

        if (verified + incoming > required) {
          await client.query('ROLLBACK');

          return res.status(409).json({
            success: false,
            message: 'Verification would exceed the required deposit.'
          });
        }
      }

      await client.query(
        `UPDATE security_deposit_payments
         SET
           status = $1,
           verified_by = $2,
           verified_at = NOW(),
           rejection_reason = $3
         WHERE deposit_payment_id = $4`,
        [
          decision,
          req.actor.id,
          decision === 'rejected' ? reason : null,
          paymentId
        ]
      );

      const updated = await client.query(
        `${depositQuery}
         WHERE dp.deposit_payment_id = $1`,
        [paymentId]
      );

      await client.query('COMMIT');

      return res.json({
        success: true,
        message: decision === 'verified'
          ? 'Security deposit payment verified.'
          : 'Security deposit payment rejected.',
        deposit: updated.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      next(error);
    } finally {
      client.release();
    }
  }
);

module.exports = router;
