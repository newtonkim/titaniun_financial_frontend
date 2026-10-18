<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { formatCompact, formatMoney, formatMonth } from '@/core/utils/format'
import type { CashFlowMonth } from '@/modules/reports/types'

const props = defineProps<{ months: CashFlowMonth[] }>()

/** Highlighted month; defaults to the latest one, follows hover and keyboard focus. */
const activeIndex = ref(props.months.length - 1)
watch(
  () => props.months,
  (months) => (activeIndex.value = months.length - 1),
)

const values = computed(() => props.months.map((month) => Number(month.inflow)))
const isEmpty = computed(() => values.value.every((value) => value === 0))

/** Round the axis up to a tidy figure (1, 2, 2.5 or 5 × 10ⁿ) split into five steps. */
const axisMax = computed(() => {
  const max = Math.max(...values.value, 0)
  if (max === 0) return 5
  const magnitude = 10 ** Math.floor(Math.log10(max))
  const step = [1, 2, 2.5, 5, 10].find((candidate) => candidate * magnitude >= max) ?? 10
  return step * magnitude
})
const ticks = computed(() => Array.from({ length: 6 }, (_, index) => (axisMax.value / 5) * (5 - index)))

const active = computed(() => props.months[activeIndex.value])
const tooltipCenter = computed(() => (activeIndex.value + 0.5) / props.months.length)
const tooltipLeft = computed(() => `${tooltipCenter.value * 100}%`)
/** Keep the tooltip inside the plot: anchor it left or right near the edges. */
const tooltipShift = computed(() => (tooltipCenter.value > 0.75 ? '-88%' : tooltipCenter.value < 0.25 ? '-12%' : '-50%'))
const activeHeight = computed(() => (values.value[activeIndex.value] ?? 0) / axisMax.value)

function height(value: number): string {
  return `${Math.max((value / axisMax.value) * 100, value > 0 ? 2 : 0)}%`
}
</script>

<template>
  <div class="chart">
    <p v-if="isEmpty" class="chart__empty">No money has moved in this period yet. Deposits, repayments and share purchases will appear here.</p>

    <div v-else class="chart__plot">
      <ol class="chart__axis" aria-hidden="true">
        <li v-for="tick in ticks" :key="tick">{{ formatCompact(tick) }}</li>
      </ol>

      <div class="chart__area" @mouseleave="activeIndex = months.length - 1">
        <div class="chart__grid" aria-hidden="true"><span v-for="tick in ticks" :key="tick" /></div>

        <div class="chart__bars" role="list" aria-label="Money in per month">
          <button
            v-for="(month, index) in months"
            :key="month.month"
            type="button"
            role="listitem"
            class="chart__column"
            :class="{ 'chart__column--active': index === activeIndex }"
            :aria-label="`${formatMonth(month.month, true)}: money in ${formatMoney(month.inflow)}, money out ${formatMoney(month.outflow)}`"
            @mouseenter="activeIndex = index"
            @focus="activeIndex = index"
          >
            <span class="chart__bar" :style="{ height: height(values[index] ?? 0) }" />
          </button>
        </div>

        <div
          v-if="active"
          class="chart__tooltip"
          :style="{ left: tooltipLeft, bottom: `calc(${Math.min(activeHeight, 0.72) * 100}% + 14px)`, transform: `translateX(${tooltipShift})` }"
          aria-hidden="true"
        >
          <p class="chart__tooltip-title">{{ formatMonth(active.month, true) }}</p>
          <dl>
            <div><dt>Money in</dt><dd>{{ formatMoney(active.inflow) }}</dd></div>
            <div><dt>Money out</dt><dd>{{ formatMoney(active.outflow) }}</dd></div>
            <div class="chart__tooltip-net"><dt>Net</dt><dd>{{ formatMoney(active.net) }}</dd></div>
          </dl>
        </div>
      </div>

      <ol class="chart__labels" aria-hidden="true">
        <li v-for="(month, index) in months" :key="month.month" :class="{ 'chart__label--active': index === activeIndex }">
          {{ formatMonth(month.month) }}
        </li>
      </ol>
    </div>

    <table class="visually-hidden">
      <caption>Cash flow by month</caption>
      <thead><tr><th>Month</th><th>Money in</th><th>Money out</th><th>Net</th></tr></thead>
      <tbody>
        <tr v-for="month in months" :key="month.month">
          <td>{{ formatMonth(month.month, true) }}</td>
          <td>{{ formatMoney(month.inflow) }}</td>
          <td>{{ formatMoney(month.outflow) }}</td>
          <td>{{ formatMoney(month.net) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.chart__plot {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-rows: 16rem auto;
  column-gap: 0.75rem;
}

.chart__axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  margin: -0.55em 0;
  padding: 0;
  list-style: none;
  font-size: 0.82rem;
  font-variant-numeric: tabular-nums;
  color: var(--muted);
  text-align: right;
}

.chart__area {
  position: relative;
}

.chart__grid {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
}

.chart__grid span {
  border-top: 1px dashed var(--border);
}

.chart__grid span:last-child {
  border-top-style: solid;
}

.chart__bars {
  position: absolute;
  inset: 0;
  display: grid;
  grid-auto-columns: minmax(0, 1fr);
  grid-auto-flow: column;
  gap: 2px;
}

.chart__column {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0 12%;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.chart__column:focus-visible {
  outline-offset: -2px;
  border-radius: 8px;
}

.chart__bar {
  width: 100%;
  max-width: 4.5rem;
  border-radius: 10px 10px 4px 4px;
  background: linear-gradient(180deg, #f1d3d4 0%, rgb(241 211 212 / 0.35) 100%);
  transition: background-color 200ms var(--ease-out), height 300ms var(--ease-out);
}

.chart__column--active .chart__bar {
  background: linear-gradient(180deg, var(--crimson) 0%, rgb(184 50 54 / 0.55) 70%, rgb(184 50 54 / 0.12) 100%);
  box-shadow: 0 -2px 0 0 #fff inset;
}

.chart__tooltip {
  position: absolute;
  z-index: 2;
  min-width: 13rem;
  padding: 0.8rem 0.95rem;
  border-radius: 12px;
  background: var(--ink-panel);
  color: #fff;
  box-shadow: 0 10px 24px rgb(0 0 0 / 0.22);
  pointer-events: none;
  transition: left 180ms var(--ease-out), bottom 180ms var(--ease-out), transform 180ms var(--ease-out);
}

.chart__tooltip-title {
  margin: 0 0 0.45rem;
  font-size: 0.85rem;
  color: #c9cad1;
}

.chart__tooltip dl {
  display: grid;
  gap: 0.3rem;
  margin: 0;
}

.chart__tooltip dl div {
  display: flex;
  justify-content: space-between;
  gap: 1.25rem;
  font-size: 0.9rem;
}

.chart__tooltip dt {
  color: #c9cad1;
  white-space: nowrap;
}

.chart__tooltip dd {
  margin: 0;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.chart__tooltip-net {
  margin-top: 0.2rem;
  padding-top: 0.35rem;
  border-top: 1px solid rgb(255 255 255 / 0.14);
}

.chart__labels {
  grid-column: 2;
  display: grid;
  grid-auto-columns: minmax(0, 1fr);
  grid-auto-flow: column;
  margin: 0.75rem 0 0;
  padding: 0;
  list-style: none;
  font-size: 0.88rem;
  color: var(--muted);
  text-align: center;
}

.chart__label--active {
  color: var(--text);
  font-weight: 600;
}

.chart__empty {
  display: grid;
  place-items: center;
  min-height: 16rem;
  margin: 0;
  padding: 2rem;
  border: 1px dashed var(--border);
  border-radius: 12px;
  color: var(--muted);
  text-align: center;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .chart__bar,
  .chart__tooltip {
    transition: none;
  }
}
</style>
