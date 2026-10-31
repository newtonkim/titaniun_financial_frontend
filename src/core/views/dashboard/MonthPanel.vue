<script setup lang="ts">
import { computed } from 'vue'
import { formatMoney } from '@/core/utils/format'
import type { DashboardSummary } from '@/modules/reports/types'
import DashCard from './DashCard.vue'

const props = defineProps<{ month: DashboardSummary['this_month']; joined: number }>()

const rows = computed(() => [
  { label: 'Savings deposits', value: formatMoney(props.month.deposits) },
  { label: 'Savings withdrawals', value: formatMoney(props.month.withdrawals) },
  { label: `Loans disbursed (${props.month.disbursed_loans})`, value: formatMoney(props.month.disbursed) },
  { label: 'Disbursed last month', value: formatMoney(props.month.disbursed_last_month), quiet: true },
  { label: 'Loan repayments', value: formatMoney(props.month.repaid) },
  { label: 'New members', value: props.joined.toLocaleString() },
  { label: 'Surplus this month', value: formatMoney(props.month.surplus) },
])
</script>

<template>
  <DashCard title="This month">
    <dl class="divide-y divide-border text-[0.8125rem] tabular-nums">
      <div v-for="row in rows" :key="row.label" class="flex justify-between gap-3 px-3 py-1.5">
        <dt class="text-muted-foreground">{{ row.label }}</dt>
        <dd :class="row.quiet ? 'text-muted-foreground' : 'font-medium'">{{ row.value }}</dd>
      </div>
    </dl>
  </DashCard>
</template>
