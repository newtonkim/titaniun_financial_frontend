import { http } from '@/core/api/http'
import { createResourceApi } from '@/core/api/resource'
import type { Paginated, Wrapped } from '@/core/api/types'
import type {
  AllotSharesPayload,
  ApproveDividendPayload,
  DividendDeclaration,
  DividendDeclarations,
  MemberStanding,
  ShareAccount,
  ShareCertificate,
  ShareNominee,
  ShareSubscriptionPayment,
  ShareAccountFilters,
  ShareProduct,
  ShareProductFilters,
  ShareAppropriation,
  ShareAppropriations,
  ShareRegister,
  ShareTransaction,
  StoreDividendPayload,
  StoreShareAccountPayload,
  StoreShareAppropriationPayload,
  StoreShareProductPayload,
  StoreShareSubscriptionPayload,
  StoreShareTransactionPayload,
  StoreShareTransferPayload,
  UpdateShareAccountPayload,
} from './types'

export const shareProductsApi = {
  ...createResourceApi<ShareProduct, StoreShareProductPayload, Partial<StoreShareProductPayload>, ShareProductFilters>('/share-products'),
  /** Issue shares to several members at once, such as the founders' opening capital. */
  allot: (productId: number, payload: AllotSharesPayload) =>
    http.post<{ data: ShareTransaction[] }>(`/share-products/${productId}/allotments`, payload).then((response) => response.data),
}

const { remove: _remove, ...shareAccounts } = createResourceApi<ShareAccount, StoreShareAccountPayload, UpdateShareAccountPayload, ShareAccountFilters>('/share-accounts')

export const shareAccountsApi = {
  ...shareAccounts,
  transactions: (accountId: number, page = 1) => http.get<Paginated<ShareTransaction>>(`/share-accounts/${accountId}/transactions`, { page }),
  recordTransaction: (accountId: number, payload: StoreShareTransactionPayload) =>
    http.post<Wrapped<ShareTransaction>>(`/share-accounts/${accountId}/transactions`, payload).then((response) => response.data),
  transfer: (accountId: number, payload: StoreShareTransferPayload) =>
    http.post<Wrapped<ShareTransaction>>(`/share-accounts/${accountId}/transfers`, payload).then((response) => response.data),
  subscriptions: (accountId: number, page = 1) => http.get<Paginated<ShareSubscriptionPayment>>(`/share-accounts/${accountId}/subscriptions`, { page }),
  /** Pay an instalment; whole shares are issued as soon as the instalments cover them. */
  payInstalment: (accountId: number, payload: StoreShareSubscriptionPayload) =>
    http.post<Wrapped<ShareSubscriptionPayment>>(`/share-accounts/${accountId}/subscriptions`, payload).then((response) => response.data),
  certificates: (accountId: number) => http.get<{ data: ShareCertificate[] }>(`/share-accounts/${accountId}/certificates`).then((response) => response.data),
  /** Certify the shares held now, cancelling the previous certificate. */
  issueCertificate: (accountId: number) =>
    http.post<Wrapped<ShareCertificate>>(`/share-accounts/${accountId}/certificates`, {}).then((response) => response.data),
}

export const shareRegisterApi = {
  show: () => http.get<ShareRegister>('/share-register'),
  standing: (memberId: number) => http.get<Wrapped<MemberStanding>>(`/members/${memberId}/share-standing`).then((response) => response.data),
}

export const shareAppropriationsApi = {
  list: () => http.get<ShareAppropriations>('/share-appropriations'),
  create: (payload: StoreShareAppropriationPayload) =>
    http.post<Wrapped<ShareAppropriation>>('/share-appropriations', payload).then((response) => response.data),
}

export const dividendsApi = {
  list: () => http.get<DividendDeclarations>('/dividend-declarations'),
  show: (id: number) => http.get<Wrapped<DividendDeclaration>>(`/dividend-declarations/${id}`).then((response) => response.data),
  /** Prepare a draft, or recalculate the existing draft for that year and product. */
  prepare: (payload: StoreDividendPayload) =>
    http.post<Wrapped<DividendDeclaration>>('/dividend-declarations', payload).then((response) => response.data),
  approve: (id: number, payload: ApproveDividendPayload) =>
    http.post<Wrapped<DividendDeclaration>>(`/dividend-declarations/${id}/approve`, payload).then((response) => response.data),
  pay: (id: number) => http.post<Wrapped<DividendDeclaration>>(`/dividend-declarations/${id}/pay`, {}).then((response) => response.data),
}

export const shareNomineesApi = {
  list: (memberId: number) => http.get<{ data: ShareNominee[] }>(`/members/${memberId}/share-nominees`).then((response) => response.data),
  /** Replace the member's nominees; their percentages must total 100. */
  save: (memberId: number, nominees: ShareNominee[]) =>
    http.put<{ data: ShareNominee[] }>(`/members/${memberId}/share-nominees`, { nominees }).then((response) => response.data),
}
