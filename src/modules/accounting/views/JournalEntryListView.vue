<script setup lang="ts">
import type { PageParams } from '@/core/api/resource'
import { computed, reactive, ref } from 'vue'
import { Download, Plus, Search } from 'lucide-vue-next'
import DateRangeFilter from '@/core/components/DateRangeFilter.vue'
import ResourceTable, { type Column } from '@/core/components/ResourceTable.vue'
import SegmentedControl from '@/core/components/SegmentedControl.vue'
import StatusBadge from '@/core/components/StatusBadge.vue'
import { Button } from '@/core/components/ui/button'
import { Input } from '@/core/components/ui/input'
import { formatDate, formatEnum, formatMoney } from '@/core/utils/format'
import { useAuth } from '@/modules/auth/store'
import { journalEntriesApi } from '../api'
import JournalEntryFormDrawer from '../components/JournalEntryFormDrawer.vue'
import type { JournalEntry, JournalEntryStatus } from '../types'

const { can } = useAuth()

const STATUSES: { label: string; value: JournalEntryStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Drafts', value: 'draft' },
  { label: 'Posted', value: 'posted' },
]

const filters = reactive({ search: '', status: '' as JournalEntryStatus | '', from: '', to: '' })
const table = ref<{ reload: () => Promise<void>; load: (page: number) => Promise<void> } | null>(null)
const exporting = ref(false)
const postingId = ref<number | null>(null)
const actionError = ref('')
const notice = ref('')
const formOpen = ref(false)
const canManage = computed(() => can('accounting.manage'))

const columns: Column<JournalEntry>[] = [
  { key: 'entry_date', label: 'Date', sortable: true, value: (entry) => formatDate(entry.entry_date) },
  { key: 'voucher_number', label: 'Voucher', sortable: true, tone: 'strong' },
  { key: 'entry_type', label: 'Type', sortable: true, tone: 'muted', value: (entry) => formatEnum(entry.entry_type) },
  { key: 'description', label: 'Description', sortable: true, truncate: true },
  // A reference that only repeats the voucher number adds nothing to the row.
  { key: 'reference', label: 'Reference', sortable: true, tone: 'muted', value: (entry) => (entry.reference === entry.voucher_number ? null : entry.reference) },
  { key: 'total_amount', label: 'Amount (UGX)', sortable: true, align: 'right', value: (entry) => formatMoney(entry.total_amount) },
  { key: 'status', label: 'Status', sortable: true },
]

const fetchPage = (params: PageParams) => journalEntriesApi.list({ ...filters, ...params })

async function exportCsv() {
  exporting.value = true
  actionError.value = ''
  try {
    await journalEntriesApi.exportCsv(filters)
  } catch (failure) {
    actionError.value = failure instanceof Error ? failure.message : 'The export failed.'
  } finally {
    exporting.value = false
  }
}

async function postDraft(entry: JournalEntry) {
  postingId.value = entry.id
  actionError.value = ''
  notice.value = ''
  try {
    await journalEntriesApi.post(entry.id)
    notice.value = `${entry.voucher_number} posted to the ledger.`
    await table.value?.reload()
  } catch (failure) {
    actionError.value = failure instanceof Error ? failure.message : 'The entry could not be posted.'
  } finally {
    postingId.value = null
  }
}

function onSaved(entry: JournalEntry) {
  notice.value = entry.status === 'posted' ? `${entry.voucher_number} posted to the ledger.` : `${entry.voucher_number} saved as a draft.`
  void table.value?.load(1)
}
</script>

<template>
  <div>
    <ResourceTable ref="table" title="Journal entries" description="Manual vouchers and every posting to the general ledger." :columns="columns" :filters="filters" :fetch="fetchPage">
      <template #actions="{ rows }">
        <Button variant="outline" size="sm" :disabled="exporting || !rows.length" @click="exportCsv">
          <Download />
          {{ exporting ? 'Exporting…' : 'Export CSV' }}
        </Button>
        <Button v-if="canManage" size="sm" @click="formOpen = true">
          <Plus />
          New entry
        </Button>
      </template>

      <template #messages>
        <p v-if="actionError" role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ actionError }}</p>
        <p v-if="notice" role="status" class="rounded-md bg-success/10 px-3 py-2 text-sm text-success">{{ notice }}</p>
      </template>

      <template #filters>
        <div class="relative min-w-52 flex-1 lg:max-w-72">
          <Search class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input v-model="filters.search" type="search" aria-label="Search journal entries" placeholder="Voucher, reference or description" class="h-8 pl-8 text-sm" />
        </div>
        <DateRangeFilter v-model:from="filters.from" v-model:to="filters.to" />
        <SegmentedControl v-model="filters.status" :options="STATUSES" label="Status" />
      </template>

      <template #cell-status="{ row }"><StatusBadge :status="row.status" /></template>

      <template #row-actions="{ row }">
        <Button v-if="row.status === 'draft' && canManage" variant="outline" size="xs" :disabled="postingId !== null" @click="postDraft(row)">
          {{ postingId === row.id ? 'Posting…' : 'Post' }}
        </Button>
      </template>

      <template #empty>
        <p class="font-medium">No journal entries yet</p>
        <p class="mt-1 text-muted-foreground">Postings appear here as members transact, or add a manual voucher.</p>
        <Button v-if="canManage" size="sm" class="mt-3" @click="formOpen = true"><Plus /> New entry</Button>
      </template>
    </ResourceTable>

    <JournalEntryFormDrawer v-model:open="formOpen" @saved="onSaved" />
  </div>
</template>
