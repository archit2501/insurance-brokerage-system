import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const safe = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, `${unique}-${safe}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg'
    ];
    if (!allowed.includes(file.mimetype)) return cb(new Error('Invalid file type'));
    cb(null, true);
  }
});

function validateMeta({ owner_type, owner_id, doc_type }) {
  if (!owner_type || !['Client','Agent','Insurer'].includes(owner_type)) return 'Invalid owner_type';
  if (!owner_id) return 'owner_id is required';
  if (!doc_type) return 'doc_type is required';
  return null;
}

router.post('/', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const { owner_type, owner_id, doc_type, retention_until } = req.body;
    const err = validateMeta({ owner_type, owner_id, doc_type });
    if (err) return res.status(400).json({ error: err });
    if (!req.file) return res.status(400).json({ error: 'file is required' });

    const { originalname, filename, mimetype, size, path: filepath } = req.file;
    const { rows } = await pool.query(
      `INSERT INTO kyc_files (owner_type, owner_id, doc_type, file_name, file_path, mime_type, file_size, virus_scanned, retention_until)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [owner_type, Number(owner_id), doc_type, originalname, filename, mimetype, size, false, retention_until || null]
    );

    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:owner_type/:owner_id', requireAuth, async (req, res) => {
  try {
    const { owner_type, owner_id } = req.params;
    if (!['Client','Agent','Insurer'].includes(owner_type)) return res.status(400).json({ error: 'Invalid owner_type' });
    const { rows } = await pool.query('SELECT * FROM kyc_files WHERE owner_type=$1 AND owner_id=$2 ORDER BY id DESC', [owner_type, Number(owner_id)]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;