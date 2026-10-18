import type { ISODate, ISODateTime, Money } from '@/core/api/types'
import type { Member } from '@/modules/members/types'

export type SavingsAccountStatus = 'active' | 'dormant' | 'closed'
export type SavingsTransactionType = 'deposit' | 'withdrawal' | 'interest'

export const SAVINGS_ACCOUNT_STATUSES: SavingsAccountStatus[] = ['active', 'dormant', 'closed']

export interface SavingsProduct {
  id: number
  name: string
  code: string
  description: string | null
  interest_rate: Money
  minimum_balance: Money
  liability_account_id: number | null
  is_active: boolean
  created_at: ISODateTime | null
  updated_at: ISODateTime | null
}

export interface StoreSavingsProductPayload {
  name: string
  code: string
  description?: string | null
  interest_rate: Money
  minimum_balance?: Money
  liability_account_id?: number | null
  is_active?: boolean
}

export type SavingsProductFilters = { active?: boolean }

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
