<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronDown, ChevronRight, Download, RefreshCw } from 'lucide-vue-next'
import type { IncomeAccount } from '../api'
import LedgerDrillDownDrawer from '../components/LedgerDrillDownDrawer.vue'
import { useIncomeStatement } from '../composables/useIncomeStatement'
import { useIncomeStatementExport } from '../composables/useIncomeStatementExport'
import { formatStatementMoney as money } from '../utils/incomeStatementFormat'

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
} = useIncomeStatement()
const { exportReport, exporting, exportError } = useIncomeStatementExport(result)
const drawerOpen = ref(false)
const drawerAccount = ref<IncomeAccount | null>(null)
const drillFrom = ref('')
const drillTo = ref('')
const exportKind = ref<'csv' | 'excel' | 'pdf'>('pdf')
const rows = computed(
  () =>
    result.value?.rows.filter(
      (r) =>
        r.kind === 'subtotal' ||
        r.accounts.length ||
        r.amount !== '0.00' ||
        r.compare_amount !== '0.00',
    ) ?? [],
)
function drill(account: IncomeAccount, comparison = false) {
  if (!result.value) return
  drawerAccount.value = account
  drillFrom.value = comparison ? result.value.compare_from : result.value.from
  drillTo.value = comparison ? result.value.compare_to : result.value.to
  drawerOpen.value = true
}
watch(result, () => {
  drawerOpen.value = false
})
const inputClass =
  'rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white'
const buttonClass =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800'
</script>

<template>
  <div class="tw-scope flex flex-col gap-6 text-neutral-900 dark:text-neutral-100">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="mb-1 text-xs font-semibold uppercase tracking-widest text-neutral-500">
          Financial reports
        </p>
        <h1 class="text-2xl font-bold">Income Statement</h1>
        <p class="mt-1 text-sm text-neutral-500">
          Income, expenses and surplus for a selected period.
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

    <form
      class="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
      @submit.prevent="generate()"
    >
      <div class="mb-4 flex flex-wrap gap-2">
        <button type="button" :class="buttonClass" :disabled="loading" @click="generate(true)">
          Financial year to date
        </button>
        <button type="button" :class="buttonClass" @click="setPreset('month')">
          Month to date
        </button>
        <button type="button" :class="buttonClass" @click="setPreset('quarter')">
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
          >Comparison from<input v-model="compareFrom" type="date" required :class="inputClass"
        /></label>
        <label class="flex flex-col gap-1 text-xs font-medium"
          >Comparison to<input v-model="compareTo" type="date" required :class="inputClass"
        /></label>
      </div>
      <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label class="flex items-center gap-2 text-sm text-neutral-500"
          ><input v-model="hideZero" type="checkbox" />Hide accounts with no net movement in either
          period</label
        >
        <button
          type="submit"
          :disabled="loading"
          class="inline-flex items-center gap-2 rounded-lg bg-navy px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          <RefreshCw class="h-4 w-4" />{{ loading ? 'Generating…' : 'Generate statement' }}
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
      v-if="loading"
      role="status"
      aria-live="polite"
      class="rounded-2xl border border-neutral-200 p-12 text-center text-sm text-neutral-500"
    >
      Loading ledger movements…
    </div>

    <template v-if="result && !loading">
      <div
        v-if="!result.diagnostics.classification_complete"
        class="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100"
      >
        <p class="font-semibold">Account classification needs attention</p>
        <p class="mt-1">
          All movements are included in the final surplus. Intermediate subtotals cover classified
          accounts only.
        </p>
        <details class="mt-2">
          <summary class="cursor-pointer">
            View {{ result.diagnostics.issues.length }} account issues
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
      <p
        v-if="!result.diagnostics.has_movements"
        role="status"
        class="rounded-lg border border-neutral-200 p-4 text-sm text-neutral-500"
      >
        No posted income or expense movements were found in either period.
      </p>
      <section
        class="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
      >
        <header class="border-b border-neutral-200 px-6 py-6 dark:border-neutral-800">
          <p class="text-xs font-semibold uppercase tracking-widest text-neutral-500">
            {{ result.entity }}
          </p>
          <h2 class="mt-1 text-xl font-semibold">Statement of Surplus / (Deficit)</h2>
          <p class="mt-2 text-sm text-neutral-500">
            {{ result.from }} to {{ result.to }} · {{ result.currency }}
          </p>
          <p
            v-if="result.period_default === 'calendar_year' && !result.financial_year"
            class="mt-1 text-xs text-neutral-500"
          >
            No configured financial year covers the end date. Year-to-date defaults use the calendar
            year.
          </p>
          <div class="mt-4 flex gap-4 text-xs font-medium">
            <button
              type="button"
              class="underline underline-offset-4"
              @click="expanded = new Set(rows.map((r) => r.key))"
            >
              Expand accounts
            </button>
            <button
              type="button"
              class="underline underline-offset-4"
              @click="expanded = new Set()"
            >
              Collapse accounts
            </button>
          </div>
        </header>
        <p class="px-6 pt-3 text-xs text-neutral-500 sm:hidden">
          Scroll the table sideways to view both periods.
        </p>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[650px] text-sm">
            <caption class="sr-only">
              Income and expenses, current and comparative periods. Expenses reduce surplus.
            </caption>
            <thead class="bg-neutral-50 text-xs text-neutral-500 dark:bg-neutral-800/50">
              <tr>
                <th scope="col" class="px-6 py-4 text-left">Description</th>
                <th scope="col" class="px-6 py-4 text-right">
                  {{ result.from }}<br />to {{ result.to }}
                </th>
                <th scope="col" class="px-6 py-4 text-right">
                  {{ result.compare_from }}<br />to {{ result.compare_to }}
                </th>
              </tr>
            </thead>
            <tbody>
              <template v-for="row in rows" :key="row.key">
                <tr
                  :class="
                    row.key === 'surplus'
                      ? 'border-y-2 border-navy bg-blue-50 font-bold dark:bg-blue-950'
                      : row.kind === 'subtotal'
                        ? 'border-y border-neutral-200 bg-neutral-50 font-semibold dark:border-neutral-700 dark:bg-neutral-800/50'
                        : 'border-b border-neutral-100 dark:border-neutral-800'
                  "
                >
                  <th scope="row" class="px-6 py-3 text-left [font-weight:inherit]">
                    <button
                      v-if="row.accounts.length"
                      type="button"
                      class="flex items-center gap-2 text-left"
                      :aria-expanded="expanded.has(row.key)"
                      @click="toggle(row.key)"
                    >
                      <component
                        :is="expanded.has(row.key) ? ChevronDown : ChevronRight"
                        class="h-4 w-4 shrink-0"
                      />{{ row.label }}
                    </button>
                    <span v-else>{{ row.label }}</span>
                  </th>
                  <td class="px-6 py-3 text-right tabular-nums">{{ money(row.amount) }}</td>
                  <td class="px-6 py-3 text-right tabular-nums">{{ money(row.compare_amount) }}</td>
                </tr>
                <template v-if="expanded.has(row.key)">
                  <tr
                    v-for="account in row.accounts"
                    :key="account.id"
                    class="border-b border-neutral-100 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400"
                  >
                    <th scope="row" class="py-2 pl-12 pr-6 text-left font-normal">
                      <span class="mr-2 font-mono text-xs text-neutral-400">{{
                        account.code
                      }}</span
                      >{{ account.name }}
                    </th>
                    <td class="px-6 py-2 text-right tabular-nums">
                      <button
                        class="underline decoration-dotted underline-offset-4"
                        :aria-label="`${account.name}: current period ledger`"
                        @click="drill(account)"
                      >
                        {{ money(account.amount) }}
                      </button>
                    </td>
                    <td class="px-6 py-2 text-right tabular-nums">
                      <button
                        class="underline decoration-dotted underline-offset-4"
                        :aria-label="`${account.name}: comparison ledger`"
                        @click="drill(account, true)"
                      >
                        {{ money(account.compare_amount) }}
                      </button>
                    </td>
                  </tr>
                </template>
              </template>
            </tbody>
          </table>
        </div>
        <footer
          class="space-y-2 border-t border-neutral-200 px-6 py-4 text-xs leading-relaxed text-neutral-500 dark:border-neutral-800"
        >
          <p>
            Parentheses show deductions or losses. Account amounts open ledger detail for that
            column’s period.
          </p>
          <p>{{ result.basis }}</p>
          <p>
            Ledger reconciliation difference: {{ money(result.diagnostics.difference) }} ·
            Comparative: {{ money(result.diagnostics.compare_difference) }}.
          </p>
          <p>Generated {{ new Date(result.generated_at).toLocaleString() }}</p>
        </footer>
      </section>
    </template>
    <LedgerDrillDownDrawer
      v-model:open="drawerOpen"
      :account="drawerAccount"
      :from="drillFrom"
      :to="drillTo"
      source="income-statement"
    />
  </div>
</template>
