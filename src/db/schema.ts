import { sqliteTable, integer, text, real, index } from 'drizzle-orm/sqlite-core';

// Users table (minimal auth)
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fullName: text('full_name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'), // E.164 format, nullable
  role: text('role').notNull(), // 'Admin', 'Underwriter', 'Accounts', 'Claims', 'Marketer', 'Viewer'
  approvalLevel: text('approval_level'), // 'L1', 'L2', 'L3', nullable
  tfaEnabled: integer('tfa_enabled', { mode: 'boolean' }).default(false),
  status: text('status').notNull().default('Active'), // 'Active', 'Inactive'
  maxOverrideLimit: real('max_override_limit').default(0),
  passwordHash: text('password_hash').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'), // soft delete flag
});

// Clients Master
export const clients = sqliteTable('clients', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clientCode: text('client_code').unique(),
  companyName: text('company_name').notNull(),
  clientType: text('client_type').notNull().default('Company'), // 'Company' or 'Individual'
  cacRcNumber: text('cac_rc_number').unique(),
  tin: text('tin').unique(),
  industry: text('industry'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  country: text('country').default('Nigeria'),
  website: text('website'),
  kycStatus: text('kyc_status').notNull().default('pending'), // 'pending', 'verified', 'rejected'
  status: text('status').notNull().default('active'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Client Contacts
export const contacts = sqliteTable('contacts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clientId: integer('client_id').references(() => clients.id),
  fullName: text('full_name').notNull(),
  designation: text('designation'),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  isPrimary: integer('is_primary', { mode: 'boolean' }).default(false),
  status: text('status').notNull().default('active'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  uniqueClientEmail: index('unique_client_email').on(table.clientId, table.email),
  uniqueClientPhone: index('unique_client_phone').on(table.clientId, table.phone),
}));

// KYC Files Metadata
export const kycFiles = sqliteTable('kyc_files', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clientId: integer('client_id').references(() => clients.id),
  fileName: text('file_name').notNull(),
  fileType: text('file_type').notNull(), // 'CAC', 'TIN', 'AUDITED_ACCOUNTS', 'OTHER'
  filePath: text('file_path').notNull(),
  fileSize: integer('file_size'),
  sha256Hash: text('sha256_hash').notNull(),
  uploadedBy: integer('uploaded_by').references(() => users.id),
  createdAt: text('created_at').notNull(),
});

// Lines of Business
export const lobs = sqliteTable('lobs', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  code: text('code').notNull().unique(),
  description: text('description'),
  status: text('status').notNull().default('active'),
  defaultBrokeragePct: real('default_brokerage_pct').notNull().default(0),
  defaultVatPct: real('default_vat_pct').notNull().default(7.5),
  rateBasis: text('rate_basis'),
  ratingInputs: text('rating_inputs'),
  minPremium: real('min_premium').notNull().default(0),
  wordingRefs: text('wording_refs'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Sub Lines of Business
export const subLobs = sqliteTable('sub_lobs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  lobId: integer('lob_id').references(() => lobs.id),
  name: text('name').notNull(),
  code: text('code').notNull(),
  description: text('description'),
  status: text('status').notNull().default('active'),
  overrideBrokeragePct: real('override_brokerage_pct'),
  overrideVatPct: real('override_vat_pct'),
  overrideMinPremium: real('override_min_premium'),
  overrideRateBasis: text('override_rate_basis'),
  overrideRatingInputs: text('override_rating_inputs'),
  wordingRefs: text('wording_refs'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  uniqueLobSubLob: index('unique_lob_sub_lob').on(table.lobId, table.code),
}));

// RFQs
export const rfqs = sqliteTable('rfqs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clientId: integer('client_id').references(() => clients.id),
  primaryLobId: integer('primary_lob_id').references(() => lobs.id),
  subLobId: integer('sub_lob_id').references(() => subLobs.id),
  description: text('description').notNull(),
  expectedSumInsured: real('expected_sum_insured'),
  expectedGrossPremium: real('expected_gross_premium'),
  currency: text('currency').notNull().default('NGN'),
  targetRatePct: real('target_rate_pct'),
  status: text('status').notNull().default('Draft'), // 'Draft', 'Quoted', 'Won', 'Lost', 'ConvertedToPolicy'
  selectedInsurerId: integer('selected_insurer_id').references(() => insurers.id),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// RFQ Insurer Quotes
export const rfqInsurers = sqliteTable('rfq_insurers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  rfqId: integer('rfq_id').references(() => rfqs.id),
  insurerId: integer('insurer_id').references(() => insurers.id),
  offeredRatePct: real('offered_rate_pct'),
  offeredGrossPremium: real('offered_gross_premium'),
  notes: text('notes'),
  isSelected: integer('is_selected', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Policies
export const policies = sqliteTable('policies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  policyNumber: text('policy_number').notNull().unique(),
  clientId: integer('client_id').references(() => clients.id),
  insurerId: integer('insurer_id').references(() => insurers.id),
  rfqId: integer('rfq_id').references(() => rfqs.id),
  lobId: integer('lob_id').references(() => lobs.id),
  subLobId: integer('sub_lob_id').references(() => subLobs.id),
  sumInsured: real('sum_insured').notNull(),
  grossPremium: real('gross_premium').notNull(),
  currency: text('currency').notNull().default('NGN'),
  policyStartDate: text('policy_start_date').notNull(),
  policyEndDate: text('policy_end_date').notNull(),
  confirmationDate: text('confirmation_date'),
  status: text('status').notNull().default('active'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Note Sequences for auto-numbering
export const noteSequences = sqliteTable('note_sequences', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  noteType: text('note_type').notNull(), // 'DN', 'CN'
  year: integer('year').notNull(),
  lastSeq: integer('last_seq').notNull().default(0),
}, (table) => ({
  uniqueTypeYear: index('unique_type_year').on(table.noteType, table.year),
}));

// Entity Sequences for centralized numbering (CLIENT, BANK, INSURER, AGENT, POLICY)
export const entitySequences = sqliteTable('entity_sequences', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entity: text('entity').notNull(), // 'CLIENT' | 'BANK' | 'INSURER' | 'AGENT' | 'POLICY'
  year: integer('year').notNull(),
  lastSeq: integer('last_seq').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  uniqueEntityYear: index('unique_entity_year').on(table.entity, table.year),
}));

// Add endorsement_sequences table
export const endorsementSequences = sqliteTable('endorsement_sequences', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entity: text('entity').notNull(), // 'ENDORSEMENT'
  year: integer('year').notNull(),
  lastSeq: integer('last_seq').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  uniqueEntityYear: index('unique_endorsement_entity_year').on(table.entity, table.year),
}));

// Notes (DN/CN)
export const notes = sqliteTable('notes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  noteId: text('note_id').notNull().unique(), // DN/2025/000123 or CN/2025/000124
  noteType: text('note_type').notNull(), // 'DN', 'CN'
  noteSeq: integer('note_seq').notNull(),
  noteYear: integer('note_year').notNull(),
  clientId: integer('client_id').references(() => clients.id),
  insurerId: integer('insurer_id').references(() => insurers.id), // For CN
  policyId: integer('policy_id').references(() => policies.id),
  grossPremium: real('gross_premium').notNull(),
  brokeragePct: real('brokerage_pct').notNull(),
  brokerageAmount: real('brokerage_amount').notNull(),
  vatPct: real('vat_pct').notNull().default(7.5),
  vatOnBrokerage: real('vat_on_brokerage').notNull(),
  agentCommissionPct: real('agent_commission_pct').default(0),
  agentCommission: real('agent_commission').default(0),
  netBrokerage: real('net_brokerage').notNull(),
  levies: text('levies', { mode: 'json' }), // {niacom: 0, ncrib: 0, ed_tax: 0}
  netAmountDue: real('net_amount_due').notNull(),
  payableBankAccountId: integer('payable_bank_account_id'),
  coInsurance: text('co_insurance', { mode: 'json' }), // [{insurer_id, pct, amount}] for CN
  status: text('status').notNull().default('Draft'), // 'Draft', 'Approved', 'Issued'
  pdfPath: text('pdf_path'),
  sha256Hash: text('sha256_hash'),
  preparedBy: integer('prepared_by').references(() => users.id),
  authorizedBy: integer('authorized_by').references(() => users.id),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  uniqueNoteTypeYearSeq: index('unique_note_type_year_seq').on(table.noteType, table.noteYear, table.noteSeq),
}));

// CN Insurer Shares (for co-insurance tracking)
export const cnInsurerShares = sqliteTable('cn_insurer_shares', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  noteId: integer('note_id').references(() => notes.id),
  insurerId: integer('insurer_id').references(() => insurers.id),
  percentage: real('percentage').notNull(),
  amount: real('amount').notNull(),
  createdAt: text('created_at').notNull(),
});

// Add endorsements table
export const endorsements = sqliteTable('endorsements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  policyId: integer('policy_id').references(() => policies.id),
  endorsementNumber: text('endorsement_number').notNull().unique(),
  type: text('type').notNull(),
  effectiveDate: text('effective_date').notNull(),
  description: text('description'),
  sumInsuredDelta: real('sum_insured_delta').default(0),
  grossPremiumDelta: real('gross_premium_delta').default(0),
  brokeragePct: real('brokerage_pct'),
  vatPct: real('vat_pct'),
  levies: text('levies', { mode: 'json' }),
  netAmountDue: real('net_amount_due').notNull().default(0),
  status: text('status').notNull().default('Draft'),
  preparedBy: integer('prepared_by').references(() => users.id),
  authorizedBy: integer('authorized_by').references(() => users.id),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Reminders
export const reminders = sqliteTable('reminders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  noteId: integer('note_id').references(() => notes.id),
  type: text('type').notNull(), // 'RemitPremium', 'VATOnCommission'
  dueDate: text('due_date').notNull(),
  status: text('status').notNull().default('Pending'), // 'Pending', 'Completed', 'Overdue'
  completedAt: text('completed_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Dispatch Logs
export const dispatchLogs = sqliteTable('dispatch_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  noteId: integer('note_id').references(() => notes.id),
  recipientEmails: text('recipient_emails', { mode: 'json' }),
  subject: text('subject').notNull(),
  status: text('status').notNull(), // 'sent', 'failed'
  errorMessage: text('error_message'),
  providerMessageId: text('provider_message_id'),
  sentBy: integer('sent_by').references(() => users.id),
  sentAt: text('sent_at').notNull(),
});

// Audit Logs
export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tableName: text('table_name').notNull(),
  recordId: integer('record_id').notNull(),
  action: text('action').notNull(), // 'CREATE', 'UPDATE', 'DELETE', 'DISPATCH'
  oldValues: text('old_values', { mode: 'json' }),
  newValues: text('new_values', { mode: 'json' }),
  userId: integer('user_id').references(() => users.id),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: text('created_at').notNull(),
});

export const bankAccounts = sqliteTable('bank_accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  bankCode: text('bank_code').unique(),
  ownerType: text('owner_type').notNull(), // 'Client', 'Insurer', 'Agent'
  ownerId: integer('owner_id').notNull(),
  bankName: text('bank_name').notNull(),
  branch: text('branch'),
  accountNumber: text('account_number').notNull(),
  accountCountry: text('account_country').notNull().default('NG'),
  currency: text('currency').notNull().default('NGN'),
  swiftBic: text('swift_bic'),
  usageReceivable: integer('usage_receivable', { mode: 'boolean' }).default(false),
  usagePayable: integer('usage_payable', { mode: 'boolean' }).default(false),
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),
  statementSource: text('statement_source').notNull().default('Manual'), // 'Manual', 'CSV', 'API'
  glCode: text('gl_code'),
  active: integer('active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  ownerIndex: index('owner_type_id_idx').on(table.ownerType, table.ownerId),
  uniqueAccountPerOwner: index('unique_account_owner_idx').on(table.ownerType, table.ownerId, table.accountNumber, table.accountCountry),
}));

// Add agents table
export const agents = sqliteTable('agents', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  agentCode: text('agent_code').unique(),
  type: text('type').notNull(), // 'individual' | 'corporate'
  legalName: text('legal_name'), // for corporate
  fullName: text('full_name'), // for individual
  cacRc: text('cac_rc'), // required for corporate
  tin: text('tin'), // required for corporate
  email: text('email'),
  phone: text('phone'),
  defaultCommissionPct: real('default_commission_pct').notNull().default(0),
  commissionModel: text('commission_model').notNull().default('flat'), // 'flat' | 'variable'
  status: text('status').notNull().default('active'), // 'active' | 'inactive'
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Add agent contacts table
export const agentContacts = sqliteTable('agent_contacts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  agentId: integer('agent_id').references(() => agents.id),
  fullName: text('full_name').notNull(),
  designation: text('designation'),
  email: text('email'),
  phone: text('phone'),
  isPrimary: integer('is_primary', { mode: 'boolean' }).default(false),
  status: text('status').notNull().default('active'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  uniqueAgentEmail: index('unique_agent_email').on(table.agentId, table.email),
  uniqueAgentPhone: index('unique_agent_phone').on(table.agentId, table.phone),
}));

// Add agent KYC files table
export const agentKycFiles = sqliteTable('agent_kyc_files', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  agentId: integer('agent_id').references(() => agents.id),
  fileName: text('file_name').notNull(),
  fileType: text('file_type').notNull(), // 'passport', 'id', 'cac', 'tin', 'other'
  filePath: text('file_path').notNull(),
  fileSize: integer('file_size'),
  sha256Hash: text('sha256_hash').notNull(),
  uploadedBy: integer('uploaded_by').references(() => users.id),
  createdAt: text('created_at').notNull(),
});

// Insurers
export const insurers = sqliteTable('insurers', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  insurerCode: text('insurer_code').unique(),
  companyName: text('company_name').notNull(),
  shortName: text('short_name').notNull(),
  licenseNumber: text('license_number').notNull().unique(),
  licenseExpiry: text('license_expiry').notNull(),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  country: text('country').default('Nigeria'),
  website: text('website'),
  acceptedLobs: text('accepted_lobs', { mode: 'json' }),
  specialLobs: text('special_lobs', { mode: 'json' }),
  status: text('status').notNull().default('active'),
  createdBy: integer('created_by').references(() => users.id),
  updatedBy: integer('updated_by').references(() => users.id),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Insurer Email Contacts
export const insurerEmails = sqliteTable('insurer_emails', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  insurerId: integer('insurer_id').references(() => insurers.id),
  role: text('role').notNull(), // 'underwriter', 'marketer', 'MD', 'ED', 'DGM', 'Head_of_RI', 'claims', 'technical'
  email: text('email').notNull(),
  active: integer('active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  uniqueInsurerRoleEmail: index('unique_insurer_role_email').on(table.insurerId, table.role, table.email),
}));

// Auth tables for better-auth
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});