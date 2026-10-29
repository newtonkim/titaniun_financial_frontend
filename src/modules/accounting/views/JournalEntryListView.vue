<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { Calendar, Check, ChevronLeft, ChevronRight, FileText, Plus, Search, X } from 'lucide-vue-next'
import type { PaginationMeta } from '@/core/api/types'
import { formatDate, formatMoney } from '@/core/utils/format'
import { useAuth } from '@/modules/auth/store'
import { journalEntriesApi } from '../api'
import JournalEntryFormDrawer from '../components/JournalEntryFormDrawer.vue'
import type { JournalEntry, JournalEntryFilters } from '../types'

const { can } = useAuth()

const filters = reactive<Required<Pick<JournalEntryFilters, 'search' | 'from' | 'to'>>>({ search: '', from: '', to: '' })
const entries = ref<JournalEntry[]>([])
const meta = ref<PaginationMeta | null>(null)
const page = ref(1)
const loading = ref(false)
const exporting = ref(false)
const postingId = ref<number | null>(null)
const error = ref('')
const notice = ref('')
const formOpen = ref(false)

async function load(target = page.value) {
  loading.value = true
  error.value = ''
  try {
    const response = await journalEntriesApi.list({ ...filters, page: target })
    entries.value = response.data
    meta.value = response.meta ?? null
    page.value = target
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : 'Journal entries could not be loaded.'
  } finally {
    loading.value = false
  }
}

async function exportCsv() {
  exporting.value = true
  error.value = ''
  try {
    await journalEntriesApi.exportCsv(filters)
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : 'The export failed.'
  } finally {
    exporting.value = false
  }
}

async function postDraft(entry: JournalEntry) {
  postingId.value = entry.id
  error.value = ''
  notice.value = ''
  try {
    await journalEntriesApi.post(entry.id)
    notice.value = `${entry.voucher_number} posted to the ledger.`
    await load()
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : 'The entry could not be posted.'
  } finally {
    postingId.value = null
  }
}

function clearFilters() {
  filters.search = ''
  filters.from = ''
  filters.to = ''
}

function onSaved(entry: JournalEntry) {
  notice.value = entry.status === 'posted' ? `${entry.voucher_number} posted to the ledger.` : `${entry.voucher_number} saved as a draft.`
  void load(1)
}

let timer: ReturnType<typeof setTimeout> | undefined
watch(filters, () => {
  clearTimeout(timer)
  timer = setTimeout(() => load(1), 400)
})

onMounted(() => load(1))
</script>

<template>
  <div class="tw-scope flex flex-col gap-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-navy dark:text-white">Journal Entries</h1>
        <p class="text-sm text-neutral-500 dark:text-neutral-400">Manual journal vouchers and ledger postings.</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          :disabled="exporting || entries.length === 0"
          class="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
          @click="exportCsv"
        >
          <FileText class="h-4 w-4" />
          {{ exporting ? 'Exporting…' : 'Export CSV' }}
        </button>
        <button
          v-if="can('accounting.manage')"
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark"
          @click="formOpen = true"
        >
          <Plus class="h-4 w-4" />
          New Entry
        </button>
      </div>
    </div>

    <p v-if="error" role="alert" class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">{{ error }}</p>
    <p v-if="notice" role="status" class="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">{{ notice }}</p>

    <div class="grid grid-cols-1 gap-4 rounded-xl border border-neutral-100 bg-white p-4 shadow-sm md:grid-cols-4 lg:grid-cols-5 dark:border-neutral-800 dark:bg-neutral-900">
      <div class="relative md:col-span-2">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          v-model="filters.search"
          type="search"
          aria-label="Search journal entries"
          placeholder="Search by voucher, narration..."
          class="w-full rounded-lg border border-neutral-200 bg-neutral-50/50 py-2 pl-10 pr-4 text-sm outline-none transition focus:border-brand focus:bg-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
        />
      </div>

      <div class="relative">
        <Calendar class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          v-model="filters.from"
          type="date"
          aria-label="From date"
          class="w-full rounded-lg border border-neutral-200 bg-neutral-50/50 py-2 pl-10 pr-4 text-sm outline-none transition focus:border-brand focus:bg-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
        />
      </div>

      <div class="relative">
        <Calendar class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          v-model="filters.to"
          type="date"
          aria-label="To date"
          class="w-full rounded-lg border border-neutral-200 bg-neutral-50/50 py-2 pl-10 pr-4 text-sm outline-none transition focus:border-brand focus:bg-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
        />
      </div>

      <div class="flex items-center gap-2">
        <button type="button" class="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition-colors hover:text-red-500" @click="clearFilters">
          <X class="h-4 w-4" />
          Clear
        </button>
      </div>
    </div>

    <div v-if="loading && !entries.length" class="flex items-center justify-center py-16" role="status" aria-label="Loading journal entries">
      <span class="h-6 w-6 animate-spin rounded-full border-2 border-brand border-r-transparent" />
    </div>

    <div v-else-if="!entries.length" class="flex flex-col items-center justify-center rounded-2xl border border-neutral-100 bg-white py-16 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <p class="text-sm text-neutral-400">No journal entries found matching your criteria.</p>
    </div>

    <div v-else class="flex flex-col gap-4" :class="{ 'opacity-60': loading }">
      <div class="overflow-x-auto rounded-2xl border border-neutral-100 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <table class="w-full min-w-[860px] text-sm">
          <thead>
            <tr class="bg-neutral-50 dark:bg-neutral-800/40">
              <th class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-neutral-400">Date</th>
              <th class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-neutral-400">Voucher No</th>
              <th class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-neutral-400">Type</th>
              <th class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-neutral-400">Description</th>
              <th class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-neutral-400">Total Amount</th>
              <th class="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-neutral-400">Status</th>
              <th class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-neutral-400">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-50 dark:divide-neutral-800">
            <tr v-for="entry in entries" :key="entry.id" class="transition-colors hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40">
              <td class="whitespace-nowrap px-6 py-4 text-neutral-700 dark:text-neutral-300">{{ formatDate(entry.entry_date) }}</td>
              <td class="whitespace-nowrap px-6 py-4 font-mono font-semibold text-brand">{{ entry.voucher_number }}</td>
              <td class="px-6 py-4 text-xs font-semibold uppercase text-neutral-500">{{ entry.entry_type }}</td>
              <td class="px-6 py-4">
                <div class="flex flex-col">
                  <span class="font-medium text-neutral-900 dark:text-white">{{ entry.description || 'No description' }}</span>
                  <span v-if="entry.reference && entry.reference !== entry.voucher_number" class="text-xs text-neutral-400">Ref: {{ entry.reference }}</span>
                </div>
              </td>
              <td class="whitespace-nowrap px-6 py-4 text-right font-mono font-bold text-neutral-900 dark:text-white">{{ formatMoney(entry.total_amount) }}</td>
              <td class="px-6 py-4 text-center">
                <span
                  class="inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                  :class="entry.status === 'posted'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'"
                >
                  {{ entry.status }}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <button
                  v-if="entry.status === 'draft' && can('accounting.manage')"
                  type="button"
                  :disabled="postingId !== null"
                  class="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
                  @click="postDraft(entry)"
                >
                  <Check class="h-3.5 w-3.5" />
                  {{ postingId === entry.id ? 'Posting…' : 'Post' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="meta && meta.last_page > 1" class="flex items-center justify-between text-sm text-neutral-500">
        <span>Showing {{ meta.from }}–{{ meta.to }} of {{ meta.total }}</span>
        <div class="flex items-center gap-2">
          <button type="button" aria-label="Previous page" :disabled="loading || page <= 1" class="rounded-lg border border-neutral-200 bg-white p-1.5 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900" @click="load(page - 1)">
            <ChevronLeft class="h-4 w-4" />
          </button>
          <span>Page {{ meta.current_page }} of {{ meta.last_page }}</span>
          <button type="button" aria-label="Next page" :disabled="loading || page >= meta.last_page" class="rounded-lg border border-neutral-200 bg-white p-1.5 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900" @click="load(page + 1)">
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    <JournalEntryFormDrawer v-model:open="formOpen" @saved="onSaved" />
  </div>
</template>
