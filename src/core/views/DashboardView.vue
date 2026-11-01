<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { CircleAlert, RefreshCw } from 'lucide-vue-next'
import PageHeader from '@/core/components/PageHeader.vue'
import SegmentedControl from '@/core/components/SegmentedControl.vue'
import { Button } from '@/core/components/ui/button'
import { Skeleton } from '@/core/components/ui/skeleton'
import { formatDate, formatMoney } from '@/core/utils/format'
import { reportsApi } from '@/modules/reports/api'
import type { DashboardSummary } from '@/modules/reports/types'
import ActivityTable from './dashboard/ActivityTable.vue'
import AttentionList from './dashboard/AttentionList.vue'
import CashFlowChart from './dashboard/CashFlowChart.vue'
import CollectionsPanel from './dashboard/CollectionsPanel.vue'
import DashCard from './dashboard/DashCard.vue'
import MonthPanel from './dashboard/MonthPanel.vue'
import OverdueLoans from './dashboard/OverdueLoans.vue'
import PortfolioAging from './dashboard/PortfolioAging.vue'
import RegulatoryHealth from './dashboard/RegulatoryHealth.vue'

const PERIODS: { label: string; value: '6' | '12' }[] = [
  { label: '6 months', value: '6' },
  { label: '12 months', value: '12' },
]

const summary = ref<DashboardSummary | null>(null)
const months = ref<'6' | '12'>('6')
const loading = ref(false)
const error = ref<string | null>(null)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    summary.value = await reportsApi.dashboard(months.value === '6' ? 6 : 12)
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'The dashboard could not be loaded.'
  } finally {
    loading.value = false
  }
}

const plural = (count: number, word: string) => `${count.toLocaleString()} ${word}${count === 1 ? '' : 's'}`
/** Headline figures in whole shillings: enough to read at a glance, with room for billions. */
const whole = (value: string | number) => Math.round(Number(value)).toLocaleString()
const signed = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${whole(Math.abs(value))}`

interface Headline {
  label: string
  value: string
  note: string
  to: RouteLocationRaw
  /** A fixed Titaniun colour per card, so each figure keeps its place in the eye. */
  color: string
  /** Why this figure needs a look, when it does. */
  alert?: string
}

const headlines = computed<Headline[]>(() => {
  const data = summary.value
  if (!data) return []
  const par = data.portfolio.par_30
  const liquidity = data.prudential.ratios.find((ratio) => ratio.key === 'liquidity')
  return [
    { label: 'Loan portfolio', value: whole(data.portfolio.portfolio), note: plural(data.loans.active, 'active loan'), to: { name: 'loans.index' }, color: 'bg-brand' },
    {
      label: 'At risk (30+ days)',
      value: par === null ? '—' : `${Number(par).toFixed(1)}%`,
      note: par === null ? 'No active loans' : `${whole(data.portfolio.at_risk_30)} at risk`,
      to: { name: 'loans.index' },
      color: 'bg-navy',
      alert: par !== null && Number(par) > 5 ? 'Above 5% target' : undefined,
    },
    { label: 'Member savings', value: whole(data.savings.balance), note: `${signed(Number(data.this_month.deposits) - Number(data.this_month.withdrawals))} this month`, to: { name: 'savings.accounts' }, color: 'bg-blue' },
    { label: 'Share capital', value: whole(data.shares.value), note: plural(data.shares.shares_held, 'share'), to: { name: 'shares.register' }, color: 'bg-ink' },
    {
      label: 'Cash and bank',
      value: whole(data.prudential.liquid_assets),
      note: liquidity?.value == null ? 'Liquidity not available yet' : `${Number(liquidity.value).toFixed(1)}% liquidity`,
      to: { name: 'reports.balance-sheet' },
      color: 'bg-brand-dark',
      alert: liquidity?.within_limit === false ? 'Below 15% minimum' : undefined,
    },
    { label: 'Surplus this year', value: whole(data.this_month.surplus_year_to_date), note: `${signed(Number(data.this_month.surplus))} this month`, to: { name: 'reports.income-statement' }, color: 'bg-navy-mid' },
  ]
})

onMounted(load)
</script>

<template>
  <div class="tw-scope @container flex flex-col gap-4">
    <PageHeader title="Overview" :description="summary ? `Your SACCO as of ${formatDate(summary.as_of)}. All amounts in UGX.` : 'Your SACCO at a glance.'">
      <Button variant="outline" size="icon-sm" aria-label="Refresh" :disabled="loading" @click="load"><RefreshCw :class="{ 'animate-spin': loading }" /></Button>
    </PageHeader>

    <div v-if="error" role="alert" class="flex items-center justify-between gap-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
      <span>{{ error }}</span>
      <Button variant="outline" size="xs" @click="load">Try again</Button>
    </div>

    <div v-if="!summary && loading" class="flex flex-col gap-4" aria-busy="true" aria-label="Loading dashboard">
      <Skeleton class="h-24 w-full bg-muted" />
      <Skeleton class="h-96 w-full bg-muted" />
      <Skeleton class="h-72 w-full bg-muted" />
    </div>

    <template v-if="summary">
      <section class="grid grid-cols-1 gap-3 @xl:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-6" aria-label="Headline figures">
        <RouterLink
          v-for="item in headlines"
          :key="item.label"
          :to="item.to"
          class="flex min-w-0 flex-col rounded-lg px-3.5 py-3 text-white ring-1 ring-white/10 transition-[filter] hover:brightness-110"
          :class="item.color"
        >
          <span class="block truncate text-xs text-white/85">{{ item.label }}</span>
          <span class="mt-1 block truncate text-lg font-bold tabular-nums">{{ item.value }}</span>
          <span class="mt-0.5 block truncate text-xs text-white/85">{{ item.note }}</span>
          <span v-if="item.alert" class="mt-2 inline-flex items-center gap-1 self-start rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-brand-dark">
            <CircleAlert class="size-3" aria-hidden="true" />{{ item.alert }}
          </span>
        </RouterLink>
      </section>

      <div class="grid grid-cols-1 gap-4 @3xl:grid-cols-2 @5xl:grid-cols-12">
        <AttentionList class="@5xl:col-span-3" :items="summary.attention" />
        <DashCard class="@3xl:col-span-2 @3xl:row-start-1 @5xl:col-span-6 @5xl:row-start-auto" title="Cash flow" :lede="`Net ${formatMoney(summary.cash_flow.net)}: ${formatMoney(summary.cash_flow.total_inflow)} in, ${formatMoney(summary.cash_flow.total_outflow)} out`">
          <template #tools>
            <SegmentedControl v-model="months" :options="PERIODS" label="Period" @update:model-value="load" />
          </template>
          <CashFlowChart :months="summary.cash_flow.months" />
        </DashCard>
        <RegulatoryHealth class="@5xl:col-span-3" :ratios="summary.prudential.ratios" :portfolio="summary.portfolio" />
      </div>

      <div class="grid grid-cols-1 gap-4 @3xl:grid-cols-2 @5xl:grid-cols-12">
        <PortfolioAging class="@5xl:col-span-5" :portfolio="summary.portfolio" />
        <CollectionsPanel class="@5xl:col-span-4" :collections="summary.collections" />
        <MonthPanel class="@3xl:col-span-2 @5xl:col-span-3" :month="summary.this_month" :joined="summary.members.joined_this_month" />
      </div>

      <div class="grid grid-cols-1 gap-4 @5xl:grid-cols-12">
        <OverdueLoans class="@5xl:col-span-5" :loans="summary.portfolio.worst_overdue" :total="summary.portfolio.overdue_loans" />
        <ActivityTable class="@5xl:col-span-7" :activities="summary.recent_activity" />
      </div>
    </template>
  </div>
</template>
