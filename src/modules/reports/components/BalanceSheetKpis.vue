<script setup lang="ts">
import { CheckCircle2, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-vue-next'
import type { BalanceSheetKpi } from '../composables/useBalanceSheet'
import { formatAccounting, formatShortDate } from '../utils/accountingFormat'

defineProps<{ kpis: BalanceSheetKpi[]; isBalanced: boolean; difference: number; compareTo?: string }>()
</script>

<template>
  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <div v-for="kpi in kpis" :key="kpi.key"
      class="rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400">{{ kpi.label }}</p>
      <p class="mt-2 text-xl font-bold tabular-nums text-neutral-900 dark:text-white">{{ formatAccounting(kpi.amount) }}</p>
      <p v-if="compareTo" class="mt-1 flex items-center gap-1 text-xs text-neutral-500">
        <template v-if="kpi.change !== null">
          <TrendingUp v-if="kpi.change >= 0" class="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <TrendingDown v-else class="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
          <span :class="kpi.change >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'" class="font-semibold tabular-nums">
            {{ Math.abs(kpi.change).toFixed(1) }}%
          </span>
        </template>
        <span v-else class="font-semibold">—</span>
        <span>vs {{ formatShortDate(compareTo) }}</span>
      </p>
    </div>

    <div :class="['rounded-2xl border p-4 shadow-sm',
      isBalanced
        ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20'
        : 'border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-900/20']">
      <p class="text-[11px] font-bold uppercase tracking-[0.12em]"
        :class="isBalanced ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'">Balance check</p>
      <p class="mt-2 flex items-center gap-2 text-xl font-bold"
        :class="isBalanced ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'">
        <CheckCircle2 v-if="isBalanced" class="h-5 w-5" />
        <AlertTriangle v-else class="h-5 w-5" />
        {{ isBalanced ? 'Balanced' : `Out by ${formatAccounting(Math.abs(difference))}` }}
      </p>
      <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Assets = Liabilities + Equity</p>
    </div>
  </div>
</template>
