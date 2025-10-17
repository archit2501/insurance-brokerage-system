import express from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const router = express.Router();

export function calcAmounts({ gross_premium, brokerage_pct, vat_pct = 7.5, agent_commission_pct = 0, levy_niacom = 0, levy_ncrib = 0, levy_ed_tax = 0 }) {
  const gross = Number(gross_premium);
  const brokerage = +(gross * (Number(brokerage_pct || 0) / 100)).toFixed(2);
  const vatOnBrokerage = +(brokerage * (Number(vat_pct || 0) / 100)).toFixed(2);
  const agentComm = +(gross * (Number(agent_commission_pct || 0) / 100)).toFixed(2);
  const netBrokerage = +(brokerage - agentComm).toFixed(2);
  const leviesTotal = +(Number(levy_niacom||0) + Number(levy_ncrib||0) + Number(levy_ed_tax||0)).toFixed(2);
  const netAmountDue = +(gross - brokerage - vatOnBrokerage - leviesTotal).toFixed(2);
  return { brokerage, vatOnBrokerage, agentComm, netBrokerage, netAmountDue };
}

function makePdf(note) {
  const dir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filename = `note-${note.id}-${Date.now()}.pdf`;
  const filepath = path.join(dir, filename);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);
    doc.fontSize(16).text(`${note.note_type === 'CN' ? 'Credit' : 'Debit'} Note`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(11);
    ['note_id','policy_id','gross_premium','brokerage_amount','vat_on_brokerage','agent_commission','levy_niacom','levy_ncrib','levy_ed_tax','net_brokerage','net_amount_due','status'].forEach((k) => {
      doc.text(`${k}: ${note[k] ?? ''}`);
    });
    doc.end();
    stream.on('finish', () => resolve({ filepath, filename }));
    stream.on('error', reject);
  });
}

router.post('/', requireAuth, async (req, res) => {
  try {
    const required = ['note_type','policy_id','gross_premium','brokerage_pct'];
    for (const f of required) if (!req.body[f] && req.body[f] !== 0) return res.status(400).json({ error: `${f} is required` });
    const { note_type, policy_id, gross_premium, brokerage_pct, vat_pct = 7.5, agent_commission_pct = 0, levy_niacom = 0, levy_ncrib = 0, levy_ed_tax = 0, payable_bank_account_id = null } = req.body;

    const { brokerage, vatOnBrokerage, agentComm, netBrokerage, netAmountDue } = calcAmounts({ gross_premium, brokerage_pct, vat_pct, agent_commission_pct, levy_niacom, levy_ncrib, levy_ed_tax });

    const { rows } = await pool.query(`
      INSERT INTO notes (
        note_type, note_id, policy_id, gross_premium, brokerage_amount, vat_on_brokerage, agent_commission, levy_niacom, levy_ncrib, levy_ed_tax, net_brokerage, net_amount_due, payable_bank_account_id, status, prepared_by
      ) VALUES (
        $1, NULL, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Draft', $13
      ) RETURNING *
    `, [note_type, policy_id, gross_premium, brokerage, vatOnBrokerage, agentComm, levy_niacom, levy_ncrib, levy_ed_tax, netBrokerage, netAmountDue, payable_bank_account_id, req.user?.uid || null]);

    const created = rows[0];

    // Temporary simple numbering using DB id (exact numbering rules should replace this)
    const tmpId = `${note_type}-${created.id.toString().padStart(6, '0')}`;
    const upd = await pool.query('UPDATE notes SET note_id=$1 WHERE id=$2 RETURNING *', [tmpId, created.id]);
    const note = upd.rows[0];

    // Generate PDF and store hash
    const { filepath, filename } = await makePdf(note);
    const fileBuffer = fs.readFileSync(filepath);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const upd2 = await pool.query('UPDATE notes SET pdf_path=$1, pdf_hash=$2 WHERE id=$3 RETURNING *', [filename, hash, note.id]);

    // Audit: note created
    await logAudit({ user_id: req.user?.uid, action: 'CREATE', entity: 'Note', entity_id: note.id, details: { note_id: note.note_id, type: note.note_type } });

    res.status(201).json(upd2.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/', requireAuth, async (_req, res) => {
  try { const { rows } = await pool.query('SELECT * FROM notes ORDER BY id DESC'); res.json(rows); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Approve: L2 (Underwriter/Admin). Only Draft -> Approved
router.post('/:id/approve', requireAuth, requireRole(['Underwriter','Admin']), async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM notes WHERE id=$1", [req.params.id]);
    const note = rows[0];
    if (!note) return res.status(404).json({ error: 'Not found' });
    if (note.status !== 'Draft') return res.status(400).json({ error: 'Only Draft notes can be approved' });
    const upd = await pool.query("UPDATE notes SET status='Approved', authorized_by=$1, updated_at=NOW() WHERE id=$2 RETURNING *", [req.user?.uid || null, req.params.id]);
    await logAudit({ user_id: req.user?.uid, action: 'APPROVE', entity: 'Note', entity_id: req.params.id, details: { from: note.status, to: 'Approved' } });
    res.json(upd.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Issue: L3 (Accounts/Admin). Only Approved -> Issued
router.post('/:id/issue', requireAuth, requireRole(['Accounts','Admin']), async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM notes WHERE id=$1', [req.params.id]);
    const note = rows[0];
    if (!note) return res.status(404).json({ error: 'Not found' });
    if (note.status !== 'Approved') return res.status(400).json({ error: 'Only Approved notes can be issued' });

    // Optionally regenerate PDF if missing
    let filename = note.pdf_path;
    let hash = note.pdf_hash;
    if (!filename || !hash) {
      const gen = await makePdf(note);
      const buf = fs.readFileSync(gen.filepath);
      hash = crypto.createHash('sha256').update(buf).digest('hex');
      filename = gen.filename;
    }

    const upd = await pool.query(
      "UPDATE notes SET status='Issued', pdf_path=$1, pdf_hash=$2, updated_at=NOW() WHERE id=$3 RETURNING *",
      [filename, hash, req.params.id]
    );
    await logAudit({ user_id: req.user?.uid, action: 'ISSUE', entity: 'Note', entity_id: req.params.id, details: { to: 'Issued', pdf: filename, hash } });
    res.json(upd.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;