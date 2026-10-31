
'use strict';

const express = require('express');
const pool = require('../db');

const router = express.Router();

function validId(value) {
  const text = String(value ?? '');
  return /^[1-9]\d*$/.test(text) &&
    Number.isSafeInteger(Number(text));
}

function moneyCents(value) {
  const text = String(value ?? '').trim();

  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;

  const [whole, fractional = ''] = text.split('.');
  const result = Number(whole) * 100 +
    Number(fractional.padEnd(2, '0'));

  return Number.isSafeInteger(result) ? result : null;
}

function decimal(cents) {
  return (cents / 100).toFixed(2);
}

function fail(res, status, message) {
  return res.status(status).json({
    success: false,
    message
  });
}

function getError(error) {
  return error?.response?.data?.message ||
    error?.message ||
    'Unexpected server error.';
}

// ------------------------------------------------------------
// AUTH
// ------------------------------------------------------------

async function auth(req, res, next) {
  if (!validId(req.session?.user?.id)) {
    return fail(res, 401, 'Please sign in.');
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
      return fail(res, 403, 'Access denied.');
    }

    req.actor = {
      id: Number(user.user_id),
      role: String(user.role).toLowerCase()
    };

    next();
  } catch (error) {
    next(error);
  }
}

function allow(role) {
  return (req, res, next) => {
    if (req.actor.role !== role) {
      return fail(res, 403, 'Access denied.');
    }
    next();
  };
}

router.use(auth);

// ------------------------------------------------------------
// TRANSACTION HELPERS
// ------------------------------------------------------------

async function withTransaction(work) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function businessError(status, message) {
  const error = new Error(message);
  error.httpStatus = status;
  return error;
}

function sendError(res, next, error) {
  if (error.httpStatus) {
    return fail(res, error.httpStatus, error.message);
  }

  return next(error);
}

// Locking order for every mutation:
// lease -> settlement -> related rows.
//
// Lease ownership is derived from the property, not from
// user-supplied owner or tenant IDs.

async function lockOwnedLease(client, leaseId, actorId) {
  const result = await client.query(
    `SELECT
       l.lease_id,
       l.tenant_id,
       l.status AS lease_status,
       l.security_deposit,
       p.owner_id
     FROM leases l
     JOIN units u ON u.unit_id = l.unit_id
     JOIN properties p ON p.property_id = u.property_id
     WHERE l.lease_id = $1
     FOR UPDATE OF l`,
    [leaseId]
  );

  const lease = result.rows[0];

  if (!lease || Number(lease.owner_id) !== actorId) {
    throw businessError(404, 'Lease not found under your properties.');
  }

  return lease;
}

async function lockSettlement(client, settlementId, actorId) {
  // Find the lease ID first without taking a settlement row lock.
  const locator = await client.query(
    `SELECT lease_id
     FROM security_deposit_settlements
     WHERE settlement_id = $1`,
    [settlementId]
  );

  if (!locator.rows.length) {
    throw businessError(404, 'Settlement not found.');
  }

  const lease = await lockOwnedLease(
    client,
    locator.rows[0].lease_id,
    actorId
  );

  const result = await client.query(
    `SELECT *
     FROM security_deposit_settlements
     WHERE settlement_id = $1
     FOR UPDATE`,
    [settlementId]
  );

  if (!result.rows.length) {
    throw businessError(404, 'Settlement not found.');
  }

  return { lease, settlement: result.rows[0] };
}

async function totals(client, settlementId, leaseId) {
  const [payments, deductions, refunds] = await Promise.all([
    client.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM security_deposit_payments
       WHERE lease_id = $1
         AND status = 'verified'`,
      [leaseId]
    ),
    client.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM security_deposit_deductions
       WHERE settlement_id = $1`,
      [settlementId]
    ),
    client.query(
      `SELECT
         COALESCE(SUM(amount) FILTER (
           WHERE status = 'confirmed'
         ), 0) AS confirmed,
         COALESCE(SUM(amount) FILTER (
           WHERE status = 'pending'
         ), 0) AS pending
       FROM security_deposit_refunds
       WHERE settlement_id = $1`,
      [settlementId]
    )
  ]);

  const verified = moneyCents(payments.rows[0].total) ?? 0;
  const deducted = moneyCents(deductions.rows[0].total) ?? 0;
  const confirmed = moneyCents(refunds.rows[0].confirmed) ?? 0;
  const pending = moneyCents(refunds.rows[0].pending) ?? 0;

  return {
    verified,
    deducted,
    confirmed,
    pending,
    refundable: verified - deducted,
    availableToRefund: verified - deducted - confirmed - pending
  };
}

async function settlementDetails(client, settlementId) {
  const header = await client.query(
    `SELECT
       s.*,
       l.tenant_id,
       l.status AS lease_status,
       l.security_deposit,
       p.owner_id,
       p.property_name,
       u.unit_number,
       t.full_name AS tenant_name
     FROM security_deposit_settlements s
     JOIN leases l ON l.lease_id = s.lease_id
     JOIN units u ON u.unit_id = l.unit_id
     JOIN properties p ON p.property_id = u.property_id
     JOIN app_users t ON t.user_id = l.tenant_id
     WHERE s.settlement_id = $1`,
    [settlementId]
  );

  const record = header.rows[0];
  if (!record) return null;

  const [deductions, refunds, summary] = await Promise.all([
    client.query(
      `SELECT *
       FROM security_deposit_deductions
       WHERE settlement_id = $1
       ORDER BY deduction_id`,
      [settlementId]
    ),
    client.query(
      `SELECT *
       FROM security_deposit_refunds
       WHERE settlement_id = $1
       ORDER BY refund_id DESC`,
      [settlementId]
    ),
    totals(client, settlementId, record.lease_id)
  ]);

  // For drafts, expose totals only to the owner.
  // Tenant visibility is filtered in the list endpoint.
  return {
    ...record,
    deductions: deductions.rows,
    refunds: refunds.rows,
    summary: {
      verified_deposit: decimal(summary.verified),
      total_deductions: decimal(summary.deducted),
      refundable_amount: decimal(summary.refundable),
      confirmed_refunds: decimal(summary.confirmed),
      pending_refunds: decimal(summary.pending),
      remaining_refund: decimal(
        summary.verified -
        summary.deducted -
        summary.confirmed
      )
    }
  };
}

// ------------------------------------------------------------
// OWNER: LIST SETTLEMENTS
// ------------------------------------------------------------

router.get(
  '/owner/deposit-settlements',
  allow('owner'),
  async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT s.settlement_id
         FROM security_deposit_settlements s
         JOIN leases l ON l.lease_id = s.lease_id
         JOIN units u ON u.unit_id = l.unit_id
         JOIN properties p ON p.property_id = u.property_id
         WHERE p.owner_id = $1
         ORDER BY s.created_at DESC`,
        [req.actor.id]
      );

      const records = [];

      for (const row of result.rows) {
        records.push(
          await settlementDetails(pool, row.settlement_id)
        );
      }

      return res.json({
        success: true,
        settlements: records
      });
    } catch (error) {
      next(error);
    }
  }
);

// ------------------------------------------------------------
// TENANT: VIEW MY FINALIZED SETTLEMENTS
// ------------------------------------------------------------

router.get(
  '/deposit-settlements/my',
  allow('tenant'),
  async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT s.settlement_id
         FROM security_deposit_settlements s
         JOIN leases l ON l.lease_id = s.lease_id
         WHERE l.tenant_id = $1
           AND s.status IN ('finalized', 'settled')
         ORDER BY s.created_at DESC`,
        [req.actor.id]
      );

      const records = [];

      for (const row of result.rows) {
        records.push(
          await settlementDetails(pool, row.settlement_id)
        );
      }

      return res.json({
        success: true,
        settlements: records
      });
    } catch (error) {
      next(error);
    }
  }
);

// ------------------------------------------------------------
// OWNER: CREATE SETTLEMENT
// ------------------------------------------------------------

router.post(
  '/owner/deposit-settlements',
  allow('owner'),
  async (req, res, next) => {
    const leaseId = req.body?.lease_id;

    if (!validId(leaseId)) {
      return fail(res, 400, 'Valid lease ID required.');
    }

    try {
      const settlementId = await withTransaction(async client => {
        const lease = await lockOwnedLease(
          client,
          leaseId,
          req.actor.id
        );

        if (String(lease.lease_status).toLowerCase() !== 'completed') {
          throw businessError(
            409,
            'Complete the lease before creating a deposit settlement.'
          );
        }

        const existing = await client.query(
          `SELECT settlement_id
           FROM security_deposit_settlements
           WHERE lease_id = $1`,
          [leaseId]
        );

        if (existing.rows.length) {
          throw businessError(
            409,
            'A deposit settlement already exists for this lease.'
          );
        }

        const verified = await client.query(
          `SELECT COALESCE(SUM(amount), 0) AS total
           FROM security_deposit_payments
           WHERE lease_id = $1 AND status = 'verified'`,
          [leaseId]
        );

        if ((moneyCents(verified.rows[0].total) ?? 0) <= 0) {
          throw businessError(
            409,
            'No verified deposit collection exists for this lease.'
          );
        }

        const inserted = await client.query(
          `INSERT INTO security_deposit_settlements
             (lease_id, status, created_by)
           VALUES ($1, 'draft', $2)
           RETURNING settlement_id`,
          [leaseId, req.actor.id]
        );

        return inserted.rows[0].settlement_id;
      });

      return res.status(201).json({
        success: true,
        message: 'Deposit settlement draft created.',
        settlement: await settlementDetails(pool, settlementId)
      });
    } catch (error) {
      return sendError(res, next, error);
    }
  }
);

// ------------------------------------------------------------
// OWNER: ADD ITEMIZED DEDUCTION
// ------------------------------------------------------------

router.post(
  '/owner/deposit-settlements/:id/deductions',
  allow('owner'),
  async (req, res, next) => {
    const settlementId = req.params.id;
    const description = String(req.body?.description ?? '').trim();
    const evidenceNote = String(req.body?.evidence_note ?? '').trim();
    const amount = moneyCents(req.body?.amount);

    if (
      !validId(settlementId) ||
      description.length < 5 ||
      description.length > 2000 ||
      evidenceNote.length > 4000 ||
      amount === null ||
      amount <= 0
    ) {
      return fail(res, 400, 'Invalid deduction information.');
    }

    try {
      await withTransaction(async client => {
        const { lease, settlement } = await lockSettlement(
          client,
          settlementId,
          req.actor.id
        );

        if (settlement.status !== 'draft') {
          throw businessError(
            409,
            'Deductions cannot be changed after finalization.'
          );
        }

        const summary = await totals(
          client,
          settlementId,
          lease.lease_id
        );

        if (summary.deducted + amount > summary.verified) {
          throw businessError(
            409,
            'Deductions cannot exceed the verified deposit.'
          );
        }

        await client.query(
          `INSERT INTO security_deposit_deductions
             (settlement_id, description, amount, evidence_note)
           VALUES ($1, $2, $3, $4)`,
          [
            settlementId,
            description,
            decimal(amount),
            evidenceNote || null
          ]
        );
      });

      return res.status(201).json({
        success: true,
        message: 'Deduction added.',
        settlement: await settlementDetails(pool, settlementId)
      });
    } catch (error) {
      return sendError(res, next, error);
    }
  }
);

// ------------------------------------------------------------
// OWNER: DELETE DRAFT DEDUCTION
// ------------------------------------------------------------

router.delete(
  '/owner/deposit-settlements/:id/deductions/:deductionId',
  allow('owner'),
  async (req, res, next) => {
    const settlementId = req.params.id;
    const deductionId = req.params.deductionId;

    if (!validId(settlementId) || !validId(deductionId)) {
      return fail(res, 400, 'Invalid deduction ID.');
    }

    try {
      await withTransaction(async client => {
        const { settlement } = await lockSettlement(
          client,
          settlementId,
          req.actor.id
        );

        if (settlement.status !== 'draft') {
          throw businessError(
            409,
            'Only draft deductions can be removed.'
          );
        }

        const deleted = await client.query(
          `DELETE FROM security_deposit_deductions
           WHERE settlement_id = $1 AND deduction_id = $2
           RETURNING deduction_id`,
          [settlementId, deductionId]
        );

        if (!deleted.rows.length) {
          throw businessError(404, 'Deduction not found.');
        }
      });

      return res.json({
        success: true,
        message: 'Draft deduction removed.',
        settlement: await settlementDetails(pool, settlementId)
      });
    } catch (error) {
      return sendError(res, next, error);
    }
  }
);

// ------------------------------------------------------------
// OWNER: FINALIZE SETTLEMENT
// ------------------------------------------------------------

router.patch(
  '/owner/deposit-settlements/:id/finalize',
  allow('owner'),
  async (req, res, next) => {
    const settlementId = req.params.id;

    if (!validId(settlementId)) {
      return fail(res, 400, 'Invalid settlement ID.');
    }

    try {
      await withTransaction(async client => {
        const { lease, settlement } = await lockSettlement(
          client,
          settlementId,
          req.actor.id
        );

        if (settlement.status !== 'draft') {
          throw businessError(
            409,
            'Settlement has already been finalized.'
          );
        }

        if (String(lease.lease_status).toLowerCase() !== 'completed') {
          throw businessError(409, 'Lease must be completed.');
        }

        const pendingPayments = await client.query(
          `SELECT COUNT(*)::int AS count
           FROM security_deposit_payments
           WHERE lease_id = $1
             AND status = 'pending_verification'`,
          [lease.lease_id]
        );

        if (pendingPayments.rows[0].count > 0) {
          throw businessError(
            409,
            'Review pending deposit payments before finalizing.'
          );
        }

        const summary = await totals(
          client,
          settlementId,
          lease.lease_id
        );

        if (
          summary.verified <= 0 ||
          summary.deducted > summary.verified
        ) {
          throw businessError(
            409,
            'Invalid verified deposit or deduction total.'
          );
        }

        // No refundable amount means nothing needs to be transferred.
        const newStatus =
          summary.refundable === 0 ? 'settled' : 'finalized';

        
await client.query(
  `UPDATE security_deposit_settlements
   SET status = $1::varchar,
       finalized_at = NOW(),
       settled_at = CASE
         WHEN $1::varchar = 'settled'::varchar THEN NOW()
         ELSE NULL
       END
   WHERE settlement_id = $2`,
  [newStatus, settlementId]
);

      });

      return res.json({
        success: true,
        message: 'Deposit settlement finalized.',
        settlement: await settlementDetails(pool, settlementId)
      });
    } catch (error) {
      return sendError(res, next, error);
    }
  }
);

// ------------------------------------------------------------
// OWNER: RECORD REFUND
// ------------------------------------------------------------

router.post(
  '/owner/deposit-settlements/:id/refunds',
  allow('owner'),
  async (req, res, next) => {
    const settlementId = req.params.id;
    const amount = moneyCents(req.body?.amount);
    const method = String(req.body?.payment_method ?? '')
      .trim().toLowerCase();
    const reference = String(req.body?.reference_number ?? '').trim();

    if (
      !validId(settlementId) ||
      amount === null ||
      amount <= 0 ||
      !['cash', 'gcash', 'bank_transfer', 'other'].includes(method) ||
      reference.length > 150 ||
      (method !== 'cash' && !reference)
    ) {
      return fail(res, 400, 'Invalid refund details.');
    }

    try {
      await withTransaction(async client => {
        const { lease, settlement } = await lockSettlement(
          client,
          settlementId,
          req.actor.id
        );

        if (settlement.status !== 'finalized') {
          throw businessError(
            409,
            'Finalize the settlement before recording a refund.'
          );
        }

        const summary = await totals(
          client,
          settlementId,
          lease.lease_id
        );

        if (amount > summary.availableToRefund) {
          throw businessError(
            409,
            'Refund exceeds the remaining refundable balance.'
          );
        }

        await client.query(
          `INSERT INTO security_deposit_refunds
             (
               settlement_id,
               amount,
               payment_method,
               reference_number,
               status,
               recorded_by
             )
           VALUES ($1, $2, $3, $4, 'pending', $5)`,
          [
            settlementId,
            decimal(amount),
            method,
            reference || null,
            req.actor.id
          ]
        );
      });

      return res.status(201).json({
        success: true,
        message: 'Refund recorded. Confirm after actual payout.',
        settlement: await settlementDetails(pool, settlementId)
      });
    } catch (error) {
      return sendError(res, next, error);
    }
  }
);

// ------------------------------------------------------------
// OWNER: CONFIRM OR CANCEL REFUND
// ------------------------------------------------------------

router.patch(
  '/owner/deposit-settlements/:id/refunds/:refundId',
  allow('owner'),
  async (req, res, next) => {
    const settlementId = req.params.id;
    const refundId = req.params.refundId;
    const decision = req.body?.decision;

    if (
      !validId(settlementId) ||
      !validId(refundId) ||
      !['confirmed', 'cancelled'].includes(decision)
    ) {
      return fail(res, 400, 'Invalid refund decision.');
    }

    try {
      await withTransaction(async client => {
        const { lease, settlement } = await lockSettlement(
          client,
          settlementId,
          req.actor.id
        );

        if (settlement.status !== 'finalized') {
          throw businessError(
            409,
            'Settlement is not awaiting refunds.'
          );
        }

        const refundResult = await client.query(
          `SELECT *
           FROM security_deposit_refunds
           WHERE refund_id = $1
             AND settlement_id = $2
           FOR UPDATE`,
          [refundId, settlementId]
        );

        const refund = refundResult.rows[0];

        if (!refund) {
          throw businessError(404, 'Refund not found.');
        }

        if (refund.status !== 'pending') {
          throw businessError(
            409,
            'Refund has already been reviewed.'
          );
        }

        
await client.query(
  `UPDATE security_deposit_refunds
   SET status = $1::varchar,
       confirmed_at = CASE
         WHEN $1::varchar = 'confirmed'::varchar THEN NOW()
         ELSE NULL
       END
   WHERE refund_id = $2`,
  [decision, refundId]
);


        const summary = await totals(
          client,
          settlementId,
          lease.lease_id
        );

        if (
          summary.confirmed === summary.refundable &&
          summary.pending === 0
        ) {
          await client.query(
            `UPDATE security_deposit_settlements
             SET status = 'settled',
                 settled_at = NOW()
             WHERE settlement_id = $1`,
            [settlementId]
          );
        }
      });

      return res.json({
        success: true,
        message: decision === 'confirmed'
          ? 'Refund payout confirmed.'
          : 'Pending refund cancelled.',
        settlement: await settlementDetails(pool, settlementId)
      });
    } catch (error) {
      return sendError(res, next, error);
    }
  }
);

module.exports = router;
