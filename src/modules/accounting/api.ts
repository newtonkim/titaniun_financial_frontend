import { download, http } from '@/core/api/http'
import { createResourceApi } from '@/core/api/resource'
import type { Collection, Wrapped } from '@/core/api/types'
import type {
  ChartOfAccount,
  ChartOfAccountFilters,
  JournalEntry,
  JournalEntryFilters,
  StoreChartOfAccountPayload,
  StoreJournalEntryPayload,
} from './types'

const chartOfAccounts = createResourceApi<ChartOfAccount, StoreChartOfAccountPayload>('/chart-of-accounts')

export const chartOfAccountsApi = {
  ...chartOfAccounts,
  /** The chart of accounts is returned in full, not paginated. */
  list: (filters?: ChartOfAccountFilters) => http.get<Collection<ChartOfAccount>>('/chart-of-accounts', filters),
}

const { list, show, create } = createResourceApi<JournalEntry, StoreJournalEntryPayload, never, JournalEntryFilters>('/journal-entries')

/** Journal entries are immutable once posted; correct them with a reversing entry. Drafts wait to be posted. */
export const journalEntriesApi = {
  list,
  show,
  create,
  post: (id: number) => http.post<Wrapped<JournalEntry>>(`/journal-entries/${id}/post`).then((response) => response.data),
  exportCsv: (filters: JournalEntryFilters) =>
    download('/journal-entries/export', `journal_entries_${new Date().toISOString().slice(0, 10)}.csv`, filters),
}

export interface AccountingSettings {
  books_locked_through: string | null
  expense_backdate_days: number
  /** Expenses over this need a second person. Empty means none do. */
  expense_approval_above: string | null
  business_name?: string
  business_tagline?: string | null
  business_address?: string | null
  business_phone?: string | null
  business_email?: string | null
  payment_instructions?: string | null
  invoice_notes?: string | null
  authorised_signatory?: string | null
  receipt_numbers_start_at?: number
  invoice_numbers_start_at?: number
}

export const accountingSettingsApi = {
  show: () => http.get<{ data: AccountingSettings }>('/accounting-settings').then((response) => response.data),
  update: (payload: AccountingSettings) => http.put<{ data: AccountingSettings }>('/accounting-settings', payload).then((response) => response.data),
}
