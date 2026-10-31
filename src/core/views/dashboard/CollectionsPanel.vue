<script setup lang="ts">
import { computed } from 'vue'
import { formatMoney } from '@/core/utils/format'
import type { DashboardSummary } from '@/modules/reports/types'
import DashCard from './DashCard.vue'

const props = defineProps<{ collections: DashboardSummary['collections'] }>()

const rate = computed(() => Math.min(Number(props.collections.month.rate ?? 0), 100))
const loans = (count: number) => `${count} ${count === 1 ? 'loan' : 'loans'}`
</script>

<template>
  <DashCard title="Collections" lede="This month so far">
    <div class="px-3 py-3">
      <div class="flex items-baseline justify-between gap-3">
        <span class="text-2xl font-bold tabular-nums text-navy dark:text-white">{{ collections.month.rate === null ? '—' : `${Number(collections.month.rate).toFixed(1)}%` }}</span>
        <span class="text-right text-xs text-muted-foreground">{{ collections.month.rate === null ? 'Nothing has fallen due yet' : 'of what fell due was paid' }}</span>
      </div>
      <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <span class="block h-full rounded-full bg-navy dark:bg-white/70" :style="{ width: `${rate}%` }" />
      </div>
    </div>
    <dl class="divide-y divide-border border-t border-border text-[0.8125rem] tabular-nums">
      <div class="flex justify-between gap-3 px-3 py-1.5"><dt class="text-muted-foreground">Fell due</dt><dd class="font-medium">{{ formatMoney(collections.month.due) }}</dd></div>
      <div class="flex justify-between gap-3 px-3 py-1.5"><dt class="text-muted-foreground">Collected</dt><dd class="font-medium">{{ formatMoney(collections.month.collected) }}</dd></div>
      <div class="flex justify-between gap-3 px-3 py-1.5"><dt class="text-muted-foreground">Still due today ({{ loans(collections.today.loans) }})</dt><dd class="font-medium">{{ formatMoney(collections.today.due) }}</dd></div>
      <div class="flex justify-between gap-3 px-3 py-1.5"><dt class="text-muted-foreground">Due in next 7 days ({{ loans(collections.next_7_days.loans) }})</dt><dd class="font-medium">{{ formatMoney(collections.next_7_days.due) }}</dd></div>
    </dl>
  </DashCard>
</template>
