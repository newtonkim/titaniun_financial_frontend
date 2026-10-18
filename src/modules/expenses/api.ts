import { createResourceApi } from '@/core/api/resource'
import type { Expense, ExpenseCategory, ExpenseFilters, StoreExpenseCategoryPayload, StoreExpensePayload } from './types'

export const expenseCategoriesApi = createResourceApi<ExpenseCategory, StoreExpenseCategoryPayload>('/expense-categories')

export const expensesApi = createResourceApi<Expense, StoreExpensePayload, Partial<StoreExpensePayload>, ExpenseFilters>('/expenses')
