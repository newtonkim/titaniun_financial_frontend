import type { ISODate, ISODateTime, Money } from '@/core/api/types'
import type { User } from '@/modules/auth/types'

export interface ExpenseCategory {
  id: number
  name: string
  description: string | null
  chart_of_account_id: number | null
  created_at: ISODateTime | null
  updated_at: ISODateTime | null
}

export interface StoreExpenseCategoryPayload {
  name: string
  description?: string | null
  chart_of_account_id?: number | null
}

export interface Expense {
  id: number
  expense_category_id: number
  category?: ExpenseCategory
  amount: Money
  expense_date: ISODate
  description: string
  reference: string | null
  recorded_by: number | null
  recorder?: User
  created_at: ISODateTime | null
  updated_at: ISODateTime | null
}

export interface StoreExpensePayload {
  expense_category_id: number
  amount: Money
  expense_date: ISODate
  description: string
  reference?: string | null
}

export type ExpenseFilters = {
  expense_category_id?: number
  from?: ISODate
  to?: ISODate
}
