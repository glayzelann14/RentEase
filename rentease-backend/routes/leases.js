'use strict';
const express = require('express');
const pool = require('../db');
const router = express.Router();
const validId = x => /^\d+$/.test(String(x)) && Number.isSafeInteger(Number(x)) && Number(x) > 0;
async function auth(req,res,next) {
  if (!validId(req.session?.user?.id)) return res.status(401).json({success:false,message:'Please sign in.'});
  try {
    const r=await pool.query('SELECT user_id, role, account_status FROM app_users WHERE user_id=$1',[req.session.user.id]);
    const u=r.rows[0];
    if (!u || String(u.account_status).toLowerCase() !== 'active' || u.role !== req.session.user.role) return res.status(403).json({success:false,message:'Session expired or account inactive.'});
    req.currentUser={id:Number(u.user_id),role:u.role};next();
  } catch(e){next(e)}
}
const owner=(req,res,next)=>req.currentUser.role==='owner'?next():res.status(403).json({success:false,message:'Owner access required.'});
const tenant=(req,res,next)=>req.currentUser.role==='tenant'?next():res.status(403).json({success:false,message:'Tenant access required.'});
router.use(auth);
const leaseSelect=`SELECT l.lease_id,l.application_id,l.tenant_id,l.unit_id,l.start_date,l.end_date,
 l.monthly_rent,l.security_deposit,l.status, t.full_name AS tenant_name,
 u.unit_number,p.property_name,p.owner_id
 FROM leases l JOIN app_users t ON t.user_id=l.tenant_id
 JOIN units u ON u.unit_id=l.unit_id JOIN properties p ON p.property_id=u.property_id`;
router.get('/owner/leases',owner,async(req,res,next)=>{try {
 const r=await pool.query(`${leaseSelect} WHERE p.owner_id=$1 ORDER BY l.lease_id DESC`,[req.currentUser.id]);res.json({success:true,leases:r.rows});
}catch(e){next(e)}});
router.get('/leases/my',tenant,async(req,res,next)=>{try {
 const r=await pool.query(`${leaseSelect} WHERE l.tenant_id=$1 ORDER BY l.lease_id DESC`,[req.currentUser.id]);res.json({success:true,leases:r.rows});
}catch(e){next(e)}});
// Owner prepares a lease only for their approved application / reserved unit.
router.post('/owner/leases',owner,async(req,res,next)=>{
 const {application_id,security_deposit=0}=req.body||{};
 const deposit=Number(security_deposit);
 if(!validId(application_id)||!Number.isFinite(deposit)||deposit<0||deposit>100000000)
   return res.status(400).json({success:false,message:'Valid application and nonnegative deposit required.'});
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const info=await client.query(`SELECT a.application_id,a.tenant_id,a.unit_id,a.status AS application_status,
  a.move_in_date,a.lease_duration_months,u.monthly_rent,u.status AS unit_status,p.owner_id
  FROM applications a JOIN units u ON u.unit_id=a.unit_id
  JOIN properties p ON p.property_id=u.property_id WHERE a.application_id=$1`,[application_id]);
  if(!info.rows.length||Number(info.rows[0].owner_id)!==req.currentUser.id){await client.query('ROLLBACK');return res.status(404).json({success:false,message:'Approved application not found under your properties.'})}
  const a=info.rows[0];
  await client.query('SELECT unit_id FROM units WHERE unit_id=$1 FOR UPDATE',[a.unit_id]);
  if(String(a.application_status).toLowerCase()!=='approved'||String(a.unit_status).toLowerCase()!=='reserved'){
   await client.query('ROLLBACK');return res.status(409).json({success:false,message:'Application must be approved and unit reserved.'});
  }
  const existing=await client.query("SELECT lease_id FROM leases WHERE (application_id=$1 OR unit_id=$2) AND LOWER(status) IN ('pending','active') LIMIT 1",[application_id,a.unit_id]);
  if(existing.rows.length){await client.query('ROLLBACK');return res.status(409).json({success:false,message:'A pending or active lease already exists.'})}
  const months=Number(a.lease_duration_months);
  if(!Number.isInteger(months)||months<1||months>120){await client.query('ROLLBACK');return res.status(409).json({success:false,message:'Invalid application lease duration.'})}
  // Date arithmetic in PostgreSQL: end date inclusive, clamp same calendar day when necessary.
  const inserted=await client.query(`INSERT INTO leases
  (application_id,tenant_id,unit_id,start_date,end_date,monthly_rent,security_deposit,status)
  SELECT $1,$2,$3,$4::date,($4::date + ($5::int || ' months')::interval - interval '1 day')::date,$6,$7,'pending'
  RETURNING lease_id`,[a.application_id,a.tenant_id,a.unit_id,a.move_in_date,months,a.monthly_rent,deposit]);
  const r=await client.query(`${leaseSelect} WHERE l.lease_id=$1`,[inserted.rows[0].lease_id]);
  await client.query('COMMIT');res.status(201).json({success:true,lease:r.rows[0]});
 }catch(e){await client.query('ROLLBACK');next(e)}finally{client.release()}
});
router.patch('/leases/:id/confirm',tenant,async(req,res,next)=>{
 if(!validId(req.params.id))return res.status(400).json({success:false,message:'Invalid lease ID.'});
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const basic=await client.query('SELECT unit_id FROM leases WHERE lease_id=$1 AND tenant_id=$2',[req.params.id,req.currentUser.id]);
  if(!basic.rows.length){await client.query('ROLLBACK');return res.status(404).json({success:false,message:'Lease not found.'})}
  await client.query('SELECT unit_id FROM units WHERE unit_id=$1 FOR UPDATE',[basic.rows[0].unit_id]);
  const found=await client.query('SELECT * FROM leases WHERE lease_id=$1 AND tenant_id=$2 FOR UPDATE',[req.params.id,req.currentUser.id]);
  if(String(found.rows[0].status).toLowerCase()!=='pending') {await client.query('ROLLBACK');return res.status(409).json({success:false,message:'Lease is not pending confirmation.'})}
  const updatedUnit=await client.query("UPDATE units SET status='occupied' WHERE unit_id=$1 AND LOWER(status)='reserved' RETURNING unit_id",[basic.rows[0].unit_id]);
  if (!updatedUnit.rows.length) { await client.query('ROLLBACK');return res.status(409).json({success:false,message:'Unit is no longer reserved. Contact the owner.'}) }
  const r=await client.query("UPDATE leases SET status='active' WHERE lease_id=$1 RETURNING lease_id",[req.params.id]);
  const lease=await client.query(`${leaseSelect} WHERE l.lease_id=$1`,[r.rows[0].lease_id]);
  await client.query('COMMIT');res.json({success:true,lease:lease.rows[0]});
 }catch(e){await client.query('ROLLBACK');next(e)}finally{client.release()}
});
router.patch('/owner/leases/:id/complete',owner,async(req,res,next)=>{
 if(!validId(req.params.id))return res.status(400).json({success:false,message:'Invalid lease ID.'});
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const r=await client.query(`${leaseSelect} WHERE l.lease_id=$1`,[req.params.id]);
  if(!r.rows.length||Number(r.rows[0].owner_id)!==req.currentUser.id){await client.query('ROLLBACK');return res.status(404).json({success:false,message:'Lease not found.'})}
  await client.query('SELECT unit_id FROM units WHERE unit_id=$1 FOR UPDATE',[r.rows[0].unit_id]);
  const changed=await client.query("UPDATE leases SET status='completed' WHERE lease_id=$1 AND LOWER(status)='active' RETURNING lease_id",[req.params.id]);
  if(!changed.rows.length){await client.query('ROLLBACK');return res.status(409).json({success:false,message:'Only active leases can be completed.'})}
  await client.query("UPDATE units SET status='available' WHERE unit_id=$1 AND LOWER(status)='occupied'",[r.rows[0].unit_id]);
  const result=await client.query(`${leaseSelect} WHERE l.lease_id=$1`,[req.params.id]);
  await client.query('COMMIT');res.json({success:true,lease:result.rows[0]});
 }catch(e){await client.query('ROLLBACK');next(e)}finally{client.release()}
});
module.exports=router;
