<script setup lang="ts">
import { errorMessage } from '../api'
import { onBeforeUnmount, ref, watch } from 'vue'
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { X } from 'lucide-vue-next'
import Spinner from './ReportSpinner.vue'
import { cashFlowApi, type CashFlowLedgerLine } from '../api'
import { cashMoney, dayLabel } from '../utils/cashFlowFormat'

/**
 * The cash entries behind one account on the statement: only entries that moved
 * cash, so the lines add up to the amount shown on the statement.
 */
const props = defineProps<{
  account: { id: number; code: string | null; name: string | null } | null
  from: string
  to: string
}>()
const open = defineModel<boolean>('open', { required: true })

const lines = ref<CashFlowLedgerLine[]>([])
const page = ref(1)
const lastPage = ref(1)
const total = ref(0)
const loading = ref(false)
const error = ref<string | null>(null)
let version = 0

async function fetchPage(next = 1) {
  if (!props.account) return
  const requestVersion = ++version
  loading.value = true
  error.value = null
  try {
    const res = await cashFlowApi.getLedger({
      account_id: props.account.id,
      from: props.from,
      to: props.to,
      page: next,
    })
    if (requestVersion !== version) return
    lines.value = next === 1 ? res.data : [...lines.value, ...res.data]
    page.value = next
    lastPage.value = res.last_page
    total.value = res.total
  } catch (e: unknown) {
    if (requestVersion === version)
      error.value =
        errorMessage(e, 'Could not load the cash entries.')
  } finally {
    if (requestVersion === version) loading.value = false
  }
}

watch(
  () => [open.value, props.account?.id, props.from, props.to] as const,
  ([isOpen]) => {
    ++version
    loading.value = false
    lines.value = []
    if (isOpen && props.account) void fetchPage()
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  ++version
})
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-neutral-950/20" />
      <DialogContent
        class="tw-scope fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl dark:bg-neutral-900"
      >
        <div
          class="flex items-center justify-between border-b border-neutral-100 px-6 py-4 dark:border-neutral-800"
        >
          <div>
            <p class="font-mono text-xs text-neutral-400">{{ account?.code }}</p>
            <DialogTitle class="font-bold text-neutral-900 dark:text-white">{{
              account?.name
            }}</DialogTitle>
            <DialogDescription class="mt-0.5 text-xs text-neutral-500">
              Cash entries, {{ dayLabel(from) }} to {{ dayLabel(to) }}
            </DialogDescription>
          </div>
          <button
            type="button"
            aria-label="Close"
            class="rounded-full p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            @click="open = false"
          >
            <X class="h-4 w-4 text-neutral-500" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto">
          <div v-if="loading && page === 1" class="flex justify-center py-12"><Spinner /></div>
          <p
            v-else-if="error"
            role="alert"
            class="m-6 rounded-lg bg-rose-50 p-4 text-sm text-rose-800"
          >
            {{ error }}
          </p>
          <table v-else class="w-full text-sm">
            <thead class="sticky top-0 bg-neutral-50 text-xs text-neutral-500 dark:bg-neutral-800">
              <tr>
                <th scope="col" class="px-4 py-3 text-left">Date</th>
                <th scope="col" class="px-4 py-3 text-left">Entry</th>
                <th scope="col" class="px-4 py-3 text-right">Cash in</th>
                <th scope="col" class="px-4 py-3 text-right">Cash out</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="line in lines"
                :key="line.id"
                class="border-b border-neutral-100 dark:border-neutral-800"
              >
                <td class="whitespace-nowrap px-4 py-2.5 text-neutral-600 dark:text-neutral-300">
                  {{ dayLabel(line.date) }}
                </td>
                <td class="px-4 py-2.5">
                  <p class="font-mono text-xs text-neutral-400">{{ line.reference }}</p>
                  <p class="text-neutral-700 dark:text-neutral-200">
                    {{ line.description ?? '—' }}
                  </p>
                </td>
                <td class="px-4 py-2.5 text-right tabular-nums">{{ cashMoney(line.cash_in) }}</td>
                <td class="px-4 py-2.5 text-right tabular-nums">{{ cashMoney(line.cash_out) }}</td>
              </tr>
              <tr v-if="!lines.length && !loading">
                <td colspan="4" class="px-4 py-12 text-center text-neutral-400">
                  No cash entries in this period.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          class="flex items-center justify-between border-t border-neutral-100 px-6 py-3 text-xs text-neutral-500 dark:border-neutral-800"
        >
          <span>{{ lines.length }} of {{ total }} entries</span>
          <button
            v-if="page < lastPage"
            type="button"
            class="font-medium underline underline-offset-4 disabled:opacity-50"
            :disabled="loading"
            @click="fetchPage(page + 1)"
          >
            {{ loading ? 'Loading…' : 'Load more' }}
          </button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
