import express from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';

const router = express.Router();

function requireFields(body, fields) {
  for (const f of fields) if (body[f] === undefined || body[f] === null || body[f] === '') return `${f} is required`;
  return null;
}

router.post('/', requireAuth, async (req, res) => {
  try {
    const required = ['client_id','insurer_id','lob_id','period_from','period_to','gross_premium','currency'];
    const err = requireFields(req.body, required);
    if (err) return res.status(400).json({ error: err });

    const {
      client_id, insurer_id, agent_id = null, lob_id, sub_lob_id = null, period_from, period_to,
      sum_insured = null, gross_premium, rate_pct = null, currency, exchange_rate = null, payment_terms = null,
      payment_status = null, placement_mode = null, brokerage_pct = null, agent_commission_pct = null,
      levy_niacom = null, levy_ncrib = null, levy_ed_tax = null
    } = req.body;

    // Validate currency/exchange rule
    if (currency !== 'NGN' && (exchange_rate === null || exchange_rate === undefined)) {
      return res.status(400).json({ error: 'exchange_rate required when currency is not NGN' });
    }

    // Validate min premium against LOB/Sub-LOB
    let minPremium = 0;
    if (sub_lob_id) {
      const sub = await pool.query('SELECT min_premium FROM sub_lobs WHERE id=$1', [sub_lob_id]);
      if (sub.rows[0]?.min_premium != null) minPremium = Number(sub.rows[0].min_premium) || 0;
    } else {
      const lob = await pool.query('SELECT min_premium FROM lobs WHERE id=$1', [lob_id]);
      if (lob.rows[0]?.min_premium != null) minPremium = Number(lob.rows[0].min_premium) || 0;
    }
    if (Number(gross_premium) < minPremium) return res.status(400).json({ error: `Gross premium below minimum (${minPremium}) for selected LOB/Sub-LOB` });

    // Insert policy (policy_id sequencing per document not implemented here without spec)
    const { rows } = await pool.query(`
      INSERT INTO policies (
        policy_id, client_id, insurer_id, agent_id, lob_id, sub_lob_id, period_from, period_to, sum_insured, gross_premium, rate_pct,
        currency, exchange_rate, payment_terms, payment_status, placement_mode, brokerage_pct, agent_commission_pct,
        levy_niacom, levy_ncrib, levy_ed_tax
      ) VALUES (
        NULL,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,
        $18,$19,$20
      ) RETURNING *
    `, [client_id, insurer_id, agent_id, lob_id, sub_lob_id, period_from, period_to, sum_insured, gross_premium, rate_pct,
         currency, exchange_rate, payment_terms, payment_status, placement_mode, brokerage_pct, agent_commission_pct,
         levy_niacom, levy_ncrib, levy_ed_tax]);

    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/', requireAuth, async (_req, res) => {
  try { const { rows } = await pool.query('SELECT * FROM policies ORDER BY id DESC'); res.json(rows); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', requireAuth, async (req, res) => {
  try { const { rows } = await pool.query('SELECT * FROM policies WHERE id=$1', [req.params.id]); if (!rows[0]) return res.status(404).json({ error: 'Not found' }); res.json(rows[0]); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const editable = ['period_from','period_to','sum_insured','gross_premium','rate_pct','currency','exchange_rate','payment_terms','payment_status','placement_mode','brokerage_pct','agent_commission_pct','levy_niacom','levy_ncrib','levy_ed_tax'];
    const set=[]; const vals=[];
    for (const f of editable) if (f in req.body) { set.push(`${f}=$${set.length+1}`); vals.push(req.body[f]); }
    if (!set.length) return res.status(400).json({ error: 'No fields' });
    vals.push(req.params.id);
    const { rows } = await pool.query(`UPDATE policies SET ${set.join(', ')}, updated_at=NOW() WHERE id=$${vals.length} RETURNING *`, vals);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// List approvals for a policy
router.get('/:id/approvals', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT level, user_id, created_at FROM policy_approvals WHERE policy_id=$1 ORDER BY created_at ASC', [req.params.id]);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Approve policy in sequence L1 -> L2 -> L3
router.post('/:id/approve', requireAuth, async (req, res) => {
  try {
    const { rows: polRows } = await pool.query('SELECT id FROM policies WHERE id=$1', [req.params.id]);
    if (!polRows[0]) return res.status(404).json({ error: 'Not found' });

    const userLevel = req.user?.approval_level;
    if (!userLevel || !['L1','L2','L3'].includes(userLevel)) {
      return res.status(403).json({ error: 'Approval level required (L1/L2/L3)' });
    }

    // Determine next required level
    const { rows: appr } = await pool.query('SELECT level FROM policy_approvals WHERE policy_id=$1', [req.params.id]);
    const have = appr.map(a => a.level);
    const order = ['L1','L2','L3'];
    const next = order.find(l => !have.includes(l));
    if (!next) return res.status(400).json({ error: 'Already fully approved' });
    if (userLevel !== next) return res.status(403).json({ error: `Next required level is ${next}` });

    // Insert approval (unique per level enforced by DB)
    const { rows } = await pool.query(
      'INSERT INTO policy_approvals (policy_id, user_id, level) VALUES ($1,$2,$3) RETURNING level, user_id, created_at',
      [req.params.id, req.user?.uid || null, userLevel]
    );

    await logAudit({ user_id: req.user?.uid, action: 'APPROVE', entity: 'Policy', entity_id: req.params.id, details: { level: userLevel } });
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Level already approved' });
    res.status(500).json({ error: e.message });
  }
});

export default router;