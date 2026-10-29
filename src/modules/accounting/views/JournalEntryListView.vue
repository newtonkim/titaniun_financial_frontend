<script setup lang="ts">
import { reactive } from 'vue'
import ResourceTable, { type Column } from '@/core/components/ResourceTable.vue'
import { formatDate, formatMoney } from '@/core/utils/format'
import { journalEntriesApi } from '../api'
import type { JournalEntry, JournalEntryFilters } from '../types'

const filters = reactive<JournalEntryFilters>({ from: '', to: '' })

const totalDebit = (entry: JournalEntry) => (entry.lines ?? []).reduce((sum, line) => sum + Number(line.debit), 0)

const columns: Column<JournalEntry>[] = [
  { key: 'entry_date', label: 'Date', value: (entry) => formatDate(entry.entry_date) },
  { key: 'reference', label: 'Reference' },
  { key: 'description', label: 'Description' },
  { key: 'source_type', label: 'Source' },
  { key: 'amount', label: 'Amount', align: 'right', value: (entry) => formatMoney(totalDebit(entry)) },
]

const fetchPage = (page: number) => journalEntriesApi.list({ ...filters, page })
</script>

<template>
  <ResourceTable title="Journal entries" description="Every posting to the general ledger." :columns="columns" :filters="filters" :fetch="fetchPage">
    <template #filters>
      <label class="inline">From <input v-model="filters.from" type="date" /></label>
      <label class="inline">To <input v-model="filters.to" type="date" /></label>
    </template>
  </ResourceTable>
</template>
