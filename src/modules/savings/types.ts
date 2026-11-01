import type { ISODate, ISODateTime, Money } from '@/core/api/types'
import type { Member } from '@/modules/members/types'

export type SavingsAccountStatus = 'active' | 'dormant' | 'closed'
export type SavingsTransactionType = 'deposit' | 'withdrawal' | 'interest' | 'dividend' | 'fee'

export const SAVINGS_ACCOUNT_STATUSES: SavingsAccountStatus[] = ['active', 'dormant', 'closed']

export type SavingsProductType = 'standard' | 'fixed'
export type FeeMeasure = 'amount' | 'percentage'
export type ChargeTrigger = 'deposit' | 'withdraw' | 'transfer'
export type LoyaltyAdjustmentType = 'discount_percentage' | 'fixed_discount' | 'custom_fee'
export type InterestPayoutType = 'at_maturity' | 'periodic_payout' | 'compound'
export type InterestPostingFrequency = 'monthly' | 'quarterly' | 'semi_annually' | 'annually'
export type MaturityAction = 'manual' | 'auto_rollover' | 'convert_to_savings'

/** A charge band: transactions of `type` between the minimum and maximum are charged `amount`. */
export interface SavingsProductCharge {
  id?: number
  type: ChargeTrigger
  minimum_amount: Money | number
  maximum_amount: Money | number | null
  charge_type: FeeMeasure
  amount: Money | number
}

/** Editable product settings, as sent to the API. */
export interface SavingsProductSettings {
  name: string
  code?: string
  description?: string | null
  type: SavingsProductType
  interest_rate: Money | number
  minimum_balance: Money | number
  minimum_maturity_months: number
  dormancy_period_months: number
  charge_on_deposit: boolean
  charge_on_withdraw: boolean
  charge_on_transfer: boolean
  monthly_fee_enabled: boolean
  monthly_fee_type: FeeMeasure | null
  monthly_fee_amount: Money | number | null
  monthly_fee_deduction_day: number
  loyalty_fee_enabled: boolean
  loyalty_adjustment_type: LoyaltyAdjustmentType | null
  loyalty_adjustment_value: Money | number | null
  interest_payout_type: InterestPayoutType | null
  interest_posting_frequency: InterestPostingFrequency | null
  default_tenor_months: number | null
  maturity_action: MaturityAction | null
  convert_to_product_id: number | null
  liability_account_id: number | null
  cash_account_id: number | null
  interest_expense_account_id: number | null
  interest_payable_account_id: number | null
  is_active: boolean
  charges: SavingsProductCharge[]
}

export interface SavingsProduct extends SavingsProductSettings {
  id: number
  code: string
  description: string | null
  interest_rate: Money
  minimum_balance: Money
  account_count?: number
  created_at: ISODateTime | null
  updated_at: ISODateTime | null
}

export type SavingsProductFilters = { active?: boolean; search?: string; per_page?: number }

export interface SavingsAccount {
  id: number
  account_number: string
  member_id: number
  member?: Member
  savings_product_id: number
  product?: SavingsProduct
  status: SavingsAccountStatus
  custom_monthly_fee_enabled?: boolean
  custom_monthly_fee_type?: FeeMeasure | null
  custom_monthly_fee_amount?: Money | null
  balance?: Money
  /** What could be withdrawn today, after the product minimum and any guarantee. */
  available_balance?: Money
  /** Savings the member has pledged to guarantee loans, across all their accounts. */
  pledged_amount?: Money
  last_member_activity_at?: ISODateTime | null
  frozen_at: ISODateTime | null
  freeze_reason_code: SavingsFreezeReason | null
  freeze_reason: string | null
  pending_request?: SavingsAccountRequest | null
  opened_at: ISODate
  closed_at: ISODate | null
  created_at: ISODateTime | null
  updated_at: ISODateTime | null
}

export type SavingsFreezeReason = 'court_order' | 'deceased_member' | 'dispute' | 'suspected_fraud' | 'other'
export const SAVINGS_FREEZE_REASONS: SavingsFreezeReason[] = ['court_order', 'deceased_member', 'dispute', 'suspected_fraud', 'other']

export type SavingsAccountRequestType = 'close' | 'reactivate' | 'release_freeze'

/** A close, reactivate or freeze release that waits for a second person. */
export interface SavingsAccountRequest {
  id: number
  savings_account_id: number
  account_number?: string
  member_name?: string | null
  type: SavingsAccountRequestType
  status: 'pending' | 'approved' | 'rejected'
  reason: string
  requested_by: string
  requested_by_id: number | null
  decided_by: string | null
  decided_at: ISODateTime | null
  rejection_reason: string | null
  created_at: ISODateTime | null
}

export type SavingsAccountEventType = 'marked_dormant' | 'frozen' | 'request_submitted' | 'request_rejected' | 'closed' | 'reactivated' | 'freeze_released'

/** A permanent entry in the account's history. */
export interface SavingsAccountEvent {
  id: number
  event: SavingsAccountEventType
  request_type: SavingsAccountRequestType | null
  from_status: SavingsAccountStatus | null
  to_status: SavingsAccountStatus | null
  reason: string
  actor: string
  created_at: ISODateTime | null
}

export interface StoreSavingsAccountPayload {
  account_number: string
  member_id: number
  savings_product_id: number
  opened_at?: ISODate | null
}

export type SavingsAccountFilters = {
  status?: SavingsAccountStatus | ''
  member_id?: number
  savings_product_id?: number | ''
  opened_from?: ISODate
  opened_to?: ISODate
  closed_from?: ISODate
  closed_to?: ISODate
  quiet_months?: number | ''
}

export interface SavingsTransaction {
  id: number
  savings_account_id: number
  type: SavingsTransactionType
  amount: Money
  transacted_at: ISODateTime
  reference: string | null
  created_at: ISODateTime | null
  narration?: string | null
  transacted_by?: string | null
  recorded_by?: string | null
  reversal_of_id?: number | null
  reversed_at?: ISODateTime | null
  is_reversible?: boolean
}

export interface StoreSavingsTransactionPayload {
  type: SavingsTransactionType
  amount: Money
  transacted_at?: ISODateTime | null
  reference?: string | null
  /** Cash, bank or mobile money account the money moved through; defaults to the product's. */
  payment_account_id?: number | null
  narration?: string | null
  /** Who paid the money in or collected it. */
  transacted_by?: string | null
}

export type ReversalStatus = 'pending' | 'approved' | 'rejected'

export interface SavingsReversal {
  id: number
  status: ReversalStatus
  reason: string
  savings_transaction_id: number
  transaction?: SavingsTransaction
  account_number?: string
  member_name?: string
  requested_by?: string | null
  requested_by_id: number | null
  decided_by?: string | null
  decided_at: ISODateTime | null
  rejection_reason: string | null
  reversal_transaction_id: number | null
  created_at: ISODateTime | null
}

export interface CustomFeePayload {
  custom_monthly_fee_enabled: boolean
  custom_monthly_fee_type: FeeMeasure | null
  custom_monthly_fee_amount: number | string | null
}

export interface SavingsReceipt {
  receipt_number: string
  reference: string | null
  transaction_type: SavingsTransactionType
  transacted_at: ISODateTime
  recorded_at: ISODateTime | null
  payment_mode: string | null
  received_by: string | null
  transacted_by: string | null
  narration: string | null
  currency_code: string
  branding: { sacco_name: string; tagline: string }
  member: { name: string; member_number: string; phone: string | null }
  account: { account_number: string; product: string }
  amount: Money
  balance_after: Money
  is_reversal: boolean
  is_reversed: boolean
}

export interface SavingsStatement {
  member: { name: string; member_number: string; phone: string | null; address: string | null }
  account: { id: number; account_number: string; product: string | null; status: string; opened_at: ISODate }
  period: { from: ISODate; to: ISODate }
  balances: { opening: Money; credits: Money; debits: Money; closing: Money }
  transactions: {
    id: number
    date: ISODate
    type: SavingsTransactionType
    description: string
    reference: string | null
    credit: Money
    debit: Money
    balance: Money
    is_reversal: boolean
    is_reversed: boolean
  }[]
}
