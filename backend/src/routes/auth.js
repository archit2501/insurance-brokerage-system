import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { full_name, email, phone, role, approval_level, password } = req.body;
    if (!full_name || !email || !role || !password) return res.status(400).json({ error: 'Missing fields' });

    const password_hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (full_name, email, phone, role, approval_level, password_hash) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, full_name, email, role, approval_level`,
      [full_name, email.toLowerCase(), phone || null, role, approval_level || null, password_hash]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: e.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [String(email).toLowerCase()]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ uid: user.id, role: user.role, approval_level: user.approval_level }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role, approval_level: user.approval_level } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;