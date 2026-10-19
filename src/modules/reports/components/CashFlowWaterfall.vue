<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CashFlowResponse } from '../api'
import { cashMoney, compactMoney } from '../utils/cashFlowFormat'

/**
 * Opening cash, each activity's net cash flow, and closing cash, as a waterfall.
 * Balances stand on the zero line; flows float from the running balance, blue for
 * money in and red for money out. Every bar is labelled, so colour never carries
 * meaning on its own.
 */
const props = defineProps<{ report: CashFlowResponse }>()

type Bar = {
  key: string
  label: string
  amount: string
  kind: 'balance' | 'in' | 'out'
  start: number
  end: number
  note: string
}

const bars = computed<Bar[]>(() => {
  const s = props.report.summary
  const out: Bar[] = []
  const opening = Number(s.opening_cash)
  out.push({
    key: 'opening',
    label: 'Opening cash',
    amount: s.opening_cash,
    kind: 'balance',
    start: 0,
    end: opening,
    note: `Cash at the start of ${props.report.from}`,
  })
  let running = opening
  const steps: [string, string, string][] = [
    ['operating', 'Operating', 'Loans, savings, interest, fees and running costs'],
    ['investing', 'Investing', 'Property, equipment and investments'],
    ['financing', 'Financing', 'Share capital, borrowings and dividends'],
  ]
  if (Number(s.other) !== 0)
    steps.push(['other', 'Brought on', 'Opening balances set up on the system'])
  for (const [key, label, note] of steps) {
    const amount = s[key as 'operating' | 'investing' | 'financing' | 'other']
    const value = Number(amount)
    out.push({
      key,
      label,
      amount,
      kind: value < 0 ? 'out' : 'in',
      start: running,
      end: running + value,
      note,
    })
    running += value
  }
  out.push({
    key: 'closing',
    label: 'Closing cash',
    amount: s.closing_cash,
    kind: 'balance',
    start: 0,
    end: Number(s.closing_cash),
    note: `Cash at the end of ${props.report.to}`,
  })
  return out
})

// Geometry in viewBox units; the SVG scales to its container.
const W = 720
const H = 280
const pad = { top: 28, right: 12, bottom: 44, left: 64 }
const plotW = W - pad.left - pad.right
const plotH = H - pad.top - pad.bottom

const scale = computed(() => {
  const values = bars.value.flatMap((b) => [b.start, b.end])
  let min = Math.min(0, ...values)
  let max = Math.max(0, ...values)
  if (min === max) max = 1
  const span = max - min
  min -= min < 0 ? span * 0.08 : 0
  max += span * 0.08
  const y = (v: number) => pad.top + ((max - v) / (max - min)) * plotH
  const step = niceStep((max - min) / 4)
  const ticks: number[] = []
  for (let t = Math.ceil(min / step) * step; t <= max; t += step) ticks.push(t)
  return { y, ticks }
})

function niceStep(raw: number): number {
  const power = 10 ** Math.floor(Math.log10(raw || 1))
  const n = raw / power
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * power
}

const slot = computed(() => plotW / bars.value.length)
const barW = computed(() => Math.min(72, slot.value * 0.56))
const x = (i: number) => pad.left + slot.value * i + (slot.value - barW.value) / 2

function rect(b: Bar) {
  const y1 = scale.value.y(Math.max(b.start, b.end))
  const y2 = scale.value.y(Math.min(b.start, b.end))
  return { y: y1, h: Math.max(2, y2 - y1) }
}

const hovered = ref<number | null>(null)
// Beside the hovered bar, on whichever side has more room, so it never covers it.
const tipStyle = computed(() => {
  if (hovered.value === null) return {}
  const pct = ((x(hovered.value) + barW.value / 2) / W) * 100
  const gap = ((barW.value / 2 + 8) / W) * 100
  return pct > 50 ? { right: `${100 - pct + gap}%` } : { left: `${pct + gap}%` }
})
const tip = computed(() => (hovered.value === null ? null : bars.value[hovered.value]))
</script>

<template>
  <figure class="cf-viz relative m-0">
    <figcaption class="sr-only">
      Waterfall of cash: opening cash, net cash from operating, investing and financing activities,
      and closing cash.
    </figcaption>
    <!-- Keeps labels legible on phones: the chart scrolls sideways instead of shrinking. -->
    <div class="overflow-x-auto">
      <div class="relative min-w-[560px]">
        <svg
          :viewBox="`0 0 ${W} ${H}`"
          class="h-auto w-full"
          role="img"
          aria-label="Cash flow waterfall"
        >
          <!-- Grid and axis: recessive -->
          <g>
            <template v-for="t in scale.ticks" :key="t">
              <line
                :x1="pad.left"
                :x2="W - pad.right"
                :y1="scale.y(t)"
                :y2="scale.y(t)"
                class="cf-grid"
                :class="{ 'cf-zero': t === 0 }"
              />
              <text :x="pad.left - 8" :y="scale.y(t)" dy="0.32em" text-anchor="end" class="cf-axis">
                {{ compactMoney(t) }}
              </text>
            </template>
          </g>

          <!-- Connectors from each bar's end to the next bar's start -->
          <template v-for="(b, i) in bars" :key="`c-${b.key}`">
            <line
              v-if="i < bars.length - 1"
              :x1="x(i) + barW"
              :x2="x(i + 1)"
              :y1="scale.y(b.end)"
              :y2="scale.y(b.end)"
              class="cf-connector"
            />
          </template>

          <g v-for="(b, i) in bars" :key="b.key">
            <rect
              :x="x(i)"
              :y="rect(b).y"
              :width="barW"
              :height="rect(b).h"
              rx="4"
              :class="['cf-bar', `cf-${b.kind}`, { 'cf-dim': hovered !== null && hovered !== i }]"
            />
            <!-- Direct label: value above (or below for money out) -->
            <text
              :x="x(i) + barW / 2"
              :y="b.kind === 'out' ? rect(b).y + rect(b).h + 14 : rect(b).y - 7"
              text-anchor="middle"
              class="cf-value"
            >
              {{
                b.kind === 'out'
                  ? compactMoney(Number(b.amount))
                  : (b.kind === 'in' ? '+' : '') + compactMoney(Number(b.amount))
              }}
            </text>
            <text
              :x="x(i) + barW / 2"
              :y="H - pad.bottom + 18"
              text-anchor="middle"
              class="cf-label"
            >
              {{ b.label }}
            </text>
            <!-- Hit target: the whole column -->
            <rect
              :x="pad.left + slot * i"
              :y="pad.top"
              :width="slot"
              :height="plotH + 24"
              fill="transparent"
              tabindex="0"
              :aria-label="`${b.label}: ${cashMoney(b.amount)}`"
              @mouseenter="hovered = i"
              @mouseleave="hovered = null"
              @focus="hovered = i"
              @blur="hovered = null"
            />
          </g>
        </svg>

        <div
          v-if="tip && hovered !== null"
          class="pointer-events-none absolute top-2 z-10 w-56 rounded-lg border border-neutral-200 bg-white p-3 text-xs shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
          :style="tipStyle"
        >
          <p class="font-semibold text-neutral-900 dark:text-white">{{ tip.label }}</p>
          <p class="mt-1 text-base font-bold tabular-nums text-neutral-900 dark:text-white">
            {{ cashMoney(tip.amount) }}
          </p>
          <p class="mt-1 text-neutral-500">{{ tip.note }}</p>
        </div>
      </div>
    </div>

    <ul class="mt-2 flex flex-wrap gap-4 text-xs text-neutral-600 dark:text-neutral-300">
      <li class="flex items-center gap-1.5"><span class="cf-key cf-balance" />Cash balance</li>
      <li class="flex items-center gap-1.5"><span class="cf-key cf-in" />Net cash in</li>
      <li class="flex items-center gap-1.5"><span class="cf-key cf-out" />Net cash out</li>
    </ul>
  </figure>
</template>

<style scoped>
.cf-viz {
  --cf-in: #2a78d6;
  --cf-out: #e34948;
  --cf-balance: #008300;
  --cf-grid: #e7e6e2;
  --cf-ink: #0b0b0b;
  --cf-muted: #52514e;
}
:root[data-theme='dark'] .cf-viz {
  --cf-in: #3987e5;
  --cf-out: #e66767;
  --cf-balance: #008300;
  --cf-grid: #2e2e2c;
  --cf-ink: #ffffff;
  --cf-muted: #c3c2b7;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) .cf-viz {
    --cf-in: #3987e5;
    --cf-out: #e66767;
    --cf-balance: #008300;
    --cf-grid: #2e2e2c;
    --cf-ink: #ffffff;
    --cf-muted: #c3c2b7;
  }
}
.cf-bar {
  transition: opacity 120ms;
}
.cf-in {
  fill: var(--cf-in);
  background: var(--cf-in);
}
.cf-out {
  fill: var(--cf-out);
  background: var(--cf-out);
}
.cf-balance {
  fill: var(--cf-balance);
  background: var(--cf-balance);
}
.cf-dim {
  opacity: 0.35;
}
.cf-grid {
  stroke: var(--cf-grid);
  stroke-width: 1;
}
.cf-zero {
  stroke: var(--cf-muted);
  stroke-opacity: 0.6;
}
.cf-connector {
  stroke: var(--cf-muted);
  stroke-width: 1;
  stroke-dasharray: 3 3;
  opacity: 0.6;
}
.cf-axis {
  fill: var(--cf-muted);
  font-size: 11px;
}
.cf-label {
  fill: var(--cf-muted);
  font-size: 12px;
}
.cf-value {
  fill: var(--cf-ink);
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.cf-key {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
}
</style>
