import {
  applicationAction,
  applicationPack,
  applicationStaff,
  applicationPreview,
} from '@/generated/routes/api/v1/loans'
import { index as commissionIndex, pay as commissionPay } from '@/generated/routes/api/v1/loan-commissions'
import { download, http } from '@/core/api/http'
import { createResourceApi, type PageParams } from '@/core/api/resource'
import type { ISODateTime, Paginated, Wrapped } from '@/core/api/types'
import type {
  Loan,
  LoanCommission,
  LoanAgreementSnapshot,
  CommissionPaymentPayload,
  LoanAction,
  LoanEligibility,
  LoanOptions,
  LoanPaymentPayload,
  LoanFilters,
  LoanProduct,
  LoanProductCharge,
  LoanProductChargeInput,
  LoanProductFilters,
  LoanProductPenalty,
  LoanProductPenaltyInput,
  LoanProductPreview,
  LoanProductSettings,
  LoanRepayment,
  StoreLoanPayload,
  StoreLoanRepaymentPayload,
  UpdateLoanPayload,
  LoanCollectionRow,
  LoanCollectionSummary,
  LoanCollectionView,
} from './types'

export const loanProductsApi = {
  ...createResourceApi<LoanProduct, LoanProductSettings, Partial<LoanProductSettings>, LoanProductFilters>(
    '/loan-products',
  ),
  /** A sample repayment schedule for the pricing on an unsaved product form. */
  preview: (
    payload: Partial<LoanProductSettings> & {
      preview_amount?: number | null
      preview_term?: number | null
    },
  ) =>
    http
      .post<Wrapped<LoanProductPreview>>('/loan-products/preview', payload)
      .then((response) => response.data),
}

const transition = (loanId: number, action: 'approval' | 'rejection' | 'disbursement', body?: object) =>
  http.post<Wrapped<Loan>>(`/loans/${loanId}/${action}`, body).then((response) => response.data)

export const loansApi = {
  options: () => http.get<Wrapped<LoanOptions>>('/loans/options').then((response) => response.data),
  eligibility: (payload: Omit<StoreLoanPayload, 'loan_number'>) =>
    http.post<Wrapped<LoanEligibility>>('/loans/eligibility', payload).then((response) => response.data),
  workflow: (id: number, action: LoanAction, payload: Record<string, unknown> = {}) =>
    http.post<Wrapped<Loan>>(`/loans/${id}/workflow/${action}`, payload).then((response) => response.data),
  uploadDocument: (
    id: number,
    title: string,
    file: File,
    category = 'other',
    guarantorId?: number | null,
  ) => {
    const body = new FormData()
    body.append('title', title)
    body.append('file', file)
    body.append('category', category)
    if (guarantorId) body.append('guarantor_id', String(guarantorId))
    return http.post<Wrapped<Loan>>(`/loans/${id}/documents`, body).then((response) => response.data)
  },
  downloadDocument: (id: number, documentId: number, filename: string) =>
    download(`/loans/${id}/documents/${documentId}`, filename),
  ...createResourceApi<Loan, StoreLoanPayload, UpdateLoanPayload, LoanFilters>('/loans'),
  approve: (loanId: number) => transition(loanId, 'approval'),
  reject: (loanId: number) => transition(loanId, 'rejection'),
  disburse: (loanId: number, disbursedAt?: ISODateTime) =>
    transition(loanId, 'disbursement', { disbursed_at: disbursedAt }),
  repayments: (loanId: number, page = 1) =>
    http.get<Paginated<LoanRepayment>>(`/loans/${loanId}/repayments`, { page }),
  recordRepayment: (loanId: number, payload: StoreLoanRepaymentPayload | LoanPaymentPayload) =>
    http
      .post<Wrapped<LoanRepayment>>(`/loans/${loanId}/repayments`, payload)
      .then((response) => response.data),
}

/** Generated routes include the API prefix; the shared HTTP client supplies the configured API base. */
const commissionApiPath = (url: string) => url.replace(/^\/api\/v1/, '')
export const loanCommissionsApi = {
  list: (
    filters: {
      loan_id?: number
      beneficiary_id?: number
      status?: string
      page?: number
      year?: number
      quarter?: number
      period_basis?: 'collection' | 'distribution'
    } = {},
  ) =>
    http.get<Paginated<LoanCommission> & { summary: { earned: string; payable: string; paid: string } }>(
      commissionApiPath(commissionIndex.url()),
      filters,
    ),
  pay: (id: number, payload: CommissionPaymentPayload) =>
    http
      .post<Wrapped<LoanCommission>>(commissionApiPath(commissionPay.url(id)), payload)
      .then((response) => response.data),
}

export const loanCollectionsApi = {
  list: (params: Partial<PageParams> & { view: LoanCollectionView; search?: string }) =>
    http.get<Paginated<LoanCollectionRow> & { summary: LoanCollectionSummary }>('/loan-collections', params),
}

export const loanApplicationsApi = {
  preview: (payload: StoreLoanPayload) =>
    http
      .post<Wrapped<LoanProductPreview>>(commissionApiPath(applicationPreview.url()), payload)
      .then((result) => result.data),
  action: (loan: number, action: string, payload: Record<string, unknown>) =>
    http
      .post<Wrapped<Loan>>(commissionApiPath(applicationAction.url({ loan, action })), payload)
      .then((result) => result.data),
  pack: (loan: number) =>
    http
      .get<Wrapped<{ snapshot: LoanAgreementSnapshot; preview: LoanProductPreview }>>(
        commissionApiPath(applicationPack.url(loan)),
      )
      .then((result) => result.data),
  staff: () =>
    http
      .get<Wrapped<{ id: number; name: string; email: string; loan_roles: string[] | null }[]>>(
        commissionApiPath(applicationStaff.url()),
      )
      .then((result) => result.data),
}

/** Charges a loan product adds to each new application. */
export const loanProductChargesApi = {
  list: (productId: number) => http.get<{ data: LoanProductCharge[] }>(`/loan-products/${productId}/charges`).then((response) => response.data),
  create: (productId: number, payload: LoanProductChargeInput) => http.post<Wrapped<LoanProductCharge>>(`/loan-products/${productId}/charges`, payload).then((response) => response.data),
  update: (productId: number, id: number, payload: LoanProductChargeInput) => http.patch<Wrapped<LoanProductCharge>>(`/loan-products/${productId}/charges/${id}`, payload).then((response) => response.data),
  remove: (productId: number, id: number) => http.delete(`/loan-products/${productId}/charges/${id}`),
}

/** Penalties a loan product charges on overdue installments. */
export const loanProductPenaltiesApi = {
  list: (productId: number) => http.get<{ data: LoanProductPenalty[] }>(`/loan-products/${productId}/penalties`).then((response) => response.data),
  create: (productId: number, payload: LoanProductPenaltyInput) => http.post<Wrapped<LoanProductPenalty>>(`/loan-products/${productId}/penalties`, payload).then((response) => response.data),
  update: (productId: number, id: number, payload: LoanProductPenaltyInput) => http.patch<Wrapped<LoanProductPenalty>>(`/loan-products/${productId}/penalties/${id}`, payload).then((response) => response.data),
  remove: (productId: number, id: number) => http.delete(`/loan-products/${productId}/penalties/${id}`),
}
