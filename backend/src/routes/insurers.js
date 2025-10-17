import express from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';

const router = express.Router();

function validateInsurer(body) {
  const required = ['legal_name'];
  for (const k of required) if (!body[k]) return `${k} is required`;
  if (body.license_expiry) {
    const exp = new Date(body.license_expiry);
    const today = new Date();
    if (exp < new Date(today.toDateString())) return 'License expiry cannot be in the past';
  }
  if (body.naicom_license_no) {
    // Basic format placeholder: alphanumeric with dashes; exact format per doc should be enforced here if specified.
    const ok = /^[A-Za-z0-9\-\/]+$/.test(body.naicom_license_no);
    if (!ok) return 'Invalid NAICOM license format';
  }
  return null;
}

router.post('/', requireAuth, /* RBAC */ (req, res, next) => (req.user?.role === 'Admin' ? next() : res.status(403).json({ error: 'Forbidden' })), async (req, res) => {
  const err = validateInsurer(req.body);
  if (err) return res.status(400).json({ error: err });
  try {
    const { legal_name, trading_name, license_type, naicom_license_no, license_expiry, underwriting_email, claims_email, accepted_lobs = [], status } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO insurers (legal_name, trading_name, license_type, naicom_license_no, license_expiry, underwriting_email, claims_email, accepted_lobs, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [legal_name, trading_name || null, license_type || null, naicom_license_no || null, license_expiry || null, underwriting_email || null, claims_email || null, accepted_lobs, status || 'Active']
    );
    await logAudit({ user_id: req.user?.uid, action: 'CREATE', entity: 'Insurer', entity_id: rows[0].id });
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/', requireAuth, async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM insurers ORDER BY id DESC');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', requireAuth, /* RBAC */ (req, res, next) => (req.user?.role === 'Admin' ? next() : res.status(403).json({ error: 'Forbidden' })), async (req, res) => {
  try {
    const fields = ['legal_name','trading_name','license_type','naicom_license_no','license_expiry','underwriting_email','claims_email','accepted_lobs','status'];
    const set=[]; const vals=[];
    for (const f of fields) if (f in req.body) { set.push(`${f}=$${set.length+1}`); vals.push(req.body[f]); }
    if (!set.length) return res.status(400).json({ error: 'No fields' });
    vals.push(req.params.id);
    const { rows } = await pool.query(`UPDATE insurers SET ${set.join(', ')}, updated_at=NOW() WHERE id=$${vals.length} RETURNING *`, vals);
    await logAudit({ user_id: req.user?.uid, action: 'UPDATE', entity: 'Insurer', entity_id: req.params.id, details: { fields: Object.keys(req.body) } });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', requireAuth, /* RBAC */ (req, res, next) => (req.user?.role === 'Admin' ? next() : res.status(403).json({ error: 'Forbidden' })), async (req, res) => {
  try {
    await pool.query('DELETE FROM insurers WHERE id=$1', [req.params.id]);
    await logAudit({ user_id: req.user?.uid, action: 'DELETE', entity: 'Insurer', entity_id: req.params.id });
    res.status(204).end();
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;