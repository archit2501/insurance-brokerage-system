import express from 'express';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

async function sendEmail({ to, subject, text, attachments }) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 1025),
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  const from = process.env.DISPATCH_FROM || 'noreply@example.com';
  await transporter.sendMail({ from, to, subject, text, attachments });
}

router.post('/note/:id/email', requireAuth, async (req, res) => {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ error: 'to is required' });
    const { rows } = await pool.query('SELECT * FROM notes WHERE id=$1', [req.params.id]);
    const note = rows[0];
    if (!note) return res.status(404).json({ error: 'Note not found' });
    if (!note.pdf_path || !note.pdf_hash) return res.status(400).json({ error: 'PDF not generated for this note' });

    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    const pdfFull = path.join(uploadDir, note.pdf_path);
    const attachments = [{ filename: note.pdf_path, path: pdfFull }];

    await sendEmail({ to, subject: `Note ${note.note_id}`, text: `Please find attached note ${note.note_id}`, attachments });
    await pool.query(
      `INSERT INTO dispatch_logs (user_id, note_id, channel, recipient, attachment_hash, status) VALUES ($1,$2,'Email',$3,$4,'Sent')`,
      [req.user?.uid || null, note.id, to, note.pdf_hash]
    );

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;