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
  created_at: ISODateTime | null
}

export interface StoreShareTransactionPayload {
  /** Transfers go through `transfer()` instead. */
  type: Extract<ShareTransactionType, 'purchase' | 'redemption'>
  number_of_shares: number
  transacted_at?: ISODateTime | null
  reference?: string | null
}

export interface StoreShareTransferPayload {
  to_share_account_id: number
  number_of_shares: number
  transacted_at?: ISODateTime | null
  reference?: string | null
}
