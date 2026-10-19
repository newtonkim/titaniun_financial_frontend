import { http } from '@/core/api/http'
import { createResourceApi } from '@/core/api/resource'
import type { ISODateTime, Paginated, Wrapped } from '@/core/api/types'
import type {
  Loan,
  LoanFilters,
  LoanProduct,
  LoanProductFilters,
  LoanProductPreview,
  LoanProductSettings,
  LoanRepayment,
  StoreLoanPayload,
  StoreLoanRepaymentPayload,
  UpdateLoanPayload,
} from './types'

export const loanProductsApi = {
  ...createResourceApi<LoanProduct, LoanProductSettings, Partial<LoanProductSettings>, LoanProductFilters>('/loan-products'),
  /** A sample repayment schedule for the pricing on an unsaved product form. */
  preview: (payload: Partial<LoanProductSettings> & { preview_amount?: number | null; preview_term?: number | null }) =>
    http.post<Wrapped<LoanProductPreview>>('/loan-products/preview', payload).then((response) => response.data),
}

const transition = (loanId: number, action: 'approval' | 'rejection' | 'disbursement', body?: object) =>
  http.post<Wrapped<Loan>>(`/loans/${loanId}/${action}`, body).then((response) => response.data)

export const loansApi = {
  ...createResourceApi<Loan, StoreLoanPayload, UpdateLoanPayload, LoanFilters>('/loans'),
  approve: (loanId: number) => transition(loanId, 'approval'),
  reject: (loanId: number) => transition(loanId, 'rejection'),
  disburse: (loanId: number, disbursedAt?: ISODateTime) => transition(loanId, 'disbursement', { disbursed_at: disbursedAt }),
  repayments: (loanId: number, page = 1) => http.get<Paginated<LoanRepayment>>(`/loans/${loanId}/repayments`, { page }),
  recordRepayment: (loanId: number, payload: StoreLoanRepaymentPayload) =>
    http.post<Wrapped<LoanRepayment>>(`/loans/${loanId}/repayments`, payload).then((response) => response.data),
}
