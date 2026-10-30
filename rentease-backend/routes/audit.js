const express = require('express');
const pool = require('../db');
const router = express.Router();

// Run BEFORE the auth routes. Only record selected authentication/account events.
// No passwords, request bodies, session identifiers, or personal identifiers in descriptions.
function auditCapture(req, res, next) {
  const path = req.path;
  const method = req.method.toUpperCase();
  let eventType = null;
  if (method === 'POST' && path === '/login') eventType = 'LOGIN';
  else if (method === 'POST' && path === '/signup') eventType = 'ACCOUNT_REGISTRATION';
  else if (method === 'POST' && path === '/logout') eventType = 'LOGOUT';
  else if (method === 'PATCH' && /^\/admin\/users\/\d+\/(approve|reject)$/.test(path)) {
    eventType = path.endsWith('/approve') ? 'ACCOUNT_APPROVED' : 'ACCOUNT_REJECTED';
  }
  // Rental operation events are captured after the existing route returns.
  // Only explicit mutation routes are monitored; GET and unrelated requests are ignored.
  const actions = [
    { method: 'POST', re: /^\/owner\/leases$/, type: 'LEASE_PREPARED', resource: 'lease', source: 'application_id', description: 'Property owner prepared a rental agreement.' },
    { method: 'PATCH', re: /^\/leases\/(\d+)\/confirm$/, type: 'LEASE_CONFIRMED', resource: 'lease', description: 'Tenant confirmed a rental agreement.' },
    { method: 'PATCH', re: /^\/owner\/leases\/(\d+)\/complete$/, type: 'LEASE_COMPLETED', resource: 'lease', description: 'Property owner completed a rental agreement.' },
    { method: 'POST', re: /^\/owner\/bills$/, type: 'BILL_CREATED', resource: 'lease', source: 'lease_id', description: 'Property owner issued a monthly bill.' },
    { method: 'POST', re: /^\/payments$/, type: 'PAYMENT_SUBMITTED', resource: 'bill', source: 'bill_id', description: 'Tenant submitted payment details for verification.' },
    { method: 'PATCH', re: /^\/owner\/payments\/(\d+)\/decision$/, type: 'PAYMENT_REVIEWED', resource: 'payment', description: 'Property owner reviewed a payment submission.' },
    { method: 'POST', re: /^\/maintenance$/, type: 'MAINTENANCE_CREATED', resource: 'unit', source: 'unit_id', description: 'Tenant submitted a maintenance request.' },
    { method: 'PATCH', re: /^\/owner\/maintenance\/(\d+)\/status$/, type: 'MAINTENANCE_UPDATED', resource: 'maintenance', description: 'Property owner changed a maintenance request status.' }
  ];
  const matched = actions.find(a => a.method === method && a.re.test(path));
  if (matched) {
    const idFromPath = path.match(matched.re)?.[1];
    const idFromBody = matched.source ? req.body?.[matched.source] : undefined;
    const rawTarget = idFromPath ?? idFromBody;
    const resourceId = /^\d+$/.test(String(rawTarget ?? '')) && Number.isSafeInteger(Number(rawTarget)) ? Number(rawTarget) : null;
    // Capture actor BEFORE logout/session changes. No request body is persisted.
    const actorId = req.session?.user?.id ?? null;
    const actorRole = req.session?.user?.role ?? null;
    res.once('finish', () => {
      const success = res.statusCode >= 200 && res.statusCode < 300;
      // If a mutation was blocked by authentication or server error, record its result.
      const description = success ? matched.description : `${matched.description.replace(/\.$/, '')} was unsuccessful.`;
      void pool.query(
        `INSERT INTO security_audit_events
         (event_type,outcome,actor_user_id,actor_role,description,ip_address,target_resource_type,target_resource_id)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
        [matched.type, success ? 'success' : 'failure', actorId, actorRole, description,
         String(req.ip || req.socket?.remoteAddress || '').slice(0,64), matched.resource, resourceId]
      ).catch(err => console.error('[Audit] Rental event write failed:', err.message));
    });
    return next();
  }
  if (!eventType) return next();

  const originalActorId = req.session?.user?.id;
  const originalActorRole = req.session?.user?.role;
  res.once('finish', () => {
    // Skip failed logout because session state may be inconsistent.
    const success = res.statusCode >= 200 && res.statusCode < 300;
    const actorId = req.session?.user?.id ?? originalActorId ?? null;
    const actorRole = req.session?.user?.role ?? originalActorRole ?? null;
    const targetMatch = path.match(/^\/admin\/users\/(\d+)\//);
    const targetId = targetMatch ? Number(targetMatch[1]) : null;
    const descriptionMap = {
      LOGIN: success ? 'Account signed in.' : 'Sign-in attempt was unsuccessful.',
      ACCOUNT_REGISTRATION: success ? 'New account registration submitted.' : 'Account registration was unsuccessful.',
      LOGOUT: success ? 'Account signed out.' : 'Sign-out attempt was unsuccessful.',
      ACCOUNT_APPROVED: success ? 'Administrator approved an account.' : 'Account approval was unsuccessful.',
      ACCOUNT_REJECTED: success ? 'Administrator rejected an account.' : 'Account rejection was unsuccessful.'
    };
    const rawIp = req.ip || req.socket?.remoteAddress || '';
    const ip = String(rawIp).slice(0, 64);
    void pool.query(
      `INSERT INTO security_audit_events
       (event_type,outcome,actor_user_id,actor_role,target_user_id,description,ip_address)
       VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [eventType, success ? 'success' : 'failure', actorId, actorRole, targetId, descriptionMap[eventType], ip]
    ).catch(err => console.error('[Audit] Could not write event:', err.message));
  });
  next();
}

router.get('/admin/audit-events', async (req, res, next) => {
  try {
    const sessionUser = req.session?.user;
    if (!sessionUser?.id) return res.status(401).json({ success: false, message: 'Please sign in.' });
    const active = await pool.query('SELECT role, account_status FROM app_users WHERE user_id=$1', [sessionUser.id]);
    if (!active.rows.length || active.rows[0].role !== 'admin' ||
        String(active.rows[0].account_status).toLowerCase() !== 'active' || sessionUser.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Administrator access required.' });
    }
    const type = String(req.query.type || 'all');
    const outcome = String(req.query.outcome || 'all');
    const permitted = ['LOGIN','LOGOUT','ACCOUNT_REGISTRATION','ACCOUNT_APPROVED','ACCOUNT_REJECTED',
      'LEASE_PREPARED','LEASE_CONFIRMED','LEASE_COMPLETED','BILL_CREATED',
      'PAYMENT_SUBMITTED','PAYMENT_REVIEWED','MAINTENANCE_CREATED','MAINTENANCE_UPDATED'];
    if ((type !== 'all' && !permitted.includes(type)) || !['all','success','failure'].includes(outcome)) {
      return res.status(400).json({ success: false, message: 'Invalid audit filter.' });
    }
    const page = Math.min(Math.max(parseInt(String(req.query.page || '1'),10) || 1,1),100000);
    const limit = 25;
    const where = `WHERE ($1::varchar='all' OR event_type=$1::varchar)
                   AND ($2::varchar='all' OR outcome=$2::varchar)`;
    const params = [type,outcome];
    const [count, rows] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS total FROM security_audit_events ${where}`,params),
      pool.query(`SELECT event_id,event_type,outcome,actor_role,actor_user_id,target_user_id,
        description,occurred_at,target_resource_type,target_resource_id FROM security_audit_events ${where}
        ORDER BY occurred_at DESC,event_id DESC LIMIT $3 OFFSET $4`, [...params,limit,(page-1)*limit])
    ]);
    return res.json({success:true,events:rows.rows,total:count.rows[0].total,page,pageSize:limit});
  } catch(e) { next(e); }
});
module.exports = { auditCapture, auditRouter: router };
