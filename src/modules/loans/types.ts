import type { ISODate, ISODateTime, Money } from '@/core/api/types'
import type { Member } from '@/modules/members/types'

export type InterestMethod = 'flat' | 'reducing_balance'
export type InterestPeriod = 'per_month' | 'per_year'
export type RepaymentStructure = 'equal_installment' | 'equal_principal' | 'interest_only_balloon'
export type RepaymentFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'
export type DurationType = 'days' | 'weeks' | 'months' | 'years'
export type ChargeType = 'none' | 'flat' | 'percentage'
export type PenaltyType = ChargeType | 'percentage_per_day'
export type LoanStatus = 'pending' | 'approved' | 'rejected' | 'disbursed' | 'closed' | 'written_off'

export const LOAN_STATUSES: LoanStatus[] = ['pending', 'approved', 'rejected', 'disbursed', 'closed', 'written_off']

/** The ledger accounts a loan product posts to. */
export type LoanProductAccountField =
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
  interest_rate: Money | number | null
  interest_method: InterestMethod | null
  interest_period: InterestPeriod
  repayment_structure: RepaymentStructure
  repayment_frequency: RepaymentFrequency
  min_amount: Money | number | null
  max_amount: Money | number | null
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
  max_amount: Money
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
  period: number
  principal: number
  interest: number
  installment: number
  balance: number
}

export interface LoanProductPreview {
  installment_amount: number
  total_interest: number
  total_repayment: number
  schedule_preview: LoanProductPreviewRow[]
  messages: string[]
  assumptions: string[]
}

export interface Loan {
  id: number
  loan_number: string
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
  loan_number: string
  member_id: number
  loan_product_id: number
  principal: Money
  term: number
}

export interface UpdateLoanPayload {
  principal?: Money
  term?: number
}

export type LoanFilters = {
  status?: LoanStatus | ''
  member_id?: number
}

export interface LoanRepayment {
  id: number
  loan_id: number
  amount: Money
  principal_paid: Money
  interest_paid: Money
  paid_at: ISODateTime
  reference: string | null
  created_at: ISODateTime | null
}

export interface StoreLoanRepaymentPayload {
  principal_paid: Money
  interest_paid: Money
  paid_at?: ISODateTime | null
  reference?: string | null
}
