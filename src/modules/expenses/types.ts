import type { ISODate, ISODateTime, Money } from '@/core/api/types'

export type ExpenseCategoryKind = 'expense' | 'capital' | 'payroll_only'

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

export type ExpenseStatus = 'draft' | 'pending_approval' | 'rejected' | 'approved' | 'posted' | 'reversed' | 'cancelled'

export interface Supplier {
  id: number
  name: string
  type: 'company' | 'individual' | 'government'
  identifier_type: 'TIN' | 'NIN' | 'BRN' | null
  identifier: string | null
  is_resident: boolean
  phone: string | null
  mobile_money_number: string | null
  bank_details: string | null
  is_related_party: boolean
  related_party_note: string | null
  is_active: boolean
}

export type SupplierPayload = Omit<Supplier, 'id'>

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
  /** Other vouchers holding the same file, which can mean one receipt claimed twice. */
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
  route: 'direct'
  status: ExpenseStatus
  amount: Money
  vat_amount: Money
  wht_amount: Money
  net_paid: Money
  expense_date: ISODate
  description: string
  reference: string | null
  supplier_id: number | null
  payee_name: string | null
  payee_user_id: number | null
  payee: string | null
  supplier_invoice_no: string | null
  no_receipt_reason: string | null
  resolution_reference: string | null
  paid_on: ISODate | null
  paid_from_account_id: number | null
  paid_from?: string | null
  journal_entry_id: number | null
  journal_voucher?: string | null
  recorded_by: number | null
  recorder_name?: string | null
  submitted_by: number | null
  submitted_at: ISODateTime | null
  approved_by: number | null
  approver_name?: string | null
  approved_at: ISODateTime | null
  posted_at: ISODateTime | null
  rejection_reason: string | null
  cancellation_reason: string | null
  is_legacy: boolean
  categories?: string[]
  lines?: ExpenseLine[]
  attachments?: ExpenseAttachment[]
  events?: ExpenseEvent[]
  reversals?: ExpenseReversal[]
  possible_duplicates?: { id: number; number: string | null; expense_date: ISODate }[]
}

export interface ExpenseLinePayload {
  expense_category_id: number | null
  description: string
  amount: string
  vat_amount: string
  cost_centre: string
}

export interface StoreExpensePayload {
  expense_date: ISODate
  description: string
  reference?: string | null
  supplier_id?: number | null
  payee_name?: string | null
  supplier_invoice_no?: string | null
  wht_amount?: string | null
  no_receipt_reason?: string | null
  resolution_reference?: string | null
  paid_on?: ISODate | null
  paid_from_account_id?: number | null
  lines: ExpenseLinePayload[]
}

export type ExpenseFilters = {
  status?: ExpenseStatus | ''
  search?: string
  expense_category_id?: number
  from?: ISODate
  to?: ISODate
}
