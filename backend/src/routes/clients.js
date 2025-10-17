import express from 'express';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { normalizeE164 } from '../utils/validators.js';
import { logAudit } from '../utils/audit.js';

const router = express.Router();

function validateClientPayload(body) {
  const required = ['client_type','legal_name','dob_incorp','currency'];
  for (const k of required) if (!body[k]) return `${k} is required`;
  if (!['Individual','Corporate'].includes(body.client_type)) return 'Invalid client_type';
  // Date validations
  const dob = new Date(body.dob_incorp);
  const today = new Date();
  if (Number.isNaN(dob.getTime())) return 'dob_incorp is invalid date';
  if (dob > today) return 'dob_incorp cannot be in the future';
  if (body.client_type === 'Individual') {
    const age = today.getFullYear() - dob.getFullYear() - ((today.getMonth() < dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) ? 1 : 0);
    if (age < 18) return 'Individual must be at least 18 years old';
  }
  // Phone/email duplicate prevention will rely on DB + insert checks in contacts
  return null;
}

router.post('/', requireAuth, requireRole(['Admin']), async (req, res) => {
  const err = validateClientPayload(req.body);
  if (err) return res.status(400).json({ error: err });
  const {
    client_type, legal_name, trading_name, tin, cac_rc, vat_status, national_id, dob_incorp, risk_segment, currency, preferred_communication,
    registered_address, billing_address, kyc_category, pep_flag, data_consent, aml_check_date, account_owner, status, kyc_status, contacts
  } = req.body;
  try {
    // basic duplicate checks per doc on TIN/CAC
    if (tin) {
      const tinChk = await pool.query('SELECT 1 FROM clients WHERE tin=$1', [tin]);
      if (tinChk.rowCount) return res.status(409).json({ error: 'Duplicate TIN' });
    }
    if (cac_rc) {
      const cacChk = await pool.query('SELECT 1 FROM clients WHERE cac_rc=$1', [cac_rc]);
      if (cacChk.rowCount) return res.status(409).json({ error: 'Duplicate CAC/RC' });
    }

    // Pre-check contact duplicates across all Clients (per doc rule)
    if (Array.isArray(contacts)) {
      for (const c of contacts) {
        const email = c.email ? String(c.email).toLowerCase() : null;
        const phone = normalizeE164(c.phone);
        if (email) {
          const { rowCount } = await pool.query("SELECT 1 FROM contacts WHERE owner_type='Client' AND lower(email)=$1", [email]);
          if (rowCount) return res.status(409).json({ error: `Duplicate client contact email: ${email}` });
        }
        if (phone) {
          const { rowCount } = await pool.query("SELECT 1 FROM contacts WHERE owner_type='Client' AND phone=$1", [phone]);
          if (rowCount) return res.status(409).json({ error: `Duplicate client contact phone: ${phone}` });
        }
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO clients (
        client_type, legal_name, trading_name, tin, cac_rc, vat_status, national_id, dob_incorp, risk_segment, currency, preferred_communication,
        registered_address, billing_address, kyc_category, pep_flag, data_consent, aml_check_date, account_owner, status, kyc_status
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20
      ) RETURNING *`,
      [client_type, legal_name, trading_name || null, tin || null, cac_rc || null, vat_status || null, national_id || null, dob_incorp, risk_segment || null, currency,
        preferred_communication || null, registered_address || null, billing_address || null, kyc_category || null, !!pep_flag, !!data_consent, aml_check_date || null,
        account_owner || null, status || 'Active', kyc_status || 'Pending']
    );
    const client = rows[0];

    if (Array.isArray(contacts)) {
      for (const c of contacts) {
        const phone = normalizeE164(c.phone);
        await pool.query(
          `INSERT INTO contacts (owner_type, owner_id, name, role, email, phone) VALUES ('Client',$1,$2,$3,$4,$5)`,
          [client.id, c.name, c.role || null, c.email?.toLowerCase() || null, phone]
        );
      }
    }

    await logAudit({ user_id: req.user?.uid, action: 'CREATE', entity: 'Client', entity_id: client.id, details: { client_id: client.id } });
    res.status(201).json(client);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Duplicate TIN/CAC or contact email/phone' });
    res.status(500).json({ error: e.message });
  }
});

router.get('/', requireAuth, async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM clients ORDER BY id DESC');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM clients WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const contacts = await pool.query("SELECT * FROM contacts WHERE owner_type='Client' AND owner_id=$1", [req.params.id]);
    res.json({ ...rows[0], contacts: contacts.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', requireAuth, requireRole(['Admin']), async (req, res) => {
  try {
    // duplicate checks when updating TIN/CAC (exclude self)
    if (req.body.tin) {
      const tinChk = await pool.query('SELECT 1 FROM clients WHERE tin=$1 AND id<>$2', [req.body.tin, req.params.id]);
      if (tinChk.rowCount) return res.status(409).json({ error: 'Duplicate TIN' });
    }
    if (req.body.cac_rc) {
      const cacChk = await pool.query('SELECT 1 FROM clients WHERE cac_rc=$1 AND id<>$2', [req.body.cac_rc, req.params.id]);
      if (cacChk.rowCount) return res.status(409).json({ error: 'Duplicate CAC/RC' });
    }

    const fields = [
      'client_type','legal_name','trading_name','tin','cac_rc','vat_status','national_id','dob_incorp','risk_segment','currency','preferred_communication','registered_address','billing_address','kyc_category','pep_flag','data_consent','aml_check_date','account_owner','status','kyc_status'
    ];
    const setClauses = [];
    const values = [];
    fields.forEach((f) => {
      if (f in req.body) { setClauses.push(`${f}=$${setClauses.length+1}`); values.push(req.body[f]); }
    });
    if (!setClauses.length) return res.status(400).json({ error: 'No fields' });
    values.push(req.params.id);
    const { rows } = await pool.query(`UPDATE clients SET ${setClauses.join(', ')}, updated_at=NOW() WHERE id=$${values.length} RETURNING *`, values);
    await logAudit({ user_id: req.user?.uid, action: 'UPDATE', entity: 'Client', entity_id: req.params.id, details: { fields: Object.keys(req.body) } });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', requireAuth, requireRole(['Admin']), async (req, res) => {
  try {
    await pool.query('DELETE FROM contacts WHERE owner_type=\'Client\' AND owner_id=$1', [req.params.id]);
    await pool.query('DELETE FROM clients WHERE id=$1', [req.params.id]);
    await logAudit({ user_id: req.user?.uid, action: 'DELETE', entity: 'Client', entity_id: req.params.id });
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;