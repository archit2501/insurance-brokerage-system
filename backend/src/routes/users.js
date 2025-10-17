import express from 'express';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
import { logAudit } from '../utils/audit.js';

const router = express.Router();

// Create user (Admin only)
router.post('/', requireAuth, requireRole(['Admin']), async (req, res) => {
  try {
    const { full_name, email, phone, role, approval_level, password, tfa_enabled, status, max_override_limit } = req.body;
    if (!full_name || !email || !role || !password) return res.status(400).json({ error: 'Missing fields' });
    const password_hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (full_name, email, phone, role, approval_level, password_hash, tfa_enabled, status, max_override_limit)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, full_name, email, phone, role, approval_level, tfa_enabled, status, max_override_limit`,
      [full_name, String(email).toLowerCase(), phone || null, role, approval_level || null, password_hash, !!tfa_enabled, status || 'Active', max_override_limit || 0]
    );
    await logAudit({ user_id: req.user?.uid, action: 'CREATE', entity: 'User', entity_id: rows[0].id });
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: e.message });
  }
});

// List users (Admin)
router.get('/', requireAuth, requireRole(['Admin']), async (_req, res) => {
  try { const { rows } = await pool.query('SELECT id, full_name, email, phone, role, approval_level, tfa_enabled, status, max_override_limit FROM users ORDER BY id DESC'); res.json(rows); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Update user (Admin)
router.put('/:id', requireAuth, requireRole(['Admin']), async (req, res) => {
  try {
    const fields = ['full_name','email','phone','role','approval_level','tfa_enabled','status','max_override_limit'];
    const set=[]; const vals=[];
    for (const f of fields) if (f in req.body) { set.push(`${f}=$${set.length+1}`); vals.push(f === 'email' ? String(req.body[f]).toLowerCase() : req.body[f]); }
    if (req.body.password) { set.push(`password_hash=$${set.length+1}`); vals.push(await bcrypt.hash(req.body.password, 10)); }
    if (!set.length) return res.status(400).json({ error: 'No fields' });
    vals.push(req.params.id);
    const { rows } = await pool.query(`UPDATE users SET ${set.join(', ')}, updated_at=NOW() WHERE id=$${vals.length} RETURNING id, full_name, email, phone, role, approval_level, tfa_enabled, status, max_override_limit`, vals);
    await logAudit({ user_id: req.user?.uid, action: 'UPDATE', entity: 'User', entity_id: req.params.id, details: { fields: Object.keys(req.body) } });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Delete user (Admin)
router.delete('/:id', requireAuth, requireRole(['Admin']), async (req, res) => {
  try { await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]); await logAudit({ user_id: req.user?.uid, action: 'DELETE', entity: 'User', entity_id: req.params.id }); res.status(204).end(); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;