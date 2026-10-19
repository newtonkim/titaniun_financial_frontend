<script setup lang="ts">
import { ref } from 'vue'
import { Landmark, Download, AlertTriangle, ChevronsDownUp, ChevronsUpDown, RotateCw } from 'lucide-vue-next'
import type { BalanceSheetLine } from '../api'
import { useBalanceSheet } from '../composables/useBalanceSheet'
import { useBalanceSheetExport } from '../composables/useBalanceSheetExport'
import { formatAccounting, formatLongDate, formatShortDate } from '../utils/accountingFormat'
import BalanceSheetRow from '../components/BalanceSheetRow.vue'
import BalanceSheetKpis from '../components/BalanceSheetKpis.vue'
import LedgerDrillDownDrawer, { type DrillAccount } from '../components/LedgerDrillDownDrawer.vue'

const {
  asAt, mode, firstFrom, firstTo, secondFrom, secondTo, selection, showComparison, hideZero, loading, error, result,
  rows, totals, isBalanced, kpis, drillRange,
  generate, toggle, expandAll, collapseAll,
} = useBalanceSheet()

const { exporting, exportCsv, exportExcel, exportPdf } = useBalanceSheetExport(result, rows, selection)

const drawerOpen    = ref(false)
const drawerAccount = ref<DrillAccount | null>(null)

function openDrill(line: BalanceSheetLine) {
  if (line.id === null) return
  drawerAccount.value = { id: line.id, code: line.code, name: line.name }
  drawerOpen.value    = true
}

const inputClass = 'rounded-lg border border-neutral-200 bg-white py-2 px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white'
const ghostBtn   = 'flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
</script>

<template>
  <div class="tw-scope flex flex-col gap-6">

    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
          <Landmark class="h-5 w-5 text-brand" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">Balance Sheet</h1>
          <p class="text-sm text-neutral-500">Statement of Financial Position.</p>
        </div>
      </div>

      <div v-if="result" class="flex items-center gap-2">
        <button type="button" :class="ghostBtn" :disabled="exporting" @click="exportCsv"><Download class="h-3.5 w-3.5" />CSV</button>
        <button type="button" :class="ghostBtn" :disabled="exporting" @click="exportExcel"><Download class="h-3.5 w-3.5" />Excel</button>
        <button type="button" :disabled="exporting" @click="exportPdf"
          class="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand/90 disabled:opacity-50">
          <Download class="h-3.5 w-3.5" />PDF
        </button>
      </div>
    </div>

    <!-- Controls -->
    <form class="flex flex-wrap items-end gap-4 rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
      @submit.prevent="generate">
      <label class="flex flex-col gap-1">
        <span class="text-xs text-neutral-500">Report mode</span>
        <select v-model="mode" :class="inputClass">
          <option value="as-at">As-at report</option>
          <option value="compare">Compare periods</option>
        </select>
      </label>
      <label v-if="mode === 'as-at'" class="flex flex-col gap-1">
        <span class="text-xs text-neutral-500">As at</span>
        <input v-model="asAt" type="date" required :class="inputClass" />
      </label>
      <template v-else>
        <fieldset class="flex flex-wrap gap-3">
          <legend class="mb-1 text-sm font-semibold">Period 1</legend>
          <label class="flex flex-col gap-1"><span class="text-xs text-neutral-500">From</span>
            <input v-model="firstFrom" type="date" required :max="firstTo" :class="inputClass" /></label>
          <label class="flex flex-col gap-1"><span class="text-xs text-neutral-500">To</span>
            <input v-model="firstTo" type="date" required :min="firstFrom" :class="inputClass" /></label>
        </fieldset>
        <fieldset class="flex flex-wrap gap-3">
          <legend class="mb-1 text-sm font-semibold">Period 2</legend>
          <label class="flex flex-col gap-1"><span class="text-xs text-neutral-500">From</span>
            <input v-model="secondFrom" type="date" required :max="secondTo" :class="inputClass" /></label>
          <label class="flex flex-col gap-1"><span class="text-xs text-neutral-500">To</span>
            <input v-model="secondTo" type="date" required :min="secondFrom" :class="inputClass" /></label>
        </fieldset>
        <p class="w-full text-xs text-neutral-500">Closing balances include all postings up to each period end. Difference = Period 1 closing balance − Period 2 closing balance.</p>
      </template>
      <button type="submit" :disabled="loading"
        class="rounded-full bg-brand px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand/90 disabled:opacity-60">
        Generate
      </button>

      <div class="ml-auto flex flex-wrap items-center gap-4">
        <div v-if="result" class="flex items-center gap-1">
          <button type="button" :class="ghostBtn" @click="expandAll"><ChevronsUpDown class="h-3.5 w-3.5" />Expand all</button>
          <button type="button" :class="ghostBtn" @click="collapseAll"><ChevronsDownUp class="h-3.5 w-3.5" />Collapse all</button>
        </div>
        <label class="flex cursor-pointer select-none items-center gap-2">
          <button type="button" role="switch" aria-label="Hide zero balances" :disabled="loading" :aria-checked="hideZero" @click="hideZero = !hideZero; generate()"
            :class="['relative h-5 w-9 rounded-full transition-colors', hideZero ? 'bg-brand' : 'bg-neutral-300 dark:bg-neutral-600']">
            <span :class="['absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform', hideZero ? 'translate-x-4' : '']" />
          </button>
          <span class="text-xs font-medium text-neutral-500">Hide zero balances</span>
        </label>
      </div>
    </form>

    <!-- Error -->
    <div v-if="error && !loading"
      class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-800 dark:bg-rose-900/20">
      <p class="flex items-center gap-2 text-sm font-semibold text-rose-800 dark:text-rose-300">
        <AlertTriangle class="h-4 w-4" />{{ error }}
      </p>
      <button type="button" :class="ghostBtn" @click="generate"><RotateCw class="h-3.5 w-3.5" />Retry</button>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900" aria-busy="true">
      <div class="mx-auto mb-8 h-4 w-64 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
      <div v-for="i in 10" :key="i" class="flex items-center justify-between py-2.5">
        <div class="h-3 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" :style="{ width: `${30 + (i * 7) % 35}%`, marginLeft: `${(i % 3) * 1.25}rem` }" />
        <div class="h-3 w-24 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
      </div>
    </div>

    <template v-if="result && totals && !loading">
      <BalanceSheetKpis :kpis="kpis" :is-balanced="isBalanced" :difference="totals.current.difference" :compare-to="showComparison ? result.compare_to : undefined" />

      <!-- Out-of-balance banner -->
      <div v-if="!isBalanced"
        class="flex flex-wrap items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-800 dark:bg-rose-900/20">
        <AlertTriangle class="h-5 w-5 flex-shrink-0 text-rose-600" />
        <p class="text-sm font-semibold text-rose-800 dark:text-rose-300">
          Assets differ from Liabilities + Equity by {{ formatAccounting(Math.abs(totals.current.difference)) }}.
        </p>
        <RouterLink :to="{ name: 'reports.trial-balance' }" class="text-sm font-bold text-rose-700 underline underline-offset-4 dark:text-rose-300">
          Check the Trial Balance
        </RouterLink>
      </div>

      <!-- Statement -->
      <section class="overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <header class="border-b border-neutral-100 px-6 py-6 text-center dark:border-neutral-800">
          <p class="text-xs font-bold uppercase tracking-[0.2em] text-neutral-400">{{ result.entity }}</p>
          <h2 class="mt-1 text-lg font-bold text-neutral-900 dark:text-white">Statement of Financial Position</h2>
          <p v-if="!showComparison" class="text-sm text-neutral-500">As at {{ formatLongDate(result.as_at) }}</p>
          <p v-else-if="selection" class="text-sm text-neutral-500">
            Period 1: {{ formatShortDate(selection.firstFrom) }} – {{ formatShortDate(selection.firstTo) }}<br />
            Period 2: {{ formatShortDate(selection.secondFrom) }} – {{ formatShortDate(selection.secondTo) }}<br />
            Closing balances · Difference = Period 1 − Period 2
          </p>
        </header>

        <div class="overflow-x-auto px-2 pb-4">
          <table class="w-full min-w-[640px] border-collapse">
            <thead>
              <tr class="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                <th class="px-4 pt-4 pb-2 text-left font-bold">Account</th>
                <th class="px-4 pt-4 pb-2 text-right font-bold text-neutral-700 dark:text-neutral-200">{{ showComparison ? 'Period 1 closing · ' : '' }}{{ formatShortDate(result.as_at) }}</th>
                <th v-if="showComparison" class="px-4 pt-4 pb-2 text-right font-bold">Period 2 closing · {{ formatShortDate(result.compare_to) }}</th>
                <th v-if="showComparison" class="px-4 pt-4 pb-2 text-right font-bold">Difference (1 − 2)</th>
              </tr>
            </thead>
            <tbody>
              <BalanceSheetRow v-for="row in rows" :key="row.key" :row="row" :show-comparison="showComparison" @toggle="toggle" @drill="openDrill" />
            </tbody>
          </table>
        </div>

        <footer class="flex flex-wrap justify-between gap-2 border-t border-neutral-100 px-6 py-3 text-xs text-neutral-400 dark:border-neutral-800">
          <span>Amounts in brackets are negative (contra accounts). Click an account amount to see its ledger.</span>
          <span>Generated {{ new Date(result.generated_at).toLocaleString() }}</span>
        </footer>
      </section>
    </template>

    <LedgerDrillDownDrawer
      v-if="drillRange"
      v-model:open="drawerOpen"
      :account="drawerAccount"
      :from="drillRange.from"
      :to="drillRange.to"
    />
  </div>
</template>
