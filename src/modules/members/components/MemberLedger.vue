<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight, Printer, RotateCcw, Search, ShieldCheck, Undo2 } from 'lucide-vue-next'
import { formatDate, formatMoney } from '@/core/utils/format'
import type { MemberTransaction } from '../types'

/**
 * A member's transactions as a ledger: debits, credits and a running balance per account, with
 * totals, date, type and text filters, and paging. The mode picks which movements it shows.
 */
const props = defineProps<{ transactions: MemberTransaction[]; mode: 'all' | 'deposit' | 'withdrawal' | 'shares'; canReverse?: boolean; printing?: number | null }>()
const emit = defineEmits<{ print: [txn: MemberTransaction]; reverse: [txn: MemberTransaction] }>()

const CURRENCY = 'UGX'
const CREDIT_TYPES = new Set(['deposit', 'interest', 'dividend', 'purchase', 'transfer_in', 'repayment'])
const TYPE_LABELS: Record<string, string> = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  interest: 'Interest credit',
  dividend: 'Dividend',
  purchase: 'Share purchase',
  redemption: 'Share buy-back',
  transfer_in: 'Shares transferred in',
  transfer_out: 'Shares transferred out',
  repayment: 'Loan repayment',
  fee: 'Account fee',
}

const page = ref(1)
const perPage = ref(10)
const search = ref('')
const from = ref('')
const to = ref('')
const typeFilter = ref('all')

const title = computed(
  () => ({ all: 'Member transactions ledger', deposit: 'Savings deposits ledger', withdrawal: 'Withdrawals ledger', shares: 'Share transactions ledger' })[props.mode],
)
const subtitle = computed(
  () =>
    ({
      all: 'Unified member ledger with debit, credit, account context, receipt, and running balance.',
      deposit: 'Posted deposit entries, receipts, and running balances.',
      withdrawal: 'Posted withdrawal entries, receipts, and running balances.',
      shares: 'Share activity with receipt references and account audit trail.',
    })[props.mode],
)
const showDebit = computed(() => props.mode !== 'deposit')
const showCredit = computed(() => props.mode !== 'withdrawal')
const isCredit = (txn: MemberTransaction) => CREDIT_TYPES.has(txn.type)
const credit = (txn: MemberTransaction) => (isCredit(txn) ? Number(txn.amount) : 0)
const debit = (txn: MemberTransaction) => (isCredit(txn) ? 0 : Number(txn.amount))
const typeLabel = (txn: MemberTransaction) => (txn.reversal_of_id ? `Reversal of #${txn.reversal_of_id}` : (TYPE_LABELS[txn.type] ?? txn.type))
const status = (txn: MemberTransaction): 'posted' | 'reversed' | 'reversal' => (txn.reversal_of_id ? 'reversal' : txn.reversed_at ? 'reversed' : 'posted')
const statusClass: Record<ReturnType<typeof status>, string> = {
  posted: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  reversed: 'bg-neutral-100 text-neutral-600 ring-neutral-500/20',
  reversal: 'bg-amber-50 text-amber-700 ring-amber-600/20',
}
const key = (txn: MemberTransaction) => `${txn.source}-${txn.id}`

const inMode = computed(() =>
  props.transactions.filter((txn) => {
    if (props.mode === 'deposit') return txn.source === 'savings' && txn.type === 'deposit'
    if (props.mode === 'withdrawal') return txn.source === 'savings' && txn.type === 'withdrawal'
    if (props.mode === 'shares') return txn.source === 'shares'
    return true
  }),
)

const oldestFirst = (rows: MemberTransaction[]) => [...rows].sort((a, b) => a.transacted_at.localeCompare(b.transacted_at) || a.id - b.id)

/**
 * The running balance follows each account's full history, oldest first, whatever the filters, sort or page:
 * the net position for the full ledger, cumulative deposits or withdrawals for those ledgers.
 */
const running = computed(() => {
  const byTransaction = new Map<string, number>()
  const byAccount = new Map<string, number>()
  for (const txn of oldestFirst(inMode.value)) {
    const account = `${txn.source}-${txn.account_id}`
    const movement = props.mode === 'withdrawal' ? debit(txn) : credit(txn) - debit(txn)
    const next = (byAccount.get(account) ?? 0) + movement
    byAccount.set(account, next)
    byTransaction.set(key(txn), next)
  }
  return { byTransaction, current: [...byAccount.values()].reduce((sum, value) => sum + value, 0) }
})

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  return oldestFirst(
    inMode.value.filter((txn) => {
      if (from.value && txn.date < from.value) return false
      if (to.value && txn.date > to.value) return false
      if (typeFilter.value !== 'all' && (typeFilter.value === 'credit' ? !isCredit(txn) : typeFilter.value === 'debit' ? isCredit(txn) : txn.source !== typeFilter.value)) return false
      if (!term) return true
      return [txn.reference, txn.narration, txn.account, txn.account_type, typeLabel(txn), txn.transacted_by, txn.recorded_by].some((value) => value?.toLowerCase().includes(term))
    }),
  )
})

const totals = computed(() => {
  const credits = filtered.value.reduce((sum, txn) => sum + credit(txn), 0)
  const debits = filtered.value.reduce((sum, txn) => sum + debit(txn), 0)
  return { credits, debits, net: credits - debits, count: filtered.value.length, latest: inMode.value.length ? running.value.current : null }
})

const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / perPage.value)))
const rows = computed(() => filtered.value.slice((page.value - 1) * perPage.value, page.value * perPage.value))
const columns = computed(() => 8 + (showDebit.value ? 1 : 0) + (showCredit.value ? 1 : 0) + (props.mode === 'all' ? 1 : 0))
const balanceLabel = computed(() => (props.mode === 'all' ? 'Latest balance' : 'Closing balance'))
const balanceHelp = computed(() => {
  if (props.mode === 'deposit') return 'Running balance is the cumulative total of deposits shown in this ledger.'
  if (props.mode === 'withdrawal') return 'Running balance is the cumulative total of withdrawals shown in this ledger.'
  return 'Running balance is the per-account ledger position after each posting (full history, oldest first), independent of the filters or page above.'
})

watch([filtered, perPage], () => {
  if (page.value > pages.value) page.value = pages.value
})

function clearFilters() {
  search.value = ''
  from.value = ''
  to.value = ''
  typeFilter.value = 'all'
  page.value = 1
}

const money = (value: number) => `${CURRENCY} ${formatMoney(value)}`
const filterInput =
  'w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-brand dark:border-neutral-700 dark:bg-neutral-800 dark:text-white'
const filterLabel = 'mb-1 block text-[11px] font-bold uppercase tracking-wide text-neutral-500'
</script>

<template>
  <div>
    <div class="border-b border-neutral-200 bg-white px-4 py-5 md:px-6 dark:border-neutral-800 dark:bg-neutral-900">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h3 class="text-base font-bold text-neutral-950 dark:text-white">{{ title }}</h3>
          <p class="mt-0.5 text-xs font-medium text-neutral-500">{{ subtitle }}</p>
        </div>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div class="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800">
            <p class="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Entries</p>
            <p class="mt-1 font-mono text-sm font-bold text-neutral-950 dark:text-white">{{ totals.count }}</p>
          </div>
          <div v-if="showCredit" class="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
            <p class="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Credits</p>
            <p class="mt-1 font-mono text-sm font-bold text-emerald-800">{{ formatMoney(totals.credits) }}</p>
          </div>
          <div v-if="showDebit" class="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2">
            <p class="text-[10px] font-bold uppercase tracking-wide text-rose-700">Debits</p>
            <p class="mt-1 font-mono text-sm font-bold text-rose-800">{{ formatMoney(totals.debits) }}</p>
          </div>
          <div class="rounded-lg border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900">
            <p class="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Net</p>
            <p class="mt-1 font-mono text-sm font-bold" :class="totals.net >= 0 ? 'text-emerald-700' : 'text-rose-700'">{{ formatMoney(totals.net) }}</p>
          </div>
        </div>
      </div>

      <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <label class="block">
          <span :class="filterLabel">From</span>
          <input v-model="from" type="date" :class="filterInput" @change="page = 1" />
        </label>
        <label class="block">
          <span :class="filterLabel">To</span>
          <input v-model="to" type="date" :class="filterInput" @change="page = 1" />
        </label>
        <label v-if="mode === 'all'" class="block">
          <span :class="filterLabel">Type</span>
          <select v-model="typeFilter" :class="filterInput" @change="page = 1">
            <option value="all">All types</option>
            <option value="credit">Credits</option>
            <option value="debit">Debits</option>
            <option value="savings">Savings</option>
            <option value="shares">Shares</option>
            <option value="loans">Loans</option>
          </select>
        </label>
        <label class="block sm:col-span-2" :class="mode === 'all' ? 'xl:col-span-1' : 'xl:col-span-2'">
          <span :class="filterLabel">Search</span>
          <span class="relative block">
            <Search :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input v-model="search" type="search" placeholder="Reference, narration, account…" :class="[filterInput, 'pl-9']" @input="page = 1" />
          </span>
        </label>
        <div class="flex items-end">
          <button type="button" class="flex w-full items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300" @click="clearFilters">
            <RotateCcw :size="14" /> Reset
          </button>
        </div>
      </div>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-neutral-200 bg-neutral-50 text-[11px] font-bold uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800/40">
          <tr>
            <th class="px-5 py-3">Value date</th>
            <th class="px-5 py-3">Transaction</th>
            <th class="px-5 py-3">Account</th>
            <th v-if="showDebit" class="px-5 py-3 text-right">Debit</th>
            <th v-if="showCredit" class="px-5 py-3 text-right">Credit</th>
            <th class="px-5 py-3 text-right">Running balance</th>
            <th class="px-5 py-3">Narration</th>
            <th class="px-5 py-3">Receipt</th>
            <th v-if="mode === 'all'" class="px-5 py-3">Captured by</th>
            <th class="px-5 py-3">Status</th>
            <th class="px-5 py-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
          <tr v-if="!rows.length">
            <td :colspan="columns" class="px-5 py-12 text-center">
              <p class="text-sm font-bold text-neutral-700 dark:text-neutral-200">No ledger entries found</p>
              <p class="mt-1 text-xs font-medium text-neutral-500">Adjust the date range, type, or search terms.</p>
            </td>
          </tr>
          <tr v-for="txn in rows" :key="key(txn)" class="align-top hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40">
            <td class="whitespace-nowrap px-5 py-3.5 font-mono text-xs font-semibold text-neutral-600 dark:text-neutral-300">{{ formatDate(txn.date) }}</td>
            <td class="px-5 py-3.5">
              <span class="block text-sm font-bold text-neutral-900 dark:text-white">{{ typeLabel(txn) }}</span>
              <span v-if="txn.transacted_by" class="text-[11px] font-semibold text-neutral-500">By {{ txn.transacted_by }}</span>
            </td>
            <td class="whitespace-nowrap px-5 py-3.5">
              <span class="block font-mono text-xs font-bold text-neutral-800 dark:text-neutral-200">{{ txn.account }}</span>
              <span class="text-[11px] text-neutral-400">{{ txn.account_type ?? 'Member account' }}</span>
            </td>
            <td v-if="showDebit" class="whitespace-nowrap px-5 py-3.5 text-right">
              <span v-if="debit(txn)" class="font-mono text-sm font-bold text-rose-700">{{ money(debit(txn)) }}</span>
              <span v-else class="text-neutral-300">—</span>
            </td>
            <td v-if="showCredit" class="whitespace-nowrap px-5 py-3.5 text-right">
              <span v-if="credit(txn)" class="font-mono text-sm font-bold text-emerald-700">{{ money(credit(txn)) }}</span>
              <span v-else class="text-neutral-300">—</span>
            </td>
            <td class="whitespace-nowrap px-5 py-3.5 text-right font-mono text-sm font-bold text-neutral-900 dark:text-white">
              {{ running.byTransaction.has(key(txn)) ? money(running.byTransaction.get(key(txn)) ?? 0) : '—' }}
            </td>
            <td class="max-w-[260px] px-5 py-3.5 text-xs text-neutral-600 dark:text-neutral-300">{{ txn.narration || '—' }}</td>
            <td class="whitespace-nowrap px-5 py-3.5">
              <span class="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                <ShieldCheck :size="13" class="text-emerald-500" /> {{ txn.reference || `#${txn.id}` }}
              </span>
            </td>
            <td v-if="mode === 'all'" class="whitespace-nowrap px-5 py-3.5 text-xs font-semibold text-neutral-600 dark:text-neutral-300">{{ txn.recorded_by || 'System' }}</td>
            <td class="whitespace-nowrap px-5 py-3.5">
              <span :class="['inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ring-1 ring-inset', statusClass[status(txn)]]">{{ status(txn) }}</span>
            </td>
            <td class="whitespace-nowrap px-5 py-3.5 text-center">
              <div v-if="txn.source === 'savings'" class="flex items-center justify-center gap-1.5">
                <button type="button" :disabled="printing === txn.id" title="Print receipt" class="rounded-lg border border-neutral-200 p-1.5 text-neutral-500 transition-colors hover:border-brand hover:text-brand disabled:opacity-40 dark:border-neutral-700" @click="emit('print', txn)">
                  <Printer :size="14" />
                </button>
                <button
                  v-if="canReverse"
                  type="button"
                  :disabled="!txn.is_reversible"
                  :title="txn.reversed_at ? 'Already reversed' : txn.reversal_of_id ? 'Reversal entry' : txn.is_reversible ? 'Reverse transaction' : 'Only deposits and withdrawals can be reversed'"
                  class="rounded-lg border border-neutral-200 p-1.5 text-neutral-500 transition-colors hover:border-amber-400 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-30 dark:border-neutral-700"
                  @click="emit('reverse', txn)"
                >
                  <Undo2 :size="14" />
                </button>
              </div>
              <span v-else class="text-neutral-300">—</span>
            </td>
          </tr>
        </tbody>
        <tfoot v-if="filtered.length" class="border-t-2 border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/40">
          <tr>
            <td colspan="3" class="px-5 py-4">
              <div class="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Filtered totals</div>
              <div class="mt-1 text-xs font-medium text-neutral-500">{{ totals.count }} {{ totals.count === 1 ? 'entry' : 'entries' }}</div>
            </td>
            <td v-if="showDebit" class="px-5 py-4 text-right">
              <div class="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Debit</div>
              <div class="mt-1 font-mono text-sm font-bold text-rose-800">{{ money(totals.debits) }}</div>
            </td>
            <td v-if="showCredit" class="px-5 py-4 text-right">
              <div class="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Credit</div>
              <div class="mt-1 font-mono text-sm font-bold text-emerald-800">{{ money(totals.credits) }}</div>
            </td>
            <td class="px-5 py-4 text-right">
              <div class="text-[11px] font-bold uppercase tracking-wide text-neutral-500">{{ balanceLabel }}</div>
              <div v-if="totals.latest !== null" class="mt-1 font-mono text-sm font-bold text-neutral-950 dark:text-white">{{ money(totals.latest) }}</div>
            </td>
            <td :colspan="mode === 'all' ? 5 : 4" class="px-5 py-4 text-xs font-medium text-neutral-500">{{ balanceHelp }}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div class="flex flex-col gap-3 bg-white px-4 py-4 text-sm font-semibold text-neutral-500 sm:flex-row sm:items-center sm:justify-between md:px-6 dark:bg-neutral-900">
      <label class="flex items-center gap-2">
        Rows
        <select v-model.number="perPage" class="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-800">
          <option :value="10">10</option>
          <option :value="25">25</option>
          <option :value="50">50</option>
        </select>
      </label>
      <div class="flex items-center gap-2">
        <button type="button" :disabled="page === 1" aria-label="Previous page" class="rounded-lg border border-neutral-200 p-1.5 disabled:opacity-40 dark:border-neutral-700" @click="page--"><ChevronLeft :size="16" /></button>
        <span class="font-mono">{{ page }} / {{ pages }}</span>
        <button type="button" :disabled="page === pages" aria-label="Next page" class="rounded-lg border border-neutral-200 p-1.5 disabled:opacity-40 dark:border-neutral-700" @click="page++"><ChevronRight :size="16" /></button>
      </div>
    </div>
  </div>
</template>
