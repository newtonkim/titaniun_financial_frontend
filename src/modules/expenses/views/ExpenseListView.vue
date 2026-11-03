<script setup lang="ts">
import type { PageParams } from '@/core/api/resource'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Plus } from 'lucide-vue-next'
import DateRangeFilter from '@/core/components/DateRangeFilter.vue'
import ResourceTable, { type Column } from '@/core/components/ResourceTable.vue'
import { Button } from '@/core/components/ui/button'
import { formatDate, formatMoney } from '@/core/utils/format'
import { useAuth } from '@/modules/auth/store'
import { expensesApi, recurringExpensesApi } from '../api'
import ExpenseDrawer from '../components/ExpenseDrawer.vue'
import ExpensePayDialog from '../components/ExpensePayDialog.vue'
import ExpenseReasonDialog from '../components/ExpenseReasonDialog.vue'
import { useRecurringActions } from '../composables/useRecurringActions'
import { EXPENSE_STATUS } from '../labels'
import type { Expense, ExpenseFilters, ExpenseStatus, ExpenseSummary, RecurringExpense } from '../types'

const { can } = useAuth()
const router = useRouter()
const table = ref<{ reload: () => Promise<void> } | null>(null)
const filters = reactive<ExpenseFilters>({ search: '', status: '', from: '', to: '' })
const summary = ref<ExpenseSummary | null>(null)
const due = ref<RecurringExpense[]>([])
const adding = ref(false)
const toppingUp = ref(false)
const topUpBusy = ref(false)
const topUpError = ref<string | null>(null)

const canRecord = computed(() => can('expenses.create'))

const STATUS_FILTER: ExpenseStatus[] = ['posted', 'approved', 'pending_approval', 'rejected', 'reversed']

const columns: Column<Expense>[] = [
  { key: 'expense_date', label: 'Date', sortable: true, value: (expense) => formatDate(expense.expense_date) },
  { key: 'description', label: 'What for', sortable: true, tone: 'strong', truncate: true },
  { key: 'categories', label: 'Category', tone: 'muted', value: (expense) => expense.categories?.join(', ') },
  { key: 'payee', label: 'Paid to', sortable: true, value: (expense) => expense.payee },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'amount', label: 'Amount', sortable: true, align: 'right', value: (expense) => formatMoney(expense.amount) },
]

const fetchPage = (params: PageParams) => expensesApi.list({ ...filters, ...params })

async function loadSummary() {
  const [loaded, dueList] = await Promise.all([expensesApi.summary(), recurringExpensesApi.list({ due_only: 1 })])
  summary.value = loaded
  due.value = dueList.data
}

async function refresh() {
  await Promise.all([loadSummary(), table.value?.reload()])
}

const recurring = useRecurringActions(refresh)

async function topUp(amount: string, date: string, accountId: number) {
  topUpBusy.value = true
  topUpError.value = null
  try {
    await expensesApi.topUpPettyCash(amount, accountId, date)
    toppingUp.value = false
    await loadSummary()
  } catch (exception) {
    topUpError.value = exception instanceof Error ? exception.message : 'The top-up could not be saved.'
  } finally {
    topUpBusy.value = false
  }
}

onMounted(() => void loadSummary().catch(() => undefined))

const tile = 'rounded-lg border border-border bg-background px-4 py-3'
const tileLabel = 'text-xs font-semibold text-muted-foreground'
const tileValue = 'mt-1 text-lg font-bold tabular-nums text-heading'
</script>

<template>
  <div class="tw-scope">
    <ResourceTable ref="table" title="Expenses" description="Everything the business spends. Add it here and the accounts update on their own." :columns="columns" :filters="filters" :fetch="fetchPage">
      <template #actions>
        <Button v-if="canRecord" size="sm" @click="adding = true"><Plus /> Add expense</Button>
      </template>

      <template #messages>
        <div v-if="summary" class="grid gap-3 sm:grid-cols-3">
          <div :class="tile">
            <p :class="tileLabel">Spent this month</p>
            <p :class="tileValue">UGX {{ formatMoney(summary.spent_this_month) }}</p>
          </div>
          <div :class="tile" class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p :class="tileLabel">Petty cash</p>
              <p :class="tileValue">UGX {{ formatMoney(summary.petty_cash_balance) }}</p>
            </div>
            <Button v-if="canRecord" variant="outline" size="sm" @click="toppingUp = true">Top up</Button>
          </div>
          <div :class="tile">
            <p :class="tileLabel">Still to pay</p>
            <p :class="tileValue">UGX {{ formatMoney(summary.unpaid_total) }}</p>
            <p v-if="summary.waiting_approval" class="text-xs text-muted-foreground">{{ summary.waiting_approval }} waiting for approval</p>
          </div>
        </div>

        <section v-if="due.length" class="rounded-lg border border-border bg-background">
          <div class="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h2 class="text-section text-heading">Due soon</h2>
            <RouterLink :to="{ name: 'expenses.recurring' }" class="text-sm font-medium text-primary hover:underline">All recurring expenses</RouterLink>
          </div>
          <ul class="divide-y divide-border">
            <li v-for="item in due" :key="item.id" class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-foreground">{{ item.name }}</p>
                <p class="text-sm" :class="item.status === 'overdue' ? 'text-destructive' : 'text-muted-foreground'">{{ item.status === 'overdue' ? 'Overdue since' : 'Due' }} {{ formatDate(item.next_due_on) }}</p>
              </div>
              <p class="text-sm font-semibold tabular-nums">UGX {{ formatMoney(item.amount) }}</p>
              <div v-if="canRecord" class="flex gap-2">
                <Button variant="outline" size="sm" @click="recurring.skipping.value = item">Skip</Button>
                <Button size="sm" @click="recurring.paying.value = item">Pay</Button>
              </div>
            </li>
          </ul>
        </section>
      </template>

      <template #filters>
        <input v-model="filters.search" type="search" placeholder="Search expenses" aria-label="Search expenses" class="h-9 rounded-md border border-border bg-background px-3 text-sm" />
        <select v-model="filters.status" aria-label="Filter by status" class="h-9 rounded-md border border-border bg-background px-3 text-sm">
          <option value="">All</option>
          <option v-for="status in STATUS_FILTER" :key="status" :value="status">{{ EXPENSE_STATUS[status].label }}</option>
        </select>
        <DateRangeFilter v-model:from="filters.from" v-model:to="filters.to" />
      </template>

      <template #cell-status="{ row }"><span class="badge" :class="`badge--${EXPENSE_STATUS[row.status].badge}`">{{ EXPENSE_STATUS[row.status].label }}</span></template>
      <template #row-actions="{ row }">
        <Button as-child variant="outline" size="sm"><RouterLink :to="{ name: 'expenses.show', params: { id: row.id } }">Open</RouterLink></Button>
      </template>
      <template #empty>
        <p class="font-medium">No expenses yet</p>
        <p class="mt-1 text-sm text-muted-foreground">Add your first one with the button above.</p>
      </template>
    </ResourceTable>

    <ExpenseDrawer v-model:open="adding" @saved="(expense) => router.push({ name: 'expenses.show', params: { id: expense.id } })" />
    <ExpensePayDialog v-if="toppingUp" title="Top up petty cash" note="Moves money into the cash box. It only counts as an expense when the cash is spent." editable-amount account-label="Taken from" :exclude-account-id="summary?.petty_cash_account_id" confirm-label="Top up" :busy="topUpBusy" :error="topUpError" @confirm="topUp" @cancel="toppingUp = false" />
    <ExpensePayDialog v-if="recurring.paying.value" :title="`Pay ${recurring.paying.value.name}`" editable-amount :amount="recurring.paying.value.amount" :account-id="recurring.paying.value.paid_from_account_id" confirm-label="Mark as paid" :busy="recurring.busy.value" :error="recurring.error.value" @confirm="recurring.pay" @cancel="recurring.close" />
    <ExpenseReasonDialog v-if="recurring.skipping.value" :title="`Skip ${recurring.skipping.value.name}`" label="Why is it being skipped this time?" confirm-label="Skip" :busy="recurring.busy.value" :error="recurring.error.value" @confirm="recurring.skip" @cancel="recurring.close" />
  </div>
</template>
