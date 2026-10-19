import type { ISODate, ISODateTime, Money } from '@/core/api/types'
import type { Member } from '@/modules/members/types'

export type SavingsAccountStatus = 'active' | 'dormant' | 'closed'
export type SavingsTransactionType = 'deposit' | 'withdrawal' | 'interest'

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
  balance?: Money
  opened_at: ISODate
  closed_at: ISODate | null
  created_at: ISODateTime | null
  updated_at: ISODateTime | null
}

export interface StoreSavingsAccountPayload {
  account_number: string
  member_id: number
  savings_product_id: number
  opened_at?: ISODate | null
}

export interface UpdateSavingsAccountPayload {
  status: SavingsAccountStatus
}

export type SavingsAccountFilters = {
  status?: SavingsAccountStatus | ''
  member_id?: number
  savings_product_id?: number
}

export interface SavingsTransaction {
  id: number
  savings_account_id: number
  type: SavingsTransactionType
  amount: Money
  transacted_at: ISODateTime
  reference: string | null
  created_at: ISODateTime | null
}

export interface StoreSavingsTransactionPayload {
  type: SavingsTransactionType
  amount: Money
  transacted_at?: ISODateTime | null
  reference?: string | null
}
