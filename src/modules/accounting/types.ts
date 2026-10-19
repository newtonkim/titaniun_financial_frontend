import type { ISODate, ISODateTime, Money } from '@/core/api/types'

export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense'

export const ACCOUNT_TYPES: AccountType[] = ['asset', 'liability', 'equity', 'income', 'expense']

export interface ChartOfAccount {
  id: number
  code: string
  name: string
  type: AccountType
  subtype: string | null
  level: number
  is_postable: boolean
  parent_id: number | null
  description: string | null
  is_active: boolean
  created_at: ISODateTime | null
  updated_at: ISODateTime | null
}

export interface StoreChartOfAccountPayload {
  code: string
  name: string
  type: AccountType
  parent_id?: number | null
  description?: string | null
  is_active?: boolean
}

export type ChartOfAccountFilters = {
  type?: AccountType | ''
  is_active?: boolean
}

export interface JournalEntryLine {
  id: number
  chart_of_account_id: number
  account?: ChartOfAccount
  debit: Money
  credit: Money
  memo: string | null
}

export interface JournalEntry {
  id: number
  reference: string
  entry_date: ISODate
  description: string | null
  source_type: string | null
  source_id: number | null
  lines?: JournalEntryLine[]
  created_at: ISODateTime | null
}

export interface StoreJournalEntryPayload {
  reference: string
  entry_date: ISODate
  description?: string | null
  lines: Array<{
    chart_of_account_id: number
    debit?: Money | null
    credit?: Money | null
    memo?: string | null
  }>
}

export type JournalEntryFilters = {
  from?: ISODate
  to?: ISODate
}
