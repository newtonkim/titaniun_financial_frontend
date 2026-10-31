<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { formatCompact, formatMoney, formatMonth } from '@/core/utils/format'
import type { CashFlowMonth } from '@/modules/reports/types'

const props = defineProps<{ months: CashFlowMonth[] }>()

/** The month under the pointer or keyboard focus; the tooltip shows only for that month. */
const activeIndex = ref<number | null>(null)
watch(
  () => props.months,
  () => (activeIndex.value = null),
)

const peak = computed(() => Math.max(...props.months.flatMap((month) => [Number(month.inflow), Number(month.outflow)]), 0))
const isEmpty = computed(() => peak.value === 0)

/** Round the axis up to a tidy figure (1, 2, 2.5 or 5 × 10ⁿ) split into four steps. */
const axisMax = computed(() => {
  if (peak.value === 0) return 4
  const magnitude = 10 ** Math.floor(Math.log10(peak.value))
  return ([1, 2, 2.5, 5, 10].find((candidate) => candidate * magnitude >= peak.value) ?? 10) * magnitude
})
const ticks = computed(() => Array.from({ length: 5 }, (_, index) => (axisMax.value / 4) * (4 - index)))

const active = computed(() => (activeIndex.value === null ? undefined : props.months[activeIndex.value]))
const tooltipCenter = computed(() => ((activeIndex.value ?? 0) + 0.5) / props.months.length)
/** Keep the tooltip inside the plot: anchor it left or right near the edges. */
const tooltipShift = computed(() => (tooltipCenter.value > 0.75 ? '-92%' : tooltipCenter.value < 0.25 ? '-8%' : '-50%'))

function height(value: string): string {
  const amount = Number(value)
  return `${amount > 0 ? Math.max((amount / axisMax.value) * 100, 1.5) : 0}%`
}
</script>

<template>
  <div class="px-3 pt-2 pb-2">
    <p v-if="isEmpty" class="py-16 text-center text-sm text-muted-foreground">No money has moved in this period yet. Deposits, repayments and share purchases will appear here.</p>

    <template v-else>
      <div class="mb-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span class="inline-flex items-center gap-1.5"><span class="size-2.5 rounded-sm bg-chart-in" aria-hidden="true" />Money in</span>
        <span class="inline-flex items-center gap-1.5"><span class="size-2.5 rounded-sm bg-chart-out" aria-hidden="true" />Money out</span>
      </div>

      <div class="grid grid-cols-[auto_minmax(0,1fr)] grid-rows-[15rem_auto] gap-x-2">
        <ol class="flex list-none flex-col justify-between text-right text-xs tabular-nums text-muted-foreground -my-[0.5em]" aria-hidden="true">
          <li v-for="tick in ticks" :key="tick">{{ formatCompact(tick) }}</li>
        </ol>

        <div class="relative" @mouseleave="activeIndex = null">
          <div class="absolute inset-0 flex flex-col justify-between" aria-hidden="true">
            <span v-for="tick in ticks" :key="tick" class="h-px bg-border" />
          </div>

          <div class="absolute inset-0 flex" role="list" aria-label="Money in and out per month">
            <button
              v-for="(month, index) in months"
              :key="month.month"
              type="button"
              role="listitem"
              class="flex h-full min-w-0 flex-1 cursor-default items-end justify-center gap-0.5 rounded-sm transition-colors"
              :class="{ 'bg-muted/60': index === activeIndex }"
              :aria-label="`${formatMonth(month.month, true)}: money in ${formatMoney(month.inflow)}, money out ${formatMoney(month.outflow)}`"
              @mouseenter="activeIndex = index"
              @focus="activeIndex = index"
              @blur="activeIndex = null"
            >
              <span class="block w-[34%] max-w-9 rounded-t bg-chart-in" :style="{ height: height(month.inflow) }" />
              <span class="block w-[34%] max-w-9 rounded-t bg-chart-out" :style="{ height: height(month.outflow) }" />
            </button>
          </div>

          <div
            v-if="active"
            class="pointer-events-none absolute top-1 z-10 w-56 rounded-md border border-border bg-popover px-2.5 py-2 text-xs tabular-nums shadow-md"
            :style="{ left: `${tooltipCenter * 100}%`, transform: `translateX(${tooltipShift})` }"
            aria-hidden="true"
          >
            <p class="mb-1 font-semibold">{{ formatMonth(active.month, true) }}</p>
            <dl class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5">
              <dt class="inline-flex items-center gap-1.5 whitespace-nowrap text-muted-foreground"><span class="size-2 rounded-sm bg-chart-in" />Money in</dt><dd class="text-right font-medium">{{ formatMoney(active.inflow) }}</dd>
              <dt class="inline-flex items-center gap-1.5 whitespace-nowrap text-muted-foreground"><span class="size-2 rounded-sm bg-chart-out" />Money out</dt><dd class="text-right font-medium">{{ formatMoney(active.outflow) }}</dd>
              <dt class="border-t border-border pt-0.5 text-muted-foreground">Net</dt><dd class="border-t border-border pt-0.5 text-right font-semibold">{{ formatMoney(active.net) }}</dd>
            </dl>
          </div>
        </div>

        <span />
        <div class="mt-1 flex text-xs text-muted-foreground" aria-hidden="true">
          <span v-for="(month, index) in months" :key="month.month" class="min-w-0 flex-1 truncate text-center" :class="{ 'font-semibold text-foreground': index === activeIndex }">{{ formatMonth(month.month) }}</span>
        </div>
      </div>
    </template>
  </div>
</template>
