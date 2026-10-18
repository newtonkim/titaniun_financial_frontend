import { http } from '@/core/api/http'
import { createResourceApi } from '@/core/api/resource'
import type { ISODateTime, Paginated, Wrapped } from '@/core/api/types'
import type {
  Loan,
  LoanFilters,
  LoanProduct,
  LoanProductFilters,
  LoanRepayment,
  StoreLoanPayload,
  StoreLoanProductPayload,
  StoreLoanRepaymentPayload,
  UpdateLoanPayload,
} from './types'

export const loanProductsApi = createResourceApi<LoanProduct, StoreLoanProductPayload, Partial<StoreLoanProductPayload>, LoanProductFilters>('/loan-products')

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
