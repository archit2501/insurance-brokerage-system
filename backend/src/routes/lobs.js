import express from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { pctInRange } from '../utils/validators.js';
import { logAudit } from '../utils/audit.js';

const router = express.Router();

function validateLOB(body) {
  if (!body.name) return 'name is required';
  if (!pctInRange(body.default_brokerage_pct)) return 'default_brokerage_pct 0-100';
  if (!pctInRange(body.default_vat_pct)) return 'default_vat_pct 0-100';
  return null;
}

router.post('/', requireAuth, /* RBAC */ (req, res, next) => (req.user?.role === 'Admin' ? next() : res.status(403).json({ error: 'Forbidden' })), async (req, res) => {
  const err = validateLOB(req.body);
  if (err) return res.status(400).json({ error: err });
  try {
    const { name, default_brokerage_pct = 0, default_vat_pct = 7.5, rate_basis, rating_inputs, min_premium = 0, wording_refs } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO lobs (name, default_brokerage_pct, default_vat_pct, rate_basis, rating_inputs, min_premium, wording_refs)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name, default_brokerage_pct, default_vat_pct, rate_basis || null, rating_inputs || null, min_premium, wording_refs || null]
    );
    await logAudit({ user_id: req.user?.uid, action: 'CREATE', entity: 'LOB', entity_id: rows[0].id, details: { name } });
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'LOB name exists' });
    res.status(500).json({ error: e.message });
  }
});

router.get('/', requireAuth, async (_req, res) => {
  try { const { rows } = await pool.query('SELECT * FROM lobs ORDER BY id DESC'); res.json(rows); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:lobId/sub', requireAuth, /* RBAC */ (req, res, next) => (req.user?.role === 'Admin' ? next() : res.status(403).json({ error: 'Forbidden' })), async (req, res) => {
  try {
    const lobId = req.params.lobId;
    const { name, brokerage_pct, vat_pct, rate_basis, rating_inputs, min_premium, wording_refs } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    if (!pctInRange(brokerage_pct ?? 0)) return res.status(400).json({ error: 'brokerage_pct 0-100' });
    if (!pctInRange(vat_pct ?? 0)) return res.status(400).json({ error: 'vat_pct 0-100' });
    const { rows } = await pool.query(
      `INSERT INTO sub_lobs (lob_id, name, brokerage_pct, vat_pct, rate_basis, rating_inputs, min_premium, wording_refs)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [lobId, name, brokerage_pct || null, vat_pct || null, rate_basis || null, rating_inputs || null, min_premium || null, wording_refs || null]
    );
    await logAudit({ user_id: req.user?.uid, action: 'CREATE', entity: 'SubLOB', entity_id: rows[0].id, details: { lob_id: lobId, name } });
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Sub-LOB name exists for LOB' });
    res.status(500).json({ error: e.message });
  }
});

router.get('/:lobId/sub', requireAuth, async (req, res) => {
  try { const { rows } = await pool.query('SELECT * FROM sub_lobs WHERE lob_id=$1 ORDER BY id DESC', [req.params.lobId]); res.json(rows); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;