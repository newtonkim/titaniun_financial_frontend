import { http } from '@/core/api/http'
import { createResourceApi } from '@/core/api/resource'
import type { Paginated, Wrapped } from '@/core/api/types'
import type {
  CustomFeePayload,
  SavingsAccount,
  SavingsAccountFilters,
  SavingsProduct,
  SavingsProductFilters,
  SavingsProductSettings,
  SavingsReceipt,
  SavingsReversal,
  SavingsStatement,
  SavingsTransaction,
  StoreSavingsAccountPayload,
  StoreSavingsTransactionPayload,
  UpdateSavingsAccountPayload,
} from './types'

export const savingsProductsApi = createResourceApi<SavingsProduct, SavingsProductSettings, Partial<SavingsProductSettings>, SavingsProductFilters>('/savings-products')

const { remove: _remove, ...savingsAccounts } = createResourceApi<SavingsAccount, StoreSavingsAccountPayload, UpdateSavingsAccountPayload, SavingsAccountFilters>('/savings-accounts')

export const savingsAccountsApi = {
  ...savingsAccounts,
  transactions: (accountId: number, page = 1) => http.get<Paginated<SavingsTransaction>>(`/savings-accounts/${accountId}/transactions`, { page }),
  recordTransaction: (accountId: number, payload: StoreSavingsTransactionPayload) =>
    http.post<Wrapped<SavingsTransaction>>(`/savings-accounts/${accountId}/transactions`, payload).then((response) => response.data),
  statement: (accountId: number, from?: string, to?: string) =>
    http.get<Wrapped<SavingsStatement>>(`/savings-accounts/${accountId}/statement`, { from, to }).then((response) => response.data),
  /** Set or clear the account's own monthly fee, which overrides the product's. */
  updateCustomFees: (accountId: number, payload: CustomFeePayload) =>
    http.put<Wrapped<SavingsAccount>>(`/savings-accounts/${accountId}/custom-fees`, payload).then((response) => response.data),
}

export const savingsTransactionsApi = {
  receipt: (transactionId: number) => http.get<Wrapped<SavingsReceipt>>(`/savings-transactions/${transactionId}/receipt`).then((response) => response.data),
  /** Ask to reverse a deposit or withdrawal; it is applied once someone else approves it. */
  requestReversal: (transactionId: number, reason: string) =>
    http.post<Wrapped<SavingsReversal>>(`/savings-transactions/${transactionId}/reversals`, { reason }).then((response) => response.data),
}

export const savingsReversalsApi = {
  list: (filters: { status?: string; member_id?: number } = {}) => http.get<{ data: SavingsReversal[] }>('/savings-reversals', filters).then((response) => response.data),
  approve: (id: number) => http.post<Wrapped<SavingsReversal>>(`/savings-reversals/${id}/approve`, {}).then((response) => response.data),
  reject: (id: number, reason: string) => http.post<Wrapped<SavingsReversal>>(`/savings-reversals/${id}/reject`, { reason }).then((response) => response.data),
}
