<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/core/components/ui/table'
import { formatDate, formatMoney } from '@/core/utils/format'
import { membersApi } from '../api'
import type { MemberStatementData, MemberStatementSection, MemberTransaction } from '../types'
import { escapeHtml as escape, ledgerTypeLabel, repaymentSplit, shareUnits } from '../utils'

/**
 * Every account the member holds for a period: a summary that keeps savings, shares and loans apart,
 * then a section per account with its own opening balance, entries and closing balance.
 */
const props = defineProps<{ memberId: number; from: string; to: string; sacco: string }>()

const statement = ref<MemberStatementData | null>(null)
const loading = ref(false)
const error = ref('')
let sequence = 0

async function load() {
  const current = ++sequence
  loading.value = true
  error.value = ''
  try {
    const result = await membersApi.statement(props.memberId, props.from, props.to)
    if (current === sequence) statement.value = result
  } catch (failure) {
    if (current === sequence) error.value = failure instanceof Error ? failure.message : 'Could not load the statement.'
  } finally {
    if (current === sequence) loading.value = false
  }
}

watch(() => [props.memberId, props.from, props.to], load, { immediate: true })

const SECTION_NAMES = { savings: 'Savings account', shares: 'Share account', loans: 'Loan' }
const money = (value: string | number) => `UGX ${formatMoney(value)}`

const summaryItems = computed(() => {
  const s = statement.value?.summary
  if (!s) return []
  return [
    { label: 'Savings balance', value: money(s.savings_balance), note: 'Held for the member' },
    { label: 'Shares', value: shareUnits(s.shares_held), note: `${money(s.shares_value)} · not withdrawable` },
    { label: 'Loans outstanding', value: money(s.loans_outstanding), note: 'Principal still owed' },
  ]
})

/** Opening and closing in the account's own unit; loans and savings add their totals. */
function figures(section: MemberStatementSection): { label: string; value: string }[] {
  if (section.source === 'shares') {
    return [
      { label: 'Opening holding', value: shareUnits(section.shares_opening ?? 0) },
      { label: 'Closing holding', value: shareUnits(section.shares_closing ?? 0) },
      { label: 'Closing value', value: money(section.closing) },
    ]
  }
  return [
    { label: section.source === 'loans' ? 'Principal brought forward' : 'Opening balance', value: money(section.opening) },
    { label: 'Total credits', value: money(section.credits ?? 0) },
    { label: 'Total debits', value: money(section.debits ?? 0) },
    { label: section.source === 'loans' ? 'Principal owed' : 'Closing balance', value: money(section.closing) },
  ]
}

const amountIn = (entry: MemberTransaction, direction: MemberTransaction['direction']) => (entry.direction === direction ? formatMoney(entry.amount) : '—')
const balanceOf = (entry: MemberTransaction) => (entry.shares_after === null ? formatMoney(entry.balance_after) : shareUnits(entry.shares_after))
const describe = (entry: MemberTransaction) => repaymentSplit(entry) ?? entry.narration
const openingBalance = (section: MemberStatementSection) => (section.source === 'shares' ? shareUnits(section.shares_opening ?? 0) : formatMoney(section.opening))

/** Open the statement on its own A4 page so the app's styles do not interfere with printing. */
function print() {
  const s = statement.value
  if (!s) return
  const page = window.open('', '_blank', 'width=980,height=720')
  if (!page) return
  const sections = s.sections
    .map((section) => {
      const rows = section.entries
        .map(
          (entry) => `<tr><td>${escape(formatDate(entry.date))}</td><td>${escape(ledgerTypeLabel(entry))}${describe(entry) ? `<small>${escape(describe(entry))}</small>` : ''}${entry.reference ? `<small>${escape(entry.reference)}</small>` : ''}</td>
          <td class="num">${escape(amountIn(entry, 'debit'))}</td><td class="num">${escape(amountIn(entry, 'credit'))}</td><td class="num bal">${escape(balanceOf(entry))}</td></tr>`,
        )
        .join('')
      return `<section><h2>${escape(SECTION_NAMES[section.source])} ${escape(section.account)} <span>${escape(section.account_type)} · ${escape(section.status)}</span></h2>
        <div class="sum">${figures(section).map((item) => `<div><span>${escape(item.label)}</span><b>${escape(item.value)}</b></div>`).join('')}</div>
        <table><thead><tr><th>Date</th><th>Description</th><th class="num">Debit</th><th class="num">Credit</th><th class="num">Balance</th></tr></thead><tbody>
        <tr class="opening"><td>${escape(formatDate(s.period.from))}</td><td>Balance brought forward</td><td class="num">—</td><td class="num">—</td><td class="num bal">${escape(openingBalance(section))}</td></tr>${rows}
        </tbody></table></section>`
    })
    .join('')
  page.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Statement ${escape(s.member.member_number)}</title><style>
    @page { size: A4; margin: 14mm; } body { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; color: #1c2433; margin: 0; font-size: 12px; }
    header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1f2a5c; padding-bottom: 12px; }
    h1 { margin: 0; font-size: 20px; color: #1f2a5c; } .tag { color: #b83236; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }
    .doc { text-align: right; } .doc b { display: block; font-size: 15px; color: #1f2a5c; }
    .holder { background: #f6f7fb; border-radius: 6px; padding: 10px 12px; margin: 16px 0; } .holder span { display: block; color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: .06em; } .holder strong { font-size: 13px; }
    .sum { display: grid; grid-template-columns: repeat(auto-fit, minmax(0, 1fr)); grid-auto-flow: column; gap: 8px; margin-bottom: 12px; } .sum div { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; }
    .sum span { display: block; color: #64748b; font-size: 10px; text-transform: uppercase; } .sum b { font-size: 13px; font-variant-numeric: tabular-nums; } .sum small { display: block; color: #64748b; font-size: 10px; }
    section { margin-top: 18px; } section h2 { font-size: 13px; color: #1f2a5c; margin: 0 0 8px; break-after: avoid; } section h2 span { color: #64748b; font-size: 11px; font-weight: 400; text-transform: capitalize; }
    table { width: 100%; border-collapse: collapse; } th { background: #1f2a5c; color: #fff; text-align: left; padding: 7px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; }
    td { padding: 6px 8px; border-bottom: 1px solid #eef1f6; vertical-align: top; } td small { display: block; color: #94a3b8; font-size: 10px; }
    .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; } .bal { font-weight: 700; }
    .opening td { background: #f8fafc; font-weight: 600; } footer { margin-top: 18px; color: #94a3b8; font-size: 10px; text-align: center; }
  </style></head><body>
    <header><div><h1>${escape(props.sacco)}</h1><div class="tag">Savings & Credit Cooperative</div></div>
      <div class="doc"><span class="tag">Consolidated statement</span><b>${escape(s.member.member_number)}</b>${escape(formatDate(s.period.from))} – ${escape(formatDate(s.period.to))}</div></header>
    <div class="holder"><span>Account holder</span><strong>${escape(s.member.name)}</strong>${s.member.phone ? ` · ${escape(s.member.phone)}` : ''}</div>
    <div class="sum">${summaryItems.value.map((item) => `<div><span>${escape(item.label)}</span><b>${escape(item.value)}</b><small>${escape(item.note)}</small></div>`).join('')}</div>
    ${sections}
    <footer>Generated ${escape(new Date().toLocaleString('en-GB'))}. This is a computer-generated statement. Balances are shown by account and are not added together.</footer>
  </body></html>`)
  page.document.close()
  page.focus()
  page.print()
}

defineExpose({ print, ready: computed(() => statement.value !== null) })
</script>

<template>
  <div>
    <p v-if="error" class="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{{ error }}</p>

    <div v-if="statement" class="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900" :aria-busy="loading">
      <div class="flex flex-wrap items-start justify-between gap-4 border-b-[3px] border-navy px-6 py-5">
        <div>
          <h3 class="text-subsection text-heading">{{ sacco }}</h3>
          <p class="text-xs font-bold uppercase tracking-wider text-brand">Savings &amp; Credit Cooperative</p>
        </div>
        <div class="text-right">
          <p class="text-xs font-bold uppercase tracking-wider text-neutral-400">Consolidated statement</p>
          <p class="font-mono text-sm font-bold text-navy dark:text-white">{{ statement.member.member_number }}</p>
          <p class="text-xs text-neutral-500">{{ formatDate(statement.period.from) }} – {{ formatDate(statement.period.to) }}</p>
        </div>
      </div>

      <div class="px-6 pt-4">
        <p class="text-xs font-bold uppercase tracking-wider text-neutral-400">Account holder</p>
        <p class="text-sm font-bold text-neutral-900 dark:text-white">{{ statement.member.name }}</p>
      </div>
      <div class="grid gap-2 px-6 py-4 sm:grid-cols-3">
        <div v-for="item in summaryItems" :key="item.label" class="rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-700">
          <p class="text-xs font-bold uppercase tracking-wide text-neutral-500">{{ item.label }}</p>
          <p class="mt-1 tabular-nums text-sm font-bold text-neutral-900 dark:text-white">{{ item.value }}</p>
          <p class="mt-0.5 text-xs text-neutral-500">{{ item.note }}</p>
        </div>
      </div>

      <p v-if="!statement.sections.length" class="px-6 pb-8 text-center text-sm text-neutral-500">This member has no accounts to report on.</p>

      <section v-for="section in statement.sections" :key="`${section.source}-${section.account_id}`" class="border-t border-neutral-200 dark:border-neutral-800">
        <div class="px-6 pt-5">
          <h4 class="text-subsection text-heading">{{ SECTION_NAMES[section.source] }} <span class="font-mono">{{ section.account }}</span></h4>
          <p class="text-xs capitalize text-neutral-500">{{ section.account_type }} · {{ section.status.replace('_', ' ') }}</p>
        </div>
        <div class="grid grid-cols-2 gap-2 px-6 py-3 sm:grid-cols-4">
          <div v-for="item in figures(section)" :key="item.label" class="rounded-lg bg-neutral-50 px-3 py-2 dark:bg-neutral-800/50">
            <p class="text-xs font-bold uppercase tracking-wide text-neutral-500">{{ item.label }}</p>
            <p class="mt-1 tabular-nums text-sm font-bold text-neutral-900 dark:text-white">{{ item.value }}</p>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead class="text-right">Debit</TableHead>
              <TableHead class="text-right">Credit</TableHead>
              <TableHead class="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell class="whitespace-nowrap text-neutral-500">{{ formatDate(statement.period.from) }}</TableCell>
              <TableCell class="font-semibold">Balance brought forward</TableCell>
              <TableCell class="text-right text-neutral-400">—</TableCell>
              <TableCell class="text-right text-neutral-400">—</TableCell>
              <TableCell class="whitespace-nowrap text-right font-bold tabular-nums">{{ openingBalance(section) }}</TableCell>
            </TableRow>
            <TableRow v-for="entry in section.entries" :key="`${entry.type}-${entry.id}`">
              <TableCell class="whitespace-nowrap text-neutral-500">{{ formatDate(entry.date) }}</TableCell>
              <TableCell>
                <span class="font-medium">{{ ledgerTypeLabel(entry) }}</span>
                <span v-if="describe(entry)" class="block text-xs text-neutral-500">{{ describe(entry) }}</span>
                <span v-if="entry.reference" class="block font-mono text-xs text-neutral-400">{{ entry.reference }}</span>
              </TableCell>
              <TableCell class="whitespace-nowrap text-right tabular-nums text-rose-700">{{ amountIn(entry, 'debit') }}</TableCell>
              <TableCell class="whitespace-nowrap text-right tabular-nums text-emerald-700">{{ amountIn(entry, 'credit') }}</TableCell>
              <TableCell class="whitespace-nowrap text-right font-bold tabular-nums">{{ balanceOf(entry) }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </section>
      <p class="border-t border-neutral-200 px-6 py-3 text-xs text-neutral-500 dark:border-neutral-800">Balances are shown by account and are not added together.</p>
    </div>
    <p v-else-if="loading" class="py-10 text-center text-sm text-neutral-500" role="status">Loading statement…</p>
  </div>
</template>
