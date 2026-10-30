const express = require('express');
const pool = require('../db');
const router = express.Router();

// Server-side verification. Never authorize using browser role alone.
async function requireActiveAdmin(req, res, next) {
  const session = req.session?.user;
  if (!session?.id || session.role !== 'admin') {
    return res.status(session?.id ? 403 : 401).json({success:false,message:'Administrator login required.'});
  }
  try {
    const {rows} = await pool.query('SELECT role, account_status FROM app_users WHERE user_id=$1', [session.id]);
    if (rows[0]?.role !== 'admin' || String(rows[0]?.account_status).toLowerCase() !== 'active') {
      return res.status(403).json({success:false,message:'Administrator account is not active.'});
    }
    next();
  } catch (error) { next(error); }
}
router.use(requireActiveAdmin);

// Read-only, platform-wide oversight. No mutation routes here.
router.get('/admin/overview', async (req, res, next) => {
  try {
    const [properties, bills, leases, maintenance] = await Promise.all([
      pool.query(`SELECT p.property_id AS id, p.property_name AS name,
        COALESCE(o.full_name,'Unknown owner') AS owner,
        COUNT(u.unit_id)::int AS units,
        COALESCE(NULLIF(p.city,''),p.address) AS location
        FROM properties p JOIN app_users o ON o.user_id=p.owner_id
        LEFT JOIN units u ON u.property_id=p.property_id
        GROUP BY p.property_id,p.property_name,p.city,p.address,o.full_name
        ORDER BY p.property_id DESC`),
      pool.query(`SELECT b.bill_id AS id, COALESCE(t.full_name,'Unknown tenant') AS tenant,
        CONCAT(p.property_name,' - Unit ',u.unit_number) AS unit,
        TO_CHAR(b.billing_period,'FMMonth YYYY') AS period,
        (b.rent_amount+COALESCE(b.water_charge,0)+COALESCE(b.electricity_charge,0)+COALESCE(b.other_charges,0))::numeric AS amount,
        CASE WHEN (b.rent_amount+COALESCE(b.water_charge,0)+COALESCE(b.electricity_charge,0)+COALESCE(b.other_charges,0))-COALESCE(v.verified,0)<=0 THEN 'PAID'
             WHEN b.due_date<CURRENT_DATE THEN 'OVERDUE'
             WHEN COALESCE(v.verified,0)>0 THEN 'PARTIALLY PAID'
             ELSE UPPER(b.status) END AS status
        FROM billing b JOIN leases l ON l.lease_id=b.lease_id
        JOIN app_users t ON t.user_id=l.tenant_id
        JOIN units u ON u.unit_id=l.unit_id JOIN properties p ON p.property_id=u.property_id
        LEFT JOIN LATERAL (SELECT SUM(pay.amount) AS verified FROM payments pay WHERE pay.bill_id=b.bill_id AND pay.status='verified') v ON TRUE
        ORDER BY b.billing_period DESC,b.bill_id DESC`),
      pool.query(`SELECT l.lease_id AS id, COALESCE(t.full_name,'Unknown tenant') AS tenant,
        CONCAT(p.property_name,' - Unit ',u.unit_number) AS unit,
        TO_CHAR(l.start_date,'YYYY-MM-DD') AS start, TO_CHAR(l.end_date,'YYYY-MM-DD') AS "end",
        UPPER(l.status) AS status
        FROM leases l JOIN app_users t ON t.user_id=l.tenant_id
        JOIN units u ON u.unit_id=l.unit_id JOIN properties p ON p.property_id=u.property_id
        ORDER BY l.lease_id DESC`),
      pool.query(`SELECT m.request_id AS id,
        CONCAT(p.property_name,' - Unit ',u.unit_number) AS unit,
        m.category, m.problem_description AS description,
        REPLACE(UPPER(m.status),'_',' ') AS status
        FROM maintenance_requests m JOIN units u ON u.unit_id=m.unit_id
        JOIN properties p ON p.property_id=u.property_id
        ORDER BY m.created_at DESC NULLS LAST,m.request_id DESC`)
    ]);
    res.json({success:true,properties:properties.rows,bills:bills.rows,leases:leases.rows,maintenance:maintenance.rows});
  } catch (error) { next(error); }
});
module.exports=router;
