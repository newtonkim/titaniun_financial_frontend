import type { ISODate, ISODateTime, Money } from '@/core/api/types'
import type { Member } from '@/modules/members/types'

export type InterestMethod = 'flat' | 'reducing_balance'
export type InterestPeriod = 'per_month' | 'per_year'
export type RepaymentStructure = 'equal_installment' | 'equal_principal' | 'interest_only_balloon'
export type RepaymentFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'
export type DurationType = 'days' | 'weeks' | 'months' | 'years'
export type ChargeType = 'none' | 'flat' | 'percentage'
export type PenaltyType = ChargeType | 'percentage_per_day'
export type LoanStatus =
  | 'draft'
  | 'awaiting_guarantors'
  | 'submitted'
  | 'under_review'
  | 'awaiting_documents'
  | 'returned_for_correction'
  | 'officer_recommended'
  | 'committee_voting'
  | 'declined'
  | 'cancelled'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'disbursed'
  | 'closed'
  | 'written_off'

export const LOAN_STATUSES: LoanStatus[] = [
  'draft',
  'awaiting_guarantors',
  'submitted',
  'under_review',
  'awaiting_documents',
  'returned_for_correction',
  'officer_recommended',
  'committee_voting',
  'declined',
  'cancelled',
  'pending',
  'approved',
  'rejected',
  'disbursed',
  'closed',
  'written_off',
]

/** The ledger accounts a loan product posts to. */
export type LoanProductAccountField =
  | 'commission_expense_account_id'
  | 'commission_payable_account_id'
  | 'loan_portfolio_account_id'
  | 'interest_income_account_id'
  | 'interest_receivable_account_id'
  | 'disbursement_account_id'
  | 'penalty_income_account_id'
  | 'penalty_receivable_account_id'
  | 'charges_income_account_id'
  | 'charges_receivable_account_id'

export interface AccountSummary {
  id: number
  code: string
  name: string
}

/** Editable product settings, as sent to the API. */
export interface LoanProductSettings extends Record<LoanProductAccountField, number | null> {
  name: string
  code: string
  description: string | null
  commission_rate: Money | number
  interest_rate: Money | number | null
  interest_method: InterestMethod | null
  interest_period: InterestPeriod
  repayment_structure: RepaymentStructure
  repayment_frequency: RepaymentFrequency
  min_amount: Money | number | null
  max_amount: Money | number | null
  min_term: number
  max_term: number | null
  duration_type: DurationType
  grace_period: number
  warning_days: number | null
  processing_fee_type: ChargeType
  processing_fee_value: Money | number
  penalty_type: PenaltyType
  penalty_rate: Money | number
  penalty_grace_days: number
  savings_appraisal_threshold: Money | number
  max_securities: number
  security_value_percentage: Money | number
  is_active: boolean
}

export interface LoanProduct extends LoanProductSettings {
  id: number
  interest_rate: Money
  interest_method: InterestMethod
  min_amount: Money
  max_amount: Money | null
  min_term: number
  max_term: number
  loan_portfolio_account?: AccountSummary | null
  interest_income_account?: AccountSummary | null
  interest_receivable_account?: AccountSummary | null
  disbursement_account?: AccountSummary | null
  penalty_income_account?: AccountSummary | null
  penalty_receivable_account?: AccountSummary | null
  charges_income_account?: AccountSummary | null
  charges_receivable_account?: AccountSummary | null
  loan_count?: number
  is_in_use?: boolean
  created_at: ISODateTime | null
  updated_at: ISODateTime | null
}

export type LoanProductFilters = { active?: boolean; search?: string; per_page?: number }

export interface LoanProductPreviewRow {
  due_date?: string
  fees?: number
  period: number
  principal: number
  interest: number
  installment: number
  balance: number
}

export interface LoanProductPreview {
  commission_rate?: number
  commission_amount?: number
  company_interest?: number
  total_charges?: number
  charges_with_repayment?: number
  upfront_charges?: number
  processing_fee?: number
  net_disbursement?: number
  installment_amount: number
  total_interest: number
  total_repayment: number
  schedule_preview: LoanProductPreviewRow[]
  messages: string[]
  assumptions: string[]
}

export interface LoanApplicationData {
  applicant_type: 'individual' | 'business'
  display_name: string
  national_id: string
  date_of_birth: string
  employer: string
  occupation: string
  address: string
  district: string
  phone: string
  email: string
  business_registration_number: string
  business_activity: string
  signatory_name: string
  signatory_title: string
  signatory_national_id: string
  declaration_accepted: boolean
  declaration_name: string
}
export interface LoanChargeInput {
  name: string
  amount: string
  frequency: 'once' | 'monthly'
  collection: 'upfront' | 'repayment'
  chart_of_account_id: number
}
export interface LoanCharge extends LoanChargeInput {
  id: number
  paid_amount: string
}
export interface LoanSignature {
  id: number
  signer_type: string
  signer_name: string
  guarantor_id: number | null
  loan_document_id: number
  agreement_revision: number
  signed_at: string
  details: Record<string, string> | null
}
export interface Loan {
  application_type: 'standard' | 'continuing'
  agreement_date: ISODate | null
  first_repayment_date: ISODate | null
  execution_checklist?: { key: string; label: string; complete: boolean }[]
  application_version: number
  agreement_revision: number
  application_data: Partial<LoanApplicationData> | null
  application_snapshot: Record<string, unknown> | null
  approved_snapshot: Record<string, unknown> | null
  agreement_history: {
    snapshot: LoanAgreementSnapshot
    pricing_review: Record<string, unknown> | null
    archived_at: string
  }[]
  pricing_review: Record<string, unknown> | null
  deferred_until: string | null
  charges?: LoanCharge[]
  signatures?: LoanSignature[]
  id: number
  loan_number: string
  uses_workflow: boolean
  purpose: string | null
  repayment_source: string | null
  loan_officer_id: number | null
  officer?: { id: number; name: string } | null
  created_by: number | null
  appraised_by: number | null
  recommended_by: number | null
  recommended_amount: Money | null
  recommended_term: number | null
  recommended_interest_rate: Money | null
  risk_rating: string | null
  appraisal_notes: string | null
  submitted_at: ISODateTime | null
  disbursement_method: string | null
  disbursement_reference: string | null
  processing_fee_amount?: Money
  net_disbursed_amount?: Money | null
  commission_rate: Money
  commission_member_id: number | null
  commission_member?: { id: number; name: string; member_number: string } | null
  interest_method: InterestMethod | null
  recommended_interest_method: InterestMethod | null
  scheduled_charges: Money
  outstanding_charges?: Money
  scheduled_interest: Money
  outstanding_interest?: Money
  available_actions?: LoanAction[]
  committee_votes_required?: number
  repayment_preview?: LoanProductPreview
  collaterals?: LoanCollateral[]
  guarantors?: LoanGuarantor[]
  documents?: LoanDocument[]
  votes?: LoanVote[]
  events?: LoanWorkflowEvent[]
  installments?: LoanInstallment[]
  member_id: number
  borrower?: Member
  loan_product_id: number
  product?: LoanProduct
  principal: Money
  interest_rate: Money
  term: number
  status: LoanStatus
  outstanding_principal?: Money
  approved_at: ISODateTime | null
  disbursed_at: ISODateTime | null
  maturity_date: ISODate | null
  created_at: ISODateTime | null
  updated_at: ISODateTime | null
}

export interface StoreLoanPayload {
  application_type?: 'standard' | 'continuing'
  agreement_date?: ISODate | null
  first_repayment_date?: ISODate | null
  application_data?: Partial<LoanApplicationData>
  charges?: LoanChargeInput[]
  interest_method?: InterestMethod
  commission_member_id?: number | null
  loan_number?: string
  purpose?: string
  repayment_source?: string
  loan_officer_id?: number | null
  collaterals?: LoanCollateralInput[]
  guarantors?: LoanGuarantorInput[]
  member_id: number
  loan_product_id: number
  principal: Money
  term: number
}

export interface UpdateLoanPayload {
  application_type?: 'standard' | 'continuing'
  agreement_date?: ISODate | null
  first_repayment_date?: ISODate | null
  application_data?: Partial<LoanApplicationData>
  charges?: LoanChargeInput[]
  interest_method?: InterestMethod
  commission_member_id?: number | null
  purpose?: string
  repayment_source?: string
  loan_officer_id?: number | null
  collaterals?: LoanCollateralInput[]
  guarantors?: LoanGuarantorInput[]
  principal?: Money
  term?: number
}

export type LoanFilters = {
  status?: LoanStatus | ''
  member_id?: number
}

export interface LoanRepayment {
  fees_paid: Money
  id: number
  loan_id: number
  amount: Money
  principal_paid: Money
  interest_paid: Money
  company_interest: Money | null
  commission_amount: Money | null
  journal_entry_id: number | null
  commission?: LoanCommission | null
  paid_at: ISODateTime
  reference: string | null
  /** The receipt issued for this payment. */
  receipt?: { id: number; number: number } | null
  created_at: ISODateTime | null
}

export interface StoreLoanRepaymentPayload {
  principal_paid: Money
  interest_paid: Money
  paid_at?: ISODateTime | null
  reference?: string | null
  payment_method?: string | null
}

export type LoanAction =
  | 'edit'
  | 'submit'
  | 'consent'
  | 'take-review'
  | 'resume-review'
  | 'request-documents'
  | 'return'
  | 'appraise'
  | 'recommend'
  | 'vote'
  | 'disburse'
  | 'reject'
  | 'cancel'
  | 'reopen'
  | 'repay'
  | 'documents'
export interface LoanCollateralInput {
  asset_type: string
  description: string
  estimated_value: Money
  notes: string
}
export interface LoanCollateral extends LoanCollateralInput {
  id: number
}
export interface LoanGuarantorInput {
  member_id: number
  guaranteed_amount: Money
}
export interface LoanGuarantor extends LoanGuarantorInput {
  id: number
  status: string
  consent_evidence: string | null
  consented_at: ISODateTime | null
  recorded_by: number | null
  member: { id: number; name: string; member_number: string }
}
export interface LoanDocument {
  category?: string
  verification_status?: string
  verification_notes?: string | null
  agreement_revision?: number
  guarantor_id?: number | null
  sha256?: string | null
  id: number
  title: string
  original_name: string
  mime_type: string
  size: number
  created_at: ISODateTime
}
export interface LoanVote {
  id: number
  user_id: number
  decision: 'approve' | 'decline'
  comments: string
  created_at: ISODateTime
  user: { id: number; name: string }
}
export interface LoanWorkflowEvent {
  id: number
  event: string
  from_status: LoanStatus | null
  to_status: LoanStatus
  notes: string | null
  created_at: ISODateTime
  user: { id: number; name: string } | null
}
export interface LoanInstallment {
  fees: Money
  fees_paid: Money
  id: number
  period: number
  due_date: string
  principal: Money
  interest: Money
  principal_paid: Money
  interest_paid: Money
}
export interface LoanEligibility {
  eligible: boolean
  checks: { key: string; label: string; passed: boolean; reason?: string | null }[]
  savings_balance: Money
  required_savings: Money
  required_security: Money
  provided_security: Money
}
export interface LoanOptions {
  roles?: string[]
  permissions?: string[]
  can_manage_access?: boolean
  application_policy?: { minimum_guarantors: number; template_version: string }
  officers: { id: number; name: string }[]
  committee_votes_required: number
}
export interface LoanPaymentPayload {
  amount: Money
  paid_at: string
  reference: string
  payment_method?: string | null
}

export interface LoanCommission {
  id: number
  loan_id: number
  loan_number?: string
  loan_repayment_id: number
  beneficiary_id: number | null
  beneficiary_member_id: number | null
  beneficiary_member?: { id: number; name: string; member_number: string } | null
  recipient_type: 'loan_officer' | 'guarantor'
  beneficiary?: { id: number; name: string }
  interest_amount: Money
  commission_rate: Money
  amount: Money
  status: 'payable' | 'paid'
  payable_account_id: number
  journal_entry_id: number
  eligible_on: string | null
  collection_quarter_end: string
  loan_cleared_at: ISODateTime | null
  held_for_clearance: boolean
  earned_at: ISODateTime
  paid_at: ISODateTime | null
  paid_by: number | null
  payment_reference: string | null
  payment_method: string | null
  payment_account_id: number | null
  payment_journal_entry_id: number | null
  recorded_by: number | null
}
export interface CommissionPaymentPayload {
  paid_at: string
  payment_reference: string
  payment_method: string
  payment_account_id: number
}

export interface LoanAgreementSnapshot {
  application_type?: 'standard' | 'continuing'
  template_sha256?: string
  agreement_date?: string | null
  first_repayment_date?: string | null
  repayment_preview?: LoanProductPreview
  template_version: string
  revision: number
  loan_number: string
  applicant: Partial<LoanApplicationData>
  principal: string
  annual_interest_rate: string
  monthly_interest_rate: string
  interest_method: string
  term: number
  repayment_frequency: string
  processing_fee_type: string
  processing_fee_value: string
  charges: LoanChargeInput[]
  guarantors: {
    id: number
    name: string
    national_id: string
    phone: string
    address: string
    guaranteed_amount: string
  }[]
  collaterals: { asset_type: string; description: string; estimated_value: string; notes: string | null }[]
  terms_hash: string
  approved_at: string
}

export type LoanCollectionView = 'past_due' | 'due_today' | 'upcoming'

/** One unpaid instalment on the call list. */
export interface LoanCollectionRow {
  id: number
  loan_id: number
  loan_number: string
  member_id: number | null
  member_name: string | null
  member_number: string | null
  phone: string | null
  period: number
  due_date: ISODate
  days_late: number
  amount_due: Money
  /** Everything overdue on this instalment's loan. */
  total_arrears: Money
}

export type LoanCollectionSummary = Record<LoanCollectionView, { amount: Money; installments: number; loans: number }>
