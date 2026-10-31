<script setup lang="ts">
import { computed } from 'vue'
import { CircleAlert, CircleCheck, CircleDashed } from 'lucide-vue-next'
import type { DashboardPortfolio, PrudentialRatio } from '@/modules/reports/types'
import DashCard from './DashCard.vue'

const props = defineProps<{ ratios: PrudentialRatio[]; portfolio: DashboardPortfolio }>()

/** A portfolio benchmark, not a UMRA limit: the common microfinance target for loans over 30 days late. */
const PAR_TARGET = '5.00'

const rows = computed(() => {
  const par: PrudentialRatio = {
    key: 'par_30',
    label: 'Loans over 30 days late',
    value: props.portfolio.par_30,
    limit: PAR_TARGET,
    limit_type: 'maximum',
    within_limit: props.portfolio.par_30 === null ? null : Number(props.portfolio.par_30) <= Number(PAR_TARGET),
  }
  return [par, ...props.ratios].map((ratio) => {
    const value = Number(ratio.value ?? 0)
    const limit = Number(ratio.limit)
    const scale = Math.max(limit * 2, value)
    return { ...ratio, fill: (value / scale) * 100, tick: (limit / scale) * 100 }
  })
})

const statusText = (ratio: PrudentialRatio) => {
  if (ratio.within_limit === null) return 'No data yet'
  if (ratio.key === 'par_30') return ratio.within_limit ? 'Within target' : 'Above target'
  if (ratio.within_limit) return ratio.limit_type === 'minimum' ? 'Above minimum' : 'Within limit'
  return ratio.limit_type === 'minimum' ? 'Below minimum' : 'Over limit'
}
</script>

<template>
  <DashCard title="Financial health" lede="Against UMRA limits for Tier 4 SACCOs">
    <ul class="divide-y divide-border">
      <li v-for="ratio in rows" :key="ratio.key" class="px-3 py-2.5">
        <div class="flex items-baseline justify-between gap-2">
          <span class="text-sm">{{ ratio.label }}</span>
          <span class="text-base font-bold tabular-nums text-navy dark:text-white">{{ ratio.value === null ? '—' : `${Number(ratio.value).toFixed(1)}%` }}</span>
        </div>
        <div class="relative mt-1.5 h-1.5 rounded-full bg-muted" aria-hidden="true">
          <span class="absolute inset-y-0 left-0 rounded-full bg-navy dark:bg-white/70" :style="{ width: `${ratio.fill}%` }" />
          <span class="absolute -top-0.5 h-2.5 w-0.5 bg-foreground" :style="{ left: `${ratio.tick}%` }" />
        </div>
        <div class="mt-1 flex items-center justify-between gap-2 text-xs">
          <span class="inline-flex items-center gap-1" :class="ratio.within_limit === null ? 'text-muted-foreground' : ratio.within_limit ? 'text-success' : 'text-destructive'">
            <CircleDashed v-if="ratio.within_limit === null" class="size-3.5" aria-hidden="true" />
            <CircleCheck v-else-if="ratio.within_limit" class="size-3.5" aria-hidden="true" />
            <CircleAlert v-else class="size-3.5" aria-hidden="true" />
            {{ statusText(ratio) }}
          </span>
          <span class="text-muted-foreground">{{ ratio.key === 'par_30' ? 'Target' : ratio.limit_type === 'minimum' ? 'Minimum' : 'Maximum' }} {{ Number(ratio.limit) }}%</span>
        </div>
      </li>
    </ul>
  </DashCard>
</template>
