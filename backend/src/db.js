import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pkg;

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Users (User Master)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        role TEXT NOT NULL CHECK (role IN ('Admin','Underwriter','Accounts','Claims','Marketer','Viewer')),
        approval_level TEXT CHECK (approval_level IN ('L1','L2','L3')),
        signature_path TEXT,
        max_override_limit NUMERIC(14,2) DEFAULT 0,
        tfa_enabled BOOLEAN DEFAULT FALSE,
        status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Inactive')),
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Audit Logs
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id BIGSERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action TEXT NOT NULL,
        entity TEXT,
        entity_id TEXT,
        details JSONB,
        channel TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Clients (Client Master)
    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        client_type TEXT NOT NULL CHECK (client_type IN ('Individual','Corporate')),
        legal_name TEXT NOT NULL,
        trading_name TEXT,
        tin TEXT UNIQUE,
        cac_rc TEXT UNIQUE,
        vat_status TEXT CHECK (vat_status IN ('Registered','Not Registered')),
        national_id TEXT,
        dob_incorp DATE NOT NULL,
        risk_segment TEXT,
        currency TEXT NOT NULL,
        preferred_communication TEXT,
        registered_address TEXT,
        billing_address TEXT,
        kyc_category TEXT,
        pep_flag BOOLEAN DEFAULT FALSE,
        data_consent BOOLEAN DEFAULT FALSE,
        aml_check_date DATE,
        account_owner INTEGER REFERENCES users(id),
        status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Inactive')),
        kyc_status TEXT NOT NULL DEFAULT 'Pending' CHECK (kyc_status IN ('Pending','Approved','Rejected')),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Generic contacts table (supports Client/Agent/Insurer)
    await client.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        owner_type TEXT NOT NULL CHECK (owner_type IN ('Client','Agent','Insurer')),
        owner_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        role TEXT,
        email TEXT,
        phone TEXT,
        UNIQUE(owner_type, owner_id, email),
        UNIQUE(owner_type, owner_id, phone)
      );
    `);

    // KYC files metadata
    await client.query(`
      CREATE TABLE IF NOT EXISTS kyc_files (
        id SERIAL PRIMARY KEY,
        owner_type TEXT NOT NULL CHECK (owner_type IN ('Client','Agent','Insurer')),
        owner_id INTEGER NOT NULL,
        doc_type TEXT NOT NULL, -- Passport/ID, CAC docs, TIN certificate
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        file_size BIGINT NOT NULL,
        virus_scanned BOOLEAN DEFAULT FALSE,
        retention_until DATE,
        uploaded_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(owner_type, owner_id, doc_type, file_name)
      );
    `);

    // Bank Accounts (per entity)
    await client.query(`
      CREATE TABLE IF NOT EXISTS bank_accounts (
        id SERIAL PRIMARY KEY,
        owner_type TEXT NOT NULL CHECK (owner_type IN ('Client','Insurer','Agent')),
        owner_id INTEGER NOT NULL,
        bank_name TEXT NOT NULL,
        branch TEXT,
        account_number TEXT NOT NULL,
        account_country TEXT DEFAULT 'NG',
        currency TEXT NOT NULL,
        swift_bic TEXT,
        usage_receivable BOOLEAN DEFAULT FALSE,
        usage_payable BOOLEAN DEFAULT FALSE,
        is_default BOOLEAN DEFAULT FALSE,
        statement_source TEXT CHECK (statement_source IN ('Manual','CSV','API')),
        gl_code TEXT,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(owner_type, owner_id, account_number)
      );
    `);

    // Insurers
    await client.query(`
      CREATE TABLE IF NOT EXISTS insurers (
        id SERIAL PRIMARY KEY,
        legal_name TEXT NOT NULL,
        trading_name TEXT,
        license_type TEXT,
        naicom_license_no TEXT,
        license_expiry DATE,
        underwriting_email TEXT,
        claims_email TEXT,
        accepted_lobs TEXT[],
        status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Inactive')),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Agents
    await client.query(`
      CREATE TABLE IF NOT EXISTS agents (
        id SERIAL PRIMARY KEY,
        agent_type TEXT NOT NULL CHECK (agent_type IN ('Individual','Corporate')),
        full_name TEXT NOT NULL,
        cac_rc TEXT,
        tin TEXT,
        default_commission_pct NUMERIC(5,2) DEFAULT 0,
        commission_model TEXT CHECK (commission_model IN ('Flat','Variable')),
        status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Inactive')),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // LOBs and Sub-LOBs
    await client.query(`
      CREATE TABLE IF NOT EXISTS lobs (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        default_brokerage_pct NUMERIC(5,2) DEFAULT 0,
        default_vat_pct NUMERIC(5,2) DEFAULT 7.50,
        rate_basis TEXT,
        rating_inputs JSONB,
        min_premium NUMERIC(14,2) DEFAULT 0,
        wording_refs TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sub_lobs (
        id SERIAL PRIMARY KEY,
        lob_id INTEGER NOT NULL REFERENCES lobs(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        brokerage_pct NUMERIC(5,2),
        vat_pct NUMERIC(5,2),
        rate_basis TEXT,
        rating_inputs JSONB,
        min_premium NUMERIC(14,2),
        wording_refs TEXT,
        UNIQUE(lob_id, name)
      );
    `);

    // Policies (basic structure per doc fields)
    await client.query(`
      CREATE TABLE IF NOT EXISTS policies (
        id SERIAL PRIMARY KEY,
        policy_id TEXT UNIQUE,
        client_id INTEGER REFERENCES clients(id),
        insurer_id INTEGER REFERENCES insurers(id),
        agent_id INTEGER REFERENCES agents(id),
        lob_id INTEGER REFERENCES lobs(id),
        sub_lob_id INTEGER REFERENCES sub_lobs(id),
        period_from DATE,
        period_to DATE,
        sum_insured NUMERIC(18,2),
        gross_premium NUMERIC(18,2),
        rate_pct NUMERIC(5,2),
        currency TEXT,
        exchange_rate NUMERIC(14,6),
        payment_terms TEXT,
        payment_status TEXT,
        placement_mode TEXT,
        brokerage_pct NUMERIC(5,2),
        agent_commission_pct NUMERIC(5,2),
        levy_niacom NUMERIC(14,2),
        levy_ncrib NUMERIC(14,2),
        levy_ed_tax NUMERIC(14,2),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Policy Approvals (L1/L2/L3 logs)
    await client.query(`
      CREATE TABLE IF NOT EXISTS policy_approvals (
        id SERIAL PRIMARY KEY,
        policy_id INTEGER NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        level TEXT NOT NULL CHECK (level IN ('L1','L2','L3')),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(policy_id, level)
      );
    `);

    // Credit/Debit Notes
    await client.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        note_type TEXT NOT NULL CHECK (note_type IN ('CN','DN')),
        note_id TEXT UNIQUE,
        policy_id INTEGER REFERENCES policies(id),
        gross_premium NUMERIC(18,2) NOT NULL,
        brokerage_amount NUMERIC(18,2) NOT NULL,
        vat_on_brokerage NUMERIC(18,2) NOT NULL,
        agent_commission NUMERIC(18,2),
        levy_niacom NUMERIC(18,2),
        levy_ncrib NUMERIC(18,2),
        levy_ed_tax NUMERIC(18,2),
        net_brokerage NUMERIC(18,2),
        net_amount_due NUMERIC(18,2),
        payable_bank_account_id INTEGER REFERENCES bank_accounts(id),
        status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Approved','Issued')),
        prepared_by INTEGER REFERENCES users(id),
        authorized_by INTEGER REFERENCES users(id),
        pdf_path TEXT,
        pdf_hash TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Dispatch log
    await client.query(`
      CREATE TABLE IF NOT EXISTS dispatch_logs (
        id BIGSERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        note_id INTEGER REFERENCES notes(id),
        channel TEXT CHECK (channel IN ('Email','WhatsApp')),
        recipient TEXT,
        attachment_hash TEXT,
        status TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Helpful partial indexes for duplicate prevention on Client contacts
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_client_contact_email ON contacts (lower(email)) WHERE owner_type='Client' AND email IS NOT NULL;
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_client_contact_phone ON contacts (phone) WHERE owner_type='Client' AND phone IS NOT NULL;
    `);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration error:', err);
    throw err;
  } finally {
    client.release();
  }
}