<script setup lang="ts">
import { computed } from 'vue'
import { formatMoney } from '@/core/utils/format'
import type { DashboardPortfolio } from '@/modules/reports/types'
import DashCard from './DashCard.vue'

const props = defineProps<{ portfolio: DashboardPortfolio }>()

/** Older arrears read darker: one hue, light to dark, with current loans neutral. */
const SHADES: Record<string, string> = {
  current: 'var(--border)',
  days_1_30: 'color-mix(in srgb, var(--chart-out) 35%, var(--surface))',
  days_31_60: 'color-mix(in srgb, var(--chart-out) 60%, var(--surface))',
  days_61_90: 'color-mix(in srgb, var(--chart-out) 80%, var(--surface))',
  days_over_90: 'var(--chart-out)',
}

const empty = computed(() => Number(props.portfolio.portfolio) === 0)
</script>

<template>
  <DashCard title="Loan book by days overdue" :lede="`${formatMoney(portfolio.arrears)} in arrears on ${portfolio.overdue_loans} ${portfolio.overdue_loans === 1 ? 'loan' : 'loans'}`">
    <p v-if="empty" class="p-6 text-center text-sm text-muted-foreground">No active loans yet. Disbursed loans will be aged here.</p>
    <template v-else>
      <div class="flex h-3 gap-0.5 px-3 pt-3 box-content" role="img" :aria-label="`Portfolio at risk over 30 days is ${portfolio.par_30}%`">
        <template v-for="band in portfolio.aging" :key="band.key">
          <span v-if="Number(band.share) > 0" class="min-w-1 rounded-sm first:rounded-l last:rounded-r" :style="{ width: `${band.share}%`, background: SHADES[band.key] }" :title="`${band.label}: ${band.share}%`" />
        </template>
      </div>
      <table class="mt-2 w-full text-[0.8125rem] tabular-nums">
        <thead>
          <tr class="text-xs text-muted-foreground">
            <th class="px-3 py-1 text-left font-medium">Days overdue</th>
            <th class="px-3 py-1 text-right font-medium">Loans</th>
            <th class="px-3 py-1 text-right font-medium">Balance</th>
            <th class="px-3 py-1 text-right font-medium">Share</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="band in portfolio.aging" :key="band.key" class="border-t border-border">
            <td class="px-3 py-1.5">
              <span class="inline-flex items-center gap-2"><span class="size-2.5 rounded-sm" :style="{ background: SHADES[band.key] }" aria-hidden="true" />{{ band.label }}</span>
            </td>
            <td class="px-3 py-1.5 text-right">{{ band.loans }}</td>
            <td class="px-3 py-1.5 text-right font-medium">{{ formatMoney(band.balance) }}</td>
            <td class="px-3 py-1.5 text-right text-muted-foreground">{{ band.share === null ? '—' : `${Number(band.share).toFixed(1)}%` }}</td>
          </tr>
        </tbody>
      </table>
    </template>
  </DashCard>
</template>
