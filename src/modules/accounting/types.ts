import type { ISODate, ISODateTime, Money } from '@/core/api/types'

export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense'

export const ACCOUNT_TYPES: AccountType[] = ['asset', 'liability', 'equity', 'income', 'expense']

export type NormalBalance = 'debit' | 'credit'

/** Assets and expenses are debit-normal; liabilities, equity and income are credit-normal. */
export const NORMAL_BALANCE_BY_TYPE: Record<AccountType, NormalBalance> = {
  asset: 'debit',
  expense: 'debit',
  liability: 'credit',
  equity: 'credit',
  income: 'credit',
}

/** Income statement lines an income or expense account can report on. */
export const INCOME_STATEMENT_LINES: { key: string; label: string; type: Extract<AccountType, 'income' | 'expense'> }[] = [
  { key: 'interest_income', label: 'Interest income', type: 'income' },
  { key: 'fee_income', label: 'Fee and commission income', type: 'income' },
  { key: 'other_income', label: 'Other operating income', type: 'income' },
  { key: 'investment_income', label: 'Investment result', type: 'income' },
  { key: 'interest_expense', label: 'Interest expense', type: 'expense' },
  { key: 'impairment', label: 'Credit impairment', type: 'expense' },
  { key: 'staff_costs', label: 'Staff costs', type: 'expense' },
  { key: 'administration', label: 'Administrative expenses', type: 'expense' },
  { key: 'depreciation', label: 'Depreciation and amortisation', type: 'expense' },
  { key: 'other_expenses', label: 'Other operating expenses', type: 'expense' },
  { key: 'income_tax', label: 'Income tax', type: 'expense' },
]

export interface ChartOfAccount {
  id: number
  code: string
  name: string
  type: AccountType
  subtype: string | null
  normal_balance: NormalBalance
  level: number
  parent_id: number | null
  /** A header that groups sub-accounts. */
  is_control: boolean
  is_postable: boolean
  allow_manual: boolean
  description: string | null
  income_statement_line: string | null
  sort_order: number | null
  is_active: boolean
  has_postings?: boolean
  created_at: ISODateTime | null
  updated_at: ISODateTime | null
}

export interface StoreChartOfAccountPayload {
  code: string
  name: string
  type: AccountType
  subtype?: string | null
  normal_balance?: NormalBalance
  parent_id?: number | null
  is_control?: boolean
  is_postable?: boolean
  allow_manual?: boolean
  income_statement_line?: string | null
  sort_order?: number | null
  description?: string | null
  is_active?: boolean
}

export type ChartOfAccountFilters = {
  type?: AccountType | ''
  subtype?: string
  is_postable?: boolean
  is_active?: boolean
  search?: string
}

export const JOURNAL_ENTRY_TYPES = ['adjusting', 'manual', 'opening', 'closing', 'reversal'] as const
/** The types a person can pick, plus `system` for entries posted by deposits, loans and the like. */
export type JournalEntryType = (typeof JOURNAL_ENTRY_TYPES)[number] | 'system'
export type JournalEntryStatus = 'draft' | 'posted'

export const COST_CENTRES = ['Finance', 'Operations', 'Administration', 'Branch'] as const
export type CostCentre = (typeof COST_CENTRES)[number]

export interface JournalEntryLine {
  /** Null on a draft, whose lines are not on the ledger yet. */
  id: number | null
  chart_of_account_id: number
  account?: ChartOfAccount | null
  debit: Money
  credit: Money
  memo: string | null
  cost_centre: CostCentre | null
}

export interface JournalEntry {
  id: number
  voucher_number: string
  reference: string
  entry_type: JournalEntryType
  status: JournalEntryStatus
  entry_date: ISODate
  /** Accounting period, YYYY-MM. */
  period: string | null
  description: string | null
  total_amount: Money | null
  source_type: string | null
  source_id: number | null
  lines?: JournalEntryLine[]
  posted_at: ISODateTime | null
  created_at: ISODateTime | null
}

export interface StoreJournalEntryPayload {
  reference?: string | null
  entry_date: ISODate
  period?: string | null
  entry_type: Exclude<JournalEntryType, 'system'>
  status: JournalEntryStatus
  description: string
  lines: Array<{
    chart_of_account_id: number
    debit?: Money | number | null
    credit?: Money | number | null
    memo?: string | null
    cost_centre?: CostCentre | null
  }>
}

export type JournalEntryFilters = {
  search?: string
  status?: JournalEntryStatus | ''
  from?: ISODate
  to?: ISODate
}
