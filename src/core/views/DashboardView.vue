<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppIcon from '@/core/components/AppIcon.vue'
import { formatDate, formatMoney } from '@/core/utils/format'
import { reportsApi } from '@/modules/reports/api'
import type { DashboardSummary } from '@/modules/reports/types'
import ActivityTable from './dashboard/ActivityTable.vue'
import CashFlowChart from './dashboard/CashFlowChart.vue'
import StatCard from './dashboard/StatCard.vue'

const summary = ref<DashboardSummary | null>(null)
const months = ref<6 | 12>(6)
const loading = ref(false)
const error = ref<string | null>(null)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    summary.value = await reportsApi.dashboard(months.value)
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'The dashboard could not be loaded.'
  } finally {
    loading.value = false
  }
}

function setPeriod(period: 6 | 12): void {
  if (months.value === period) return
  months.value = period
  load()
}

const plural = (count: number, word: string) => `${count.toLocaleString()} ${word}${count === 1 ? '' : 's'}`

const glance = computed(() => {
  const data = summary.value
  if (!data) return []
  return [
    {
      label: 'Active members',
      value: data.members.active.toLocaleString(),
      caption: `of ${data.members.total.toLocaleString()} registered`,
      status: data.members.joined_this_month > 0 ? `${plural(data.members.joined_this_month, 'new member')} this month` : 'No new members this month',
      tone: data.members.joined_this_month > 0 ? 'good' : 'neutral',
      icon: 'members' as const,
      to: { name: 'members.index' },
    },
    {
      label: 'Loan applications',
      value: data.loans.pending.toLocaleString(),
      caption: 'Waiting for approval',
      status: data.loans.pending > 0 ? 'Needs review' : 'All reviewed',
      tone: data.loans.pending > 0 ? 'attention' : 'good',
      icon: 'loan' as const,
      to: { name: 'loans.index' },
    },
    {
      label: 'Ready to disburse',
      value: data.loans.awaiting_disbursement.toLocaleString(),
      caption: 'Approved, not yet paid out',
      status: data.loans.awaiting_disbursement > 0 ? 'Awaiting payout' : 'Nothing waiting',
      tone: data.loans.awaiting_disbursement > 0 ? 'attention' : 'good',
      icon: 'wallet' as const,
      to: { name: 'loans.index' },
    },
    {
      label: 'Expenses this month',
      value: formatMoney(data.expenses.this_month),
      caption: `Since ${formatDate(`${data.as_of.slice(0, 8)}01`)}`,
      status: data.expenses.count_this_month > 0 ? `${plural(data.expenses.count_this_month, 'expense')} recorded` : 'Nothing recorded yet',
      tone: 'neutral',
      icon: 'receipt' as const,
      to: { name: 'expenses.index' },
    },
  ]
})

onMounted(load)
</script>

<template>
  <div class="dashboard">
    <header class="dashboard__header">
      <div>
        <h1 class="dashboard__title">Overview</h1>
        <p class="dashboard__lede">
          Your SACCO at a glance<template v-if="summary">, as of {{ formatDate(summary.as_of) }}</template>.
        </p>
      </div>
      <button class="btn dashboard__refresh" type="button" :disabled="loading" @click="load">
        <span v-if="loading" class="spinner" aria-hidden="true" />
        <AppIcon v-else name="refresh" :size="18" />
        Refresh
      </button>
    </header>

    <div v-if="error" class="alert alert--error dashboard__error" role="alert">
      <span>{{ error }}</span>
      <button class="btn btn--small" type="button" @click="load">Try again</button>
    </div>

    <div v-if="!summary && loading" class="dashboard__skeleton" aria-busy="true" aria-label="Loading dashboard">
      <span v-for="block in 3" :key="block" class="skeleton skeleton--stat" />
      <span class="skeleton skeleton--panel" />
      <span class="skeleton skeleton--panel skeleton--wide" />
    </div>

    <template v-if="summary">
      <section class="dashboard__stats" aria-label="Balances">
        <StatCard
          featured
          title="Loan portfolio"
          subtitle="Outstanding principal"
          :amount="formatMoney(summary.loans.outstanding_principal)"
          :note="plural(summary.loans.active, 'active loan')"
          icon="loan"
          :to="{ name: 'loans.index' }"
          link-label="View loans"
        />
        <StatCard
          title="Member savings"
          subtitle="Total savings balance"
          :amount="formatMoney(summary.savings.balance)"
          :note="plural(summary.savings.active_accounts, 'active account')"
          icon="wallet"
          :to="{ name: 'savings.accounts' }"
          link-label="View savings accounts"
        />
        <StatCard
          title="Share capital"
          subtitle="Value of member shares"
          :amount="formatMoney(summary.shares.value)"
          :note="plural(summary.shares.shares_held, 'share')"
          icon="shares"
          :to="{ name: 'shares.accounts' }"
          link-label="View share accounts"
        />
      </section>

      <section class="dashboard__row">
        <article class="panel glance">
          <header class="glance__header">
            <div>
              <h2 class="section-title">At a glance</h2>
              <p class="section-lede">Today, {{ formatDate(summary.as_of) }}</p>
            </div>
            <RouterLink class="btn glance__add" :to="{ name: 'members.index', query: { create: '1' } }"><AppIcon name="plus" :size="18" /> Add member</RouterLink>
          </header>
          <div class="glance__grid">
            <RouterLink v-for="tile in glance" :key="tile.label" class="tile" :to="tile.to">
              <span class="tile__head">
                <span class="tile__icon"><AppIcon :name="tile.icon" :size="18" /></span>
                <span class="tile__label">{{ tile.label }}</span>
              </span>
              <span class="tile__value">{{ tile.value }}</span>
              <span class="tile__caption">{{ tile.caption }}</span>
              <span class="tile__status" :class="`tile__status--${tile.tone}`">{{ tile.status }}</span>
            </RouterLink>
          </div>
        </article>

        <article class="panel cashflow">
          <header class="cashflow__header">
            <div>
              <h2 class="section-title">Cash flow</h2>
              <p class="cashflow__net">{{ formatMoney(summary.cash_flow.net) }}</p>
              <p class="cashflow__totals">
                <span><span class="cashflow__key">Money in</span> {{ formatMoney(summary.cash_flow.total_inflow) }}</span>
                <span><span class="cashflow__key">Money out</span> {{ formatMoney(summary.cash_flow.total_outflow) }}</span>
              </p>
            </div>
            <div class="segmented" role="group" aria-label="Period">
              <button type="button" :aria-pressed="months === 6" @click="setPeriod(6)">6 months</button>
              <button type="button" :aria-pressed="months === 12" @click="setPeriod(12)">12 months</button>
            </div>
          </header>
          <CashFlowChart :months="summary.cash_flow.months" />
          <p class="cashflow__caption">Bars show money in each month. Hover or tab through a month to compare money in and out.</p>
        </article>
      </section>

      <ActivityTable :activities="summary.recent_activity" />
    </template>
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 96rem;
  margin: 0 auto;
}

.dashboard__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
}

.dashboard__title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 2.5rem;
  font-weight: 400;
  line-height: 1.1;
  letter-spacing: -0.01em;
}

.dashboard__lede {
  margin: 0.35rem 0 0;
  font-size: 1.05rem;
  color: var(--muted);
}

.dashboard__refresh {
  height: 2.75rem;
  padding-inline: 1rem;
  border-radius: 10px;
}

.dashboard__error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin: 0;
}

.dashboard__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(19rem, 1fr));
  gap: 1.5rem;
}

.dashboard__row {
  display: grid;
  grid-template-columns: minmax(0, 6fr) minmax(0, 8fr);
  gap: 1.5rem;
}

.section-title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  text-transform: none;
  color: var(--heading);
}

.section-lede {
  margin: 0.25rem 0 0;
  color: var(--muted);
}

/* At a glance */
.glance__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.glance__add {
  height: 2.6rem;
  border-radius: 999px;
  white-space: nowrap;
}

.glance__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.tile {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 1rem 1.1rem;
  border-radius: 14px;
  background: var(--surface-sunken);
  color: var(--text);
  transition: background-color 160ms var(--ease-out), box-shadow 160ms var(--ease-out);
}

.tile:hover {
  box-shadow: inset 0 0 0 1px var(--border);
}

.tile__head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.6rem;
}

.tile__icon {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: var(--crimson);
  color: #fff;
}

.tile__label {
  font-weight: 500;
}

.tile__value {
  font-size: 1.6rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.tile__caption {
  font-size: 0.85rem;
  color: var(--muted);
}

.tile__status {
  margin-top: 0.6rem;
  font-size: 0.9rem;
  font-weight: 500;
}

.tile__status--good {
  color: var(--success);
}

.tile__status--attention {
  color: var(--crimson-dark);
}

.tile__status--neutral {
  color: var(--muted);
}

/* Cash flow */
.cashflow__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.cashflow__net {
  margin: 0.4rem 0 0;
  font-size: 2.25rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.cashflow__totals {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1.25rem;
  margin: 0.25rem 0 0;
  font-variant-numeric: tabular-nums;
}

.cashflow__key {
  color: var(--muted);
}

.cashflow__caption {
  margin: 1rem 0 0;
  font-size: 0.85rem;
  color: var(--muted);
}

.segmented {
  display: inline-flex;
  gap: 0.35rem;
}

.segmented button {
  height: 2.6rem;
  padding-inline: 1.1rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  font-weight: 500;
  cursor: pointer;
  transition: background-color 160ms var(--ease-out), color 160ms var(--ease-out);
}

.segmented button[aria-pressed='true'] {
  border-color: var(--crimson);
  background: var(--crimson);
  color: #fff;
}

/* Loading */
.dashboard__skeleton {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.5rem;
}

.skeleton {
  border-radius: var(--radius-panel);
  background: linear-gradient(90deg, var(--surface-sunken), var(--border), var(--surface-sunken)) 0 0 / 200% 100%;
  animation: shimmer 1.4s linear infinite;
}

.skeleton--stat {
  height: 13rem;
}

.skeleton--panel {
  grid-column: span 1;
  height: 24rem;
}

.skeleton--wide {
  grid-column: span 2;
}

@keyframes shimmer {
  to {
    background-position: -200% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation: none;
  }
}

@media (max-width: 1280px) {
  .dashboard__row {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .dashboard__title {
    font-size: 2rem;
  }

  .glance__grid,
  .dashboard__skeleton {
    grid-template-columns: minmax(0, 1fr);
  }

  .skeleton--wide {
    grid-column: span 1;
  }
}
</style>
