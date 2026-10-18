import type { ISODate, Money } from '@/core/api/types'
import type { AccountType } from '@/modules/accounting/types'

export interface TrialBalanceRow {
  code: string
  name: string
  type: AccountType
  debit: Money
  credit: Money
}

export interface TrialBalance {
  as_of: ISODate
  rows: TrialBalanceRow[]
  total_debit: Money
  total_credit: Money
}
