<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRight } from 'lucide-vue-next'
import type { BalanceSheetLine } from '../api'
import type { StatementRow } from '../utils/balanceSheetRows'
import { formatAccounting } from '../utils/accountingFormat'

const props = withDefaults(defineProps<{ row: StatementRow; showComparison?: boolean }>(), { showComparison: true })
const emit = defineEmits<{ toggle: [key: string]; drill: [line: BalanceSheetLine] }>()

const change = computed(() =>
  props.row.amount === null || props.row.compareAmount === null
    ? null
    : props.row.amount - props.row.compareAmount,
)

const canDrill = computed(() =>
  props.row.kind === 'line'
  && !!props.row.line?.is_postable
  && !props.row.line?.is_computed
  && !!props.row.amount,
)

const labelStyle = computed(() => ({ paddingLeft: `${1 + props.row.depth * 1.25}rem` }))

const changeClass = computed(() => {
  const v = Math.round((change.value ?? 0) * 100)
  if (v > 0) return 'text-emerald-600 dark:text-emerald-400'
  if (v < 0) return 'text-rose-600 dark:text-rose-400'
  return 'text-muted-foreground'
})

const isTotal = computed(() => ['subtotal', 'section-total', 'grand-total'].includes(props.row.kind))

const amountRule = computed(() => ({
  subtotal: 'border-t border-border dark:border-neutral-600',
  'section-total': 'border-t border-neutral-400 dark:border-neutral-500',
  'grand-total': 'border-t border-neutral-900 border-b-[3px] border-b-neutral-900 border-double dark:border-neutral-200 dark:border-b-neutral-200',
  section: '',
  line: '',
}[props.row.kind]))

const COMPUTED_HINT = 'Calculated from income and expense accounts — no year-end closing has been posted.'
</script>

<template>
  <!-- Section heading -->
  <tr v-if="row.kind === 'section'">
    <td :colspan="showComparison ? 4 : 2" class="px-4 pt-7 pb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-brand">
      {{ row.label }}
    </td>
  </tr>

  <tr v-else
    :class="[
      'group transition-colors',
      row.kind === 'line' ? 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40' : '',
      row.kind === 'grand-total' ? 'bg-brand/5 dark:bg-brand/10' : '',
    ]">
    <!-- Label -->
    <td :style="labelStyle"
      :class="[
        'py-2 pr-4 text-sm',
        isTotal ? 'font-semibold text-foreground' : 'text-neutral-700 dark:text-neutral-300',
        row.kind === 'grand-total' ? 'py-3 font-bold uppercase tracking-wide text-[13px]' : '',
        row.kind === 'line' && row.depth === 1 ? 'font-medium text-neutral-900 dark:text-neutral-100' : '',
      ]">
      <div class="flex items-center gap-1.5">
        <button v-if="row.hasChildren" type="button" data-test="toggle"
          :aria-expanded="row.expanded ? 'true' : 'false'"
          :aria-label="`${row.expanded ? 'Collapse' : 'Expand'} ${row.label}`"
          class="-ml-6 flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-neutral-200/70 hover:text-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
          @click="emit('toggle', row.key)">
          <ChevronRight :class="['h-3.5 w-3.5 transition-transform', row.expanded ? 'rotate-90' : '']" />
        </button>
        <span v-if="row.glCode && row.line?.is_postable" class="font-mono text-[11px] text-muted-foreground">{{ row.glCode }}</span>
        <span>{{ row.label }}</span>
        <span v-if="row.line?.is_computed" :title="COMPUTED_HINT"
          class="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          computed
        </span>
      </div>
    </td>

    <!-- As-at amount -->
    <td class="px-4 py-2 text-right text-sm tabular-nums whitespace-nowrap">
      <span :class="['inline-block min-w-[7rem] py-0.5', amountRule, isTotal ? 'font-semibold' : '']">
        <button v-if="canDrill" type="button" data-test="drill"
          class="text-neutral-900 underline decoration-neutral-300 decoration-dotted underline-offset-4 hover:text-brand hover:decoration-brand dark:text-neutral-100 dark:decoration-neutral-600"
          @click="emit('drill', row.line!)">
          {{ formatAccounting(row.amount) }}
        </button>
        <span v-else class="text-neutral-900 dark:text-neutral-100">{{ formatAccounting(row.amount) }}</span>
      </span>
    </td>

    <!-- Comparison amount -->
    <td v-if="showComparison" class="px-4 py-2 text-right text-sm tabular-nums whitespace-nowrap text-muted-foreground">
      <span :class="['inline-block min-w-[7rem] py-0.5', amountRule]">{{ formatAccounting(row.compareAmount) }}</span>
    </td>

    <!-- Change -->
    <td v-if="showComparison" :class="['px-4 py-2 text-right text-xs tabular-nums whitespace-nowrap', changeClass]">
      {{ formatAccounting(change) }}
    </td>
  </tr>
</template>
