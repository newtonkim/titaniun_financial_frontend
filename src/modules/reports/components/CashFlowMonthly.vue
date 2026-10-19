<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CashFlowStatementMonth as CashFlowMonth } from '../api'
import { cashMoney, compactMoney, monthLabel } from '../utils/cashFlowFormat'

/**
 * Net cash flow per month: above the line when more came in than went out, below
 * when more went out. Hovering a month shows how each activity contributed and the
 * cash held at month end; the same figures are in the table below the chart.
 */
const props = defineProps<{ months: CashFlowMonth[] }>()

const W = 720
const H = 220
const pad = { top: 20, right: 12, bottom: 32, left: 64 }
const plotW = W - pad.left - pad.right
const plotH = H - pad.top - pad.bottom

const scale = computed(() => {
  const values = props.months.map((m) => Number(m.net))
  let min = Math.min(0, ...values)
  let max = Math.max(0, ...values)
  if (min === max) max = 1
  // Round the axis ends to a readable figure.
  const step = niceStep(Math.max(max, -min) / 2)
  max = Math.ceil(max / step) * step
  min = Math.floor(min / step) * step
  const y = (v: number) => pad.top + ((max - v) / (max - min)) * plotH
  return { y, min, max }
})

function niceStep(raw: number): number {
  const power = 10 ** Math.floor(Math.log10(raw || 1))
  const n = raw / power
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * power
}

const slot = computed(() => plotW / Math.max(1, props.months.length))
const barW = computed(() => Math.max(6, Math.min(40, slot.value - 4)))
const x = (i: number) => pad.left + slot.value * i + (slot.value - barW.value) / 2
// Label every month when there is room, otherwise every other one.
const labelEvery = computed(() => (props.months.length > 12 ? 2 : 1))

function bar(m: CashFlowMonth) {
  const v = Number(m.net)
  const zero = scale.value.y(0)
  const end = scale.value.y(v)
  return {
    y: Math.min(zero, end),
    h: Math.max(v === 0 ? 0 : 2, Math.abs(end - zero)),
    negative: v < 0,
  }
}

const hovered = ref<number | null>(null)
// Beside the hovered bar, on whichever side has more room, so it never covers it.
const tipStyle = computed(() => {
  if (hovered.value === null) return {}
  const pct = ((x(hovered.value) + barW.value / 2) / W) * 100
  const gap = ((barW.value / 2 + 8) / W) * 100
  return pct > 50 ? { right: `${100 - pct + gap}%` } : { left: `${pct + gap}%` }
})
const tip = computed(() => (hovered.value === null ? null : props.months[hovered.value]))
const showTable = ref(false)
</script>

<template>
  <figure class="cf-viz relative m-0">
    <!-- Keeps labels legible on phones: the chart scrolls sideways instead of shrinking. -->
    <div class="overflow-x-auto">
      <div class="relative min-w-[560px]">
        <svg
          :viewBox="`0 0 ${W} ${H}`"
          class="h-auto w-full"
          role="img"
          aria-label="Net cash flow by month"
        >
          <line
            :x1="pad.left"
            :x2="W - pad.right"
            :y1="scale.y(scale.max)"
            :y2="scale.y(scale.max)"
            class="cf-grid"
          />
          <line
            :x1="pad.left"
            :x2="W - pad.right"
            :y1="scale.y(0)"
            :y2="scale.y(0)"
            class="cf-zero"
          />
          <line
            v-if="scale.min < 0"
            :x1="pad.left"
            :x2="W - pad.right"
            :y1="scale.y(scale.min)"
            :y2="scale.y(scale.min)"
            class="cf-grid"
          />
          <text
            :x="pad.left - 8"
            :y="scale.y(scale.max)"
            dy="0.32em"
            text-anchor="end"
            class="cf-axis"
          >
            {{ compactMoney(scale.max) }}
          </text>
          <text :x="pad.left - 8" :y="scale.y(0)" dy="0.32em" text-anchor="end" class="cf-axis">
            0
          </text>
          <text
            v-if="scale.min < 0"
            :x="pad.left - 8"
            :y="scale.y(scale.min)"
            dy="0.32em"
            text-anchor="end"
            class="cf-axis"
          >
            {{ compactMoney(scale.min) }}
          </text>

          <g v-for="(m, i) in months" :key="m.month">
            <rect
              :x="x(i)"
              :y="bar(m).y"
              :width="barW"
              :height="bar(m).h"
              rx="3"
              :class="[
                bar(m).negative ? 'cf-out' : 'cf-in',
                { 'cf-dim': hovered !== null && hovered !== i },
              ]"
            />
            <text
              v-if="i % labelEvery === 0"
              :x="x(i) + barW / 2"
              :y="H - pad.bottom + 18"
              text-anchor="middle"
              class="cf-label"
            >
              {{ monthLabel(m.month).split(' ')[0] }}
            </text>
            <rect
              :x="pad.left + slot * i"
              :y="pad.top"
              :width="slot"
              :height="plotH"
              fill="transparent"
              tabindex="0"
              :aria-label="`${monthLabel(m.month)}: net ${cashMoney(m.net)}`"
              @mouseenter="hovered = i"
              @mouseleave="hovered = null"
              @focus="hovered = i"
              @blur="hovered = null"
            />
          </g>
        </svg>

        <div
          v-if="tip && hovered !== null"
          class="pointer-events-none absolute top-0 z-10 w-60 rounded-lg border border-neutral-200 bg-white p-3 text-xs shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
          :style="tipStyle"
        >
          <p class="font-semibold text-neutral-900 dark:text-white">{{ monthLabel(tip.month) }}</p>
          <dl class="mt-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 tabular-nums">
            <dt class="text-neutral-500">Operating</dt>
            <dd class="text-right">{{ cashMoney(tip.operating) }}</dd>
            <dt class="text-neutral-500">Investing</dt>
            <dd class="text-right">{{ cashMoney(tip.investing) }}</dd>
            <dt class="text-neutral-500">Financing</dt>
            <dd class="text-right">{{ cashMoney(tip.financing) }}</dd>
            <template v-if="Number(tip.other) !== 0">
              <dt class="text-neutral-500">Brought on</dt>
              <dd class="text-right">{{ cashMoney(tip.other) }}</dd>
            </template>
            <dt class="border-t border-neutral-200 pt-1 font-semibold dark:border-neutral-700">
              Net cash flow
            </dt>
            <dd
              class="border-t border-neutral-200 pt-1 text-right font-semibold dark:border-neutral-700"
            >
              {{ cashMoney(tip.net) }}
            </dd>
            <dt class="text-neutral-500">Cash at month end</dt>
            <dd class="text-right">{{ cashMoney(tip.closing_cash) }}</dd>
          </dl>
        </div>
      </div>
    </div>

    <div
      class="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-600 dark:text-neutral-300"
    >
      <ul class="flex flex-wrap gap-4">
        <li class="flex items-center gap-1.5">
          <span class="cf-key cf-in" />More came in than went out
        </li>
        <li class="flex items-center gap-1.5">
          <span class="cf-key cf-out" />More went out than came in
        </li>
      </ul>
      <button
        type="button"
        class="font-medium underline underline-offset-4"
        :aria-expanded="showTable"
        @click="showTable = !showTable"
      >
        {{ showTable ? 'Hide table' : 'Show as table' }}
      </button>
    </div>

    <div v-if="showTable" class="mt-3 overflow-x-auto">
      <table class="w-full min-w-[640px] text-xs">
        <caption class="sr-only">
          Cash flow by month
        </caption>
        <thead class="bg-neutral-50 text-neutral-500 dark:bg-neutral-800/50">
          <tr>
            <th scope="col" class="px-3 py-2 text-left">Month</th>
            <th scope="col" class="px-3 py-2 text-right">Operating</th>
            <th scope="col" class="px-3 py-2 text-right">Investing</th>
            <th scope="col" class="px-3 py-2 text-right">Financing</th>
            <th scope="col" class="px-3 py-2 text-right">Net cash flow</th>
            <th scope="col" class="px-3 py-2 text-right">Cash at month end</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="m in months"
            :key="m.month"
            class="border-b border-neutral-100 dark:border-neutral-800"
          >
            <th scope="row" class="px-3 py-2 text-left font-medium">{{ monthLabel(m.month) }}</th>
            <td class="px-3 py-2 text-right tabular-nums">{{ cashMoney(m.operating) }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ cashMoney(m.investing) }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ cashMoney(m.financing) }}</td>
            <td class="px-3 py-2 text-right font-semibold tabular-nums">{{ cashMoney(m.net) }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ cashMoney(m.closing_cash) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </figure>
</template>

<style scoped>
.cf-viz {
  --cf-in: #2a78d6;
  --cf-out: #e34948;
  --cf-grid: #e7e6e2;
  --cf-muted: #52514e;
}
:root[data-theme='dark'] .cf-viz {
  --cf-in: #3987e5;
  --cf-out: #e66767;
  --cf-grid: #2e2e2c;
  --cf-muted: #c3c2b7;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) .cf-viz {
    --cf-in: #3987e5;
    --cf-out: #e66767;
    --cf-grid: #2e2e2c;
    --cf-muted: #c3c2b7;
  }
}
.cf-in {
  fill: var(--cf-in);
  background: var(--cf-in);
}
.cf-out {
  fill: var(--cf-out);
  background: var(--cf-out);
}
.cf-dim {
  opacity: 0.35;
}
.cf-grid {
  stroke: var(--cf-grid);
}
.cf-zero {
  stroke: var(--cf-muted);
  stroke-opacity: 0.6;
}
.cf-axis {
  fill: var(--cf-muted);
  font-size: 11px;
}
.cf-label {
  fill: var(--cf-muted);
  font-size: 11px;
}
.cf-key {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
}
</style>
