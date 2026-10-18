import type { ISODate, ISODateTime, Money } from '@/core/api/types'
import type { Member } from '@/modules/members/types'

export type InterestMethod = 'flat' | 'reducing_balance'
export type RepaymentFrequency = 'weekly' | 'monthly'
export type LoanStatus = 'pending' | 'approved' | 'rejected' | 'disbursed' | 'closed' | 'written_off'

export const LOAN_STATUSES: LoanStatus[] = ['pending', 'approved', 'rejected', 'disbursed', 'closed', 'written_off']

export interface LoanProduct {
  id: number
  name: string
  code: string
  description: string | null
  interest_rate: Money
  interest_method: InterestMethod
  repayment_frequency: RepaymentFrequency
  min_amount: Money
  max_amount: Money
  min_term: number
  max_term: number
  processing_fee_rate: Money
  loan_portfolio_account_id: number | null
  interest_income_account_id: number | null
  is_active: boolean
  created_at: ISODateTime | null
  updated_at: ISODateTime | null
}

export interface StoreLoanProductPayload {
  name: string
  code: string
  description?: string | null
  interest_rate: Money
  interest_method: InterestMethod
  repayment_frequency: RepaymentFrequency
  min_amount: Money
  max_amount: Money
  min_term: number
  max_term: number
  processing_fee_rate?: Money
  loan_portfolio_account_id?: number | null
  interest_income_account_id?: number | null
  is_active?: boolean
}

export type LoanProductFilters = { active?: boolean }

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
