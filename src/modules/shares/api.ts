import { http } from '@/core/api/http'
import { createResourceApi } from '@/core/api/resource'
import type { Paginated, Wrapped } from '@/core/api/types'
import type {
  ShareAccount,
  ShareAccountFilters,
  ShareProduct,
  ShareProductFilters,
  ShareTransaction,
  StoreShareAccountPayload,
  StoreShareProductPayload,
  StoreShareTransactionPayload,
  StoreShareTransferPayload,
  UpdateShareAccountPayload,
} from './types'

export const shareProductsApi = createResourceApi<ShareProduct, StoreShareProductPayload, Partial<StoreShareProductPayload>, ShareProductFilters>('/share-products')

const { remove: _remove, ...shareAccounts } = createResourceApi<ShareAccount, StoreShareAccountPayload, UpdateShareAccountPayload, ShareAccountFilters>('/share-accounts')

export const shareAccountsApi = {
  ...shareAccounts,
  transactions: (accountId: number, page = 1) => http.get<Paginated<ShareTransaction>>(`/share-accounts/${accountId}/transactions`, { page }),
  recordTransaction: (accountId: number, payload: StoreShareTransactionPayload) =>
    http.post<Wrapped<ShareTransaction>>(`/share-accounts/${accountId}/transactions`, payload).then((response) => response.data),
  transfer: (accountId: number, payload: StoreShareTransferPayload) =>
    http.post<Wrapped<ShareTransaction>>(`/share-accounts/${accountId}/transfers`, payload).then((response) => response.data),
}
