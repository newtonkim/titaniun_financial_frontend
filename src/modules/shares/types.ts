import type { ISODate, ISODateTime, Money } from '@/core/api/types'
import type { Member } from '@/modules/members/types'

export type ShareAccountStatus = 'active' | 'closed'
export type ShareTransactionType = 'purchase' | 'redemption' | 'transfer_in' | 'transfer_out'

export const SHARE_ACCOUNT_STATUSES: ShareAccountStatus[] = ['active', 'closed']

export interface ShareProduct {
  id: number
  name: string
  code: string
  description: string | null
  nominal_price: Money
  minimum_shares: number
  equity_account_id: number | null
  cash_account_id: number | null
  is_active: boolean
  created_at: ISODateTime | null
  updated_at: ISODateTime | null
}

export interface StoreShareProductPayload {
  name: string
  code: string
  description?: string | null
  nominal_price: Money
  minimum_shares?: number
  equity_account_id?: number | null
  cash_account_id?: number | null
  is_active?: boolean
}

export type ShareProductFilters = { active?: boolean }

export interface ShareAccount {
  id: number
  account_number: string
  member_id: number
  member?: Member
  share_product_id: number
  product?: ShareProduct
  status: ShareAccountStatus
  /** Instalments paid that do not yet add up to a whole share. */
  subscription_balance: Money
  shares_held?: number
  share_value?: Money
  opened_at: ISODate
  created_at: ISODateTime | null
  updated_at: ISODateTime | null
}

export interface StoreShareAccountPayload {
  account_number: string
  member_id: number
  share_product_id: number
  opened_at?: ISODate | null
}

export interface UpdateShareAccountPayload {
  status: ShareAccountStatus
}

export type ShareAccountFilters = {
  status?: ShareAccountStatus | ''
  member_id?: number
  share_product_id?: number
}

export interface ShareTransaction {
  id: number
  share_account_id: number
  counterparty_share_account_id: number | null
  type: ShareTransactionType
  number_of_shares: number
  price_per_share: Money
  amount: Money
  transacted_at: ISODateTime
  reference: string | null
  journal_entry_id: number | null
  created_at: ISODateTime | null
}

export interface StoreShareTransactionPayload {
  /** Transfers go through `transfer()` instead; a redemption is a Share Transfer Fund buy-back. */
  type: Extract<ShareTransactionType, 'purchase' | 'redemption'>
  number_of_shares: number
  transacted_at?: ISODateTime | null
  reference?: string | null
  payment_account_id?: number | null
}

export interface StoreShareTransferPayload {
  to_share_account_id: number
  number_of_shares: number
  transacted_at?: ISODateTime | null
  reference?: string | null
}

export interface AllotSharesPayload {
  allotments: { member_id: number; number_of_shares: number }[]
  transacted_at?: ISODateTime | null
  reference?: string | null
  payment_account_id?: number | null
}

export interface ShareRegisterRow {
  member_id: number
  member_number: string
  name: string
  shares_held: number
  share_capital: Money
  percentage: string
  savings_balance: Money
  in_good_standing: boolean
  reasons: string[]
}

export interface ShareRegister {
  data: ShareRegisterRow[]
  meta: {
    paid_up_capital: Money
    shareholders: number
    maximum_holding: Money
    maximum_holding_fraction: string
    ownership_limit_applies: boolean
    minimum_savings: Money
  }
}

export interface MemberStanding {
  in_good_standing: boolean
  shares_held: number
  minimum_shares: number
  share_capital: Money
  savings_balance: Money
  minimum_savings: Money
  reasons: string[]
}

export interface ShareAppropriation {
  id: number
  financial_year: number
  surplus: Money
  share_capital: Money
  reserve_fund_rate: string
  reserve_fund_amount: Money
  share_transfer_fund_rate: string
  share_transfer_fund_amount: Money
  distributable: Money
  agm_reference: string | null
  journal_entry_id: number | null
  created_at: ISODateTime | null
}

export interface ShareAppropriations {
  data: ShareAppropriation[]
  meta: { reserve_fund_rate: string; share_transfer_fund_maximum_rate: string; share_transfer_fund_balance: Money }
}

export interface StoreShareAppropriationPayload {
  financial_year: number
  share_transfer_fund_rate: number
  agm_reference?: string | null
}

export type DividendStatus = 'draft' | 'approved' | 'paid'

export interface DividendPayout {
  id: number
  member_id: number
  member_number?: string
  member_name?: string
  share_account_id: number
  account_number?: string
  weighted_balance: Money
  amount: Money
  eligible: boolean
  ineligible_reason: string | null
  savings_account_id: number | null
  paid_at: ISODateTime | null
}

export interface DividendDeclaration {
  id: number
  financial_year: number
  share_product_id: number
  product?: ShareProduct
  rate: string
  status: DividendStatus
  weighted_capital: Money
  total_amount: Money
  eligible_members?: number
  agm_reference: string | null
  agm_held_on: ISODate | null
  notes: string | null
  approved_by?: string | null
  approved_at: ISODateTime | null
  paid_at: ISODateTime | null
  payouts?: DividendPayout[]
  created_at: ISODateTime | null
}

export interface DividendPolicy {
  operations_started_on: ISODate | null
  waiting_years: number
  first_dividend_year: number | null
  maximum_rate: string
  minimum_holding_months: number
}

export interface DividendDeclarations {
  data: DividendDeclaration[]
  meta: DividendPolicy
}

export interface StoreDividendPayload {
  share_product_id: number
  financial_year: number
  rate: number
  notes?: string | null
}

export interface ApproveDividendPayload {
  agm_reference: string
  agm_held_on: ISODate
}

export interface ShareSubscriptionPayment {
  id: number
  share_account_id: number
  amount: Money
  shares_issued: number
  balance_after: Money
  paid_at: ISODateTime
  reference: string | null
  journal_entry_id: number | null
}

export interface StoreShareSubscriptionPayload {
  amount: number
  paid_at?: ISODateTime | null
  reference?: string | null
  payment_account_id?: number | null
}

export interface ShareCertificate {
  id: number
  certificate_number: string
  share_account_id: number
  account_number?: string
  member_name?: string | null
  member_number?: string | null
  product_name?: string | null
  number_of_shares: number
  nominal_price: Money
  value: Money
  issued_on: ISODate
  issued_by?: string | null
  cancelled_at: ISODateTime | null
}

export interface ShareNominee {
  id?: number
  name: string
  relationship: string
  phone: string | null
  national_id: string | null
  percentage: Money | number
}
