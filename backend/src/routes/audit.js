import express from 'express';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// List audit logs (Admin only)
router.get('/', requireAuth, requireRole(['Admin']), async (req, res) => {
  try {
    const { entity, user_id, limit = 200 } = req.query;
    const clauses = [];
    const vals = [];
    if (entity) { clauses.push(`entity = $${clauses.length+1}`); vals.push(String(entity)); }
    if (user_id) { clauses.push(`user_id = $${clauses.length+1}`); vals.push(Number(user_id)); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const { rows } = await pool.query(`SELECT * FROM audit_logs ${where} ORDER BY id DESC LIMIT $${vals.length+1}`, [...vals, Number(limit)]);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;