import type { ISODate, Money } from '@/core/api/types'

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

export interface DashboardAgingBand {
  key: string
  label: string
  loans: number
  balance: Money
  share: Money | null
}

export interface DashboardOverdueLoan {
  id: number
  loan_number: string
  borrower: string | null
  days_overdue: number
  arrears: Money
  outstanding: Money
}

export interface DashboardPortfolio {
  portfolio: Money
  at_risk_30: Money
  /** Null when there is no active loan book to measure. */
  par_30: Money | null
  arrears: Money
  overdue_loans: number
  aging: DashboardAgingBand[]
  worst_overdue: DashboardOverdueLoan[]
}

export interface PrudentialRatio {
  key: string
  label: string
  value: Money | null
  limit: Money
  limit_type: 'minimum' | 'maximum'
  within_limit: boolean | null
}

export type AttentionKey =
  | 'overdue_loans'
  | 'loan_applications'
  | 'awaiting_disbursement'
  | 'pending_members'
  | 'savings_reversals'
  | 'savings_account_requests'
  | 'draft_journals'
  | 'draft_dividends'

export interface DashboardSummary {
  as_of: ISODate
  members: { total: number; active: number; joined_this_month: number }
  savings: { balance: Money; active_accounts: number; dormant_accounts: number }
  loans: { outstanding_principal: Money; active: number; pending: number; awaiting_disbursement: number }
  shares: { value: Money; shares_held: number; active_accounts: number }
  expenses: { this_month: Money; count_this_month: number }
  portfolio: DashboardPortfolio
  collections: {
    month: { due: Money; collected: Money; rate: Money | null }
    today: { due: Money; loans: number }
    next_7_days: { due: Money; loans: number }
  }
  prudential: { liquid_assets: Money; total_assets: Money; ratios: PrudentialRatio[] }
  this_month: {
    disbursed: Money
    disbursed_loans: number
    disbursed_last_month: Money
    repaid: Money
    deposits: Money
    withdrawals: Money
    surplus: Money
    surplus_year_to_date: Money
  }
  attention: { key: AttentionKey; count: number }[]
  cash_flow: { months: CashFlowMonth[]; total_inflow: Money; total_outflow: Money; net: Money }
  recent_activity: DashboardActivity[]
}
