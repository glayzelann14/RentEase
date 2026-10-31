'use strict';
const express=require('express');
const pool=require('../db');
const router=express.Router();
const validId=x=>/^\d+$/.test(String(x))&&Number.isSafeInteger(Number(x))&&Number(x)>0;
const money=x=>Number.isFinite(Number(x))&&Number(x)>=0&&Number(x)<=100000000;
async function auth(req,res,next){
 if(!validId(req.session?.user?.id))return res.status(401).json({success:false,message:'Please log in.'});
 try {const r=await pool.query('SELECT user_id,role,account_status FROM app_users WHERE user_id=$1',[req.session.user.id]);const u=r.rows[0];if(!u||u.role!==req.session.user.role||String(u.account_status).toLowerCase()!=='active')return res.status(403).json({success:false,message:'Account inactive or session outdated.'});req.actor={id:Number(u.user_id),role:u.role};next();}catch(e){next(e)}
}
const allow=role=>(req,res,next)=>req.actor.role===role?next():res.status(403).json({success:false,message:'Access denied.'});
router.use(auth);
const billQuery=`SELECT b.bill_id,b.lease_id,b.billing_period,b.rent_amount,b.water_charge,b.electricity_charge,b.other_charges,b.due_date,b.status,
 l.tenant_id,l.unit_id,u.unit_number,p.property_name,p.owner_id,t.full_name AS tenant_name,
 (b.rent_amount+COALESCE(b.water_charge,0)+COALESCE(b.electricity_charge,0)+COALESCE(b.other_charges,0)) AS total_amount,
 COALESCE((SELECT SUM(py.amount) FROM payments py WHERE py.bill_id=b.bill_id AND py.status='verified'),0) AS verified_amount
 FROM billing b JOIN leases l ON l.lease_id=b.lease_id JOIN units u ON u.unit_id=l.unit_id JOIN properties p ON p.property_id=u.property_id JOIN app_users t ON t.user_id=l.tenant_id`;
const paymentQuery=`SELECT py.payment_id,py.bill_id,py.amount,py.payment_method,py.reference_number,py.payment_date,py.status,py.verified_by,py.verified_at,
 b.lease_id,l.tenant_id,u.unit_number,p.property_name,p.owner_id,t.full_name AS tenant_name
 FROM payments py JOIN billing b ON b.bill_id=py.bill_id JOIN leases l ON l.lease_id=b.lease_id JOIN units u ON u.unit_id=l.unit_id JOIN properties p ON p.property_id=u.property_id JOIN app_users t ON t.user_id=l.tenant_id`;
router.get('/owner/bills',allow('owner'),async(req,res,next)=>{try{const r=await pool.query(`${billQuery} WHERE p.owner_id=$1 ORDER BY b.billing_period DESC,b.bill_id DESC`,[req.actor.id]);res.json({success:true,bills:r.rows});}catch(e){next(e)}});
router.get('/billing/my',allow('tenant'),async(req,res,next)=>{try{const r=await pool.query(`${billQuery} WHERE l.tenant_id=$1 ORDER BY b.billing_period DESC,b.bill_id DESC`,[req.actor.id]);res.json({success:true,bills:r.rows});}catch(e){next(e)}});
router.post('/owner/bills',allow('owner'),async(req,res,next)=>{
 const {lease_id,billing_period,due_date,water_charge=0,electricity_charge=0,other_charges=0}=req.body||{};
 if(!validId(lease_id)||!/^\d{4}-\d{2}-\d{2}$/.test(String(billing_period))||!/^\d{4}-\d{2}-\d{2}$/.test(String(due_date))||![water_charge,electricity_charge,other_charges].every(money))return res.status(400).json({success:false,message:'Valid lease, billing period, due date and nonnegative charges required.'});
 if(billing_period.slice(8)!=='01')return res.status(400).json({success:false,message:'Billing period must be the first day of its month (YYYY-MM-01).'});
 const client=await pool.connect();try{await client.query('BEGIN');const r=await client.query(`SELECT l.lease_id,l.monthly_rent,l.status,p.owner_id FROM leases l JOIN units u ON u.unit_id=l.unit_id JOIN properties p ON p.property_id=u.property_id WHERE l.lease_id=$1 FOR UPDATE OF l`,[lease_id]);
 if(!r.rows.length||Number(r.rows[0].owner_id)!==req.actor.id){await client.query('ROLLBACK');return res.status(404).json({success:false,message:'Lease not found under your properties.'})}
 if(String(r.rows[0].status).toLowerCase()!=='active'){await client.query('ROLLBACK');return res.status(409).json({success:false,message:'Bills can only be issued for active leases.'})}
 const insert=await client.query(`INSERT INTO billing(lease_id,billing_period,rent_amount,water_charge,electricity_charge,other_charges,due_date,status) VALUES($1,$2::date,$3,$4,$5,$6,$7::date,'unpaid') RETURNING bill_id`,[lease_id,billing_period,r.rows[0].monthly_rent,water_charge,electricity_charge,other_charges,due_date]);
 const bill=await client.query(`${billQuery} WHERE b.bill_id=$1`,[insert.rows[0].bill_id]);await client.query('COMMIT');res.status(201).json({success:true,bill:bill.rows[0]});
 }catch(e){await client.query('ROLLBACK');if(e.code==='23505')return res.status(409).json({success:false,message:'A bill already exists for this lease and month.'});if(e.code==='22008'||e.code==='22007')return res.status(400).json({success:false,message:'Invalid billing or due date.'});
 if(e.code==='22003')return res.status(400).json({success:false,message:'One of the billing amounts exceeds the allowed database limit. Ask the administrator to check the billing table amount columns.'});
 if(e.code==='23514')return res.status(400).json({success:false,message:'One of the bill amounts or dates violates a billing rule. Please review the charges and contact the administrator if they are correct.'});
 console.error('[RentEase billing] Create bill failed:',{code:e.code,constraint:e.constraint,column:e.column,detail:e.detail});next(e)}finally{client.release()}
});
router.get('/owner/payments',allow('owner'),async(req,res,next)=>{try{const r=await pool.query(`${paymentQuery} WHERE p.owner_id=$1 ORDER BY py.payment_date DESC,py.payment_id DESC`,[req.actor.id]);res.json({success:true,payments:r.rows})}catch(e){next(e)}});
router.get('/payments/my',allow('tenant'),async(req,res,next)=>{try{const r=await pool.query(`${paymentQuery} WHERE l.tenant_id=$1 ORDER BY py.payment_date DESC,py.payment_id DESC`,[req.actor.id]);res.json({success:true,payments:r.rows})}catch(e){next(e)}});
router.post('/payments',allow('tenant'),async(req,res,next)=>{
 const {bill_id,amount,payment_method,reference_number}=req.body||{};
 const method=String(payment_method||'').toLowerCase();const ref=String(reference_number||'').trim();
 if(!validId(bill_id)||!money(amount)||Number(amount)<=0||!['cash','gcash','bank_transfer','other'].includes(method)||ref.length>150||(!ref&&method!=='cash'))return res.status(400).json({success:false,message:'Enter a valid bill, positive amount, payment method and reference.'});
 const client=await pool.connect();try{await client.query('BEGIN');const r=await client.query(`${billQuery} WHERE b.bill_id=$1 FOR UPDATE OF b`,[bill_id]);const b=r.rows[0];if(!b||Number(b.tenant_id)!==req.actor.id){await client.query('ROLLBACK');return res.status(404).json({success:false,message:'Bill not found.'})}
 const outstanding=Number(b.total_amount)-Number(b.verified_amount);if(outstanding<=0||Number(amount)>outstanding+0.001){await client.query('ROLLBACK');return res.status(409).json({success:false,message:'Payment exceeds the unpaid balance or the bill is already paid.'})}
 const p=await client.query(`INSERT INTO payments(bill_id,amount,payment_method,reference_number,status) VALUES($1,$2,$3,$4,'pending_verification') RETURNING payment_id`,[bill_id,Number(amount).toFixed(2),method,ref||null]);const result=await client.query(`${paymentQuery} WHERE py.payment_id=$1`,[p.rows[0].payment_id]);await client.query('COMMIT');res.status(201).json({success:true,payment:result.rows[0]});
 }catch(e){await client.query('ROLLBACK');next(e)}finally{client.release()}
});
router.patch('/owner/payments/:id/decision',allow('owner'),async(req,res,next)=>{
 if(!validId(req.params.id)||!['verified','rejected'].includes(req.body?.decision))return res.status(400).json({success:false,message:'Valid payment ID and decision required.'});
 const client=await pool.connect();try{await client.query('BEGIN');const info=await client.query(`SELECT py.bill_id,p.owner_id FROM payments py JOIN billing b ON b.bill_id=py.bill_id JOIN leases l ON l.lease_id=b.lease_id JOIN units u ON u.unit_id=l.unit_id JOIN properties p ON p.property_id=u.property_id WHERE py.payment_id=$1`,[req.params.id]);if(!info.rows.length||Number(info.rows[0].owner_id)!==req.actor.id){await client.query('ROLLBACK');return res.status(404).json({success:false,message:'Payment not found for your property.'})}
 // Lock bill first, then payment so concurrent approvals cannot overpay the bill.
 const bill=await client.query(`${billQuery} WHERE b.bill_id=$1 FOR UPDATE OF b`,[info.rows[0].bill_id]);const payment=await client.query('SELECT * FROM payments WHERE payment_id=$1 FOR UPDATE',[req.params.id]);const p=payment.rows[0];if(p.status!=='pending_verification'){await client.query('ROLLBACK');return res.status(409).json({success:false,message:'Payment was already reviewed.'})}
 if(req.body.decision==='verified'&&Number(p.amount)>Number(bill.rows[0].total_amount)-Number(bill.rows[0].verified_amount)+0.001){await client.query('ROLLBACK');return res.status(409).json({success:false,message:'Payment would exceed the remaining bill balance.'})}
 await client.query('UPDATE payments SET status=$1,verified_by=$2,verified_at=NOW() WHERE payment_id=$3',[req.body.decision,req.actor.id,req.params.id]);
 const sums=await client.query(`SELECT COALESCE(SUM(amount),0) AS amount FROM payments WHERE bill_id=$1 AND status='verified'`,[p.bill_id]);const total=Number(bill.rows[0].total_amount),paid=Number(sums.rows[0].amount);const newStatus=paid>=total-0.001?'paid':paid>0?'partially_paid':'unpaid';await client.query('UPDATE billing SET status=$1 WHERE bill_id=$2',[newStatus,p.bill_id]);
 const result=await client.query(`${paymentQuery} WHERE py.payment_id=$1`,[req.params.id]);await client.query('COMMIT');res.json({success:true,payment:result.rows[0]});
 }catch(e){await client.query('ROLLBACK');next(e)}finally{client.release()}
});
module.exports=router;
