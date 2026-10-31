<script setup lang="ts">
import PageHeader from '@/core/components/PageHeader.vue'
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import {
  AlertTriangle,
  CircleCheck,
  CircleX,
  ChevronDown,
  ChevronRight,
  Download,
  Info,
  RefreshCw,
} from 'lucide-vue-next'
import DataPanel from '@/core/components/DataPanel.vue'
import { Button } from '@/core/components/ui/button'
import type { CashFlowAccount } from '../api'
import CashFlowLedgerDrawer from '../components/CashFlowLedgerDrawer.vue'
import { useCashFlow } from '../composables/useCashFlow'
import { useCashFlowExport } from '../composables/useCashFlowExport'
import { cashMoney, dayLabel, isNegative, isZero } from '../utils/cashFlowFormat'
import { FINANCING_LIABILITY_ROWS, includesMigration, reconciliationLines, sectionLines } from '../utils/cashFlowStatement'
import { cashFlowSummary } from '../utils/cashFlowSummary'

const {
  from,
  to,
  compareFrom,
  compareTo,
  hideZero,
  loading,
  error,
  result,
  expanded,
  generate,
  toggle,
  setPreset,
} = useCashFlow()
const { exportReport, exporting, exportError } = useCashFlowExport(result)
const exportKind = ref<'csv' | 'excel' | 'pdf'>('pdf')

const summary = computed(() => (result.value ? cashFlowSummary(result.value) : ''))
const reconciled = computed(() => !!result.value && isZero(result.value.diagnostics.difference))
const migrated = computed(() => !!result.value && includesMigration(result.value))
const failedChecks = computed(() => result.value?.checks.filter((check) => !check.passed).length ?? 0)
const reconciliation = computed(() => (result.value ? reconciliationLines(result.value) : []))
const hasNonCash = computed(() => result.value?.non_cash.some((item) => !isZero(item.amount) || !isZero(item.compare_amount)) ?? false)
const hasBorrowings = computed(() => {
  const liabilities = result.value?.financing_liabilities
  if (!liabilities) return false
  return [liabilities.current, liabilities.compare].some((period) => Object.values(period).some((amount) => !isZero(amount)))
})
const expandable = computed(
  () =>
    result.value?.sections.flatMap((s) =>
      s.rows.filter((r) => r.accounts.length).map((r) => r.key),
    ) ?? [],
)

const kpis = computed(() => {
  const s = result.value?.summary
  if (!s) return []
  return [
    {
      key: 'opening',
      label: 'Opening cash',
      amount: s.opening_cash,
      compare: s.compare_opening_cash,
      note: `on ${dayLabel(result.value!.from)}`,
    },
    {
      key: 'operating',
      label: 'Net cash from operations',
      amount: s.operating,
      compare: s.compare_operating,
      note: 'loans, savings, income and costs',
    },
    {
      key: 'net',
      label: 'Net change in cash',
      amount: s.net_change,
      compare: s.compare_net_change,
      note: 'all activities',
    },
    {
      key: 'closing',
      label: 'Closing cash',
      amount: s.closing_cash,
      compare: s.compare_closing_cash,
      note: `on ${dayLabel(result.value!.to)}`,
    },
  ]
})

// Drill-down into an account's cash entries.
const drawerOpen = ref(false)
const drawerAccount = ref<CashFlowAccount | null>(null)
const drillFrom = ref('')
const drillTo = ref('')
function drill(account: CashFlowAccount, comparison = false) {
  if (!result.value) return
  drawerAccount.value = account
  drillFrom.value = comparison ? result.value.compare_from : result.value.from
  drillTo.value = comparison ? result.value.compare_to : result.value.to
  drawerOpen.value = true
}
watch(result, () => {
  drawerOpen.value = false
})

const inputClass = 'rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground'
</script>

<template>
  <div class="tw-scope flex flex-col gap-4">
    <PageHeader title="Cash flow statement" description="Where the SACCO's cash came from and where it went, in the format used for audited accounts.">
      <select v-model="exportKind" aria-label="Export format" :class="inputClass">
        <option value="pdf">PDF</option>
        <option value="excel">Excel</option>
        <option value="csv">CSV</option>
      </select>
      <Button variant="outline" size="sm" :disabled="!result || loading || exporting" @click="exportReport(exportKind)"><Download /> Export</Button>
    </PageHeader>

    <form class="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-background p-3" @submit.prevent="generate()">
      <div class="flex w-full flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" :disabled="loading" @click="generate(true)">Financial year to date</Button>
        <Button type="button" variant="outline" size="sm" :disabled="loading" @click="setPreset('quarter')">Quarter to date</Button>
        <Button type="button" variant="outline" size="sm" :disabled="loading" @click="setPreset('month')">Month to date</Button>
      </div>
      <label class="flex flex-col gap-1 text-xs font-medium">Period from<input v-model="from" type="date" required :class="inputClass" /></label>
      <label class="flex flex-col gap-1 text-xs font-medium">Period to<input v-model="to" type="date" required :class="inputClass" /></label>
      <label class="flex flex-col gap-1 text-xs font-medium">Compare from<input v-model="compareFrom" type="date" required :class="inputClass" /></label>
      <label class="flex flex-col gap-1 text-xs font-medium">Compare to<input v-model="compareTo" type="date" required :class="inputClass" /></label>
      <Button type="submit" size="sm" :disabled="loading"><RefreshCw :class="{ 'animate-spin': loading }" />{{ loading ? 'Generating…' : 'Generate' }}</Button>
      <label class="ml-auto flex items-center gap-2 text-sm text-muted-foreground"><input v-model="hideZero" type="checkbox" />Hide lines with no cash</label>
    </form>

    <p v-if="error" role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ error }}</p>
    <p v-if="exportError" role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ exportError }}</p>
    <p v-if="loading && !result" role="status" aria-live="polite" class="rounded-lg border border-border bg-background p-12 text-center text-sm text-muted-foreground">
      Reading cash movements from the ledger…
    </p>

    <div v-if="result" class="flex flex-col gap-4" :class="{ 'opacity-60 transition-opacity': loading }">
      <div v-if="!reconciled" role="alert" class="flex gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        <AlertTriangle class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p><strong>The statement is out by {{ cashMoney(result.diagnostics.difference) }}.</strong> The change in the cash accounts does not match the cash flows found, which happens when a journal entry that moved cash does not balance. Check the journal entries for this period.</p>
      </div>
      <p v-if="result.diagnostics.cash_account_count === 0" class="rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
        No cash or bank accounts were found. Cash accounts are those under Cash &amp; Cash Equivalents (11100) in the chart of accounts, or with the Cash or Bank subtype.
      </p>
      <div v-if="migrated" class="flex gap-2 rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
        <AlertTriangle class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p><strong>Draft: this period includes balances migrated at go-live.</strong> Migrated cash is shown as a reconciling line, not a cash flow, so this does not show a full period of cash flows. Use a period that starts after go-live for audited accounts. Exports are marked as draft.</p>
      </div>
      <div v-if="!result.diagnostics.classification_complete" class="rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
        <p><strong>Some accounts are not classified for the cash flow statement.</strong> Their cash is included under "Other operating assets and liabilities", so the totals are still complete.</p>
        <details class="mt-1">
          <summary class="cursor-pointer">View {{ result.diagnostics.issues.length }} accounts</summary>
          <ul class="mt-1">
            <li v-for="issue in result.diagnostics.issues" :key="issue.account_id">{{ issue.code }} {{ issue.name }}: {{ issue.message }}</li>
          </ul>
        </details>
        <RouterLink :to="{ name: 'accounting.chart-of-accounts' }" class="mt-1 inline-block font-medium underline">Review chart of accounts</RouterLink>
      </div>

      <dl class="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
        <div v-for="kpi in kpis" :key="kpi.key" class="bg-background px-3 py-2.5">
          <dt class="text-xs text-muted-foreground">{{ kpi.label }}</dt>
          <dd class="mt-0.5 text-xl font-bold tabular-nums" :class="isNegative(kpi.amount) ? 'text-destructive' : 'text-navy dark:text-white'">{{ isZero(kpi.amount) ? '0.00' : cashMoney(kpi.amount) }}</dd>
          <dd class="text-xs text-muted-foreground">{{ kpi.note }}. Comparison {{ isZero(kpi.compare) ? '0.00' : cashMoney(kpi.compare) }}</dd>
        </div>
      </dl>

      <p class="max-w-[85ch] text-sm text-muted-foreground">{{ summary }}</p>

      <DataPanel label="Statement of cash flows">
        <header class="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <p class="text-xs text-muted-foreground">{{ result.entity }}</p>
            <h2 class="text-lg font-bold normal-case tracking-normal text-navy dark:text-white">Statement of cash flows</h2>
            <p class="text-sm text-muted-foreground">For {{ dayLabel(result.from) }} to {{ dayLabel(result.to) }}. Direct method, in {{ result.currency }}.</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="badge" :class="reconciled ? 'badge--active' : 'badge--rejected'">{{ reconciled ? 'Reconciles to the ledger' : 'Does not reconcile' }}</span>
            <Button type="button" variant="ghost" size="xs" @click="expanded = expanded.size ? new Set() : new Set(expandable)">{{ expanded.size ? 'Hide accounts' : 'Show accounts' }}</Button>
          </div>
        </header>

        <div class="overflow-x-auto">
          <table class="w-full min-w-[42rem] text-sm tabular-nums">
            <caption class="sr-only">Cash flows by activity for the period and the comparison period. Amounts in parentheses are cash paid out.</caption>
            <thead class="bg-muted text-xs font-medium text-muted-foreground">
              <tr>
                <th scope="col" class="px-4 py-2.5 text-left font-medium">Description</th>
                <th scope="col" class="px-4 py-2.5 text-right font-medium">{{ dayLabel(result.from) }}<br />to {{ dayLabel(result.to) }}</th>
                <th scope="col" class="px-4 py-2.5 text-right font-medium">{{ dayLabel(result.compare_from) }}<br />to {{ dayLabel(result.compare_to) }}</th>
              </tr>
            </thead>
            <tbody v-for="section in result.sections" :key="section.key">
              <tr>
                <th scope="rowgroup" colspan="3" class="px-4 pb-1.5 pt-5 text-left font-bold text-navy dark:text-white">{{ section.label }}</th>
              </tr>
              <tr v-if="section.rows.length === 0">
                <td colspan="3" class="px-4 py-2 text-muted-foreground">No cash moved in this activity.</td>
              </tr>
              <template v-for="line in sectionLines(section)" :key="line.key">
                <tr v-if="line.kind === 'heading'">
                  <th scope="rowgroup" colspan="3" class="px-4 pb-1 pt-3 text-left font-medium text-muted-foreground">{{ line.label }}</th>
                </tr>
                <template v-else-if="line.kind === 'row'">
                  <tr class="border-b border-border">
                    <th scope="row" class="px-4 py-2.5 text-left font-normal">
                      <button v-if="line.row.accounts.length" type="button" class="flex cursor-pointer items-center gap-2 text-left" :aria-expanded="expanded.has(line.row.key)" @click="toggle(line.row.key)">
                        <component :is="expanded.has(line.row.key) ? ChevronDown : ChevronRight" class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span>{{ line.row.label }}</span>
                      </button>
                      <span v-else class="pl-6">{{ line.row.label }}</span>
                      <span class="sr-only">. {{ line.row.hint }}</span>
                    </th>
                    <td class="px-4 py-2.5 text-right" :title="line.row.hint">{{ cashMoney(line.row.amount) }}</td>
                    <td class="px-4 py-2.5 text-right text-muted-foreground">{{ cashMoney(line.row.compare_amount) }}</td>
                  </tr>
                  <template v-if="expanded.has(line.row.key)">
                    <tr class="bg-muted/40">
                      <td colspan="3" class="py-1.5 pl-10 pr-4 text-xs text-muted-foreground"><Info class="mr-1 inline-block size-3.5 align-[-2px]" aria-hidden="true" />{{ line.row.hint }}</td>
                    </tr>
                    <tr v-for="account in line.row.accounts" :key="`${line.row.key}-${account.id}`" class="border-b border-border bg-muted/40 text-muted-foreground">
                      <th scope="row" class="py-2 pl-10 pr-4 text-left font-normal"><span class="mr-2 text-xs">{{ account.code }}</span>{{ account.name }}</th>
                      <td class="px-4 py-2 text-right"><button type="button" class="cursor-pointer underline decoration-dotted underline-offset-4" :aria-label="`${account.name}: cash entries in the period`" @click="drill(account)">{{ cashMoney(account.amount) }}</button></td>
                      <td class="px-4 py-2 text-right"><button type="button" class="cursor-pointer underline decoration-dotted underline-offset-4" :aria-label="`${account.name}: cash entries in the comparison period`" @click="drill(account, true)">{{ cashMoney(account.compare_amount) }}</button></td>
                    </tr>
                  </template>
                </template>
                <tr v-else :class="line.kind === 'total' ? 'bg-muted font-bold text-navy dark:text-white' : 'border-b border-border font-medium'">
                  <th scope="row" class="px-4 py-3 text-left [font-weight:inherit]">{{ line.label }}</th>
                  <td class="px-4 py-3 text-right">{{ cashMoney(line.amount) }}</td>
                  <td class="px-4 py-3 text-right">{{ cashMoney(line.compare_amount) }}</td>
                </tr>
              </template>
            </tbody>
            <tbody>
              <tr><td colspan="3" class="h-3"></td></tr>
              <tr v-for="line in reconciliation" :key="line.key" class="border-t border-border" :class="{ 'font-bold text-navy dark:text-white': line.strong, 'text-warning': line.key === 'migrated' }">
                <th scope="row" class="px-4 py-3 text-left [font-weight:inherit]">{{ line.label }}</th>
                <td class="px-4 py-3 text-right">{{ cashMoney(line.amount) }}</td>
                <td class="px-4 py-3 text-right">{{ cashMoney(line.compare_amount) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="border-t border-border px-4 py-2 text-xs text-muted-foreground">Amounts in parentheses are cash paid out. {{ result.basis }}</p>
      </DataPanel>

      <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DataPanel label="Note 1: cash and cash equivalents">
          <h2 class="border-b border-border px-4 py-2.5 text-sm font-bold normal-case tracking-normal text-navy dark:text-white">Note 1: Cash and cash equivalents</h2>
          <div class="overflow-x-auto">
            <table class="w-full text-sm tabular-nums">
              <thead class="bg-muted text-xs text-muted-foreground">
                <tr>
                  <th scope="col" class="px-4 py-2.5 text-left font-medium">Account</th>
                  <th scope="col" class="px-4 py-2.5 text-right font-medium">At {{ dayLabel(result.to) }}</th>
                  <th scope="col" class="px-4 py-2.5 text-right font-medium">At {{ dayLabel(result.from) }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="account in result.cash_accounts" :key="account.id" class="border-b border-border">
                  <th scope="row" class="px-4 py-3 text-left font-normal"><span class="mr-2 text-xs text-muted-foreground">{{ account.code }}</span>{{ account.name }}</th>
                  <td class="px-4 py-3 text-right">{{ cashMoney(account.closing) }}</td>
                  <td class="px-4 py-3 text-right text-muted-foreground">{{ cashMoney(account.opening) }}</td>
                </tr>
                <tr v-if="!result.cash_accounts.length"><td colspan="3" class="px-4 py-6 text-center text-muted-foreground">No cash accounts with a balance.</td></tr>
                <tr class="bg-muted font-bold text-navy dark:text-white">
                  <th scope="row" class="px-4 py-3 text-left [font-weight:inherit]">Total</th>
                  <td class="px-4 py-3 text-right">{{ cashMoney(result.summary.closing_cash) }}</td>
                  <td class="px-4 py-3 text-right">{{ cashMoney(result.summary.opening_cash) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </DataPanel>

        <DataPanel label="Statement checks">
          <h2 class="border-b border-border px-4 py-2.5 text-sm font-bold normal-case tracking-normal text-navy dark:text-white">Statement checks <span class="font-normal text-muted-foreground">{{ failedChecks ? `${failedChecks} ${failedChecks === 1 ? 'needs' : 'need'} attention` : 'all passed' }}</span></h2>
          <ul class="divide-y divide-border text-sm">
            <li v-for="check in result.checks" :key="check.key" class="flex items-start gap-2 px-4 py-3">
              <CircleCheck v-if="check.passed" class="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
              <CircleX v-else class="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
              <span><span class="sr-only">{{ check.passed ? 'Passed: ' : 'Failed: ' }}</span>{{ check.label }}</span>
            </li>
          </ul>
        </DataPanel>

        <DataPanel label="Note 2: non-cash transactions">
          <h2 class="border-b border-border px-4 py-2.5 text-sm font-bold normal-case tracking-normal text-navy dark:text-white">Note 2: Non-cash transactions</h2>
          <p v-if="!hasNonCash" class="px-4 py-3 text-sm text-muted-foreground">No shares were bought from savings and no dividends were credited to savings in these periods.</p>
          <table v-else class="w-full text-sm tabular-nums">
            <thead class="bg-muted text-xs text-muted-foreground">
              <tr>
                <th scope="col" class="px-4 py-2.5 text-left font-medium">Description</th>
                <th scope="col" class="whitespace-nowrap px-4 py-2.5 text-right font-medium">To {{ dayLabel(result.to) }}</th>
                <th scope="col" class="whitespace-nowrap px-4 py-2.5 text-right font-medium">To {{ dayLabel(result.compare_to) }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in result.non_cash" :key="item.key" class="border-b border-border">
                <th scope="row" class="px-4 py-3 text-left font-normal">{{ item.label }}</th>
                <td class="px-4 py-3 text-right">{{ cashMoney(item.amount) }}</td>
                <td class="px-4 py-3 text-right text-muted-foreground">{{ cashMoney(item.compare_amount) }}</td>
              </tr>
            </tbody>
          </table>
          <p class="px-4 py-2 text-xs text-muted-foreground">These moved no cash, so they are left out of the statement and disclosed here.</p>
        </DataPanel>

        <DataPanel label="Note 3: liabilities from financing activities">
          <h2 class="border-b border-border px-4 py-2.5 text-sm font-bold normal-case tracking-normal text-navy dark:text-white">Note 3: Liabilities from financing activities</h2>
          <p v-if="!hasBorrowings" class="px-4 py-3 text-sm text-muted-foreground">The SACCO has no external borrowings in these periods.</p>
          <table v-else class="w-full text-sm tabular-nums">
            <thead class="bg-muted text-xs text-muted-foreground">
              <tr>
                <th scope="col" class="px-4 py-2.5 text-left font-medium">Description</th>
                <th scope="col" class="whitespace-nowrap px-4 py-2.5 text-right font-medium">To {{ dayLabel(result.to) }}</th>
                <th scope="col" class="whitespace-nowrap px-4 py-2.5 text-right font-medium">To {{ dayLabel(result.compare_to) }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in FINANCING_LIABILITY_ROWS" :key="row.key" class="border-b border-border" :class="{ 'font-semibold': row.strong }">
                <th scope="row" class="px-4 py-3 text-left [font-weight:inherit]">{{ row.label }}</th>
                <td class="px-4 py-3 text-right">{{ cashMoney(result.financing_liabilities.current[row.key]) }}</td>
                <td class="px-4 py-3 text-right text-muted-foreground">{{ cashMoney(result.financing_liabilities.compare[row.key]) }}</td>
              </tr>
            </tbody>
          </table>
        </DataPanel>
      </div>
    </div>

    <CashFlowLedgerDrawer
      v-model:open="drawerOpen"
      :account="drawerAccount"
      :from="drillFrom"
      :to="drillTo"
    />
  </div>
</template>
