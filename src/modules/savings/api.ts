import { http } from '@/core/api/http'
import { createResourceApi } from '@/core/api/resource'
import type { Paginated, Wrapped } from '@/core/api/types'
import type {
  SavingsAccount,
  SavingsAccountFilters,
  SavingsProduct,
  SavingsProductFilters,
  SavingsProductSettings,
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
}
