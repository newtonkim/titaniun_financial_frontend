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

export interface CashFlowMonth {
  /** Y-m */
  month: string
  inflow: Money
  outflow: Money
  net: Money
}

export type ActivityDirection = 'in' | 'out'

export interface DashboardActivity {
  type: string
  label: string
  party: string | null
  reference: string | null
  occurred_at: string
  amount: Money
  direction: ActivityDirection
}

export interface DashboardSummary {
  as_of: ISODate
  members: { total: number; active: number; joined_this_month: number }
  savings: { balance: Money; active_accounts: number; dormant_accounts: number }
  loans: { outstanding_principal: Money; active: number; pending: number; awaiting_disbursement: number }
  shares: { value: Money; shares_held: number; active_accounts: number }
  expenses: { this_month: Money; count_this_month: number }
  cash_flow: { months: CashFlowMonth[]; total_inflow: Money; total_outflow: Money; net: Money }
  recent_activity: DashboardActivity[]
}
