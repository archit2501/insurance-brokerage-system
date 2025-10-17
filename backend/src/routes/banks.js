import express from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { validateNUBAN, validateIBAN } from '../utils/validators.js';
import { logAudit } from '../utils/audit.js';

const router = express.Router();

function validateAccount(body) {
  const required = ['owner_type','owner_id','bank_name','account_number','currency'];
  for (const k of required) if (!body[k]) return `${k} is required`;
  if (!['Client','Insurer','Agent'].includes(body.owner_type)) return 'Invalid owner_type';
  const country = (body.account_country || 'NG').toUpperCase();
  if (country === 'NG') {
    if (!validateNUBAN(body.account_number)) return 'Invalid NUBAN (Nigeria 10-digit)';
  } else {
    if (!validateIBAN(body.account_number)) return 'Invalid IBAN for foreign account';
  }
  return null;
}

router.post('/', requireAuth, /* RBAC */ (req, res, next) => (req.user?.role === 'Admin' ? next() : res.status(403).json({ error: 'Forbidden' })), async (req, res) => {
  const err = validateAccount(req.body);
  if (err) return res.status(400).json({ error: err });
  try {
    const { owner_type, owner_id, bank_name, branch, account_number, account_country = 'NG', currency, swift_bic, usage_receivable, usage_payable, is_default, statement_source, gl_code, active } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO bank_accounts (owner_type, owner_id, bank_name, branch, account_number, account_country, currency, swift_bic, usage_receivable, usage_payable, is_default, statement_source, gl_code, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [owner_type, owner_id, bank_name, branch || null, account_number, account_country.toUpperCase(), currency, swift_bic || null, !!usage_receivable, !!usage_payable, !!is_default, statement_source || null, gl_code || null, active !== false]
    );
    await logAudit({ user_id: req.user?.uid, action: 'CREATE', entity: 'BankAccount', entity_id: rows[0].id, details: { owner_type, owner_id } });
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Duplicate account for owner' });
    res.status(500).json({ error: e.message });
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM bank_accounts ORDER BY id DESC');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', requireAuth, /* RBAC */ (req, res, next) => (req.user?.role === 'Admin' ? next() : res.status(403).json({ error: 'Forbidden' })), async (req, res) => {
  try {
    const fields = ['bank_name','branch','account_number','account_country','currency','swift_bic','usage_receivable','usage_payable','is_default','statement_source','gl_code','active'];
    const set = [];
    const vals = [];
    for (const f of fields) if (f in req.body) { set.push(`${f}=$${set.length+1}`); vals.push(req.body[f]); }
    if (!set.length) return res.status(400).json({ error: 'No fields' });
    vals.push(req.params.id);
    const { rows } = await pool.query(`UPDATE bank_accounts SET ${set.join(', ')}, updated_at=NOW() WHERE id=$${vals.length} RETURNING *`, vals);
    await logAudit({ user_id: req.user?.uid, action: 'UPDATE', entity: 'BankAccount', entity_id: req.params.id, details: { fields: Object.keys(req.body) } });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', requireAuth, /* RBAC */ (req, res, next) => (req.user?.role === 'Admin' ? next() : res.status(403).json({ error: 'Forbidden' })), async (req, res) => {
  try {
    await pool.query('DELETE FROM bank_accounts WHERE id=$1', [req.params.id]);
    await logAudit({ user_id: req.user?.uid, action: 'DELETE', entity: 'BankAccount', entity_id: req.params.id });
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;