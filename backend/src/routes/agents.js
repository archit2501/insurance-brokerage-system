import express from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { normalizeE164, pctInRange } from '../utils/validators.js';
import { logAudit } from '../utils/audit.js';

const router = express.Router();

function validateAgent(body) {
  const required = ['agent_type','full_name'];
  for (const k of required) if (!body[k]) return `${k} is required`;
  if (!['Individual','Corporate'].includes(body.agent_type)) return 'Invalid agent_type';
  if (body.agent_type === 'Corporate') {
    if (!body.cac_rc || !body.tin) return 'CAC/RC and TIN required for corporate';
  }
  if (!pctInRange(body.default_commission_pct)) return 'default_commission_pct must be 0-100';
  return null;
}

router.post('/', requireAuth, /* RBAC */ (req, res, next) => (req.user?.role === 'Admin' ? next() : res.status(403).json({ error: 'Forbidden' })), async (req, res) => {
  const err = validateAgent(req.body);
  if (err) return res.status(400).json({ error: err });
  try {
    const { agent_type, full_name, cac_rc, tin, default_commission_pct = 0, commission_model, status, contacts = [] } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO agents (agent_type, full_name, cac_rc, tin, default_commission_pct, commission_model, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [agent_type, full_name, cac_rc || null, tin || null, default_commission_pct, commission_model || null, status || 'Active']
    );
    const agent = rows[0];

    for (const c of contacts) {
      await pool.query(
        `INSERT INTO contacts (owner_type, owner_id, name, role, email, phone) VALUES ('Agent',$1,$2,$3,$4,$5)`,
        [agent.id, c.name, c.role || null, c.email?.toLowerCase() || null, normalizeE164(c.phone)]
      );
    }

    await logAudit({ user_id: req.user?.uid, action: 'CREATE', entity: 'Agent', entity_id: agent.id });
    res.status(201).json(agent);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Duplicate contact' });
    res.status(500).json({ error: e.message });
  }
});

router.get('/', requireAuth, async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM agents ORDER BY id DESC');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', requireAuth, /* RBAC */ (req, res, next) => (req.user?.role === 'Admin' ? next() : res.status(403).json({ error: 'Forbidden' })), async (req, res) => {
  try {
    const fields = ['agent_type','full_name','cac_rc','tin','default_commission_pct','commission_model','status'];
    const set=[]; const vals=[];
    for (const f of fields) if (f in req.body) { set.push(`${f}=$${set.length+1}`); vals.push(req.body[f]); }
    if (!set.length) return res.status(400).json({ error: 'No fields' });
    vals.push(req.params.id);
    const { rows } = await pool.query(`UPDATE agents SET ${set.join(', ')}, updated_at=NOW() WHERE id=$${vals.length} RETURNING *`, vals);
    await logAudit({ user_id: req.user?.uid, action: 'UPDATE', entity: 'Agent', entity_id: req.params.id, details: { fields: Object.keys(req.body) } });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', requireAuth, /* RBAC */ (req, res, next) => (req.user?.role === 'Admin' ? next() : res.status(403).json({ error: 'Forbidden' })), async (req, res) => {
  try {
    await pool.query('DELETE FROM agents WHERE id=$1', [req.params.id]);
    await pool.query("DELETE FROM contacts WHERE owner_type='Agent' AND owner_id=$1", [req.params.id]);
    await logAudit({ user_id: req.user?.uid, action: 'DELETE', entity: 'Agent', entity_id: req.params.id });
    res.status(204).end();
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;