<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  Info,
  RefreshCw,
} from 'lucide-vue-next'
import type { CashFlowAccount } from '../api'
import CashFlowWaterfall from '../components/CashFlowWaterfall.vue'
import CashFlowMonthly from '../components/CashFlowMonthly.vue'
import CashFlowLedgerDrawer from '../components/CashFlowLedgerDrawer.vue'
import { useCashFlow } from '../composables/useCashFlow'
import { useCashFlowExport } from '../composables/useCashFlowExport'
import { cashMoney, dayLabel, isNegative, isZero } from '../utils/cashFlowFormat'
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

const sectionTotalLabel: Record<string, string> = {
  operating: 'Net cash from operating activities',
  investing: 'Net cash from investing activities',
  financing: 'Net cash from financing activities',
  other: 'Net balances brought onto the system',
}

const inputClass =
  'rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white'
const buttonClass =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800'
const cardClass =
  'rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
</script>

<template>
  <div class="tw-report flex flex-col gap-6 text-neutral-900 dark:text-neutral-100">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="mb-1 text-xs font-semibold uppercase tracking-widest text-neutral-500">
          Financial reports
        </p>
        <h1 class="text-2xl font-bold">Cash Flow Statement</h1>
        <p class="mt-1 text-sm text-neutral-500">
          Where the SACCO's cash came from and where it went, for a selected period.
        </p>
      </div>
      <div class="flex gap-2">
        <select v-model="exportKind" aria-label="Export format" :class="inputClass">
          <option value="pdf">PDF</option>
          <option value="excel">Excel</option>
          <option value="csv">CSV</option>
        </select>
        <button
          :class="buttonClass"
          :disabled="!result || loading || exporting"
          @click="exportReport(exportKind)"
        >
          <Download class="h-4 w-4" />Export
        </button>
      </div>
    </header>

    <form :class="[cardClass, 'p-4']" @submit.prevent="generate()">
      <div class="mb-4 flex flex-wrap gap-2">
        <button type="button" :class="buttonClass" :disabled="loading" @click="generate(true)">
          Financial year to date
        </button>
        <button type="button" :class="buttonClass" :disabled="loading" @click="setPreset('month')">
          Month to date
        </button>
        <button
          type="button"
          :class="buttonClass"
          :disabled="loading"
          @click="setPreset('quarter')"
        >
          Quarter to date
        </button>
      </div>
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label class="flex flex-col gap-1 text-xs font-medium"
          >Period from<input v-model="from" type="date" required :class="inputClass"
        /></label>
        <label class="flex flex-col gap-1 text-xs font-medium"
          >Period to<input v-model="to" type="date" required :class="inputClass"
        /></label>
        <label class="flex flex-col gap-1 text-xs font-medium"
          >Compare from<input v-model="compareFrom" type="date" required :class="inputClass"
        /></label>
        <label class="flex flex-col gap-1 text-xs font-medium"
          >Compare to<input v-model="compareTo" type="date" required :class="inputClass"
        /></label>
      </div>
      <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label class="flex items-center gap-2 text-sm text-neutral-500">
          <input v-model="hideZero" type="checkbox" />Hide lines with no cash in either period
        </label>
        <button
          type="submit"
          :disabled="loading"
          class="inline-flex items-center gap-2 rounded-lg bg-navy px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />{{
            loading ? 'Generating…' : 'Generate statement'
          }}
        </button>
      </div>
    </form>

    <p
      v-if="error"
      role="alert"
      class="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
    >
      {{ error }}
    </p>
    <p v-if="exportError" role="alert" class="text-sm text-rose-700">{{ exportError }}</p>
    <div
      v-if="loading && !result"
      role="status"
      aria-live="polite"
      class="rounded-2xl border border-neutral-200 p-12 text-center text-sm text-neutral-500 dark:border-neutral-800"
    >
      Reading cash movements from the ledger…
    </div>

    <template v-if="result">
      <div :class="{ 'opacity-60 transition-opacity': loading }" class="flex flex-col gap-6">
        <!-- Warnings -->
        <div
          v-if="!reconciled"
          role="alert"
          class="flex gap-3 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-100"
        >
          <AlertTriangle class="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p class="font-semibold">
              The statement is out by {{ cashMoney(result.diagnostics.difference) }}
            </p>
            <p class="mt-1">
              The change in the cash accounts does not match the cash flows found. This happens when
              a journal entry that moved cash does not balance. Check the journal entries for this
              period.
            </p>
          </div>
        </div>
        <p
          v-if="result.diagnostics.cash_account_count === 0"
          class="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100"
        >
          No cash or bank accounts were found. Cash accounts are those under Cash &amp; Cash
          Equivalents (11100) in the chart of accounts, or with the Cash or Bank subtype.
        </p>
        <div
          v-if="!result.diagnostics.classification_complete"
          class="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100"
        >
          <p class="font-semibold">Some accounts are not classified for the cash flow statement</p>
          <p class="mt-1">
            Their cash is included under “Other operating cash flows”, so the totals are still
            complete.
          </p>
          <details class="mt-2">
            <summary class="cursor-pointer">
              View {{ result.diagnostics.issues.length }} accounts
            </summary>
            <ul class="mt-2 space-y-1">
              <li v-for="issue in result.diagnostics.issues" :key="issue.account_id">
                {{ issue.code }} · {{ issue.name }} — {{ issue.message }}
              </li>
            </ul>
          </details>
          <RouterLink :to="{ name: 'accounting.chart-of-accounts' }" class="mt-2 inline-block font-medium underline"
            >Review chart of accounts</RouterLink
          >
        </div>

        <!-- Headline -->
        <section :class="[cardClass, 'p-5']">
          <p class="text-xs font-semibold uppercase tracking-widest text-neutral-500">In short</p>
          <p class="mt-2 text-base leading-relaxed text-neutral-800 dark:text-neutral-100">
            {{ summary }}
          </p>
        </section>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div v-for="kpi in kpis" :key="kpi.key" :class="[cardClass, 'p-4 shadow-sm']">
            <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500">
              {{ kpi.label }}
            </p>
            <p
              class="mt-2 text-xl font-bold tabular-nums"
              :class="
                isNegative(kpi.amount)
                  ? 'text-rose-700 dark:text-rose-400'
                  : 'text-neutral-900 dark:text-white'
              "
            >
              {{ isZero(kpi.amount) ? '0.00' : cashMoney(kpi.amount) }}
            </p>
            <p class="mt-1 text-xs text-neutral-500">{{ kpi.note }}</p>
            <p class="mt-2 text-xs text-neutral-500">
              Comparison:
              <span class="font-medium tabular-nums text-neutral-700 dark:text-neutral-300">{{
                isZero(kpi.compare) ? '0.00' : cashMoney(kpi.compare)
              }}</span>
            </p>
          </div>
        </div>

        <!-- Charts -->
        <div class="grid gap-6 xl:grid-cols-2">
          <section :class="[cardClass, 'min-w-0 p-5']">
            <h2 class="font-semibold">From opening to closing cash</h2>
            <p class="mb-3 mt-1 text-xs text-neutral-500">
              Net cash each activity added or used. Hover a bar for details.
            </p>
            <CashFlowWaterfall :report="result" />
          </section>
          <section :class="[cardClass, 'min-w-0 p-5']">
            <h2 class="font-semibold">Net cash flow by month</h2>
            <p class="mb-3 mt-1 text-xs text-neutral-500">
              Money in less money out each month. Hover a month for the breakdown.
            </p>
            <CashFlowMonthly :months="result.monthly" />
          </section>
        </div>

        <!-- The statement -->
        <section :class="[cardClass, 'overflow-hidden']">
          <header
            class="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-200 px-6 py-6 dark:border-neutral-800"
          >
            <div>
              <p class="text-xs font-semibold uppercase tracking-widest text-neutral-500">
                {{ result.entity }}
              </p>
              <h2 class="mt-1 text-xl font-semibold">Statement of Cash Flows</h2>
              <p class="mt-2 text-sm text-neutral-500">
                {{ dayLabel(result.from) }} to {{ dayLabel(result.to) }} · {{ result.currency }} ·
                Direct method
              </p>
              <p
                v-if="result.period_default === 'calendar_year' && !result.financial_year"
                class="mt-1 text-xs text-neutral-500"
              >
                No financial year is set up for this date, so “year to date” uses the calendar year.
              </p>
            </div>
            <span
              class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
              :class="
                reconciled
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              "
            >
              <CheckCircle2 v-if="reconciled" class="h-3.5 w-3.5" /><AlertTriangle
                v-else
                class="h-3.5 w-3.5"
              />
              {{ reconciled ? 'Reconciles to the cash accounts' : 'Does not reconcile' }}
            </span>
          </header>
          <div class="flex gap-4 px-6 pt-4 text-xs font-medium">
            <button
              type="button"
              class="underline underline-offset-4"
              @click="expanded = new Set(expandable)"
            >
              Show accounts
            </button>
            <button
              type="button"
              class="underline underline-offset-4"
              @click="expanded = new Set()"
            >
              Hide accounts
            </button>
          </div>
          <p class="px-6 pt-3 text-xs text-neutral-500 sm:hidden">
            Scroll the table sideways to see both periods.
          </p>
          <div class="overflow-x-auto">
            <table class="mt-2 w-full min-w-[680px] text-sm">
              <caption class="sr-only">
                Cash flows by activity for the period and the comparison period. Amounts in
                parentheses are cash paid out.
              </caption>
              <thead class="bg-neutral-50 text-xs text-neutral-500 dark:bg-neutral-800/50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left">Description</th>
                  <th scope="col" class="px-6 py-3 text-right">
                    {{ dayLabel(result.from) }}<br />to {{ dayLabel(result.to) }}
                  </th>
                  <th scope="col" class="px-6 py-3 text-right">
                    {{ dayLabel(result.compare_from) }}<br />to {{ dayLabel(result.compare_to) }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  class="border-b border-neutral-200 bg-neutral-50/60 font-semibold dark:border-neutral-700 dark:bg-neutral-800/30"
                >
                  <th scope="row" class="px-6 py-3 text-left [font-weight:inherit]">
                    Cash and cash equivalents at the start of the period
                  </th>
                  <td class="px-6 py-3 text-right tabular-nums">
                    {{ cashMoney(result.summary.opening_cash) }}
                  </td>
                  <td class="px-6 py-3 text-right tabular-nums">
                    {{ cashMoney(result.summary.compare_opening_cash) }}
                  </td>
                </tr>
                <template v-for="section in result.sections" :key="section.key">
                  <tr>
                    <th
                      scope="rowgroup"
                      colspan="3"
                      class="px-6 pb-2 pt-5 text-left text-xs font-bold uppercase tracking-wider text-navy dark:text-blue-300"
                    >
                      {{ section.label }}
                    </th>
                  </tr>
                  <tr v-if="!section.rows.length">
                    <td colspan="3" class="px-6 py-2 text-sm italic text-neutral-400">
                      No cash moved in this activity.
                    </td>
                  </tr>
                  <template v-for="row in section.rows" :key="row.key">
                    <tr class="border-b border-neutral-100 dark:border-neutral-800">
                      <th scope="row" class="px-6 py-2.5 text-left font-normal">
                        <button
                          v-if="row.accounts.length"
                          type="button"
                          class="flex items-center gap-2 text-left"
                          :aria-expanded="expanded.has(row.key)"
                          @click="toggle(row.key)"
                        >
                          <component
                            :is="expanded.has(row.key) ? ChevronDown : ChevronRight"
                            class="h-4 w-4 shrink-0 text-neutral-400"
                          />
                          <span>{{ row.label }}</span>
                        </button>
                        <span v-else class="pl-6">{{ row.label }}</span>
                        <span class="sr-only">. {{ row.hint }}</span>
                      </th>
                      <td class="px-6 py-2.5 text-right tabular-nums" :title="row.hint">
                        {{ cashMoney(row.amount) }}
                      </td>
                      <td
                        class="px-6 py-2.5 text-right tabular-nums text-neutral-600 dark:text-neutral-400"
                      >
                        {{ cashMoney(row.compare_amount) }}
                      </td>
                    </tr>
                    <template v-if="expanded.has(row.key)">
                      <tr>
                        <td
                          colspan="3"
                          class="bg-neutral-50/50 py-1.5 pl-14 pr-6 text-xs text-neutral-500 dark:bg-neutral-800/20"
                        >
                          <Info class="mr-1 inline-block h-3.5 w-3.5 align-[-2px]" />{{ row.hint }}
                        </td>
                      </tr>
                      <tr
                        v-for="account in row.accounts"
                        :key="`${row.key}-${account.id}`"
                        class="border-b border-neutral-100 bg-neutral-50/50 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-800/20 dark:text-neutral-400"
                      >
                        <th scope="row" class="py-2 pl-14 pr-6 text-left font-normal">
                          <span class="mr-2 font-mono text-xs text-neutral-400">{{
                            account.code
                          }}</span
                          >{{ account.name }}
                        </th>
                        <td class="px-6 py-2 text-right tabular-nums">
                          <button
                            type="button"
                            class="underline decoration-dotted underline-offset-4"
                            :aria-label="`${account.name}: cash entries in the period`"
                            @click="drill(account)"
                          >
                            {{ cashMoney(account.amount) }}
                          </button>
                        </td>
                        <td class="px-6 py-2 text-right tabular-nums">
                          <button
                            type="button"
                            class="underline decoration-dotted underline-offset-4"
                            :aria-label="`${account.name}: cash entries in the comparison period`"
                            @click="drill(account, true)"
                          >
                            {{ cashMoney(account.compare_amount) }}
                          </button>
                        </td>
                      </tr>
                    </template>
                  </template>
                  <tr
                    class="border-y border-neutral-200 bg-neutral-50 font-semibold dark:border-neutral-700 dark:bg-neutral-800/50"
                  >
                    <th scope="row" class="px-6 py-3 text-left [font-weight:inherit]">
                      {{ sectionTotalLabel[section.key] }}
                    </th>
                    <td class="px-6 py-3 text-right tabular-nums">
                      {{ cashMoney(section.total) }}
                    </td>
                    <td class="px-6 py-3 text-right tabular-nums">
                      {{ cashMoney(section.compare_total) }}
                    </td>
                  </tr>
                </template>
                <tr class="border-y-2 border-navy bg-blue-50 font-bold dark:bg-blue-950">
                  <th scope="row" class="px-6 py-3 text-left [font-weight:inherit]">
                    Net increase / (decrease) in cash
                  </th>
                  <td class="px-6 py-3 text-right tabular-nums">
                    {{ cashMoney(result.summary.net_change) }}
                  </td>
                  <td class="px-6 py-3 text-right tabular-nums">
                    {{ cashMoney(result.summary.compare_net_change) }}
                  </td>
                </tr>
                <tr class="font-bold">
                  <th scope="row" class="px-6 py-3 text-left [font-weight:inherit]">
                    Cash and cash equivalents at the end of the period
                  </th>
                  <td class="px-6 py-3 text-right tabular-nums">
                    {{ cashMoney(result.summary.closing_cash) }}
                  </td>
                  <td class="px-6 py-3 text-right tabular-nums">
                    {{ cashMoney(result.summary.compare_closing_cash) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Cash accounts -->
        <section :class="[cardClass, 'overflow-hidden']">
          <header class="border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
            <h2 class="font-semibold">Cash and bank accounts</h2>
            <p class="mt-1 text-xs text-neutral-500">
              What makes up cash and cash equivalents, at the start and end of the period.
            </p>
          </header>
          <div class="overflow-x-auto">
            <table class="w-full min-w-[560px] text-sm">
              <thead class="bg-neutral-50 text-xs text-neutral-500 dark:bg-neutral-800/50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left">Account</th>
                  <th scope="col" class="px-6 py-3 text-right">At {{ dayLabel(result.from) }}</th>
                  <th scope="col" class="px-6 py-3 text-right">At {{ dayLabel(result.to) }}</th>
                  <th scope="col" class="px-6 py-3 text-right">Change</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="a in result.cash_accounts"
                  :key="a.id"
                  class="border-b border-neutral-100 dark:border-neutral-800"
                >
                  <th scope="row" class="px-6 py-2.5 text-left font-normal">
                    <span class="mr-2 font-mono text-xs text-neutral-400">{{ a.code }}</span
                    >{{ a.name }}
                  </th>
                  <td class="px-6 py-2.5 text-right tabular-nums">{{ cashMoney(a.opening) }}</td>
                  <td class="px-6 py-2.5 text-right tabular-nums">{{ cashMoney(a.closing) }}</td>
                  <td class="px-6 py-2.5 text-right tabular-nums">{{ cashMoney(a.change) }}</td>
                </tr>
                <tr v-if="!result.cash_accounts.length">
                  <td colspan="4" class="px-6 py-6 text-center text-neutral-400">
                    No cash accounts with a balance.
                  </td>
                </tr>
                <tr class="bg-neutral-50 font-semibold dark:bg-neutral-800/50">
                  <th scope="row" class="px-6 py-3 text-left [font-weight:inherit]">Total</th>
                  <td class="px-6 py-3 text-right tabular-nums">
                    {{ cashMoney(result.summary.opening_cash) }}
                  </td>
                  <td class="px-6 py-3 text-right tabular-nums">
                    {{ cashMoney(result.summary.closing_cash) }}
                  </td>
                  <td class="px-6 py-3 text-right tabular-nums">
                    {{ cashMoney(result.summary.net_change) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <footer class="space-y-2 text-xs leading-relaxed text-neutral-500">
          <p>
            Amounts in parentheses are cash paid out. Account amounts open the cash entries behind
            them.
          </p>
          <p>{{ result.basis }}</p>
          <p>
            Reconciliation: opening cash + net cash flow − closing cash =
            {{
              isZero(result.diagnostics.difference)
                ? '0.00'
                : cashMoney(result.diagnostics.difference)
            }}
            · comparison
            {{
              isZero(result.diagnostics.compare_difference)
                ? '0.00'
                : cashMoney(result.diagnostics.compare_difference)
            }}.
          </p>
          <p>Generated {{ new Date(result.generated_at).toLocaleString() }}</p>
        </footer>
      </div>
    </template>

    <CashFlowLedgerDrawer
      v-model:open="drawerOpen"
      :account="drawerAccount"
      :from="drillFrom"
      :to="drillTo"
    />
  </div>
</template>
