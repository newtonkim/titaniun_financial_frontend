/**
 * Response shapes of the financial statements, as the report pages use them. They follow
 * finance-link's statements; amounts on the income statement and cash flow are exact decimal
 * strings, and the trial balance and balance sheet amounts are numbers (see `api.ts`).
 */

export interface LedgerParams {
  account_id: number
  from: string
  to: string
  page?: number
}

export interface LedgerPage<T> {
  account: { id: number; code: string; name: string }
  data: T[]
  current_page: number
  last_page: number
  total: number
  per_page: number
}

export interface FinancialYear {
  name: string
  start_date: string
  end_date: string
}

/* Trial balance */

export interface TrialBalanceParams {
  date?: string
  from?: string
  to?: string
}

export interface TrialBalanceAccount {
  id: number
  code: string
  name: string
  account_type: string
  account_subtype: string | null
  level: number
  is_postable: boolean
  opening_debit: number
  opening_credit: number
  period_debit: number
  period_credit: number
  closing_debit: number
  closing_credit: number
}

export interface TrialBalanceTotals {
  total_opening_debit: number
  total_opening_credit: number
  total_period_debit: number
  total_period_credit: number
  total_closing_debit: number
  total_closing_credit: number
  is_balanced: boolean
}

export interface TrialBalanceResponse {
  mode: 'as_of_date' | 'period'
  date?: string
  from?: string
  to?: string
  generated_at: string
  totals: TrialBalanceTotals
  accounts: TrialBalanceAccount[]
}

export interface TrialBalanceLedgerLine {
  id: number
  date: string
  reference: string
  description: string | null
  debit: string
  credit: string
  running_balance: string
}

/* Balance sheet */

export interface BalanceSheetParams {
  as_at?: string
  compare_to?: string
  hide_zero?: 0 | 1
}

export interface BalanceSheetLine {
  id: number | null
  code: string | null
  name: string
  level: number | null
  is_postable: boolean
  is_computed: boolean
  amount: number
  compare_amount: number
  children: BalanceSheetLine[]
}

export interface BalanceSheetSection {
  key: 'assets' | 'liabilities' | 'equity'
  label: string
  total: number
  compare_total: number
  lines: BalanceSheetLine[]
}

export interface BalanceSheetTotals {
  total_assets: number
  total_liabilities: number
  total_equity: number
  total_liabilities_and_equity: number
  difference: number
  is_balanced: boolean
}

export interface BalanceSheetResponse {
  entity: string
  currency: string
  as_at: string
  compare_to: string
  financial_year: FinancialYear | null
  generated_at: string
  sections: BalanceSheetSection[]
  totals: { current: BalanceSheetTotals; compare: BalanceSheetTotals }
}

/* Income statement */

export interface IncomeStatementParams {
  from?: string
  to?: string
  compare_from?: string
  compare_to?: string
  hide_zero?: 0 | 1
}

export interface IncomeAccount {
  id: number
  code: string
  name: string
  amount: string
  compare_amount: string
}

export interface IncomeRow {
  key: string
  label: string
  kind: 'section' | 'subtotal'
  amount: string
  compare_amount: string
  accounts: IncomeAccount[]
}

export interface IncomeStatementResponse {
  entity: string
  currency: string
  basis: string
  from: string
  to: string
  compare_from: string
  compare_to: string
  generated_at: string
  mapping_version: string
  financial_year: FinancialYear | null
  period_default: 'financial_year' | 'calendar_year'
  rows: IncomeRow[]
  totals: { surplus: string; compare_surplus: string }
  diagnostics: {
    issues: { account_id: number; code: string; name: string; message: string }[]
    classification_complete: boolean
    has_movements: boolean
    ledger_surplus: string
    compare_ledger_surplus: string
    difference: string
    compare_difference: string
  }
}

export interface IncomeLedgerLine {
  id: number
  date: string
  reference: string
  description: string | null
  debit: string
  credit: string
  running_movement: string
}

/* Cash flow */

export interface CashFlowParams {
  from?: string
  to?: string
  compare_from?: string
  compare_to?: string
  hide_zero?: 0 | 1
}

export interface CashFlowAccount {
  id: number
  code: string | null
  name: string | null
  amount: string
  compare_amount: string
}

export interface CashFlowRow {
  key: string
  /** Where an operating row sits on the statement; null outside operating activities. */
  group: 'receipts_and_payments' | 'operating_assets' | 'operating_liabilities' | 'income_tax' | null
  label: string
  hint: string
  direction: 'in' | 'out' | 'net'
  amount: string
  compare_amount: string
  accounts: CashFlowAccount[]
}

export type CashFlowSectionKey = 'operating' | 'investing' | 'financing'

export interface CashFlowSubtotal {
  amount: string
  compare_amount: string
}

export interface CashFlowSection {
  key: CashFlowSectionKey
  label: string
  total: string
  compare_total: string
  rows: CashFlowRow[]
  /** Operating activities only. */
  subtotals?: { before_changes: CashFlowSubtotal; before_tax: CashFlowSubtotal }
}

export interface CashFlowNonCashItem extends CashFlowSubtotal {
  key: string
  label: string
}

export interface CashFlowFinancingLiabilities {
  opening: string
  proceeds: string
  repayments: string
  non_cash: string
  closing: string
}

export interface CashFlowCheck {
  key: string
  label: string
  passed: boolean
}

export interface CashFlowStatementMonth {
  month: string
  operating: string
  investing: string
  financing: string
  /** Balances loaded at go-live: they move the cash figure but are not a cash flow. */
  migrated: string
  net: string
  closing_cash: string
}

/** Amounts are exact decimal strings; a negative amount is cash paid out. */
export interface CashFlowResponse {
  entity: string
  currency: string
  method: 'direct'
  basis: string
  from: string
  to: string
  compare_from: string
  compare_to: string
  generated_at: string
  financial_year: FinancialYear | null
  period_default: 'financial_year' | 'calendar_year'
  sections: CashFlowSection[]
  summary: {
    opening_cash: string
    closing_cash: string
    net_change: string
    operating: string
    investing: string
    financing: string
    /** Balances loaded at go-live: they move the cash figure but are not a cash flow. */
    migrated: string
    cash_in: string
    cash_out: string
    compare_opening_cash: string
    compare_closing_cash: string
    compare_net_change: string
    compare_operating: string
    compare_investing: string
    compare_financing: string
    compare_migrated: string
  }
  cash_accounts: { id: number; code: string; name: string; opening: string; closing: string; change: string }[]
  monthly: CashFlowStatementMonth[]
  non_cash: CashFlowNonCashItem[]
  financing_liabilities: { current: CashFlowFinancingLiabilities; compare: CashFlowFinancingLiabilities }
  checks: CashFlowCheck[]
  diagnostics: {
    issues: { account_id: number; code: string | null; name: string; message: string }[]
    classification_complete: boolean
    has_movements: boolean
    cash_account_count: number
    difference: string
    compare_difference: string
  }
}

export interface CashFlowLedgerLine {
  id: number
  date: string
  reference: string
  description: string | null
  cash_in: string
  cash_out: string
}
