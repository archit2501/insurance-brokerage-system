import { pool } from '../db.js';

export async function logAudit({ user_id, action, entity, entity_id, details = null, channel = null }) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, details, channel) VALUES ($1,$2,$3,$4,$5,$6)`,
      [user_id || null, action, entity || null, entity_id ? String(entity_id) : null, details ? JSON.stringify(details) : null, channel || null]
    );
  } catch (e) {
    // Do not throw to avoid breaking main flow
    console.error('audit log error', e.message);
  }
}