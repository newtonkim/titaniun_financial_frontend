import type { ISODate, ISODateTime, Money } from '@/core/api/types'

export type ExpenseCategoryKind = 'expense' | 'capital'

export interface ExpenseCategory {
  id: number
  name: string
  description: string | null
  chart_of_account_id: number | null
  kind: ExpenseCategoryKind
  requires_resolution: boolean
  is_active: boolean
  created_at: ISODateTime | null
  updated_at: ISODateTime | null
}

export interface StoreExpenseCategoryPayload {
  name: string
  description?: string | null
  chart_of_account_id?: number | null
  kind?: ExpenseCategoryKind
  requires_resolution?: boolean
  is_active?: boolean
}

/** `posted` is a paid expense in the accounts; `approved` is one still to pay. */
export type ExpenseStatus = 'draft' | 'pending_approval' | 'rejected' | 'approved' | 'posted' | 'reversed' | 'cancelled'

export interface ExpenseLine {
  id: number
  expense_category_id: number
  category: string | null
  description: string | null
  amount: Money
  vat_amount: Money
  cost_centre: string | null
}

export interface ExpenseAttachment {
  id: number
  original_name: string
  mime_type: string | null
  size: number
  uploaded_at: ISODateTime | null
  /** Other expenses holding the same file, which can mean one receipt claimed twice. */
  also_on: string[]
}

export interface ExpenseEvent {
  id: number
  action: string
  actor: string
  reason: string | null
  created_at: ISODateTime
}

export interface ExpenseReversal {
  id: number
  status: 'pending' | 'approved' | 'rejected'
  reason: string
  requested_by: number | null
  requester_name: string | null
  rejection_reason: string | null
  created_at: ISODateTime | null
}

export interface Expense {
  id: number
  number: string | null
  status: ExpenseStatus
  amount: Money
  vat_amount: Money
  wht_amount: Money
  net_paid: Money
  expense_date: ISODate
  description: string
  reference: string | null
  payee_name: string | null
  payee_user_id: number | null
  payee: string | null
  resolution_reference: string | null
  paid_on: ISODate | null
  paid_from_account_id: number | null
  paid_from?: string | null
  recorded_by: number | null
  recorder_name?: string | null
  approved_by: number | null
  approver_name?: string | null
  rejection_reason: string | null
  categories?: string[]
  lines?: ExpenseLine[]
  attachments?: ExpenseAttachment[]
  events?: ExpenseEvent[]
  reversals?: ExpenseReversal[]
  possible_duplicates?: { id: number; number: string | null; expense_date: ISODate }[]
}

export interface StoreExpensePayload {
  expense_date: ISODate
  description: string
  payee_name?: string | null
  reference?: string | null
  wht_amount?: string | null
  resolution_reference?: string | null
  paid_from_account_id?: number | null
  lines: { expense_category_id: number; amount: string }[]
}

export type ExpenseFilters = {
  status?: ExpenseStatus | ''
  search?: string
  expense_category_id?: number
  from?: ISODate
  to?: ISODate
}

export interface ExpenseSummary {
  spent_this_month: Money
  petty_cash_balance: Money
  petty_cash_account_id: number | null
  unpaid_total: Money
  waiting_approval: number
  due_soon: number
}

export type RecurringFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly'
export type RecurringStatus = 'overdue' | 'due_soon' | 'upcoming' | 'paused' | 'ended'

export interface RecurringExpense {
  id: number
  name: string
  expense_category_id: number
  category: string | null
  amount: Money
  payee_name: string | null
  paid_from_account_id: number | null
  paid_from: string | null
  frequency: RecurringFrequency
  start_on: ISODate
  end_on: ISODate | null
  next_due_on: ISODate | null
  is_active: boolean
  status: RecurringStatus
}

export interface RecurringExpensePayload {
  name: string
  expense_category_id: number | null
  amount: string
  payee_name: string | null
  paid_from_account_id: number | null
  frequency: RecurringFrequency
  start_on: ISODate
  end_on: ISODate | null
  is_active?: boolean
}
