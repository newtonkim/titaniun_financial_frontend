<script setup lang="ts">
import { Scale, AlertTriangle, CheckCircle, Download } from 'lucide-vue-next'
import Spinner from '../components/ReportSpinner.vue'
import LedgerDrillDownDrawer from '../components/LedgerDrillDownDrawer.vue'
import { useTrialBalance } from '../composables/useTrialBalance'

const {
  mode, asOfDate, periodFrom, periodTo, hideZero, loading, result, exporting, error,
  accounts, totals, isBalanced, drFrom, drTo,
  drawerOpen, drawerAccount,
  generate, openDrillDown,
  exportCsv, exportExcel, exportPdf,
  fmt, fmtCell, typeColor,
} = useTrialBalance()
</script>

<template>
  <div class="tw-report flex flex-col gap-6">

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
          <Scale class="w-5 h-5 text-brand" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">Trial Balance</h1>
          <p class="text-sm text-neutral-500">Verify that total debits equal total credits across all accounts.</p>
        </div>
      </div>

      <!-- Export buttons — shown only when data is loaded -->
      <div v-if="result" class="flex items-center gap-2">
        <button
          @click="exportCsv"
          :disabled="exporting"
          class="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
        >
          <Download class="w-3.5 h-3.5" />
          CSV
        </button>
        <button
          @click="exportExcel"
          :disabled="exporting"
          class="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
        >
          <Download class="w-3.5 h-3.5" />
          Excel
        </button>
        <button
          @click="exportPdf"
          :disabled="exporting"
          class="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand/90 disabled:opacity-50 shadow-sm"
        >
          <Download class="w-3.5 h-3.5" />
          PDF
        </button>
      </div>
    </div>

    <!-- Controls -->
    <div class="flex flex-wrap items-end gap-4 rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <!-- Mode toggle -->
      <div class="flex p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg gap-1">
        <button
          v-for="m in [{ key: 'as_of_date', label: 'As of Date' }, { key: 'period', label: 'Period' }]"
          :key="m.key"
          @click="mode = m.key as any"
          :class="['px-4 py-1.5 text-xs font-bold rounded-md transition-all', mode === m.key ? 'bg-brand text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-600']"
        >{{ m.label }}</button>
      </div>

      <!-- As-of-date input -->
      <div v-if="mode === 'as_of_date'" class="flex flex-col gap-1">
        <label class="text-xs text-neutral-400">As at</label>
        <input v-model="asOfDate" type="date"
          class="rounded-lg border border-neutral-200 bg-white py-2 px-3 text-sm outline-none focus:border-brand dark:border-neutral-700 dark:bg-neutral-800 dark:text-white" />
      </div>

      <!-- Period inputs -->
      <template v-else>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-neutral-400">From</label>
          <input v-model="periodFrom" type="date"
            class="rounded-lg border border-neutral-200 bg-white py-2 px-3 text-sm outline-none focus:border-brand dark:border-neutral-700 dark:bg-neutral-800 dark:text-white" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-neutral-400">To</label>
          <input v-model="periodTo" type="date"
            class="rounded-lg border border-neutral-200 bg-white py-2 px-3 text-sm outline-none focus:border-brand dark:border-neutral-700 dark:bg-neutral-800 dark:text-white" />
        </div>
      </template>

      <button @click="generate"
        class="rounded-full bg-brand px-6 py-2 text-sm font-semibold text-white transition hover:bg-brand/90 shadow-sm">
        Generate
      </button>

      <!-- Hide zero-balance toggle -->
      <label class="ml-auto flex items-center gap-2 cursor-pointer select-none">
        <div @click="hideZero = !hideZero"
          :class="['relative w-9 h-5 rounded-full transition-colors', hideZero ? 'bg-brand' : 'bg-neutral-300 dark:bg-neutral-600']">
          <span :class="['absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform', hideZero ? 'translate-x-4' : '']" />
        </div>
        <span class="text-xs text-neutral-500 font-medium">Hide zero balances</span>
      </label>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <Spinner class="h-8 w-8 text-brand" />
    </div>

    <template v-if="result && !loading">
      <!-- Balance indicator -->
      <div :class="['flex items-center gap-3 rounded-2xl border p-4',
        isBalanced
          ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800'
          : 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800']">
        <CheckCircle v-if="isBalanced" class="w-5 h-5 text-emerald-600 flex-shrink-0" />
        <AlertTriangle v-else class="w-5 h-5 text-rose-600 flex-shrink-0" />
        <div>
          <p v-if="isBalanced" class="text-sm font-bold text-emerald-800 dark:text-emerald-300">
            Books are balanced — Total DR {{ fmt(totals.total_closing_debit) }} = Total CR {{ fmt(totals.total_closing_credit) }}
          </p>
          <p v-else class="text-sm font-bold text-rose-800 dark:text-rose-300">
            Out of balance by {{ fmt(Math.abs(totals.total_closing_debit - totals.total_closing_credit)) }} — investigate unposted transactions
          </p>
        </div>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
        <table class="w-full text-sm">
          <thead class="bg-neutral-50 dark:bg-neutral-800 text-xs font-bold uppercase tracking-wider text-neutral-500">
            <tr>
              <th class="px-4 py-3 text-left w-24">GL Code</th>
              <th class="px-4 py-3 text-left">Account Name</th>
              <th class="px-4 py-3 text-left w-24">Type</th>
              <template v-if="mode === 'period'">
                <th class="px-4 py-3 text-right">Opening DR</th>
                <th class="px-4 py-3 text-right">Opening CR</th>
                <th class="px-4 py-3 text-right">Period DR</th>
                <th class="px-4 py-3 text-right">Period CR</th>
              </template>
              <th class="px-4 py-3 text-right">Closing DR</th>
              <th class="px-4 py-3 text-right">Closing CR</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
            <template v-for="account in accounts" :key="account.id">
              <!-- Header accounts — section dividers -->
              <tr v-if="!account.is_postable" class="bg-neutral-50 dark:bg-neutral-800/60">
                <td class="px-4 py-2 font-black text-xs text-neutral-500">{{ account.code }}</td>
                <td :colspan="mode === 'period' ? 7 : 3" class="px-4 py-2 font-black text-xs text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  {{ account.name }}
                </td>
              </tr>
              <!-- Postable accounts -->
              <tr v-else class="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                <td class="px-4 py-2.5 font-mono text-xs text-neutral-400">{{ account.code }}</td>
                <td class="px-4 py-2.5 text-neutral-800 dark:text-neutral-200">
                  <span :class="typeColor(account.account_type)">{{ account.name }}</span>
                </td>
                <td class="px-4 py-2.5">
                  <span class="text-[10px] font-bold uppercase tracking-wide text-neutral-400">{{ account.account_subtype }}</span>
                </td>
                <template v-if="mode === 'period'">
                  <td class="px-4 py-2.5 text-right text-neutral-500 text-xs">{{ fmtCell(account.opening_debit) }}</td>
                  <td class="px-4 py-2.5 text-right text-neutral-500 text-xs">{{ fmtCell(account.opening_credit) }}</td>
                  <td @click="openDrillDown(account, 'debit')"
                    :class="['px-4 py-2.5 text-right text-xs', account.period_debit ? 'cursor-pointer font-bold text-blue-600 hover:text-blue-800 hover:underline' : 'text-neutral-400']">
                    {{ fmtCell(account.period_debit) }}
                  </td>
                  <td @click="openDrillDown(account, 'credit')"
                    :class="['px-4 py-2.5 text-right text-xs', account.period_credit ? 'cursor-pointer font-bold text-orange-600 hover:text-orange-800 hover:underline' : 'text-neutral-400']">
                    {{ fmtCell(account.period_credit) }}
                  </td>
                </template>
                <td @click="openDrillDown(account, 'debit')"
                  :class="['px-4 py-2.5 text-right font-semibold', account.closing_debit ? 'cursor-pointer text-blue-700 hover:text-blue-900 hover:underline' : 'text-neutral-300']">
                  {{ fmtCell(account.closing_debit) }}
                </td>
                <td @click="openDrillDown(account, 'credit')"
                  :class="['px-4 py-2.5 text-right font-semibold', account.closing_credit ? 'cursor-pointer text-orange-700 hover:text-orange-900 hover:underline' : 'text-neutral-300']">
                  {{ fmtCell(account.closing_credit) }}
                </td>
              </tr>
            </template>

            <!-- Totals row -->
            <tr v-if="totals" class="bg-brand/5 font-black text-sm border-t-2 border-brand/20">
              <td class="px-4 py-3" colspan="3">TOTAL</td>
              <template v-if="mode === 'period'">
                <td class="px-4 py-3 text-right">{{ fmt(totals.total_opening_debit) }}</td>
                <td class="px-4 py-3 text-right">{{ fmt(totals.total_opening_credit) }}</td>
                <td class="px-4 py-3 text-right">{{ fmt(totals.total_period_debit) }}</td>
                <td class="px-4 py-3 text-right">{{ fmt(totals.total_period_credit) }}</td>
              </template>
              <td class="px-4 py-3 text-right text-blue-700">{{ fmt(totals.total_closing_debit) }}</td>
              <td class="px-4 py-3 text-right text-orange-700">{{ fmt(totals.total_closing_credit) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Drill-down drawer -->
    <LedgerDrillDownDrawer v-model:open="drawerOpen" :account="drawerAccount" :from="drFrom" :to="drTo" />
  </div>
</template>
