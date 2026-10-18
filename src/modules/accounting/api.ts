import { http } from '@/core/api/http'
import { createResourceApi } from '@/core/api/resource'
import type { Collection } from '@/core/api/types'
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

/** Journal entries are immutable once posted; correct them with a reversing entry. */
export const journalEntriesApi = { list, show, create }
