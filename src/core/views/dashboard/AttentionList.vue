<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { ChevronRight, CircleCheck } from 'lucide-vue-next'
import type { AttentionKey, DashboardSummary } from '@/modules/reports/types'
import DashCard from './DashCard.vue'

const props = defineProps<{ items: DashboardSummary['attention'] }>()

const LABELS: Record<AttentionKey, { one: string; many: string; to: RouteLocationRaw; urgent?: boolean }> = {
  overdue_loans: { one: 'loan is overdue', many: 'loans are overdue', to: { name: 'loans.collections' }, urgent: true },
  loan_applications: { one: 'loan application waiting for a decision', many: 'loan applications waiting for a decision', to: { name: 'loans.index' } },
  awaiting_disbursement: { one: 'approved loan to disburse', many: 'approved loans to disburse', to: { name: 'loans.index' } },
  pending_members: { one: 'member waiting for approval', many: 'members waiting for approval', to: { name: 'members.index' } },
  savings_reversals: { one: 'savings reversal to approve', many: 'savings reversals to approve', to: { name: 'savings.approvals' } },
  savings_account_requests: { one: 'savings account request to approve', many: 'savings account requests to approve', to: { name: 'savings.approvals' } },
  draft_journals: { one: 'journal entry to post', many: 'journal entries to post', to: { name: 'accounting.journal-entries' } },
  draft_dividends: { one: 'draft dividend to approve', many: 'draft dividends to approve', to: { name: 'shares.dividends' } },
}

const rows = computed(() => props.items.map((item) => ({ ...item, ...LABELS[item.key] })))
</script>

<template>
  <DashCard title="Needs attention">
    <ul v-if="rows.length" class="divide-y divide-border">
      <li v-for="row in rows" :key="row.key">
        <RouterLink :to="row.to" class="group flex items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-muted/50">
          <span class="w-8 shrink-0 text-right text-base font-bold tabular-nums" :class="row.urgent ? 'text-destructive' : 'text-navy dark:text-white'">{{ row.count }}</span>
          <span class="min-w-0 flex-1 text-foreground">{{ row.count === 1 ? row.one : row.many }}</span>
          <ChevronRight class="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </RouterLink>
      </li>
    </ul>
    <div v-else class="flex h-full min-h-40 flex-col items-center justify-center gap-2 p-4 text-center">
      <CircleCheck class="size-5 text-success" aria-hidden="true" />
      <p class="text-sm font-medium">Nothing is waiting on you</p>
      <p class="text-xs text-muted-foreground">Overdue loans and approvals will appear here.</p>
    </div>
  </DashCard>
</template>
