import { http } from '@/core/api/http'
import { createResourceApi } from '@/core/api/resource'
import type { Paginated, Wrapped } from '@/core/api/types'
import type {
  CustomFeePayload,
  SavingsAccount,
  SavingsAccountEvent,
  SavingsAccountFilters,
  SavingsAccountRequest,
  SavingsAccountRequestType,
  SavingsDormantEntry,
  SavingsFreezeReason,
  SavingsPolicy,
  SavingsProduct,
  SavingsProductFilters,
  SavingsProductSettings,
  SavingsReceipt,
  SavingsReversal,
  SavingsStatement,
  SavingsTransaction,
  StoreSavingsAccountPayload,
  StoreSavingsTransactionPayload,
} from './types'

export const savingsProductsApi = createResourceApi<SavingsProduct, SavingsProductSettings, Partial<SavingsProductSettings>, SavingsProductFilters>('/savings-products')

const { remove: _remove, update: _update, ...savingsAccounts } = createResourceApi<SavingsAccount, StoreSavingsAccountPayload, never, SavingsAccountFilters>('/savings-accounts')

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
  /** The account's permanent history, newest first. */
  events: (accountId: number) => http.get<{ data: SavingsAccountEvent[] }>(`/savings-accounts/${accountId}/events`).then((response) => response.data),
  markDormant: (accountId: number, reason: string) =>
    http.post<Wrapped<SavingsAccount>>(`/savings-accounts/${accountId}/dormant`, { reason }).then((response) => response.data),
  freeze: (accountId: number, reasonCode: SavingsFreezeReason, reason: string) =>
    http.post<Wrapped<SavingsAccount>>(`/savings-accounts/${accountId}/freeze`, { reason_code: reasonCode, reason }).then((response) => response.data),
  /** Note that the member asked for a statement, which restarts the dormancy clock. */
  logStatementRequest: (accountId: number) =>
    http.post<Wrapped<SavingsAccount>>(`/savings-accounts/${accountId}/statement-requests`, {}).then((response) => response.data),
  /** Ask to close, reactivate or release the account; it takes effect once someone else approves. */
  requestChange: (accountId: number, type: SavingsAccountRequestType, reason: string) =>
    http.post<Wrapped<SavingsAccountRequest>>(`/savings-accounts/${accountId}/requests`, { type, reason }).then((response) => response.data),
}

export const savingsPolicyApi = {
  show: () => http.get<Wrapped<SavingsPolicy>>('/savings-policy').then((response) => response.data),
  update: (payload: Pick<SavingsPolicy, 'exit_notice_days' | 'dormant_accounts_earn_interest' | 'default_warning_months'>) =>
    http.put<Wrapped<SavingsPolicy>>('/savings-policy', payload).then((response) => response.data),
}

export const savingsDormancyApi = {
  candidates: () => http.get<{ data: SavingsAccount[] }>('/savings-dormancy/candidates').then((response) => response.data),
  register: () => http.get<{ data: SavingsDormantEntry[] }>('/savings-dormancy/register').then((response) => response.data),
  record: (entryId: number, kind: 'notice' | 'advert' | 'board-decision', payload: { date: string; reference: string; decision?: string }) =>
    http.post<Wrapped<SavingsDormantEntry>>(`/savings-dormancy/${entryId}/${kind}`, payload).then((response) => response.data),
}

export const savingsAccountRequestsApi = {
  list: (filters: { status?: string; savings_account_id?: number } = {}) =>
    http.get<{ data: SavingsAccountRequest[] }>('/savings-account-requests', filters).then((response) => response.data),
  approve: (id: number) => http.post<Wrapped<SavingsAccountRequest>>(`/savings-account-requests/${id}/approve`, {}).then((response) => response.data),
  reject: (id: number, reason: string) =>
    http.post<Wrapped<SavingsAccountRequest>>(`/savings-account-requests/${id}/reject`, { reason }).then((response) => response.data),
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
