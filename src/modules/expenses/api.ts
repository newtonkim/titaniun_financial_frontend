import { download, http } from '@/core/api/http'
import { createResourceApi } from '@/core/api/resource'
import type { Wrapped } from '@/core/api/types'
import type { Expense, ExpenseAttachment, ExpenseCategory, ExpenseFilters, StoreExpenseCategoryPayload, StoreExpensePayload, Supplier, SupplierPayload } from './types'

export const expenseCategoriesApi = createResourceApi<ExpenseCategory, StoreExpenseCategoryPayload>('/expense-categories')

export const suppliersApi = createResourceApi<Supplier, SupplierPayload, SupplierPayload, { search?: string; active_only?: boolean }>('/suppliers')

const step = (id: number, action: string, body?: unknown) => http.post<Wrapped<Expense>>(`/expenses/${id}/${action}`, body).then((response) => response.data)

export const expensesApi = {
  ...createResourceApi<Expense, StoreExpensePayload, StoreExpensePayload, ExpenseFilters>('/expenses'),
  paymentAccounts: () => http.get<{ data: { id: number; name: string }[] }>('/expenses/payment-accounts').then((response) => response.data),
  submit: (id: number) => step(id, 'submit'),
  recall: (id: number) => step(id, 'recall'),
  approve: (id: number) => step(id, 'approve'),
  reject: (id: number, reason: string) => step(id, 'reject', { reason }),
  reopen: (id: number) => step(id, 'reopen'),
  cancel: (id: number, reason: string) => step(id, 'cancel', { reason }),
  pay: (id: number, paid_on: string, paid_from_account_id: number) => step(id, 'pay', { paid_on, paid_from_account_id }),
  requestReversal: (id: number, reason: string) => step(id, 'reversals', { reason }),
  approveReversal: (reversalId: number) => http.post<Wrapped<Expense>>(`/expenses/reversals/${reversalId}/approve`).then((response) => response.data),
  rejectReversal: (reversalId: number, reason: string) => http.post<Wrapped<Expense>>(`/expenses/reversals/${reversalId}/reject`, { reason }).then((response) => response.data),
  attach: (id: number, file: File) => {
    const body = new FormData()
    body.append('file', file)
    return http.post<Wrapped<Expense>>(`/expenses/${id}/attachments`, body).then((response) => response.data)
  },
  detach: (id: number, attachmentId: number) => http.delete<Wrapped<Expense>>(`/expenses/${id}/attachments/${attachmentId}`).then((response) => response.data),
  downloadAttachment: (id: number, attachment: ExpenseAttachment) => download(`/expenses/${id}/attachments/${attachment.id}`, attachment.original_name),
}
