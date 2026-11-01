<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight, Printer, RotateCcw, Search, ShieldCheck, Undo2 } from 'lucide-vue-next'
import { formatDate, formatMoney } from '@/core/utils/format'
import type { MemberBalances, MemberTransaction } from '../types'
import { ledgerTypeLabel, repaymentSplit, shareUnits } from '../utils'

/**
 * A member's transactions in date order, with date, type, account and text filters, and paging. The server
 * sends each row's balance, which belongs to that row's account: savings, shares and loans are never added
 * together here. Choosing one account makes it a true ledger with a brought forward and a closing balance.
 * The mode picks which movements it shows.
 */
const props = defineProps<{ transactions: MemberTransaction[]; balances: MemberBalances | null; mode: 'all' | 'deposit' | 'withdrawal' | 'shares'; canReverse?: boolean; printing?: number | null }>()
const emit = defineEmits<{ print: [txn: MemberTransaction]; reverse: [txn: MemberTransaction] }>()

const CURRENCY = 'UGX'

const page = ref(1)
const perPage = ref(10)
const search = ref('')
const from = ref('')
const to = ref('')
const typeFilter = ref('all')
const accountFilter = ref('all')

const title = computed(
  () => ({ all: 'Member transactions ledger', deposit: 'Savings deposits ledger', withdrawal: 'Withdrawals ledger', shares: 'Share transactions ledger' })[props.mode],
)
const subtitle = computed(
  () =>
    ({
      all: 'Everything on this member\'s accounts by date. Each balance belongs to the account on its row.',
      deposit: 'Posted deposits, receipts, and each account\'s balance after the deposit.',
      withdrawal: 'Posted withdrawals, receipts, and each account\'s balance after the withdrawal.',
      shares: 'Share activity in units, with receipt references and account audit trail.',
    })[props.mode],
)
const showDebit = computed(() => props.mode !== 'deposit')
const showCredit = computed(() => props.mode !== 'withdrawal')
const isCredit = (txn: MemberTransaction) => txn.direction === 'credit'
const credit = (txn: MemberTransaction) => (isCredit(txn) ? Number(txn.amount) : 0)
const debit = (txn: MemberTransaction) => (isCredit(txn) ? 0 : Number(txn.amount))
const typeLabel = ledgerTypeLabel
const accountKey = (txn: MemberTransaction) => `${txn.source}-${txn.account_id}`
const status = (txn: MemberTransaction): 'posted' | 'reversed' | 'reversal' => (txn.reversal_of_id ? 'reversal' : txn.reversed_at ? 'reversed' : 'posted')
const statusClass: Record<ReturnType<typeof status>, string> = {
  posted: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  reversed: 'bg-neutral-100 text-neutral-600 ring-neutral-500/20',
  reversal: 'bg-amber-50 text-amber-700 ring-amber-600/20',
}
const key = (txn: MemberTransaction) => `${txn.source}-${txn.type}-${txn.id}`

const inMode = computed(() =>
  props.transactions.filter((txn) => {
    if (props.mode === 'deposit') return txn.source === 'savings' && txn.type === 'deposit'
    if (props.mode === 'withdrawal') return txn.source === 'savings' && txn.type === 'withdrawal'
    if (props.mode === 'shares') return txn.source === 'shares'
    return true
  }),
)

const accountOptions = computed(() => {
  const accounts = new Map<string, string>()
  for (const txn of inMode.value) accounts.set(accountKey(txn), `${txn.account} · ${txn.account_type ?? 'Member account'}`)
  return [...accounts].map(([value, label]) => ({ value, label }))
})

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  return inMode.value
    .filter((txn) => {
      if (from.value && txn.date < from.value) return false
      if (to.value && txn.date > to.value) return false
      if (accountFilter.value !== 'all' && accountKey(txn) !== accountFilter.value) return false
      if (typeFilter.value !== 'all' && (typeFilter.value === 'credit' ? !isCredit(txn) : typeFilter.value === 'debit' ? isCredit(txn) : txn.source !== typeFilter.value)) return false
      if (!term) return true
      return [txn.reference, txn.narration, txn.account, txn.account_type, typeLabel(txn), txn.transacted_by, txn.recorded_by].some((value) => value?.toLowerCase().includes(term))
    })
    .reverse()
})

/** One account's whole history, oldest first, when the rows shown are that account's ledger. */
const accountHistory = computed(() => {
  if (accountFilter.value === 'all' || props.mode === 'deposit' || props.mode === 'withdrawal') return null
  return props.transactions.filter((txn) => accountKey(txn) === accountFilter.value).reverse()
})
const accountSource = computed(() => accountHistory.value?.[0]?.source ?? null)

const broughtForward = computed(() => {
  const history = accountHistory.value
  const first = history?.[0]
  if (!history || !first) return null
  return history.filter((txn) => from.value && txn.date < from.value).at(-1) ?? { ...first, balance_after: '0.00', shares_after: first.source === 'shares' ? 0 : null }
})
const closing = computed(() => accountHistory.value?.filter((txn) => !to.value || txn.date <= to.value).at(-1) ?? null)

const totals = computed(() => ({
  credits: filtered.value.reduce((sum, txn) => sum + credit(txn), 0),
  debits: filtered.value.reduce((sum, txn) => sum + debit(txn), 0),
  count: filtered.value.length,
}))

/** Totals only add like with like: one kind of movement, or one account. Shares read in units, because an instalment and the purchase it completes are the same money. */
const showTotals = computed(() => props.mode === 'deposit' || props.mode === 'withdrawal' || accountSource.value === 'savings' || accountSource.value === 'loans')

const tiles = computed((): { label: string; value: string; note?: string }[] => {
  const entries = { label: 'Entries', value: String(totals.value.count) }
  if (props.mode === 'deposit') return [entries, { label: 'Deposits', value: money(totals.value.credits) }]
  if (props.mode === 'withdrawal') return [entries, { label: 'Withdrawals', value: money(totals.value.debits) }]
  const b = props.balances
  if (!b) return [entries]
  const shares = { label: 'Shares', value: shareUnits(b.shares_held), note: `${money(b.shares_value)} · not withdrawable` }
  const instalments = Number(b.subscription_balance) ? [{ label: 'Held toward shares', value: money(b.subscription_balance), note: 'Until it buys a whole share' }] : []
  if (props.mode === 'shares') return [entries, shares, ...instalments]
  return [
    { label: 'Savings balance', value: money(b.savings_balance) },
    { label: 'Available to withdraw', value: money(b.available_to_withdraw), note: 'After minimums and guarantees' },
    shares,
    ...instalments,
    { label: 'Loans outstanding', value: money(b.loans_outstanding), note: 'Principal still owed' },
  ]
})

const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / perPage.value)))
const rows = computed(() => filtered.value.slice((page.value - 1) * perPage.value, page.value * perPage.value))
const columns = computed(() => 8 + (showDebit.value ? 1 : 0) + (showCredit.value ? 1 : 0) + (props.mode === 'all' ? 1 : 0))
const balanceHeading = computed(() => (props.mode === 'shares' ? 'Holding after' : 'Account balance after'))
const balanceHelp = computed(() => {
  if (accountSource.value === 'loans') return 'The balance is the principal still owed. Interest and fees are shown on each repayment.'
  if (accountSource.value === 'savings') return 'The closing balance is this account\'s balance at the end of the period.'
  if (props.mode === 'shares' || accountSource.value === 'shares') return 'Shares are counted in units and valued at the current share price.'
  if (props.mode === 'all') return 'Each balance belongs to the account on its row, so balances are not added across accounts. Choose one account to read it as a ledger.'
  return 'The balance is the account\'s real balance after this entry, including movements not listed here.'
})

watch([filtered, perPage], () => {
  if (page.value > pages.value) page.value = pages.value
})

function clearFilters() {
  search.value = ''
  from.value = ''
  to.value = ''
  typeFilter.value = 'all'
  accountFilter.value = 'all'
  page.value = 1
}

function money(value: number | string): string {
  return `${CURRENCY} ${formatMoney(value)}`
}
const filterInput =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-neutral-800 outline-none focus:border-brand dark:text-white'
const filterLabel = 'mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground'
</script>

<template>
  <div>
    <div class="border-b border-border bg-background px-4 py-5 md:px-6">
      <div>
        <h3 class="text-subsection text-heading">{{ title }}</h3>
        <p class="mt-0.5 text-xs font-medium text-muted-foreground">{{ subtitle }}</p>
      </div>

      <div class="mt-4 grid grid-cols-2 gap-2" :class="tiles.length > 4 ? 'lg:grid-cols-5' : tiles.length > 2 ? 'lg:grid-cols-4' : 'sm:grid-cols-4'">
        <div v-for="tile in tiles" :key="tile.label" class="min-w-0 rounded-lg border border-border bg-neutral-50 px-3 py-2 dark:bg-neutral-800">
          <p class="text-xs font-bold uppercase tracking-wide text-muted-foreground">{{ tile.label }}</p>
          <p class="mt-1 tabular-nums text-sm font-bold text-neutral-950 dark:text-white">{{ tile.value }}</p>
          <p v-if="tile.note" class="mt-0.5 text-xs font-medium text-muted-foreground">{{ tile.note }}</p>
        </div>
      </div>

      <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
        <label class="block">
          <span :class="filterLabel">Account</span>
          <select v-model="accountFilter" :class="filterInput" @change="page = 1">
            <option value="all">All accounts</option>
            <option v-for="option in accountOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>
        <label class="block sm:col-span-2" :class="mode === 'all' ? 'xl:col-span-1' : 'xl:col-span-2'">
          <span :class="filterLabel">Search</span>
          <span class="relative block">
            <Search :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input v-model="search" type="search" placeholder="Reference, narration, account…" :class="[filterInput, 'pl-9']" @input="page = 1" />
          </span>
        </label>
        <div class="flex items-end">
          <button type="button" class="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 dark:text-neutral-300" @click="clearFilters">
            <RotateCcw :size="14" /> Reset
          </button>
        </div>
      </div>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-border bg-neutral-50 text-xs font-bold uppercase tracking-wide text-muted-foreground dark:bg-neutral-800/40">
          <tr>
            <th class="px-5 py-3">Value date</th>
            <th class="px-5 py-3">Transaction</th>
            <th class="px-5 py-3">Account</th>
            <th v-if="showDebit" class="px-5 py-3 text-right">Debit</th>
            <th v-if="showCredit" class="px-5 py-3 text-right">Credit</th>
            <th class="whitespace-nowrap px-5 py-3 text-right">{{ balanceHeading }}</th>
            <th class="px-5 py-3">Narration</th>
            <th class="px-5 py-3">Receipt</th>
            <th v-if="mode === 'all'" class="px-5 py-3">Captured by</th>
            <th class="px-5 py-3">Status</th>
            <th class="px-5 py-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
          <tr v-if="broughtForward && page === 1" class="bg-neutral-50/70 dark:bg-neutral-800/30">
            <td class="whitespace-nowrap px-5 py-3.5 font-mono text-xs font-semibold text-neutral-600 dark:text-neutral-300">{{ from ? formatDate(from) : '—' }}</td>
            <td class="px-5 py-3.5 text-sm font-bold text-foreground">Balance brought forward</td>
            <td class="whitespace-nowrap px-5 py-3.5">
              <span class="block font-mono text-xs font-bold text-neutral-800 dark:text-neutral-200">{{ broughtForward.account }}</span>
              <span class="text-xs text-muted-foreground">{{ broughtForward.account_type ?? 'Member account' }}</span>
            </td>
            <td v-if="showDebit" />
            <td v-if="showCredit" />
            <td class="whitespace-nowrap px-5 py-3.5 text-right text-sm font-bold text-foreground">
              {{ broughtForward.shares_after === null ? money(broughtForward.balance_after) : shareUnits(broughtForward.shares_after) }}
            </td>
            <td :colspan="mode === 'all' ? 5 : 4" />
          </tr>
          <tr v-if="!rows.length">
            <td :colspan="columns" class="px-5 py-12 text-center">
              <p class="text-sm font-bold text-neutral-700 dark:text-neutral-200">No ledger entries found</p>
              <p class="mt-1 text-xs font-medium text-muted-foreground">Adjust the date range, type, or search terms.</p>
            </td>
          </tr>
          <tr v-for="txn in rows" :key="key(txn)" class="align-top hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40">
            <td class="whitespace-nowrap px-5 py-3.5 font-mono text-xs font-semibold text-neutral-600 dark:text-neutral-300">{{ formatDate(txn.date) }}</td>
            <td class="px-5 py-3.5">
              <span class="block text-sm font-bold text-foreground">{{ typeLabel(txn) }}</span>
              <span v-if="txn.transacted_by" class="text-xs font-semibold text-muted-foreground">By {{ txn.transacted_by }}</span>
            </td>
            <td class="whitespace-nowrap px-5 py-3.5">
              <span class="block font-mono text-xs font-bold text-neutral-800 dark:text-neutral-200">{{ txn.account }}</span>
              <span class="text-xs text-muted-foreground">{{ txn.account_type ?? 'Member account' }}</span>
            </td>
            <td v-if="showDebit" class="whitespace-nowrap px-5 py-3.5 text-right">
              <span v-if="debit(txn)" class="tabular-nums text-sm font-bold text-rose-700">{{ money(debit(txn)) }}</span>
              <span v-else class="text-neutral-300">—</span>
            </td>
            <td v-if="showCredit" class="whitespace-nowrap px-5 py-3.5 text-right">
              <span v-if="credit(txn)" class="tabular-nums text-sm font-bold text-emerald-700">{{ money(credit(txn)) }}</span>
              <span v-else class="text-neutral-300">—</span>
            </td>
            <td class="whitespace-nowrap px-5 py-3.5 text-right text-sm font-bold text-foreground">
              <template v-if="txn.shares_after !== null">
                {{ shareUnits(txn.shares_after) }}
                <span class="block text-xs font-medium text-muted-foreground">{{ money(txn.balance_after) }}</span>
                <span v-if="txn.subscription_after !== null" class="block text-xs font-medium text-muted-foreground">{{ money(txn.subscription_after) }} toward shares</span>
              </template>
              <template v-else>
                {{ money(txn.balance_after) }}
                <span v-if="txn.source === 'loans'" class="block text-xs font-medium text-muted-foreground">Principal owed</span>
              </template>
            </td>
            <td class="max-w-[260px] px-5 py-3.5 text-xs text-neutral-600 dark:text-neutral-300">{{ repaymentSplit(txn) ?? (txn.narration || '—') }}</td>
            <td class="whitespace-nowrap px-5 py-3.5">
              <span class="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                <ShieldCheck :size="13" class="text-emerald-500" /> {{ txn.reference || `#${txn.id}` }}
              </span>
            </td>
            <td v-if="mode === 'all'" class="whitespace-nowrap px-5 py-3.5 text-xs font-semibold text-neutral-600 dark:text-neutral-300">{{ txn.recorded_by || 'System' }}</td>
            <td class="whitespace-nowrap px-5 py-3.5">
              <span :class="['inline-flex rounded-full px-2 py-0.5 text-xs font-bold capitalize ring-1 ring-inset', statusClass[status(txn)]]">{{ status(txn) }}</span>
            </td>
            <td class="whitespace-nowrap px-5 py-3.5 text-center">
              <div v-if="txn.source === 'savings'" class="flex items-center justify-center gap-1.5">
                <button type="button" :disabled="printing === txn.id" title="Print receipt" class="rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:border-brand hover:text-brand disabled:opacity-40" @click="emit('print', txn)">
                  <Printer :size="14" />
                </button>
                <button
                  v-if="canReverse"
                  type="button"
                  :disabled="!txn.is_reversible"
                  :title="txn.reversed_at ? 'Already reversed' : txn.reversal_of_id ? 'Reversal entry' : txn.is_reversible ? 'Reverse transaction' : 'Only deposits and withdrawals can be reversed'"
                  class="rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:border-amber-400 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-30"
                  @click="emit('reverse', txn)"
                >
                  <Undo2 :size="14" />
                </button>
              </div>
              <span v-else class="text-neutral-300">—</span>
            </td>
          </tr>
        </tbody>
        <tfoot v-if="filtered.length" class="border-t-2 border-border bg-neutral-50 dark:bg-neutral-800/40">
          <tr>
            <td colspan="3" class="px-5 py-4">
              <div class="text-xs font-bold uppercase tracking-wide text-muted-foreground">Filtered totals</div>
              <div class="mt-1 text-xs font-medium text-muted-foreground">{{ totals.count }} {{ totals.count === 1 ? 'entry' : 'entries' }}</div>
            </td>
            <td v-if="showDebit" class="px-5 py-4 text-right">
              <template v-if="showTotals">
                <div class="text-xs font-bold uppercase tracking-wide text-muted-foreground">Debit</div>
                <div class="mt-1 tabular-nums text-sm font-bold text-rose-800">{{ money(totals.debits) }}</div>
              </template>
            </td>
            <td v-if="showCredit" class="px-5 py-4 text-right">
              <template v-if="showTotals">
                <div class="text-xs font-bold uppercase tracking-wide text-muted-foreground">Credit</div>
                <div class="mt-1 tabular-nums text-sm font-bold text-emerald-800">{{ money(totals.credits) }}</div>
              </template>
            </td>
            <td class="whitespace-nowrap px-5 py-4 text-right">
              <template v-if="closing">
                <div class="text-xs font-bold uppercase tracking-wide text-muted-foreground">Closing balance</div>
                <div class="mt-1 tabular-nums text-sm font-bold text-neutral-950 dark:text-white">{{ closing.shares_after === null ? money(closing.balance_after) : shareUnits(closing.shares_after) }}</div>
              </template>
            </td>
            <td :colspan="mode === 'all' ? 5 : 4" class="px-5 py-4 text-xs font-medium text-muted-foreground">{{ balanceHelp }}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div class="flex flex-col gap-3 bg-background px-4 py-4 text-sm font-semibold text-muted-foreground sm:flex-row sm:items-center sm:justify-between md:px-6">
      <label class="flex items-center gap-2">
        Rows
        <select v-model.number="perPage" class="rounded-lg border border-border bg-background px-2 py-1 text-sm">
          <option :value="10">10</option>
          <option :value="25">25</option>
          <option :value="50">50</option>
        </select>
      </label>
      <div class="flex items-center gap-2">
        <button type="button" :disabled="page === 1" aria-label="Previous page" class="rounded-lg border border-border p-1.5 disabled:opacity-40" @click="page--"><ChevronLeft :size="16" /></button>
        <span class="font-mono">{{ page }} / {{ pages }}</span>
        <button type="button" :disabled="page === pages" aria-label="Next page" class="rounded-lg border border-border p-1.5 disabled:opacity-40" @click="page++"><ChevronRight :size="16" /></button>
      </div>
    </div>
  </div>
</template>
