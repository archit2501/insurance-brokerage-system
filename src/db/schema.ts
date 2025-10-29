import { sqliteTable, integer, text, real, index } from 'drizzle-orm/sqlite-core';

// Better Auth user table (managed by better-auth)
export const betterAuthUser = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('emailVerified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: text('createdAt').notNull(),
  updatedAt: text('updatedAt').notNull(),
});

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
  // Broking Slip fields
  slipNumber: text('slip_number').unique(),
  slipStatus: text('slip_status'), // 'draft', 'submitted', 'bound', 'declined', 'expired'
  slipGeneratedAt: text('slip_generated_at'),
  slipValidUntil: text('slip_valid_until'),
  riskDetails: text('risk_details', { mode: 'json' }), // LOB-specific: {vehicleRegNo, make, model, chassisNo, ...} or {propertyAddress, buildingValue, contentsValue, ...}
  submittedToInsurerAt: text('submitted_to_insurer_at'),
  insurerResponseAt: text('insurer_response_at'),
  placementProportion: real('placement_proportion').default(100), // % of risk placed with insurer (for co-insurance)
  // Renewal tracking
  isRenewal: integer('is_renewal', { mode: 'boolean' }).default(false),
  renewedFromPolicyId: integer('renewed_from_policy_id'), // ID of previous policy (if this is a renewal)
  renewedToPolicyId: integer('renewed_to_policy_id'), // ID of renewal policy (if this policy was renewed)
  renewalReminderSent: integer('renewal_reminder_sent', { mode: 'boolean' }).default(false),
  // Status tracking
  lastStatusCheck: text('last_status_check'), // Timestamp of last auto-status check
  autoExpired: integer('auto_expired', { mode: 'boolean' }).default(false), // True if auto-marked as expired
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

// Slip Sequences for broking slip numbering
export const slipSequences = sqliteTable('slip_sequences', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  year: integer('year').notNull(),
  lastSeq: integer('last_seq').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  uniqueYear: index('unique_slip_year').on(table.year),
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
  // Enhanced CN fields
  paymentTerms: text('payment_terms'), // '30 days from issue date'
  paymentDueDate: text('payment_due_date'),
  lobSpecificDetails: text('lob_specific_details', { mode: 'json' }), // Marine/Motor/Fire specific data
  specialConditions: text('special_conditions'), // Any special policy conditions
  endorsementDetails: text('endorsement_details'), // If CN relates to endorsement
  currency: text('currency').default('NGN'),
  exchangeRate: real('exchange_rate').default(1.0), // For foreign currency policies
  issueDate: text('issue_date'), // Formal issue date (may differ from createdAt)
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

// Commission Structures Master
export const commissionStructures = sqliteTable('commission_structures', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  insurerId: integer('insurer_id').references(() => insurers.id),
  lobId: integer('lob_id').references(() => lobs.id),
  policyType: text('policy_type'), // 'New', 'Renewal', 'Endorsement' (nullable = applies to all)
  commissionType: text('commission_type').notNull().default('percentage'), // 'percentage' | 'flat'
  rate: real('rate').notNull(), // percentage (e.g., 2.5 = 2.5%) or flat amount
  minAmount: real('min_amount').default(0),
  maxAmount: real('max_amount'),
  effectiveDate: text('effective_date').notNull(),
  expiryDate: text('expiry_date'),
  status: text('status').notNull().default('active'), // 'active' | 'inactive'
  notes: text('notes'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  structureIndex: index('commission_structure_idx').on(table.insurerId, table.lobId, table.policyType, table.effectiveDate),
}));

// Commission Transactions (earned commissions tracking)
export const commissions = sqliteTable('commissions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  policyId: integer('policy_id').references(() => policies.id),
  noteId: integer('note_id').references(() => notes.id),
  agentId: integer('agent_id').references(() => agents.id),
  structureId: integer('structure_id').references(() => commissionStructures.id),
  commissionType: text('commission_type').notNull(), // 'percentage' | 'flat'
  rate: real('rate').notNull(),
  baseAmount: real('base_amount').notNull(), // gross premium or brokerage amount
  commissionAmount: real('commission_amount').notNull(),
  status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'paid'
  statementId: integer('statement_id'), // References commission statement when grouped
  paidDate: text('paid_date'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  agentIndex: index('commission_agent_idx').on(table.agentId, table.status),
  policyIndex: index('commission_policy_idx').on(table.policyId),
}));

// Commission Statements (grouped payments to agents)
export const commissionStatements = sqliteTable('commission_statements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  statementNumber: text('statement_number').notNull().unique(),
  agentId: integer('agent_id').references(() => agents.id),
  periodStart: text('period_start').notNull(),
  periodEnd: text('period_end').notNull(),
  totalCommission: real('total_commission').notNull(),
  status: text('status').notNull().default('draft'), // 'draft' | 'issued' | 'paid'
  issuedDate: text('issued_date'),
  paidDate: text('paid_date'),
  paymentReference: text('payment_reference'),
  notes: text('notes'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  agentIndex: index('statement_agent_idx').on(table.agentId, table.periodStart),
}));

// Claims Management
export const claims = sqliteTable('claims', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  claimNumber: text('claim_number').notNull().unique(), // CLM/2025/000001
  policyId: integer('policy_id').references(() => policies.id),
  claimantName: text('claimant_name').notNull(),
  claimantPhone: text('claimant_phone'),
  claimantEmail: text('claimant_email'),
  lossDate: text('loss_date').notNull(), // Date of incident
  reportedDate: text('reported_date').notNull(), // Date claim was reported
  lossLocation: text('loss_location'),
  lossDescription: text('loss_description').notNull(),
  claimAmount: real('claim_amount').notNull(), // Initial claimed amount
  estimatedLoss: real('estimated_loss'), // Loss adjuster's estimate
  approvedAmount: real('approved_amount'), // Amount approved for settlement
  settlementAmount: real('settlement_amount'), // Final paid amount
  status: text('status').notNull().default('Registered'), // 'Registered', 'UnderInvestigation', 'Approved', 'Rejected', 'Settled', 'Closed'
  priority: text('priority').notNull().default('Medium'), // 'Low', 'Medium', 'High', 'Critical'
  adjusterAssignedId: integer('adjuster_assigned_id').references(() => users.id), // Loss adjuster (user with role='Claims')
  assignedDate: text('assigned_date'),
  investigationNotes: text('investigation_notes'),
  rejectionReason: text('rejection_reason'),
  settlementDate: text('settlement_date'),
  closedDate: text('closed_date'),
  closureReason: text('closure_reason'),
  currency: text('currency').notNull().default('NGN'),
  exchangeRate: real('exchange_rate').default(1.0),
  registeredBy: integer('registered_by').references(() => users.id),
  approvedBy: integer('approved_by').references(() => users.id),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  policyIndex: index('claim_policy_idx').on(table.policyId),
  statusIndex: index('claim_status_idx').on(table.status),
  adjusterIndex: index('claim_adjuster_idx').on(table.adjusterAssignedId),
  lossDateIndex: index('claim_loss_date_idx').on(table.lossDate),
}));

// Claim Documents
export const claimDocuments = sqliteTable('claim_documents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  claimId: integer('claim_id').references(() => claims.id),
  documentType: text('document_type').notNull(), // 'police_report', 'photos', 'estimate', 'invoice', 'medical_report', 'other'
  fileName: text('file_name').notNull(),
  filePath: text('file_path').notNull(),
  fileSize: integer('file_size'),
  mimeType: text('mime_type'),
  sha256Hash: text('sha256_hash'),
  description: text('description'),
  uploadedBy: integer('uploaded_by').references(() => users.id),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  claimIndex: index('claim_doc_claim_idx').on(table.claimId),
}));

// Claim Notes/Comments
export const claimNotes = sqliteTable('claim_notes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  claimId: integer('claim_id').references(() => claims.id),
  noteText: text('note_text').notNull(),
  noteType: text('note_type').notNull().default('general'), // 'general', 'investigation', 'internal', 'client_communication'
  isInternal: integer('is_internal', { mode: 'boolean' }).default(false), // True = not visible to client
  createdBy: integer('created_by').references(() => users.id),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  claimIndex: index('claim_note_claim_idx').on(table.claimId),
}));

// Claim Sequences for auto-numbering
export const claimSequences = sqliteTable('claim_sequences', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  year: integer('year').notNull(),
  lastSeq: integer('last_seq').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  uniqueYear: index('unique_claim_year').on(table.year),
}));

// Import Batches (for bulk policy/client/agent imports)
export const importBatches = sqliteTable('import_batches', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  batchNumber: text('batch_number').notNull().unique(), // IMP/2025/000001
  importType: text('import_type').notNull(), // 'policies', 'clients', 'agents', 'claims'
  fileName: text('file_name').notNull(),
  fileSize: integer('file_size'),
  totalRows: integer('total_rows').notNull().default(0),
  successRows: integer('success_rows').notNull().default(0),
  failedRows: integer('failed_rows').notNull().default(0),
  status: text('status').notNull().default('pending'), // 'pending', 'processing', 'completed', 'failed'
  validationErrors: text('validation_errors', { mode: 'json' }), // Array of error objects
  importedData: text('imported_data', { mode: 'json' }), // Summary of imported records
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
  importedBy: integer('imported_by').references(() => users.id),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  typeIndex: index('import_batch_type_idx').on(table.importType),
  statusIndex: index('import_batch_status_idx').on(table.status),
}));

// Import Batch Sequences
export const importBatchSequences = sqliteTable('import_batch_sequences', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  year: integer('year').notNull(),
  lastSeq: integer('last_seq').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  uniqueYear: index('unique_import_batch_year').on(table.year),
}));

// Policy Property Items for Broking Slip (line items based on Sub-LOB type)
export const policyPropertyItems = sqliteTable('policy_property_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  policyId: integer('policy_id').references(() => policies.id).notNull(),
  slNo: integer('sl_no').notNull(), // Serial number/row order
  itemType: text('item_type').notNull(), // 'fire_perils', 'public_liability', 'business_interruption', 'marine', 'motor'

  // Common fields for all types
  description: text('description').notNull(),
  details: text('details'), // Memo field for liability and BI

  // Fire & Special Perils fields
  value: real('value'), // Per unit value
  noOfUnits: real('no_of_units'), // Number of units
  sumInsured: real('sum_insured'), // value x noOfUnits

  // Public Liability fields
  maxLiability: real('max_liability'), // Maximum Limit of Liability/Indemnity
  aoaAmount: real('aoa_amount'), // Any One Accident amount
  aoyAmount: real('aoy_amount'), // Any One Year amount

  // Business Interruption fields
  grossProfit: real('gross_profit'),
  netProfit: real('net_profit'),
  standingCharges: real('standing_charges'),
  auditorFees: real('auditor_fees'),
  increasedCostOfWorking: real('increased_cost_of_working'),
  indemnityPeriodMonths: integer('indemnity_period_months'), // In months

  // Common calculation fields
  rate: real('rate').notNull(), // Rate percentage
  premium: real('premium').notNull(), // Calculated premium

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  policyIdIndex: index('policy_property_items_policy_idx').on(table.policyId),
}));

// Policy Co-Insurance Shares (Proposed shares for broking slip)
export const policyCoInsuranceShares = sqliteTable('policy_co_insurance_shares', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  policyId: integer('policy_id').references(() => policies.id).notNull(),
  insurerId: integer('insurer_id').references(() => insurers.id).notNull(),
  sharePercentage: real('share_percentage').notNull(), // e.g., 70.00 for 70%
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  policyIdIndex: index('policy_co_insurance_shares_policy_idx').on(table.policyId),
}));

// Alias for backward compatibility
export const sequences = entitySequences;
export const clientSequences = entitySequences;