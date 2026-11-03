import { download, http } from '@/core/api/http'
import { createResourceApi } from '@/core/api/resource'
import type { Wrapped } from '@/core/api/types'
import type { Expense, ExpenseAttachment, ExpenseCategory, ExpenseFilters, ExpenseSummary, RecurringExpense, RecurringExpensePayload, StoreExpenseCategoryPayload, StoreExpensePayload } from './types'

export const expenseCategoriesApi = createResourceApi<ExpenseCategory, StoreExpenseCategoryPayload>('/expense-categories')

const step = (id: number, action: string, body?: unknown) => http.post<Wrapped<Expense>>(`/expenses/${id}/${action}`, body).then((response) => response.data)

export const expensesApi = {
  ...createResourceApi<Expense, StoreExpensePayload, StoreExpensePayload, ExpenseFilters>('/expenses'),
  summary: () => http.get<Wrapped<ExpenseSummary>>('/expenses/summary').then((response) => response.data),
  paymentAccounts: () => http.get<{ data: { id: number; name: string }[] }>('/expenses/payment-accounts').then((response) => response.data),
  topUpPettyCash: (amount: string, from_account_id: number, date: string) => http.post('/expenses/petty-cash/top-up', { amount, from_account_id, date }),
  approve: (id: number) => step(id, 'approve'),
  reject: (id: number, reason: string) => step(id, 'reject', { reason }),
  pay: (id: number, paid_on: string, paid_from_account_id: number) => step(id, 'pay', { paid_on, paid_from_account_id }),
  undo: (id: number, reason: string) => step(id, 'reversals', { reason }),
  approveUndo: (reversalId: number) => http.post<Wrapped<Expense>>(`/expenses/reversals/${reversalId}/approve`).then((response) => response.data),
  declineUndo: (reversalId: number, reason: string) => http.post<Wrapped<Expense>>(`/expenses/reversals/${reversalId}/reject`, { reason }).then((response) => response.data),
  attach: (id: number, file: File) => {
    const body = new FormData()
    body.append('file', file)
    return http.post<Wrapped<Expense>>(`/expenses/${id}/attachments`, body).then((response) => response.data)
  },
  detach: (id: number, attachmentId: number) => http.delete<Wrapped<Expense>>(`/expenses/${id}/attachments/${attachmentId}`).then((response) => response.data),
  downloadAttachment: (id: number, attachment: ExpenseAttachment) => download(`/expenses/${id}/attachments/${attachment.id}`, attachment.original_name),
}

export const recurringExpensesApi = {
  ...createResourceApi<RecurringExpense, RecurringExpensePayload, RecurringExpensePayload, { due_only?: number }>('/recurring-expenses'),
  pay: (id: number, amount: string, paid_on: string, paid_from_account_id: number) => http.post<Wrapped<RecurringExpense>>(`/recurring-expenses/${id}/pay`, { amount, paid_on, paid_from_account_id }).then((response) => response.data),
  skip: (id: number, reason: string) => http.post<Wrapped<RecurringExpense>>(`/recurring-expenses/${id}/skip`, { reason }).then((response) => response.data),
}
