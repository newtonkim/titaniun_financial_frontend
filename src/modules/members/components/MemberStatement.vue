<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CalendarDays, Printer, Wallet } from 'lucide-vue-next'
import { formatDate, formatMoney, today } from '@/core/utils/format'
import { savingsAccountsApi } from '@/modules/savings/api'
import type { SavingsAccount, SavingsStatement } from '@/modules/savings/types'

/** A printable savings account statement for a chosen period. */
const props = defineProps<{ accounts: SavingsAccount[] }>()

const SACCO = 'Titaniun Financial'
const accountId = ref<number | null>(props.accounts[0]?.id ?? null)
const from = ref(props.accounts[0]?.opened_at ?? today())
const to = ref(today())
const statement = ref<SavingsStatement | null>(null)
const loading = ref(false)
const error = ref('')
let sequence = 0

const selected = computed(() => props.accounts.find((account) => account.id === accountId.value) ?? null)

async function load() {
  if (!accountId.value) return
  const current = ++sequence
  loading.value = true
  error.value = ''
  try {
    const result = await savingsAccountsApi.statement(accountId.value, from.value, to.value)
    if (current === sequence) statement.value = result
  } catch (failure) {
    if (current === sequence) error.value = failure instanceof Error ? failure.message : 'Could not load the statement.'
  } finally {
    if (current === sequence) loading.value = false
  }
}

watch(accountId, () => {
  if (selected.value && from.value < selected.value.opened_at) from.value = selected.value.opened_at
})
watch([accountId, from, to], load, { immediate: true })

const escape = (value: string | number | null | undefined) => String(value ?? '').replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`)

/** Open the statement on its own A4 page so the app's styles do not interfere with printing. */
function print() {
  const s = statement.value
  if (!s) return
  const page = window.open('', '_blank', 'width=980,height=720')
  if (!page) return
  const rows = s.transactions
    .map(
      (row) => `<tr class="${row.is_reversal ? 'rev' : ''}"><td>${escape(formatDate(row.date))}</td><td>${escape(row.description)}${row.reference ? `<small>${escape(row.reference)}</small>` : ''}</td>
      <td class="num">${Number(row.debit) ? escape(formatMoney(row.debit)) : '—'}</td><td class="num">${Number(row.credit) ? escape(formatMoney(row.credit)) : '—'}</td><td class="num bal">${escape(formatMoney(row.balance))}</td></tr>`,
    )
    .join('')
  page.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Statement ${escape(s.account.account_number)}</title><style>
    @page { size: A4; margin: 14mm; } body { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; color: #1c2433; margin: 0; font-size: 12px; }
    header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1f2a5c; padding-bottom: 12px; }
    h1 { margin: 0; font-size: 20px; color: #1f2a5c; } .tag { color: #b83236; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }
    .doc { text-align: right; } .doc b { display: block; font-size: 15px; color: #1f2a5c; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0; } .meta div { background: #f6f7fb; border-radius: 6px; padding: 10px 12px; }
    .meta span { display: block; color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: .06em; } .meta strong { font-size: 13px; }
    .sum { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; } .sum div { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; }
    .sum span { display: block; color: #64748b; font-size: 10px; text-transform: uppercase; } .sum b { font-size: 13px; font-variant-numeric: tabular-nums; }
    table { width: 100%; border-collapse: collapse; } th { background: #1f2a5c; color: #fff; text-align: left; padding: 7px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; }
    td { padding: 6px 8px; border-bottom: 1px solid #eef1f6; vertical-align: top; } td small { display: block; color: #94a3b8; font-size: 10px; }
    .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; } .bal { font-weight: 700; } tr.rev td { color: #b45309; }
    .opening td { background: #f8fafc; font-weight: 600; } footer { margin-top: 18px; color: #94a3b8; font-size: 10px; text-align: center; }
  </style></head><body>
    <header><div><h1>${escape(SACCO)}</h1><div class="tag">Savings & Credit Cooperative</div></div>
      <div class="doc"><span class="tag">Account statement</span><b>${escape(s.account.account_number)}</b>${escape(formatDate(s.period.from))} – ${escape(formatDate(s.period.to))}</div></header>
    <div class="meta"><div><span>Account holder</span><strong>${escape(s.member.name)}</strong><br>${escape(s.member.member_number)}${s.member.phone ? ` · ${escape(s.member.phone)}` : ''}</div>
      <div><span>Account</span><strong>${escape(s.account.product)}</strong><br>Opened ${escape(formatDate(s.account.opened_at))} · ${escape(s.account.status)}</div></div>
    <div class="sum"><div><span>Opening balance</span><b>UGX ${escape(formatMoney(s.balances.opening))}</b></div><div><span>Total credits</span><b>UGX ${escape(formatMoney(s.balances.credits))}</b></div>
      <div><span>Total debits</span><b>UGX ${escape(formatMoney(s.balances.debits))}</b></div><div><span>Closing balance</span><b>UGX ${escape(formatMoney(s.balances.closing))}</b></div></div>
    <table><thead><tr><th>Date</th><th>Description</th><th class="num">Debit</th><th class="num">Credit</th><th class="num">Balance</th></tr></thead><tbody>
      <tr class="opening"><td>${escape(formatDate(s.period.from))}</td><td>Balance brought forward</td><td class="num">—</td><td class="num">—</td><td class="num bal">${escape(formatMoney(s.balances.opening))}</td></tr>${rows}
    </tbody></table>
    <footer>Generated ${escape(new Date().toLocaleString('en-GB'))}. This is a computer-generated statement.</footer>
  </body></html>`)
  page.document.close()
  page.focus()
  page.print()
}

const label = 'mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-500'
const input = 'h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-700 outline-none focus:border-brand dark:border-neutral-700 dark:bg-neutral-800 dark:text-white'
</script>

<template>
  <div class="p-4 md:p-6">
    <p v-if="!accounts.length" class="py-10 text-center text-sm text-neutral-500">This member has no savings account to report on.</p>
    <template v-else>
      <div class="mb-5 flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-4 sm:flex-row sm:items-end sm:justify-between dark:border-neutral-800 dark:bg-neutral-900">
        <div class="grid w-full grid-cols-1 gap-3 sm:max-w-2xl sm:grid-cols-3">
          <label class="block">
            <span :class="label"><Wallet :size="13" /> Account</span>
            <select id="statement-account" v-model="accountId" :class="input">
              <option v-for="account in accounts" :key="account.id" :value="account.id">{{ account.account_number }} · {{ account.product?.name }}</option>
            </select>
          </label>
          <label class="block">
            <span :class="label"><CalendarDays :size="13" /> From</span>
            <input id="statement-from" v-model="from" type="date" :max="to" :class="input" />
          </label>
          <label class="block">
            <span :class="label"><CalendarDays :size="13" /> To</span>
            <input id="statement-to" v-model="to" type="date" :min="from" :max="today()" :class="input" />
          </label>
        </div>
        <button type="button" :disabled="!statement" class="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40" @click="print">
          <Printer :size="15" /> Print statement
        </button>
      </div>

      <p v-if="error" class="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{{ error }}</p>

      <div v-if="statement" class="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900" :aria-busy="loading">
        <div class="flex flex-wrap items-start justify-between gap-4 border-b-[3px] border-navy px-6 py-5">
          <div>
            <h3 class="text-lg font-black normal-case tracking-normal text-navy dark:text-white">{{ SACCO }}</h3>
            <p class="text-[11px] font-bold uppercase tracking-wider text-brand">Savings &amp; Credit Cooperative</p>
          </div>
          <div class="text-right">
            <p class="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Account statement</p>
            <p class="font-mono text-[15px] font-bold text-navy dark:text-white">{{ statement.account.account_number }}</p>
            <p class="text-xs text-neutral-500">{{ formatDate(statement.period.from) }} – {{ formatDate(statement.period.to) }}</p>
          </div>
        </div>
        <div class="grid gap-3 px-6 py-4 sm:grid-cols-2">
          <div class="rounded-lg bg-neutral-50 px-4 py-3 dark:bg-neutral-800/50">
            <p class="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Account holder</p>
            <p class="text-sm font-bold text-neutral-900 dark:text-white">{{ statement.member.name }}</p>
            <p class="text-xs text-neutral-500">{{ statement.member.member_number }}<template v-if="statement.member.phone"> · {{ statement.member.phone }}</template></p>
          </div>
          <div class="rounded-lg bg-neutral-50 px-4 py-3 dark:bg-neutral-800/50">
            <p class="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Account</p>
            <p class="text-sm font-bold text-neutral-900 dark:text-white">{{ statement.account.product }}</p>
            <p class="text-xs capitalize text-neutral-500">Opened {{ formatDate(statement.account.opened_at) }} · {{ statement.account.status }}</p>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2 px-6 pb-4 sm:grid-cols-4">
          <div v-for="item in [
            { label: 'Opening balance', value: statement.balances.opening, tone: 'text-neutral-900 dark:text-white' },
            { label: 'Total credits', value: statement.balances.credits, tone: 'text-emerald-700' },
            { label: 'Total debits', value: statement.balances.debits, tone: 'text-rose-700' },
            { label: 'Closing balance', value: statement.balances.closing, tone: 'text-navy dark:text-white' },
          ]" :key="item.label" class="rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-700">
            <p class="text-[10px] font-bold uppercase tracking-wide text-neutral-500">{{ item.label }}</p>
            <p class="mt-1 font-mono text-sm font-bold" :class="item.tone">UGX {{ formatMoney(item.value) }}</p>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-[13px]">
            <thead class="bg-navy text-[10px] font-bold uppercase tracking-wider text-white">
              <tr><th class="px-4 py-2.5">Date</th><th class="px-4 py-2.5">Description</th><th class="px-4 py-2.5 text-right">Debit</th><th class="px-4 py-2.5 text-right">Credit</th><th class="px-4 py-2.5 text-right">Balance</th></tr>
            </thead>
            <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
              <tr class="bg-neutral-50/70 dark:bg-neutral-800/30">
                <td class="whitespace-nowrap px-4 py-2.5 text-neutral-400">{{ formatDate(statement.period.from) }}</td>
                <td class="px-4 py-2.5 font-semibold text-neutral-600 dark:text-neutral-300">Balance brought forward</td>
                <td class="px-4 py-2.5 text-right text-neutral-300">—</td>
                <td class="px-4 py-2.5 text-right text-neutral-300">—</td>
                <td class="px-4 py-2.5 text-right font-mono font-bold text-neutral-700 dark:text-neutral-200">{{ formatMoney(statement.balances.opening) }}</td>
              </tr>
              <tr v-for="row in statement.transactions" :key="row.id" :class="row.is_reversal ? 'text-amber-700' : ''">
                <td class="whitespace-nowrap px-4 py-2.5 text-neutral-500">{{ formatDate(row.date) }}</td>
                <td class="px-4 py-2.5">
                  <span class="font-medium text-neutral-800 dark:text-neutral-100">{{ row.description }}</span>
                  <span v-if="row.is_reversed" class="ml-1.5 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-neutral-500 dark:bg-neutral-800">Reversed</span>
                  <span v-if="row.reference" class="block font-mono text-[11px] text-neutral-400">{{ row.reference }}</span>
                </td>
                <td class="whitespace-nowrap px-4 py-2.5 text-right font-mono text-rose-700">{{ Number(row.debit) ? formatMoney(row.debit) : '—' }}</td>
                <td class="whitespace-nowrap px-4 py-2.5 text-right font-mono text-emerald-700">{{ Number(row.credit) ? formatMoney(row.credit) : '—' }}</td>
                <td class="whitespace-nowrap px-4 py-2.5 text-right font-mono font-bold text-neutral-900 dark:text-white">{{ formatMoney(row.balance) }}</td>
              </tr>
              <tr v-if="!statement.transactions.length">
                <td colspan="5" class="px-4 py-8 text-center text-sm text-neutral-500">No transactions in this period.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <p v-else-if="loading" class="py-10 text-center text-sm text-neutral-500" role="status">Loading statement…</p>
    </template>
  </div>
</template>
