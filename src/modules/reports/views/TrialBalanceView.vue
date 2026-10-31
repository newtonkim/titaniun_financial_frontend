<script setup lang="ts">
import PageHeader from '@/core/components/PageHeader.vue'
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
  fmt, fmtCell,
} = useTrialBalance()
</script>

<template>
  <div class="tw-scope flex flex-col gap-4">

    <PageHeader title="Trial balance" description="Verify that total debits equal total credits across all accounts.">

      <!-- Export buttons — shown only when data is loaded -->
      <div v-if="result" class="flex items-center gap-2">
        <button
          @click="exportCsv"
          :disabled="exporting"
          class="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-50 dark:text-neutral-300"
        >
          <Download class="w-3.5 h-3.5" />
          CSV
        </button>
        <button
          @click="exportExcel"
          :disabled="exporting"
          class="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-50 dark:text-neutral-300"
        >
          <Download class="w-3.5 h-3.5" />
          Excel
        </button>
        <button
          @click="exportPdf"
          :disabled="exporting"
          class="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50 shadow-sm"
        >
          <Download class="w-3.5 h-3.5" />
          PDF
        </button>
      </div>
    </PageHeader>

    <!-- Controls -->
    <div class="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-background p-4">
      <!-- Mode toggle -->
      <div class="flex p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg gap-1">
        <button
          v-for="m in [{ key: 'as_of_date', label: 'As of Date' }, { key: 'period', label: 'Period' }]"
          :key="m.key"
          @click="mode = m.key as any"
          :class="['px-4 py-1.5 text-xs font-bold rounded-md transition-all', mode === m.key ? 'bg-brand text-white shadow-sm' : 'text-muted-foreground hover:text-neutral-600']"
        >{{ m.label }}</button>
      </div>

      <!-- As-of-date input -->
      <div v-if="mode === 'as_of_date'" class="flex flex-col gap-1">
        <label class="text-xs text-muted-foreground">As at</label>
        <input v-model="asOfDate" type="date"
          class="rounded-lg border border-border bg-background py-2 px-3 text-sm outline-none focus:border-brand dark:text-white" />
      </div>

      <!-- Period inputs -->
      <template v-else>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-muted-foreground">From</label>
          <input v-model="periodFrom" type="date"
            class="rounded-lg border border-border bg-background py-2 px-3 text-sm outline-none focus:border-brand dark:text-white" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-muted-foreground">To</label>
          <input v-model="periodTo" type="date"
            class="rounded-lg border border-border bg-background py-2 px-3 text-sm outline-none focus:border-brand dark:text-white" />
        </div>
      </template>

      <button @click="generate"
        class="rounded-md bg-brand px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-dark shadow-sm">
        Generate
      </button>

      <!-- Hide zero-balance toggle -->
      <label class="ml-auto flex items-center gap-2 cursor-pointer select-none">
        <div @click="hideZero = !hideZero"
          :class="['relative w-9 h-5 rounded-full transition-colors', hideZero ? 'bg-brand' : 'bg-neutral-300 dark:bg-neutral-600']">
          <span :class="['absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform', hideZero ? 'translate-x-4' : '']" />
        </div>
        <span class="text-xs text-muted-foreground font-medium">Hide zero balances</span>
      </label>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <Spinner class="h-8 w-8 text-brand" />
    </div>

    <template v-if="result && !loading">
      <!-- Balance indicator -->
      <div :class="['flex items-center gap-3 rounded-lg border p-4',
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
      <div class="overflow-x-auto rounded-lg border border-border bg-background">
        <table class="w-full text-sm tabular-nums">
          <thead class="bg-muted text-xs font-medium text-muted-foreground">
            <tr>
              <th class="px-3 py-3 text-left w-24">GL Code</th>
              <th class="px-3 py-3 text-left">Account Name</th>
              <th class="px-3 py-3 text-left w-24">Type</th>
              <template v-if="mode === 'period'">
                <th class="px-3 py-3 text-right">Opening DR</th>
                <th class="px-3 py-3 text-right">Opening CR</th>
                <th class="px-3 py-3 text-right">Period DR</th>
                <th class="px-3 py-3 text-right">Period CR</th>
              </template>
              <th class="px-3 py-3 text-right">Closing DR</th>
              <th class="px-3 py-3 text-right">Closing CR</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
            <template v-for="account in accounts" :key="account.id">
              <!-- Header accounts — section dividers -->
              <tr v-if="!account.is_postable" class="bg-muted/50">
                <td class="px-3 py-3 font-semibold text-navy dark:text-white">{{ account.code }}</td>
                <td :colspan="mode === 'period' ? 8 : 4" class="px-3 py-3 font-semibold text-navy dark:text-white">
                  {{ account.name }}
                </td>
              </tr>
              <!-- Postable accounts -->
              <tr v-else class="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                <td class="px-3 py-3 text-muted-foreground">{{ account.code }}</td>
                <td class="px-3 py-3">{{ account.name }}</td>
                <td class="px-3 py-3">
                  <span class="text-muted-foreground">{{ account.account_subtype }}</span>
                </td>
                <template v-if="mode === 'period'">
                  <td class="px-3 py-3 text-right text-muted-foreground">{{ fmtCell(account.opening_debit) }}</td>
                  <td class="px-3 py-3 text-right text-muted-foreground">{{ fmtCell(account.opening_credit) }}</td>
                  <td @click="openDrillDown(account, 'debit')"
                    :class="['px-3 py-3 text-right', account.period_debit ? 'cursor-pointer font-medium underline-offset-2 hover:underline' : 'text-muted-foreground']">
                    {{ fmtCell(account.period_debit) }}
                  </td>
                  <td @click="openDrillDown(account, 'credit')"
                    :class="['px-3 py-3 text-right', account.period_credit ? 'cursor-pointer font-medium underline-offset-2 hover:underline' : 'text-muted-foreground']">
                    {{ fmtCell(account.period_credit) }}
                  </td>
                </template>
                <td @click="openDrillDown(account, 'debit')"
                  :class="['px-3 py-3 text-right font-semibold', account.closing_debit ? 'cursor-pointer underline-offset-2 hover:underline' : 'text-muted-foreground']">
                  {{ fmtCell(account.closing_debit) }}
                </td>
                <td @click="openDrillDown(account, 'credit')"
                  :class="['px-3 py-3 text-right font-semibold', account.closing_credit ? 'cursor-pointer underline-offset-2 hover:underline' : 'text-muted-foreground']">
                  {{ fmtCell(account.closing_credit) }}
                </td>
              </tr>
            </template>

            <!-- Totals row -->
            <tr v-if="totals" class="bg-muted font-bold text-navy dark:text-white">
              <td class="px-3 py-3" colspan="3">Total</td>
              <template v-if="mode === 'period'">
                <td class="px-3 py-3 text-right">{{ fmt(totals.total_opening_debit) }}</td>
                <td class="px-3 py-3 text-right">{{ fmt(totals.total_opening_credit) }}</td>
                <td class="px-3 py-3 text-right">{{ fmt(totals.total_period_debit) }}</td>
                <td class="px-3 py-3 text-right">{{ fmt(totals.total_period_credit) }}</td>
              </template>
              <td class="px-3 py-3 text-right">{{ fmt(totals.total_closing_debit) }}</td>
              <td class="px-3 py-3 text-right">{{ fmt(totals.total_closing_credit) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Drill-down drawer -->
    <LedgerDrillDownDrawer v-model:open="drawerOpen" :account="drawerAccount" :from="drFrom" :to="drTo" />
  </div>
</template>
